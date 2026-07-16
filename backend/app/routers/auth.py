"""
Auth Router — /api/auth/* and /api/users/me
============================================
Handles registration, login, logout, password management, 2FA, and
user profile updates. Extracted from main.py to reduce its size.
"""
import re
import secrets
from datetime import timezone

# pyrefly: ignore [missing-import]
import pyotp
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from ..auth import (
    utc_now as _utc_now,
    hash_password as _hash_password,
    verify_password as _verify_password,
    hash_token as _hash_token,
    create_session as _create_session_impl,
    create_password_reset_token as _create_password_reset_token_impl,
    decode_access_token as _decode_access_token_impl,
    get_current_user,
    set_auth_cookie,
    clear_auth_cookies,
    SESSION_COOKIE_NAME,
)
from ..database import get_db
from ..sql_models import UserDB, SessionDB, PasswordResetTokenDB
from ..models import (
    AuthTokenResponse,
    AuthUserResponse,
    LoginRequest,
    RegisterRequest,
    User,
    UpdateUserRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TwoFactorDisableRequest,
    TwoFactorEnableRequest,
    TwoFactorSetupResponse,
    TwoFactorVerifyRequest,
)
from ..email_service import send_password_reset_email
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

logger = logging.getLogger("optoprofit.auth")
limiter = Limiter(key_func=get_remote_address)
router = APIRouter()


def _normalize_username(username: str) -> str:
    return username.strip().lower()


def require_user(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Validate from HttpOnly cookie first, then Bearer header."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    user = get_current_user(request=request, bearer_token=token, db=db)
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


def require_2fa_token(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid authorization header")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    payload = _decode_access_token_impl(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token or token expired")
    if not payload.get("is_2fa_temp", False):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not a valid 2FA temporary token")
    session = db.query(SessionDB).filter(SessionDB.token_hash == _hash_token(token)).first()
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


# ── Registration & Login ──────────────────────────────────────────

@router.post("/api/auth/register", response_model=AuthTokenResponse)
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
    if db.query(UserDB).filter(UserDB.username_normalized == username_normalized).first():
        raise HTTPException(status_code=409, detail="Username already exists")

    user_id = secrets.token_hex(12)
    if company_name:
        tenant_id = f"T-{re.sub(r'[^A-Z0-9]', '', company_name.upper())[:15]}"
        if len(tenant_id) <= 2:
            tenant_id = f"T-{secrets.token_hex(4).upper()}"
    else:
        tenant_id = f"T-{secrets.token_hex(4).upper()}"

    new_user = UserDB(
        id=user_id, username=username, username_normalized=username_normalized,
        email=email or None, password_hash=_hash_password(password),
        created_at=_utc_now(), is_2fa_enabled=False, two_factor_secret=None,
        full_name=company_name, phone_number=None, role="Admin", tenant_id=tenant_id,
    )
    db.add(new_user)
    db.commit()
    token = _create_session_impl(db, user_id)
    set_auth_cookie(response, token)
    return AuthTokenResponse(access_token=token)


@router.post("/api/auth/login", response_model=AuthTokenResponse)
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

    username_normalized = _normalize_username(username)  # pyrefly: ignore
    user_row = db.query(UserDB).filter(UserDB.username_normalized == username_normalized).first()
    if not user_row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

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
                detail=f"Account is locked due to multiple failed login attempts. Try again in {remaining_mins} minutes.",
            )

    if not _verify_password(password, user_row.password_hash or ""):  # pyrefly: ignore
        user_row.failed_login_attempts += 1
        if user_row.failed_login_attempts >= 5:
            user_row.locked_until = now_utc + timedelta(minutes=15)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

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


