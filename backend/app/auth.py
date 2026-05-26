"""
Shared authentication utilities for OPTO-PROFIT API.

Extracted from main.py to avoid circular imports (P0-5)
and provide a single source of truth for auth helpers.
"""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt_bytes = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 200_000)
    return f"{salt_bytes.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, digest_hex = stored_hash.split("$", 1)
    except ValueError:
        return False
    candidate = hash_password(password, bytes.fromhex(salt_hex)).split("$", 1)[1]
    return hmac.compare_digest(candidate, digest_hex)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def create_session(database, user_id: str) -> str:
    token = secrets.token_urlsafe(48)
    expires_at = utc_now() + timedelta(hours=12)
    await database["sessions"].insert_one(
        {
            "token_hash": hash_token(token),
            "user_id": user_id,
            "expires_at": expires_at,
            "created_at": utc_now(),
        }
    )
    return token


async def create_password_reset_token(database, user_id: str) -> str:
    token = secrets.token_urlsafe(48)
    await database["password_reset_tokens"].delete_many({"user_id": user_id, "used_at": None})
    await database["password_reset_tokens"].insert_one(
        {
            "token_hash": hash_token(token),
            "user_id": user_id,
            "created_at": utc_now(),
            "expires_at": utc_now() + timedelta(minutes=30),
            "used_at": None,
        }
    )
    return token
