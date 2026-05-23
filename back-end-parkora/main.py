"""
main.py
────────
Point d'entrée de l'application FastAPI.

  PUT    /backoffice/manager/password           → backoffice_manager_password
  POST   /stream/push/{lot_id}                  → stream  (detect.py → backend)
  GET    /stream/video/{lot_id}?token=<jwt>     → stream  (backend → navigateur)
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import connect_db, close_db

from routes.auth import router as auth_router
from routes.spots import router as spots_router
from routes.parking_lots import router as parking_lots_router
from routes.favorites import router as favorites_router
from routes.reservations import router as reservations_router

from routes.backoffice_admin_auth import router as backoffice_admin_auth_router
from routes.backoffice_manager_auth import router as backoffice_manager_auth_router

from routes.backoffice_managers import router as backoffice_managers_router
from routes.backoffice_parking_admin import router as backoffice_parking_admin_router
from routes.backoffice_parking_manager import router as backoffice_parking_manager_router
from routes.backoffice_clients import router as backoffice_clients_router
from routes.backoffice_reservations import router as backoffice_reservations_router
from routes.backoffice_manager_password import router as backoffice_manager_password_router
from routes.stream import router as stream_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ASSETS_DIR = Path(__file__).parent / "assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

app.include_router(auth_router)
app.include_router(spots_router)
app.include_router(parking_lots_router)
app.include_router(favorites_router)
app.include_router(reservations_router)

app.include_router(backoffice_admin_auth_router)
app.include_router(backoffice_manager_auth_router)

app.include_router(backoffice_managers_router)
app.include_router(backoffice_parking_admin_router)
app.include_router(backoffice_clients_router)
app.include_router(backoffice_parking_manager_router)
app.include_router(backoffice_reservations_router)
app.include_router(backoffice_manager_password_router)

app.include_router(stream_router)


@app.get("/")
def root():
    return {"status": "Parkora backend running"}