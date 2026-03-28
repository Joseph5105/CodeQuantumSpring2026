import json
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import database
from logic_engine import BUDGET_CAP, BudgetExceededError, SimulationEngine, UnknownDriverError
from schemas import (
    BudgetConfigResponse,
    DriverMeta,
    NextTrackProbability,
    RoundMeta,
    SimulationHistoryItem,
    SimulationRequest,
    SimulationResponse,
    SimulationSummaryResponse,
)

app = FastAPI(title="CodeQuantum F1 Simulation API")

# Allow the frontend to access the API when deployed on a different domain.
# For tighter security, replace ["*"] with ["https://codequantumspring2026-production.up.railway.app"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ENGINE = SimulationEngine()


@app.on_event("startup")
def startup_event() -> None:
    ENGINE.load()
    database.initialize_database()
    database.sync_reference_tables(ENGINE.get_driver_meta(), ENGINE.get_round_meta())


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "CodeQuantum F1 Simulation Backend/API"}


@app.get("/meta/next-track-probabilities", response_model=list[NextTrackProbability])
def get_next_track_probabilities() -> list[NextTrackProbability]:
    return [
        NextTrackProbability(**item) for item in ENGINE.get_next_track_probabilities()
    ]


@app.get("/config/budget", response_model=BudgetConfigResponse)
def get_budget_config() -> BudgetConfigResponse:
    return BudgetConfigResponse(**ENGINE.get_budget_config())


@app.post("/simulate", response_model=SimulationResponse)
def simulate_run(
    payload: SimulationRequest, db: Session = Depends(database.get_db)
) -> SimulationResponse:
    try:
        computation = ENGINE.simulate(payload)
    except UnknownDriverError as exc:
        raise HTTPException(status_code=422, detail=f"Unknown selected_driver_number: {exc}")
    except BudgetExceededError as exc:
        raise HTTPException(status_code=422, detail=exc.detail)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    row = database.save_simulation_run(db, payload, computation)

    selected_driver_playback = None
    if computation.selected_driver_number is not None:
        selected_driver = next(
            (
                driver
                for driver in computation.top_results
                if driver.driver_number == computation.selected_driver_number
            ),
            None,
        )
        if selected_driver is not None:
            selected_driver_playback = ENGINE.build_selected_driver_playback(
                selected_driver=selected_driver,
                simulation_id=row.id,
            )

    return SimulationResponse(
        simulation_id=row.id,
        model_version=computation.model_version,
        next_track_probabilities=[
            NextTrackProbability(**item) for item in computation.next_track_probs
        ],
        top_results=computation.top_results,
        modifiers=computation.selected_modifiers,
        selected_driver_number=computation.selected_driver_number,
        spillover_intensity=computation.spillover_intensity,
        tradeoff_strength=computation.tradeoff_strength,
        tradeoff_penalties=computation.tradeoff_penalties,
        budget_cap=BUDGET_CAP,
        total_package_cost=computation.total_package_cost,
        remaining_budget=computation.remaining_budget,
        package_costs=computation.package_costs,
        selected_driver_playback=selected_driver_playback,
    )


@app.get("/meta/drivers", response_model=list[DriverMeta])
def get_drivers() -> list[DriverMeta]:
    return [DriverMeta(**driver) for driver in ENGINE.get_driver_meta()]


@app.get("/meta/rounds", response_model=list[RoundMeta])
def get_rounds() -> list[RoundMeta]:
    return [RoundMeta(**round_data) for round_data in ENGINE.get_round_meta()]


@app.get("/db/drivers", response_model=list[DriverMeta])
def get_db_drivers(db: Session = Depends(database.get_db)) -> list[DriverMeta]:
    rows = database.list_driver_records(db)
    return [
        DriverMeta(
            driver_number=row.driver_number,
            driver_name=row.driver_name,
            team_name=row.team_name,
        )
        for row in rows
    ]


@app.get("/db/rounds", response_model=list[RoundMeta])
def get_db_rounds(db: Session = Depends(database.get_db)) -> list[RoundMeta]:
    rows = database.list_round_records(db)
    return [
        RoundMeta(
            round=row.round,
            event_name=row.event_name,
            country=row.country,
            location=row.location,
        )
        for row in rows
    ]


@app.get("/simulations", response_model=list[SimulationHistoryItem])
def list_simulations(
    limit: int = Query(default=25, ge=1, le=250),
    db: Session = Depends(database.get_db),
) -> list[Any]:
    return database.list_simulation_runs(db, limit)


@app.get("/simulations/latest", response_model=SimulationHistoryItem)
def get_latest_simulation(db: Session = Depends(database.get_db)) -> Any:
    latest = database.get_latest_simulation_run(db)
    if latest is None:
        raise HTTPException(status_code=404, detail="No simulations found")
    return latest


@app.get("/simulations/summary", response_model=SimulationSummaryResponse)
def get_simulation_summary(db: Session = Depends(database.get_db)) -> SimulationSummaryResponse:
    return SimulationSummaryResponse(**database.get_simulation_summary(db))


@app.get("/simulations/{simulation_id}")
def get_simulation(simulation_id: int, db: Session = Depends(database.get_db)) -> dict[str, Any]:
    row = database.get_simulation_run_by_id(db, simulation_id)

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
        "selected_driver_number": row.selected_driver_number,
        "teammate_spillover_enabled": row.teammate_spillover_enabled,
        "spillover_intensity": row.spillover_intensity,
        "tradeoff_strength": row.tradeoff_strength,
        "baseline_finish_time_s": row.baseline_finish_time_s,
        "predicted_finish_time_s": row.predicted_finish_time_s,
        "delta_s": row.delta_s,
        "rank_estimate": row.rank_estimate,
        "pit_error_risk": row.pit_error_risk,
        "modifiers": json.loads(row.modifiers_json),
        "contributions": json.loads(row.contributions_json),
    }
