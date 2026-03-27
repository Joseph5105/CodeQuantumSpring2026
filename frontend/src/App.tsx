import { useState, useEffect } from 'react'
import { Database, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { itemService, type Item } from './services/api'
import './App.css'

function App() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState({ name: '', description: '' })

  const fetchItems = async () => {
    setLoading(true)
    try {
      const data = await itemService.getItems()
      setItems(data)
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.name || !newItem.description) return
    try {
      await itemService.createItem(newItem)
      setNewItem({ name: '', description: '' })
      fetchItems()
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return
    try {
      await itemService.deleteItem(id)
      fetchItems()
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  return (
    <div className="container">
      <header>
        <h1><Database className="icon" /> Hackathon Dashboard</h1>
        <p>FastAPI + React + TypeScript + SQLite</p>
      </header>

      <main>
        <section className="form-section">
          <h2>Add New Item</h2>
          <form onSubmit={addItem}>
            <input
              type="text"
              placeholder="Item Name"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            />
            <textarea
              placeholder="Description"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            />
            <button type="submit" className="add-btn">
              <Plus className="btn-icon" /> Add Item
            </button>
          </form>
        </section>

        <section className="list-section">
          <div className="section-header">
            <h2>Stored Items</h2>
            <button onClick={fetchItems} className="refresh-btn">
              <RefreshCcw className="btn-icon" /> Refresh
            </button>
          </div>

          {loading ? (
            <p>Loading items...</p>
          ) : (
            <div className="items-grid">
              {items.length === 0 ? (
                <p className="no-items">No items found. Add one above!</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="item-card">
                    <div className="card-header">
                      <h3>{item.name}</h3>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="delete-btn"
                        title="Delete Item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <p>{item.description}</p>
                    <small>ID: {item.id}</small>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
