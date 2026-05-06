import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_users():
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongodb_uri)
    db = client["optoprofit_db"]
    users_cursor = db["users"].find({})
    users = await users_cursor.to_list(length=100)
    print(f"Total users found: {len(users)}")
    for user in users:
        print(f"ID: {user.get('_id')}, Username: {user.get('username')}, Email: {user.get('email')}, Password Hash: {user.get('password_hash')}")
    client.close()

if __name__ == "__main__":
    asyncio.run(check_users())
