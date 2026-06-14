"""
routes/backoffice_stats.py
───────────────────────────
Statistiques mensuelles pour le dashboard gestionnaire.

Endpoint :
  GET /backoffice/manager/stats   → revenus + taux du mois courant
"""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from database import get_database
from utils.backoffice_security import get_current_manager

router = APIRouter(prefix="/backoffice/manager", tags=["backoffice-stats"])


async def _get_assigned_lot_id(manager: dict) -> str:
    lot_id = manager.get("assigned_lot_id")
    if not lot_id or not ObjectId.is_valid(lot_id):
        raise HTTPException(status_code=404, detail="Aucun parking assigné à ce compte.")
    return lot_id


@router.get("/stats")
async def get_stats(manager: dict = Depends(get_current_manager)):
    """
    Retourne pour le mois courant :
      - revenu_jour      : somme total_price des réservations confirmées/completed aujourd'hui
      - revenu_mois      : somme total_price de ce mois
      - taux_occupation  : moyenne journalière d'occupation (réservations confirmées/completed / total_spots)
      - taux_annulation  : cancelled / total * 100 sur ce mois
      - total_mois       : nombre total de réservations ce mois
      - cancelled_mois   : nombre d'annulées ce mois

    Les calculs se font uniquement sur les réservations du parking assigné.
    """
    db     = get_database()
    lot_id = await _get_assigned_lot_id(manager)

    now   = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")

    # Préfixe mois courant ex: "2025-06"
    month_prefix = now.strftime("%Y-%m")

    # ── Parking info (pour total_spots) ───────────────────────────────────────
    lot = await db.parking_lots.find_one({"_id": ObjectId(lot_id)})
    total_spots = lot.get("total_spots", 1) if lot else 1

    # ── Réservations du mois ─────────────────────────────────────────────────
    cursor = db.reservations.find({
        "lot_id": lot_id,
        "date":   {"$regex": f"^{month_prefix}"},
    })
    month_reservations = await cursor.to_list(2000)

    total_mois      = len(month_reservations)
    cancelled_mois  = sum(1 for r in month_reservations if r.get("status") == "cancelled")
    completed_mois  = sum(1 for r in month_reservations if r.get("status") == "completed")
    # confirmed = réservations futures/en cours non encore honorées ni annulées
    confirmed_mois  = sum(1 for r in month_reservations if r.get("status") == "confirmed")

    # Revenu du mois (confirmed + completed uniquement)
    revenu_mois = sum(
        r.get("total_price", 0)
        for r in month_reservations
        if r.get("status") in ("confirmed", "completed")
    )

    # ── Réservations d'aujourd'hui ────────────────────────────────────────────
    today_reservations = [r for r in month_reservations if r.get("date") == today]
    confirmed_jour = sum(1 for r in today_reservations if r.get("status") == "confirmed")
    completed_jour = sum(1 for r in today_reservations if r.get("status") == "completed")
    cancelled_jour = sum(1 for r in today_reservations if r.get("status") == "cancelled")
    total_jour     = len(today_reservations)
    revenu_jour = sum(
        r.get("total_price", 0)
        for r in today_reservations
        if r.get("status") in ("confirmed", "completed")
    )

    # ── Taux d'occupation du mois ─────────────────────────────────────────────
    # Nombre de réservations actives (confirmed + completed) / (jours écoulés * total_spots) * 100
    active_mois = confirmed_mois + completed_mois
    days_elapsed = now.day  # jours écoulés dans le mois
    max_reservations = days_elapsed * total_spots
    taux_occupation = round(
        (active_mois / max_reservations * 100) if max_reservations > 0 else 0,
        1,
    )
    taux_occupation = min(taux_occupation, 100.0)

    # ── Taux d'annulation ─────────────────────────────────────────────────────
    taux_annulation = round(
        (cancelled_mois / total_mois * 100) if total_mois > 0 else 0,
        1,
    )

    return {
        "revenu_jour":     revenu_jour,
        "revenu_mois":     revenu_mois,
        "taux_occupation": taux_occupation,
        "taux_annulation": taux_annulation,
        "total_mois":      total_mois,
        "confirmed_mois":  confirmed_mois,
        "completed_mois":  completed_mois,
        "cancelled_mois":  cancelled_mois,
        "total_jour":      total_jour,
        "confirmed_jour":  confirmed_jour,
        "completed_jour":  completed_jour,
        "cancelled_jour":  cancelled_jour,
        "month":           month_prefix,
        "today":           today,
    }