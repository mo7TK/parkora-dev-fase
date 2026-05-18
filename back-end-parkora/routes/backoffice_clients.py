"""
routes/backoffice_clients.py
──────────────────────────────
Consultation et suppression des comptes clients par l'admin.
Toutes les routes sont protégées par get_current_admin.

Endpoints :
  GET    /backoffice/admin/clients          → liste tous les clients
  GET    /backoffice/admin/clients/{id}     → détails d'un client
  DELETE /backoffice/admin/clients/{id}     → supprimer un client

La collection clients est la collection existante `users`
(comptes créés depuis l'app mobile via /auth/register).
On n'expose jamais hashed_password.
"""

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from database import get_database
from utils.backoffice_security import get_current_admin

router = APIRouter(prefix="/backoffice/admin", tags=["backoffice-clients"])


# ── Sérialiseur ───────────────────────────────────────────────────────────────

def _fmt(user: dict) -> dict:
    """Sérialise un document user sans exposer le hash du mot de passe."""
    return {
        "id":         str(user["_id"]),
        "first_name": user.get("first_name", ""),
        "last_name":  user.get("last_name", ""),
        "email":      user.get("email", ""),
        "phone":      user.get("phone", ""),
        "avatar":     user.get("avatar", "🧑"),
        "plate":      user.get("plate", ""),
        "favorites":  user.get("favorites", []),
    }


# ── GET /backoffice/admin/clients ─────────────────────────────────────────────

@router.get("/clients")
async def list_clients(admin: dict = Depends(get_current_admin)):
    """
    Retourne la liste de tous les clients (comptes app mobile).
    Triés par ordre alphabétique sur le nom de famille.
    """
    db = get_database()
    users = await db.users.find().sort("last_name", 1).to_list(1000)
    return [_fmt(u) for u in users]


# ── GET /backoffice/admin/clients/{id} ────────────────────────────────────────

@router.get("/clients/{client_id}")
async def get_client(
    client_id: str,
    admin: dict = Depends(get_current_admin),
):
    """
    Retourne les détails complets d'un client par son id MongoDB.
    Inclut la liste de ses favoris (lot_ids) mais pas ses réservations
    (requête séparée si nécessaire).
    """
    db = get_database()

    if not ObjectId.is_valid(client_id):
        raise HTTPException(status_code=400, detail="client_id invalide.")

    user = await db.users.find_one({"_id": ObjectId(client_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Client introuvable.")

    # Compter le nombre de réservations de ce client pour l'afficher
    total_reservations = await db.reservations.count_documents(
        {"user_id": client_id}
    )

    return {
        **_fmt(user),
        "total_reservations": total_reservations,
    }


# ── DELETE /backoffice/admin/clients/{id} ─────────────────────────────────────

@router.delete("/clients/{client_id}")
async def delete_client(
    client_id: str,
    admin: dict = Depends(get_current_admin),
):
    """
    Supprime définitivement un compte client.

    ⚠️  Les réservations de ce client restent dans la DB pour l'historique
    financier mais l'utilisateur ne pourra plus se connecter.
    """
    db = get_database()

    if not ObjectId.is_valid(client_id):
        raise HTTPException(status_code=400, detail="client_id invalide.")

    user = await db.users.find_one({"_id": ObjectId(client_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Client introuvable.")

    await db.users.delete_one({"_id": ObjectId(client_id)})

    return {
        "status": "deleted",
        "id":     client_id,
        "email":  user.get("email", ""),
    }
