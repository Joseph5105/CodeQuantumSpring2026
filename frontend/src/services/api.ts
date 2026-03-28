import axios from 'axios';
import type { Item, ItemCreate } from '../types/item';

// Create an axios instance with a base URL
// Our Vite proxy handles the '/api' prefix, so we use it here
const api = axios.create({
  baseURL: '/api',
});

// API functions
export const itemService = {
  // Fetch all items
  getItems: async (): Promise<Item[]> => {
    const response = await api.get<Item[]>('/items/');
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
