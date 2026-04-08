import json
import os

from fastapi import APIRouter, HTTPException, Header, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from socket_manager import manager

router = APIRouter()

# ── Internal secret key ───────────────────────────────────────────────────────
# detect.py must send this in the X-Secret-Key header when POSTing to /update-spots.
# Set the INTERNAL_SECRET env variable in your .env file.
# Default value is only for local dev — change it before any real deployment.
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "dev-secret-change-me")
# ─────────────────────────────────────────────────────────────────────────────

# ── In-memory state (per lot) ─────────────────────────────────────────────────
# Structure: { "lot_id": {"spots": [{"id": 1, "status": "free"}, ...]} }
# This dict lives in memory. It resets on server restart.
# detect.py repopulates it within 1 second of reconnecting, so that is fine.
latest_state: dict = {}
# ─────────────────────────────────────────────────────────────────────────────


class SpotStatus(BaseModel):
    id: int
    status: str  # "free" or "occupied"


class SpotsUpdate(BaseModel):
    lot_id: str          # which parking lot is sending this update
    spots: list[SpotStatus]


@router.get("/spots-summary/{lot_id}")
def spots_summary(lot_id: str):
    """
    Returns free/occupied counts for a specific parking lot.
    Called by the mobile Details screen on load.
    Public — no token required.
    """
    state = latest_state.get(lot_id, {"spots": []})
    spots = state["spots"]
    free     = sum(1 for s in spots if s["status"] == "free")
    occupied = sum(1 for s in spots if s["status"] == "occupied")
    return {
        "total":    len(spots),
        "free":     free,
        "occupied": occupied,
    }


@router.post("/update-spots")
async def update_spots(
    data: SpotsUpdate,
    x_secret_key: str = Header(default=None),
):
    """
    Called only by detect.py.
    Protected by a shared secret key sent in the X-Secret-Key header.
    Rejects any request that doesn't know the secret.
    """
    if x_secret_key != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    latest_state[data.lot_id] = {
        "spots": [spot.dict() for spot in data.spots]
    }

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
    Mobile connects to /ws/<lot_id> and only receives updates for that lot.
    On connect, immediately sends the current state if one exists.
    """
    await manager.connect(lot_id, websocket)

    # Send the current state immediately so the client doesn't wait for
    # the next detect.py POST to see something.
    if lot_id in latest_state and latest_state[lot_id]["spots"]:
        await websocket.send_text(json.dumps(latest_state[lot_id]))

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(lot_id, websocket)
