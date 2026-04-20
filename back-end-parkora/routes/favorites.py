"""
routes/favorites.py
"""
from fastapi import APIRouter, Depends
from bson import ObjectId
from database import get_database
from routes.auth import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])


def serialize_lot(lot: dict) -> dict:
    lot["id"] = str(lot["_id"])
    del lot["_id"]
    return lot


@router.post("/{lot_id}")
async def add_favorite(lot_id: str, user: dict = Depends(get_current_user)):
    db = get_database()
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$addToSet": {"favorites": lot_id}},
    )
    return {"status": "added", "lot_id": lot_id}


@router.delete("/{lot_id}")
async def remove_favorite(lot_id: str, user: dict = Depends(get_current_user)):
    db = get_database()
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$pull": {"favorites": lot_id}},
    )
    return {"status": "removed", "lot_id": lot_id}


@router.get("/")
async def get_favorites(user: dict = Depends(get_current_user)):
    db = get_database()
    fav_ids = user.get("favorites", [])
    if not fav_ids:
        return []
    oids = [ObjectId(f) for f in fav_ids if ObjectId.is_valid(f)]
    lots = await db.parking_lots.find({"_id": {"$in": oids}}).to_list(100)
    return [serialize_lot(lot) for lot in lots]