# OPTO-PROFIT Desktop Architecture & Security

This document outlines the changes made to transform the OPTO-PROFIT web application into a secure, hardware-locked desktop application. It covers the dual-runtime execution model, the Ed25519-based licensing system, transparent HWID-bound database encryption, the automated build pipeline, and the offline `.opto` data sharing mechanism.

---

## 1. Desktop Execution Flow

The application is packaged as a self-contained Windows executable using a **dual-runtime** approach: PyInstaller compiles the Python backend into `OPTO-PROFIT.exe`, and `pywebview` renders the React SPA in a native OS window. The frontend also includes an Electron IPC bridge (`window.electronAPI`) for future migration to a full Electron shell.

### 1.1 Entry Points

There are two launcher scripts, both sharing the same execution pattern:

| Script | Location | Purpose |
|--------|----------|---------|
| `run.py` | `desktop/run.py` | Primary launcher packaged by PyInstaller. Supports a `--dev` flag that points the window at the Vite hot-reload server (`http://localhost:5173`) instead of the bundled backend. |
| `run_desktop.py` | `backend/run_desktop.py` | Alternative launcher that sets `OPTO_DESKTOP=1` before any app imports, forcing the backend to use the persistent `%APPDATA%` database path. Also triggers a static `import app.main` so PyInstaller can trace all dependencies at build time. |

### 1.2 Server Lifecycle (Daemon Thread)

1. **Environment Setup**: When running inside a PyInstaller bundle, `sys._MEIPASS` is detected and the working directory is changed to the temporary extraction directory so that relative `app/` imports resolve correctly.
2. **Uvicorn Launch**: A background daemon thread starts the FastAPI/Uvicorn server bound to `127.0.0.1:48157` with `reload=False` (reload is disabled inside the bundled `.exe`).
3. **Health Poll**: The launcher polls `GET http://127.0.0.1:48157/api/status` at 250ms intervals for up to 20 seconds. If the server does not respond with HTTP 200 within the timeout, the process exits with a critical error.
4. **Window Open**: Once the server is confirmed ready, a `pywebview` window is created:
   - **Title**: `OPTO-PROFIT — Industrial Engineering Toolkit`
   - **Dimensions**: 1440×900 (minimum 1024×700), resizable
   - **URL**: `http://127.0.0.1:48157` (production) or `http://localhost:5173` (dev mode)
5. **Graceful Shutdown**: When the user closes the window, the daemon thread is automatically killed with the process. No explicit teardown is required.

### 1.3 Browser Fallback

If `pywebview` fails to open a native window (e.g., missing WebView2 runtime, DLL errors, or `ImportError`), the launcher falls back to opening the URL in the user's default system browser via `webbrowser.open()`. In this mode, the server thread is kept alive with `server_thread.join()` until the user presses `Ctrl+C`.

### 1.4 Static File Serving

The built React SPA is served as static files directly by FastAPI. The static directory is resolved dynamically:
- **Inside PyInstaller bundle**: `sys._MEIPASS / app / dist`
- **In development**: `desktop/app/dist` (relative to the module file)

### 1.5 Security Middleware Stack

The desktop backend applies the following middleware chain on every HTTP request:

