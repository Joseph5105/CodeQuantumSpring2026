from sqlalchemy import Column, DateTime, Float, Integer, String, func
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

    baseline_finish_time_s = Column(Float, nullable=False)
    predicted_finish_time_s = Column(Float, nullable=False)
    delta_s = Column(Float, nullable=False)
    rank_estimate = Column(Integer, nullable=False)
    pit_error_risk = Column(Float, nullable=False)

    modifiers_json = Column(String, nullable=False)
    contributions_json = Column(String, nullable=False)
