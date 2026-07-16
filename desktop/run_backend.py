"""
OPTO-PROFIT Desktop — Backend Launcher
==========================================
Entry point packaged by PyInstaller into backend.exe.

Execution flow:
  1. Set OPTO_DESKTOP=1 so the backend uses the persistent AppData database.
  2. Start FastAPI/Uvicorn server on 127.0.0.1:48157 in the main thread.
  3. Wait for SIGINT/SIGTERM from the parent Electron process to shut down.
"""
import sys
import os
import logging
import uvicorn
import signal

# ── CRITICAL: Set desktop mode BEFORE any app imports ─────────────
os.environ["OPTO_DESKTOP"] = "1"

# Force PyInstaller to statically trace the app dependencies
import app.main

# ── Logging bootstrap ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("optoprofit-backend")

HOST = "127.0.0.1"
PORT = 48157

# ── Main entry point ──────────────────────────────────────────────
def main():
    # When PyInstaller bundles everything, sys.argv[0] is the .exe path.
    # We need to make sure the working directory is correct so that
    # relative imports inside app/ resolve correctly.
    if hasattr(sys, "_MEIPASS"):
        # Running inside bundled exe — change cwd to the bundle temp dir
        os.chdir(sys._MEIPASS)

    def handle_sigterm(*args):
        logger.info("Received termination signal from parent process. Shutting down...")
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_sigterm)
    signal.signal(signal.SIGINT, handle_sigterm)

    logger.info("Starting OPTO-PROFIT backend server on port %d …", PORT)
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        log_level="info",
        # Disable reload — not needed inside the bundled exe
        reload=False,
    )

if __name__ == "__main__":
    main()
