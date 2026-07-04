import json
import logging
import os
import re
import secrets
from contextlib import asynccontextmanager
from datetime import timezone
from typing import List

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from .auth import (
    utc_now as _utc_now,
    hash_password as _hash_password,
    verify_password as _verify_password,
    hash_token as _hash_token,
    create_session as _create_session_impl,
    create_password_reset_token as _create_password_reset_token_impl,
    create_access_token as _create_access_token_impl,
    decode_access_token as _decode_access_token_impl,
    get_current_user,
    oauth2_scheme,
    set_auth_cookie,
    clear_auth_cookies,
    SESSION_COOKIE_NAME,
)

from .database import get_db, init_db, SessionLocal
from .sql_models import (
    UserDB,
    TaskDB,
    SessionDB,
    ConfigDB,
    ProfileDB,
    PasswordResetTokenDB,
)

# pyrefly: ignore [missing-import]
import pyotp
# pyrefly: ignore [missing-import]
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
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
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from pydantic import BaseModel

from .license import get_license_status, activate_license, get_hardware_fingerprint

class ActivateLicenseRequest(BaseModel):
    key: str
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
    TwoFactorVerifyRequest
)
from .routers import analytics, healthcheck, collaboration
from .email_service import send_password_reset_email

# ── Structured Logging ────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("optoprofit")

# ── Rate Limiter ──────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

DEFAULT_TASKS = [
    {
        "id": "A",
        "name": "PCB Preparation & Kitting",
        "time": 12.0,
        "predecessors": [],
        "zoning": "None",
        "custom_attributes": {}
    },
    {
        "id": "B",
        "name": "Motherboard SMT & Assembly",
        "time": 18.0,
        "predecessors": ["A"],
        "zoning": "None",
        "custom_attributes": {}
    },
    {
        "id": "C",
        "name": "Display Module Preparation",
        "time": 15.0,
        "predecessors": ["A"],
        "zoning": "None",
        "custom_attributes": {}
    },
    {
        "id": "D",
        "name": "Power Supply Unit Prep",
        "time": 10.0,
        "predecessors": ["A"],
        "zoning": "None",
        "custom_attributes": {}
    },
    {
        "id": "E",
        "name": "Core Integration",
        "time": 20.0,
        "predecessors": ["B", "C", "D"],
        "zoning": "None",
        "custom_attributes": {}
    },
    {
        "id": "F",
        "name": "Firmware Flashing & Calibration",
        "time": 25.0,
        "predecessors": ["E"],
        "zoning": "None",
        "custom_attributes": {}
    },
    {
        "id": "G",
        "name": "Chassis Housing Assembly",
        "time": 14.0,
        "predecessors": ["F"],
        "zoning": "None",
        "custom_attributes": {}
    },
    {
        "id": "H",
        "name": "Final QA, Testing & Packaging",
        "time": 16.0,
        "predecessors": ["G"],
        "zoning": "None",
        "custom_attributes": {}
    }
]

