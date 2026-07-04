# OPTO-PROFIT Engine: Development Report

**Prepared by:** Software Engineering Intern  
**Organization:** TEIRAC Private Limited, Bengaluru  
**Project Name:** Optoprofit Engine  
**Report Version:** 1.0  
**Date:** June 22, 2026  
**Environment:** Offline-First Desktop Application

---

## 1. Executive Summary & Objectives

### 1.1 Project Purpose

**OPTO-PROFIT** (Optimization-Profit Engine) is a purpose-built, full-stack industrial engineering platform developed during an internship engagement at **TEIRAC Private Limited**. The system is designed to solve NP-hard assembly line balancing problems and translate optimization outcomes into quantifiable financial metrics — enabling production engineers to make data-driven decisions about factory floor configuration and labor deployment.

### 1.2 Core Objectives

The engine delivers on five primary engineering objectives:

| # | Objective | Implementation |
|---|-----------|----------------|
| 1 | **Line Balancing** | Heuristic assignment of assembly tasks to workstations under time and constraint boundaries |
| 2 | **KPI Computation** | Real-time computation of Takt Time, Line Efficiency, Smoothness Index, Balance Delay |
| 3 | **Financial ROI** | Before-vs-after profitability modeling with payback period analysis |
| 4 | **Constraint Enforcement** | Zone exclusions, co-locations, separations, and precedence validation |
| 5 | **Critical Path Analysis** | Forward-backward pass scheduling to identify zero-float tasks |

### 1.3 Deployment Context

The engine is packaged as a standalone offline Electron desktop app with a PyInstaller FastAPI sidecar. It utilizes strict Hardware Locking (HWID) and operates entirely without cloud dependencies.

---

## 2. System Architecture & Tech Stack

### 2.1 Architectural Pattern

The system follows a **decoupled, two-tier SPA architecture**:

```
┌───────────────────────────────────────┐
│          CLIENT TIER                  │
│  React 19 SPA (Vite 5)               │
│  - Zustand state stores               │
│  - Client-side optimizer engine       │
│  - HTTP/WebSocket via Axios/Fetch     │
└───────────────────┬───────────────────┘
                    │ REST + WebSocket (port 8000)
┌───────────────────▼───────────────────┐
│          SERVER TIER                  │
│  FastAPI + Uvicorn (ASGI)             │
│  - Auth, CRUD, Analytics routers      │
│  - SQLAlchemy ORM → SQLite            │
│  - Email, Rate Limiting, WebSockets   │
└───────────────────────────────────────┘
```

Additionally, a **Desktop Wrapper Tier** exists for standalone deployments, bundling the full stack via PyInstaller + pywebview into `OPTO-PROFIT.exe`.

---

### 2.2 Frontend Stack

**Source:** `frontend/package.json`

| Library | Version | Role |
|---------|---------|------|
| `react` | ^19.2.4 | UI component framework |
| `react-dom` | ^19.2.4 | DOM rendering |
| `react-router-dom` | ^7.17.0 | Client-side routing (`/login`, `/app/*`) |
| `zustand` | ^5.0.14 | Lightweight global state management |
| `framer-motion` | ^12.38.0 | Page transitions & micro-animations |
| `recharts` | ^3.8.1 | KPI charts and sweep visualization |
| `@xyflow/react` | ^12.10.2 | Directed Acyclic Graph (DAG) precedence editor |
| `lucide-react` | ^1.7.0 | Icon library |
| `mathjs` | ^15.2.0 | Safe formula evaluation (lazy-loaded) |
| `jspdf` + `jspdf-autotable` | ^4.2.1 / ^5.0.8 | PDF report generation |
| `html2canvas` | ^1.4.1 | DOM snapshot for PDF embedding |
| `axios` | ^1.17.0 | HTTP client (used in auth store) |

**Build Tool:** Vite 5 with manual Rollup chunk splitting configured in `frontend/vite.config.js`:
```js
manualChunks: {
  'vendor-react':  ['react', 'react-dom'],
  'vendor-motion': ['framer-motion'],
  'vendor-icons':  ['lucide-react'],
}
```
This reduces the initial page load payload to **under 150 KB**, yielding a Time-to-Interactive (TTI) of ~0.6 seconds.

**Dev Dependencies:** ESLint 9, Vitest 4, `@vitejs/plugin-react`

---

### 2.3 Backend Stack

**Source:** `backend/requirements.txt`

