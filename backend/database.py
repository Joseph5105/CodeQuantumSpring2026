import json
from typing import Any

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def initialize_database() -> None:
    import models

    models.Base.metadata.create_all(bind=engine)
    _ensure_simulation_run_schema()


def _ensure_simulation_run_schema() -> None:
    inspector = inspect(engine)
    if "simulation_runs" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("simulation_runs")}
    alter_statements = [
        (
            "selected_driver_number",
            "ALTER TABLE simulation_runs ADD COLUMN selected_driver_number VARCHAR",
        ),
        (
            "teammate_spillover_enabled",
            "ALTER TABLE simulation_runs ADD COLUMN teammate_spillover_enabled INTEGER NOT NULL DEFAULT 1",
        ),
        (
            "spillover_intensity",
            "ALTER TABLE simulation_runs ADD COLUMN spillover_intensity FLOAT NOT NULL DEFAULT 0.10",
        ),
        (
            "tradeoff_strength",
            "ALTER TABLE simulation_runs ADD COLUMN tradeoff_strength FLOAT NOT NULL DEFAULT 1.0",
        ),
    ]

    with engine.begin() as conn:
        for column_name, statement in alter_statements:
            if column_name not in existing:
                conn.execute(text(statement))


def sync_reference_tables(driver_meta: list[dict[str, str]], round_meta: list[dict[str, Any]]) -> None:
    import models

    db = SessionLocal()
    try:
        db.query(models.DriverRecord).delete()
        db.query(models.RoundRecord).delete()

        driver_rows = [
            models.DriverRecord(
                driver_number=str(driver["driver_number"]),
                driver_name=str(driver["driver_name"]),
                team_name=str(driver["team_name"]),
            )
            for driver in driver_meta
        ]

        round_rows = [
            models.RoundRecord(
                round=int(round_data["round"]),
                event_name=str(round_data["event_name"]),
                country=str(round_data["country"]),
                location=str(round_data["location"]),
            )
            for round_data in round_meta
        ]

        if driver_rows:
            db.bulk_save_objects(driver_rows)
        if round_rows:
            db.bulk_save_objects(round_rows)

        db.commit()
    finally:
        db.close()


def save_simulation_run(
    db,
    payload,
    computation,
) -> Any:
    import models

    leader = computation.top_results[0]
    row = models.SimulationRun(
        model_version=computation.model_version,
        round=int(computation.next_track_probs[0]["round"]),
        driver_number="ALL",
        engine_slider=payload.sliders.engine,
        aero_slider=payload.sliders.aero,
        suspension_slider=payload.sliders.suspension,
        transmission_slider=payload.sliders.transmission,
        pitcrew_slider=payload.sliders.pitcrew,
        selected_driver_number=payload.selected_driver_number,
        teammate_spillover_enabled=payload.teammate_spillover_enabled,
        spillover_intensity=payload.spillover_intensity,
        tradeoff_strength=payload.tradeoff_strength,
        baseline_finish_time_s=leader.expected_baseline_finish_time_s,
        predicted_finish_time_s=leader.expected_predicted_finish_time_s,
        delta_s=leader.expected_delta_s,
        rank_estimate=int(round(leader.expected_rank_estimate)),
        pit_error_risk=leader.expected_pit_error_risk,
        modifiers_json=json.dumps(
            {
                "base_modifiers": computation.base_modifiers,
                "selected_driver_modifiers": computation.selected_modifiers,
                "tradeoff_penalties": computation.tradeoff_penalties,
                "budget_cap": computation.total_package_cost + computation.remaining_budget,
                "total_package_cost": computation.total_package_cost,
                "remaining_budget": computation.remaining_budget,
                "package_costs": computation.package_costs,
            }
        ),
        contributions_json=json.dumps(
            {
                "next_track_probabilities": computation.next_track_probs,
                "leader_driver": leader.driver_number,
                "selected_driver_number": computation.selected_driver_number,
                "teammate_spillover_enabled": payload.teammate_spillover_enabled,
                "spillover_intensity": computation.spillover_intensity,
                "teammate_numbers": computation.teammate_numbers,
                "budget": {
                    "budget_cap": computation.total_package_cost + computation.remaining_budget,
                    "total_package_cost": computation.total_package_cost,
                    "remaining_budget": computation.remaining_budget,
                    "package_costs": computation.package_costs,
                },
            }
        ),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_driver_records(db) -> list[Any]:
    import models

    return (
        db.query(models.DriverRecord)
        .order_by(models.DriverRecord.driver_number.asc())
        .all()
    )


def list_round_records(db) -> list[Any]:
    import models

    return db.query(models.RoundRecord).order_by(models.RoundRecord.round.asc()).all()


def list_simulation_runs(db, limit: int) -> list[Any]:
    import models

    return (
        db.query(models.SimulationRun)
        .order_by(models.SimulationRun.created_at.desc())
        .limit(limit)
        .all()
    )


def get_latest_simulation_run(db) -> Any:
    import models

    return (
        db.query(models.SimulationRun)
        .order_by(models.SimulationRun.created_at.desc())
        .first()
    )


def get_simulation_run_by_id(db, simulation_id: int) -> Any:
    import models

    return (
        db.query(models.SimulationRun)
        .filter(models.SimulationRun.id == simulation_id)
        .first()
    )


def get_simulation_summary(db) -> dict[str, Any]:
    runs = list_simulation_runs(db, limit=10_000)
    if not runs:
        return {
            "total_runs": 0,
            "avg_delta_s": None,
            "avg_predicted_finish_time_s": None,
            "best_delta_s": None,
            "best_simulation_id": None,
        }

    total_runs = len(runs)
    avg_delta = float(sum(row.delta_s for row in runs) / total_runs)
    avg_predicted = float(sum(row.predicted_finish_time_s for row in runs) / total_runs)
    best = min(runs, key=lambda row: row.delta_s)
    return {
        "total_runs": total_runs,
        "avg_delta_s": avg_delta,
        "avg_predicted_finish_time_s": avg_predicted,
        "best_delta_s": float(best.delta_s),
        "best_simulation_id": int(best.id),
    }