DEFAULT_CONFIG = {
    "productName": "Digital Oscilloscope",
    "variables": [
        {"key": "shift_time", "label": "Shift Time", "value": 480.0, "unit": "min", "category": "Production"},
        {"key": "demand", "label": "Daily Demand", "value": 16.0, "unit": "units", "category": "Production"},
        {"key": "unit_price", "label": "Unit Price", "value": 25000.0, "unit": "₹", "category": "Financial"},
        {"key": "unit_cost", "label": "Unit Cost", "value": 15000.0, "unit": "₹", "category": "Financial"},
        {"key": "work_days", "label": "Work Days / Month", "value": 25.0, "unit": "days", "category": "Financial"},
        {"key": "current_cycle_time", "label": "Current Cycle Time", "value": 35.0, "unit": "min", "category": "Baseline"},
        {"key": "current_operators", "label": "Current Operators", "value": 5.0, "unit": "people", "category": "Baseline"},
        {"key": "operator_cost_per_hour", "label": "Operator Cost / Hour", "value": 150.0, "unit": "₹", "category": "Financial"},
        {"key": "investment_cost", "label": "Investment Cost", "value": 25000.0, "unit": "₹", "category": "Financial"},
        {"key": "target_cycle_time", "label": "Target Cycle Time", "value": 30.0, "unit": "min", "category": "Production"},
        {"key": "currency_symbol", "label": "Currency Symbol", "value": 0.0, "unit": "₹", "category": "General"},
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


# ── Lifespan (replaces deprecated on_event) ───────────────────────
@asynccontextmanager
async def lifespan(the_app: FastAPI):
    # ── Startup: initialise SQLite database ──
    try:
        init_db()
        db_url = os.getenv("DATABASE_URL", "sqlite:///./optoprofit.db")
        logger.info("SQLite database initialised — %s", db_url)
        _purge_expired_sessions()
    except Exception as e:
        logger.error("=" * 80)
        logger.error("❌ DATABASE ERROR: Could not initialise SQLite.")
        logger.error("Error details: %s", e)
        logger.error("=" * 80)
        raise SystemExit(
            "\nError: Could not initialise the SQLite database during server startup.\n"
        )
    yield
    # ── Shutdown ──
    logger.info("Application shutting down.")


def _purge_expired_sessions() -> None:
    """Delete all expired sessions from the database. Called once at startup (MED-2)."""
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


app = FastAPI(title="OPTO-PROFIT API", lifespan=lifespan)
app.state.limiter = limiter

# ── Rate Limit Exception Handler ──────────────────────────────────
@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    logger.warning("Rate limit exceeded: %s %s from %s", request.method, request.url.path, get_remote_address(request))
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."},
    )


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


# ── Security Headers Middleware ───────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    # HIGH-2: Content-Security-Policy — blocks XSS, clickjacking, and data injection
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "   # unsafe-inline needed by React + Vite CSS-in-JS
        "img-src 'self' data: blob:; "
        "font-src 'self' data:; "
        "connect-src 'self' ws: wss:; "        # allow WebSocket connections
        "frame-ancestors 'none'; "              # stronger than X-Frame-Options
        "base-uri 'self'; "
        "form-action 'self';"
    )
    # Enable HSTS only when behind TLS in production
    if os.getenv("ENABLE_HSTS", "").lower() == "true":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

    return response


frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]
if not frontend_origins:
    frontend_origins = [frontend_origin, "http://localhost:3000", "http://localhost:4173"]

# Desktop mode: also allow the pywebview origin
frontend_origins.extend(["http://127.0.0.1:48157", "http://localhost:48157"])

# LOW-3: Warn if HTTP origins are allowed in production
if os.getenv("ENV", "development").lower() == "production":
    for origin in frontend_origins:
        if origin.startswith("http://") and "localhost" not in origin and "127.0.0.1" not in origin:
            logger.warning(
                "SECURITY WARNING: CORS is configured to allow a non-localhost HTTP origin in production: %s", origin
            )

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(analytics.router)
app.include_router(healthcheck.router)
app.include_router(collaboration.router)


def _normalize_username(username: str) -> str:
    return username.strip().lower()


# Startup/shutdown handled by the `lifespan` context manager above.


