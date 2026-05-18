"""
routes/backoffice_parking_admin.py
────────────────────────────────────
Gestion des parkings par l'administrateur.
Toutes les routes sont protégées par get_current_admin.

Endpoints :
  GET    /backoffice/admin/parkings          → liste tous les parkings
  POST   /backoffice/admin/parkings          → créer un parking
  DELETE /backoffice/admin/parkings/{id}     → supprimer un parking

Note sur les images :
  hero_image et minimap_image sont des noms de fichiers simples (ex: "photo.jpg").
  Les fichiers doivent être déposés manuellement dans :
    assets/images/entrance/   pour hero_image
    assets/images/minimaps/   pour minimap_image

Note sur la suppression :
  Supprimer un parking ne supprime PAS automatiquement le gestionnaire associé.
  Il reste dans la collection managers avec un assigned_lot_id qui ne pointe
  plus sur rien. L'admin doit aussi supprimer le gestionnaire si nécessaire.
"""

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from pydantic import BaseModel
from typing import Union

from database import get_database
from utils.backoffice_security import get_current_admin

router = APIRouter(prefix="/backoffice/admin", tags=["backoffice-parking-admin"])


# ── Sérialiseur ───────────────────────────────────────────────────────────────

def _fmt(lot: dict, manager: dict = None) -> dict:
    """
    Sérialise un parking.
    Ajoute les infos du gestionnaire assigné si disponibles.
    """
    return {
        "id":              str(lot["_id"]),
        "name":            lot.get("name", ""),
        "latitude":        lot.get("latitude"),
        "longitude":       lot.get("longitude"),
        "total_spots":     lot.get("total_spots", 0),
        "hero_image":      lot.get("hero_image", ""),
        "minimap_image":   lot.get("minimap_image", ""),
        "type":            lot.get("type", "free"),
        "address":         lot.get("address", ""),
        "bio":             lot.get("bio", ""),
        "price_per_hour":  lot.get("price_per_hour", 0),
        "is_open":         lot.get("is_open", True),
        "opening_hours":   lot.get("opening_hours", "24/7"),
        # Infos du gestionnaire assigné (None si aucun)
        "manager": {
            "id":       str(manager["_id"]),
            "username": manager.get("username", ""),
            "phone":    manager.get("phone", ""),
        } if manager else None,
    }


# ── Schémas Pydantic ──────────────────────────────────────────────────────────

class CreateParkingBody(BaseModel):
    name:           str
    latitude:       float
    longitude:      float
    total_spots:    int
    hero_image:     str = ""          # nom du fichier, ex: "parking_entrance.jpg"
    minimap_image:  str = ""          # nom du fichier, ex: "parking_map.png"
    type:           str = "free"      # "free" | "paid"
    address:        str = ""
    bio:            str = ""
    price_per_hour: int = 0
    is_open:        bool = True
    opening_hours:  Union[str, dict] = "24/7"


# ── GET /backoffice/admin/parkings ────────────────────────────────────────────

@router.get("/parkings")
async def list_parkings(admin: dict = Depends(get_current_admin)):
    """
    Retourne tous les parkings avec le gestionnaire assigné si existant.
    Jointure manuelle parkings → managers en une seule passe.
    """
    db = get_database()

    lots = await db.parking_lots.find().sort("name", 1).to_list(200)

    # Récupérer tous les gestionnaires dont assigned_lot_id est dans notre liste
    lot_ids_str = [str(l["_id"]) for l in lots]
    managers    = await db.managers.find(
        {"assigned_lot_id": {"$in": lot_ids_str}}
    ).to_list(200)

    # Map lot_id → manager
    manager_map = {m["assigned_lot_id"]: m for m in managers}

    return [_fmt(l, manager_map.get(str(l["_id"]))) for l in lots]


# ── POST /backoffice/admin/parkings ───────────────────────────────────────────

@router.post("/parkings", status_code=201)
async def create_parking(
    body: CreateParkingBody,
    admin: dict = Depends(get_current_admin),
):
    """
    Crée un nouveau parking dans la base de données.

    Les images sont des noms de fichiers à déposer manuellement dans le dossier
    assets/images/. Aucun upload n'est traité ici.

    Après création, utilisez POST /backoffice/admin/managers pour assigner
    un gestionnaire à ce parking.
    """
    db = get_database()

    # ── Unicité du nom ────────────────────────────────────────────────────────
    if await db.parking_lots.find_one({"name": body.name.strip()}):
        raise HTTPException(
            status_code=409,
            detail=f"Un parking nommé '{body.name.strip()}' existe déjà.",
        )

    # ── Validation type ───────────────────────────────────────────────────────
    if body.type not in ("free", "paid"):
        raise HTTPException(
            status_code=400,
            detail="Le champ 'type' doit être 'free' ou 'paid'.",
        )
    if body.type == "paid" and body.price_per_hour <= 0:
        raise HTTPException(
            status_code=400,
            detail="Un parking payant doit avoir un price_per_hour > 0.",
        )

    # ── Insertion ─────────────────────────────────────────────────────────────
    doc = {
        "name":           body.name.strip(),
        "latitude":       body.latitude,
        "longitude":      body.longitude,
        "total_spots":    body.total_spots,
        "hero_image":     body.hero_image.strip(),
        "minimap_image":  body.minimap_image.strip(),
        "type":           body.type,
        "address":        body.address.strip(),
        "bio":            body.bio.strip(),
        "price_per_hour": body.price_per_hour,
        "is_open":        body.is_open,
        "opening_hours":  body.opening_hours,
    }

    result    = await db.parking_lots.insert_one(doc)
    doc["_id"] = result.inserted_id

    return _fmt(doc)


# ── DELETE /backoffice/admin/parkings/{id} ────────────────────────────────────

@router.delete("/parkings/{lot_id}")
async def delete_parking(
    lot_id: str,
    admin: dict = Depends(get_current_admin),
):
    """
    Supprime définitivement un parking.

    ⚠️  Attention : cette action est irréversible.
    Les réservations liées à ce parking restent dans la DB pour l'historique
    mais ne seront plus accessibles via les routes normales.
    Le gestionnaire assigné n'est PAS supprimé automatiquement.
    """
    db = get_database()

    if not ObjectId.is_valid(lot_id):
        raise HTTPException(status_code=400, detail="lot_id invalide.")

    lot = await db.parking_lots.find_one({"_id": ObjectId(lot_id)})
    if not lot:
        raise HTTPException(status_code=404, detail="Parking introuvable.")

    await db.parking_lots.delete_one({"_id": ObjectId(lot_id)})

    return {
        "status": "deleted",
        "id":     lot_id,
        "name":   lot.get("name", ""),
    }
