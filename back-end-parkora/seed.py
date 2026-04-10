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

    lots = [
        {
            "name":        "Parking Universitaire",
            "latitude":    36.75000775277104,
            "longitude":   5.039663538251243,
            "total_spots": 14,
        },
        {
            "name":        "EPB Parking",
            "latitude":    36.749501073051476,
            "longitude":   5.084449139852327,
            "total_spots": 20,
        }
    ]

    for lot in lots:
        existing = await db.parking_lots.find_one({"name": lot["name"]})
        if existing:
            print(f"'{lot['name']}' already exists. id = {existing['_id']}")
        else:
            result = await db.parking_lots.insert_one(lot)
            print(f"Inserted '{lot['name']}'. id = {result.inserted_id}")

    print(f"\nCopy the desired id into detect.py as PARKING_LOT_ID.")
    client.close()


asyncio.run(seed())
