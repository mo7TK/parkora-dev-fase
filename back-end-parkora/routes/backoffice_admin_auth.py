"""
routes/backoffice_admin_auth.py
────────────────────────────────
Authentification de l'administrateur général.

Endpoint :
  POST /backoffice/admin/login   → { access_token, admin }

L'admin se connecte avec username + mot de passe.
Le compte admin est créé une seule fois via backoffice_seed.py.
Il n'y a pas de route /register ici — on ne veut pas qu'un admin
puisse en créer un autre depuis l'API.

Collection MongoDB : admins
  {
    _id             : ObjectId
    username        : str  (unique)
    hashed_password : str
    created_at      : str  (ISO)
  }
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_database
from utils.backoffice_security import (
    verify_password,
    create_backoffice_token,
)

router = APIRouter(prefix="/backoffice/admin", tags=["backoffice-admin-auth"])


# ── Schéma ────────────────────────────────────────────────────────────────────

class AdminLoginBody(BaseModel):
    username: str
    password: str


# ── Sérialiseur ───────────────────────────────────────────────────────────────

def _fmt(admin: dict) -> dict:
    return {
        "id":       str(admin["_id"]),
        "username": admin.get("username", ""),
        "role":     "admin",
    }


# ── POST /backoffice/admin/login ──────────────────────────────────────────────

@router.post("/login")
async def admin_login(body: AdminLoginBody):
    """
    Connexion de l'administrateur.

    Retourne un JWT avec role="admin" en cas de succès.
    Même message d'erreur que le username soit inconnu ou le mot de passe faux
    (évite l'énumération des comptes).
    """
    db = get_database()
    username = body.username.strip().lower()

    admin = await db.admins.find_one({"username": username})

    password_ok = admin is not None and verify_password(
        body.password, admin["hashed_password"]
    )

    if not admin or not password_ok:
        raise HTTPException(
            status_code=401,
            detail="Nom d'utilisateur ou mot de passe incorrect.",
        )

    token = create_backoffice_token(
        user_id=str(admin["_id"]),
        role="admin",
    )

    return {"access_token": token, "admin": _fmt(admin)}
