"""
routes/spots.py
───────────────
Gestion du statut temps-réel des emplacements.

Changement Phase 1 :
  /update-spots fusionne maintenant l'état caméra (free/occupied)
  avec les réservations actives MongoDB.

  Règle :
    - spot "free" côté caméra + réservation active en cours
      ET client absent → statut broadcasté = "reserved" (orange)
    - sinon statut normal ("free" ou "occupied")
"""

import json
import os
from datetime import datetime

from fastapi import APIRouter, HTTPException, Header, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from database import get_database
from socket_manager import manager

router = APIRouter()

INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "dev-secret-change-me")

# In-memory state { lot_id: { "spots": [ {id, status}, ... ] } }
latest_state: dict = {}


class SpotStatus(BaseModel):
    id: int
    status: str  # "free" | "occupied"


class SpotsUpdate(BaseModel):
    lot_id: str
    spots: list[SpotStatus]


async def _merge_reservations(lot_id: str, spots: list[dict]) -> list[dict]:
    """
    For each spot that the camera reports as "free", check if there is an
    active confirmed reservation right now. If yes → mark as "reserved".

    A reservation is "active right now" when:
      date == today  AND  start_time <= now  AND  end_time > now
    """
    db  = get_database()
    now = datetime.utcnow()

    today_str    = now.strftime("%Y-%m-%d")
    current_time = now.strftime("%H:%M")

    # Fetch all active reservations for this lot in one query
    cursor = db.reservations.find({
        "lot_id":     lot_id,
        "status":     "confirmed",
        "date":       today_str,
        "start_time": {"$lte": current_time},
        "end_time":   {"$gt":  current_time},
    })
    active = await cursor.to_list(200)
    reserved_spot_ids = {r["spot_id"] for r in active}

    merged = []
    for spot in spots:
        if spot["status"] == "free" and spot["id"] in reserved_spot_ids:
            merged.append({"id": spot["id"], "status": "reserved"})
        else:
            merged.append(spot)
    return merged


@router.get("/spots-summary/{lot_id}")
def spots_summary(lot_id: str):
    """
    Returns free / occupied / reserved counts for a parking lot.
    Called by the mobile Details screen on load.
    Public — no token required.
    """
    state = latest_state.get(lot_id, {"spots": []})
    spots = state["spots"]
    free     = sum(1 for s in spots if s["status"] == "free")
    occupied = sum(1 for s in spots if s["status"] == "occupied")
    reserved = sum(1 for s in spots if s["status"] == "reserved")
    return {
        "total":    len(spots),
        "free":     free,
        "occupied": occupied,
        "reserved": reserved,
    }


@router.post("/update-spots")
async def update_spots(
    data: SpotsUpdate,
    x_secret_key: str = Header(default=None),
):
    """
    Called only by detect.py.
    Protected by a shared secret in X-Secret-Key header.
    Merges camera state with active reservations before broadcasting.
    """
    if x_secret_key != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    raw_spots = [spot.dict() for spot in data.spots]

    # Fuse with DB reservations
    merged_spots = await _merge_reservations(data.lot_id, raw_spots)

    latest_state[data.lot_id] = {"spots": merged_spots}

    await manager.broadcast_to_lot(
        data.lot_id,
        json.dumps(latest_state[data.lot_id]),
    )

    return {
        "received":         len(data.spots),
        "clients_notified": len(manager.active_connections.get(data.lot_id, [])),
    }


@router.websocket("/ws/{lot_id}")
async def websocket_endpoint(websocket: WebSocket, lot_id: str):
    """
    One WebSocket channel per lot.
    Sends current state immediately on connect.
    """
    await manager.connect(lot_id, websocket)

    if lot_id in latest_state and latest_state[lot_id]["spots"]:
        await websocket.send_text(json.dumps(latest_state[lot_id]))

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(lot_id, websocket)