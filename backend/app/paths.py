"""
OPTO-PROFIT — Path Management for PyInstaller & Desktop Mode
=============================================================
Provides two helpers that resolve paths correctly whether the app
is running:
  • As a development server   (normal Python / ``uvicorn app.main:app``)
  • Inside a PyInstaller bundle (``sys._MEIPASS`` is set)

Usage:
    from .paths import get_frontend_path, get_persistent_db_path
"""

import os
import sys
from pathlib import Path


def get_frontend_path() -> Path:
    """Return the absolute path to the React ``dist/`` folder.

    When running inside a PyInstaller ``--onefile`` bundle the extracted
    temp directory is at ``sys._MEIPASS``.  During development the ``dist/``
    folder sits alongside (or inside) the ``backend/`` directory.
    """
    if getattr(sys, "_MEIPASS", None):
        # PyInstaller onefile: files extracted to a temp dir
        return Path(sys._MEIPASS) / "dist"

    # Development: ``backend/dist`` (copied from frontend build)
    return Path(__file__).resolve().parent.parent / "dist"


def get_persistent_db_path() -> Path:
    """Return a persistent database path in the user's local AppData folder.

    The path resolves to:
        ``%LOCALAPPDATA%/OPTO-PROFIT/optoprofit.db``   (Windows)
        ``~/.local/share/OPTO-PROFIT/optoprofit.db``   (Linux/macOS fallback)

    The parent directory is created automatically if it does not exist.
    """
    if sys.platform == "win32":
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))

    app_dir = base / "OPTO-PROFIT"
    app_dir.mkdir(parents=True, exist_ok=True)
    return app_dir / "optoprofit.db"


def get_persistent_salt_path() -> Path:
    """Return the path to the machine-specific UUID salt for cryptography."""
    if sys.platform == "win32":
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))

    app_dir = base / "OPTO-PROFIT"
    app_dir.mkdir(parents=True, exist_ok=True)
    return app_dir / "installation_salt.key"


def is_desktop_mode() -> bool:
    """Return ``True`` when running in desktop / PyInstaller mode.

    Triggered by either:
      • The ``OPTO_DESKTOP`` environment variable being set, **or**
      • The presence of ``sys._MEIPASS`` (PyInstaller bundle).
    """
    return bool(os.environ.get("OPTO_DESKTOP")) or hasattr(sys, "_MEIPASS")
