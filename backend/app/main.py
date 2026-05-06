import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import List

import pyotp
from bson import ObjectId
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from .models import (
    AuthTokenResponse,
    AuthUserResponse,
    Config,
    LoginRequest,
    Profile,
    RegisterRequest,
    Task,
    ForgotPasswordRequest,
    User,
    TwoFactorDisableRequest,
    TwoFactorEnableRequest,
    TwoFactorSetupResponse,
    TwoFactorVerifyRequest
)
from .routers import analytics, healthcheck

app = FastAPI(title="OPTO-PROFIT API")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]
if not frontend_origins:
    frontend_origins = [frontend_origin, "http://localhost:3000", "http://localhost:4173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics.router)
app.include_router(healthcheck.router)

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_username(username: str) -> str:
    return username.strip().lower()


def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt_bytes = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 200_000)
    return f"{salt_bytes.hex()}${digest.hex()}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, digest_hex = stored_hash.split("$", 1)
    except ValueError:
        return False
    candidate = _hash_password(password, bytes.fromhex(salt_hex)).split("$", 1)[1]
    return hmac.compare_digest(candidate, digest_hex)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def _create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(48)
    expires_at = _utc_now() + timedelta(hours=12)
    await app.database["sessions"].insert_one(
        {
            "token_hash": _hash_token(token),
            "user_id": user_id,
            "expires_at": expires_at,
            "created_at": _utc_now(),
        }
    )
    return token


@app.on_event("startup")
async def startup_db_client():
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    app.mongodb_client = AsyncIOMotorClient(mongodb_uri)
    app.database = app.mongodb_client["optoprofit_db"]
    await app.database["users"].create_index("username_normalized", unique=True)
    await app.database["sessions"].create_index("token_hash", unique=True)
    await app.database["sessions"].create_index("expires_at", expireAfterSeconds=0)


@app.on_event("shutdown")
async def shutdown_db_client():
    app.mongodb_client.close()


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
    return {"status": "ok", "version": "1.0.0"}


@app.post("/api/auth/register", response_model=AuthTokenResponse)
async def register(payload: RegisterRequest):
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

    user_id = str(ObjectId())
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
        }
    )
    token = await _create_session(user_id)
    return AuthTokenResponse(access_token=token)


@app.post("/api/auth/login", response_model=AuthTokenResponse)
async def login(payload: LoginRequest):
    username_normalized = _normalize_username(payload.username)
    user_doc = await app.database["users"].find_one({"username_normalized": username_normalized})
    if not user_doc or not _verify_password(payload.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    
    user = User(**user_doc)

    if user.is_2fa_enabled:
        # Create a temporary session token for 2FA verification
        temp_token = await _create_session(user.id)
        return AuthTokenResponse(access_token=temp_token, two_factor_required=True)
    else:
        token = await _create_session(user.id)
        return AuthTokenResponse(access_token=token)


@app.get("/api/auth/me", response_model=AuthUserResponse)
async def get_me(current_user: dict = Depends(require_user)):
    user_doc = await app.database["users"].find_one({"_id": current_user["_id"]})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    user = User(**user_doc)
    return AuthUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_2fa_enabled=user.is_2fa_enabled
    )


