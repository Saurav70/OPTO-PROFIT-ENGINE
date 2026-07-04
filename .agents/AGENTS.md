# OPTO-PROFIT Project Rules

1. **Offline-First Enterprise Architecture**: OPTO-PROFIT is packaged as a standalone offline Electron desktop app with a PyInstaller FastAPI sidecar.
2. **No Cloud Dependencies**: Never add online auto-updaters, external telemetry, or cloud-based databases. 
3. **Hardware Locking (HWID)**: The SQLite database and JWT Sessions are cryptographically locked to the host machine's Hardware ID (`wmic`). Never bypass or remove the Fernet encryption in `sql_models.py` or `auth.py`.
4. **Data Sharing**: Project sharing is handled strictly offline via `.opto` file exports, which are opened via native OS File Associations processed by Electron IPC.
