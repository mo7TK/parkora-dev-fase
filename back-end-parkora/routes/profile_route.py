"""
routes/profile.py
──────────────────
Modification du profil et du mot de passe par le client connecté.

Endpoints :
  PUT /auth/me/update    → modifier first_name, last_name, phone, plate
  PUT /auth/me/password  → modifier le mot de passe

Protégés par get_current_user (JWT client).
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from database import get_database
from routes.auth import get_current_user
from utils.security import verify_password, hash_password

router = APIRouter(prefix="/auth", tags=["profile"])


# ── Schémas ───────────────────────────────────────────────────────────────────

class UpdateProfileBody(BaseModel):
    first_name: Optional[str] = None
    last_name:  Optional[str] = None
    phone:      Optional[str] = None
    plate:      Optional[str] = None


class ChangePasswordBody(BaseModel):
    current_password: str
    new_password:     str


# ── Sérialiseur ───────────────────────────────────────────────────────────────

def _fmt(user: dict) -> dict:
    return {
        "id":         str(user["_id"]),
        "first_name": user.get("first_name", ""),
        "last_name":  user.get("last_name", ""),
        "email":      user.get("email", ""),
        "phone":      user.get("phone", ""),
        "avatar":     user.get("avatar", "🧑"),
        "plate":      user.get("plate", ""),
    }


# ── PUT /auth/me/update ───────────────────────────────────────────────────────

@router.put("/me/update")
async def update_profile(
    body: UpdateProfileBody,
    user: dict = Depends(get_current_user),
):
    """
    Met à jour les informations modifiables du client connecté.
    Seuls les champs fournis (non None) sont mis à jour.
    """
    db = get_database()

    updates = body.model_dump(exclude_none=True)

    if not updates:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour.")

    # Validation prénom / nom
    if "first_name" in updates:
        fn = updates["first_name"].strip()
        if len(fn) < 3:
            raise HTTPException(
                status_code=400,
                detail="Le prénom doit contenir au moins 3 lettres.",
            )
        updates["first_name"] = fn

    if "last_name" in updates:
        ln = updates["last_name"].strip()
        if len(ln) < 3:
            raise HTTPException(
                status_code=400,
                detail="Le nom doit contenir au moins 3 lettres.",
            )
        updates["last_name"] = ln

    # Validation téléphone
    if "phone" in updates:
        import re
        p = updates["phone"].strip()
        if not re.match(r"^\+213\d{9}$", p) and not re.match(r"^0\d{9}$", p):
            raise HTTPException(
                status_code=400,
                detail="Numéro invalide. Format : +213XXXXXXXXX ou 0XXXXXXXXX",
            )
        updates["phone"] = p

    # Validation plaque
    if "plate" in updates:
        plate_digits = "".join(c for c in updates["plate"] if c.isdigit())
        if updates["plate"] and len(plate_digits) != 10:
            raise HTTPException(
                status_code=400,
                detail="L'immatriculation doit contenir exactement 10 chiffres.",
            )
        updates["plate"] = updates["plate"].strip()

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": updates},
    )

    updated = await db.users.find_one({"_id": user["_id"]})
    return _fmt(updated)


# ── PUT /auth/me/password ─────────────────────────────────────────────────────

@router.put("/me/password")
async def change_password(
    body: ChangePasswordBody,
    user: dict = Depends(get_current_user),
):
    """
    Change le mot de passe du client connecté.

    1. Vérifie que current_password correspond au hash en DB.
    2. Valide que new_password contient au moins 8 caractères.
    3. Vérifie que new_password ≠ current_password.
    4. Hache et enregistre le nouveau mot de passe.
    """
    db = get_database()

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

    # Rechargement depuis la DB pour avoir le hash le plus récent
    fresh = await db.users.find_one({"_id": user["_id"]})
    if not fresh:
        raise HTTPException(status_code=401, detail="Compte introuvable.")

    if not verify_password(body.current_password, fresh["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail="Mot de passe actuel incorrect.",
        )

    new_hash = hash_password(body.new_password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": new_hash}},
    )

    return {"status": "password_updated"}