@router.post("/api/auth/logout")
def logout(
    request: Request,
    response: Response,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if token:
        db.query(SessionDB).filter(SessionDB.token_hash == _hash_token(token)).delete()
        db.commit()
    clear_auth_cookies(response)
    return {"message": "Logged out"}


# ── User / Me ──────────────────────────────────────────────────────

@router.get("/api/auth/me", response_model=AuthUserResponse)
def get_me(current_user: dict = Depends(require_user)):
    user = User(**current_user)
    return AuthUserResponse(
        id=user.id, username=user.username, email=user.email,
        is_2fa_enabled=user.is_2fa_enabled, full_name=user.full_name,
        phone_number=user.phone_number, role=user.role,
        tenant_id=user.tenant_id, created_at=user.created_at,
    )


@router.get("/api/users/me", response_model=AuthUserResponse)
def get_user_me(current_user: User = Depends(get_current_user)):
    return AuthUserResponse(
        id=current_user.id, username=current_user.username, email=current_user.email,
        is_2fa_enabled=current_user.is_2fa_enabled, full_name=current_user.full_name,
        phone_number=current_user.phone_number, role=current_user.role,
        tenant_id=current_user.tenant_id, created_at=current_user.created_at,
    )


@router.put("/api/users/me", response_model=AuthUserResponse)
def update_me(
    payload: UpdateUserRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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
        id=user_row.id, username=user_row.username, email=user_row.email,
        is_2fa_enabled=user_row.is_2fa_enabled, full_name=user_row.full_name,
        phone_number=user_row.phone_number, role=user_row.role,
        tenant_id=user_row.tenant_id, created_at=user_row.created_at,
    )


# ── Password Management ────────────────────────────────────────────

@router.post("/api/auth/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: dict = Depends(require_user),
    db: Session = Depends(get_db),
):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New passwords do not match")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    user_row = db.query(UserDB).filter(UserDB.id == current_user["_id"]).first()
    if not _verify_password(payload.current_password, user_row.password_hash or ""):  # pyrefly: ignore
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
    user_row.password_hash = _hash_password(payload.new_password)
    db.query(SessionDB).filter(SessionDB.user_id == user_row.id).delete()
    db.commit()
    return {"message": "Password updated successfully"}


@router.post("/api/auth/forgot-password")
@limiter.limit("3/minute")
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    email = payload.email.strip()
    user = db.query(UserDB).filter(UserDB.email.ilike(email.lower())).first()
    generic_message = "If this email is registered, a password reset link has been sent."
    if not user:
        return {"message": generic_message}
    reset_token = _create_password_reset_token_impl(db, user.id)
    sent = send_password_reset_email(
        to_email=email, reset_token=reset_token,
        frontend_origin="http://localhost:5173",
    )
    if not sent:
        logger.error("Failed to dispatch password reset email to %s", email)
    return {"message": generic_message}


@router.post("/api/auth/reset-password")
@limiter.limit("5/minute")
def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
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
    user_row = db.query(UserDB).filter(UserDB.id == token_doc.user_id).first()
    if user_row:
        user_row.password_hash = _hash_password(payload.new_password)
    token_doc.used_at = _utc_now()
    db.query(SessionDB).filter(SessionDB.user_id == token_doc.user_id).delete()
    db.commit()
    return {"message": "Password reset complete. You can log in now."}


# ── Two-Factor Authentication ──────────────────────────────────────

@router.post("/api/auth/2fa/setup", response_model=TwoFactorSetupResponse)
def setup_2fa(current_user: dict = Depends(require_user), db: Session = Depends(get_db)):
    user = User(**current_user)
    if user.is_2fa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is already enabled for this user.")
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    otp_uri = totp.provisioning_uri(name=user.email or user.username, issuer_name="OPTOPROFIT")
    user_row = db.query(UserDB).filter(UserDB.id == user.id).first()
    if user_row:
        user_row.two_factor_secret = secret
        db.commit()
    return TwoFactorSetupResponse(secret=secret, qrcode_svg=otp_uri)


@router.post("/api/auth/2fa/verify", response_model=AuthTokenResponse)
@limiter.limit("5/minute")
def verify_2fa(
    request: Request,
    response: Response,
    payload: TwoFactorVerifyRequest,
    current_user_doc: dict = Depends(require_2fa_token),
    db: Session = Depends(get_db),
):
    user = User(**current_user_doc)
    if not user.two_factor_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA not set up for this user.")
    if not pyotp.TOTP(user.two_factor_secret).verify(payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code.")
    temp_token = request.cookies.get("opto_2fa_temp") or request.headers.get("authorization", "").split(" ", 1)[-1].strip()
    if temp_token:
        db.query(SessionDB).filter(SessionDB.token_hash == _hash_token(temp_token)).delete()
        db.commit()
    token = _create_session_impl(db, user.id)
    set_auth_cookie(response, token)
    return AuthTokenResponse(access_token=token)


@router.post("/api/auth/2fa/enable", response_model=AuthUserResponse)
def enable_2fa(
    payload: TwoFactorEnableRequest,
    current_user_doc: dict = Depends(require_user),
    db: Session = Depends(get_db),
):
    user = User(**current_user_doc)
    if user.is_2fa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is already enabled.")
    if not user.two_factor_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA setup not initiated.")
    if not pyotp.TOTP(user.two_factor_secret).verify(payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code.")
    user_row = db.query(UserDB).filter(UserDB.id == user.id).first()
    if user_row:
        user_row.is_2fa_enabled = True
        db.commit()
    return AuthUserResponse(id=user.id, username=user.username, email=user.email, is_2fa_enabled=True)


@router.post("/api/auth/2fa/disable", response_model=AuthUserResponse)
def disable_2fa(
    payload: TwoFactorDisableRequest,
    current_user_doc: dict = Depends(require_user),
    db: Session = Depends(get_db),
):
    user = User(**current_user_doc)
    if not user.is_2fa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is not enabled for this user.")
    if not user.two_factor_secret:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="2FA secret missing.")
    if not pyotp.TOTP(user.two_factor_secret).verify(payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code.")
    user_row = db.query(UserDB).filter(UserDB.id == user.id).first()
    if user_row:
        user_row.is_2fa_enabled = False
        user_row.two_factor_secret = None
        db.commit()
    return AuthUserResponse(id=user.id, username=user.username, email=user.email, is_2fa_enabled=False)
