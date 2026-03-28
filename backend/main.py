import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

import database
import models

app = FastAPI(title="CodeQuantum F1 Simulation API")


class SliderSet(BaseModel):
    engine: int = Field(..., ge=0, le=100)
    aero: int = Field(..., ge=0, le=100)
    suspension: int = Field(..., ge=0, le=100)
    transmission: int = Field(..., ge=0, le=100)
    pitcrew: int = Field(..., ge=0, le=100)


class SimulationRequest(BaseModel):
    sliders: SliderSet


class NextTrackProbability(BaseModel):
    round: int
    event_name: str
    country: str
    location: str
    probability: float


class DriverSimulationResult(BaseModel):
    driver_number: str
    driver_name: str
    team_name: str
    expected_baseline_finish_time_s: float
    expected_predicted_finish_time_s: float
    expected_delta_s: float
    expected_rank_estimate: float
    expected_pit_error_risk: float
    confidence: float


class SimulationResponse(BaseModel):
    simulation_id: int
    model_version: str
    next_track_probabilities: list[NextTrackProbability]
    top_results: list[DriverSimulationResult]
    modifiers: dict[str, float]


class DriverMeta(BaseModel):
    driver_number: str
    driver_name: str
    team_name: str


class RoundMeta(BaseModel):
    round: int
    event_name: str
    country: str
    location: str


class SimulationHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Any
    model_version: str
    round: int
    driver_number: str
    baseline_finish_time_s: float
    predicted_finish_time_s: float
    delta_s: float
    rank_estimate: int
    pit_error_risk: float


