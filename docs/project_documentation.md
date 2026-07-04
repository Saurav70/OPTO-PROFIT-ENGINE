# OPTO-PROFIT — Project Documentation

> **Version:** 1.0.0  
> **Last Updated:** June 2025  
> **Classification:** Internal Engineering Reference

---

## Table of Contents

1. [Project Specifications](#1-project-specifications)
2. [System Architecture](#2-system-architecture)
3. [Business Logic & Industrial Engineering](#3-business-logic--industrial-engineering)
4. [API Reference](#4-api-reference)
5. [Database Schema](#5-database-schema)
6. [Security Architecture](#6-security-architecture)
7. [User Manual](#7-user-manual)
8. [Deployment & Operations](#8-deployment--operations)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Desktop Application](#10-desktop-application)

---

## 1. Project Specifications

### 1.1 Overview

**OPTO-PROFIT** (Optimization-Profit Engine) is a full-stack industrial engineering toolkit designed for assembly line optimization, floor-layout planning, and financial ROI analysis. The system enables industrial engineers to model production lines, apply constraint-aware heuristic balancing algorithms, and quantify the financial impact of optimization decisions.

The application is built as a web-first SPA (Single Page Application) with an optional native desktop wrapper for standalone deployment.

### 1.2 Key Features

| Feature | Description |
|---|---|
| **Process Planning** | Define assembly tasks with time, predecessors, zoning, and custom attributes |
| **Line Optimization** | Run heuristic balancing (LTF, MFT, RPW) with constraint-aware station assignment |
| **Dashboard** | Real-time KPI monitoring: Takt Time, Efficiency, Balance Delay, Smoothness Index |
| **Financial Analytics** | ROI calculation, baseline vs. optimized profit comparison, payback period analysis |
| **Precedence Network** | Visual DAG (Directed Acyclic Graph) of task dependencies using React Flow |
| **Floor Layout** | Interactive drag-and-drop workstation layout designer |
| **Formula Engine** | User-definable variables and formulas with safe AST-based evaluation |
| **Profiles & Snapshots** | Save/load complete project states (tasks + config) for scenario comparison |
| **Real-time Collaboration** | WebSocket-based multi-user editing within tenant rooms |
| **Executive Reports** | One-click PDF generation with KPI comparison tables and layout captures |
| **Two-Factor Authentication** | TOTP-based 2FA with QR code setup via authenticator apps |
| **Multi-Tenancy** | Tenant-scoped data isolation for organization-level workspaces |

### 1.3 Technology Stack

#### Frontend

| Technology | Role | Version |
|---|---|---|
| **React** | UI framework | 19.x |
| **Vite** | Build tool & dev server | 5.x |
| **Framer Motion** | Animations & transitions | 12.x |
| **Recharts** | Data visualization charts | 3.x |
| **React Flow** (`@xyflow/react`) | Node-based graph editor | 12.x |
| **Lucide React** | Icon library | 1.x |
| **Zustand** | Lightweight state management | 5.x |
| **React Router** | Client-side routing | 7.x |
| **mathjs** | Safe formula evaluation (lazy-loaded) | 15.x |
| **jsPDF / jspdf-autotable** | PDF report generation | 4.x / 5.x |
| **html2canvas** | DOM-to-image capture for reports | 1.x |
| **Axios** | HTTP client (auth store) | 1.x |

#### Backend

| Technology | Role | Version |
|---|---|---|
| **FastAPI** | Async Python web framework | ≥0.111 |
| **Uvicorn** | ASGI server | ≥0.30 |
| **SQLAlchemy** | ORM (Object-Relational Mapper) | ≥2.0 |
| **SQLite** | Embedded relational database | (stdlib) |
| **Pydantic v2** | Request/response validation | ≥2.7 |
| **python-jose** | JWT token signing & verification | ≥3.3 |
| **bcrypt** | Password hashing | via passlib |
| **pyotp** | TOTP two-factor authentication | ≥2.9 |
| **slowapi** | Rate limiting (Redis-free) | ≥0.1.9 |
| **python-dotenv** | Environment variable loading | ≥1.0 |

#### Desktop

| Technology | Role |
|---|---|
| **PyInstaller** | Bundle into standalone `.exe` |
| **pywebview** | Native OS WebView window |

#### DevOps

| Technology | Role |
|---|---|
| **Docker / Docker Compose** | Containerized deployment |
| **GitHub Actions** | CI/CD pipelines |
| **ESLint** | Frontend linting |

### 1.4 System Requirements

| Component | Minimum | Recommended |
|---|---|---|
| **Node.js** | 18.x | 20.x LTS |
| **Python** | 3.10 | 3.12 |
| **RAM** | 2 GB | 4 GB |
| **Disk** | 500 MB | 1 GB |
| **Browser** | Chrome 90+, Firefox 90+, Edge 90+ | Latest |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              React SPA (Vite Dev / Nginx Prod)             │  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐   │  │
│  │  │ Zustand   │  │ React Router │  │  Framer Motion     │   │  │
│  │  │ Auth +    │  │ /login       │  │  Page transitions  │   │  │
│  │  │ Engine    │  │ /register    │  │  & micro-anims     │   │  │
│  │  │ Stores    │  │ /app/*       │  │                    │   │  │
│  │  └──────────┘  └──────────────┘  └────────────────────┘   │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │               Component Modules                      │  │  │
│  │  │  Dashboard │ ProcessPlanning │ LineOptimization       │  │  │
│  │  │  FloorLayout │ FinancialAnalytics │ PrecedenceNetwork│  │  │
│  │  │  Settings │ FormulaEditor │ Collaboration            │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌───────────────────┐  ┌───────────────────────────────┐  │  │
│  │  │  API Service       │  │  Optimizer Engine (frontend)  │  │  │
│  │  │  (fetch + Bearer)  │  │  Line Balancing, Critical     │  │  │
│  │  │  + HttpOnly Cookie │  │  Path, Takt Sweep, ROI        │  │  │
│  │  └───────────────────┘  └───────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │  HTTP / WS                        │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                        SERVER LAYER                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              FastAPI Application (Uvicorn ASGI)            │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │ Auth Module   │  │  Middleware   │  │  Rate Limiter   │  │  │
│  │  │ JWT + bcrypt  │  │  CORS         │  │  slowapi         │  │  │
│  │  │ 2FA (pyotp)  │  │  CSP Headers  │  │  3-5 req/min    │  │  │
│  │  │ Lockout      │  │  X-Frame-Opts │  │                 │  │  │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘  │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │                    Routers                           │  │  │
│  │  │  /api/auth/*   │  /api/tasks   │  /api/config        │  │  │
│  │  │  /api/profiles │  /api/analytics/roi                 │  │  │
│  │  │  /api/ws/{room_id}  │  /api/status                   │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────────────────────────┐   │  │
│  │  │ Math Engine   │  │  Email Service (SMTP)            │   │  │
│  │  │ takt_time()   │  │  Password reset emails           │   │  │
│  │  │ balance_idx() │  │  Simulation mode fallback         │   │  │
│  │  └──────────────┘  └──────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │  SQLAlchemy ORM                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │               SQLite Database (optoprofit.db)              │  │
│  │  users │ sessions │ tasks │ config │ profiles │ pw_resets  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
User Interaction
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│  React UI    │────▶│  API Service │────▶│  FastAPI Endpoints   │
│  Components  │◀────│  (fetch)     │◀────│  + Auth Middleware   │
└──────────────┘     └──────────────┘     └──────────────────────┘
       │                                           │
       ▼                                           ▼
┌──────────────┐                          ┌──────────────────────┐
│  Zustand     │                          │  SQLAlchemy ORM      │
│  State Store │                          │  → SQLite DB         │
└──────────────┘                          └──────────────────────┘
       │
       ▼
┌──────────────┐
│  Optimizer   │  ← Client-side computation
│  Engine (JS) │    for instant feedback
└──────────────┘
```

### 2.3 Frontend Architecture

The frontend uses a **module-based component architecture** with the following layers:

| Layer | Purpose | Key Files |
|---|---|---|
| **Entry** | React mount point, router setup | `main.jsx`, `App.jsx` |
| **State** | Global auth and engine state | `useAuthStore.js`, `useEngineStore.js` |
| **Services** | HTTP communication with backend | `services/api.js` |
| **Components** | Feature-specific UI modules | `components/*.jsx` |
| **Utils** | Pure business logic functions | `utils/optimizer.js`, `utils/formulaEngine.js` |
| **Data** | Static sample datasets | `data/sampleProfiles.js` |
| **Styles** | CSS variables, dark mode, glassmorphism | `index.css`, `App.css`, `Welcome.css` |

**State Management Strategy:**

- **`useAuthStore`** (Zustand + localStorage persist): Manages authentication state — `token`, `user`, `isAuthenticated`. Provides `login()`, `register()`, `logout()` actions.
- **`useEngineStore`** (Zustand + sessionStorage persist): Manages optimization engine state — `currentSimulationState` and `baselineState` for before/after comparison.
- **Component-local state** (React `useState`): Screen-level state like tasks, config, profiles, dark mode toggle.
- **localStorage passthrough**: Tasks, config, profiles, and dark mode are synced to localStorage for offline resilience.

### 2.4 Backend Architecture

The backend follows a **layered service architecture**:

| Layer | Files | Responsibility |
|---|---|---|
| **Application** | `main.py` | FastAPI app instance, lifespan, CORS, middleware, all route handlers |
| **Authentication** | `auth.py` | Password hashing, JWT creation/decoding, session management, cookie helpers |
| **Routing** | `routers/analytics.py`, `routers/collaboration.py`, `routers/healthcheck.py` | Scoped API sub-routers |
| **Models (API)** | `models.py` | Pydantic v2 schemas for request/response validation |
| **Models (DB)** | `sql_models.py` | SQLAlchemy ORM table definitions |
| **Database** | `database.py` | Engine, session factory, migrations |
| **Math Engine** | `math_engine.py` | Pure-function IE calculations (takt time, balance index) |
| **Email** | `email_service.py` | SMTP transactional emails with simulation fallback |

---

## 3. Business Logic & Industrial Engineering

### 3.1 Core Formulas

OPTO-PROFIT implements standard industrial engineering formulas for assembly line balancing:

#### Takt Time (T_takt)

```
T_takt = Available Production Time / Daily Demand
       = shift_time / demand
```

The maximum allowable cycle time per unit to meet customer demand within available production hours.

#### Target Cycle Time (T_target)

```
T_target = T_takt × (target_efficiency / 100)
```

A tighter cycle time than Takt to build in buffer for changeovers, micro-stops, and variability. Default target efficiency is **85%**.

#### Theoretical Minimum Workstations (N_min)

```
N_min = ⌈Σ(task_times) / T_takt⌉
```

The theoretical lower bound on the number of stations needed.

#### Line Efficiency (η)

```
η = Σ(task_times) / (N_actual × C) × 100
```

Where `N_actual` is the actual number of stations assigned and `C` is the cycle time (Takt or bottleneck).

#### Balance Delay (BD)

```
BD = 100 - η
```

The percentage of total station time that is idle due to imperfect balancing.

#### Smoothness Index (SI)

```
SI = √Σ(C_max - C_i)²
```

Where `C_max` is the bottleneck station time and `C_i` is each station's time. Lower SI indicates a more evenly balanced line.

#### Total Idle Time

```
Idle = (N_actual × C) - Σ(task_times)
```

### 3.2 Optimization Heuristics

The line balancing engine supports three industry-standard heuristics:

| Heuristic | Full Name | Sort Criterion |
|---|---|---|
| **LTF** | Longest Task First | Tasks sorted by descending time |
| **MFT** | Most Following Tasks | Tasks sorted by descending follower count |
| **RPW** | Ranked Positional Weight | Tasks sorted by descending (own time + all follower times) |

#### Algorithm Flow

```
1. Sort all tasks by the selected heuristic criterion
2. Initialize an empty station
3. For each iteration:
   a. Find eligible candidates (all predecessors assigned)
   b. Re-sort candidates by the heuristic
   c. For each candidate:
      - Check if it fits the station's remaining time
      - Check zone exclusion constraints
      - Check co-location constraints
      - Check separation constraints
   d. If a valid task is found → assign to current station
   e. If no task fits → close current station, open a new one
4. Compute performance metrics (η, BD, SI, idle time)
```

### 3.3 Constraint System

The optimizer respects four categories of constraints:

| Constraint | Description | Config Key |
|---|---|---|
| **Precedence** | Task B cannot start until Task A is complete | `task.predecessors` |
| **Zone Exclusion** | Tasks in zone "Wet" cannot share a station with zone "High-Voltage" | `config.zone_exclusions` |
| **Co-location** | Tasks A and B must be in the same station | `config.co_locations` |
| **Separation** | Tasks C and D must NOT be in the same station | `config.separations` |

### 3.4 Financial ROI Model

The financial analytics module computes:

```
Contribution Margin = Unit Price - Unit Cost
Daily Production    = min(demand, floor(shift_time / cycle_time))
Labor Cost/Month    = operators × $/hr × (shift_time/60) × work_days
Monthly Profit      = (daily_production × work_days × margin) - labor_cost
Profit Increase     = optimized_profit - baseline_profit
Payback Period      = investment_cost / profit_increase  (months)
```

Both baseline (pre-optimization) and optimized states are compared.

### 3.5 Critical Path Analysis

The system implements **forward-backward pass** critical path analysis:

```
Forward Pass:  ES[task] = max(EF[predecessors])
               EF[task] = ES[task] + task_time

Backward Pass: LF[task] = min(LS[successors])
               LS[task] = LF[task] - task_time

Critical Tasks: Total Float = LS - ES ≈ 0
```

Critical tasks have zero float — any delay directly extends the project duration.

### 3.6 Dynamic Formula Engine

Users can define custom formulas using a **safe AST-based evaluator** (backend) or **mathjs** (frontend). The system supports:

- Arithmetic: `+`, `-`, `*`, `/`, `**`, `//`, `%`
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Ternary: `condition ? truthy : falsy`
- User-defined variables: `shift_time`, `demand`, `unit_price`, etc.

**Security**: The backend uses Python's `ast.parse()` in `eval` mode with a strict whitelist of supported node types. No `exec()`, `eval()`, or `__import__` calls are possible.

---

## 4. API Reference

### 4.1 Authentication

| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| `POST` | `/api/auth/register` | Create new user account | 3/min |
| `POST` | `/api/auth/login` | Authenticate and receive JWT | 5/min |
| `GET` | `/api/auth/me` | Get current user profile | — |
| `POST` | `/api/auth/logout` | Invalidate session | — |
| `POST` | `/api/auth/change-password` | Update password (requires current) | — |
| `POST` | `/api/auth/forgot-password` | Request password reset email | 3/min |
| `POST` | `/api/auth/reset-password` | Reset password using token | 5/min |

### 4.2 Two-Factor Authentication

| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| `POST` | `/api/auth/2fa/setup` | Generate TOTP secret + QR code | — |
| `POST` | `/api/auth/2fa/verify` | Verify 2FA code during login | 5/min |
| `POST` | `/api/auth/2fa/enable` | Activate 2FA for account | — |
| `POST` | `/api/auth/2fa/disable` | Deactivate 2FA for account | — |

### 4.3 User Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users/me` | Get current user profile (settings module) |
| `PUT` | `/api/users/me` | Update name, phone, email |

### 4.4 Tasks (Assembly Line Processes)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tasks` | List all tasks (auto-seeds defaults for new users) |
| `POST` | `/api/tasks` | Create a single task |
| `PUT` | `/api/tasks` | Replace all tasks (bulk update) |
| `PUT` | `/api/tasks/{task_id}` | Update a specific task |
| `DELETE` | `/api/tasks/{task_id}` | Delete a specific task |

#### Task Schema

```json
{
  "id": "A",
  "name": "PCB Preparation & Kitting",
  "time": 12.0,
  "predecessors": [],
  "zoning": "None",
  "custom_attributes": {}
}
```

### 4.5 Configuration

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config` | Get project config (auto-seeds defaults) |
| `PUT` | `/api/config` | Update project configuration |

#### Config Schema

```json
{
  "productName": "Digital Oscilloscope",
  "variables": [
    { "key": "shift_time", "label": "Shift Time", "value": 480.0, "unit": "min", "category": "Production" },
    { "key": "demand", "label": "Daily Demand", "value": 16.0, "unit": "units", "category": "Production" }
  ],
  "formulas": {
    "TaktTime": "shift_time / demand",
    "MonthlyProfit": "demand * work_days * (unit_price - unit_cost)"
  },
  "custom_zones": [],
  "zone_exclusions": {},
  "co_locations": [],
  "separations": [],
  "target_efficiency": 85
}
```

### 4.6 Profiles (Project Snapshots)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/profiles` | List all saved profiles |
| `POST` | `/api/profiles` | Save a profile snapshot |
| `DELETE` | `/api/profiles/{profile_id}` | Delete a profile |

### 4.7 Analytics

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analytics/roi` | Calculate ROI impact |

### 4.8 Real-time Collaboration

| Protocol | Endpoint | Description |
|---|---|---|
| `WebSocket` | `/api/ws/{room_id}` | Collaborative editing channel |

**WebSocket Authentication Flow:**

```
1. Client connects to ws://host/api/ws/{room_id}
2. Server accepts the connection
3. Client MUST send auth message as first frame:
   {"token": "<jwt>"}
4. Server validates JWT + session + room scope
5. If valid → enters collaboration loop
6. If invalid → closes with 1008 Policy Violation
```

### 4.9 Health Check

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Returns `{"status": "ok", "version": "1.0.0"}` |

---

## 5. Database Schema

### 5.1 Entity-Relationship Diagram

```
┌─────────────────┐       ┌──────────────────┐
│     users        │       │     sessions      │
├─────────────────┤       ├──────────────────┤
│ id (PK)          │──┐   │ id (PK)           │
│ username         │  │   │ token_hash (UQ)   │
│ username_norm    │  ├──▶│ user_id (FK)      │
│ email            │  │   │ expires_at        │
│ password_hash    │  │   │ created_at        │
│ created_at       │  │   └──────────────────┘
│ is_2fa_enabled   │  │
│ two_factor_secret│  │   ┌──────────────────┐
│ full_name        │  │   │     tasks         │
│ phone_number     │  │   ├──────────────────┤
│ role             │  │   │ pk (PK)           │
│ tenant_id        │  ├──▶│ task_id           │
│ failed_login_att │  │   │ user_id (FK)      │
│ locked_until     │  │   │ tenant_id         │
└─────────────────┘  │   │ name              │
                      │   │ time              │
                      │   │ predecessors_json │
                      │   │ zoning            │
                      │   │ custom_attrs_json │
                      │   │ UQ(task_id,user_id)│
                      │   └──────────────────┘
                      │
                      │   ┌──────────────────┐
                      │   │     config        │
                      │   ├──────────────────┤
                      ├──▶│ id (PK)           │
                      │   │ user_id (FK, UQ)  │
                      │   │ tenant_id         │
                      │   │ data_json         │
                      │   └──────────────────┘
                      │
                      │   ┌──────────────────┐
                      │   │    profiles       │
                      │   ├──────────────────┤
                      ├──▶│ id (PK)           │
                      │   │ profile_id        │
                      │   │ user_id (FK)      │
                      │   │ tenant_id         │
                      │   │ name              │
                      │   │ data_json         │
                      │   │ timestamp         │
                      │   └──────────────────┘
                      │
                      │   ┌──────────────────────┐
                      │   │ password_reset_tokens │
                      │   ├──────────────────────┤
                      └──▶│ id (PK)               │
                          │ token_hash (UQ)       │
                          │ user_id (FK)          │
                          │ created_at            │
                          │ expires_at            │
                          │ used_at               │
                          └──────────────────────┘
```

### 5.2 Table Descriptions

| Table | Purpose | Key Constraints |
|---|---|---|
| `users` | User accounts with auth and profile data | `username_normalized` UNIQUE, `failed_login_attempts` for lockout |
| `sessions` | Active JWT sessions (hashed) | `token_hash` UNIQUE, `expires_at` for session TTL |
| `tasks` | Assembly line process definitions | `(task_id, user_id)` UNIQUE, `tenant_id` for multi-tenant queries |
| `config` | Project configuration (one per user) | `user_id` UNIQUE, JSON blob stores variables/formulas |
| `profiles` | Saved project snapshots | `data_json` contains full tasks + config snapshot |
| `password_reset_tokens` | One-time password reset tokens | `token_hash` UNIQUE, `used_at` marks consumption |

### 5.3 Multi-Tenancy

Data isolation is enforced at the query level:

- **Tenant-scoped queries** are used when `user.tenant_id` is set — all users in the same tenant share the same tasks, config, and profiles.
- **User-scoped fallback** is used when no tenant_id exists — data is isolated per user.
- Tenant IDs are auto-generated from the company name at registration: `T-{COMPANYNAME[:15]}`.
- Schema migrations add `tenant_id` columns dynamically at startup for backward compatibility.

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
┌─────────┐     POST /api/auth/login      ┌──────────────┐
│  Client  │─────────────────────────────▶│  FastAPI      │
│          │    {username, password}        │              │
│          │                               │  1. Lookup    │
│          │                               │  2. Lockout?  │
│          │                               │  3. bcrypt    │
│          │     Set-Cookie: HttpOnly JWT   │  4. JWT+jti   │
│          │◀─────────────────────────────│  5. SessionDB  │
│          │     + JSON {access_token}     │              │
└─────────┘                               └──────────────┘
```

### 6.2 Security Controls

| Control | Implementation |
|---|---|
| **Password Hashing** | bcrypt with auto-generated salt |
| **Password Strength** | ≥8 chars, 1 uppercase, 1 digit, 1 special character |
| **JWT Tokens** | HS256 signed, 24hr expiry, `jti` claim for uniqueness |
| **Session Storage** | Token hash stored in `sessions` table; server-side validation |
| **HttpOnly Cookies** | Session JWT delivered via `HttpOnly`, `SameSite=Lax` cookie |
| **Dual-mode Auth** | Cookie-first, Bearer header fallback for API clients |
| **Account Lockout** | 5 failed attempts → 15 minute lockout per account |
| **Rate Limiting** | `slowapi` — login: 5/min, register: 3/min, forgot-password: 3/min |
| **Session Expiry Purge** | Expired sessions purged at server startup |
| **Password Change** | Invalidates all active sessions |
| **TOTP 2FA** | pyotp with authenticator app QR code setup |
| **CORS** | Explicit origin whitelist (no wildcards) |
| **CSP Headers** | `default-src 'self'`, script-src, style-src, frame-ancestors |
| **Security Headers** | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` |
| **HSTS** | Opt-in via `ENABLE_HSTS=true` environment variable |
| **WebSocket Auth** | First-message token pattern (no URL query-string token exposure) |
| **Formula Safety** | AST whitelist (backend), mathjs sandbox (frontend) |
| **Email Token Security** | SHA-256 hashed in DB, raw token never logged |

### 6.3 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SESSION_SECRET` | **Prod: Yes** | JWT signing key (crash on start if missing in prod) |
| `ENV` | No | `development` (default) or `production` |
| `DATABASE_URL` | No | SQLAlchemy connection string (default: `sqlite:///./optoprofit.db`) |
| `FRONTEND_ORIGIN` | No | Primary CORS origin (default: `http://localhost:5173`) |
| `FRONTEND_ORIGINS` | No | Comma-separated additional CORS origins |
| `ENABLE_HSTS` | No | Set `true` to enable Strict-Transport-Security |
| `SMTP_HOST` | No | SMTP server for real email delivery |
| `SMTP_PORT` | No | SMTP port (default: 587) |
| `SMTP_USERNAME` | No | SMTP login |
| `SMTP_PASSWORD` | No | SMTP password |
| `SMTP_FROM_NAME` | No | Email sender display name |
| `SMTP_FROM_EMAIL` | No | Email sender address |
| `SMTP_USE_TLS` | No | Enable STARTTLS (default: `true`) |

---

## 7. User Manual

### 7.1 Getting Started

#### Registration

1. Navigate to the application URL
2. Click **"Create Account"** on the Welcome screen
3. Enter your **email**, **password** (min 8 chars, 1 uppercase, 1 digit, 1 special), and **company name**
4. Upon success, you are automatically logged in and redirected to the Dashboard

#### Login

1. Enter your registered **username/email** and **password**
2. If 2FA is enabled, enter the 6-digit code from your authenticator app
3. You'll be redirected to the Dashboard

### 7.2 Dashboard

The Dashboard provides a real-time overview of your assembly line's performance metrics.

**Key Indicators Displayed:**

| KPI | Description |
|---|---|
| **Takt Time** | Target time per unit to meet demand |
| **Workstations** | Number of stations in the optimized line |
| **Line Efficiency** | Percentage of productive vs. idle time |
| **Balance Delay** | Complement of efficiency (idle %) |
| **Smoothness Index** | Measure of station time evenness |
| **Total Idle Time** | Sum of all station idle times |

**Interactive Features:**

- **Formula Trace**: Step-by-step derivation of each KPI formula with substituted values
- **Takt Time Sweep Chart**: Visualizes how station count and efficiency change across a range of takt times
- **Dark/Light Mode**: Toggle via the sidebar
- **Executive Report**: One-click PDF export with KPI comparison tables

### 7.3 Process Planning

The Process Planning module is where you define your assembly tasks.

**Task Definition:**

| Field | Description |
|---|---|
| **ID** | Short identifier (e.g., "A", "B", "C") |
| **Name** | Descriptive name (e.g., "PCB Preparation & Kitting") |
| **Time** | Duration in minutes |
| **Predecessors** | List of task IDs that must be completed first |
| **Zoning** | Optional zone assignment (e.g., "Wet-Zone", "Clean-Room") |
| **Custom Attributes** | Free-form key-value pairs (e.g., skill level, tooling) |

**Actions:**

- **Add Task**: Create a new process step
- **Edit Task**: Click any row to modify in-place
- **Delete Task**: Remove a task (validates no downstream dependencies)
- **Bulk Import**: Replace all tasks at once
- **Export CSV**: Download task data as a spreadsheet
- **Autosave**: Changes are saved to the server within 2 seconds of editing

### 7.4 Line Optimization

The Line Optimization module runs the heuristic balancing algorithm.

**Configuring an Optimization Run:**

1. **Select Heuristic**: Choose from LTF, MFT, or RPW
2. **Set Target Efficiency**: Default 85% — the optimizer calculates target cycle time from this
3. **Review Constraints**: Zone exclusions, co-locations, and separations are pulled from Settings

**Output:**

- **Station Assignment Table**: Shows which tasks are assigned to each workstation
- **Station Load Chart**: Bar chart comparing station times to the cycle time threshold
- **Metrics Panel**: Efficiency, balance delay, idle time, smoothness index
- **Critical Station**: Highlighted with the highest critical path task concentration

### 7.5 Financial Analytics

The Financial Analytics module quantifies the ROI of your optimization decisions.

**Configuration Variables:**

| Variable | Description | Default |
|---|---|---|
| `unit_price` | Selling price per unit | ₹25,000 |
| `unit_cost` | Manufacturing cost per unit | ₹15,000 |
| `work_days` | Working days per month | 25 |
| `operator_cost_per_hour` | Labor cost per operator/hour | ₹150 |
| `investment_cost` | Capital expenditure for optimization | ₹25,000 |
| `current_cycle_time` | Pre-optimization cycle time | 35 min |
| `current_operators` | Pre-optimization headcount | 5 |

**Output Metrics:**

- Monthly baseline vs. optimized profit
- Profit increase from optimization
- Baseline vs. optimized labor costs
- Payback period (months)
- Daily production comparison

### 7.6 Precedence Network

Visual DAG (Directed Acyclic Graph) of task dependencies built with React Flow.

- **Nodes**: Each task rendered as a card with ID, name, and time
- **Edges**: Directed arrows from predecessors to successors
- **Critical Path**: Critical tasks highlighted in accent color
- **Circular Dependency Detection**: Alerts if an impossible cycle is detected

### 7.7 Floor Layout Designer

Interactive 2D workstation layout for factory floor planning.

- **Drag-and-Drop**: Position workstations on a grid canvas
- **Station Cards**: Display assigned tasks, total time, and zone indicators
- **Snap-to-Grid**: Automatic alignment for clean layouts
- **Export**: Captured as an image for the Executive Report PDF

### 7.8 Settings

#### Profile Settings

- Edit display name, email, and phone number
- Change password (requires current password verification)

#### Two-Factor Authentication

1. Go to **Settings → Security**
2. Click **"Enable 2FA"**
3. Scan the QR code with Google Authenticator, Authy, or 1Password
4. Enter the 6-digit verification code to activate

#### Project Settings

- Edit product name
- Configure production variables (shift time, demand, pricing)
- Define custom formulas
- Set target efficiency
- Configure zone exclusions, co-locations, and separation constraints

#### Profile Management (Project Snapshots)

- **Save Profile**: Capture the current tasks + config as a named snapshot
- **Load Profile**: Restore a previous state
- **Delete Profile**: Remove saved snapshots

### 7.9 Keyboard Shortcuts & Navigation

The application uses a sidebar navigation with the following modules:

| Icon | Module | Route |
|---|---|---|
| 📊 | Dashboard | `/app/dashboard` |
| 📋 | Process Planning | `/app/process-planning` |
| 🏗️ | Conceptual Layout | `/app/conceptual-layout` |
| ⚡ | Line Optimization | `/app/line-optimization` |
| 📈 | Financial Analytics | `/app/financial-analytics` |
| 🔗 | Precedence Network | `/app/precedence-network` |
| 🏭 | Floor Layout | `/app/floor-layout` |
| ⚙️ | Settings | Modal overlay |

---

## 8. Deployment & Operations

### 8.1 Local Development

#### Backend

```bash
cd backend
python -m venv venv
./venv/Scripts/activate   # Windows
pip install -r requirements.txt

# Start with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
# → Vite dev server at http://localhost:5173
```

### 8.2 Docker Deployment

The project includes a `docker-compose.yml` for single-command deployment:

```bash
docker-compose up -d --build
```

**Service Architecture:**

| Service | Image | Port | Description |
|---|---|---|---|
| `frontend` | Custom (Nginx) | 80 | Production-built React SPA |
| `backend` | Custom (Uvicorn) | 8000 | FastAPI API server |
| `db` | `mongo:7.0.12` (pinned) | Internal only | MongoDB (legacy; SQLite is primary) |

**Security Notes:**

- MongoDB is **not** exposed to the host — accessible only within the Docker `app-network`
- Docker images use pinned versions (no `:latest`)
- `SESSION_SECRET` must be set in `.env` for production

### 8.3 Production Checklist

| Step | Status | Details |
|---|---|---|
| Set `ENV=production` | Required | Enforces `SESSION_SECRET`, HSTS opt-in |
| Set `SESSION_SECRET` | Required | `python -c "import secrets; print(secrets.token_hex(32))"` |
| Set `FRONTEND_ORIGINS` | Required | Comma-separated list of allowed frontend URLs |
| Configure SMTP | Recommended | Set `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD` for real emails |
| Enable HSTS | Recommended | Set `ENABLE_HSTS=true` when behind TLS |
| Review CORS origins | Required | Remove localhost origins for production |
| Pin Docker images | Done | All images use specific version tags |
| Remove debug logging | Recommended | Set log level to WARNING in production |

### 8.4 Environment File Example

```env
# === Application ===
ENV=production
SESSION_SECRET=your-random-64-char-hex-string

# === Database ===
DATABASE_URL=sqlite:///./optoprofit.db

# === CORS ===
FRONTEND_ORIGIN=https://your-domain.com
FRONTEND_ORIGINS=https://your-domain.com,https://www.your-domain.com

# === Email ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME=OPTO-PROFIT
SMTP_FROM_EMAIL=noreply@your-domain.com
SMTP_USE_TLS=true

# === Security ===
ENABLE_HSTS=true
```

---

## 9. CI/CD Pipeline

### 9.1 Continuous Integration (CI)

**Trigger**: Every push to any branch + all pull requests.

```
┌──────────────────┐
│ Standards Check   │  ← python scripts/check_standards.py
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────────────────────────────┐
│Frontend│ │ Backend                        │
│ Lint   │ │ Install deps                   │
│ Build  │ │ Run unit tests (unittest)      │
│        │ │ Start API → Health check GET   │
│        │ │ /api/status                    │
└────────┘ └────────────────────────────────┘
```

**Frontend Jobs:**
- `npm ci` → `npm run lint` → `npm run build`

**Backend Jobs:**
- `pip install -r requirements.txt`
- `python -m unittest discover -s tests -p "test_*.py" -v`
- Start Uvicorn → poll `GET /api/status` (up to 20 retries, 2s interval)

### 9.2 Continuous Deployment (CD)

**Trigger**: After successful CI on `main` (or manual dispatch).

1. Build Docker images for frontend and backend
2. Push to GitHub Container Registry (GHCR):
   - `ghcr.io/<owner>/<repo>/frontend`
   - `ghcr.io/<owner>/<repo>/backend`
3. Optional: Trigger deploy webhook via `DEPLOY_WEBHOOK_URL` repository secret

### 9.3 Test Suite

| Test File | Framework | Coverage |
|---|---|---|
| `test_math_engine.py` | `unittest` | Takt time, target cycle time, balance index edge cases |
| `test_auth_flow.py` | `unittest` | Registration, login, password change, session management |
| `test_security_remediations.py` | `unittest` | Account lockout, HttpOnly cookies, password strength, WS auth |
| `optimizer.test.js` | `vitest` | Frontend optimizer functions |

---

## 10. Desktop Application

### 10.1 Architecture

The desktop application bundles the full stack into a standalone Windows executable:

```
OPTO-PROFIT.exe
├── Backend (FastAPI + Uvicorn) — runs on 127.0.0.1:48157
├── Frontend (Pre-built React SPA)
└── Native Window (pywebview) — or falls back to system browser
```

### 10.2 Execution Flow

1. **Launch**: User double-clicks `OPTO-PROFIT.exe`
2. **Server Start**: Uvicorn starts in a daemon thread on port `48157`
3. **Health Poll**: Main thread polls `/api/status` for up to 20 seconds
4. **Window Open**: `pywebview` opens a native OS window pointing to the local server
5. **Fallback**: If `pywebview` fails (missing WebView2), opens the default browser instead
6. **Shutdown**: Closing the window terminates the process; daemon thread dies automatically

### 10.3 Building the Desktop App

```powershell
cd desktop
pip install -r requirements.txt
.\build.ps1
# Output: dist/OPTO-PROFIT.exe
```

### 10.4 Development Mode

For frontend hot-reloading during desktop development:

```bash
# Terminal 1: Start Vite dev server
cd frontend && npm run dev

# Terminal 2: Launch desktop pointing to Vite
cd desktop && python run.py --dev
```

---

## Appendix A: Default Task Set

The system seeds the following **10 tasks** for new users, representing a Digital Oscilloscope assembly line:

| ID | Name | Time (min) | Predecessors |
|---|---|---|---|
| A | PCB Preparation & Kitting | 12.0 | — |
| B | Motherboard SMT & Assembly | 18.0 | A |
| C | Display Module Preparation | 15.0 | A |
| D | Power Supply Unit Prep | 10.0 | A |
| E | Housing & Chassis Prep | 8.0 | — |
| F | Main PCB Integration | 20.0 | B, C |
| G | System Wiring & Connections | 14.0 | D, F |
| H | Final Assembly & Enclosure | 16.0 | E, G |
| I | Calibration & Testing | 22.0 | H |
| J | Quality Inspection & Packing | 10.0 | I |

**Total Work Content**: 145 minutes  
**Default Takt Time**: 480 / 16 = 30 min  
**Theoretical Minimum Stations**: ⌈145 / 30⌉ = 5

---

## Appendix B: Default Configuration Variables

| Key | Label | Value | Unit | Category |
|---|---|---|---|---|
| `shift_time` | Shift Time | 480.0 | min | Production |
| `demand` | Daily Demand | 16.0 | units | Production |
| `unit_price` | Unit Price | 25,000 | ₹ | Financial |
| `unit_cost` | Unit Cost | 15,000 | ₹ | Financial |
| `work_days` | Work Days / Month | 25 | days | Financial |
| `current_cycle_time` | Current Cycle Time | 35.0 | min | Baseline |
| `current_operators` | Current Operators | 5 | people | Baseline |
| `operator_cost_per_hour` | Operator Cost / Hour | 150 | ₹ | Financial |
| `investment_cost` | Investment Cost | 25,000 | ₹ | Financial |
| `target_cycle_time` | Target Cycle Time | 30.0 | min | Production |
| `currency_symbol` | Currency Symbol | — | ₹ | General |

---

## Appendix C: Glossary

| Term | Definition |
|---|---|
| **Takt Time** | Maximum cycle time to meet demand within available production time |
| **Cycle Time** | Actual time of the bottleneck (slowest) workstation |
| **Balance Delay** | Percentage of wasted capacity due to uneven task distribution |
| **Smoothness Index** | Standard deviation of station times relative to the bottleneck |
| **Precedence Graph** | DAG representing task ordering constraints |
| **Heuristic** | Rule-of-thumb algorithm for NP-hard line balancing problems |
| **LTF** | Longest Task First — prioritizes tasks with highest individual time |
| **MFT** | Most Following Tasks — prioritizes tasks with the most successors |
| **RPW** | Ranked Positional Weight — prioritizes by own time + all successor times |
| **TOTP** | Time-based One-Time Password — standard used by authenticator apps |
| **CSP** | Content Security Policy — HTTP header that prevents XSS attacks |
| **HSTS** | HTTP Strict Transport Security — forces HTTPS connections |
| **Tenant** | An organizational workspace — all users in a tenant share data |

---

*This document is auto-generated from the OPTO-PROFIT codebase and reflects the current state of the system. For the latest updates, consult the source code and the inline documentation.*
