"""
routes/stream.py
─────────────────
Streaming vidéo MJPEG pour le backoffice.

detect.py pousse des frames JPEG via POST /stream/push/{lot_id}.
Le navigateur lit le flux via GET /stream/video/{lot_id}
(balise <img src="..."> — même protocole que les caméras IP).

Sécurité :
  - Le push est protégé par X-Secret-Key (même clé que /update-spots)
  - La lecture est accessible uniquement avec un JWT backoffice valide
    passé en query param : /stream/video/{lot_id}?token=<jwt>
    (les balises <img> ne supportent pas les headers custom)

Architecture :
  - Chaque lot_id a son dernier frame stocké en mémoire (bytes)
  - Le GET /stream/video génère un flux MJPEG infini :
    il attend chaque nouveau frame et l'envoie au client
  - asyncio.Event() coordonne le push et les lecteurs
"""

import asyncio
import os
from collections import defaultdict

from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from utils.backoffice_security import decode_backoffice_token

router = APIRouter(prefix="/stream", tags=["stream"])

INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "dev-secret-change-me")

# ── État en mémoire ───────────────────────────────────────────────────────────
# latest_frame[lot_id]  → bytes du dernier JPEG reçu
# frame_event[lot_id]   → asyncio.Event déclenché à chaque nouveau frame

latest_frame: dict[str, bytes] = {}
frame_event: dict[str, asyncio.Event] = defaultdict(asyncio.Event)


# ── POST /stream/push/{lot_id} ────────────────────────────────────────────────

@router.post("/push/{lot_id}", status_code=204)
async def push_frame(
    lot_id: str,
    request: Request,
    x_secret_key: str = Header(default=None),
):
    """
    Reçoit un frame JPEG brut envoyé par detect.py.
    Le corps de la requête doit être le JPEG encodé en bytes (Content-Type: image/jpeg).
    """
    if x_secret_key != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    frame_bytes = await request.body()
    if not frame_bytes:
        raise HTTPException(status_code=400, detail="Empty frame")

    latest_frame[lot_id] = frame_bytes

    # Réveiller tous les lecteurs en attente de ce lot
    frame_event[lot_id].set()
    frame_event[lot_id].clear()


# ── GET /stream/video/{lot_id} ────────────────────────────────────────────────

@router.get("/video/{lot_id}")
async def video_stream(
    lot_id: str,
    token: str = Query(..., description="JWT backoffice (admin ou manager)"),
):
    """
    Flux MJPEG en continu.
    Authentification via ?token=<jwt> (les balises <img> n'ont pas de headers).
    """
    # ── Vérification JWT ──────────────────────────────────────────────────────
    payload = decode_backoffice_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré.")

    # ── Vérification que c'est le bon parking (gestionnaire uniquement) ───────
    if payload.get("role") == "manager":
        assigned = payload.get("assigned_lot_id")
        if assigned and assigned != lot_id:
            raise HTTPException(
                status_code=403,
                detail="Accès interdit : ce n'est pas votre parking.",
            )

    async def generate():
        boundary = b"--frame"
        while True:
            # Attendre un nouveau frame (avec timeout pour garder la connexion vivante)
            event = frame_event[lot_id]
            try:
                await asyncio.wait_for(event.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                # Envoyer le dernier frame connu si dispo, sinon continuer d'attendre
                if lot_id not in latest_frame:
                    continue

            frame = latest_frame.get(lot_id)
            if not frame:
                continue

            yield (
                boundary
                + b"\r\nContent-Type: image/jpeg\r\n"
                + f"Content-Length: {len(frame)}\r\n\r\n".encode()
                + frame
                + b"\r\n"
            )

    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Connection": "keep-alive",
        },
    )