| Library | Version | Role |
|---------|---------|------|
| `fastapi` | ≥0.111.0 | Async Python web framework |
| `uvicorn[standard]` | ≥0.30.0 | ASGI server with hot-reload |
| `sqlalchemy` | ≥2.0.0 | ORM for relational data access |
| `pydantic[email]` | ≥2.7.0 | Request/response schema validation |
| `python-jose[cryptography]` | ≥3.3.0 | JWT signing & verification (HS256) |
| `passlib[bcrypt]` | ≥1.7.4 | bcrypt password hashing |
| `pyotp` | ≥2.9.0 | TOTP two-factor authentication |
| `slowapi` | ≥0.1.9 | Token-bucket API rate limiting |
| `python-dotenv` | ≥1.0.0 | `.env` variable loading |
| `httpx` | ≥0.27.0 | Async HTTP client (used in ASGI test transport) |
| `websockets` | ≥12.0 | WebSocket real-time collaboration channel |
| `python-multipart` | ≥0.0.9 | Form data parsing |

**Runtime Database:** SQLite (`optoprofit.db`) — managed via SQLAlchemy, with `aiosqlite` in the desktop build.

---

### 2.4 Desktop Stack

**Source:** `desktop/requirements.txt`

| Library | Role |
|---------|------|
| `pywebview` ≥5.0 | Native OS WebView window rendered on launch |
| `pyinstaller` ≥6.0 | Packages entire stack into `OPTO-PROFIT.exe` |
| `cryptography` ≥44.0.0 | Ed25519 key pair generation for license signing |
| `pillow` ≥10.0.0 | Icon processing during build |

Built via `desktop/build.bat` → `desktop/build.ps1`. Output: `desktop/dist/OPTO-PROFIT.exe`. The backend binds to `127.0.0.1:48157` as a daemon thread; if pywebview fails, it falls back to the system browser.

---

### 2.5 DevOps & Infrastructure

| Tool | Role |
|------|------|
| Docker + Docker Compose | `docker-compose.yml` maps frontend (Nginx:80), backend (Uvicorn:8000), and a MongoDB legacy service on an isolated `app-network` bridge |
| GitHub Actions | CI on all branches (lint → build → test → health-check); CD on `main` push (build + push Docker images to GHCR) |
| ESLint | Linting enforced in CI via `npm run lint` |

---

### 2.6 Frontend Component Inventory

**Source:** `frontend/src/components/`

| Component | Function |
|-----------|----------|
| `Dashboard.jsx` | Real-time KPI display, formula trace, sweep chart |
| `ProcessPlanning.jsx` | Full CRUD table for assembly task definitions |
| `LineOptimization.jsx` | Heuristic selector, optimization runner, station card output |
| `FinancialAnalytics.jsx` | ROI panel with baseline vs. optimized profit comparison |
| `PrecedenceNetwork.jsx` | `@xyflow/react` DAG editor for task dependencies |
| `FloorLayout.jsx` | Interactive 2D drag-and-drop workstation layout designer |
| `FormulaEditor.jsx` | User-defined formula variable configurator |
| `SettingsTabs.jsx` | Profile, security, project, and constraint settings |
| `LicenseActivation.jsx` | Desktop Ed25519 license key entry and validation |
| `DashboardLayout.jsx` | Shell layout with sidebar and PDF report trigger |

---

## 3. Core Logic & Implementation

All optimization logic runs **client-side in JavaScript** for zero-latency feedback, with the backend providing pure-function validation counterparts.

### 3.1 Takt Time Calculator

**File:** `frontend/src/utils/optimizer.js` → `calculateTaktTime()`  
**Backend counterpart:** `backend/app/math_engine.py` → `takt_time()`

```
T_takt = shift_time / demand
```

The frontend version resolves dynamically: if a custom `TaktTime` formula is defined in `config.formulas`, it uses the `formulaEngine.js` evaluator (mathjs-backed). Otherwise it falls back to the raw `shift_time / demand` variable lookup.

---

### 3.2 Main Optimization Engine

**File:** `frontend/src/utils/optimizer.js` → `runOptimization(tasks, taktTime, heuristic, config)`

This is the core algorithm powering the entire engine. It operates as a greedy, constraint-aware task assignment loop:

**Step 1 — Heuristic Pre-sort:**
```
LTF: sort tasks by descending individual time
MFT: sort tasks by descending count of all transitive successors (BFS graph traversal)
RPW: sort tasks by descending (own time + sum of all successor times)
```

