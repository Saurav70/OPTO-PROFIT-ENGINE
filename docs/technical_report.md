# OPTO-PROFIT: Technical Architecture & Systems Report

This document serves as a comprehensive technical overview of the OPTO-PROFIT application. It details the technology stack, architectural patterns, security implementations, and build pipelines utilized to deliver the final enterprise desktop application.

---

## 1. System Architecture Overview
OPTO-PROFIT utilizes a **Sidecar Architecture**, blending modern web technologies with native desktop execution. Rather than rewriting complex Python optimization logic in Node.js, the application runs a packaged Python backend as a child process of an Electron shell.

### Components:
1. **Electron Shell (Node.js)**: Manages the native desktop environment, system tray, window lifecycle, and OS-level file associations.
2. **React Frontend (Renderer)**: A Single Page Application (SPA) providing the interactive User Interface.
3. **FastAPI Backend (Sidecar)**: A local web server running silently in the background (on `127.0.0.1:48157`), handling all business logic, data persistence, and mathematical optimizations.

---

## 2. Technology Stack

### Frontend (User Interface)
- **Framework**: React 19 (via Vite)
- **Routing/State**: React Hooks (useState, useEffect, context) for state management.
- **Styling**: Pure CSS with modern aesthetics (glassmorphism, dark mode palettes, CSS variables for theming, and micro-animations).
- **Communication**: Standard `fetch` API (`api.js` interceptors) communicating with the local FastAPI sidecar.

### Backend (Business Logic & Data)
- **Framework**: Python 3.11 + FastAPI
- **Database**: SQLite
- **ORM**: SQLAlchemy 2.0
- **Concurrency**: Uvicorn ASGI server running in a background daemon thread.

### Desktop Wrapper (Packaging)
- **Shell**: Electron (Main Process, Preload Script, Renderer)
- **Backend Bundler**: PyInstaller (Compiles the Python environment into a standalone `.exe`).
- **Application Builder**: `electron-builder` (Generates the NSIS installer and portable executable).

---

## 3. Security & Anti-Tampering

Because OPTO-PROFIT is intended for enterprise/industrial distribution, significant measures were implemented to prevent unauthorized usage and data theft.

### 3.1 Hardware-Locked Licensing
- **HWID Generation**: The `license.py` module uses Windows Management Instrumentation (`wmic`) to extract the unique CPU ID and Baseboard (Motherboard) Serial Number, hashing them into a unique Hardware ID (HWID).
- **Middleware Gate**: The FastAPI server implements a `license_gate_middleware`. This middleware intercepts every API request (except licensing/status endpoints) and verifies the existence of a cryptographically signed `license.dat` file matching the machine's HWID.
- **Enforcement**: If the license is invalid or missing, the API throws a `403 Forbidden`, and the React frontend forcefully overlays the `LicenseActivation.jsx` screen.

### 3.2 Transparent Database Encryption
To prevent malicious actors from simply copying an activated `optoprofit.db` and license file to a new machine:
- **Key Derivation**: The application uses the `cryptography` library to derive a 32-byte encryption key directly from the machine's HWID using `PBKDF2HMAC` and a static salt.
- **Custom ORM Types**: `sql_models.py` defines custom SQLAlchemy types (`EncryptedString` and `EncryptedText`).
- **Execution**: When data (like user emails, tasks, or configurations) is saved, SQLAlchemy automatically encrypts it using the Fernet symmetric encryption algorithm. If the database file is moved to a machine with a different HWID, decryption fails and the data remains unreadable ciphertext.

---

## 4. Desktop Integration

### Inter-Process Communication (IPC)
The Electron `preload.js` script bridges the gap between the isolated React environment and the Node.js backend. 
- The frontend can trigger backend restarts or query the OS platform via `window.electronAPI`.

### `.opto` File Associations
- **OS Registration**: The `electron-builder` config registers the `.opto` file extension with the OS.
- **Event Handling**: When a user double-clicks an `.opto` file, `electron/main.js` catches the `second-instance` or `process.argv` event.
- **Hydration**: The file contents (JSON) are read from disk by Electron, sent to React via an IPC message (`open-opto-file`), parsed by `App.jsx`, and pushed to the SQLite database via API PUT requests.

---

## 5. CI/CD & Build Pipeline

The application features a fully automated build pipeline designed for rapid, consistent deployments.

### Local Build Script (`scripts/build-electron.ps1`)
1. Compiles the React frontend using Vite (`npm run build`).
2. Copies the frontend build into the backend directory.
3. Compiles the FastAPI backend into `OPTO-PROFIT.exe` using PyInstaller.
4. Uses `electron-builder` to wrap the frontend and backend `.exe` into a final Windows Installer (`.nsis`).

### GitHub Actions (`.github/workflows/build-windows.yml`)
- Triggers automatically on any push to the `main` branch.
- Provisions a `windows-latest` virtual machine.
- Installs the required Python and Node.js environments.
- Executes the `build-electron.ps1` script.
- Uploads the final compiled `.exe` files as downloadable artifacts on the GitHub repository.
