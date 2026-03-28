from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from schemas import DriverSimulationResult, SimulationRequest, SliderSet

MODEL_VERSION = "v0.4-driver-focused-tradeoffs-budget"
MODIFIER_RANGES = {
    "engine": (-0.010, 0.030),
    "aero": (-0.015, 0.025),
    "suspension": (-0.010, 0.020),
    "transmission": (-0.008, 0.015),
    "pit_time": (0.100, -0.150),
    "pit_risk": (0.040, -0.030),
}

TRADEOFF_THRESHOLD = 0.70
SELF_PENALTY_ALPHA = {
    "engine": 0.020,
    "aero": 0.016,
    "suspension": 0.012,
    "transmission": 0.010,
}
CROSS_PENALTY_BETA = {
    "engine": 0.006,
    "aero": 0.005,
    "suspension": 0.004,
    "transmission": 0.003,
}
TEAMMATE_SPILLOVER_MULTIPLIER = 2.5
SPILLOVER_CAPS = {
    "engine": 0.008,
    "aero": 0.008,
    "suspension": 0.006,
    "transmission": 0.005,
    "pit_time": 0.020,
    "pit_risk": 0.010,
}

BUDGET_CAP = 30_000_000.0
PACKAGE_COST_GAMMA = 1.5
PACKAGE_MAX_COSTS = {
    "engine": 15_000_000.0,
    "aero": 9_000_000.0,
    "suspension": 6_000_000.0,
    "transmission": 7_000_000.0,
    "pitcrew": 3_500_000.0,
}


class UnknownDriverError(Exception):
    pass


class BudgetExceededError(Exception):
    def __init__(self, detail: dict[str, Any]) -> None:
        super().__init__("Budget exceeded")
        self.detail = detail


@dataclass
class SimulationComputation:
    model_version: str
    next_track_probs: list[dict[str, Any]]
    top_results: list[DriverSimulationResult]
    selected_modifiers: dict[str, float]
    base_modifiers: dict[str, float]
    tradeoff_penalties: dict[str, float]
    total_package_cost: float
    remaining_budget: float
    package_costs: dict[str, float]
    selected_driver_number: str | None
    spillover_intensity: float
    tradeoff_strength: float
    teammate_numbers: list[str]


class F1DataStore:
    def __init__(self) -> None:
        self.race_df: pd.DataFrame | None = None
        self.driver_meta: list[dict[str, str]] = []
        self.round_meta: list[dict[str, Any]] = []
        self.driver_dnf_rate: dict[str, float] = {}
        self.round_time_lookup: dict[int, list[float]] = {}
        self.driver_to_team: dict[str, str] = {}
        self.team_to_drivers: dict[str, list[str]] = {}

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
            | status.str.contains(r"\+\s*\d+\s*lap", regex=True)
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

        self.driver_to_team = {
            str(row["DriverNumber"]): str(row["TeamName"])
            for _, row in race[["DriverNumber", "TeamName"]]
            .dropna(subset=["DriverNumber", "TeamName"])
            .drop_duplicates(subset=["DriverNumber"], keep="first")
            .iterrows()
        }

        team_to_drivers: dict[str, list[str]] = {}
        for driver_number, team_name in self.driver_to_team.items():
            team_to_drivers.setdefault(team_name, []).append(driver_number)
        self.team_to_drivers = team_to_drivers

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

    def get_teammates(self, driver_number: str) -> set[str]:
        team_name = self.driver_to_team.get(driver_number)
        if team_name is None:
            return set()
        return {
            other
            for other in self.team_to_drivers.get(team_name, [])
            if other != driver_number
        }

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


