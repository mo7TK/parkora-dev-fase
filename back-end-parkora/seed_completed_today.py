"""
seed_cancelled_and_confirmed_today.py
────────────────────────────────────────
Insère un jeu de données réaliste pour aujourd'hui (2026-06-19) sur le
parking "Parking Centre Commercial Yemma Gouraya", avec des clients
aux noms algériens :

  • 4 réservations "cancelled"  → chacune avec un motif d'annulation
                                   (cancelled_by = "manager")
  • 6 réservations "confirmed"  → réservations programmées
                                   dont 2 sont EN COURS actuellement
                                   (il est 22:30 — créneaux qui chevauchent
                                   22:30, ex: 22:00→23:00)

Crée aussi les comptes clients correspondants (db.users) s'ils n'existent
pas encore — nécessaire pour que les noms apparaissent dans le backoffice
gestionnaire (qui enrichit les réservations via user_id → users).

S'assure également que le parking est bien configuré en "paid" à 100 DA/h
(sinon les statistiques de revenu ne s'affichent pas côté gestionnaire).

À exécuter UNE FOIS :
    python seed_cancelled_and_confirmed_today.py

Idempotent : relancer le script ne duplique pas les réservations déjà
créées (vérifie user_id + lot_id + date + start_time + spot_id).
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# ── Configuration ─────────────────────────────────────────────────────────────
MONGO_URL        = "mongodb://localhost:27017"
DB_NAME          = "parkora"
LOT_NAME         = "Parking Centre Commercial Yemma Gouraya"
TODAY            = "2026-06-19"
NOW_LOCAL_HM     = "22:30"   # heure actuelle (locale Algérie) simulée pour le seed
PRICE_PER_HOUR   = 100       # DA / heure
# ─────────────────────────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Noms algériens ────────────────────────────────────────────────────────────
FIRST_NAMES = [
    "Mohamed", "Ahmed", "Karim", "Yacine", "Riad", "Sofiane", "Walid", "Abdellah",
    "Bilal", "Nabil", "Rachid", "Samir", "Hamza", "Anis", "Adel", "Younes",
    "Lydia", "Amel", "Sara", "Nesrine", "Imane", "Yasmine", "Rania", "Sabrina",
    "Meriem", "Khadidja", "Asma", "Hayat", "Souad", "Lina",
]
LAST_NAMES = [
    "Benali", "Boudiaf", "Cherif", "Djebbar", "Hamdi", "Khelifi", "Mansouri",
    "Saidi", "Yahiaoui", "Zeroual", "Belkacem", "Bouzid", "Hadj", "Larbi",
    "Meziane", "Ouali", "Rahmani", "Slimani", "Tahar", "Ziani",
]

# ── Motifs d'annulation réalistes (saisis par le gestionnaire) ───────────────
CANCELLATION_REASONS = [
    "Fermeture exceptionnelle du parking",
    "Travaux de maintenance sur cette zone",
    "Problème technique avec la barrière d'accès",
    "Place réservée pour un évènement",
]

random.seed(7)  # résultats reproductibles entre deux exécutions

# ── Définition explicite des 10 réservations à insérer ────────────────────────
# status: "cancelled" ou "confirmed"
# Pour les "confirmed", deux créneaux chevauchent NOW_LOCAL_HM (22:30) afin
# d'apparaître comme "en cours" dans l'app cliente / backoffice.
RESERVATIONS_PLAN = [
    # ── 4 annulées, avec motif ────────────────────────────────────────────────
    {"status": "cancelled", "start": "10:00", "end": "11:00", "reason_idx": 0},
    {"status": "cancelled", "start": "13:30", "end": "14:30", "reason_idx": 1},
    {"status": "cancelled", "start": "16:00", "end": "17:00", "reason_idx": 2},
    {"status": "cancelled", "start": "18:15", "end": "19:15", "reason_idx": 3},

    # ── 6 confirmées / programmées ────────────────────────────────────────────
    # 2 EN COURS maintenant (22:30) — start <= 22:30 < end
    {"status": "confirmed", "start": "22:00", "end": "23:00", "ongoing": True},
    {"status": "confirmed", "start": "21:45", "end": "23:30", "ongoing": True},
    # 4 à venir (après 22:30)
    {"status": "confirmed", "start": "23:00", "end": "23:45"},
    {"status": "confirmed", "start": "23:15", "end": "23:45"},
    {"status": "confirmed", "start": "22:45", "end": "23:30"},
    {"status": "confirmed", "start": "23:30", "end": "23:55"},
]


def random_name(used: set) -> tuple[str, str]:
    while True:
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        if (fn, ln) not in used:
            used.add((fn, ln))
            return fn, ln


def duration_minutes(start: str, end: str) -> int:
    s = datetime.strptime(start, "%H:%M")
    e = datetime.strptime(end, "%H:%M")
    return int((e - s).total_seconds() / 60)


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db     = client[DB_NAME]

    # ── Récupérer le parking ──────────────────────────────────────────────────
    lot = await db.parking_lots.find_one({"name": LOT_NAME})
    if not lot:
        print(f"❌ Parking '{LOT_NAME}' introuvable. Vérifie le nom exact en base.")
        client.close()
        return

    lot_id      = str(lot["_id"])
    total_spots = lot.get("total_spots", 20)

    # ── S'assurer que le parking est payant à 100 DA/h ────────────────────────
    if lot.get("type") != "paid" or lot.get("price_per_hour") != PRICE_PER_HOUR:
        await db.parking_lots.update_one(
            {"_id": lot["_id"]},
            {"$set": {"type": "paid", "price_per_hour": PRICE_PER_HOUR}},
        )
        print(f"Parking mis à jour : type='paid', price_per_hour={PRICE_PER_HOUR} DA/h")

    print(f"Parking ciblé : {lot['name']}  (id={lot_id}, {total_spots} places)")
    print(f"Heure simulée : {NOW_LOCAL_HM} (locale Algérie) — {TODAY}\n")

    used_names: set = set()
    inserted = 0
    skipped  = 0

    for i, plan in enumerate(RESERVATIONS_PLAN):
        first_name, last_name = random_name(used_names)
        email = f"{first_name.lower()}.{last_name.lower()}{i}@demo.parkora.dz"
        phone = f"0{random.choice(['5', '6', '7'])}{random.randint(10**7, 10**8 - 1)}"
        plate = f"{random.randint(10000, 99999)}-{random.randint(100, 999)}-{random.randint(1, 99):02d}"

        # ── Créer (ou réutiliser) le compte client ───────────────────────────
        existing_user = await db.users.find_one({"email": email})
        if existing_user:
            user_id = str(existing_user["_id"])
        else:
            user_doc = {
                "first_name":      first_name,
                "last_name":       last_name,
                "phone":           phone,
                "email":           email,
                "hashed_password": pwd_context.hash("demo1234"),
                "avatar":          "🧑",
                "plate":           plate,
                "favorites":       [],
            }
            result  = await db.users.insert_one(user_doc)
            user_id = str(result.inserted_id)

        # ── Créneau + place ───────────────────────────────────────────────────
        start_time   = plan["start"]
        end_time     = plan["end"]
        duration_min = duration_minutes(start_time, end_time)
        spot_id      = (i % total_spots) + 1
        total_price  = int(round((duration_min / 60) * PRICE_PER_HOUR))

        # created_at en UTC : start_time est en heure locale Algérie (UTC+1),
        # la réservation est supposée avoir été créée 1 à 3 jours avant.
        start_local    = datetime.strptime(f"{TODAY} {start_time}", "%Y-%m-%d %H:%M")
        start_utc      = start_local - timedelta(hours=1)
        created_at_utc = start_utc - timedelta(
            days=random.randint(1, 3), hours=random.randint(0, 12)
        )

        # ── Éviter les doublons si le script est relancé ──────────────────────
        already = await db.reservations.find_one({
            "user_id":    user_id,
            "lot_id":     lot_id,
            "date":       TODAY,
            "start_time": start_time,
            "spot_id":    spot_id,
        })
        if already:
            skipped += 1
            continue

        doc = {
            "user_id":        user_id,
            "lot_id":         lot_id,
            "lot_name":       lot["name"],
            "spot_id":        spot_id,
            "date":           TODAY,
            "start_time":     start_time,
            "end_time":       end_time,
            "duration_min":   duration_min,
            "total_price":    total_price,
            "status":         plan["status"],
            "payment_method": "cib",
            "created_at":     created_at_utc.replace(tzinfo=timezone.utc).isoformat(),
        }

        # ── Champs spécifiques à l'annulation ──────────────────────────────────
        tag = ""
        if plan["status"] == "cancelled":
            reason = CANCELLATION_REASONS[plan["reason_idx"]]
            cancelled_at_utc = start_utc - timedelta(hours=random.randint(1, 6))
            doc.update({
                "cancellation_reason": reason,
                "cancelled_by":        "manager",
                "cancelled_at":        cancelled_at_utc.replace(tzinfo=timezone.utc).isoformat(),
            })
            tag = f"  [ANNULÉE → {reason}]"
        elif plan.get("ongoing"):
            tag = "  [EN COURS]"

        await db.reservations.insert_one(doc)
        inserted += 1
        print(f"  [{inserted:02d}] {first_name:<10} {last_name:<12} place {spot_id:>2}  "
              f"{start_time}→{end_time}  {total_price:>4} DA  ({plan['status']}){tag}")

    cancelled_count = sum(1 for p in RESERVATIONS_PLAN if p["status"] == "cancelled")
    confirmed_count = sum(1 for p in RESERVATIONS_PLAN if p["status"] == "confirmed")
    ongoing_count   = sum(1 for p in RESERVATIONS_PLAN if p.get("ongoing"))

    print(f"\n✅ {inserted} réservation(s) insérée(s) pour le {TODAY}.")
    print(f"   {cancelled_count} annulée(s) avec motif, {confirmed_count} confirmée(s) "
          f"dont {ongoing_count} en cours à {NOW_LOCAL_HM}.")
    if skipped:
        print(f"   ({skipped} déjà existante(s), ignorée(s))")

    client.close()


asyncio.run(seed())