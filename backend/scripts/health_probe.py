import json
import os
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen


def main() -> int:
    cmd = [
        r".\venv\Scripts\python.exe",
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8001",
    ]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)
    proc = subprocess.Popen(cmd, cwd=backend_dir)
    try:
        for _ in range(8):
            try:
                with urlopen("http://127.0.0.1:8001/api/status", timeout=3) as resp:
                    payload = json.loads(resp.read().decode("utf-8"))
                    if resp.status == 200 and payload.get("status") == "ok":
                        print(f"Backend status probe passed: {payload}")
                        return 0
            except URLError:
                time.sleep(1)
        print("Backend status probe failed: /api/status was not reachable in time.", file=sys.stderr)
        return 1
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    raise SystemExit(main())
