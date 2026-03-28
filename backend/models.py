from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, func
from database import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, index=True)


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    model_version = Column(String, nullable=False, default="v0.1")

    round = Column(Integer, nullable=False, index=True)
    driver_number = Column(String, nullable=False, index=True)

    engine_slider = Column(Integer, nullable=False)
    aero_slider = Column(Integer, nullable=False)
    suspension_slider = Column(Integer, nullable=False)
    transmission_slider = Column(Integer, nullable=False)
    pitcrew_slider = Column(Integer, nullable=False)
    selected_driver_number = Column(String, nullable=True, index=True)
    teammate_spillover_enabled = Column(Boolean, nullable=False, default=True)
    spillover_intensity = Column(Float, nullable=False, default=0.10)
    tradeoff_strength = Column(Float, nullable=False, default=1.0)

    baseline_finish_time_s = Column(Float, nullable=False)
    predicted_finish_time_s = Column(Float, nullable=False)
    delta_s = Column(Float, nullable=False)
    rank_estimate = Column(Integer, nullable=False)
    pit_error_risk = Column(Float, nullable=False)

    modifiers_json = Column(String, nullable=False)
    contributions_json = Column(String, nullable=False)


class DriverRecord(Base):
    __tablename__ = "driver_records"

    id = Column(Integer, primary_key=True, index=True)
    driver_number = Column(String, nullable=False, unique=True, index=True)
    driver_name = Column(String, nullable=False)
    team_name = Column(String, nullable=False, index=True)


class RoundRecord(Base):
    __tablename__ = "round_records"

    id = Column(Integer, primary_key=True, index=True)
    round = Column(Integer, nullable=False, unique=True, index=True)
    event_name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    location = Column(String, nullable=False)