@app.post("/api/auth/logout")
async def logout(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid authorization header")
    token = authorization.split(" ", 1)[1].strip()
    await app.database["sessions"].delete_one({"token_hash": _hash_token(token)})
    return {"message": "Logged out"}


@app.post("/api/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    email = payload.email.lower().strip()
    user = await app.database["users"].find_one({"email": email})
    
    if not user:
        # For security, don't reveal if user exists, but here we can just return success
        return {"message": "If this email is registered, you will receive a reset link shortly."}
    
    # Simulate sending email
    reset_token = secrets.token_urlsafe(32)
    print(f"\n[EMAIL SIMULATION] To: {email}")
    print(f"[EMAIL SIMULATION] Subject: Password Reset Request for OPTO-PROFIT")
    print(f"[EMAIL SIMULATION] Content: Use this token to reset your password: {reset_token}")
    print(f"[EMAIL SIMULATION] URL: http://localhost:5173/reset-password?token={reset_token}\n")
    
    return {"message": "Recovery email sent successfully."}


async def require_2fa_token(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid authorization header")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    token_hash = _hash_token(token)
    session = await app.database["sessions"].find_one({"token_hash": token_hash})
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session not found")

    expires_at = session.get("expires_at")
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if not expires_at or expires_at < _utc_now():
        await app.database["sessions"].delete_one({"token_hash": token_hash}) # Clear expired session
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    user_doc = await app.database["users"].find_one({"_id": session["user_id"]})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    return user_doc


@app.post("/api/auth/2fa/setup", response_model=TwoFactorSetupResponse)
async def setup_2fa(current_user: dict = Depends(require_user)):
    user = User(**current_user)
    if user.is_2fa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is already enabled for this user.")

    # Generate a new secret
    secret = pyotp.random_base32()
    
    # Generate QR code for authenticator app
    totp = pyotp.TOTP(secret)
    otp_uri = totp.provisioning_uri(name=user.email or user.username, issuer_name="OPTOPROFIT")

    # Store the secret temporarily until user verifies it
    await app.database["users"].update_one(
        {"_id": user.id},
        {"$set": {"two_factor_secret": secret}}
    )

    return TwoFactorSetupResponse(secret=secret, qrcode_svg=otp_uri)


@app.post("/api/auth/2fa/verify", response_model=AuthTokenResponse)
async def verify_2fa(payload: TwoFactorVerifyRequest, current_user_doc: dict = Depends(require_2fa_token)):
    user = User(**current_user_doc)
    if not user.two_factor_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA not set up for this user.")

    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code.")

    # 2FA successful, create a permanent session token
    token = await _create_session(user.id)
    # Clear the temporary session token used for 2FA verification
    # This might have been handled implicitly by _create_session or can be explicit if needed.
    return AuthTokenResponse(access_token=token)


@app.post("/api/auth/2fa/enable", response_model=AuthUserResponse)
async def enable_2fa(payload: TwoFactorEnableRequest, current_user_doc: dict = Depends(require_user)):
    user = User(**current_user_doc)
    if user.is_2fa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is already enabled.")
    if not user.two_factor_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA setup not initiated.")

    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code.")

    await app.database["users"].update_one(
        {"_id": user.id},
        {"$set": {"is_2fa_enabled": True}}
    )
    user.is_2fa_enabled = True # Update the user object for the response
    return AuthUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_2fa_enabled=user.is_2fa_enabled
    )


@app.post("/api/auth/2fa/disable", response_model=AuthUserResponse)
async def disable_2fa(payload: TwoFactorDisableRequest, current_user_doc: dict = Depends(require_user)):
    user = User(**current_user_doc)
    if not user.is_2fa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is not enabled for this user.")
    if not user.two_factor_secret: # This should not happen if is_2fa_enabled is True
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="2FA secret missing for enabled 2FA user.")

    totp = pyotp.TOTP(user.two_factor_secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code.")

    await app.database["users"].update_one(
        {"_id": user.id},
        {"$set": {"is_2fa_enabled": False, "two_factor_secret": None}}
    )
    user.is_2fa_enabled = False # Update the user object for the response
    user.two_factor_secret = None # Update the user object for the response
    return AuthUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_2fa_enabled=user.is_2fa_enabled
    )

# Tasks Endpoints
@app.get("/api/tasks", response_model=List[Task])
async def get_tasks(_: dict = Depends(require_user)):
    tasks = await app.database["tasks"].find().to_list(1000)
    for task in tasks:
        task["id"] = task.get("id", str(task["_id"]))
    return tasks


@app.post("/api/tasks", response_model=Task)
async def create_task(task: Task, _: dict = Depends(require_user)):
    new_task = await app.database["tasks"].insert_one(task.dict())
    created_task = await app.database["tasks"].find_one({"_id": new_task.inserted_id})
    return created_task


# Config Endpoints (Singular resource)
@app.get("/api/config", response_model=Config)
async def get_config(_: dict = Depends(require_user)):
    config = await app.database["config"].find_one()
    if config:
        return config
    raise HTTPException(status_code=404, detail="Config not found")


@app.put("/api/config")
async def update_config(config: Config, _: dict = Depends(require_user)):
    await app.database["config"].replace_one({}, config.dict(), upsert=True)
    return {"message": "Config updated"}


# Profiles Endpoints
@app.get("/api/profiles", response_model=List[Profile])
async def get_profiles(_: dict = Depends(require_user)):
    profiles = await app.database["profiles"].find().to_list(1000)
    return profiles


@app.post("/api/profiles", response_model=Profile)
async def create_profile(profile: Profile, _: dict = Depends(require_user)):
    await app.database["profiles"].insert_one(profile.dict())
    return profile


@app.delete("/api/profiles/{profile_id}")
async def delete_profile(profile_id: str, _: dict = Depends(require_user)):
    result = await app.database["profiles"].delete_one({"id": profile_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"message": "Profile deleted"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
