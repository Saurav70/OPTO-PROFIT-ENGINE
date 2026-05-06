import hashlib
import hmac
from pymongo import MongoClient

def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, digest_hex = stored_hash.split("$", 1)
        salt_bytes = bytes.fromhex(salt_hex)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 200_000)
        candidate = digest.hex()
        return hmac.compare_digest(candidate, digest_hex)
    except Exception as e:
        print(f"Error: {e}")
        return False

def check_admin():
    client = MongoClient("mongodb://localhost:27017")
    db = client["optoprofit_db"]
    user = db["users"].find_one({"username_normalized": "admin"})
    if not user:
        print("Admin user not found.")
        return
    
    password = "password123"
    is_valid = _verify_password(password, user["password_hash"])
    print(f"Password 'password123' is valid for admin: {is_valid}")

if __name__ == "__main__":
    check_admin()
