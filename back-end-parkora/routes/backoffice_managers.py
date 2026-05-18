"""
routes/backoffice_managers.py
──────────────────────────────
CRUD complet des comptes gestionnaires.
Toutes les routes sont protégées par get_current_admin.

Endpoints :
  GET    /backoffice/admin/managers          → liste tous les gestionnaires
  POST   /backoffice/admin/managers          → créer un gestionnaire
  GET    /backoffice/admin/managers/{id}     → détails d'un gestionnaire
  DELETE /backoffice/admin/managers/{id}     → supprimer un gestionnaire

Logique de création :
  1. Vérifier que le parking assigné existe
  2. Vérifier que le username n'est pas déjà pris
  3. Générer un mot de passe aléatoire sécurisé
  4. Stocker le hash — retourner le plain UNE SEULE FOIS dans la réponse
     (l'admin le communique au gestionnaire, il ne sera plus jamais visible)

Collection MongoDB : managers
  {
    _id              : ObjectId
    username         : str  (unique, lowercase)
    hashed_password  : str
    phone            : str
    assigned_lot_id  : str  (ObjectId du parking, stocké en str)
    created_at       : str  (ISO UTC)
  }
"""

import secrets
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_database
from utils.backoffice_security import get_current_admin, hash_password

router = APIRouter(prefix="/backoffice/admin", tags=["backoffice-managers"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt(manager: dict, include_lot: dict = None) -> dict:
    """Sérialise un document manager. Ajoute le nom du parking si fourni."""
    out = {
        "id":              str(manager["_id"]),
        "username":        manager.get("username", ""),
        "phone":           manager.get("phone", ""),
        "assigned_lot_id": manager.get("assigned_lot_id", ""),
        "assigned_lot_name": include_lot.get("name", "—") if include_lot else "—",
        "created_at":      manager.get("created_at", ""),
    }
    return out


def _generate_password(length: int = 12) -> str:
    """
    Génère un mot de passe aléatoire sécurisé.
    secrets.token_urlsafe utilise os.urandom → cryptographiquement sûr.
    On prend les `length` premiers caractères pour avoir une longueur fixe.
    """
    return secrets.token_urlsafe(length)[:length]


# ── Schémas Pydantic ──────────────────────────────────────────────────────────

class CreateManagerBody(BaseModel):
    username:        str
    phone:           str
    assigned_lot_id: str   # MongoDB ObjectId du parking


# ── GET /backoffice/admin/managers ────────────────────────────────────────────

@router.get("/managers")
async def list_managers(admin: dict = Depends(get_current_admin)):
    """
    Retourne la liste de tous les gestionnaires avec le nom de leur parking.
    Effectue une jointure manuelle managers → parking_lots en une seule passe.
    """
    db = get_database()

    managers = await db.managers.find().sort("created_at", -1).to_list(200)

    # Récupérer tous les parkings concernés en une seule requête
    lot_ids = [
        ObjectId(m["assigned_lot_id"])
        for m in managers
        if m.get("assigned_lot_id") and ObjectId.is_valid(m["assigned_lot_id"])
    ]
    lots = await db.parking_lots.find({"_id": {"$in": lot_ids}}).to_list(200)
    lot_map = {str(l["_id"]): l for l in lots}

    return [
        _fmt(m, lot_map.get(m.get("assigned_lot_id", "")))
        for m in managers
    ]


# ── POST /backoffice/admin/managers ───────────────────────────────────────────

@router.post("/managers", status_code=201)
async def create_manager(
    body: CreateManagerBody,
    admin: dict = Depends(get_current_admin),
):
    """
    Crée un nouveau compte gestionnaire.

    ⚠️  Le mot de passe généré est retourné EN CLAIR une seule fois
    dans la réponse sous la clé "generated_password".
    L'admin doit le transmettre au gestionnaire immédiatement.
    Il ne sera plus jamais accessible.
    """
    db = get_database()

    # ── Vérification que le parking existe ───────────────────────────────────
    if not ObjectId.is_valid(body.assigned_lot_id):
        raise HTTPException(status_code=400, detail="assigned_lot_id invalide.")

    lot = await db.parking_lots.find_one({"_id": ObjectId(body.assigned_lot_id)})
    if not lot:
        raise HTTPException(status_code=404, detail="Parking introuvable.")

    # ── Unicité du username ───────────────────────────────────────────────────
    username = body.username.strip().lower()
    if await db.managers.find_one({"username": username}):
        raise HTTPException(
            status_code=409,
            detail=f"Le username '{username}' est déjà utilisé.",
        )

    # ── Génération et hachage du mot de passe ─────────────────────────────────
    plain_password  = _generate_password()
    hashed          = hash_password(plain_password)

    # ── Insertion ─────────────────────────────────────────────────────────────
    doc = {
        "username":        username,
        "hashed_password": hashed,
        "phone":           body.phone.strip(),
        "assigned_lot_id": body.assigned_lot_id,
        "created_at":      datetime.now(timezone.utc).isoformat(),
    }

    result    = await db.managers.insert_one(doc)
    doc["_id"] = result.inserted_id

    return {
        **_fmt(doc, lot),
        # ⚠️  Seule et unique fois où le mot de passe plain est exposé
        "generated_password": plain_password,
    }


# ── GET /backoffice/admin/managers/{id} ───────────────────────────────────────

@router.get("/managers/{manager_id}")
async def get_manager(
    manager_id: str,
    admin: dict = Depends(get_current_admin),
):
    """Retourne les détails d'un gestionnaire par son id MongoDB."""
    db = get_database()

    if not ObjectId.is_valid(manager_id):
        raise HTTPException(status_code=400, detail="manager_id invalide.")

    manager = await db.managers.find_one({"_id": ObjectId(manager_id)})
    if not manager:
        raise HTTPException(status_code=404, detail="Gestionnaire introuvable.")

    lot = None
    if manager.get("assigned_lot_id") and ObjectId.is_valid(manager["assigned_lot_id"]):
        lot = await db.parking_lots.find_one({"_id": ObjectId(manager["assigned_lot_id"])})

    return _fmt(manager, lot)


# ── DELETE /backoffice/admin/managers/{id} ────────────────────────────────────

@router.delete("/managers/{manager_id}")
async def delete_manager(
    manager_id: str,
    admin: dict = Depends(get_current_admin),
):
    """
    Supprime définitivement un compte gestionnaire.
    Le parking qui lui était assigné n'est PAS supprimé.
    """
    db = get_database()

    if not ObjectId.is_valid(manager_id):
        raise HTTPException(status_code=400, detail="manager_id invalide.")

    manager = await db.managers.find_one({"_id": ObjectId(manager_id)})
    if not manager:
        raise HTTPException(status_code=404, detail="Gestionnaire introuvable.")

    await db.managers.delete_one({"_id": ObjectId(manager_id)})

    return {
        "status":  "deleted",
        "id":      manager_id,
        "username": manager.get("username", ""),
    }
