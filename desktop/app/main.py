"""
OPTO-PROFIT Desktop — FastAPI Application Entry Point
=====================================================
Desktop edition: uses local SQLite instead of MongoDB Atlas.
Serves the built React frontend as static files.
No CORS needed (single-origin, all local).
"""
import logging
import os
import re
import secrets
import sys
import uuid
from contextlib import asynccontextmanager
from datetime import timezone
from pathlib import Path
from typing import List

from .auth import (
    utc_now as _utc_now,
    hash_password as _hash_password,
    verify_password as _verify_password,
    hash_token as _hash_token,
    create_session as _create_session_impl,
    create_password_reset_token as _create_password_reset_token_impl,
)

# pyrefly: ignore [missing-import]
import pyotp
# pyrefly: ignore [missing-import]
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response, status, File, UploadFile
# pyrefly: ignore [missing-import]
from fastapi.responses import FileResponse, JSONResponse
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles
# pyrefly: ignore [missing-import]
from slowapi import Limiter
# pyrefly: ignore [missing-import]
from slowapi.errors import RateLimitExceeded
# pyrefly: ignore [missing-import]
from slowapi.util import get_remote_address

from .database import SQLiteDatabase, DB_PATH
from .models import (
    AuthTokenResponse,
    AuthUserResponse,
    Config,
    LoginRequest,
    Profile,
    RegisterRequest,
    Task,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    User,
    UpdateUserRequest,
    ChangePasswordRequest,
    TwoFactorDisableRequest,
    TwoFactorEnableRequest,
    TwoFactorSetupResponse,
    TwoFactorVerifyRequest,
    ActivateLicenseRequest
)
from .routers import analytics, healthcheck
from .license import get_license_status, activate_license, get_hardware_fingerprint

# ── Structured Logging ────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("optoprofit-desktop")

# ── Rate Limiter ──────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

DEFAULT_CONFIG = {
    "productName": "New Product",
    "variables": [
        {"key": "shift_time", "label": "Shift Time", "value": 480, "unit": "min", "category": "Production"},
        {"key": "demand", "label": "Daily Demand", "value": 16, "unit": "units", "category": "Production"},
        {"key": "unit_price", "label": "Unit Price", "value": 0, "unit": "₹", "category": "Financial"},
        {"key": "unit_cost", "label": "Unit Cost", "value": 0, "unit": "₹", "category": "Financial"},
        {"key": "work_days", "label": "Work Days / Month", "value": 25, "unit": "days", "category": "Financial"},
        {"key": "current_cycle_time", "label": "Current Cycle Time", "value": 35, "unit": "min", "category": "Baseline"},
        {"key": "current_operators", "label": "Current Operators", "value": 5, "unit": "people", "category": "Baseline"},
        {"key": "operator_cost_per_hour", "label": "Operator Cost / Hour", "value": 0, "unit": "₹", "category": "Financial"},
        {"key": "investment_cost", "label": "Investment Cost", "value": 0, "unit": "₹", "category": "Financial"},
        {"key": "target_cycle_time", "label": "Target Cycle Time", "value": 30, "unit": "min", "category": "Production"},
    ],
    "formulas": {
        "TaktTime": "shift_time / demand",
        "MonthlyProfit": "demand * work_days * (unit_price - unit_cost)",
        "ROI_Efficiency": "MonthlyProfit * 0.10",
    },
    "custom_zones": [],
    "zone_exclusions": {},
    "co_locations": [],
    "separations": [],
    "target_efficiency": 85,
}


# ── Static files path (works both in dev and inside PyInstaller .exe) ─────────
def _get_static_dir() -> Path:
    if hasattr(sys, "_MEIPASS"):
        # Running inside PyInstaller bundle
        return Path(sys._MEIPASS) / "app" / "dist"
    # Running in development
    return Path(__file__).parent / "dist"


# ── SQLite Database Backup Helpers ───────────────────────────────
def _rotate_backups(db_path: Path, max_backups: int = 5):
    """Keep up to max_backups rotated backup copies of data.db."""
    if not db_path.exists():
        return
    import shutil
    try:
        # Rotate existing backups: data.db.bak4 -> data.db.bak5, etc.
        for i in range(max_backups - 1, 0, -1):
            src = db_path.with_name(f"data.db.bak{i}")
            dst = db_path.with_name(f"data.db.bak{i+1}")
            if src.exists():
                if dst.exists():
                    dst.unlink()
                src.rename(dst)
        # Copy active db to data.db.bak1
        dst1 = db_path.with_name("data.db.bak1")
        shutil.copy2(db_path, dst1)
        logger.info("Local SQLite backup created at %s", dst1)
    except Exception as e:
        logger.error("Failed to rotate database backups: %s", e)