1. **Security Headers** — Injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy: strict-origin-when-cross-origin`.
2. **License Gate** — Intercepts all `/api/*` requests (see §2.3 below).
3. **CORS** — Permits origins `http://127.0.0.1:48157`, `http://localhost:48157`, and `null` (for `pywebview` file:// contexts). Credentials are allowed.
4. **Rate Limiter** — `slowapi` enforces per-IP token-bucket rate limits and returns HTTP 429 on violation.

---

## 2. Hardware-Locked Licensing

To restrict usage to authorized machines, a cryptographic licensing system was introduced. Licenses are signed with **Ed25519** asymmetric keys, bound to the host machine's hardware fingerprint, and verified entirely offline — no license server or internet connectivity is required.

### 2.1 HWID Generation

`desktop/app/license.py → get_hardware_fingerprint()` generates a stable, deterministic hardware fingerprint:

1. **CPU ID**: Retrieved via `wmic cpu get processorid` (2-second timeout).
2. **Baseboard Serial**: Retrieved via `wmic baseboard get serialnumber` (2-second timeout).
3. **Concatenation**: The raw values are joined as `{cpu_id}-{board_serial}`.
4. **Hashing**: The concatenated string is SHA-256 hashed, and the first 16 hex characters (uppercase) are used as the final HWID.
5. **Fallback**: If `wmic` is unavailable or returns insufficient data (< 5 chars), the MAC address via `uuid.getnode()` is used as the input instead.

### 2.2 License Key Format

License keys follow a compact JWT-like `payload.signature` structure:

```
<base64url(payload_json)>.<base64url(ed25519_signature)>
```

The **payload** is a JSON object with the following fields (defined by the `LicensePayload` dataclass):

| Field | Type | Description |
|-------|------|-------------|
| `licensee` | `str` | Name of the licensee or company |
| `issued` | `str` | ISO 8601 timestamp of issuance |
| `expires` | `str` | ISO 8601 expiry date |
| `hwid` | `str` | Target machine's hardware fingerprint (empty string = unrestricted) |

### 2.3 License Verification Flow

`verify_license_key()` performs a strict multi-step validation:

1. **Format Check**: The key string is split on `.` — exactly 2 parts are required.
2. **Base64 Decode**: Both parts are decoded with URL-safe Base64 (automatic padding restoration).
3. **Signature Verification**: The Ed25519 public key (embedded as `PUBLIC_KEY_HEX` at build time) verifies the signature against the raw payload bytes. Any `InvalidSignature` exception results in immediate rejection.
4. **Expiry Check**: The `expires` field is parsed as an ISO datetime and compared against `datetime.now(UTC)`.
5. **HWID Check**: If the payload contains a non-empty `hwid`, it must exactly match the current machine's `get_hardware_fingerprint()` output.

### 2.4 License Gate Middleware

`desktop/app/main.py → license_gate_middleware()` acts as the enforcement layer:

- **Scope**: Intercepts all requests where `path.startswith("/api/")`.
- **Bypass**: Requests to `/api/license/*` and `/api/status` are always allowed through (the license activation endpoint and health check must remain accessible).
- **Enforcement**: If `get_license_status()` returns `activated: false`, the middleware short-circuits with:
  ```json
  { "status": 403, "detail": "License not activated", "license_status": { ... } }
  ```
- **Frontend Response**: Upon receiving a 403 or if `GET /api/license/status` returns `activated: false`, the React frontend renders the `LicenseActivation.jsx` screen. A `SplashScreen` component is shown while the license check is in progress.

### 2.5 License Key Generation (Offline Tool)

`desktop/scripts/keygen.py` is an offline CLI tool used by the software distributor to issue licenses:

- **Key Pair Generation** (`--generate-keys`):
  - Generates a new Ed25519 private/public key pair.
  - Saves the private key to `scripts/private_key.pem` (PEM, PKCS8, unencrypted).
  - Saves the public key to `scripts/public_key.hex` (raw bytes as hex string).
  - The build pipeline (`build.ps1`, step 3) automatically patches `PUBLIC_KEY_HEX` into `desktop/app/license.py` if the public key file exists.

- **License Signing** (`--licensee`, `--expires`, `--hwid`):
  - Loads the private key from `private_key.pem`.
  - Constructs the payload JSON with compact separators (`separators=(',', ':')`).
  - Signs the raw payload bytes with Ed25519.
  - Outputs the final `payload_b64.signature_b64` string (URL-safe Base64, no padding).

### 2.6 Activation & Persistence

`activate_license(key_string)` verifies the key and, on success, writes the raw key string to `%APPDATA%\OPTO-PROFIT\license.dat`. On subsequent launches, `get_license_status()` reads this file and re-verifies the stored key.

---

## 3. Database Encryption

To prevent data theft (e.g., copying `data.db` and `license.dat` to another machine), the local SQLite database uses **transparent, HWID-bound column-level encryption**. Even if the database file is physically extracted, the data cannot be decrypted without access to the original machine's hardware.

### 3.1 Key Derivation

`backend/app/sql_models.py → get_fernet()` derives the encryption key lazily (singleton pattern):

1. **Input**: The machine's HWID is obtained from `get_hardware_fingerprint()` and encoded to UTF-8 bytes.
2. **KDF**: `PBKDF2HMAC` with the following parameters:
   - **Algorithm**: SHA-256
   - **Key Length**: 32 bytes
   - **Salt**: `b"OPTO_PROFIT_STATIC_SALT_841"` (deterministic — ensures the same key is derived on every launch on the same machine)
   - **Iterations**: 600,000
3. **Output**: The derived 32-byte key is Base64url-encoded and used to instantiate a `cryptography.fernet.Fernet` cipher.

The Fernet instance is cached globally (`_fernet_instance`) so the KDF is only executed once per process lifetime.

### 3.2 Custom SQLAlchemy Type Decorators

Two transparent type decorators handle encryption/decryption at the ORM layer:

| Type | Base | Encrypt (on write) | Decrypt (on read) |
|------|------|--------------------|--------------------|
| `EncryptedString` | `types.String` | `Fernet.encrypt(value.encode('utf-8'))` | `Fernet.decrypt(value.encode('utf-8'))` |
| `EncryptedText` | `types.Text` | Same as above | Same as above |

Both decorators set `cache_ok = True` for SQLAlchemy query cache compatibility. On decryption failure (e.g., wrong HWID), the raw ciphertext is returned as-is to avoid crashing the application — the data will simply be unreadable.

### 3.3 Encrypted vs. Plaintext Columns

The following table maps every model to its encrypted and plaintext columns:

#### `UserDB` (`users` table)
| Column | Type | Encrypted |
|--------|------|:---------:|
| `id`, `username`, `username_normalized` | `String` | ✗ |
| `email` | `EncryptedString(254)` | ✓ |
| `full_name` | `EncryptedString(100)` | ✓ |
| `phone_number` | `EncryptedString(20)` | ✓ |
| `password_hash` | `String(200)` | ✗ (already hashed via PBKDF2-HMAC-SHA256, 200k iterations) |
| `role`, `tenant_id` | `String` | ✗ |
| `two_factor_secret` | `String(64)` | ✗ |

#### `TaskDB` (`tasks` table)
| Column | Type | Encrypted |
|--------|------|:---------:|
| `task_id`, `zoning` | `String` | ✗ |
| `name` | `EncryptedString(200)` | ✓ |
| `predecessors_json` | `EncryptedText` | ✓ |
| `custom_attributes_json` | `EncryptedText` | ✓ |
| `time` | `Float` | ✗ |

#### `ConfigDB` (`config` table)
| Column | Type | Encrypted |
|--------|------|:---------:|
| `data_json` | `EncryptedText` | ✓ |
| `layout_presets_json`| `EncryptedText` | ✓ |
| `user_id`, `tenant_id` | `String` | ✗ |

#### `ProfileDB` (`profiles` table)
| Column | Type | Encrypted |
|--------|------|:---------:|
| `name` | `EncryptedString(200)` | ✓ |
| `data_json` | `EncryptedText` | ✓ |
| `profile_id`, `timestamp` | `String` | ✗ |

#### `SessionDB` and `PasswordResetTokenDB`
These tables contain only structural/security fields (`token_hash`, `user_id`, `expires_at`, etc.) and are **not encrypted** — the token hashes are already SHA-256 digests and carry no recoverable secrets.

### 3.4 Data Protection Guarantee

If the `data.db` file is moved to a computer with a different HWID:
1. `get_hardware_fingerprint()` produces a different SHA-256 digest.
2. `PBKDF2HMAC` derives a completely different Fernet key.
3. `Fernet.decrypt()` fails on every encrypted column — the application remains functional but all sensitive data (names, emails, task definitions, config blobs, profile snapshots) is rendered as unreadable ciphertext.

### 3.5 Database Backup & Integrity

The desktop backend includes automatic local backup rotation on every launch:

- **Rotation** (`_rotate_backups()`): Maintains up to 5 rolling backups (`data.db.bak1` through `data.db.bak5`). On each launch, existing backups are shifted (`bak4 → bak5`, `bak3 → bak4`, etc.) and the active database is copied to `data.db.bak1`.
- **Integrity Check** (`_is_valid_sqlite()`): Runs `PRAGMA integrity_check` against the database file and returns `true` only if the result is `"ok"`.
- **Storage Location**: All data resides in `%APPDATA%\OPTO-PROFIT\data.db`.

---

## 4. Build Pipeline

The desktop build is orchestrated by `desktop/build.ps1`, a 5-step PowerShell script:

### Step 1 — Build React Frontend
```powershell
npm run build -- --mode desktop
```
Builds the Vite React SPA in `desktop` mode, producing optimized static assets in `frontend/dist/`.

### Step 2 — Copy Frontend Assets
Copies `frontend/dist/` into `desktop/app/dist/` so PyInstaller can bundle it alongside the Python backend. Any existing `app/dist/` is deleted first.

### Step 3 — Python Environment & Cryptographic Keys
1. Creates a Python virtual environment at `desktop/venv/` (if not present).
2. Installs dependencies from `desktop/requirements.txt`.
3. Runs `scripts/generate_ico.py` to produce the branded `optoprofit_icon.ico`.
4. Checks for `scripts/public_key.hex`:
   - If missing, runs `keygen.py --generate-keys` to create a new Ed25519 key pair.
   - Auto-patches the generated public key hex into `desktop/app/license.py` (`PUBLIC_KEY_HEX = "..."`).

### Step 4 — PyInstaller Compilation
```powershell
pyinstaller --noconfirm OPTO-PROFIT.spec   # or OPTO-PROFIT-DEBUG.spec with -Debug flag
```

The `.spec` file configures:
- **Entry Point**: `run.py`
- **Bundled Data**: `('app', 'app')` — includes the entire `app/` package (Python modules + `dist/` static files).
- **Hidden Imports**: 34 modules that PyInstaller cannot auto-detect, including `uvicorn.*`, `fastapi.*`, `starlette.*`, `cryptography.*`, `aiosqlite`, `slowapi`, `pyotp`, `webview`, and `multipart`.
- **System DLL Filter**: Strips Windows system DLLs (`COMCTL32.dll`, `kernel32.dll`, `user32.dll`, etc.) from the binary to avoid packaging warnings and reduce size.
- **Output**: Single-file `.exe` with UPX compression, no console window (`console=False`), custom icon.

### Step 5 — Output
The final executable is written to `desktop/dist/OPTO-PROFIT.exe`. The script reports the file size and storage path.

A `-Debug` flag can be passed to `build.ps1` to use `OPTO-PROFIT-DEBUG.spec` instead, which enables console output and debug tooling.

---

## 5. Offline Data Sharing (`.opto` Files)

Project sharing between machines is handled entirely offline via `.opto` file exports — JSON files containing a full snapshot of tasks and configuration.

### 5.1 Export
Users can export the current project state from the dashboard. The export produces a JSON file with the `.opto` extension containing `{ tasks: [...], config: {...} }`.

### 5.2 Import (Manual)
The `DashboardLayout.jsx` file-upload component accepts `.csv`, `.xlsx`, `.opto`, and `.json` files. When a `.opto` or `.json` file is selected:
1. The file content is parsed as JSON.
2. If the parsed object contains both `tasks` and `config` keys, the application state is replaced with the imported data.
3. If the user is authenticated, the imported data is persisted to the backend via `PUT /api/tasks` and `PUT /api/config`.

### 5.3 Import (OS File Association via Electron IPC)
The React frontend registers a listener for `window.electronAPI.onOpenFile` in `App.jsx`. When an Electron shell is present and a `.opto` file is double-clicked in the OS file explorer:
1. Electron's `main.js` reads the file content and sends it to the renderer via IPC.
2. The `onOpenFile` callback parses the JSON and applies the same import logic as manual import.
3. A success or error toast notification is displayed.

> **Note:** The Electron IPC bridge is pre-wired in the frontend but the current desktop launcher uses `pywebview`. When the migration to a full Electron shell is completed, double-click `.opto` file association will be handled natively by the OS via Electron's file-type registration.