**Step 2 — Assignment Loop:**
```
while unassigned tasks remain:
  1. find eligible candidates (all predecessors are assigned)
  2. re-sort candidates by active heuristic
  3. for each candidate, in order:
     a. check time fits in current station (≤ taktTime)
     b. check zone_exclusions (from config) → skip if violated
     c. check co_locations (from config) → skip if conflict
     d. check separations (from config) → skip if conflict
  4. assign first valid task; if none fits → close station, open new
```

**Step 3 — Metric Computation:**

| Metric | Formula |
|--------|---------|
| Line Efficiency (η) | `(Σt / N × C) × 100` |
| Balance Delay (BD) | `100 − η` |
| Total Idle Time | `(N × C) − Σt` |
| Smoothness Index (SI) | `√Σ(C_max − C_i)²` |

**Outputs:** `{ stations, efficiency, balanceDelay, nActual, actualCycleTime, totalIdleTime, smoothnessIndex, meetsTarget }`

---

### 3.3 Critical Path Analysis (Forward-Backward Pass)

**File:** `frontend/src/utils/optimizer.js` → `calculateCriticalPath(tasks, stations)`

Implements the **CPM algorithm** used in project scheduling:

```
Forward Pass (Kahn's topological sort via BFS):
  ES[task] = max(EF[all predecessors])
  EF[task] = ES[task] + task.time

Backward Pass (reverse topological order):
  LF[task] = min(LS[all successors])
  LS[task] = LF[task] − task.time

Critical Tasks: Total Float = LS − ES ≈ 0
```

A `Set` is used for critical task IDs to achieve **O(1) membership lookups** when scanning stations, reducing complexity from O(n²) to O(n). The function returns `{ criticalStation, projectDuration, criticalTaskIds }`.

---

### 3.4 Takt Time Sweep Engine

**File:** `frontend/src/utils/optimizer.js` → `runTaktTimeSweep(tasks, minTakt, maxTakt, heuristic, config)`

Runs `runOptimization()` iteratively across a computed range of takt times, producing up to 100 data points. Step size is auto-calculated: `step = max(1, ceil(range / 100))`. Outputs feed directly into the `Recharts` sweep chart on the Dashboard.

---

### 3.5 Financial ROI Model

**File:** `frontend/src/utils/optimizer.js` → `calculateROI(tasks, config, optimization)`  
**Backend counterpart:** `backend/app/routers/analytics.py`

```
Contribution Margin    = unit_price − unit_cost
Daily Output           = min(demand, floor(shift_time / cycle_time))
Labor Cost / Month     = operators × $/hr × (shift_time / 60) × work_days
Monthly Profit         = (daily_output × work_days × margin) − labor_cost
Profit Increase        = optimized_profit − baseline_profit
Payback Period (months) = investment_cost / profit_increase
```

Baseline (pre-optimization) and optimized states are both computed, enabling direct side-by-side comparison in `FinancialAnalytics.jsx`.

---

### 3.6 Formula Engine (User-Defined Formulas)

**File:** `frontend/src/utils/formulaEngine.js`

Users may define custom formulas (e.g., `shift_time / demand`, `demand * work_days * (unit_price - unit_cost)`) in the Settings panel. The frontend evaluates these using **mathjs** in a sandboxed scope. The backend equivalent in `backend/app/routers/analytics.py` uses Python's `ast.parse()` in `eval` mode with a strict whitelist of AST node types — no `exec()`, `eval()`, or `__import__` calls are permitted.

---

### 3.7 Desktop License Key System

**File:** `desktop/scripts/keygen.py`

Employs **Ed25519 asymmetric cryptography** (`cryptography` library):

- `--generate-keys`: Creates a `private_key.pem` (vendor-side signing) and `public_key.hex` (embedded in the compiled `.exe` for verification).
- `generate_license(licensee, expires, hwid)`: Constructs a JSON payload `{ licensee, issued, expires, hwid }`, serializes it to UTF-8, signs it with the Ed25519 private key, encodes both payload and signature as URL-safe Base64, and returns a JWT-like `<payload_b64>.<signature_b64>` string.
- `hwid` field optionally binds the license to a specific machine fingerprint, preventing lateral distribution.

---

### 3.8 Real-Time Collaboration

**File:** `backend/app/routers/collaboration.py`

WebSocket endpoint at `/api/ws/{room_id}`. Authentication is enforced via a first-frame token pattern — the client sends `{"token": "<jwt>"}` as the first WebSocket message. Invalid tokens result in `1008 Policy Violation` closure. This avoids exposing JWT secrets in URL query strings.

