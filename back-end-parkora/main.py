"""
main.py
────────
Point d'entrée de l'application FastAPI.

Routers backoffice ajoutés (étapes 1 & 2) :
  POST   /backoffice/admin/login                → backoffice_admin_auth
  POST   /backoffice/manager/login              → backoffice_manager_auth
  GET    /backoffice/manager/me                 → backoffice_manager_auth

  GET    /backoffice/admin/managers             → backoffice_managers
  POST   /backoffice/admin/managers             → backoffice_managers
  GET    /backoffice/admin/managers/{id}        → backoffice_managers
  DELETE /backoffice/admin/managers/{id}        → backoffice_managers

  GET    /backoffice/admin/parkings             → backoffice_parking_admin
  POST   /backoffice/admin/parkings             → backoffice_parking_admin
  DELETE /backoffice/admin/parkings/{id}        → backoffice_parking_admin

  GET    /backoffice/manager/parking            → backoffice_parking_manager
  PUT    /backoffice/manager/parking            → backoffice_parking_manager

  GET    /backoffice/admin/clients              → backoffice_clients
  GET    /backoffice/admin/clients/{id}         → backoffice_clients
  DELETE /backoffice/admin/clients/{id}         → backoffice_clients

  GET    /backoffice/manager/reservations       → backoffice_reservations
  GET    /backoffice/manager/reservations/today → backoffice_reservations
  DELETE /backoffice/manager/reservations/{id}  → backoffice_reservations

  PUT    /backoffice/manager/password           → backoffice_manager_password
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import connect_db, close_db

# ── Routers app mobile ────────────────────────────────────────────────────────
from routes.auth import router as auth_router
from routes.spots import router as spots_router
from routes.parking_lots import router as parking_lots_router
from routes.favorites import router as favorites_router
from routes.reservations import router as reservations_router

# ── Routers backoffice — auth ─────────────────────────────────────────────────
from routes.backoffice_admin_auth import router as backoffice_admin_auth_router
from routes.backoffice_manager_auth import router as backoffice_manager_auth_router

# ── Routers backoffice — CRUD ─────────────────────────────────────────────────
from routes.backoffice_managers import router as backoffice_managers_router
from routes.backoffice_parking_admin import router as backoffice_parking_admin_router
from routes.backoffice_parking_manager import router as backoffice_parking_manager_router
from routes.backoffice_clients import router as backoffice_clients_router
from routes.backoffice_reservations import router as backoffice_reservations_router
from routes.backoffice_manager_password import router as backoffice_manager_password_router


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(lifespan=lifespan)


# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Fichiers statiques ────────────────────────────────────────────────────────

ASSETS_DIR = Path(__file__).parent / "assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


# ── Routers app mobile ────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(spots_router)
app.include_router(parking_lots_router)
app.include_router(favorites_router)
app.include_router(reservations_router)


# ── Routers backoffice ────────────────────────────────────────────────────────

# Auth
app.include_router(backoffice_admin_auth_router)
app.include_router(backoffice_manager_auth_router)

# Admin — CRUD
app.include_router(backoffice_managers_router)
app.include_router(backoffice_parking_admin_router)
app.include_router(backoffice_clients_router)

# Manager — lecture/modification de son parking + réservations + mot de passe
app.include_router(backoffice_parking_manager_router)
app.include_router(backoffice_reservations_router)
app.include_router(backoffice_manager_password_router)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Parkora backend running"}