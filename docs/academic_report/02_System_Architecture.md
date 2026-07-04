# 2. System Architecture & Deployment

## 2.1 Architectural Paradigm
OPTO-PROFIT is designed using a strictly decoupled, two-tier Single Page Application (SPA) architecture, purposefully modified for an offline-first desktop deployment. Unlike traditional Software as a Service (SaaS) web platforms, the system completely severs external network dependencies, ensuring that highly sensitive factory models are never transmitted off-device.

The system relies on three distinct operational tiers acting in unison on the local machine:
1. **Client Tier (Frontend)**: A React 19 Single Page Application.
2. **Server Tier (Backend)**: An asynchronous FastAPI application.
3. **Desktop Wrapper Tier**: An Electron and PyInstaller integration layer that orchestrates the simultaneous launch of the frontend and backend, wrapping them into a single, cohesive executable (`OPTO-PROFIT.exe`).

## 2.2 Client Tier Stack
The user interface is engineered for deterministic, high-performance interactions, primarily offloading complex array calculations to the client-side JavaScript V8 engine to guarantee zero-latency UI updates.

**Core Technologies:**
- **Framework:** React 19 built with Vite 5. The Vite bundler employs aggressive manual Rollup chunk splitting (`vendor-react`, `vendor-motion`), ensuring an initial payload size under 150KB and a Time-To-Interactive (TTI) of 0.6 seconds.
- **State Management:** `Zustand` provides a lightweight, flux-like global state machine, eliminating the boilerplate overhead associated with Redux.
- **Spatial / Network Visualization:** `@xyflow/react` is utilized to map Directed Acyclic Graphs (DAGs) representing complex task precedence constraints.
- **Mathematical Evaluation:** `mathjs` safely parses and evaluates custom, user-defined financial formulas in a restricted sandbox context.

## 2.3 Server Tier Stack
The backend acts strictly as an API server, data persistence layer, and authentication gatekeeper. Since it runs via localhost, network transport overhead is virtually eliminated.

**Core Technologies:**
- **Framework:** Python FastAPI running on the `uvicorn[standard]` ASGI server. FastAPI's Pydantic models ensure strict input validation and type checking prior to business logic execution.
- **Persistence:** SQLAlchemy ORM interfacing with a local SQLite database (`optoprofit.db`).
- **Real-Time Communication:** WebSockets facilitate internal messaging and potential future cross-process communication streams.
- **Concurrency:** Fully asynchronous route handlers (`async def`) maximize throughput, preventing database I/O from blocking the main execution thread.

## 2.4 The Offline-First Desktop Wrapper
To achieve the offline-first enterprise security mandate, OPTO-PROFIT utilizes a hybrid bundling technique:

1. **Backend Freezing:** The entire Python backend environment (FastAPI, SQLite binaries, cryptographic libraries) is frozen into an executable payload using `PyInstaller`. A sidecar script (`backend/run_desktop.py`) is tasked with automatically starting Uvicorn on a specific dynamic port (e.g., `48157`) as a daemon thread.
2. **Frontend Containerization:** The production Vite build (`dist`) is bundled inside an Electron application.
3. **Orchestration:** When the user double-clicks `OPTO-PROFIT.exe`, the Electron main process natively boots the Chromium renderer and simultaneously spawns the Python backend subprocess. Once the backend health-check returns an HTTP 200 `OK`, Electron redirects the Chromium view to the local frontend, establishing seamless localhost API connections. When the Electron window closes, the Python daemon is cleanly terminated.

This architecture fundamentally guarantees that data remains siloed on the host machine, rendering the system impervious to remote exfiltration vectors, cloud outages, or external Man-in-the-Middle (MitM) attacks.
