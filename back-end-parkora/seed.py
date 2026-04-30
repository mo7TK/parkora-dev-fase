"""
Run this once to insert / update your parking lots into MongoDB.

    python seed.py

It prints the MongoDB id of each lot.
Copy those ids into detect.py as PARKING_LOT_ID.

New fields added (Phase 1):
  • type            → "paid" | "free"
  • address         → human-readable address string
  • bio             → short description of the parking lot
  • price_per_hour  → int (DA), 0 if free
  • is_open         → bool  (can be toggled manually or via an admin later)
  • opening_hours   → "24/7"  OR  a dict  { "lun": "08:00-22:00", ... }
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
            "name":            "Parking Universitaire",
            "latitude":        36.75000775277104,
            "longitude":       5.039663538251243,
            "total_spots":     14,
            "hero_image":      "parking_entrance_univ.jpg",
            "minimap_image":   "parking_map.png",
            # ── New fields ────────────────────────────────────────────────
            "type":            "free",
            "address":         "Cité universitaire, Sétif 19000, Algérie",
            "bio":             (
                "Parking gratuit réservé aux étudiants et au personnel de "
                "l'université. Surveillance assurée en journée."
            ),
            "price_per_hour":  0,
            "is_open":         True,
            "opening_hours":   {
                "lun": "07:00-20:00",
                "mar": "07:00-20:00",
                "mer": "07:00-20:00",
                "jeu": "07:00-20:00",
                "ven": "07:00-18:00",
                "sam": "08:00-14:00",
                "dim": "Fermé",
            },
        },
        {
            "name":            "EPB Parking",
            "latitude":        36.749501073051476,
            "longitude":       5.084449139852327,
            "total_spots":     20,
            "hero_image":      "parking_entrance_epb.jpg",
            "minimap_image":   "parking_map_epb.png",
            # ── New fields ────────────────────────────────────────────────
            "type":            "paid",
            "address":         "Pôle EPB, Route de Béjaïa, Sétif 19000, Algérie",
            "bio":             (
                "Parking sécurisé avec caméras de surveillance 24h/24. "
                "Idéal pour les visiteurs et le personnel du pôle EPB. "
                "Accès rapide depuis la route nationale."
            ),
            "price_per_hour":  100,   # 100 DA / heure
            "is_open":         True,
            "opening_hours":   "24/7",
        },
    ]

    for lot in lots:
        existing = await db.parking_lots.find_one({"name": lot["name"]})
        if existing:
            # Update existing document with the new fields only
            await db.parking_lots.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "type":           lot["type"],
                    "address":        lot["address"],
                    "bio":            lot["bio"],
                    "price_per_hour": lot["price_per_hour"],
                    "is_open":        lot["is_open"],
                    "opening_hours":  lot["opening_hours"],
                }},
            )
            print(f"'{lot['name']}' updated.  id = {existing['_id']}")
        else:
            result = await db.parking_lots.insert_one(lot)
            print(f"Inserted '{lot['name']}'.  id = {result.inserted_id}")

    print("\nCopy the desired id into detect.py as PARKING_LOT_ID.")
    client.close()


asyncio.run(seed())
