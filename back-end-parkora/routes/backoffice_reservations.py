"""
routes/backoffice_reservations.py
───────────────────────────────────
Gestion des réservations pour le gestionnaire de parking.
Protégé par get_current_manager.

Endpoints :
  GET    /backoffice/manager/reservations              → toutes les réservations du lot
  GET    /backoffice/manager/reservations/today        → réservations d'aujourd'hui
  DELETE /backoffice/manager/reservations/{id}         → annuler une réservation

Sécurité :
  Le gestionnaire ne voit que les réservations de son parking assigné.
  assigned_lot_id est vérifié en DB à chaque requête.
"""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from database import get_database
from utils.backoffice_security import get_current_manager

router = APIRouter(
    prefix="/backoffice/manager",
    tags=["backoffice-reservations"],
)


# ── Sérialiseur ───────────────────────────────────────────────────────────────

def _fmt(r: dict) -> dict:
    return {
        "id":             str(r["_id"]),
        "user_id":        r.get("user_id", ""),
        "lot_id":         r.get("lot_id", ""),
        "lot_name":       r.get("lot_name", ""),
        "spot_id":        r.get("spot_id"),
        "date":           r.get("date", ""),
        "start_time":     r.get("start_time", ""),
        "end_time":       r.get("end_time", ""),
        "duration_min":   r.get("duration_min", 0),
        "total_price":    r.get("total_price", 0),
        "status":         r.get("status", "confirmed"),
        "payment_method": r.get("payment_method", "cib"),
        "created_at":     r.get("created_at", ""),
    }


async def _get_assigned_lot_id(manager: dict) -> str:
    """
    Récupère le lot_id assigné depuis le document manager en DB.
    Lève 404 si non configuré.
    """
    lot_id = manager.get("assigned_lot_id")
    if not lot_id or not ObjectId.is_valid(lot_id):
        raise HTTPException(
            status_code=404,
            detail="Aucun parking assigné à ce compte.",
        )
    return lot_id


# ── GET /backoffice/manager/reservations ─────────────────────────────────────

@router.get("/reservations")
async def list_reservations(
    status: str = Query(default=None, description="Filtrer par statut : confirmed | cancelled | completed"),
    date:   str = Query(default=None, description="Filtrer par date YYYY-MM-DD"),
    manager: dict = Depends(get_current_manager),
):
    """
    Retourne toutes les réservations du parking assigné.
    Filtres optionnels : status et/ou date.
    Triées par date desc puis heure de début desc (plus récentes en premier).
    """
    db     = get_database()
    lot_id = await _get_assigned_lot_id(manager)

    query: dict = {"lot_id": lot_id}

    if status and status in ("confirmed", "cancelled", "completed"):
        query["status"] = status

    if date:
        query["date"] = date

    cursor = (
        db.reservations
        .find(query)
        .sort([("date", -1), ("start_time", -1)])
        .limit(500)
    )
    reservations = await cursor.to_list(500)

    return [_fmt(r) for r in reservations]


# ── GET /backoffice/manager/reservations/today ────────────────────────────────

@router.get("/reservations/today")
async def today_reservations(manager: dict = Depends(get_current_manager)):
    """
    Retourne uniquement les réservations confirmées d'aujourd'hui.
    Utile pour le dashboard du gestionnaire (planning du jour).
    """
    db     = get_database()
    lot_id = await _get_assigned_lot_id(manager)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    cursor = (
        db.reservations
        .find({
            "lot_id": lot_id,
            "status": "confirmed",
            "date":   today,
        })
        .sort("start_time", 1)   # ordre chronologique
        .limit(200)
    )
    reservations = await cursor.to_list(200)

    return {
        "date":         today,
        "total":        len(reservations),
        "reservations": [_fmt(r) for r in reservations],
    }


# ── DELETE /backoffice/manager/reservations/{id} ──────────────────────────────

@router.delete("/reservations/{reservation_id}")
async def cancel_reservation(
    reservation_id: str,
    manager: dict = Depends(get_current_manager),
):
    """
    Annule une réservation confirmée du parking du gestionnaire.

    Le gestionnaire ne peut annuler que les réservations de son propre parking.
    Seules les réservations au statut "confirmed" peuvent être annulées.
    """
    db     = get_database()
    lot_id = await _get_assigned_lot_id(manager)

    if not ObjectId.is_valid(reservation_id):
        raise HTTPException(status_code=400, detail="reservation_id invalide.")

    reservation = await db.reservations.find_one({"_id": ObjectId(reservation_id)})

    if not reservation:
        raise HTTPException(status_code=404, detail="Réservation introuvable.")

    # Vérification que la réservation appartient bien au parking du gestionnaire
    if reservation.get("lot_id") != lot_id:
        raise HTTPException(
            status_code=403,
            detail="Cette réservation n'appartient pas à votre parking.",
        )

    if reservation.get("status") != "confirmed":
        raise HTTPException(
            status_code=400,
            detail=f"Impossible d'annuler une réservation avec le statut '{reservation['status']}'.",
        )

    await db.reservations.update_one(
        {"_id": ObjectId(reservation_id)},
        {"$set": {"status": "cancelled"}},
    )

    return {
        "status": "cancelled",
        "id":     reservation_id,
    }
