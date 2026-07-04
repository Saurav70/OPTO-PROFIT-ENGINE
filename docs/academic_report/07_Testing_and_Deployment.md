# 7. Testing, Compilation, & Deployment

## 7.1 Multi-Layered Testing Strategy
To guarantee the fidelity of the heuristic algorithms and the integrity of the data models, OPTO-PROFIT enforces strict testing gates via GitHub Actions Continuous Integration (CI). The CI pipeline blocks all merging operations until the entire suite passes.

### 7.1.1 Backend Unit and Integration Testing
The Python backend implements a comprehensive `unittest` suite executed against an isolated, in-memory SQLite testing database (`test_optoprofit.db`).
- **Algorithm Correctness**: The math engine (`test_math_engine.py`) rigorously validates cycle time targets, $N_{min}$ projections, and Theoretical Balance Index outputs against known NP-hard dataset permutations. Edge cases—such as zero demand or negative constraints—are mapped and handled to prevent division-by-zero crashes.
- **ASGI Integration**: Using `httpx.AsyncClient`, the `test_auth_flow.py` suite tests the entire application state machine, navigating the login matrix, JWT expiration, password resets, and 2FA token generation without requiring active port binding.

### 7.1.2 Frontend Component Testing
The React frontend utilizes `Vitest` and `@testing-library/react`. 
- Deep unit tests validate the topological sorting and cycle detection mechanisms. If a user attempts to draw a cyclic task dependency (A → B → C → A), the UI must instantly intercept the event and emit an error notification.

## 7.2 The Desktop Compilation Pipeline
Because OPTO-PROFIT is exclusively distributed as an offline, hardware-locked binary, a robust build pipeline is required. The build process executes the following choreographed sequence (`desktop/build.ps1`):

1. **Frontend Production Build**: Executes `vite build`. Rollup resolves all `node_modules` imports, splits the vendor chunks, and emits a minified bundle to `frontend/dist`.
2. **Backend Freeze**: `PyInstaller` scans the FastAPI backend for required AST imports, traces the `uvicorn` and `sqlalchemy` dependency graphs, and bundles the entire Python 3.x runtime and necessary C-extensions into a standalone `.exe`.
3. **Electron Wrapper**: The Electron build tool (`electron-builder`) ingests the frontend `dist` directory and the Python executable. It creates a single installer (e.g., `OPTO-PROFIT-Setup.exe`) capable of seamlessly extracting and executing both processes synchronously upon user launch.

## 7.3 Conclusion
The OPTO-PROFIT engine successfully demonstrates that enterprise-grade industrial engineering algorithms—capable of resolving NP-hard line balancing problems and generating complex interactive spatial models—do not require cloud architectures. By strictly embracing an offline-first, mathematically rigorous approach, the system empowers engineers to optimize highly secure production environments with zero latency, zero telemetry, and total intellectual property sovereignty.
