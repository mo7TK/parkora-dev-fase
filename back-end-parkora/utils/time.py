"""
utils/time.py
──────────────
Le serveur tourne en UTC, mais toutes les dates/heures saisies dans l'app
(date, start_time, end_time des réservations) sont des heures locales
Algérie (UTC+1 — pas d'heure d'été depuis 1981).

Comparer ces champs avec datetime.now(timezone.utc) décale tout d'1 heure,
et peut même décaler la "date du jour" entre 00h et 1h du matin (heure locale).

now_local() doit être utilisé partout où on compare l'heure actuelle aux
champs date / start_time / end_time d'une réservation.
"""

from datetime import datetime, timedelta, timezone

ALGERIA_TZ = timezone(timedelta(hours=1))


def now_local() -> datetime:
    return datetime.now(ALGERIA_TZ)
