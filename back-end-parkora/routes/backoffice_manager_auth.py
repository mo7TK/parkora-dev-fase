"""
routes/backoffice_manager_auth.py
──────────────────────────────────
Authentification des gestionnaires de parking.

Endpoints :
  POST /backoffice/manager/login   → { access_token, manager }
  GET  /backoffice/manager/me      → profil du gestionnaire connecté

Le gestionnaire se connecte avec username + mot de passe.
Son compte est créé par l'admin via backoffice_managers.py.

Collection MongoDB : managers
  {
    _id              : ObjectId
    username         : str  (unique)
    hashed_password  : str
    phone            : str
    assigned_lot_id  : str  (ObjectId du parking assigné, str)
    created_at       : str  (ISO)
  }
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_database
from utils.backoffice_security import (
    verify_password,
    create_backoffice_token,
    get_current_manager,
)

router = APIRouter(prefix="/backoffice/manager", tags=["backoffice-manager-auth"])


# ── Schéma ────────────────────────────────────────────────────────────────────

class ManagerLoginBody(BaseModel):
    username: str
    password: str


# ── Sérialiseur ───────────────────────────────────────────────────────────────

def _fmt(manager: dict) -> dict:
    return {
        "id":              str(manager["_id"]),
        "username":        manager.get("username", ""),
        "phone":           manager.get("phone", ""),
        "assigned_lot_id": manager.get("assigned_lot_id", ""),
        "role":            "manager",
    }


# ── POST /backoffice/manager/login ────────────────────────────────────────────

@router.post("/login")
async def manager_login(body: ManagerLoginBody):
    """
    Connexion du gestionnaire.

    Retourne un JWT avec role="manager" et assigned_lot_id en cas de succès.
    Le assigned_lot_id est encodé dans le token pour que les routes protégées
    puissent vérifier que le gestionnaire accède bien à son propre parking.
    """
    db = get_database()
    username = body.username.strip().lower()

    manager = await db.managers.find_one({"username": username})

    password_ok = manager is not None and verify_password(
        body.password, manager["hashed_password"]
    )

    if not manager or not password_ok:
        raise HTTPException(
            status_code=401,
            detail="Nom d'utilisateur ou mot de passe incorrect.",
        )

    token = create_backoffice_token(
        user_id=str(manager["_id"]),
        role="manager",
        assigned_lot_id=manager.get("assigned_lot_id"),
    )

    return {"access_token": token, "manager": _fmt(manager)}


# ── GET /backoffice/manager/me ────────────────────────────────────────────────

@router.get("/me")
async def manager_me(manager: dict = Depends(get_current_manager)):
    """
    Retourne le profil du gestionnaire actuellement connecté.

    Utilisé par le backoffice au démarrage pour :
      • Vérifier que le token est encore valide
      • Récupérer assigned_lot_id pour charger les données du parking
    """
    return _fmt(manager)
