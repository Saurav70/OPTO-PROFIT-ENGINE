"""
OPTO-PROFIT API — Application Bootstrap
========================================
This file wires together the FastAPI app, middleware, and routers.
All endpoint logic lives in the routers/ package.
"""
import logging
import os
from contextlib import asynccontextmanager

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from .database import init_db, SessionLocal
from .sql_models import SessionDB
from .auth import utc_now as _utc_now

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Request
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse
# pyrefly: ignore [missing-import]
from slowapi import Limiter
# pyrefly: ignore [missing-import]
from slowapi.errors import RateLimitExceeded
# pyrefly: ignore [missing-import]
from slowapi.util import get_remote_address
from pydantic import BaseModel

from .license import get_license_status, activate_license, get_hardware_fingerprint
from .routers import analytics, healthcheck, migration
from .routers.auth import router as auth_router
from .routers.tasks import router as tasks_router
from .routers.data import router as data_router

# ── Structured Logging ────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("optoprofit")

# ── Rate Limiter ──────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── Global Migration State ────────────────────────────────────────
MIGRATION_REQUIRED = False


# ── Lifespan ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(the_app: FastAPI):
    global MIGRATION_REQUIRED
    try:
        if not init_db():
            logger.warning("DATABASE LOCKED: Hardware mismatch. Entering migration mode.")
            MIGRATION_REQUIRED = True
        else:
            db_url = os.getenv("DATABASE_URL", "sqlite:///./optoprofit.db")
            logger.info("SQLite database initialised — %s", db_url)
            _purge_expired_sessions()
    except Exception as e:
        logger.error("=" * 80)
        logger.error("❌ DATABASE ERROR: Could not initialise SQLite.")
        logger.error("Error details: %s", e)
        logger.error("=" * 80)
        raise SystemExit("\nError: Could not initialise the SQLite database during server startup.\n")
    yield
    logger.info("Application shutting down.")


def _purge_expired_sessions() -> None:
    """Delete all expired sessions from the database. Called once at startup."""
    from datetime import timezone as _tz
    db = SessionLocal()
    try:
        cutoff = _utc_now().replace(tzinfo=_tz.utc)
        deleted = db.query(SessionDB).filter(SessionDB.expires_at < cutoff).delete()
        db.commit()
        if deleted:
            logger.info("Startup: purged %d expired session(s) from database.", deleted)
    except Exception as exc:
        logger.warning("Startup: could not purge expired sessions: %s", exc)
    finally:
        db.close()


# ── App Instance ──────────────────────────────────────────────────
app = FastAPI(title="OPTO-PROFIT API", lifespan=lifespan)
app.state.limiter = limiter


# ── Rate Limit Exception Handler ──────────────────────────────────
@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    logger.warning("Rate limit exceeded: %s %s from %s", request.method, request.url.path, get_remote_address(request))
    return JSONResponse(status_code=429, content={"detail": "Too many requests. Please try again later."})


# ── License Gate Middleware ───────────────────────────────────────
@app.middleware("http")
async def license_gate_middleware(request: Request, call_next):
    path = request.url.path
    if not path.startswith("/api/") or path.startswith("/api/license/") or path == "/api/status":
        return await call_next(request)
    lic_status = get_license_status()
    if not lic_status.get("activated"):
        return JSONResponse(status_code=403, content={"detail": "License not activated", "license_status": lic_status})
    return await call_next(request)


# ── Migration Gate Middleware ──────────────────────────────────────
@app.middleware("http")
async def migration_gate_middleware(request: Request, call_next):
    if MIGRATION_REQUIRED:
        if request.url.path.startswith("/api/migration/"):
            return await call_next(request)
        if request.url.path.startswith("/api/"):
            return JSONResponse(status_code=503, content={"detail": "MIGRATION_REQUIRED"})
    return await call_next(request)


# ── Security Headers Middleware ───────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "font-src 'self' data:; "
        "connect-src 'self' ws: wss:; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )
    if os.getenv("ENABLE_HSTS", "").lower() == "true":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    return response


# ── CORS ──────────────────────────────────────────────────────────
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
frontend_origins = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()]
if not frontend_origins:
    frontend_origins = [frontend_origin, "http://localhost:3000", "http://localhost:4173"]
# Electron/desktop mode origins
frontend_origins.extend(["http://127.0.0.1:48157", "http://localhost:48157"])

if os.getenv("ENV", "development").lower() == "production":
    for origin in frontend_origins:
        if origin.startswith("http://") and "localhost" not in origin and "127.0.0.1" not in origin:
            logger.warning("SECURITY WARNING: CORS allows non-localhost HTTP origin in production: %s", origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ── Routers ───────────────────────────────────────────────────────
app.include_router(analytics.router)
app.include_router(healthcheck.router)
app.include_router(migration.router)
app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(data_router)


# ── Core Endpoints ────────────────────────────────────────────────
@app.get("/api/status")
async def get_status():
    return {"status": "ok", "version": "1.0.0"}


# ── License Endpoints ─────────────────────────────────────────────
class ActivateLicenseRequest(BaseModel):
    key: str


@app.get("/api/license/status")
async def api_get_license_status():
    return get_license_status()


@app.get("/api/license/hwid")
async def api_get_hwid():
    return {"hwid": get_hardware_fingerprint()}


@app.post("/api/license/activate")
async def api_activate_license(payload: ActivateLicenseRequest):
    return activate_license(payload.key)


# ── Serve React Frontend (SPA) ────────────────────────────────────
# Must come AFTER all /api/* routes so the catch-all doesn't shadow them.
from .paths import get_frontend_path as _get_frontend_path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response

_frontend_dist = _get_frontend_path()

if _frontend_dist.exists():
    _assets_dir = _frontend_dist / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="static-assets")

    @app.get("/favicon.ico", include_in_schema=False)
    @app.get("/favicon.svg", include_in_schema=False)
    @app.get("/robots.txt", include_in_schema=False)
    @app.get("/icons.svg", include_in_schema=False)
    def serve_static_root(request: Request):
        file_path = _frontend_dist / request.url.path.lstrip("/")
        if file_path.exists():
            return FileResponse(str(file_path))
        return Response(status_code=404)

    @app.get("/{filename}.png", include_in_schema=False)
    @app.get("/{filename}.jpg", include_in_schema=False)
    @app.get("/{filename}.jpeg", include_in_schema=False)
    @app.get("/{filename}.webp", include_in_schema=False)
    def serve_image_files(filename: str, request: Request):
        file_path = _frontend_dist / request.url.path.lstrip("/")
        if file_path.exists():
            return FileResponse(str(file_path))
        return Response(status_code=404)

    @app.get("/{catchall:path}", include_in_schema=False)
    async def serve_spa(catchall: str):
        """Return index.html for all non-API routes (React Router SPA)."""
        if catchall.startswith("api/"):
            return Response(status_code=404)
        return FileResponse(str(_frontend_dist / "index.html"))
else:
    logger.warning("Frontend dist/ not found at %s — UI will not be served.", _frontend_dist)


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