def require_user(request: Request, authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> dict:
    """Validate from HttpOnly cookie first, then Bearer header. Returns a dict of the user."""
    # Try cookie first
    token = request.cookies.get(SESSION_COOKIE_NAME)
    # Fall back to Authorization header
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    user = get_current_user(request=request, bearer_token=token, db=db)
    
    # Return a dict that mirrors the old MongoDB document shape so Pydantic User model works
    return {
        "_id": user.id,
        "username": user.username,
        "username_normalized": user.username_normalized,
        "email": user.email,
        "password_hash": user.password_hash,
        "created_at": user.created_at,
        "is_2fa_enabled": user.is_2fa_enabled,
        "two_factor_secret": user.two_factor_secret,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "role": user.role,
        "tenant_id": user.tenant_id,
    }


@app.get("/api/status")
async def get_status():
    return {"status": "ok", "version": "1.0.0"}


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
    # The frontend handles redirection upon success.
    return result


# ── Health Endpoints ──────────────────────────────────────────────
@app.post("/api/auth/register", response_model=AuthTokenResponse)
@limiter.limit("3/minute")
def register(request: Request, payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    email = payload.email.strip() if payload.email else ""
    username = payload.username.strip() if payload.username else email
    password = payload.password
    company_name = payload.company_name.strip() if payload.company_name else None

    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    username_normalized = _normalize_username(username)
    existing = db.query(UserDB).filter(UserDB.username_normalized == username_normalized).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    user_id = secrets.token_hex(12)
    
    # Generate unique tenant ID from company name to enforce tenant isolation
    if company_name:
        tenant_id = f"T-{re.sub(r'[^A-Z0-9]', '', company_name.upper())[:15]}"
        if len(tenant_id) <= 2:
            tenant_id = f"T-{secrets.token_hex(4).upper()}"
    else:
        tenant_id = f"T-{secrets.token_hex(4).upper()}"

    new_user = UserDB(
        id=user_id,
        username=username,
        username_normalized=username_normalized,
        email=email or None,
        password_hash=_hash_password(password),
        created_at=_utc_now(),
        is_2fa_enabled=False,
        two_factor_secret=None,
        full_name=company_name,
        phone_number=None,
        role="Admin",
        tenant_id=tenant_id,
    )
    db.add(new_user)
    db.commit()

    token = _create_session_impl(db, user_id)
    set_auth_cookie(response, token)
    return AuthTokenResponse(access_token=token)


@app.post("/api/auth/login", response_model=AuthTokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, response: Response, db: Session = Depends(get_db)):
    content_type = request.headers.get("content-type", "")
    username = None
    password = None
    
    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        username = form.get("username")
        password = form.get("password")
    else:
        try:
            body = await request.json()
            username = body.get("username")
            password = body.get("password")
        except Exception:
            pass

    if not username or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username and password are required")

    # pyrefly: ignore [bad-argument-type]
    username_normalized = _normalize_username(username)
    user_row = db.query(UserDB).filter(UserDB.username_normalized == username_normalized).first()
    if not user_row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    # ── MED-5: Check for account lockout ────────────
    from datetime import timezone as _tz, timedelta
    now_utc = _utc_now().replace(tzinfo=_tz.utc)
    if user_row.locked_until:
        locked_until_utc = user_row.locked_until
        if locked_until_utc.tzinfo is None:
            locked_until_utc = locked_until_utc.replace(tzinfo=_tz.utc)
        if now_utc < locked_until_utc:
            remaining_mins = max(1, int((locked_until_utc - now_utc).total_seconds() / 60))
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"Account is locked due to multiple failed login attempts. Try again in {remaining_mins} minutes."
            )

    # ── Verify password and increment failures if wrong ──
    # pyrefly: ignore [bad-argument-type]
    if not _verify_password(password, user_row.password_hash or ""):
        user_row.failed_login_attempts += 1
        if user_row.failed_login_attempts >= 5:
            user_row.locked_until = now_utc + timedelta(minutes=15)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    # ── Success: reset lockout counters ──
    if user_row.failed_login_attempts > 0 or user_row.locked_until:
        user_row.failed_login_attempts = 0
        user_row.locked_until = None
        db.commit()

    if user_row.is_2fa_enabled:
        temp_token = _create_session_impl(db, user_row.id, is_2fa_temp=True)
        set_auth_cookie(response, temp_token, is_2fa_temp=True)
        return AuthTokenResponse(access_token=temp_token, two_factor_required=True)
    else:
        token = _create_session_impl(db, user_row.id)
        set_auth_cookie(response, token)
        return AuthTokenResponse(access_token=token)


@app.get("/api/auth/me", response_model=AuthUserResponse)
def get_me(current_user: dict = Depends(require_user)):
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


@app.get("/api/users/me", response_model=AuthUserResponse)
def get_user_me(current_user: User = Depends(get_current_user)):
    """Canonical /api/users/me GET endpoint for the settings module."""
    return AuthUserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_2fa_enabled=current_user.is_2fa_enabled,
        full_name=current_user.full_name,
        phone_number=current_user.phone_number,
        role=current_user.role,
        tenant_id=current_user.tenant_id,
        created_at=current_user.created_at
    )


