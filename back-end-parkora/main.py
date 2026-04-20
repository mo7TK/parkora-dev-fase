"""
main.py
────────
Point d'entrée de l'application FastAPI.

Responsabilités :
  • Connexion / déconnexion MongoDB via le gestionnaire de durée de vie (lifespan)
  • Montage des fichiers statiques (images des parkings)
  • Enregistrement de tous les routers (auth, spots, parking_lots)
  • Middleware CORS — indispensable pour que l'app Expo sur un téléphone
    physique puisse appeler le backend sur le même réseau Wi-Fi local
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import connect_db, close_db
from routes.auth import router as auth_router               # /auth/register  /auth/login  /auth/me
from routes.spots import router as spots_router             # /update-spots   /spots-summary  /ws
from routes.parking_lots import router as parking_lots_router   # /parking-lots


# ── Durée de vie de l'application ─────────────────────────────────────────────
# Tout ce qui est avant `yield` s'exécute au démarrage du serveur.
# Tout ce qui est après `yield` s'exécute à l'arrêt.
# C'est le pattern moderne FastAPI — remplace les anciens @app.on_event.

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()   # ouvre la connexion MongoDB
    yield
    await close_db()     # ferme la connexion proprement


app = FastAPI(lifespan=lifespan)


# ── Middleware CORS ────────────────────────────────────────────────────────────
# CORS (Cross-Origin Resource Sharing) est nécessaire parce que l'app Expo
# tourne sur un appareil mobile avec une adresse différente du serveur.
# Sans ça, les requêtes HTTP de l'app seraient bloquées par le navigateur/OS.
# En production : remplacer allow_origins=["*"] par le domaine exact de l'app.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # autorise toutes les origines (dev uniquement)
    allow_credentials=True,
    allow_methods=["*"],       # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],       # Authorization, Content-Type, X-Secret-Key, etc.
)


# ── Fichiers statiques ─────────────────────────────────────────────────────────
# Sert le dossier assets/ en HTTP sous le préfixe /assets.
# L'app mobile charge les images via :
#   GET /assets/images/entrance/parking_entrance_univ.jpg
#   GET /assets/images/minimaps/parking_map_epb.png
# mkdir(parents=True, exist_ok=True) crée le dossier s'il n'existe pas
# sans jamais faire crasher le serveur.

ASSETS_DIR = Path(__file__).parent / "assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


# ── Routers ────────────────────────────────────────────────────────────────────
# Chaque router est défini dans son propre fichier routes/*.py
# et regroupe les endpoints liés à un domaine fonctionnel.

app.include_router(auth_router)            # authentification utilisateurs
app.include_router(spots_router)           # statut des places en temps réel
app.include_router(parking_lots_router)    # informations des parkings


# ── Health check ──────────────────────────────────────────────────────────────
# Route simple pour vérifier que le serveur tourne.
# Utile pour les outils de monitoring ou juste pour tester avec le navigateur.

@app.get("/")
def root():
    return {"status": "Parkora backend running"}