class F1DataStore:
    def __init__(self) -> None:
        self.race_df: pd.DataFrame | None = None
        self.driver_meta: list[dict[str, str]] = []
        self.round_meta: list[dict[str, Any]] = []
        self.driver_dnf_rate: dict[str, float] = {}
        self.round_time_lookup: dict[int, list[float]] = {}

    @staticmethod
    def _timedelta_to_seconds(series: pd.Series) -> pd.Series:
        return pd.to_timedelta(series, errors="coerce").dt.total_seconds()

    @staticmethod
    def _to_bool(series: pd.Series) -> pd.Series:
        return series.fillna(False).astype(str).str.strip().str.lower().eq("true")

    def load(self) -> None:
        base = Path(__file__).resolve().parent.parent
        race_path = base / "data" / "RaceResults.csv"
        lap_path = base / "data" / "LapTimes.csv"
        qual_path = base / "data" / "QualTimes.csv"

        for req in [race_path, lap_path, qual_path]:
            if not req.exists():
                raise RuntimeError(f"Missing required data file: {req}")

        race = pd.read_csv(race_path, low_memory=False)
        laps = pd.read_csv(lap_path, low_memory=False)
        _ = pd.read_csv(qual_path, low_memory=False)

        race["DriverNumber"] = race["DriverNumber"].astype(str)
        laps["DriverNumber"] = laps["DriverNumber"].astype(str)

        race["ElapsedTime_s"] = self._timedelta_to_seconds(race["ElapsedTime"])

        laps["LapTime_s"] = self._timedelta_to_seconds(laps["LapTime"])
        laps["Deleted_b"] = self._to_bool(laps["Deleted"])
        laps["Accurate_b"] = self._to_bool(laps["IsAccurate"])
        laps["PitIn_b"] = laps["PitInTime"].fillna("").astype(str).str.strip().ne("")

        clean_laps = laps[
            (~laps["Deleted_b"]) & (laps["Accurate_b"]) & (laps["LapTime_s"].notna())
        ].copy()

        lap_agg = (
            clean_laps.groupby(["Round", "DriverNumber"], as_index=False)
            .agg(
                median_lap_s=("LapTime_s", "median"),
                std_lap_s=("LapTime_s", "std"),
                speed_st_mean=("SpeedST", "mean"),
            )
            .fillna({"std_lap_s": 0.0})
        )

        pit_counts = (
            laps.groupby(["Round", "DriverNumber"], as_index=False)["PitIn_b"]
            .sum()
            .rename(columns={"PitIn_b": "pit_count"})
        )

        race = race.merge(lap_agg, on=["Round", "DriverNumber"], how="left")
        race = race.merge(pit_counts, on=["Round", "DriverNumber"], how="left")

        race["pit_count"] = race["pit_count"].fillna(2).clip(lower=1)

        fallback_finish = race["Laps"] * race["median_lap_s"]
        race["baseline_finish_time_s"] = race["ElapsedTime_s"].fillna(fallback_finish)

        race["baseline_finish_time_s"] = race.groupby("Round")[
            "baseline_finish_time_s"
        ].transform(lambda s: s.fillna(s.median()))

        race["baseline_finish_time_s"] = race["baseline_finish_time_s"].fillna(
            race["baseline_finish_time_s"].median()
        )

        status = race["Status"].fillna("").astype(str).str.lower()
        finished_mask = (
            status.str.contains("finished")
            | status.str.contains("\+\s*\d+\s*lap", regex=True)
            | status.str.contains("lapped")
        )
        race["dnf"] = (~finished_mask).astype(float)

        self.driver_dnf_rate = (
            race.groupby("DriverNumber", as_index=False)["dnf"].mean()
            .set_index("DriverNumber")["dnf"]
            .to_dict()
        )

        self.driver_meta = (
            race[["DriverNumber", "FullName", "TeamName"]]
            .dropna(subset=["DriverNumber"])
            .drop_duplicates(subset=["DriverNumber"], keep="first")
            .rename(
                columns={
                    "DriverNumber": "driver_number",
                    "FullName": "driver_name",
                    "TeamName": "team_name",
                }
            )
            .sort_values("driver_number")
            .to_dict(orient="records")
        )

        self.round_meta = (
            race[["Round", "Event Name", "Country", "Location"]]
            .drop_duplicates(subset=["Round"], keep="first")
            .rename(
                columns={
                    "Round": "round",
                    "Event Name": "event_name",
                    "Country": "country",
                    "Location": "location",
                }
            )
            .sort_values("round")
            .to_dict(orient="records")
        )

        self.round_time_lookup = {
            int(round_id): group["baseline_finish_time_s"].dropna().astype(float).tolist()
            for round_id, group in race.groupby("Round")
        }

        self.race_df = race

    def get_profile(self, round_id: int, driver_number: str) -> dict[str, Any]:
        if self.race_df is None:
            raise RuntimeError("Data store not initialized")

        match = self.race_df[
            (self.race_df["Round"] == round_id)
            & (self.race_df["DriverNumber"].astype(str) == driver_number)
        ]

        if match.empty:
            raise KeyError("Driver or round not found in race dataset")

        row = match.iloc[0]

        baseline_finish = float(row["baseline_finish_time_s"])
        pit_count = float(row.get("pit_count", 2) or 2)
        baseline_pit_s = max(10.0, pit_count * 22.0)
        if baseline_pit_s > baseline_finish * 0.6:
            baseline_pit_s = baseline_finish * 0.15

        ontrack_s = max(1.0, baseline_finish - baseline_pit_s)

        speed_st = row.get("speed_st_mean")
        straight_share = 0.45
        if pd.notna(speed_st):
            norm = np.clip((float(speed_st) - 200.0) / 150.0, 0.0, 1.0)
            straight_share = 0.40 + (0.10 * norm)

        std_lap_s = float(row.get("std_lap_s", 0.0) or 0.0)
        med_lap_s = float(row.get("median_lap_s", 90.0) or 90.0)

        return {
            "round": round_id,
            "driver_number": driver_number,
            "driver_name": str(row.get("FullName", "Unknown Driver")),
            "team_name": str(row.get("TeamName", "Unknown Team")),
            "baseline_finish_time_s": baseline_finish,
            "baseline_pit_s": baseline_pit_s,
            "ontrack_s": ontrack_s,
            "straight_share": straight_share,
            "dnf_rate": float(self.driver_dnf_rate.get(driver_number, 0.12)),
            "lap_std_ratio": std_lap_s / max(med_lap_s, 1e-6),
            "round_times": self.round_time_lookup.get(round_id, []),
        }

    def get_next_track_probabilities(self) -> list[dict[str, Any]]:
        if not self.round_meta:
            return []

        round_lookup = {int(item["round"]): item for item in self.round_meta}
        max_round = max(round_lookup)

        weighted_candidates: list[tuple[int, float]] = [
            (((max_round + 1 - 1) % max_round) + 1, 0.60),
            (((max_round + 2 - 1) % max_round) + 1, 0.30),
            (((max_round + 3 - 1) % max_round) + 1, 0.10),
        ]

        probs: list[dict[str, Any]] = []
        for round_id, probability in weighted_candidates:
            meta = round_lookup.get(round_id)
            if meta is None:
                continue
            probs.append(
                {
                    "round": int(meta["round"]),
                    "event_name": str(meta["event_name"]),
                    "country": str(meta["country"]),
                    "location": str(meta["location"]),
                    "probability": float(probability),
                }
            )

        total = sum(item["probability"] for item in probs)
        if total <= 0:
            return []

        for item in probs:
            item["probability"] = item["probability"] / total

        return probs