@app.put("/api/users/me", response_model=AuthUserResponse)
def update_me(payload: UpdateUserRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_row = db.query(UserDB).filter(UserDB.id == current_user.id).first()
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.full_name is not None:
        user_row.full_name = payload.full_name
    if payload.phone_number is not None:
        user_row.phone_number = payload.phone_number
    if payload.email is not None:
        user_row.email = payload.email

    db.commit()
    db.refresh(user_row)

    return AuthUserResponse(
        id=user_row.id,
        username=user_row.username,
        email=user_row.email,
        is_2fa_enabled=user_row.is_2fa_enabled,
        full_name=user_row.full_name,
        phone_number=user_row.phone_number,
        role=user_row.role,
        tenant_id=user_row.tenant_id,
        created_at=user_row.created_at
    )


@app.post("/api/auth/change-password")
def change_password(payload: ChangePasswordRequest, current_user: dict = Depends(require_user), db: Session = Depends(get_db)):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New passwords do not match")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")

    user_row = db.query(UserDB).filter(UserDB.id == current_user["_id"]).first()
    if not _verify_password(payload.current_password, user_row.password_hash or ""):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")

    user_row.password_hash = _hash_password(payload.new_password)
    # Invalidate all active sessions for this user on password change
    db.query(SessionDB).filter(SessionDB.user_id == user_row.id).delete()
    db.commit()
    return {"message": "Password updated successfully"}


