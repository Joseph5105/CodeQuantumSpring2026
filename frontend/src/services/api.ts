import axios from 'axios';

// Create an axios instance with a base URL
// Our Vite proxy handles the '/api' prefix, so we use it here
const api = axios.create({
  baseURL: '/api',
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
}

export interface NextTrackProbability {
  round: number;
  event_name: string;
  country: string;
  location: string;
  probability: number;
}

export interface DriverMeta {
  driver_number: string;
  driver_name: string;
  team_name: string;
}

export interface RoundMeta {
  round: number;
  event_name: string;
  country: string;
  location: string;
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
  confidence: number;
}

export interface SimulationResponse {
  simulation_id: number;
  model_version: string;
  next_track_probabilities: NextTrackProbability[];
  top_results: DriverSimulationResult[];
  modifiers: Record<string, number>;
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
}

export const simulationService = {
  getDrivers: async (): Promise<DriverMeta[]> => {
    const response = await api.get<DriverMeta[]>('/meta/drivers');
    return response.data;
  },

  getRounds: async (): Promise<RoundMeta[]> => {
    const response = await api.get<RoundMeta[]>('/meta/rounds');
    return response.data;
  },

  getNextTrackProbabilities: async (): Promise<NextTrackProbability[]> => {
    const response = await api.get<NextTrackProbability[]>('/meta/next-track-probabilities');
    return response.data;
  },

  simulate: async (payload: SimulationRequest): Promise<SimulationResponse> => {
    const response = await api.post<SimulationResponse>('/simulate', payload);
    return response.data;
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

export default api;