DATA = F1DataStore()
MODEL_VERSION = "v0.2-prob-next-track"
MODIFIER_RANGES = {
    "engine": (-0.010, 0.030),
    "aero": (-0.015, 0.025),
    "suspension": (-0.010, 0.020),
    "transmission": (-0.008, 0.015),
    "pit_time": (0.100, -0.150),
    "pit_risk": (0.040, -0.030),
}


def slider_to_modifier(slider_value: int, value_range: tuple[float, float]) -> float:
    low, high = value_range
    ratio = np.clip(slider_value / 100.0, 0.0, 1.0)
    return float(low + ((high - low) * ratio))


def calculate_modifiers(sliders: SliderSet) -> dict[str, float]:
    return {
        "engine": slider_to_modifier(sliders.engine, MODIFIER_RANGES["engine"]),
        "aero": slider_to_modifier(sliders.aero, MODIFIER_RANGES["aero"]),
        "suspension": slider_to_modifier(
            sliders.suspension, MODIFIER_RANGES["suspension"]
        ),
        "transmission": slider_to_modifier(
            sliders.transmission, MODIFIER_RANGES["transmission"]
        ),
        "pit_time": slider_to_modifier(sliders.pitcrew, MODIFIER_RANGES["pit_time"]),
        "pit_risk": slider_to_modifier(sliders.pitcrew, MODIFIER_RANGES["pit_risk"]),
    }


def run_simulation(profile: dict[str, Any], modifiers: dict[str, float]) -> dict[str, Any]:
    baseline = profile["baseline_finish_time_s"]
    ontrack = profile["ontrack_s"]
    baseline_pit = profile["baseline_pit_s"]
    straight_share = profile["straight_share"]

    straight_time = ontrack * straight_share
    corner_time = ontrack - straight_time

    contributions = {
        "engine_s": -straight_time * modifiers["engine"],
        "transmission_s": -(straight_time * 0.60) * modifiers["transmission"],
        "aero_s": -corner_time * modifiers["aero"],
        "suspension_s": -(corner_time * 0.70) * modifiers["suspension"],
        "pitcrew_time_s": baseline_pit * modifiers["pit_time"],
    }

    pit_error_risk = float(
        np.clip(profile["dnf_rate"] + modifiers["pit_risk"], 0.01, 0.60)
    )
    risk_penalty_s = pit_error_risk * 8.0
    contributions["pitcrew_risk_penalty_s"] = risk_penalty_s

    delta_s = float(sum(contributions.values()))
    predicted = max(1.0, baseline + delta_s)

    round_times = profile["round_times"]
    rank_estimate = 1.0
    if round_times:
        rank_estimate = float(1 + sum(float(t) < predicted for t in round_times))

    variability_penalty = min(profile["lap_std_ratio"], 0.20)
    confidence = float(np.clip(0.90 - (variability_penalty * 2.5), 0.35, 0.90))

    return {
        "baseline_finish_time_s": float(baseline),
        "predicted_finish_time_s": float(predicted),
        "delta_s": float(predicted - baseline),
        "rank_estimate": rank_estimate,
        "pit_error_risk": pit_error_risk,
        "confidence": confidence,
    }


models.Base.metadata.create_all(bind=database.engine)


@app.on_event("startup")
def startup_event() -> None:
    DATA.load()


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "CodeQuantum F1 Simulation Backend/API"}


@app.get("/meta/next-track-probabilities", response_model=list[NextTrackProbability])
def get_next_track_probabilities() -> list[NextTrackProbability]:
    return [
        NextTrackProbability(**item) for item in DATA.get_next_track_probabilities()
    ]