@app.post("/api/auth/logout")
def logout(request: Request, response: Response, authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    # Accept token from cookie or Bearer header
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if token:
        db.query(SessionDB).filter(SessionDB.token_hash == _hash_token(token)).delete()
        db.commit()
    clear_auth_cookies(response)
    return {"message": "Logged out"}


@app.post("/api/auth/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.strip()
    email_lower = email.lower()
    user = db.query(UserDB).filter(UserDB.email.ilike(email_lower)).first()
    generic_message = "If this email is registered, a password reset link has been sent."

    if not user:
        return {"message": generic_message}

    reset_token = _create_password_reset_token_impl(db, user.id)
    sent = send_password_reset_email(
        to_email=email,
        reset_token=reset_token,
        frontend_origin=frontend_origin,
    )
    if not sent:
        # Log only a safe, non-sensitive indicator
        logger.error("Failed to dispatch password reset email to %s", email)

    return {"message": generic_message}


@app.post("/api/auth/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token = payload.token.strip()
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")

    token_doc = db.query(PasswordResetTokenDB).filter(
        PasswordResetTokenDB.token_hash == _hash_token(token),
        PasswordResetTokenDB.used_at.is_(None),
    ).first()
    if not token_doc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    expires_at = token_doc.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not expires_at or expires_at < _utc_now():
        db.delete(token_doc)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    user_id = token_doc.user_id
    user_row = db.query(UserDB).filter(UserDB.id == user_id).first()
    if user_row:
        user_row.password_hash = _hash_password(payload.new_password)
    token_doc.used_at = _utc_now()
    # Invalidate all sessions for this user
    db.query(SessionDB).filter(SessionDB.user_id == user_id).delete()
    db.commit()
    return {"message": "Password reset complete. You can log in now."}


def require_2fa_token(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid authorization header")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    payload = _decode_access_token_impl(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token or token expired")

    is_2fa_temp = payload.get("is_2fa_temp", False)
    if not is_2fa_temp:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not a valid 2FA temporary token")

    token_hash = _hash_token(token)
    session = db.query(SessionDB).filter(SessionDB.token_hash == token_hash).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session not found")

    user_row = db.query(UserDB).filter(UserDB.id == session.user_id).first()
    if not user_row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return {
        "_id": user_row.id,
        "username": user_row.username,
        "username_normalized": user_row.username_normalized,
        "email": user_row.email,
        "password_hash": user_row.password_hash,
        "created_at": user_row.created_at,
        "is_2fa_enabled": user_row.is_2fa_enabled,
        "two_factor_secret": user_row.two_factor_secret,
        "full_name": user_row.full_name,
        "phone_number": user_row.phone_number,
        "role": user_row.role,
        "tenant_id": user_row.tenant_id,
    }


@app.post("/api/auth/2fa/setup", response_model=TwoFactorSetupResponse)
def setup_2fa(current_user: dict = Depends(require_user), db: Session = Depends(get_db)):
    user = User(**current_user)
    if user.is_2fa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is already enabled for this user.")

    # Generate a new secret
    secret = pyotp.random_base32()

    # Generate QR code for authenticator app
    totp = pyotp.TOTP(secret)
    otp_uri = totp.provisioning_uri(name=user.email or user.username, issuer_name="OPTOPROFIT")

    # Store the secret temporarily until user verifies it
    user_row = db.query(UserDB).filter(UserDB.id == user.id).first()
    if user_row:
        user_row.two_factor_secret = secret
        db.commit()

    return TwoFactorSetupResponse(secret=secret, qrcode_svg=otp_uri)


@app.post("/api/auth/2fa/verify", response_model=AuthTokenResponse)
@limiter.limit("5/minute")
def verify_2fa(request: Request, response: Response, payload: TwoFactorVerifyRequest, current_user_doc: dict = Depends(require_2fa_token), db: Session = Depends(get_db)):
    user = User(**current_user_doc)
    if not user.two_factor_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA not set up for this user.")

    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code.")

    # Invalidate the temporary 2FA session token BEFORE creating a permanent one.
    temp_token_from_header = request.headers.get("authorization", "").split(" ", 1)[-1].strip()
    # Also check cookie
    temp_token_from_cookie = request.cookies.get("opto_2fa_temp") or ""
    temp_token = temp_token_from_cookie or temp_token_from_header
    if temp_token:
        db.query(SessionDB).filter(SessionDB.token_hash == _hash_token(temp_token)).delete()
        db.commit()

    # 2FA successful — create a permanent session token and set HttpOnly cookie
    token = _create_session_impl(db, user.id)
    set_auth_cookie(response, token)
    return AuthTokenResponse(access_token=token)


@app.post("/api/auth/2fa/enable", response_model=AuthUserResponse)
def enable_2fa(payload: TwoFactorEnableRequest, current_user_doc: dict = Depends(require_user), db: Session = Depends(get_db)):
    user = User(**current_user_doc)
    if user.is_2fa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is already enabled.")
    if not user.two_factor_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA setup not initiated.")

    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code.")

    user_row = db.query(UserDB).filter(UserDB.id == user.id).first()
    if user_row:
        user_row.is_2fa_enabled = True
        db.commit()

    return AuthUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_2fa_enabled=True
    )


@app.post("/api/auth/2fa/disable", response_model=AuthUserResponse)
def disable_2fa(payload: TwoFactorDisableRequest, current_user_doc: dict = Depends(require_user), db: Session = Depends(get_db)):
    user = User(**current_user_doc)
    if not user.is_2fa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is not enabled for this user.")
    if not user.two_factor_secret:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="2FA secret missing for enabled 2FA user.")

    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code.")

    user_row = db.query(UserDB).filter(UserDB.id == user.id).first()
    if user_row:
        user_row.is_2fa_enabled = False
        user_row.two_factor_secret = None
        db.commit()

    return AuthUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_2fa_enabled=False
    )


# ── Tasks Endpoints ──────────────────────────────────────────────
@app.get("/api/tasks", response_model=List[Task])
def get_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user.id
    tenant_id = current_user.tenant_id
    
    # Query tasks by tenant_id first (multi-tenant shared workspace)
    if tenant_id:
        task_rows = db.query(TaskDB).filter(TaskDB.tenant_id == tenant_id).all()
    else:
        task_rows = db.query(TaskDB).filter(TaskDB.user_id == user_id).all()

    if not task_rows:
        # Auto-seed standard tasks for premium visualization out of the box
        for t in DEFAULT_TASKS:
            row = TaskDB(
                task_id=t["id"],
                user_id=user_id,
                tenant_id=tenant_id,
                name=t["name"],
                time=t["time"],
                predecessors_json=json.dumps(t["predecessors"]),
                zoning=t.get("zoning", "None"),
                custom_attributes_json=json.dumps(t.get("custom_attributes", {})),
            )
            db.add(row)
        db.commit()
        if tenant_id:
            task_rows = db.query(TaskDB).filter(TaskDB.tenant_id == tenant_id).all()
        else:
            task_rows = db.query(TaskDB).filter(TaskDB.user_id == user_id).all()
            
    return [task_row.to_dict() for task_row in task_rows]