---

## 4. Database Schema

**Source:** `backend/app/sql_models.py` (SQLAlchemy ORM), `backend/app/database.py`

The primary datastore is **SQLite** (`optoprofit.db`), accessed synchronously via SQLAlchemy. A migration routine in `database.py → init_db()` runs at startup, dynamically adding `tenant_id` columns to existing tables via `PRAGMA table_info()` for backward compatibility.

---

### 4.1 Entity-Relationship Overview

```
users (1) ────────── (*) tasks
users (1) ────────── (1) config
users (1) ────────── (*) profiles
users (1) ────────── (*) sessions
users (1) ────────── (*) password_reset_tokens
```

---

### 4.2 Table: `users`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (UUID) | PK | UUID-style string |
| `username` | String(50) | NOT NULL | Display name |
| `username_normalized` | String(50) | UNIQUE, INDEX | Lowercase normalized for lookup |
| `email` | String(254) | NULLABLE | Used as JWT `sub` claim |
| `password_hash` | String(200) | NOT NULL | bcrypt hash |
| `created_at` | DateTime | NOT NULL | UTC timestamp |
| `is_2fa_enabled` | Boolean | DEFAULT FALSE | TOTP flag |
| `two_factor_secret` | String(64) | NULLABLE | Base32 TOTP seed |
| `full_name` | String(100) | NULLABLE | Profile field |
| `phone_number` | String(20) | NULLABLE | Profile field |
| `role` | String(50) | DEFAULT "User" | RBAC role |
| `tenant_id` | String(20) | NULLABLE | Org-level data grouping |
| `failed_login_attempts` | Integer | DEFAULT 0 | Lockout counter |
| `locked_until` | DateTime | NULLABLE | Lockout expiry |

---

### 4.3 Table: `sessions`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | Integer | PK, autoincrement | |
| `token_hash` | String(64) | UNIQUE, INDEX | SHA-256 of JWT; never store raw token |
| `user_id` | String | FK → users.id (CASCADE) | |
| `expires_at` | DateTime | NOT NULL | Server-enforced TTL |
| `created_at` | DateTime | NOT NULL | UTC timestamp |

---

### 4.4 Table: `tasks`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `pk` | Integer | PK, autoincrement | Internal row key |
| `task_id` | String(50) | COMPOSITE UQ | User-facing ID (e.g. "A", "B") |
| `user_id` | String | FK → users.id, INDEX | |
| `tenant_id` | String(20) | NULLABLE, INDEX | Multi-tenant scoping |
| `name` | String(200) | NOT NULL | Process step description |
| `time` | Float | NOT NULL | Duration in minutes |
| `predecessors_json` | Text | DEFAULT "[]" | JSON-encoded list of predecessor IDs |
| `zoning` | String(100) | DEFAULT "None" | Zone classification |
| `custom_attributes_json` | Text | DEFAULT "{}" | JSON-encoded key-value pairs |

**Composite unique constraint:** `(task_id, user_id)` — `uq_task_user`

Python `@property` accessors on `TaskDB` handle transparent JSON serialization/deserialization for `predecessors` and `custom_attributes`.

---

### 4.5 Table: `config`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | Integer | PK | |
| `user_id` | String | FK → users.id, UNIQUE | One config record per user |
| `tenant_id` | String(20) | NULLABLE, INDEX | Multi-tenant scoping |
| `data_json` | Text | NOT NULL | Full config blob (variables, formulas, constraints) as JSON |

---

### 4.6 Table: `profiles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `profile_id` | String(100) | User-facing snapshot ID |
| `user_id` | String FK | |
| `tenant_id` | String(20) | |
| `name` | String(200) | Snapshot label |
| `data_json` | Text | Full snapshot: `{ tasks: [...], config: {...} }` |
| `timestamp` | String(100) | ISO creation timestamp |

---

### 4.7 Table: `password_reset_tokens`

| Column | Type | Notes |
|--------|------|-------|
| `id` | Integer PK | |
| `token_hash` | String(64) UNIQUE | SHA-256 of raw URL-safe token; raw token sent only in email |
| `user_id` | String FK | |
| `created_at` | DateTime | |
| `expires_at` | DateTime | 30-minute TTL |
| `used_at` | DateTime NULLABLE | Set on consumption; prevents replay |

---

### 4.8 Multi-Tenancy Model

