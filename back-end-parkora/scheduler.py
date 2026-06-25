"""
scheduler.py
─────────────
Tâche de fond qui tourne toutes les minutes et passe automatiquement
les réservations dont l'heure de fin est dépassée de "confirmed" à "completed".

Condition pour marquer "completed" :
  status == "confirmed"
  AND date < aujourd'hui
  OR (date == aujourd'hui AND end_time <= heure actuelle)

Les comparaisons utilisent l'heure locale Algérie (now_local), car
date/start_time/end_time sont saisis en heure locale par l'app.

Intégré dans le lifespan de main.py via asyncio.create_task().
"""

import asyncio

from database import get_database
from utils.time import now_local

INTERVAL_SECONDS = 60  # vérifie toutes les 60 secondes


async def _mark_completed():
    """Passe en 'completed' toutes les réservations confirmées expirées."""
    db = get_database()
    now = now_local()
    today = now.strftime("%Y-%m-%d")
    current_time = now.strftime("%H:%M")

    result = await db.reservations.update_many(
        {
            "status": "confirmed",
            "$or": [
                # Réservations de jours passés
                {"date": {"$lt": today}},
                # Réservations d'aujourd'hui dont l'heure de fin est passée
                {
                    "date": today,
                    "end_time": {"$lte": current_time},
                },
            ],
        },
        {"$set": {"status": "completed"}},
    )

    if result.modified_count > 0:
        print(
            f"[Scheduler] {result.modified_count} réservation(s) marquée(s) 'completed' "
            f"à {now.strftime('%H:%M:%S')}"
        )


async def start_scheduler():
    """
    Boucle infinie lancée en arrière-plan dans le lifespan de FastAPI.
    S'exécute toutes les INTERVAL_SECONDS secondes.
    """
    print(f"[Scheduler] Démarré — vérifie toutes les {INTERVAL_SECONDS}s.")
    while True:
        try:
            await _mark_completed()
        except Exception as e:
            print(f"[Scheduler] Erreur : {e}")
        await asyncio.sleep(INTERVAL_SECONDS)