def _is_valid_sqlite(file_path: Path) -> bool:
    """Validate that the file is a healthy SQLite database."""
    import sqlite3
    try:
        conn = sqlite3.connect(file_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        res = cursor.fetchone()
        conn.close()
        return res and res[0] == "ok"
    except Exception:
        return False


# ── Lifespan ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(the_app: FastAPI):
    # ── Startup ──
    # Create automatic backup on launch
    _rotate_backups(DB_PATH)

    db = SQLiteDatabase()
    the_app.database = db
    # Ensure all collection tables exist and purge expired TTL rows
    await db["users"].create_index("username_normalized", unique=True)
    await db["sessions"].create_index("token_hash", unique=True)
    await db["sessions"].create_index("expires_at", expireAfterSeconds=0)
    await db["password_reset_tokens"].create_index("token_hash", unique=True)
    await db["password_reset_tokens"].create_index("expires_at", expireAfterSeconds=0)
    await db["tasks"].create_index("user_id")
    await db["config"].create_index("user_id", unique=True)
    await db["profiles"].create_index("user_id")
    await db["password_reset_tokens"].create_index("user_id")
    logger.info("Local SQLite database ready — %s", db._db_path)
    yield
    # ── Shutdown ──
    db.close()
    logger.info("Database connection closed.")


app = FastAPI(title="OPTO-PROFIT Desktop API", lifespan=lifespan)
app.state.limiter = limiter


# ── Rate Limit Exception Handler ──────────────────────────────────
@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."},
    )


# ── Security Headers Middleware ───────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ── License Gate Middleware ───────────────────────────────────────
@app.middleware("http")
async def license_gate_middleware(request: Request, call_next):
    path = request.url.path
    if not path.startswith("/api/") or path.startswith("/api/license/") or path == "/api/status":
        return await call_next(request)
        
    status = get_license_status()
    if not status.get("activated"):
        return JSONResponse(
            status_code=403,
            content={"detail": "License not activated", "license_status": status}
        )
    return await call_next(request)


# ── CORS (allow local window origin from pywebview) ───────────────
# Lazy import avoids PyInstaller static-analysis failures with fastapi.middleware subpackages
try:
    from fastapi.middleware.cors import CORSMiddleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:48157", "http://localhost:48157", "null", "*"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
except Exception:
    # CORS not strictly required for a localhost-only app — continue without it
    pass

app.include_router(analytics.router)
app.include_router(healthcheck.router)


def _normalize_username(username: str) -> str:
    return username.strip().lower()


async def _create_session(user_id: str) -> str:
    return await _create_session_impl(app.database, user_id)


async def _create_password_reset_token(user_id: str) -> str:
    return await _create_password_reset_token_impl(app.database, user_id)


