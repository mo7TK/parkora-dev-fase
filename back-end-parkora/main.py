from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from database import connect_db, close_db
from routes.spots import router as spots_router
from routes.parking_lots import router as parking_lots_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan handler.
    Everything before `yield` runs on startup.
    Everything after `yield` runs on shutdown.
    This is the correct modern pattern — replaces the old @app.on_event decorators.
    """
    await connect_db()
    yield
    await close_db()


app = FastAPI(lifespan=lifespan)

# ── Static files ───────────────────────────────────────────────────────────────
# Serves everything inside the `assets/` folder next to main.py.
# Mobile app fetches images via:
#   GET /assets/images/entrance/parking_entrance_univ.jpg
#   GET /assets/images/minimaps/parking_map_epb.png
ASSETS_DIR = Path(__file__).parent / "assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)   # create if missing, never crashes
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
# ──────────────────────────────────────────────────────────────────────────────

app.include_router(spots_router)
app.include_router(parking_lots_router)


@app.get("/")
def health_check():
    return {"message": "Parkora backend is running"}