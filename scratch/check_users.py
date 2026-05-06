from pymongo import MongoClient

def check_users():
    client = MongoClient("mongodb://localhost:27017")
    db = client["optoprofit_db"]
    users = list(db["users"].find({}, {"username": 1, "email": 1}))
    if not users:
        print("No users found in database.")
    else:
        print("Found users:")
        for user in users:
            print(f"- Username: {user.get('username')}, Email: {user.get('email')}")

if __name__ == "__main__":
    check_users()
