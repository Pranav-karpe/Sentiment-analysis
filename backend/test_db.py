import os, sys
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
uri = os.getenv("MONGO_URI", "")
print(f"URI: {uri}", flush=True)
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
try:
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    print("PING: OK", flush=True)
    db = client["sentiment_analysis"]
    print(f"Collections: {db.list_collection_names()}", flush=True)
    h = generate_password_hash("testpass123")
    assert check_password_hash(h, "testpass123")
    print("Password hashing: OK", flush=True)
    users = db["users"]
    r = users.insert_one({"email": "_test_@test.com", "password_hash": h, "name": "Test"})
    found = users.find_one({"email": "_test_@test.com"})
    assert found
    users.delete_one({"_id": r.inserted_id})
    print("Users collection read/write: OK", flush=True)
    print("ALL CHECKS PASSED", flush=True)
except Exception as e:
    print(f"ERROR: {e}", flush=True)
    sys.exit(1)
