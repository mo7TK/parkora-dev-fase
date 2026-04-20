"""
routes/auth.py
──────────────
Trois endpoints qui gèrent tout le cycle d'authentification :

  POST /auth/register  → Inscription   (public — pas de token requis)
  POST /auth/login     → Connexion     (public — pas de token requis)
  GET  /auth/me        → Profil actuel (protégé — token JWT requis)

Flux typique côté app :
  1. L'utilisateur remplit le formulaire d'inscription ou de connexion
  2. L'app appelle /auth/register ou /auth/login
  3. Le backend retourne { access_token, user }
  4. L'app stocke le token dans expo-secure-store (chiffré sur l'appareil)
  5. Pour chaque requête protégée, l'app envoie :
       Authorization: Bearer <token>
  6. La dépendance get_current_user() valide le token
     et charge l'utilisateur depuis MongoDB
"""

from fastapi import APIRouter, Depends, Header, HTTPException
from bson import ObjectId
from pydantic import BaseModel

from database import get_database
from utils.security import hash_password, verify_password, create_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Schémas Pydantic ──────────────────────────────────────────────────────────
# Pydantic valide automatiquement le corps des requêtes JSON.
# Si un champ requis manque, FastAPI retourne HTTP 422 automatiquement.

class RegisterBody(BaseModel):
    first_name: str
    last_name:  str
    phone:      str
    email:      str
    password:   str
    avatar:     str = "🧑"   # emoji choisi pendant l'inscription (optionnel)
    plate:      str = ""     # plaque d'immatriculation (optionnel)


class LoginBody(BaseModel):
    email:    str
    password: str

# ─────────────────────────────────────────────────────────────────────────────


# ── Serialiseur ───────────────────────────────────────────────────────────────

def _fmt(user: dict) -> dict:
    """
    Convertit un document MongoDB en dict JSON-serialisable.

    Deux transformations nécessaires :
      • ObjectId → str   (JSON ne sait pas sérialiser un ObjectId MongoDB)
      • On supprime hashed_password  (on n'expose JAMAIS le hash au client)
    """
    return {
        "id":         str(user["_id"]),
        "first_name": user.get("first_name", ""),
        "last_name":  user.get("last_name", ""),
        "email":      user.get("email", ""),
        "phone":      user.get("phone", ""),
        "avatar":     user.get("avatar", "🧑"),
        "plate":      user.get("plate", ""),
    }


# ── Dépendance JWT ────────────────────────────────────────────────────────────

async def get_current_user(authorization: str = Header(default=None)) -> dict:
    """
    Dépendance FastAPI réutilisable pour les routes protégées.

    Usage dans n'importe quelle route :
        @router.get("/route-protegee")
        async def ma_route(user = Depends(get_current_user)):
            ...

    Ce que ça fait étape par étape :
      1. Lit le header  Authorization: Bearer <token>
      2. Extrait le token (la partie après "Bearer ")
      3. Décode et valide le JWT via decode_token()
      4. Charge l'utilisateur depuis MongoDB avec l'id contenu dans le token
      5. Lève HTTP 401 si quelque chose cloche à n'importe quelle étape
    """
    # Étape 1 — vérification du format du header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Token manquant. Envoyez : Authorization: Bearer <token>",
        )

    # Étape 2 — extraction du token brut
    token = authorization.split(" ", 1)[1]

    # Étape 3 — décodage et validation du JWT
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Token invalide ou expiré. Reconnectez-vous.",
        )

    # Étape 4 — vérification que l'utilisateur existe toujours en base
    db = get_database()
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="Token corrompu.")

    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Utilisateur introuvable. Compte supprimé ?",
        )

    return user


# ── POST /auth/register ───────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(body: RegisterBody):
    """
    Crée un nouveau compte utilisateur.

    Étapes :
      1. Normalise l'email (minuscules + trim)
      2. Vérifie que l'email n'est pas déjà utilisé → HTTP 409 si oui
      3. Hache le mot de passe avec bcrypt (jamais stocké en clair)
      4. Insère le document user en MongoDB
      5. Génère un JWT et le retourne avec les infos user

    L'utilisateur est automatiquement connecté après inscription :
    on retourne le token directement, pas besoin d'un 2e appel /login.
    """
    db    = get_database()
    email = body.email.lower().strip()   # normalisation systématique

    # ── Unicité de l'email ────────────────────────────────────────────────────
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Cet email est déjà utilisé.")

    # ── Construction du document MongoDB ─────────────────────────────────────
    # IMPORTANT : on ne stocke JAMAIS le mot de passe en clair.
    # hash_password() applique bcrypt et génère un salt aléatoire.
    doc = {
        "first_name":      body.first_name.strip(),
        "last_name":       body.last_name.strip(),
        "phone":           body.phone.strip(),
        "email":           email,
        "hashed_password": hash_password(body.password),   # ← bcrypt
        "avatar":          body.avatar,
        "plate":           body.plate.strip(),
    }

    # ── Insertion en base et génération du token ──────────────────────────────
    result     = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    token      = create_token(str(result.inserted_id))

    return {"access_token": token, "user": _fmt(doc)}


# ── POST /auth/login ──────────────────────────────────────────────────────────

@router.post("/login")
async def login(body: LoginBody):
    """
    Vérifie les identifiants et retourne un JWT.

    Note de sécurité importante :
      On retourne toujours le MÊME message d'erreur ("Email ou mot de passe incorrect")
      que l'email soit inconnu OU que le mot de passe soit faux.
      Cela évite l'énumération des emails (attaque qui teste si un email existe).
    """
    db    = get_database()
    email = body.email.lower().strip()

    # ── Recherche de l'utilisateur ────────────────────────────────────────────
    user = await db.users.find_one({"email": email})

    # ── Vérification du mot de passe ──────────────────────────────────────────
    # On évalue verify_password même si user est None pour éviter les timing attacks.
    # Si user est None, verify_password retourne False directement.
    password_ok = user is not None and verify_password(
        body.password, user["hashed_password"]
    )

    if not user or not password_ok:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")

    token = create_token(str(user["_id"]))
    return {"access_token": token, "user": _fmt(user)}


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """
    Retourne le profil de l'utilisateur actuellement authentifié.

    Utilisé au démarrage de l'app pour :
      • Vérifier que le token sauvegardé dans SecureStore est encore valide
      • Rafraîchir les données du profil si elles ont changé côté serveur
    """
    return _fmt(user)