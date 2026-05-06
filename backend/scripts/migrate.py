import asyncio
import json
import motor.motor_asyncio
from pathlib import Path

async def migrate_data(json_file_path):
    # Connect to MongoDB
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["optoprofit_db"]
    
    # Load JSON data
    with open(json_file_path, 'r') as f:
        data = json.load(f)
    
    # Assuming the JSON structure has keys 'tasks', 'config', 'profiles'
    if 'tasks' in data:
        await db["tasks"].delete_many({}) # Clear existing data
        await db["tasks"].insert_many(data['tasks'])
        print(f"Migrated {len(data['tasks'])} tasks.")
        
    if 'config' in data:
        await db["config"].delete_many({})
        await db["config"].insert_one(data['config'])
        print("Migrated configuration.")
        
    if 'profiles' in data:
        await db["profiles"].delete_many({})
        await db["profiles"].insert_many(data['profiles'])
        print(f"Migrated {len(data['profiles'])} profiles.")

    client.close()

if __name__ == "__main__":
    # Default to backend/scripts/data_export.json, allow override by CLI arg.
    import sys
    default_path = Path(__file__).with_name("data_export.json")
    file_path = sys.argv[1] if len(sys.argv) > 1 else str(default_path)
    asyncio.run(migrate_data(file_path))
