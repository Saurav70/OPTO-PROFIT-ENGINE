# OPTO-PROFIT: Industrial Engineering Engine

OPTO-PROFIT is a specialized full-stack toolkit designed for industrial engineers to optimize assembly lines, floor layouts, and financial performance.

## 🔒 Enterprise Offline-First Architecture

OPTO-PROFIT is architected as a strict **Offline-First Enterprise Desktop Application** to guarantee zero data leakage for highly sensitive manufacturing models. 

- **No Cloud Dependencies:** Zero outbound network requests. No auto-updaters, external telemetry, or cloud-based databases. 
- **Hardware Locking (HWID):** Local databases and authentication sessions are cryptographically tied to the host machine's hardware ID.
- **Local Persistence:** Utilizes a completely isolated, local SQLite database stored securely on the machine.
- **Standalone Execution:** Deploys as a self-contained `.exe` running an embedded Python FastAPI sidecar and a React frontend.

## 📁 Project Structure

- **`frontend/`**: React + Vite application focusing on data density, glassmorphism, and industrial aesthetics.
- **`backend/`**: FastAPI + SQLite sidecar that provides the mathematical optimization engine.
- **`desktop/`**: Application bundling layer and PyArmor obfuscation scripts for packaging the final `.exe`.
- **`docs/`**: Comprehensive academic, technical, and testing documentation.
- **`release/`**: Destination folder for final compiled binaries and `.opto` demo project files.

## 🚀 Building from Source

OPTO-PROFIT is distributed as a compiled binary and is not designed to be run as a SaaS web app. To compile the desktop executable from source:

### Prerequisites
- Windows OS (Required for WMI Hardware ID integration)
- Python 3.10+
- Node.js (v20+)

### Build Pipeline
1. Open PowerShell.
2. Navigate to the `desktop/` directory.
3. Run the automated build script (bypass execution policy if necessary):
```powershell
cd desktop
powershell -ExecutionPolicy Bypass -File .\build.ps1
```
This script will automatically:
- Build the React frontend in desktop mode.
- Obfuscate the backend Python source code to protect intellectual property.
- Bundle the entire application into a single executable using PyInstaller.

The final executable will be available at `desktop/dist/OPTO-PROFIT.exe`.

## 🛠️ Tech Stack
- **Frontend**: React, Vite, Framer Motion, Recharts.
- **Backend**: FastAPI, SQLite.
- **Security & Packaging**: PyArmor, PyInstaller, Pywebview.

## 🤝 Project Sharing
Because OPTO-PROFIT operates entirely offline without multi-tenant cloud collaboration, project sharing is handled strictly via **`.opto`** file exports. Engineers can export a project state to a file, which can then be securely shared and imported on another licensed machine.