@app.put("/api/tasks", response_model=List[Task])
def replace_tasks(tasks: List[Task], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user.id
    tenant_id = current_user.tenant_id
    
    if tenant_id:
        db.query(TaskDB).filter(TaskDB.tenant_id == tenant_id).delete()
    else:
        db.query(TaskDB).filter(TaskDB.user_id == user_id).delete()
        
    for task in tasks:
        row = TaskDB(
            task_id=task.id,
            user_id=user_id,
            tenant_id=tenant_id,
            name=task.name,
            time=task.time,
            predecessors_json=json.dumps(task.predecessors),
            zoning=task.zoning or "None",
            custom_attributes_json=json.dumps(task.custom_attributes or {}),
        )
        db.add(row)
    db.commit()
    return tasks


@app.post("/api/tasks", response_model=Task)
def create_task(task: Task, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = TaskDB(
        task_id=task.id,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        name=task.name,
        time=task.time,
        predecessors_json=json.dumps(task.predecessors),
        zoning=task.zoning or "None",
        custom_attributes_json=json.dumps(task.custom_attributes or {}),
    )
    db.add(row)
    db.commit()
    return task


@app.put("/api/tasks/{task_id}", response_model=Task)
def update_task(task_id: str, task: Task, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user.id
    tenant_id = current_user.tenant_id
    
    existing = None
    if tenant_id:
        existing = db.query(TaskDB).filter(TaskDB.task_id == task_id, TaskDB.tenant_id == tenant_id).first()
    if not existing:
        existing = db.query(TaskDB).filter(TaskDB.task_id == task_id, TaskDB.user_id == user_id).first()
        
    if existing:
        existing.task_id = task.id
        existing.name = task.name
        existing.time = task.time
        existing.predecessors_json = json.dumps(task.predecessors)
        existing.zoning = task.zoning or "None"
        existing.custom_attributes_json = json.dumps(task.custom_attributes or {})
        if tenant_id and not existing.tenant_id:
            existing.tenant_id = tenant_id
    else:
        row = TaskDB(
            task_id=task.id,
            user_id=user_id,
            tenant_id=tenant_id,
            name=task.name,
            time=task.time,
            predecessors_json=json.dumps(task.predecessors),
            zoning=task.zoning or "None",
            custom_attributes_json=json.dumps(task.custom_attributes or {}),
        )
        db.add(row)
    db.commit()
    return task


@app.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tenant_id = current_user.tenant_id
    if tenant_id:
        count = db.query(TaskDB).filter(TaskDB.task_id == task_id, TaskDB.tenant_id == tenant_id).delete()
    else:
        count = db.query(TaskDB).filter(TaskDB.task_id == task_id, TaskDB.user_id == current_user.id).delete()
        
    db.commit()
    if count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return Response(status_code=204)


# ── Config Endpoints (Singular resource) ─────────────────────────
@app.get("/api/config", response_model=Config)
def get_config(current_user: dict = Depends(require_user), db: Session = Depends(get_db)):
    user_id = current_user["_id"]
    tenant_id = current_user.get("tenant_id")
    
    config_row = None
    if tenant_id:
        config_row = db.query(ConfigDB).filter(ConfigDB.tenant_id == tenant_id).first()
    if not config_row:
        config_row = db.query(ConfigDB).filter(ConfigDB.user_id == user_id).first()
        
    if not config_row:
        # Seed default config for new tenants
        config_row = ConfigDB(user_id=user_id, tenant_id=tenant_id, data_json=json.dumps(DEFAULT_CONFIG), layout_presets_json=json.dumps({}))
        db.add(config_row)
        db.commit()
        db.refresh(config_row)
        
    config_dict = config_row.data
    config_dict["layout_presets"] = config_row.layout_presets
    return config_dict


@app.put("/api/config")
def update_config(config: Config, current_user: dict = Depends(require_user), db: Session = Depends(get_db)):
    user_id = current_user["_id"]
    tenant_id = current_user.get("tenant_id")
    
    config_row = None
    if tenant_id:
        config_row = db.query(ConfigDB).filter(ConfigDB.tenant_id == tenant_id).first()
    if not config_row:
        config_row = db.query(ConfigDB).filter(ConfigDB.user_id == user_id).first()
        
    config_dict = config.dict()
    layout_presets = config_dict.pop("layout_presets", {})

    if config_row:
        # pyrefly: ignore [deprecated]
        config_row.data_json = json.dumps(config_dict)
        config_row.layout_presets_json = json.dumps(layout_presets)
        if tenant_id and not config_row.tenant_id:
            config_row.tenant_id = tenant_id
    else:
        config_row = ConfigDB(user_id=user_id, tenant_id=tenant_id, data_json=json.dumps(config_dict), layout_presets_json=json.dumps(layout_presets))
        db.add(config_row)
    db.commit()
    return {"message": "Config updated"}


# ── Profiles Endpoints ───────────────────────────────────────────
@app.get("/api/profiles", response_model=List[Profile])
def get_profiles(current_user: dict = Depends(require_user), db: Session = Depends(get_db)):
    tenant_id = current_user.get("tenant_id")
    if tenant_id:
        profile_rows = db.query(ProfileDB).filter(ProfileDB.tenant_id == tenant_id).all()
    else:
        profile_rows = db.query(ProfileDB).filter(ProfileDB.user_id == current_user["_id"]).all()
    return [row.to_dict() for row in profile_rows]


@app.post("/api/profiles", response_model=Profile)
def create_profile(profile: Profile, current_user: dict = Depends(require_user), db: Session = Depends(get_db)):
    tenant_id = current_user.get("tenant_id")
    row = ProfileDB(
        profile_id=profile.id,
        user_id=current_user["_id"],
        tenant_id=tenant_id,
        name=profile.name,
        data_json=json.dumps({
            "tasks": [t.dict() for t in profile.tasks],
            "config": profile.config.dict(),
        }),
        timestamp=profile.timestamp,
    )
    db.add(row)
    db.commit()
    return profile


@app.delete("/api/profiles/{profile_id}")
def delete_profile(profile_id: str, current_user: dict = Depends(require_user), db: Session = Depends(get_db)):
    tenant_id = current_user.get("tenant_id")
    if tenant_id:
        count = db.query(ProfileDB).filter(
            ProfileDB.profile_id == profile_id,
            ProfileDB.tenant_id == tenant_id
        ).delete()
    else:
        count = db.query(ProfileDB).filter(
            ProfileDB.profile_id == profile_id,
            ProfileDB.user_id == current_user["_id"]
        ).delete()
        
    db.commit()
    if count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"message": "Profile deleted"}


# ── Serve React Frontend (SPA) ────────────────────────────────────────────────
# This must come AFTER all /api/* routes so the catch-all doesn't shadow them.
from .paths import get_frontend_path as _get_frontend_path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_frontend_dist = _get_frontend_path()

if _frontend_dist.exists():
    # Mount hashed JS/CSS/image bundles
    _assets_dir = _frontend_dist / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="static-assets")

    # Serve other static files in dist root (favicon, robots.txt, images)
    @app.get("/favicon.ico", include_in_schema=False)
    @app.get("/favicon.svg", include_in_schema=False)
    @app.get("/robots.txt", include_in_schema=False)
    @app.get("/icons.svg", include_in_schema=False)
    def serve_static_root(request: Request):
        file_path = _frontend_dist / request.url.path.lstrip("/")
        if file_path.exists():
            return FileResponse(str(file_path))
        return Response(status_code=404)

    # Serve image files from dist root
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
