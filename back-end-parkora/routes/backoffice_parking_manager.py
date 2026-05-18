"""
routes/backoffice_parking_manager.py
──────────────────────────────────────
Routes du gestionnaire pour consulter et modifier son parking assigné.
Toutes les routes sont protégées par get_current_manager.

Endpoints :
  GET /backoffice/manager/parking           → infos du parking assigné
  PUT /backoffice/manager/parking           → modifier address/bio/is_open/
                                              opening_hours/price_per_hour

Sécurité :
  Le gestionnaire ne peut accéder QU'À son parking assigné.
  assigned_lot_id est lu directement depuis le document manager en DB
  (pas seulement depuis le token — double vérification).

Champs modifiables par le gestionnaire :
  • address        (str)
  • bio            (str)
  • is_open        (bool)
  • opening_hours  (str "24/7" ou dict { lun: "08:00-20:00", ... })
  • price_per_hour (int, DA)

Champs NON modifiables par le gestionnaire :
  name, latitude, longitude, total_spots, hero_image, minimap_image, type
  → Ces champs sont gérés uniquement par l'admin.
"""

from typing import Optional, Union

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_database
from utils.backoffice_security import get_current_manager

router = APIRouter(prefix="/backoffice/manager", tags=["backoffice-parking-manager"])


# ── Sérialiseur ───────────────────────────────────────────────────────────────

def _fmt(lot: dict) -> dict:
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
    }


# ── Schéma de mise à jour ─────────────────────────────────────────────────────
# Tous les champs sont Optional → le gestionnaire peut mettre à jour
# un seul champ sans envoyer tous les autres (PATCH sémantique via PUT).

class UpdateParkingBody(BaseModel):
    address:        Optional[str]              = None
    bio:            Optional[str]              = None
    is_open:        Optional[bool]             = None
    opening_hours:  Optional[Union[str, dict]] = None
    price_per_hour: Optional[int]              = None


# ── GET /backoffice/manager/parking ──────────────────────────────────────────

@router.get("/parking")
async def get_my_parking(manager: dict = Depends(get_current_manager)):
    """
    Retourne les informations complètes du parking assigné au gestionnaire.
    """
    db = get_database()

    lot_id = manager.get("assigned_lot_id")
    if not lot_id or not ObjectId.is_valid(lot_id):
        raise HTTPException(
            status_code=404,
            detail="Aucun parking assigné à ce compte.",
        )

    lot = await db.parking_lots.find_one({"_id": ObjectId(lot_id)})
    if not lot:
        raise HTTPException(
            status_code=404,
            detail="Parking introuvable. Contactez l'administrateur.",
        )

    return _fmt(lot)


# ── PUT /backoffice/manager/parking ──────────────────────────────────────────

@router.put("/parking")
async def update_my_parking(
    body: UpdateParkingBody,
    manager: dict = Depends(get_current_manager),
):
    """
    Met à jour les informations modifiables du parking assigné.

    Seuls les champs fournis (non None) sont mis à jour.
    Les champs non fournis conservent leur valeur actuelle.

    Exemple de body minimal pour juste fermer le parking :
      { "is_open": false }

    Exemple pour mettre à jour plusieurs champs :
      {
        "price_per_hour": 150,
        "is_open": true,
        "bio": "Nouveau texte de description"
      }
    """
    db = get_database()

    lot_id = manager.get("assigned_lot_id")
    if not lot_id or not ObjectId.is_valid(lot_id):
        raise HTTPException(
            status_code=404,
            detail="Aucun parking assigné à ce compte.",
        )

    lot = await db.parking_lots.find_one({"_id": ObjectId(lot_id)})
    if not lot:
        raise HTTPException(
            status_code=404,
            detail="Parking introuvable. Contactez l'administrateur.",
        )

    # ── Construire le dict de mise à jour ─────────────────────────────────────
    # On n'inclut que les champs explicitement fournis dans le body.
    # model_dump(exclude_none=True) ignore les champs laissés à None.
    updates = body.model_dump(exclude_none=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="Aucun champ à mettre à jour fourni.",
        )

    # ── Validation prix ────────────────────────────────────────────────────────
    if "price_per_hour" in updates and updates["price_per_hour"] < 0:
        raise HTTPException(
            status_code=400,
            detail="price_per_hour ne peut pas être négatif.",
        )

    # ── Nettoyage des champs texte ─────────────────────────────────────────────
    if "address" in updates:
        updates["address"] = updates["address"].strip()
    if "bio" in updates:
        updates["bio"] = updates["bio"].strip()

    await db.parking_lots.update_one(
        {"_id": ObjectId(lot_id)},
        {"$set": updates},
    )

    # Retourner le document mis à jour
    updated_lot = await db.parking_lots.find_one({"_id": ObjectId(lot_id)})
    return _fmt(updated_lot)
