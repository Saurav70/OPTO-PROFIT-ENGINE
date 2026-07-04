"""
Shared authentication utilities for OPTO-PROFIT API.
Utilizes Bcrypt for password hashing and JSON Web Tokens (JWT) for session handling.
"""

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import bcrypt
from jose import jwt, JWTError
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
from .database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

SESSION_COOKIE_NAME = "opto_session"
SESSION_COOKIE_2FA_NAME = "opto_2fa_temp"

SESSION_SECRET = os.getenv("SESSION_SECRET")
ENV = os.getenv("ENV", "development").lower()

_logger = __import__("logging").getLogger("optoprofit.auth")

if not SESSION_SECRET:
    from .license import get_hardware_fingerprint
    from .paths import get_persistent_salt_path
    import uuid
    
    salt_path = get_persistent_salt_path()
    if not salt_path.exists():
        salt_path.parent.mkdir(parents=True, exist_ok=True)
        salt_path.write_bytes(uuid.uuid4().bytes)
    dynamic_salt = salt_path.read_bytes()

    # Derive a persistent secret key based on the machine's HWID using PBKDF2
    hwid = get_hardware_fingerprint().encode("utf-8")
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=dynamic_salt,
        iterations=600000,
    )
    SECRET_KEY = base64.urlsafe_b64encode(kdf.derive(hwid)).decode("utf-8")
    _logger.info("SESSION_SECRET not set — using HWID-derived PBKDF2 key.")
else:
    SECRET_KEY = SESSION_SECRET

ALGORITHM = "HS256"

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt hash."""
    try:
        password_bytes = password.encode("utf-8")
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False

def hash_token(token: str) -> str:
    """Hash a token using SHA-256 (for reset tokens database lookup)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Generate a signed JWT token with a 24 hour default expiration."""
    to_encode = data.copy()
    if expires_delta:
        expire = utc_now() + expires_delta
    else:
        expire = utc_now() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict | None:
    """Decode and verify a signed JWT token."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

def create_session(db: Session, user_id: str, is_2fa_temp: bool = False) -> str:
    """Create a new session: returns a signed JWT and saves its hash to SessionDB."""
    from .sql_models import UserDB, SessionDB  # local import to avoid circular deps
    import secrets
    
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    email = user.email if (user and user.email) else (user.username if user else "")
    
    expires_delta = timedelta(minutes=10) if is_2fa_temp else timedelta(hours=24)
    token = create_access_token({
        "sub": email, 
        "user_id": user_id, 
        "is_2fa_temp": is_2fa_temp,
        "jti": secrets.token_hex(16)
    }, expires_delta=expires_delta)
    expires_at = utc_now() + expires_delta
    session_row = SessionDB(
        token_hash=hash_token(token),
        user_id=user_id,
        expires_at=expires_at,
        created_at=utc_now(),
    )
    db.add(session_row)
    db.commit()
    return token


# ── Cookie Helpers ────────────────────────────────────────────────
def set_auth_cookie(
    response,
    token: str,
    is_2fa_temp: bool = False,
    max_age: int | None = None,
) -> None:
    """
    Attach an HttpOnly session cookie to the given FastAPI Response object.
    - secure=True in production (requires HTTPS).
    - samesite='lax' is sufficient for SPA same-origin setups and blocks CSRF
      for cross-site navigations while allowing top-level navigation cookies.
    """
    is_production = ENV == "production"
    cookie_name = SESSION_COOKIE_2FA_NAME if is_2fa_temp else SESSION_COOKIE_NAME
    if max_age is None:
        max_age = 600 if is_2fa_temp else 86400  # 10 min or 24 hr
    response.set_cookie(
        key=cookie_name,
        value=token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


def clear_auth_cookies(response) -> None:
    """Remove both session cookies (used on logout and session invalidation)."""
    for cookie_name in (SESSION_COOKIE_NAME, SESSION_COOKIE_2FA_NAME):
        response.delete_cookie(key=cookie_name, path="/")

def create_password_reset_token(db: Session, user_id: str) -> str:
    """Create a one-time password-reset token and persist it via SQLAlchemy."""
    from .sql_models import PasswordResetTokenDB  # local import to avoid circular deps

    # Invalidate any existing unused tokens for this user
    db.query(PasswordResetTokenDB).filter(
        PasswordResetTokenDB.user_id == user_id,
        PasswordResetTokenDB.used_at.is_(None),
    ).delete()

    token = secrets.token_urlsafe(48)
    reset_row = PasswordResetTokenDB(
        token_hash=hash_token(token),
        user_id=user_id,
        created_at=utc_now(),
        expires_at=utc_now() + timedelta(minutes=30),
        used_at=None,
    )
    db.add(reset_row)
    db.commit()
    return token

def get_current_user(
    request: "Request" = None,  # type: ignore[name-defined]
    bearer_token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Resolve the current authenticated user from either:
      1. The Authorization: Bearer <token> header  (legacy / API clients)
      2. The opto_session HttpOnly cookie            (preferred browser flow)

    This dual-mode approach allows a seamless frontend migration.
    """
    from fastapi import Request as _Request  # noqa: F811 — local to avoid circular
    from .sql_models import UserDB, SessionDB
    from .models import User

    # Prefer the cookie; fall back to the Bearer header
    token: str | None = None
    if request is not None:
        token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        token = bearer_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token or token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    is_2fa_temp = payload.get("is_2fa_temp", False)
    if is_2fa_temp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="2FA verification required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_hash = hash_token(token)
    session = db.query(SessionDB).filter(SessionDB.token_hash == token_hash).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── MED-2: Enforce session expiry at the DB level ────────────
    session_expires = session.expires_at
    if session_expires.tzinfo is None:
        session_expires = session_expires.replace(tzinfo=timezone.utc)
    if session_expires < utc_now():
        db.delete(session)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired — please log in again",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: subject missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    import typing
    user: typing.Any = db.query(UserDB).filter(
        (UserDB.email == email) | (UserDB.username_normalized == email.strip().lower())
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return User(
        _id=user.id,
        username=user.username,
        username_normalized=user.username_normalized,
        email=user.email,
        password_hash=user.password_hash,
        created_at=user.created_at,
        is_2fa_enabled=user.is_2fa_enabled,
        two_factor_secret=user.two_factor_secret,
        full_name=user.full_name,
        phone_number=user.phone_number,
        role=user.role,
        tenant_id=user.tenant_id,
    )
