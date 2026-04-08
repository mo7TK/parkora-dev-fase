"""
Run this once to insert your parking lot into MongoDB.

    python seed.py

It prints the MongoDB id of the inserted lot.
Copy that id into detect.py as PARKING_LOT_ID.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"
DB_NAME   = "parkora"


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db     = client[DB_NAME]

    # Don't insert duplicates if you run this more than once
    existing = await db.parking_lots.find_one({"name": "Parking Universitaire"})
    if existing:
        print(f"Already exists. id = {existing['_id']}")
        print("Copy this id into detect.py as PARKING_LOT_ID.")
        client.close()
        return

    lot = {
        "name":        "Parking Universitaire",
        "latitude":    36.75000775277104,
        "longitude":   5.039663538251243,
        "total_spots": 14,
    }

    result = await db.parking_lots.insert_one(lot)
    print(f"Parking lot inserted.")
    print(f"id = {result.inserted_id}")
    print(f"\nCopy this id into detect.py as PARKING_LOT_ID.")
    client.close()


asyncio.run(seed())
