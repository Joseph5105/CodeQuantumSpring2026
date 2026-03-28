import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { itemService } from '../services/api';
import type { Item, ItemCreate } from '../types/item';
import type { ItemsContextType } from '../types/store';

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

export const ItemsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState<ItemCreate>({ name: '', description: '' });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await itemService.getItems();
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.description) return;
    try {
      await itemService.createItem(newItem);
      setNewItem({ name: '', description: '' });
      await fetchItems();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await itemService.deleteItem(id);
      await fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <ItemsContext.Provider value={{
      items,
      loading,
      newItem,
      setNewItem,
      fetchItems,
      addItem,
      handleDelete
    }}>
      {children}
    </ItemsContext.Provider>
  );
};

export const useItems = () => {
  const context = useContext(ItemsContext);
  if (context === undefined) {
    throw new Error('useItems must be used within an ItemsProvider');
  }
  return context;
};
