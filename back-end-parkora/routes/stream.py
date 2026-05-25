"""
routes/stream.py
─────────────────
Streaming vidéo MJPEG par parking.

Endpoints :
  POST /push-frame/{lot_id}   → reçoit une frame JPEG encodée en bytes
                                depuis detect.py (protégé par X-Secret-Key)
  GET  /stream/{lot_id}       → sert le flux MJPEG au navigateur (public)
                                utilisable directement dans <img src="...">

Fonctionnement :
  detect.py  ──POST /push-frame──►  buffer en mémoire  ──GET /stream──►  navigateur
                (frame JPEG bytes)    (1 frame par lot)   (multipart)

Sécurité :
  - /push-frame vérifie X-Secret-Key == INTERNAL_SECRET (lu depuis .env)
  - /stream est public (nécessaire pour <img>, pas de données sensibles)

Format MJPEG :
  Content-Type: multipart/x-mixed-replace; boundary=frame
  Chaque partie : --frame\r\nContent-Type: image/jpeg\r\n\r\n<bytes>\r\n
"""

import asyncio
import os
from typing import AsyncGenerator

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

load_dotenv()

INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "parkora-dev-secret")

router = APIRouter(tags=["stream"])

# ── Buffer en mémoire ─────────────────────────────────────────────────────────
# { lot_id: bytes }  — stocke la dernière frame JPEG reçue par lot
latest_frame: dict[str, bytes] = {}

# ── Events asyncio ────────────────────────────────────────────────────────────
# Permet de notifier les générateurs /stream dès qu'une nouvelle frame arrive
# sans polling actif (économise le CPU).
frame_events: dict[str, asyncio.Event] = {}


def _get_event(lot_id: str) -> asyncio.Event:
    """Retourne (ou crée) l'Event asyncio associé à un lot."""
    if lot_id not in frame_events:
        frame_events[lot_id] = asyncio.Event()
    return frame_events[lot_id]


# ── POST /push-frame/{lot_id} ─────────────────────────────────────────────────

@router.post("/push-frame/{lot_id}", status_code=204)
async def push_frame(
    lot_id: str,
    request: Request,
    x_secret_key: str = Header(default=None),
):
    """
    Reçoit une frame JPEG brute depuis detect.py.

    Body : application/octet-stream — les bytes JPEG directement.
    Header requis : X-Secret-Key: <INTERNAL_SECRET>

    Retourne 204 No Content en cas de succès.
    """
    if x_secret_key != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    frame_bytes = await request.body()
    if not frame_bytes:
        raise HTTPException(status_code=400, detail="Empty frame")

    # Stocker la frame et notifier tous les streams en attente
    latest_frame[lot_id] = frame_bytes
    event = _get_event(lot_id)
    event.set()
    event.clear()  # reset immédiatement pour la prochaine frame


# ── GET /stream/{lot_id} ──────────────────────────────────────────────────────

@router.get("/stream/{lot_id}")
async def stream(lot_id: str):
    """
    Flux MJPEG en temps réel pour un parking.

    Public — aucun token requis.
    Utilisation dans le navigateur :
        <img src="http://<backend>/stream/<lot_id>" />

    Si aucune frame n'est disponible, envoie une image placeholder
    puis attend la première vraie frame.
    """
    return StreamingResponse(
        _frame_generator(lot_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            # Désactive le cache navigateur pour un vrai temps réel
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


async def _frame_generator(lot_id: str) -> AsyncGenerator[bytes, None]:
    """
    Générateur asynchrone qui pousse les frames MJPEG au navigateur.

    - Attend les nouvelles frames via asyncio.Event (pas de polling)
    - Timeout de 2 s pour envoyer quand même la dernière frame connue
      (évite que la connexion soit coupée par le navigateur si le flux
       est lent)
    - Si aucune frame n'est encore disponible, envoie le placeholder JPEG
    """
    BOUNDARY = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
    BOUNDARY_END = b"\r\n"
    TIMEOUT = 2.0  # secondes max d'attente entre deux frames

    event = _get_event(lot_id)

    while True:
        # Attendre une nouvelle frame ou timeout
        try:
            await asyncio.wait_for(
                asyncio.shield(asyncio.ensure_future(_wait_event(event))),
                timeout=TIMEOUT,
            )
        except asyncio.TimeoutError:
            pass
        except Exception:
            pass

        frame = latest_frame.get(lot_id)

        if frame is None:
            # Pas encore de frame — envoyer un placeholder noir 1x1 px
            frame = _placeholder_jpeg()

        yield BOUNDARY + frame + BOUNDARY_END

        # Petite pause pour ne pas saturer le CPU si les frames arrivent
        # très vite (le navigateur ne peut pas afficher plus que ~30 fps)
        await asyncio.sleep(0.033)  # ~30 fps max


async def _wait_event(event: asyncio.Event) -> None:
    """Coroutine simple qui attend qu'un Event soit déclenché."""
    await event.wait()


def _placeholder_jpeg() -> bytes:
    """
    Retourne un JPEG noir minimaliste (1×1 pixel).
    Affiché quand aucune frame n'est encore disponible.
    """
    # JPEG 1×1 noir valide — séquence bytes standardisée
    return bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00,
        0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB,
        0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07,
        0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B,
        0x0B, 0x0C, 0x19, 0x12, 0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E,
        0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C,
        0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34,
        0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
        0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01,
        0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05,
        0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01,
        0x03, 0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00,
        0x01, 0x7D, 0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21,
        0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32,
        0x81, 0x91, 0xA1, 0x08, 0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1,
        0xF0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0A, 0x16, 0x17, 0x18,
        0x19, 0x1A, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x34, 0x35, 0x36,
        0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
        0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x63, 0x64,
        0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75, 0x76, 0x77,
        0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A,
        0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5,
        0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7,
        0xC8, 0xC9, 0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9,
        0xDA, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA,
        0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF,
        0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD2,
        0x8A, 0x28, 0x03, 0xFF, 0xD9,
    ])
