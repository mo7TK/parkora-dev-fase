import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME   = "parkora"

# This variable holds the client once connect_db() is called.
# It starts as None and gets assigned on app startup.
client: AsyncIOMotorClient = None


def get_database():
    """Return the parkora database. Call this inside route handlers."""
    return client[DB_NAME]


async def connect_db():
    """Called once when FastAPI starts. Opens the MongoDB connection."""
    global client
    client = AsyncIOMotorClient(MONGO_URL)
    print(f"[DB] Connected to MongoDB at {MONGO_URL}")


async def close_db():
    """Called once when FastAPI shuts down. Closes the connection cleanly."""
    client.close()
    print("[DB] MongoDB connection closed.")
