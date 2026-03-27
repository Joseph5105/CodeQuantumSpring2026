import axios from 'axios';

// Create an axios instance with a base URL
// Our Vite proxy handles the '/api' prefix, so we use it here
const api = axios.create({
  baseURL: '/api',
});


/*Why Item and ItemCreate?
This is a standard pattern in API design called DTOs (Data Transfer Objects).

ItemCreate
: This represents what you send to the server. 
When you create an item, you don't know its id yet—the database generates that 
automatically. So, ItemCreate only asks for the name and description.

Item
: This represents what you receive from the server. Once an item is in the database, 
it has a unique id. This interface includes that id so the frontend knows how to identify it 
(e.g., for editing or deleting). The Benefit: It prevents the frontend from trying to "force" an 
ID on the database, and it keeps your data clean by separating "Input" from "Output."

*/
export interface Item {
  id: number;
  name: string;
  description: string;
}

export interface ItemCreate {
  name: string;
  description: string;
}

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
