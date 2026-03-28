import axios from 'axios';
import type { Item, ItemCreate } from '../types/item';

// Create an axios instance with a base URL
// Our Vite proxy handles the '/api' prefix locally. 
// In production (Railway), we inject the real backend URL via VITE_API_URL.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

export interface Sliders {
  engine: number;
  aero: number;
  suspension: number;
  transmission: number;
  pitcrew: number;
}

export interface SimulationRequest {
  sliders: Sliders;
  selected_driver_number?: string | null;
  teammate_spillover_enabled?: boolean;
  spillover_intensity?: number;
  tradeoff_strength?: number;
}

export interface DriverMeta {
  driver_number: string;
  driver_name: string;
  team_name: string;
}

export interface NextTrackProbability {
  round: number;
  event_name: string;
  country: string;
  location: string;
  probability: number;
}

export interface DriverSimulationResult {
  driver_number: string;
  driver_name: string;
  team_name: string;
  expected_baseline_finish_time_s: number;
  expected_predicted_finish_time_s: number;
  expected_delta_s: number;
  expected_rank_estimate: number;
  expected_pit_error_risk: number;
  expected_risk_event_probability: number;
  expected_risk_time_penalty_s: number;
  expected_rank_impact_from_risk: number;
  confidence: number;
  is_selected_driver?: boolean;
  modifier_scope?: string;
}

export interface PitIncidentEvent {
  lap: number;
  added_seconds: number;
  roll: number;
}

export interface LapPoint {
  lap: number;
  lap_time: number;
  cumulative_time: number;
}

export interface SimulationResponse {
  simulation_id: number;
  model_version: string;
  next_track_probabilities: NextTrackProbability[];
  top_results: DriverSimulationResult[];
  modifiers: Record<string, number>;
  selected_driver_number?: string | null;
  spillover_intensity?: number;
  tradeoff_strength?: number;
  tradeoff_penalties?: Record<string, number> | null;
  budget_cap?: number;
  total_package_cost?: number;
  remaining_budget?: number;
  package_costs?: Record<string, number> | null;
  selected_driver_playback?: {
    risk_probability: number;
    per_lap_chance: number;
    events: PitIncidentEvent[];
    lap_timeline: LapPoint[];
    report_metrics: RaceReportMetrics;
  } | null;
}

export interface RaceReportMetrics {
  top_speed_kph: number;
  zero_to_sixty_s: number;
  total_pit_time_s: number;
  total_race_time_s: number;
  avg_lap_time_s: number;
  fake_placement_ranking: string;
}

export interface SimulationHistoryItem {
  id: number;
  created_at: string;
  model_version: string;
  round: number;
  driver_number: string;
  baseline_finish_time_s: number;
  predicted_finish_time_s: number;
  delta_s: number;
  rank_estimate: number;
  pit_error_risk: number;
  selected_driver_number?: string | null;
  teammate_spillover_enabled?: boolean;
  spillover_intensity?: number;
  tradeoff_strength?: number;
}

export interface BudgetConfig {
  budget_cap: number;
  package_cost_gamma: number;
  package_max_costs: Record<string, number>;
}

export type BudgetExceededDetail = {
  error: string;
  budget_cap: number;
  total_requested: number;
  over_budget_by: number;
  remaining_budget: number;
  package_costs: Record<string, number>;
};

// API functions
export const itemService = {
  // Fetch all items
  getItems: async (): Promise<Item[]> => {
    const response = await api.get<Item[]>('/items/');
    return response.data;
  },

  createItem: async (payload: ItemCreate): Promise<Item> => {
    const response = await api.post<Item>('/items/', payload);
    return response.data;
  },

  deleteItem: async (id: number): Promise<void> => {
    await api.delete(`/items/${id}`);
  },

  getSimulationHistory: async (limit = 25): Promise<SimulationHistoryItem[]> => {
    const response = await api.get<SimulationHistoryItem[]>('/simulations', {
      params: { limit },
    });
    return response.data;
  },

  getSimulationById: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get<Record<string, unknown>>(`/simulations/${id}`);
    return response.data;
  },
};

export const simulationService = {
  getDrivers: async (): Promise<DriverMeta[]> => {
    const response = await api.get<DriverMeta[]>('/meta/drivers');
    return response.data;
  },

  getBudgetConfig: async (): Promise<BudgetConfig> => {
    const response = await api.get<BudgetConfig>('/config/budget');
    return response.data;
  },

  simulate: async (payload: SimulationRequest): Promise<SimulationResponse> => {
    const response = await api.post<SimulationResponse>('/simulate', payload);
    return response.data;
  },
};

export default api;
