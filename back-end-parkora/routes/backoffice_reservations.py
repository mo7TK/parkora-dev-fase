"""
routes/backoffice_reservations.py
"""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from database import get_database
from utils.backoffice_security import get_current_manager

router = APIRouter(
    prefix="/backoffice/manager",
    tags=["backoffice-reservations"],
)


def _fmt(r: dict, user: dict = None) -> dict:
    first = user.get("first_name", "") if user else ""
    last  = user.get("last_name",  "") if user else ""
    return {
        "id":                  str(r["_id"]),
        "user_id":             r.get("user_id", ""),
        "user_name":           f"{first} {last}".strip() if user else "Client inconnu",
        "user_plate":          user.get("plate", "")  if user else "",
        "user_phone":          user.get("phone", "")  if user else "",
        "user_email":          user.get("email", "")  if user else "",
        "lot_id":              r.get("lot_id", ""),
        "lot_name":            r.get("lot_name", ""),
        "spot_id":             r.get("spot_id"),
        "date":                r.get("date", ""),
        "start_time":          r.get("start_time", ""),
        "end_time":            r.get("end_time", ""),
        "duration_min":        r.get("duration_min", 0),
        "total_price":         r.get("total_price", 0),
        "status":              r.get("status", "confirmed"),
        "payment_method":      r.get("payment_method", "cib"),
        "created_at":          r.get("created_at", ""),
        # Motif d'annulation (None si non annulée ou pas de motif)
        "cancellation_reason": r.get("cancellation_reason"),
        "cancelled_at":        r.get("cancelled_at"),
        "cancelled_by":        r.get("cancelled_by"),
    }


async def _enrich(db, reservations: list[dict]) -> list[dict]:
    user_ids = list({r.get("user_id") for r in reservations if r.get("user_id")})
    users: dict = {}
    if user_ids:
        valid_oids = [ObjectId(uid) for uid in user_ids if ObjectId.is_valid(uid)]
        async for u in db.users.find({"_id": {"$in": valid_oids}}):
            users[str(u["_id"])] = u
    return [_fmt(r, users.get(r.get("user_id", ""))) for r in reservations]


async def _get_assigned_lot_id(manager: dict) -> str:
    lot_id = manager.get("assigned_lot_id")
    if not lot_id or not ObjectId.is_valid(lot_id):
        raise HTTPException(status_code=404, detail="Aucun parking assigné à ce compte.")
    return lot_id


@router.get("/reservations")
async def list_reservations(
    status: str = Query(default=None),
    date:   str = Query(default=None),
    manager: dict = Depends(get_current_manager),
):
    db     = get_database()
    lot_id = await _get_assigned_lot_id(manager)

    query: dict = {"lot_id": lot_id}
    if status and status in ("confirmed", "cancelled", "completed"):
        query["status"] = status
    if date:
        query["date"] = date

    reservations = await (
        db.reservations
        .find(query)
        .sort([("date", -1), ("start_time", -1)])
        .limit(500)
        .to_list(500)
    )
    return await _enrich(db, reservations)


@router.get("/reservations/today")
async def today_reservations(manager: dict = Depends(get_current_manager)):
    db     = get_database()
    lot_id = await _get_assigned_lot_id(manager)
    today  = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    reservations = await (
        db.reservations
        .find({"lot_id": lot_id, "status": "confirmed", "date": today})
        .sort("start_time", 1)
        .limit(200)
        .to_list(200)
    )
    enriched = await _enrich(db, reservations)
    return {"date": today, "total": len(enriched), "reservations": enriched}


# ── Schéma d'annulation avec motif optionnel ─────────────────────────────────

class CancelReservationBody(BaseModel):
    reason: Optional[str] = None   # motif d'annulation (optionnel)


@router.delete("/reservations/{reservation_id}")
async def cancel_reservation(
    reservation_id: str,
    body: CancelReservationBody = CancelReservationBody(),
    manager: dict = Depends(get_current_manager),
):
    """
    Annule une réservation confirmée.
    Accepte un body JSON optionnel avec un champ `reason` pour le motif.
    Le motif est stocké dans la réservation et visible par le client.
    """
    db     = get_database()
    lot_id = await _get_assigned_lot_id(manager)

    if not ObjectId.is_valid(reservation_id):
        raise HTTPException(status_code=400, detail="reservation_id invalide.")

    reservation = await db.reservations.find_one({"_id": ObjectId(reservation_id)})
    if not reservation:
        raise HTTPException(status_code=404, detail="Réservation introuvable.")
    if reservation.get("lot_id") != lot_id:
        raise HTTPException(status_code=403, detail="Cette réservation n'appartient pas à votre parking.")
    if reservation.get("status") != "confirmed":
        raise HTTPException(
            status_code=400,
            detail=f"Impossible d'annuler une réservation avec le statut '{reservation['status']}'.",
        )

    # Construire les champs à mettre à jour
    updates: dict = {
        "status":       "cancelled",
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
        "cancelled_by": "manager",   # distinguer annulation manager vs client
    }

    # Ajouter le motif seulement s'il est fourni et non vide
    reason = (body.reason or "").strip()
    if reason:
        updates["cancellation_reason"] = reason

    await db.reservations.update_one(
        {"_id": ObjectId(reservation_id)},
        {"$set": updates},
    )

    return {
        "status":              "cancelled",
        "id":                  reservation_id,
        "cancellation_reason": updates.get("cancellation_reason"),
    }