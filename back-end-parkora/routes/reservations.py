"""
routes/reservations.py
──────────────────────
Gestion complète des réservations d'emplacements.

Endpoints :
  POST   /reservations                        → créer une réservation (JWT)
  GET    /reservations/me                     → historique utilisateur (JWT)
  GET    /reservations/check                  → vérifier disponibilité d'un slot
  DELETE /reservations/{id}                   → annuler une réservation (JWT)
  GET    /reservations/active/{lot_id}        → réservations actives d'un lot
                                                (pour minimap + choix de place)

Structure d'un document réservation dans MongoDB :
  {
    user_id        : str  (ObjectId de l'utilisateur)
    lot_id         : str  (ObjectId du parking)
    spot_id        : int  (numéro de l'emplacement, ex: 3)
    date           : str  (YYYY-MM-DD)
    start_time     : str  (HH:MM)
    end_time       : str  (HH:MM)
    duration_min   : int  (calculé)
    total_price    : int  (DA, calculé)
    status         : str  "confirmed" | "cancelled" | "completed"
    payment_method : str  "cib"
    created_at     : str  (ISO datetime)
  }
"""

from datetime import datetime, date, time
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from pydantic import BaseModel

from database import get_database
from routes.auth import get_current_user

router = APIRouter(prefix="/reservations", tags=["reservations"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_hm(t: str) -> time:
    """Parse 'HH:MM' into a time object."""
    h, m = map(int, t.split(":"))
    return time(h, m)


def _duration_minutes(start: str, end: str) -> int:
    """Return the number of minutes between two 'HH:MM' strings."""
    s = _parse_hm(start)
    e = _parse_hm(end)
    return (e.hour * 60 + e.minute) - (s.hour * 60 + s.minute)


def _fmt_reservation(r: dict) -> dict:
    """Convert a MongoDB reservation document to a JSON-serialisable dict."""
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


async def _is_spot_taken(
    db,
    lot_id: str,
    spot_id: int,
    date_str: str,
    start: str,
    end: str,
    exclude_id: str = None,   # ignore this reservation id (for update flows)
) -> bool:
    """
    Return True if the spot is already reserved for an overlapping time window
    on the given date.

    Two windows [A_start, A_end) and [B_start, B_end) overlap when:
        A_start < B_end  AND  A_end > B_start
    """
    query = {
        "lot_id":   lot_id,
        "spot_id":  spot_id,
        "date":     date_str,
        "status":   "confirmed",
        # Overlap condition expressed in MongoDB query operators:
        # existing.start_time < requested end  AND  existing.end_time > requested start
        "start_time": {"$lt": end},
        "end_time":   {"$gt": start},
    }
    if exclude_id:
        query["_id"] = {"$ne": ObjectId(exclude_id)}

    conflict = await db.reservations.find_one(query)
    return conflict is not None


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class CreateReservationBody(BaseModel):
    lot_id:         str
    lot_name:       str          # denormalised for display in history
    spot_id:        int
    date:           str          # YYYY-MM-DD
    start_time:     str          # HH:MM
    end_time:       str          # HH:MM
    payment_method: str = "cib"


# ── POST /reservations ────────────────────────────────────────────────────────

@router.post("/", status_code=201)
async def create_reservation(
    body: CreateReservationBody,
    user: dict = Depends(get_current_user),
):
    """
    Create a new reservation after validating:
      1. end_time > start_time
      2. date is not in the past
      3. the spot is not already reserved for an overlapping window
    """
    db = get_database()

    # ── Validate time order ───────────────────────────────────────────────────
    duration = _duration_minutes(body.start_time, body.end_time)
    if duration <= 0:
        raise HTTPException(
            status_code=400,
            detail="L'heure de fin doit être après l'heure de début.",
        )

    # ── Validate date is not in the past ──────────────────────────────────────
    try:
        res_date = date.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide (YYYY-MM-DD).")

    if res_date < date.today():
        raise HTTPException(status_code=400, detail="Impossible de réserver dans le passé.")

    # ── Check for conflicts ───────────────────────────────────────────────────
    taken = await _is_spot_taken(
        db, body.lot_id, body.spot_id, body.date, body.start_time, body.end_time
    )
    if taken:
        raise HTTPException(
            status_code=409,
            detail="Cet emplacement est déjà réservé sur ce créneau.",
        )

    # ── Fetch price_per_hour from parking lot ─────────────────────────────────
    try:
        lot_oid = ObjectId(body.lot_id)
    except Exception:
        raise HTTPException(status_code=400, detail="lot_id invalide.")

    lot = await db.parking_lots.find_one({"_id": lot_oid})
    if not lot:
        raise HTTPException(status_code=404, detail="Parking introuvable.")

    price_per_hour = lot.get("price_per_hour", 0)
    total_price    = int(round((duration / 60) * price_per_hour))

    # ── Build & insert document ───────────────────────────────────────────────
    doc = {
        "user_id":        str(user["_id"]),
        "lot_id":         body.lot_id,
        "lot_name":       body.lot_name,
        "spot_id":        body.spot_id,
        "date":           body.date,
        "start_time":     body.start_time,
        "end_time":       body.end_time,
        "duration_min":   duration,
        "total_price":    total_price,
        "status":         "confirmed",
        "payment_method": body.payment_method,
        "created_at":     datetime.utcnow().isoformat(),
    }

    result    = await db.reservations.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _fmt_reservation(doc)


# ── GET /reservations/me ──────────────────────────────────────────────────────

@router.get("/me")
async def my_reservations(user: dict = Depends(get_current_user)):
    """
    Return all reservations for the authenticated user,
    sorted by date desc then start_time desc (most recent first).
    """
    db = get_database()
    cursor = (
        db.reservations.find({"user_id": str(user["_id"])})
        .sort([("date", -1), ("start_time", -1)])
        .limit(100)
    )
    reservations = await cursor.to_list(100)
    return [_fmt_reservation(r) for r in reservations]


# ── GET /reservations/check ───────────────────────────────────────────────────

@router.get("/check")
async def check_availability(
    lot_id:   str = Query(...),
    spot_id:  int = Query(...),
    date:     str = Query(...),
    start:    str = Query(...),
    end:      str = Query(...),
):
    """
    Public endpoint — no JWT required.
    Returns { available: true } or { available: false, message: "..." }.
    Called from the reservation form before proceeding to payment.
    """
    db    = get_database()
    taken = await _is_spot_taken(db, lot_id, spot_id, date, start, end)
    if taken:
        return {
            "available": False,
            "message":   "Cet emplacement est déjà réservé sur ce créneau.",
        }
    return {"available": True}


# ── DELETE /reservations/{id} ─────────────────────────────────────────────────

@router.delete("/{reservation_id}")
async def cancel_reservation(
    reservation_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Cancel a reservation.
    Only the owner can cancel their own reservation.
    Only 'confirmed' reservations can be cancelled.
    """
    db = get_database()

    try:
        oid = ObjectId(reservation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="reservation_id invalide.")

    reservation = await db.reservations.find_one({"_id": oid})

    if not reservation:
        raise HTTPException(status_code=404, detail="Réservation introuvable.")

    if reservation["user_id"] != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Vous n'êtes pas propriétaire de cette réservation.")

    if reservation["status"] != "confirmed":
        raise HTTPException(
            status_code=400,
            detail=f"Impossible d'annuler une réservation avec le statut '{reservation['status']}'.",
        )

    await db.reservations.update_one({"_id": oid}, {"$set": {"status": "cancelled"}})
    return {"status": "cancelled", "id": reservation_id}


# ── GET /reservations/active/{lot_id} ────────────────────────────────────────

@router.get("/active/{lot_id}")
async def active_reservations(lot_id: str):
    """
    Public endpoint — no JWT required.

    Returns all CONFIRMED reservations for a given parking lot
    that overlap with RIGHT NOW (current date + current time).

    Used by:
      • minimap.tsx  → to mark a spot orange when the client is absent
      • reservation-spot.tsx → to mark spots as already taken (red/locked)

    Each item: { spot_id, start_time, end_time, date }
    """
    db  = get_database()
    now = datetime.utcnow()

    today_str    = now.strftime("%Y-%m-%d")
    current_time = now.strftime("%H:%M")

    cursor = db.reservations.find({
        "lot_id":     lot_id,
        "status":     "confirmed",
        "date":       today_str,
        # Reservation window contains current time:
        # start_time <= now  AND  end_time > now
        "start_time": {"$lte": current_time},
        "end_time":   {"$gt":  current_time},
    })
    reservations = await cursor.to_list(200)

    return [
        {
            "spot_id":    r["spot_id"],
            "start_time": r["start_time"],
            "end_time":   r["end_time"],
            "date":       r["date"],
        }
        for r in reservations
    ]


# ── GET /reservations/future/{lot_id} ────────────────────────────────────────

@router.get("/future/{lot_id}")
async def future_reservations_for_lot(
    lot_id: str,
    date:   str = Query(..., description="YYYY-MM-DD"),
    start:  str = Query(..., description="HH:MM"),
    end:    str = Query(..., description="HH:MM"),
):
    """
    Public endpoint.

    Returns all confirmed spot_ids that are already reserved
    for the requested date + time window.

    Used by reservation-spot.tsx to know which spots to lock (red).
    """
    db = get_database()

    cursor = db.reservations.find({
        "lot_id":     lot_id,
        "status":     "confirmed",
        "date":       date,
        "start_time": {"$lt": end},
        "end_time":   {"$gt": start},
    })
    reservations = await cursor.to_list(200)

    return {"taken_spots": [r["spot_id"] for r in reservations]}
