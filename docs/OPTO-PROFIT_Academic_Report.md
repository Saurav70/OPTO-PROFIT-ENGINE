# OPTO-PROFIT Platform
A TECHNICAL AND FUNCTIONAL RESEARCH REPORT

**Design, Architecture, and Implementation of an Offline-First Industrial Engineering Optimization System Employing React, FastAPI, and Heuristic Line Balancing**

**Document Type:** Technical Research Report  
**Version:** 1.0 – Academic Edition  
**Prepared By:** TEIRAC Development & Documentation Team  
**Date:** July 2026  
**Classification:** Technical Reference – Internal Distribution  

**Technology Stack:** React 19 • Vite 5 • Zustand • FastAPI • SQLite • PyInstaller • Electron

---

## Abstract

Modern industrial assembly lines are subject to increasingly complex constraints, demanding robust mathematical optimization to minimize idle time, reduce balance delay, and maximize labor productivity. Traditional line balancing solutions often rely on cloud infrastructure, raising data security and latency concerns in isolated or highly-secured factory environments.

This academic report details the design, architecture, and implementation of **OPTO-PROFIT**, a specialized, full-stack industrial engineering engine. OPTO-PROFIT fundamentally departs from cloud-dependent paradigms by deploying a strict **Offline-First Enterprise Architecture**. Packaged as a standalone Electron desktop wrapper with a bundled FastAPI sidecar and hardware-locked (HWID) SQLite database, the system provides zero-latency deterministic optimization without exposing proprietary manufacturing data to external networks.

The engine leverages three primary heuristic algorithms—Longest Task First (LTF), Most Following Tasks (MFT), and Ranked Positional Weight (RPW)—combined with Critical Path Method (CPM) analytics to resolve NP-hard assembly line balancing problems. Beyond spatial and temporal constraints, OPTO-PROFIT dynamically models the financial Return on Investment (ROI) of line configurations, bridging the gap between theoretical production metrics and quantifiable business outcomes.

## Table of Contents
1. Introduction & Research Objectives
2. System Architecture & Deployment
3. Mathematical Heuristics & Optimization Engine
4. Database Schema & Data Modeling
5. Security, Authentication, & Hardware Licensing
6. Frontend Implementation & Spatial Rendering
7. Testing & Quality Assurance


<!-- PAGE BREAK -->

# 1. Introduction & Research Objectives

## 1.1 Background and Problem Statement
The manufacturing sector relies heavily on continuous production pipelines known as assembly lines. An assembly line is a sequential arrangement of workstations where a product is iteratively assembled, starting from base components and ending with a finished good. The efficiency of this paradigm is dictated by the **Assembly Line Balancing Problem (ALBP)**, an NP-hard mathematical optimization challenge.