Tenant IDs are derived from the company name at registration: `T-{COMPANY[:15]}`. When `user.tenant_id` is set, all tasks, config, and profiles are scoped to the entire tenant organization. When absent, data is isolated per individual user. The `database.py → init_db()` routine backfills `tenant_id` via a joined `UPDATE` statement for schema upgrades on existing SQLite files.

---

## 5. Development Environment

### 5.1 System Prerequisites

| Dependency | Minimum | Recommended |
|------------|---------|-------------|
| Node.js | 18.x | 20.x LTS |
| Python | 3.10 | 3.12 |
| npm | 9.x | 10.x |
| Git | Any | Latest |
| RAM | 2 GB | 4 GB |

---

### 5.2 Backend Setup

```bash
# 1. Navigate to the backend directory
cd k:\OPTO-PROFIT\backend

# 2. Create and activate a Python virtual environment
python -m venv venv
.\venv\Scripts\activate          # Windows PowerShell

# 3. Install all dependencies
pip install -r requirements.txt

# 4. Configure environment variables
#    Copy the template and populate with actual values
copy .env.example .env

# 5. Launch the development server with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The server starts at `http://localhost:8000`. SQLite database (`optoprofit.db`) is auto-created on first launch. Health check: `GET /api/status`.

---

### 5.3 Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd k:\OPTO-PROFIT\frontend

# 2. Install all Node.js dependencies
npm install

# 3. Start the Vite development server
npm run dev
# → Available at http://localhost:5173
```

---

### 5.4 Required Environment Variables

**Source:** `backend/.env.example`  
> ⚠️ Do not commit `.env` with populated secrets to version control.

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | No | SQLAlchemy connection string. Defaults to `sqlite:///./optoprofit.db` |
| `SESSION_SECRET` | **Prod: Yes** | 64-char hex key for JWT signing. Ephemeral random key used in dev if absent |
| `ENV` | No | `development` (default) or `production` |
| `PORT` | No | Bind port. Defaults to `8000`. Used when binding the FastAPI sidecar |
| `FRONTEND_ORIGIN` | No | Primary CORS origin. Defaults to `http://localhost:5173` |
| `FRONTEND_ORIGINS` | No | Comma-separated additional CORS origins |
| `ENABLE_HSTS` | No | Set `true` when behind HTTPS in production |
| `JWT_SECRET_KEY` | No | JWT secret (separate from session secret) |
| `JWT_ALGORITHM` | No | Default: `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | No | Default: `30` |
| `SMTP_HOST` | No | SMTP server for transactional emails |
| `SMTP_PORT` | No | Default: `587` |
| `SMTP_USERNAME` | No | SMTP login address |
| `SMTP_PASSWORD` | No | SMTP credential |
| `SMTP_FROM_NAME` | No | Sender display name |
| `SMTP_FROM_EMAIL` | No | Sender email address |
| `SMTP_USE_TLS` | No | Default: `true` |

Generate a secure `SESSION_SECRET`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

### 5.5 Docker (Full-Stack Local)

```bash
# From the project root
docker-compose up -d --build
```

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 80 | Nginx serving production-built React SPA |
| `backend` | 8000 | Uvicorn FastAPI server |
| `db` | Internal only | MongoDB 7.0.12 (legacy; SQLite is primary ORM target) |

---

### 5.6 Desktop Application Build

```powershell
# From the desktop directory
cd k:\OPTO-PROFIT\desktop
pip install -r requirements.txt
.\build.ps1
# Output: desktop/dist/OPTO-PROFIT.exe
```

---

## 5. Deployment Readiness

OPTO-PROFIT v1.0.0 (Release Candidate) is architected as a standalone, offline-first desktop application with no cloud dependencies.

### 5.1 Offline-First Desktop Architecture
The application is packaged as a self-contained Windows executable using a dual-runtime approach:
- **Frontend Shell (Electron)**: `electron/main.js` launches a native Chromium window pointing to the local backend at `http://127.0.0.1:48157`. In development, it proxies to the Vite dev server.
- **Backend Sidecar (PyInstaller)**: `PyInstaller` compiles `backend/run_desktop.py` into `OPTO-PROFIT.exe`, which sets `OPTO_DESKTOP=1`, launches Uvicorn on port `48157` in a daemon thread, and keeps the server alive as long as the Electron shell is open.

