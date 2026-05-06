from pymongo import MongoClient
import hashlib
import secrets
from datetime import datetime, timezone

def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt_bytes = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 200_000)
    return f"{salt_bytes.hex()}${digest.hex()}"

def create_demo_user():
    client = MongoClient("mongodb://localhost:27017")
    db = client["optoprofit_db"]
    
    email = "engineer@teirac.com"
    username = "engineer@teirac.com" # Matching because I removed the username field in UI
    password = "Password123!"
    
    # Check if already exists
    if db["users"].find_one({"username_normalized": username.lower()}):
        print(f"User {email} already exists.")
        return

    user_doc = {
        "_id": "demo_user_id_123",
        "username": username,
        "username_normalized": username.lower(),
        "email": email,
        "password_hash": _hash_password(password),
        "created_at": datetime.now(timezone.utc),
        "is_2fa_enabled": False,
        "two_factor_secret": None
    }
    
    db["users"].insert_one(user_doc)
    print(f"Created demo user: {email} / {password}")

if __name__ == "__main__":
    create_demo_user()
