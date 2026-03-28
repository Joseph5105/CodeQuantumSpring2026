# Hackathon Website Template (Vite + FastAPI)

This is a full-stack template designed for quick iteration during hackathons. It features a React frontend, a FastAPI backend, and a simple SQLite database setup.

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv

.

# Activation (Choose based on your terminal):
source venv/Scripts/activate      # Git Bash (MINGW64)
venv\Scripts\activate            # Command Prompt
.\venv\Scripts\Activate.ps1      # PowerShell

pip install -r requirements.txt
uvicorn main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🛠 Project Structure

- `frontend/`: React + Vite + TypeScript application.
  - `src/App.tsx`: Main UI and data fetching logic.
  - `vite.config.ts`: Proxy setup to route `/api` calls to the backend.
- `backend/`: FastAPI + Python application.
  - `main.py`: API endpoints and logic.
  - `models.py`: Database schema.
  - `database.py`: SQLAlchemy & SQLite configuration.

---

## 🏗 Features Included
- **Auto-Seeding**: The backend automatically seeds the SQLite DB with sample data on first run.
- **Type Safety**: TypeScript on the frontend and Pydantic on the backend.
- **Modern UI**: Icons via `lucide-react` and clean layout.
- **Proxy Setup**: Direct communication between frontend and backend without CORS headaches.

---

## ✨ Code Quality (Linting & Formatting)

Maintain clean code by running the linters for both frontend and backend.

### Frontend (ESLint)
In the `frontend` directory:
```bash
npm run lint
```

### Backend (Ruff)
In the `backend` directory (with virtual environment activated):
```bash
# Check for linting errors
ruff check

# Automatically fix linting and formatting
ruff check --fix
ruff format
```

---

## 🐙 Git Workflow & Deployment

Use these commands to manage your changes and collaborate with others.

### 1. Initialize a new Repository
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Regular Workflow (Pushing Changes)
```bash
git add .
git commit -m "Describe your changes"
git push origin main
```

### 3. Collaboration (Pulling & Cloning)
```bash
# Get the latest changes from the repo
git pull origin main

# Clone the project for the first time
git clone <your-github-repo-url>
```

---

## 📝 Documentation
- **API Swagger**: Visit `/docs` on the backend for interactive API documentation.
- **Vite Proxy**: Configured in `vite.config.ts` to handle API routing effortlessly.
