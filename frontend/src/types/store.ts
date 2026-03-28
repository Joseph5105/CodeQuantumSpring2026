import type { Item, ItemCreate } from './item';

export interface ItemsContextType {
  items: Item[];
  loading: boolean;
  newItem: ItemCreate;
  setNewItem: React.Dispatch<React.SetStateAction<ItemCreate>>;
  fetchItems: () => Promise<void>;
  addItem: (e: React.FormEvent) => Promise<void>;
  handleDelete: (id: number) => Promise<void>;
}
