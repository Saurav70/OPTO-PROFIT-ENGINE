import hashlib
import hmac
import secrets
from datetime import datetime, timezone
from pymongo import MongoClient

def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt_bytes = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 200_000)
    return f"{salt_bytes.hex()}${digest.hex()}"

def create_admin():
    client = MongoClient("mongodb://localhost:27017")
    db = client["optoprofit_db"]
    users = db["users"]

    username = "admin"
    password = "password123"
    username_normalized = username.lower()

    # Check if exists
    if users.find_one({"username_normalized": username_normalized}):
        print(f"User '{username}' already exists.")
        return

    user_data = {
        "_id": secrets.token_hex(12), # Simplified ID
        "username": username,
        "username_normalized": username_normalized,
        "password_hash": _hash_password(password),
        "created_at": datetime.now(timezone.utc),
        "role": "admin"
    }

    users.insert_one(user_data)
    print(f"Successfully created admin user!")
    print(f"Username: {username}")
    print(f"Password: {password}")

if __name__ == "__main__":
    create_admin()