async def require_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid token")

    token_hash = _hash_token(token)
    session = await app.database["sessions"].find_one({"token_hash": token_hash})
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")

    expires_at = session.get("expires_at")
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if not expires_at or expires_at < _utc_now():
        raise HTTPException(status_code=401, detail="Session expired")

    user = await app.database["users"].find_one({"_id": session["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.get("/api/status")
async def get_status():
    return {"status": "ok", "version": "1.0.0", "mode": "desktop"}


# ── License Endpoints ─────────────────────────────────────────────
@app.get("/api/license/status")
async def api_get_license_status():
    return get_license_status()


@app.get("/api/license/hwid")
async def api_get_hwid():
    return {"hwid": get_hardware_fingerprint()}


@app.post("/api/license/activate")
async def api_activate_license(payload: ActivateLicenseRequest):
    result = activate_license(payload.key)
    if result.get("success"):
        # Auto-create admin user if no users exist or specifically the admin user
        admin_user = await app.database["users"].find_one({"username_normalized": "admin"})
        if not admin_user:
            user_id = str(uuid.uuid4())
            tenant_id = f"T-{secrets.token_hex(4).upper()}"
            await app.database["users"].insert_one({
                "_id": user_id,
                "username": "admin",
                "username_normalized": "admin",
                "email": "admin@local.host",
                "password_hash": _hash_password("admin123"),
                "created_at": _utc_now(),
                "is_2fa_enabled": False,
                "two_factor_secret": None,
                "full_name": "Administrator",
                "phone_number": None,
                "role": "Admin",
                "tenant_id": tenant_id
            })
            # Generate a session token so the frontend can auto-login
            token = await _create_session(user_id)
            result["access_token"] = token
            result["user"] = {"username": "admin", "password_hint": "admin123"}
        else:
            # If admin exists, log them in automatically upon activation
            token = await _create_session(admin_user["_id"])
            result["access_token"] = token
            result["user"] = {"username": admin_user["username"]}
            
    return result


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    favicon_path = _get_static_dir() / "favicon.svg"
    if favicon_path.exists():
        return FileResponse(str(favicon_path))
    return Response(status_code=204)


@app.post("/api/auth/register", response_model=AuthTokenResponse)
@limiter.limit("10/minute")
async def register(request: Request, payload: RegisterRequest):
    username = payload.username.strip()
    password = payload.password
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    username_normalized = _normalize_username(username)
    existing = await app.database["users"].find_one({"username_normalized": username_normalized})
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    user_id = str(uuid.uuid4())
    tenant_id = f"T-{secrets.token_hex(4).upper()}"
    await app.database["users"].insert_one(
        {
            "_id": user_id,
            "username": username,
            "username_normalized": username_normalized,
            "email": payload.email,
            "password_hash": _hash_password(password),
            "created_at": _utc_now(),
            "is_2fa_enabled": False,
            "two_factor_secret": None,
            "full_name": None,
            "phone_number": None,
            "role": "Admin",
            "tenant_id": tenant_id
        }
    )
    token = await _create_session(user_id)
    return AuthTokenResponse(access_token=token)


@app.post("/api/auth/login", response_model=AuthTokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest):
    username_normalized = _normalize_username(payload.username)
    user_doc = await app.database["users"].find_one({"username_normalized": username_normalized})
    if not user_doc or not _verify_password(payload.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    user = User(**user_doc)
    if user.is_2fa_enabled:
        temp_token = await _create_session(user.id)
        return AuthTokenResponse(access_token=temp_token, two_factor_required=True)
    else:
        token = await _create_session(user.id)
        return AuthTokenResponse(access_token=token)


@app.get("/api/auth/me", response_model=AuthUserResponse)
async def get_me(current_user: dict = Depends(require_user)):
    user = User(**current_user)
    return AuthUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_2fa_enabled=user.is_2fa_enabled,
        full_name=user.full_name,
        phone_number=user.phone_number,
        role=user.role,
        tenant_id=user.tenant_id,
        created_at=user.created_at
    )


@app.put("/api/users/me", response_model=AuthUserResponse)
async def update_me(payload: UpdateUserRequest, current_user: dict = Depends(require_user)):
    update_data = {}
    if payload.full_name is not None:
        update_data["full_name"] = payload.full_name
    if payload.phone_number is not None:
        update_data["phone_number"] = payload.phone_number
    if payload.email is not None:
        update_data["email"] = payload.email

    if update_data:
        await app.database["users"].update_one(
            {"_id": current_user["_id"]},
            {"$set": update_data}
        )

    user_doc = await app.database["users"].find_one({"_id": current_user["_id"]})
    user = User(**user_doc)
    return AuthUserResponse(
        id=user.id, username=user.username, email=user.email,
        is_2fa_enabled=user.is_2fa_enabled, full_name=user.full_name,
        phone_number=user.phone_number, role=user.role,
        tenant_id=user.tenant_id, created_at=user.created_at
    )


@app.post("/api/auth/change-password")
async def change_password(payload: ChangePasswordRequest, current_user: dict = Depends(require_user)):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    user_doc = await app.database["users"].find_one({"_id": current_user["_id"]})
    if not _verify_password(payload.current_password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    await app.database["users"].update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password_hash": _hash_password(payload.new_password)}}
    )
    return {"message": "Password updated successfully"}


@app.post("/api/auth/logout")
async def logout(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.split(" ", 1)[1].strip()
    await app.database["sessions"].delete_one({"token_hash": _hash_token(token)})
    return {"message": "Logged out"}


@app.post("/api/auth/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, payload: ForgotPasswordRequest):
    email = payload.email.strip()
    email_escaped = re.escape(email)
    user = await app.database["users"].find_one({"email": {"$regex": f"^{email_escaped}$", "$options": "i"}})
    generic_message = "If this email is registered, a password reset link has been sent."

    if not user:
        return {"message": generic_message}

    reset_token = await _create_password_reset_token(user["_id"])
    logger.info("[LOCAL PASSWORD RESET] Token for %s: %s", email, reset_token)
    logger.info("[LOCAL PASSWORD RESET] Use this token in the Reset Password screen.")
    return {"message": generic_message, "dev_token": reset_token}


@app.post("/api/auth/reset-password")
@limiter.limit("10/minute")
async def reset_password(request: Request, payload: ResetPasswordRequest):
    token = payload.token.strip()
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    token_doc = await app.database["password_reset_tokens"].find_one(
        {"token_hash": _hash_token(token), "used_at": None}
    )
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    expires_at = token_doc.get("expires_at")
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not expires_at or expires_at < _utc_now():
        await app.database["password_reset_tokens"].delete_one({"_id": token_doc["_id"]})
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user_id = token_doc["user_id"]
    await app.database["users"].update_one(
        {"_id": user_id},
        {"$set": {"password_hash": _hash_password(payload.new_password)}}
    )
    await app.database["password_reset_tokens"].update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"used_at": _utc_now()}}
    )
    await app.database["sessions"].delete_many({"user_id": user_id})
    return {"message": "Password reset complete. You can log in now."}


async def require_2fa_token(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid token")
    token_hash = _hash_token(token)
    session = await app.database["sessions"].find_one({"token_hash": token_hash})
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")
    expires_at = session.get("expires_at")
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not expires_at or expires_at < _utc_now():
        await app.database["sessions"].delete_one({"token_hash": token_hash})
        raise HTTPException(status_code=401, detail="Session expired")
    user_doc = await app.database["users"].find_one({"_id": session["user_id"]})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return user_doc


@app.post("/api/auth/2fa/setup", response_model=TwoFactorSetupResponse)
async def setup_2fa(current_user: dict = Depends(require_user)):
    user = User(**current_user)
    if user.is_2fa_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled for this user.")
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    otp_uri = totp.provisioning_uri(name=user.email or user.username, issuer_name="OPTOPROFIT")
    await app.database["users"].update_one(
        {"_id": user.id},
        {"$set": {"two_factor_secret": secret}}
    )
    return TwoFactorSetupResponse(secret=secret, qrcode_svg=otp_uri)


@app.post("/api/auth/2fa/verify", response_model=AuthTokenResponse)
@limiter.limit("10/minute")
async def verify_2fa(request: Request, payload: TwoFactorVerifyRequest, current_user_doc: dict = Depends(require_2fa_token)):
    user = User(**current_user_doc)
    if not user.two_factor_secret:
        raise HTTPException(status_code=400, detail="2FA not set up for this user.")
    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code.")
    temp_token_from_header = request.headers.get("authorization", "").split(" ", 1)[-1].strip()
    if temp_token_from_header:
        await app.database["sessions"].delete_one({"token_hash": _hash_token(temp_token_from_header)})
    token = await _create_session(user.id)
    return AuthTokenResponse(access_token=token)


@app.post("/api/auth/2fa/enable", response_model=AuthUserResponse)
async def enable_2fa(payload: TwoFactorEnableRequest, current_user_doc: dict = Depends(require_user)):
    user = User(**current_user_doc)
    if user.is_2fa_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled.")
    if not user.two_factor_secret:
        raise HTTPException(status_code=400, detail="2FA setup not initiated.")
    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code.")
    await app.database["users"].update_one({"_id": user.id}, {"$set": {"is_2fa_enabled": True}})
    return AuthUserResponse(id=user.id, username=user.username, email=user.email, is_2fa_enabled=True)


@app.post("/api/auth/2fa/disable", response_model=AuthUserResponse)
async def disable_2fa(payload: TwoFactorDisableRequest, current_user_doc: dict = Depends(require_user)):
    user = User(**current_user_doc)
    if not user.is_2fa_enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled for this user.")
    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code.")
    await app.database["users"].update_one(
        {"_id": user.id},
        {"$set": {"is_2fa_enabled": False, "two_factor_secret": None}}
    )
    return AuthUserResponse(id=user.id, username=user.username, email=user.email, is_2fa_enabled=False)


# ── Tasks ─────────────────────────────────────────────────────────
@app.get("/api/tasks", response_model=List[Task])
async def get_tasks(current_user: dict = Depends(require_user)):
    tasks = await app.database["tasks"].find({"user_id": current_user["_id"]}).to_list(1000)
    for task in tasks:
        task["id"] = task.get("id", str(task["_id"]))
    return tasks


@app.put("/api/tasks", response_model=List[Task])
async def replace_tasks(tasks: List[Task], current_user: dict = Depends(require_user)):
    user_id = current_user["_id"]
    await app.database["tasks"].delete_many({"user_id": user_id})
    task_docs = [{**task.dict(), "user_id": user_id} for task in tasks]
    if task_docs:
        await app.database["tasks"].insert_many(task_docs)
    return tasks


@app.post("/api/tasks", response_model=Task)
async def create_task(task: Task, current_user: dict = Depends(require_user)):
    new_task = await app.database["tasks"].insert_one({**task.dict(), "user_id": current_user["_id"]})
    created_task = await app.database["tasks"].find_one({"_id": new_task.inserted_id})
    return created_task


@app.put("/api/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task: Task, current_user: dict = Depends(require_user)):
    user_id = current_user["_id"]
    await app.database["tasks"].replace_one(
        {"id": task_id, "user_id": user_id},
        {**task.dict(), "user_id": user_id},
        upsert=True
    )
    updated_task = await app.database["tasks"].find_one({"id": task.id, "user_id": user_id})
    if not updated_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated_task


@app.delete("/api/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str, current_user: dict = Depends(require_user)):
    result = await app.database["tasks"].delete_one({"id": task_id, "user_id": current_user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return Response(status_code=204)


# ── Config ────────────────────────────────────────────────────────
@app.get("/api/config", response_model=Config)
async def get_config(current_user: dict = Depends(require_user)):
    user_id = current_user["_id"]
    config = await app.database["config"].find_one({"user_id": user_id})
    if not config:
        config = {**DEFAULT_CONFIG, "user_id": user_id}
        await app.database["config"].insert_one(dict(config))
    if config:
        return config
    raise HTTPException(status_code=404, detail="Config not found")


@app.put("/api/config")
async def update_config(config: Config, current_user: dict = Depends(require_user)):
    await app.database["config"].replace_one(
        {"user_id": current_user["_id"]},
        {**config.dict(), "user_id": current_user["_id"]},
        upsert=True
    )
    return {"message": "Config updated"}


# ── Profiles ──────────────────────────────────────────────────────
@app.get("/api/profiles", response_model=List[Profile])
async def get_profiles(current_user: dict = Depends(require_user)):
    return await app.database["profiles"].find({"user_id": current_user["_id"]}).to_list(1000)


@app.post("/api/profiles", response_model=Profile)
async def create_profile(profile: Profile, current_user: dict = Depends(require_user)):
    await app.database["profiles"].insert_one({**profile.dict(), "user_id": current_user["_id"]})
    return profile


@app.delete("/api/profiles/{profile_id}")
async def delete_profile(profile_id: str, current_user: dict = Depends(require_user)):
    result = await app.database["profiles"].delete_one(
        {"id": profile_id, "user_id": current_user["_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"message": "Profile deleted"}


# ── Desktop Backup & Restore Endpoints ────────────────────────────
@app.get("/api/desktop/backup/export")
async def export_backup(current_user: dict = Depends(require_user)):
    """Export the local database as a downloadable file."""
    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="Database file not found.")
    return FileResponse(
        str(DB_PATH),
        media_type="application/octet-stream",
        filename="optoprofit_backup.db"
    )


@app.post("/api/desktop/backup/import")
async def import_backup(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_user)
):
    """Overwrite the active database with an uploaded SQLite database file."""
    temp_path = DB_PATH.with_name("data.db.tmp")
    try:
        # Save uploaded file to a temporary location
        with open(temp_path, "wb") as buffer:
            import shutil
            shutil.copyfileobj(file.file, buffer)
        
        # Validate that the file is a valid SQLite DB
        if not _is_valid_sqlite(temp_path):
            raise HTTPException(status_code=400, detail="Uploaded file is not a valid SQLite database.")

        # Overwrite active database file
        if DB_PATH.exists():
            DB_PATH.unlink()
        temp_path.rename(DB_PATH)
        
        logger.info("Local SQLite database successfully restored from backup by user %s", current_user.get("username"))
        return {"status": "ok", "message": "Database successfully restored from backup."}
    except HTTPException:
        if temp_path.exists():
            temp_path.unlink()
        raise
    except Exception as exc:
        if temp_path.exists():
            temp_path.unlink()
        logger.error("Failed to import database backup: %s", exc)
        raise HTTPException(status_code=500, detail=f"Database restore failed: {str(exc)}")


# ── Serve React Frontend (SPA) ────────────────────────────────────
_static_dir = _get_static_dir()

if _static_dir.exists():
    # Mount assets sub-folder (JS, CSS, images)
    _assets_dir = _static_dir / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

    @app.get("/{catchall:path}", include_in_schema=False)
    async def serve_spa(catchall: str):
        """Return index.html for all non-API routes (SPA client-side routing)."""
        return FileResponse(str(_static_dir / "index.html"))
else:
    logger.warning("Frontend dist/ folder not found at %s — UI will not be served.", _static_dir)
    logger.warning("Run 'build.ps1' to build the React frontend first.")
