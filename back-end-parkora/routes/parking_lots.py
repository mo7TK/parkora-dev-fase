from fastapi import APIRouter, HTTPException
from bson import ObjectId

from database import get_database

router = APIRouter()


def serialize_lot(lot: dict) -> dict:
    """
    MongoDB documents have a BSON ObjectId as _id.
    JSON can't serialize ObjectId, so we convert it to a plain string
    and rename the key from _id to id for the mobile app.
    """
    lot["id"] = str(lot["_id"])
    del lot["_id"]
    return lot


@router.get("/parking-lots")
async def get_parking_lots():
    """
    Returns all parking lots.
    Called by the mobile Map screen to render pins on the map.
    Public — no token required.
    """
    db   = get_database()
    lots = await db.parking_lots.find().to_list(100)
    return [serialize_lot(lot) for lot in lots]


@router.get("/parking-lots/{lot_id}")
async def get_parking_lot(lot_id: str):
    """
    Returns a single parking lot by its MongoDB id.
    Public — no token required.
    """
    db = get_database()
    try:
        oid = ObjectId(lot_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid lot_id format")

    lot = await db.parking_lots.find_one({"_id": oid})
    if not lot:
        raise HTTPException(status_code=404, detail="Parking lot not found")

    return serialize_lot(lot)
