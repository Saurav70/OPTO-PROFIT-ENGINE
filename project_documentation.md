# OPTO-PROFIT Source Code Documentation

OPTO-PROFIT is a specialized full-stack toolkit designed for industrial engineers to optimize assembly lines, floor layouts, and financial performance. This document provides a comprehensive overview of the project's source code, architecture, and core modules.

---

## 1. System Architecture overview

The application is built using a modern full-stack architecture:
*   **Frontend**: React (Vite) application emphasizing data density, glassmorphism, and industrial-grade aesthetics.
*   **Backend**: FastAPI Python backend leveraging asynchronous MongoDB (Motor) for fast data persistence.
*   **Database**: MongoDB (Tasks, Users, Configurations, Profiles, Sessions).

---

## 2. Backend (`/backend`)

The backend provides a RESTful API for data persistence, user authentication, and data analysis.

### Core Modules

*   `app/main.py`
    *   **Entry Point**: Initializes the FastAPI application (`app = FastAPI(...)`).
    *   **CORS**: Configured to allow communication with the frontend origin (typically `localhost:5173`).
    *   **Authentication & Authorization**: Implements secure JWT-like session management (via MongoDB `sessions` collection), password hashing (PBKDF2-HMAC), and Two-Factor Authentication (2FA) using `pyotp`.
    *   **CRUD Endpoints**: Provides endpoints for managing `Tasks` (the core unit of work in process planning), `Config` (user-specific engine variables and custom formulas), and `Profiles`.
    *   **Password Management**: Implements forgot password and password reset token generation mechanisms.

*   `app/models.py`
    *   **Data Validation**: Utilizes Pydantic to enforce schema validation for all incoming and outgoing API requests.
    *   **Schemas**: Defines schemas like `User`, `Task`, `Config`, `Profile`, and authentication requests (`LoginRequest`, `RegisterRequest`).

*   `app/routers/`
    *   `analytics.py`: Encapsulates logic for retrieving and processing aggregated data or analytics.
    *   `healthcheck.py`: Basic liveness/readiness probes (e.g., `GET /api/status`).

---

## 3. Frontend (`/frontend`)

The frontend is a dynamic, highly interactive React application built with Vite. It features robust client-side routing, state management (lifted to root or context), and real-time calculation capabilities.

### 3.1 Core Components (`/frontend/src/components`)

*   **`Dashboard.jsx`**: The main overview screen summarizing key performance indicators (KPIs), active tasks, and recent profile data.
*   **`ProcessPlanning.jsx`**: Interface for defining individual tasks, their execution times, dependencies (predecessors), and zoning constraints.
*   **`LineOptimization.jsx`**: The core engineering view where line balancing occurs. Visualizes the assignment of tasks to workstations based on selected heuristics.
*   **`FloorLayout.jsx`**: A spatial or conceptual representation of the optimized assembly line or factory floor.
*   **`FinancialAnalytics.jsx`**: Displays ROI, payback periods, labor costs, and profit projections derived from the optimization engine.
*   **`FormulaEditor.jsx`**: An interface allowing advanced users to modify the underlying mathematical formulas (e.g., overriding the Takt Time formula).
*   **`Sidebar.jsx` & `StepNavigation.jsx`**: Persistent navigation providing structural flow through the industrial engineering modules.

### 3.2 Utilities & Engineering Engine (`/frontend/src/utils`)

This directory houses the core business logic, decoupled from UI components.

*   **`optimizer.js`**: The heart of the industrial engineering toolkit.
    *   `calculateTaktTime(config)`: Determines target cycle time based on available shift time and demand.
    *   `runOptimization(tasks, taktTime, heuristic, config)`: Performs Line Balancing using Ranked Positional Weight (RPW), Largest Task Follower (LTF), or Most Following Tasks (MFT). It respects zoning exclusions and calculates efficiency metrics (Balance Delay, Smoothness Index).
    *   `calculateCriticalPath(tasks, stations)`: Uses Forward/Backward Pass algorithms to determine Early/Late Starts/Finishes and identifies the critical path and bottleneck stations.
    *   `calculateROI(tasks, config, optimization)`: Combines operational data with financial variables to project profitability and payback periods.
*   **`formulaEngine.js`**: A custom parser/evaluator that takes mathematical string formulas (e.g., `"shift_time / demand"`) and dynamically computes results based on the current configuration state.
*   **`haptics.js`**: Utility for triggering micro-interactions and browser haptic feedback (if supported), enhancing the "premium" feel.
*   **`evaluator.js`**: Helper methods for safely evaluating dynamic mathematical expressions.

### 3.3 Services (`/frontend/src/services`)

*   **`api.js`**: An Axios-based HTTP client wrapper configured to inject Authorization headers (Bearer tokens) automatically and handle unified error responses from the FastAPI backend.

---

## 4. Engineering Standards & Styling

*   **Aesthetics**: Follows the `optoprofit-standards.md`. Uses a Dark Slate/Teal color palette, `Inter` typography, and extensive glassmorphism (`backdrop-filter: blur()`).
*   **Animations**: Utilizes `framer-motion` for smooth layout transitions and micro-interactions, ensuring the application feels "alive".
*   **Data Discipline**: All operational metrics strictly adhere to predefined metric units (mm, cm, m). Financials are inherently linked to operational cycle times and productivity gains.

---

## 5. CI/CD Pipeline

The project utilizes GitHub Actions for Continuous Integration and Deployment.
*   **CI (`.github/workflows/ci.yml`)**: Lints and builds the Vite frontend. Installs dependencies and runs unit tests for the FastAPI backend.
*   **CD (`.github/workflows/cd.yml`)**: Builds Docker images (Frontend/Backend) and pushes them to GitHub Container Registry (`ghcr.io`) upon merging to `main`.
