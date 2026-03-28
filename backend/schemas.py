from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SliderSet(BaseModel):
    engine: int = Field(..., ge=0, le=100)
    aero: int = Field(..., ge=0, le=100)
    suspension: int = Field(..., ge=0, le=100)
    transmission: int = Field(..., ge=0, le=100)
    pitcrew: int = Field(..., ge=0, le=100)


class SimulationRequest(BaseModel):
    sliders: SliderSet
    selected_driver_number: str | None = None
    teammate_spillover_enabled: bool = True
    spillover_intensity: float = Field(default=0.10, ge=0.0, le=1.0)
    tradeoff_strength: float = Field(default=1.0, ge=0.5, le=2.0)


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
    expected_risk_event_probability: float
    expected_risk_time_penalty_s: float
    expected_rank_impact_from_risk: float
    confidence: float
    is_selected_driver: bool = False
    modifier_scope: str = "global"


class PitIncidentEvent(BaseModel):
    lap: int
    added_seconds: float
    roll: float


class LapPoint(BaseModel):
    lap: int
    lap_time: float
    cumulative_time: float


class RaceReportMetrics(BaseModel):
    top_speed_kph: float
    zero_to_sixty_s: float
    total_pit_time_s: float
    total_race_time_s: float
    avg_lap_time_s: float
    fake_placement_ranking: str


class SelectedDriverPlayback(BaseModel):
    risk_probability: float
    per_lap_chance: float
    events: list[PitIncidentEvent]
    lap_timeline: list[LapPoint]
    report_metrics: RaceReportMetrics


class SimulationResponse(BaseModel):
    simulation_id: int
    model_version: str
    next_track_probabilities: list[NextTrackProbability]
    top_results: list[DriverSimulationResult]
    modifiers: dict[str, float]
    selected_driver_number: str | None = None
    spillover_intensity: float = 0.10
    tradeoff_strength: float = 1.0
    tradeoff_penalties: dict[str, float] | None = None
    budget_cap: float = 30_000_000.0
    total_package_cost: float = 0.0
    remaining_budget: float = 30_000_000.0
    package_costs: dict[str, float] | None = None
    selected_driver_playback: SelectedDriverPlayback | None = None


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
    selected_driver_number: str | None = None
    teammate_spillover_enabled: bool = False
    spillover_intensity: float = 0.10
    tradeoff_strength: float = 1.0


class BudgetConfigResponse(BaseModel):
    budget_cap: float
    package_cost_gamma: float
    package_max_costs: dict[str, float]


class SimulationSummaryResponse(BaseModel):
    total_runs: int
    avg_delta_s: float | None = None
    avg_predicted_finish_time_s: float | None = None
    best_delta_s: float | None = None
    best_simulation_id: int | None = None