@app.post("/simulate", response_model=SimulationResponse)
def simulate_run(
    payload: SimulationRequest, db: Session = Depends(database.get_db)
) -> SimulationResponse:
    next_track_probs = DATA.get_next_track_probabilities()
    if not next_track_probs:
        raise HTTPException(status_code=500, detail="Next track probabilities unavailable")

    modifiers = calculate_modifiers(payload.sliders)
    driver_results: list[DriverSimulationResult] = []

    for driver in DATA.driver_meta:
        driver_number = str(driver["driver_number"])
        weighted_baseline = 0.0
        weighted_predicted = 0.0
        weighted_delta = 0.0
        weighted_rank = 0.0
        weighted_risk = 0.0
        weighted_confidence = 0.0
        valid_mass = 0.0

        for track in next_track_probs:
            prob = float(track["probability"])
            round_id = int(track["round"])

            try:
                profile = DATA.get_profile(round_id, driver_number)
            except KeyError:
                continue

            sim = run_simulation(profile, modifiers)
            weighted_baseline += prob * sim["baseline_finish_time_s"]
            weighted_predicted += prob * sim["predicted_finish_time_s"]
            weighted_delta += prob * sim["delta_s"]
            weighted_rank += prob * sim["rank_estimate"]
            weighted_risk += prob * sim["pit_error_risk"]
            weighted_confidence += prob * sim["confidence"]
            valid_mass += prob

        if valid_mass <= 0:
            continue

        inv_mass = 1.0 / valid_mass
        driver_results.append(
            DriverSimulationResult(
                driver_number=driver_number,
                driver_name=str(driver["driver_name"]),
                team_name=str(driver["team_name"]),
                expected_baseline_finish_time_s=weighted_baseline * inv_mass,
                expected_predicted_finish_time_s=weighted_predicted * inv_mass,
                expected_delta_s=weighted_delta * inv_mass,
                expected_rank_estimate=weighted_rank * inv_mass,
                expected_pit_error_risk=weighted_risk * inv_mass,
                confidence=weighted_confidence * inv_mass,
            )
        )

    if not driver_results:
        raise HTTPException(status_code=500, detail="No driver simulation results available")

    driver_results.sort(key=lambda d: d.expected_predicted_finish_time_s)
    top_results = driver_results[:10]

    leader = top_results[0]
    row = models.SimulationRun(
        model_version=MODEL_VERSION,
        round=int(next_track_probs[0]["round"]),
        driver_number="ALL",
        engine_slider=payload.sliders.engine,
        aero_slider=payload.sliders.aero,
        suspension_slider=payload.sliders.suspension,
        transmission_slider=payload.sliders.transmission,
        pitcrew_slider=payload.sliders.pitcrew,
        baseline_finish_time_s=leader.expected_baseline_finish_time_s,
        predicted_finish_time_s=leader.expected_predicted_finish_time_s,
        delta_s=leader.expected_delta_s,
        rank_estimate=int(round(leader.expected_rank_estimate)),
        pit_error_risk=leader.expected_pit_error_risk,
        modifiers_json=json.dumps(modifiers),
        contributions_json=json.dumps(
            {
                "next_track_probabilities": next_track_probs,
                "leader_driver": leader.driver_number,
            }
        ),
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return SimulationResponse(
        simulation_id=row.id,
        model_version=MODEL_VERSION,
        next_track_probabilities=[
            NextTrackProbability(**item) for item in next_track_probs
        ],
        top_results=top_results,
        modifiers=modifiers,
    )


@app.get("/meta/drivers", response_model=list[DriverMeta])
def get_drivers() -> list[DriverMeta]:
    return [DriverMeta(**driver) for driver in DATA.driver_meta]


@app.get("/meta/rounds", response_model=list[RoundMeta])
def get_rounds() -> list[RoundMeta]:
    return [RoundMeta(**round_data) for round_data in DATA.round_meta]


@app.get("/simulations", response_model=list[SimulationHistoryItem])
def list_simulations(
    limit: int = Query(default=25, ge=1, le=250),
    db: Session = Depends(database.get_db),
) -> list[models.SimulationRun]:
    return (
        db.query(models.SimulationRun)
        .order_by(models.SimulationRun.created_at.desc())
        .limit(limit)
        .all()
    )


@app.get("/simulations/{simulation_id}")
def get_simulation(simulation_id: int, db: Session = Depends(database.get_db)) -> dict[str, Any]:
    row = (
        db.query(models.SimulationRun)
        .filter(models.SimulationRun.id == simulation_id)
        .first()
    )

    if row is None:
        raise HTTPException(status_code=404, detail="Simulation not found")

    return {
        "simulation_id": row.id,
        "created_at": row.created_at,
        "model_version": row.model_version,
        "round": row.round,
        "driver_number": row.driver_number,
        "engine_slider": row.engine_slider,
        "aero_slider": row.aero_slider,
        "suspension_slider": row.suspension_slider,
        "transmission_slider": row.transmission_slider,
        "pitcrew_slider": row.pitcrew_slider,
        "baseline_finish_time_s": row.baseline_finish_time_s,
        "predicted_finish_time_s": row.predicted_finish_time_s,
        "delta_s": row.delta_s,
        "rank_estimate": row.rank_estimate,
        "pit_error_risk": row.pit_error_risk,
        "modifiers": json.loads(row.modifiers_json),
        "contributions": json.loads(row.contributions_json),
    }