The fundamental goal of ALBP is to assign a set of $N$ discrete tasks—each requiring a deterministic execution time $t_i$—to an ordered sequence of $K$ workstations, ensuring that no workstation exceeds the maximum allowable cycle time (Takt Time). If poorly configured, assembly lines suffer from severe bottlenecks (where a single station restricts the entire line's output) and elevated Balance Delay (excessive idle time at non-bottleneck stations).

Historically, line balancing has been calculated manually using spreadsheet tools or via enterprise cloud solutions. However, in secure manufacturing facilities where intellectual property (IP) leakage poses a significant threat, transmitting proprietary product structure data to external cloud servers is frequently forbidden. A clear industry gap exists for an **offline, zero-latency optimization engine** capable of executing complex NP-hard balancing heuristics natively on engineers' isolated local workstations.

## 1.2 Research and Development Objectives
The **OPTO-PROFIT** engine was developed to address this critical gap. The primary objectives of this project are to engineer a system that delivers on the following requirements:

1. **Deterministic Heuristic Optimization**: Implement and provide side-by-side performance comparisons of Longest Task First (LTF), Most Following Tasks (MFT), and Ranked Positional Weight (RPW) algorithms.
2. **Offline-First Data Sovereignty**: Ensure that 100% of data processing, storage, and optimization happens completely offline via a hardened desktop architecture without requiring external network connectivity.
3. **Hardware-Locked Intellectual Property**: Implement cryptographic hardware ID (HWID) binding to ensure the engine and its proprietary databases cannot be duplicated or exfiltrated.
4. **Financial Interoperability**: Translate technical optimization metrics (like Line Efficiency and Idle Time) directly into Return on Investment (ROI) and payback period financial figures to empower data-driven executive decision-making.
5. **Interactive Spatial Modeling**: Provide a drag-and-drop, real-time recalculating spatial canvas allowing industrial engineers to visualize physical factory floor implications.

## 1.3 Scope of the Application
The OPTO-PROFIT platform is designed for industrial engineers, production managers, and financial analysts in discrete manufacturing sectors (e.g., automotive, consumer electronics, and heavy machinery).

The scope encompasses:
- **Process Planning**: Inputting tasks, times, dependencies (Directed Acyclic Graphs), and constraints (zone exclusions, co-locations).
- **Algorithmic Assignment**: Automatically generating optimized workstation configurations.
- **Financial Analytics**: Adjusting demand, unit economics, and labor rates to project profitability.
- **Export & Reporting**: Generating localized, immutable PDF reports of the finalized line configurations.

It strictly excludes live Programmable Logic Controller (PLC) integration, live IoT telemetry ingestion, and multi-tenant cloud collaboration, adhering strictly to its offline-first enterprise security mandate.


<!-- PAGE BREAK -->

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


<!-- PAGE BREAK -->

# 3. Mathematical Heuristics & Optimization Engine

## 3.1 The Line Balancing Optimization Loop
At the core of OPTO-PROFIT lies a deterministic, constraint-aware optimization engine executed entirely in client-side JavaScript. This engine dynamically assigns a set of $N$ discrete production tasks to an array of $K$ physical workstations.

The engine relies on a foundational greedy assignment loop:
1. **Candidate Pool Generation**: Identify all eligible tasks whose predecessor dependencies have already been assigned.
2. **Heuristic Sorting**: Sort the candidate pool descendingly using the active heuristic (LTF, MFT, or RPW).
3. **Constraint Validation**: For each sorted candidate, verify that assigning it to the current open workstation satisfies:
   - **Takt Time**: $T_{station} + t_i \le T_{takt}$
   - **Zone Exclusions**: The task’s required physical zone does not conflict with zones already established in the current workstation.
   - **Co-locations & Separations**: User-defined forced groupings or isolation constraints are strictly obeyed.
4. **Assignment**: Assign the first valid task. If no tasks fit, close the current workstation and open $K_{i+1}$.

## 3.2 Implemented Heuristics

### 3.2.1 Longest Task First (LTF)
The LTF heuristic is the simplest and often highly effective approach. It prioritizes tasks with the highest individual execution duration $t_i$. By assigning the most difficult "boulder" tasks first, the algorithm leaves smaller "sand" tasks to easily fill the remaining idle gaps in downstream stations.

### 3.2.2 Most Following Tasks (MFT)
The MFT heuristic prioritizes tasks that act as critical bottlenecks in the Directed Acyclic Graph (DAG) dependency network. Using a Breadth-First Search (BFS) graph traversal, the engine calculates the total transitive count of all successor tasks for every node. Assigning nodes with high successor counts quickly unblocks downstream operations, maintaining a broad candidate pool in later iterations.

### 3.2.3 Ranked Positional Weight (RPW)
The RPW algorithm combines elements of LTF and MFT by assigning a positional weight $W_i$ to each task. The weight is calculated as the sum of the task's own time plus the total time of all its downstream successors.
$$W_i = t_i + \sum_{j \in S_i} t_j$$
Where $S_i$ is the set of all successors of task $i$. RPW is widely considered one of the most robust heuristics for complex line balancing problems.

## 3.3 Key Performance Indicators (KPIs)
The engine instantly evaluates the physical viability of the line using the following standard industrial engineering metrics:

- **Theoretical Minimum Stations ($N_{min}$)**: 
  $$N_{min} = \lceil \frac{\sum t_i}{T_{takt}} \rceil$$
- **Line Efficiency ($\eta$)**: 
  $$\eta = \left( \frac{\sum t_i}{K_{actual} \times T_{cycle}} \right) \times 100$$
- **Balance Delay ($BD$)**: Represents the percentage of time wasted across the line.
  $$BD = 100\% - \eta$$
- **Total Idle Time**: 
  $$I_{total} = (K_{actual} \times T_{cycle}) - \sum t_i$$
- **Smoothness Index ($SI$)**: Indicates the evenness of workload distribution.
  $$SI = \sqrt{ \sum_{k=1}^{K} (T_{cycle_{max}} - T_{cycle_k})^2 }$$

## 3.4 Financial ROI Modeling
Unlike traditional ALBP solvers, OPTO-PROFIT directly translates these theoretical efficiency metrics into actionable financials via a highly customizable formula engine.

The engine calculates daily output projections based on the active bottleneck cycle time ($T_{cycle_{max}}$):
$$Output_{daily} = \min \left( Demand, \lfloor \frac{T_{shift}}{T_{cycle_{max}}} \rfloor \right)$$

This feeds into real-time profitability modeling:
$$Profit_{monthly} = (Output_{daily} \times Days \times (Price_{unit} - Cost_{unit})) - (K_{actual} \times Rate_{hourly} \times \frac{T_{shift}}{60} \times Days)$$

By preserving a **Baseline Snapshot** and comparing it against the live optimization matrix, the engine automatically calculates the profit differential ($\Delta Profit$) and generates capital expenditure payback periods, empowering engineering teams to financially justify layout alterations.


<!-- PAGE BREAK -->

# 4. Database Schema & Data Modeling

## 4.1 Local Persistence Layer
OPTO-PROFIT employs **SQLite** (`optoprofit.db`) as its core persistence layer. SQLite was deliberately selected to fulfill the offline-first mandate, as it requires no secondary daemon processes, runs securely as a single-file flat database on the host filesystem, and seamlessly compiles into the PyInstaller bundle.

Data transactions are marshaled by **SQLAlchemy 2.0**, utilizing standard Object-Relational Mapping (ORM) paradigms and Pydantic validators to ensure absolute referential integrity.

## 4.2 Entity-Relationship Architecture

The schema employs a centralized `users` table serving as the root node for all foreign key relationships, establishing isolated user profiles on the local machine.

### Core Tables

1. **`users`**
   - **Primary Key:** `id` (UUID String)
   - **Attributes:** `username`, `email`, `password_hash` (bcrypt), `created_at`, `is_2fa_enabled` (Boolean), `two_factor_secret` (TOTP seed).
   - **Security:** Incorporates `failed_login_attempts` and `locked_until` columns to natively throttle brute-force offline attacks.

2. **`tasks`**
   - **Primary Key:** `pk` (Integer, auto-increment)
   - **Foreign Keys:** `user_id` (mapped to `users`), `tenant_id`
   - **Composite Unique Constraint:** `(task_id, user_id)`
   - **Attributes:** `name`, `time` (Float).
   - **JSON Blobs:** Predecessor dependencies and dynamic key-value pairs (like specific tooling requirements) are stored in `predecessors_json` and `custom_attributes_json` text columns. The ORM utilizes Python `@property` getters/setters to transparently serialize this data into Python dictionaries upon retrieval.

3. **`config`**
   - **Foreign Key:** `user_id` (UNIQUE constraint enforces a 1:1 relationship).
   - **Attributes:** `data_json` (Text).
   - **Purpose:** Stores the entirety of the project's macro parameters (Financial variables, custom formulas, zone definitions, constraint lists, and layout presets). Storing this as a normalized JSON blob allows the flexible, user-driven formula engine to mutate state without requiring structural schema migrations.

4. **`profiles`**
   - **Attributes:** `name`, `timestamp`, `data_json`.
   - **Purpose:** Functions as a temporal snapshot registry. When a user creates a baseline or saves an optimized matrix, the entire `tasks` and `config` state is serialized and frozen in `data_json`, allowing historical rollback and direct side-by-side financial comparisons.

5. **`sessions`**
   - **Primary Key:** `id`
   - **Attributes:** `token_hash` (SHA-256), `user_id`, `expires_at`.
   - **Purpose:** Rather than blindly trusting stateless JWTs, the database maintains a strict session registry. Upon logout or token invalidation, the session record is purged, forcing subsequent JWT validations to fail.

## 4.3 Multi-Tenant Workspaces (Local Scoping)
Though OPTO-PROFIT is an offline application, it inherently supports internal Multi-Tenancy via a `tenant_id` column present on all core models. This allows multiple engineering shifts or departments sharing the same workstation terminal to cleanly isolate their project spaces, preventing a night-shift engineer from accidentally mutating the day-shift's active assembly configurations.


<!-- PAGE BREAK -->

# 5. Security, Authentication, & Hardware Licensing

Given its deployment on physical factory floors, OPTO-PROFIT treats internal IP security as a primary concern. The application deploys multiple overlapping cryptography layers to ensure that even if the physical hard drive is cloned, the proprietary algorithms and task data remain impenetrable.

## 5.1 Hardware-Locked Licensing (HWID)
OPTO-PROFIT natively implements strict node-locking via Ed25519 asymmetric cryptography. 

During compilation, a script (`keygen.py`) generates an Ed25519 key pair. The private key remains secured off-site on vendor systems, while the public key (`public_key.hex`) is hardcoded into the compiled `OPTO-PROFIT.exe` binary payload.

When a client purchases the software, they execute an onboard script to extract their host machine's Hardware ID (`wmic csproduct get uuid`). The vendor generates a JSON payload containing the client's information and HWID, signs it with the private key, and issues a Base64-encoded license string.

Upon application boot, a License Gate Middleware intercepts all `/api/*` requests. It reads the local `license.dat` file, extracts the signature, and validates it against the embedded public key and the active machine's HWID. If the HWID does not perfectly match (i.e., the software was copied to a different PC), the middleware returns `403 Forbidden`, instantly halting the backend API.

## 5.2 Database Encryption at Rest
To prevent unauthorized parties from opening the `optoprofit.db` SQLite file in a DB browser, sensitive text strings (like task configurations and financial variables) are encrypted at rest. 

SQLAlchemy models implement custom `EncryptedString` and `EncryptedText` datatypes. When a value is flushed to the database, a Fernet symmetric encryption key—derived dynamically via PBKDF2HMAC from the machine's HWID—encrypts the payload. 
Consequently, the database is completely coupled to the physical motherboard of the host machine; transferring the `.db` file to a foreign workstation yields only indecipherable ciphertexts.

## 5.3 Authentication & Session Protocols
1. **Password Cryptography**: User passwords are encrypted using `passlib` implementing the `bcrypt` algorithm (PBKDF2-HMAC-SHA256). 
2. **Two-Factor Authentication (TOTP)**: The system supports Time-Based One-Time Passwords via the `pyotp` library, ensuring an offline second factor via a standard Authenticator app.
3. **Dual-Mode Tokens**: Standard JWTs are signed via HS256. For internal API calls, these are securely stored in `HttpOnly` cookies. For real-time `websockets`, the token is passed in the first frame of the connection payload to prevent token leakage in URL query strings.
4. **Rate Limiting**: Despite being an offline application, OPTO-PROFIT employs `slowapi` rate limiters on login routes (e.g., 3 attempts/minute) to mitigate localized brute-force dictionary attacks from malicious internal actors, culminating in a 15-minute account lockout after 5 failures.


<!-- PAGE BREAK -->

# 6. Frontend Implementation & Spatial Rendering

## 6.1 React SPA & Core State
The OPTO-PROFIT client tier is a heavily optimized React 19 Single Page Application. It leverages a centralized, asynchronous data flow orchestrated by `Zustand`. By abandoning the rigid provider wrappers required by Redux, Zustand enables decoupled components (e.g., the 3D Floor Layout and the Financial Dashboard) to subscribe to discrete slices of state, preventing unnecessary global re-renders.

## 6.2 Precedence Network Mapping (DAGs)
Assembly line algorithms mandate strict sequencing constraints. To visualize these constraints, OPTO-PROFIT utilizes the `@xyflow/react` library to render Directed Acyclic Graphs (DAGs) in the `PrecedenceNetwork.jsx` component.

Tasks are represented as draggable SVG nodes, and dependencies are drawn as Bézier curves connecting the source and target nodes. If a user attempts to draw a cyclic dependency (e.g., Task A relies on Task B, which relies on Task A), a local BFS cycle-detection algorithm instantly blocks the action and flags a topological error, preventing infinite loops in the optimizer.

## 6.3 Dynamic Spatial Rendering (FloorLayout.jsx)
A cornerstone of the OPTO-PROFIT UX is the `FloorLayout.jsx` component—a high-fidelity, interactive 2D floor plan visualizer. 

Rather than merely outputting lists of assigned stations, the engine dynamically renders SVG machine representations (e.g., robots, CNC machines, conveyors) on an interactive HTML5 Canvas grid. The canvas supports:
- **Pan and Zoom Engine**: Native mouse wheel listeners combined with React `useRef` states handle granular zooming without triggering heavy DOM repaints, ensuring a solid 60 FPS spatial navigation experience.
- **Drag-and-Drop Repositioning**: Users can drag station cards across the grid. The component's matrix collision detection algorithm dynamically re-routes material transport paths and prevents physical overlap.
- **Clearance Validation**: The spatial engine computes Euclidean distances between station bounds. If two stations are placed within a critical 2.2-meter radius, a CSS `opto-collision-pulse` animation highlights the constraint violation, allowing engineers to physically validate safety regulations in parallel with mathematical efficiency.

## 6.4 The UI Design Language
To achieve a "wow" factor suitable for modern enterprise software, the application eschews plain styling in favor of high-contrast, industrial-grade aesthetics. 

**Visual Tokens:**
- Deep `var(--bg-main)` contrasting with glowing `var(--accent-primary)` and `var(--teirac-teal)` highlights.
- Glassmorphism techniques (`backdrop-filter: blur(10px)`) applied to floating bottom-sheet panels and overlay drawers.
- Subtle `framer-motion` micro-animations (e.g., `<AnimatePresence>` on success banners) provide immediate tactile feedback during drag-and-drop actions.


<!-- PAGE BREAK -->

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


<!-- PAGE BREAK -->

