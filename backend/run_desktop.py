"""
OPTO-PROFIT Desktop — Application Launcher
==========================================
Entry point packaged by PyInstaller into OPTO-PROFIT.exe.

Execution flow:
  1. Set OPTO_DESKTOP=1 so the backend uses the persistent AppData database.
  2. Start FastAPI/Uvicorn server on 127.0.0.1:48157 in a background daemon thread.
  3. Wait up to 15 s for the server to be ready (polling /api/status).
  4. Open a native OS desktop window via pywebview.
  5. Block until the user closes the window.
  6. Daemon thread exits automatically with the process.
"""
import sys
import os
import time
import threading
import logging

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
logger = logging.getLogger("optoprofit-launcher")

HOST = "127.0.0.1"
PORT = 48157
BASE_URL = f"http://{HOST}:{PORT}"


# ── Uvicorn server (background thread) ───────────────────────────
def _run_server():
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        log_level="info",
        # Disable reload — not needed inside the bundled exe
        reload=False,
    )


def _wait_for_server(timeout: float = 15.0) -> bool:
    """Poll /api/status until the server responds or timeout is reached."""
    import urllib.request
    import urllib.error

    deadline = time.time() + timeout
    url = f"{BASE_URL}/api/status"
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1) as resp:
                if resp.status == 200:
                    logger.info("Server ready at %s", BASE_URL)
                    return True
        except Exception:
            pass
        time.sleep(0.25)
    logger.error("Server did not become ready within %.1f seconds", timeout)
    return False


# ── Main entry point ──────────────────────────────────────────────
def main():
    # When PyInstaller bundles everything, sys.argv[0] is the .exe path.
    # We need to make sure the working directory is correct so that
    # relative imports inside app/ resolve correctly.
    if hasattr(sys, "_MEIPASS"):
        # Running inside bundled exe — change cwd to the bundle temp dir
        os.chdir(sys._MEIPASS)

    # Start the FastAPI server in a daemon thread (auto-killed when main exits)
    logger.info("Starting OPTO-PROFIT backend server on port %d …", PORT)
    server_thread = threading.Thread(target=_run_server, daemon=True, name="uvicorn")
    server_thread.start()

    # Wait for server to be ready
    if not _wait_for_server(timeout=20.0):
        logger.critical("Failed to start the backend server. Exiting.")
        sys.exit(1)

    # Open the desktop window
    logger.info("Opening desktop window pointing to %s …", BASE_URL)
    try:
        import webview  # pywebview
        window = webview.create_window(
            title="OPTO-PROFIT — Industrial Engineering Toolkit",
            url=BASE_URL,
            width=1440,
            height=900,
            min_size=(1024, 700),
            resizable=True,
        )
        webview.start()
    except Exception as exc:
        # Fallback: pywebview failed (missing WebView2, missing DLLs, etc.)
        # Open the app in the default system browser instead.
        import webbrowser
        logger.warning(
            "pywebview could not open a native window (%s: %s). "
            "Opening in the default browser instead.",
            type(exc).__name__,
            exc,
        )
        webbrowser.open(BASE_URL)
        # Keep the server alive until user presses Ctrl+C
        logger.info("Server running at %s — press Ctrl+C to quit.", BASE_URL)
        try:
            server_thread.join()
        except KeyboardInterrupt:
            pass

    logger.info("Window closed. Shutting down.")


if __name__ == "__main__":
    main()