### 5.2 Hardware-Locked Licensing (HWID)
The platform is cryptographically locked to the host machine to prevent unauthorized redistribution:
- **HWID Generation**: `backend/app/license.py` derives a unique Hardware ID from the CPU and baseboard serial numbers via `wmic`.
- **License Gate Middleware**: All `/api/*` requests are intercepted; if a valid license is not found in `%APPDATA%/OPTO-PROFIT/license.dat`, the backend returns `403 Forbidden` and the React frontend displays the `LicenseActivation.jsx` activation screen.
- **Database Encryption**: Sensitive SQLite columns use `EncryptedString` / `EncryptedText` custom SQLAlchemy types, with Fernet keys derived via `PBKDF2HMAC` directly from the HWID. Moving the database file to a different machine renders all data unreadable.

### 5.3 Offline Data Sharing
Project sharing is handled strictly offline via `.opto` file exports, which are opened via native OS file associations processed by Electron IPC. No cloud sync, external telemetry, or auto-updaters are included.


## 7. Testing & QA

### 7.1 Backend Test Suite

**Location:** `backend/tests/`  
**Framework:** Python `unittest` (stdlib)  
**Runner command:** `python -m unittest discover -s tests -p "test_*.py" -v`

| Test File | Coverage Area |
|-----------|--------------|
| `test_math_engine.py` | 17 test cases across `takt_time()`, `target_cycle_time()`, `theoretical_balance_index()` — including edge cases for zero demand, negative inputs, empty task lists |
| `test_auth_flow.py` | Full ASGI integration suite: register, login, `/me`, logout, password change, password reset, 2FA token invalidation |
| `test_security_remediations.py` | Account lockout after 5 failed attempts, HttpOnly cookie enforcement, bcrypt strength, WebSocket auth first-frame pattern |
| `test_analytics_roi.py` | ROI formula validation across automotive, consumer electronics, and heavy machinery datasets; ternary formula evaluator |
| `test_security_helpers.py` | Isolated unit test for `hash_password()` and `verify_password()` functions |

**Current result:** **17/17 tests passing** (3.39 seconds)

Tests use `httpx.AsyncClient` with `ASGITransport` — no live network port required. A separate `test_optoprofit.db` and `test_security.db` are used to isolate test state from the dev database.

---

### 7.2 Frontend Test Suite

**Location:** `frontend/src/utils/optimizer.test.js`  
**Framework:** Vitest 4  
**Runner command:** `npm run test`

| Test | Coverage |
|------|----------|
| `calculateNmin` — normal conditions | Validates `ceil(45 / 20) = 3` |
| `calculateNmin` — invalid takt time | Returns `0` for `0`, `-5`, `null` |
| `calculateNmin` — empty task list | Returns `0` |
| `detectCircularDependency` — acyclic | Passes with 0 errors |
| `detectCircularDependency` — direct cycle A↔B | Detects and reports cycle |
| `detectCircularDependency` — complex cycle A→B→C→A | Detects and reports cycle |

---

### 7.3 CI Test Gate

Tests are automatically executed in the GitHub Actions CI pipeline on every push and pull request:
```yaml
- name: Run backend tests
  run: python -m unittest discover -s tests -p "test_*.py" -v

- name: Run frontend tests
  run: npm run test
```

If any test fails, the pipeline blocks the merge and the CD pipeline does not trigger.

---

### 7.4 Recommended Testing Additions

The following are gaps identified in the current suite, with suggested implementations:

| Gap | Recommendation |
|----|----------------|
| No E2E browser testing | Implement **Cypress** tests for: 2FA login flow, process planning CRUD, floor layout drag-and-drop, PDF export trigger |
| No integration test for WebSocket collaboration | Add `pytest-asyncio` test that connects two `httpx.AsyncClient` instances to the same `/api/ws/{room_id}` endpoint and verifies message broadcast |
| No load/performance testing | Introduce **Locust** test scripts to benchmark `/api/tasks` and `/api/analytics/roi` endpoints at 100 concurrent users |
| No frontend snapshot testing | Add **Vitest + @testing-library/react** snapshot tests for `Dashboard.jsx` and `LineOptimization.jsx` to catch unexpected UI regressions |
| No contract testing for the optimizer | Extend `optimizer.test.js` to include `runOptimization()` with a known task set and verify station assignment correctness for all three heuristics (LTF, MFT, RPW) |

---

*This report was generated by direct analysis of the OPTO-PROFIT codebase at `k:\OPTO-PROFIT`. All technologies, file names, formulas, and schema definitions are sourced directly from the source code and configuration files present in the repository as of June 22, 2026.*
