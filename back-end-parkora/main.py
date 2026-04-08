from contextlib import asynccontextmanager
from fastapi import FastAPI

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

app.include_router(spots_router)
app.include_router(parking_lots_router)


@app.get("/")
def health_check():
    return {"message": "Parkora backend is running"}
