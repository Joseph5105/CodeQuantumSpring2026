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

  // Create a new item
  createItem: async (item: ItemCreate): Promise<Item> => {
    const response = await api.post<Item>('/items/', item);
    return response.data;
  },

  // Delete an item
  deleteItem: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/items/${id}`);
    return response.data;
  },
};

export default api;
