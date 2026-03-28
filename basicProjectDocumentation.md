# Project Documentation: CodeQuantum 2026 Hackathon API

This document provides an overview of the project structure, describing the purpose and function of each file in Both the frontend and backend.

## 🗄 Backend (FastAPI + SQLite)

The backend is built with **FastAPI** and uses **SQLAlchemy** as an ORM (Object-Relational Mapper) to interact with a **SQLite** database.

| File | Purpose | How it works |
| :--- | :--- | :--- |
| `main.py` | API Entry Point & Routes | Defines the FastAPI app and all HTTP endpoints (`/`, `/items/`, and `DELETE /items/{id}`). |
| `models.py` | Database Schema | Defines the `Item` class, which represents the `items` table in the database. |
| `database.py` | DB Connection & Sessions | Sets up the SQLite database connection and provides a `get_db` dependency for managing database sessions. |
| `requirements.txt` | Dependencies | Lists the Python libraries needed (FastAPI, SQLAlchemy, Uvicorn, **Ruff**, etc.) for `pip install`. |

---

## 🚀 Recommended Scalable Structure (For Growth)

If you decide to expand this project with many more pages and complex logic, I recommend migrating to the following structure to keep your code organized and maintainable.

.

### 🐍 Backend (Modular)
```text
backend/
├── app/
│   ├── main.py          # Entry point (initializes FastAPI and adds routes)
│   ├── api/             # Business logic split by feature
│   │   ├── routers.py   # Main router that includes all others
│   │   └── endpoints/   
│   │       ├── items.py # Just the logic for /items
│   │       └── users.py # Just the logic for /users
│   ├── db/              # Session and engine setup (database.py)
│   ├── models/          # SQLAlchemy Database models
│   ├── schemas/         # Pydantic models (Data validation)
│   └── crud/            # Database operations (Create, Read, Update, Delete)
└── .env                 # Environment variables (DB_URL, etc.)
```

### 💻 Frontend (Component-Driven)
```text
frontend/
├── src/
│   ├── components/      # Reusable UI pieces (Button, Navbar, Card)
│   ├── pages/           # Whole screens (Home, Profile, Dashboard)
│   ├── services/        # API calls (e.g., api.ts)
│   ├── hooks/           # Custom React hooks for shared logic
│   ├── store/           # Global state management
│   ├── styles/          # Global CSS and themes
│   ├── types/           # Shared TypeScript interfaces
│   └── main.tsx         # App entry point
└── vite.config.ts
```

---

## 💻 Frontend (React + TypeScript + Vite)

The frontend is a modern **React** application built with **Vite** and **TypeScript** for type safety.

| File | Purpose | How it works |
| :--- | :--- | :--- |
| `src/App.tsx` | Main UI Component | Contains the core UI layout and logic. Now calls `itemService` instead of raw axios. |
| `src/services/api.ts` | API Service | Centralizes all backend communication (GET, POST, DELETE), including Axios instance setup and data types. |
| `src/main.tsx` | React Entry Point | Mounts the `App` component into the `index.html` root element. |
| `vite.config.ts` | Vite Configuration | Configures the dev server and a **proxy**. It routes all calls to `/api/*` to `http://localhost:8000`, solving CORS issues automatically. |
| `index.html` | HTML Shell | The base HTML file where the React app is injected. |
| `src/App.css` | UI Styling | Contains the layout and design styles for the dashboard and item cards. |
| `package.json` | Project Config | Manages npm dependencies (React, Icons, Axios) and scripts like `npm run dev`. |

---

## 🔄 Full Stack Interaction Flow

1. **User Action**: A user fills out the "Add New Item" form in `App.tsx` and clicks "Add Item".
2. **Frontend Request**: `App.tsx` makes an `axios.post('/api/items/')` request.
3. **Vite Proxy**: `vite.config.ts` intercepts the request and forwards it to `http://localhost:8000/items/`.
4. **Backend Processing**: `main.py` receives the request, validates the data with Pydantic, and calls SQLAlchemy to save it to `sql_app.db`.
5. **Response**: The backend returns the new item. `App.tsx` updates its state and refreshes the list automatically.
