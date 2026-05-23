"""
routes/backoffice_manager_password.py
──────────────────────────────────────
Permet au gestionnaire connecté de changer son propre mot de passe.

Endpoint :
  PUT /backoffice/manager/password

Sécurité :
  • Protégé par get_current_manager (JWT valide requis)
  • L'ancien mot de passe doit être fourni et vérifié avant tout changement
  • Le nouveau mot de passe est haché avec bcrypt avant stockage
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId

from database import get_database
from utils.backoffice_security import (
    get_current_manager,
    verify_password,
    hash_password,
)

router = APIRouter(prefix="/backoffice/manager", tags=["backoffice-manager-password"])


# ── Schéma ────────────────────────────────────────────────────────────────────

class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str


# ── PUT /backoffice/manager/password ─────────────────────────────────────────

@router.put("/password")
async def change_password(
    body: ChangePasswordBody,
    manager: dict = Depends(get_current_manager),
):
    """
    Change le mot de passe du gestionnaire connecté.

    Étapes :
      1. Vérifier que current_password correspond au hash stocké en DB
      2. Valider que new_password respecte les contraintes minimales
      3. Hacher et stocker le nouveau mot de passe
    """
    db = get_database()

    # ── Validation basique du nouveau mot de passe ─────────────────────────
    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Le nouveau mot de passe doit contenir au moins 8 caractères.",
        )

    if body.new_password == body.current_password:
        raise HTTPException(
            status_code=400,
            detail="Le nouveau mot de passe doit être différent de l'ancien.",
        )

    # ── Vérification de l'ancien mot de passe ─────────────────────────────
    # On recharge depuis la DB pour avoir le hash le plus récent,
    # au cas où il aurait été changé dans une autre session.
    fresh = await db.managers.find_one({"_id": ObjectId(manager["_id"])})
    if not fresh:
        raise HTTPException(status_code=401, detail="Compte introuvable.")

    if not verify_password(body.current_password, fresh["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Mot de passe actuel incorrect.",
        )

    # ── Mise à jour ────────────────────────────────────────────────────────
    new_hash = hash_password(body.new_password)
    await db.managers.update_one(
        {"_id": ObjectId(manager["_id"])},
        {"$set": {"hashed_password": new_hash}},
    )

    return {"status": "password_updated"}
