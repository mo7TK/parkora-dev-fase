"""
backoffice_seed.py
───────────────────
Crée le compte administrateur initial dans MongoDB.

À exécuter UNE SEULE FOIS après le premier déploiement :

    python backoffice_seed.py

Le script est idempotent : si un admin avec ce username existe déjà,
il ne crée pas de doublon (affiche un avertissement à la place).

Modifiez ADMIN_USERNAME et ADMIN_PASSWORD avant de lancer.
En production, utilisez des variables d'environnement ou un fichier .env.
"""

import asyncio
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# ── Configuration ─────────────────────────────────────────────────────────────
MONGO_URL = "mongodb://localhost:27017"
DB_NAME   = "parkora"

# ⚠️  MODIFIEZ CES VALEURS avant de lancer le script
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"   
# ─────────────────────────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db     = client[DB_NAME]

    username = ADMIN_USERNAME.strip().lower()

    # ── Vérification d'unicité ────────────────────────────────────────────────
    existing = await db.admins.find_one({"username": username})
    if existing:
        print(f"⚠️  Un admin avec le username '{username}' existe déjà.")
        print(f"   id = {existing['_id']}")
        print("   Aucune modification effectuée.")
        client.close()
        return

    # ── Insertion ─────────────────────────────────────────────────────────────
    doc = {
        "username":        username,
        "hashed_password": pwd_context.hash(ADMIN_PASSWORD),
        "created_at":      datetime.now(timezone.utc).isoformat(),
    }

    result = await db.admins.insert_one(doc)
    print(f"✅  Compte admin créé avec succès.")
    print(f"   username : {username}")
    print(f"   id       : {result.inserted_id}")
    print()
    print("⚠️  IMPORTANT : supprimez ou sécurisez ce script après utilisation.")
    print("   Ne laissez pas le mot de passe en clair dans le code en production.")

    client.close()


asyncio.run(seed())