class SimulationEngine:
    def __init__(self) -> None:
        self.data = F1DataStore()

    def load(self) -> None:
        self.data.load()

    def get_driver_meta(self) -> list[dict[str, str]]:
        return self.data.driver_meta

    def get_round_meta(self) -> list[dict[str, Any]]:
        return self.data.round_meta

    def get_next_track_probabilities(self) -> list[dict[str, Any]]:
        return self.data.get_next_track_probabilities()

    @staticmethod
    def get_budget_config() -> dict[str, Any]:
        return {
            "budget_cap": BUDGET_CAP,
            "package_cost_gamma": PACKAGE_COST_GAMMA,
            "package_max_costs": {
                key: float(value) for key, value in PACKAGE_MAX_COSTS.items()
            },
        }

    @staticmethod
    def slider_to_modifier(slider_value: int, value_range: tuple[float, float]) -> float:
        low, high = value_range
        ratio = np.clip(slider_value / 100.0, 0.0, 1.0)
        return float(low + ((high - low) * ratio))

    def calculate_modifiers(self, sliders: SliderSet) -> dict[str, float]:
        return {
            "engine": self.slider_to_modifier(sliders.engine, MODIFIER_RANGES["engine"]),
            "aero": self.slider_to_modifier(sliders.aero, MODIFIER_RANGES["aero"]),
            "suspension": self.slider_to_modifier(
                sliders.suspension, MODIFIER_RANGES["suspension"]
            ),
            "transmission": self.slider_to_modifier(
                sliders.transmission, MODIFIER_RANGES["transmission"]
            ),
            "pit_time": self.slider_to_modifier(sliders.pitcrew, MODIFIER_RANGES["pit_time"]),
            "pit_risk": self.slider_to_modifier(sliders.pitcrew, MODIFIER_RANGES["pit_risk"]),
        }

    @staticmethod
    def calculate_package_costs(sliders: SliderSet) -> dict[str, float]:
        slider_map = {
            "engine": sliders.engine,
            "aero": sliders.aero,
            "suspension": sliders.suspension,
            "transmission": sliders.transmission,
            "pitcrew": sliders.pitcrew,
        }

        costs: dict[str, float] = {}
        for package, slider_value in slider_map.items():
            ratio = float(np.clip(slider_value / 100.0, 0.0, 1.0))
            costs[package] = float(PACKAGE_MAX_COSTS[package] * (ratio**PACKAGE_COST_GAMMA))
        return costs

    @staticmethod
    def enforce_budget_cap_or_raise(package_costs: dict[str, float]) -> tuple[float, float]:
        total_cost = float(sum(package_costs.values()))
        remaining_budget = float(BUDGET_CAP - total_cost)

        if remaining_budget < 0:
            raise BudgetExceededError(
                {
                    "error": "BUDGET_EXCEEDED",
                    "budget_cap": BUDGET_CAP,
                    "total_requested": total_cost,
                    "over_budget_by": abs(remaining_budget),
                    "remaining_budget": remaining_budget,
                    "package_costs": package_costs,
                }
            )

        return total_cost, remaining_budget

    @staticmethod
    def apply_tradeoff_penalties(
        base_modifiers: dict[str, float],
        sliders: SliderSet,
        tradeoff_strength: float,
    ) -> tuple[dict[str, float], dict[str, float]]:
        slider_norm = {
            "engine": sliders.engine / 100.0,
            "aero": sliders.aero / 100.0,
            "suspension": sliders.suspension / 100.0,
            "transmission": sliders.transmission / 100.0,
        }

        adjusted = dict(base_modifiers)
        penalties: dict[str, float] = {}

        for package in ["engine", "aero", "suspension", "transmission"]:
            s_i = slider_norm[package]
            self_penalty = (
                SELF_PENALTY_ALPHA[package]
                * max(0.0, s_i - TRADEOFF_THRESHOLD) ** 2
                * tradeoff_strength
            )
            other_avg = float(
                np.mean([slider_norm[k] for k in slider_norm if k != package])
            )
            cross_penalty = CROSS_PENALTY_BETA[package] * other_avg * tradeoff_strength
            total_penalty = self_penalty + cross_penalty
            adjusted[package] = base_modifiers[package] - total_penalty
            penalties[f"{package}_self_penalty"] = float(self_penalty)
            penalties[f"{package}_cross_penalty"] = float(cross_penalty)
            penalties[f"{package}_total_penalty"] = float(total_penalty)

        penalties["tradeoff_strength"] = float(tradeoff_strength)
        return adjusted, penalties

    @staticmethod
    def scale_modifiers_for_spillover(
        modifiers: dict[str, float],
        spillover_scale: float,
    ) -> dict[str, float]:
        scaled: dict[str, float] = {}
        for key, value in modifiers.items():
            scaled_value = float(value * spillover_scale)
            cap = SPILLOVER_CAPS.get(key)
            if cap is not None:
                scaled_value = float(np.clip(scaled_value, -cap, cap))
            scaled[key] = scaled_value
        return scaled

    def get_effective_driver_modifiers(
        self,
        driver_number: str,
        selected_driver_number: str | None,
        teammate_numbers: set[str],
        modifiers_for_selected: dict[str, float],
        teammate_spillover_enabled: bool,
        spillover_intensity: float,
    ) -> tuple[dict[str, float], str]:
        if selected_driver_number is None:
            return modifiers_for_selected, "global"

        if driver_number == selected_driver_number:
            return modifiers_for_selected, "selected"

        if teammate_spillover_enabled and driver_number in teammate_numbers:
            teammate_scale = float(
                np.clip(spillover_intensity * TEAMMATE_SPILLOVER_MULTIPLIER, 0.0, 1.0)
            )
            return (
                self.scale_modifiers_for_spillover(modifiers_for_selected, teammate_scale),
                "teammate",
            )

        other_scale = float(np.clip(spillover_intensity, 0.0, 1.0))
        return (
            self.scale_modifiers_for_spillover(modifiers_for_selected, other_scale),
            "other",
        )

    @staticmethod
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

        no_risk_predicted = max(1.0, predicted - risk_penalty_s)
        no_risk_rank_estimate = rank_estimate
        if round_times:
            no_risk_rank_estimate = float(
                1 + sum(float(t) < no_risk_predicted for t in round_times)
            )

        variability_penalty = min(profile["lap_std_ratio"], 0.20)
        confidence = float(np.clip(0.90 - (variability_penalty * 2.5), 0.35, 0.90))

        return {
            "baseline_finish_time_s": float(baseline),
            "predicted_finish_time_s": float(predicted),
            "delta_s": float(predicted - baseline),
            "rank_estimate": rank_estimate,
            "pit_error_risk": pit_error_risk,
            "risk_time_penalty_s": float(risk_penalty_s),
            "no_risk_predicted_finish_time_s": float(no_risk_predicted),
            "no_risk_rank_estimate": float(no_risk_rank_estimate),
            "rank_impact_from_risk": float(rank_estimate - no_risk_rank_estimate),
            "confidence": confidence,
        }

    def simulate(self, payload: SimulationRequest) -> SimulationComputation:
        next_track_probs = self.data.get_next_track_probabilities()
        if not next_track_probs:
            raise RuntimeError("Next track probabilities unavailable")

        available_driver_numbers = {
            str(driver["driver_number"]) for driver in self.data.driver_meta
        }
        if (
            payload.selected_driver_number is not None
            and payload.selected_driver_number not in available_driver_numbers
        ):
            raise UnknownDriverError(payload.selected_driver_number)

        package_costs = self.calculate_package_costs(payload.sliders)
        total_package_cost, remaining_budget = self.enforce_budget_cap_or_raise(package_costs)

        base_modifiers = self.calculate_modifiers(payload.sliders)
        selected_modifiers, tradeoff_penalties = self.apply_tradeoff_penalties(
            base_modifiers,
            payload.sliders,
            payload.tradeoff_strength,
        )

        teammate_numbers: set[str] = set()
        if payload.selected_driver_number is not None:
            teammate_numbers = self.data.get_teammates(payload.selected_driver_number)

        driver_results: list[DriverSimulationResult] = []

        for driver in self.data.driver_meta:
            driver_number = str(driver["driver_number"])
            weighted_baseline = 0.0
            weighted_predicted = 0.0
            weighted_delta = 0.0
            weighted_rank = 0.0
            weighted_risk = 0.0
            weighted_risk_penalty_s = 0.0
            weighted_rank_impact_risk = 0.0
            weighted_confidence = 0.0
            valid_mass = 0.0

            for track in next_track_probs:
                prob = float(track["probability"])
                round_id = int(track["round"])

                try:
                    profile = self.data.get_profile(round_id, driver_number)
                except KeyError:
                    continue

                effective_modifiers, modifier_scope = self.get_effective_driver_modifiers(
                    driver_number=driver_number,
                    selected_driver_number=payload.selected_driver_number,
                    teammate_numbers=teammate_numbers,
                    modifiers_for_selected=selected_modifiers,
                    teammate_spillover_enabled=payload.teammate_spillover_enabled,
                    spillover_intensity=payload.spillover_intensity,
                )

                sim = self.run_simulation(profile, effective_modifiers)
                weighted_baseline += prob * sim["baseline_finish_time_s"]
                weighted_predicted += prob * sim["predicted_finish_time_s"]
                weighted_delta += prob * sim["delta_s"]
                weighted_rank += prob * sim["rank_estimate"]
                weighted_risk += prob * sim["pit_error_risk"]
                weighted_risk_penalty_s += prob * sim["risk_time_penalty_s"]
                weighted_rank_impact_risk += prob * sim["rank_impact_from_risk"]
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
                    expected_risk_event_probability=weighted_risk * inv_mass,
                    expected_risk_time_penalty_s=weighted_risk_penalty_s * inv_mass,
                    expected_rank_impact_from_risk=weighted_rank_impact_risk * inv_mass,
                    confidence=weighted_confidence * inv_mass,
                    is_selected_driver=(driver_number == payload.selected_driver_number),
                    modifier_scope=modifier_scope,
                )
            )

        if not driver_results:
            raise RuntimeError("No driver simulation results available")

        driver_results.sort(key=lambda d: d.expected_predicted_finish_time_s)
        top_results = driver_results[:10]

        return SimulationComputation(
            model_version=MODEL_VERSION,
            next_track_probs=next_track_probs,
            top_results=top_results,
            selected_modifiers=selected_modifiers,
            base_modifiers=base_modifiers,
            tradeoff_penalties=tradeoff_penalties,
            total_package_cost=total_package_cost,
            remaining_budget=remaining_budget,
            package_costs=package_costs,
            selected_driver_number=payload.selected_driver_number,
            spillover_intensity=payload.spillover_intensity,
            tradeoff_strength=payload.tradeoff_strength,
            teammate_numbers=sorted(teammate_numbers),
        )
