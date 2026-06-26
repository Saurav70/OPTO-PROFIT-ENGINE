 # OPTO-PROFIT: Industrial Engineering Engine

OPTO-PROFIT is a specialized full-stack toolkit designed for industrial engineers to optimize assembly lines, floor layouts, and financial performance.

## 📁 Project Structure

- **`frontend/`**: React + Vite application. Built with a focus on data density, glassmorphism, and industrial aesthetics.
- **`backend/`**: FastAPI + MongoDB backend for persisting tasks, configurations, and profiles.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- MongoDB (Running on `localhost:27017`)

### Installation

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Backend
```bash
cd backend
python -m venv venv
./venv/Scripts/activate  # Windows
pip install -r requirements.txt
python main.py
```

## 🛠️ Tech Stack
- **Frontend**: React, Vite, Framer Motion, Recharts, Lucide-React.
- **Backend**: FastAPI, Motor (Async MongoDB), Pydantic.
- **Styling**: Vanilla CSS with CSS Variables for theme management.

## CI/CD
- **CI**: `.github/workflows/ci.yml`
  - Frontend: `npm ci`, `npm run lint`, `npm run build`
  - Backend: installs `backend/requirements.txt`, runs unit tests, starts API, checks `GET /api/status`
- **CD**: `.github/workflows/cd.yml`
  - Triggered after successful CI on `main` (or manually)
  - Builds and pushes Docker images to GHCR:
    - `ghcr.io/<owner>/<repo>/frontend`
    - `ghcr.io/<owner>/<repo>/backend`
  - Optional post-publish deploy hook with repository secret `DEPLOY_WEBHOOK_URL`

## 📐 Industrial Standards
The project adheres to the `optoprofit-standards.md` for visual consistency and data discipline.
