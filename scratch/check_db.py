from pymongo import MongoClient
import sys

def check_users():
    try:
        client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=2000)
        # Force a connection check
        client.admin.command('ping')
        db = client["optoprofit_db"]
        users_col = db["users"]
        count = users_col.count_documents({})
        print(f"Connection successful. Total users in database: {count}")
        if count > 0:
            print("Users found:")
            for user in users_col.find({}, {"username": 1, "username_normalized": 1}):
                print(f"- {user['username']} ({user['username_normalized']})")
        else:
            print("No users found in the 'users' collection.")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_users()
