"""
utils/backoffice_security.py
─────────────────────────────
Sécurité JWT pour le backoffice (admin + gestionnaire).

Différence avec utils/security.py (clients) :
  • Le payload JWT contient un champ "role" : "admin" | "manager"
  • Les gestionnaires ont aussi "assigned_lot_id" dans le token
  • Les dépendances FastAPI get_current_admin / get_current_manager
    sont définies ici et importées dans chaque route protégée

Structure du payload JWT backoffice :
  {
    "sub"              : id MongoDB (str)
    "role"             : "admin" | "manager"
    "assigned_lot_id"  : str | None   (None pour admin)
    "exp"              : datetime
  }
"""

import os
from datetime import datetime, timedelta, timezone

from fastapi import Header, HTTPException
from jose import JWTError, jwt
from passlib.context import CryptContext
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ─────────────────────────────────────────────────────────────
JWT_SECRET    = os.getenv("JWT_SECRET", "fallback-secret")   # même clé que le reste
JWT_ALGORITHM = "HS256"
JWT_DAYS      = 7   # sessions backoffice plus courtes que l'app mobile

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Mots de passe ─────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── Tokens ────────────────────────────────────────────────────────────────────

def create_backoffice_token(
    user_id: str,
    role: str,                    # "admin" | "manager"
    assigned_lot_id: str = None,  # None pour admin
) -> str:
    """
    Crée un JWT signé pour le backoffice.
    Le rôle est encodé dans le token → pas besoin d'un 2e appel DB pour l'autorisation.
    """
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_DAYS)
    payload = {
        "sub":             user_id,
        "role":            role,
        "assigned_lot_id": assigned_lot_id,
        "exp":             expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_backoffice_token(token: str) -> dict | None:
    """
    Décode et valide un JWT backoffice.
    Retourne { sub, role, assigned_lot_id } ou None si invalide/expiré.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        # Vérification minimale : le champ role doit exister
        if payload.get("role") not in ("admin", "manager"):
            return None
        return payload
    except JWTError:
        return None


# ── Dépendances FastAPI ───────────────────────────────────────────────────────

def _extract_token(authorization: str | None) -> dict:
    """Factorisation : extrait et décode le token, lève 401 si invalide."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Token manquant. Envoyez : Authorization: Bearer <token>",
        )
    token = authorization.split(" ", 1)[1]
    payload = decode_backoffice_token(token)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Token invalide ou expiré. Reconnectez-vous.",
        )
    return payload


async def get_current_admin(authorization: str = Header(default=None)) -> dict:
    """
    Dépendance pour les routes réservées à l'admin.

    Usage :
        @router.get("/admin/managers")
        async def list_managers(admin = Depends(get_current_admin)):
            ...
    """
    from database import get_database  # import local pour éviter les cycles

    payload = _extract_token(authorization)

    if payload["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs.")

    db = get_database()
    try:
        oid = ObjectId(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Token corrompu.")

    admin = await db.admins.find_one({"_id": oid})
    if not admin:
        raise HTTPException(status_code=401, detail="Compte administrateur introuvable.")

    return admin


async def get_current_manager(authorization: str = Header(default=None)) -> dict:
    """
    Dépendance pour les routes réservées aux gestionnaires.

    Usage :
        @router.get("/manager/reservations")
        async def list_reservations(manager = Depends(get_current_manager)):
            ...
    """
    from database import get_database

    payload = _extract_token(authorization)

    if payload["role"] != "manager":
        raise HTTPException(status_code=403, detail="Accès réservé aux gestionnaires.")

    db = get_database()
    try:
        oid = ObjectId(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Token corrompu.")

    manager = await db.managers.find_one({"_id": oid})
    if not manager:
        raise HTTPException(status_code=401, detail="Compte gestionnaire introuvable.")

    return manager
