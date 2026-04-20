"""
utils/security.py
─────────────────
Deux responsabilités :
  1. Hachage des mots de passe avec bcrypt (via passlib)
  2. Création et décodage des tokens JWT (via python-jose)

Pourquoi séparer ça ici ?
  → Aucun fichier route n'a besoin de connaître l'algo de hachage
    ou la clé secrète JWT. On importe juste les fonctions dont on a besoin.
"""

from datetime import datetime, timedelta, timezone
import os
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

# ── Configuration JWT ─────────────────────────────────────────────────────────
# JWT_SECRET est lu depuis le fichier .env
# La valeur par défaut est UNIQUEMENT pour le développement local.
# En production, génère une vraie clé avec :
#   python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET    = os.getenv("JWT_SECRET", "fallback-secret")
JWT_ALGORITHM = "HS256"
JWT_DAYS      = 30   # le token est valide 30 jours — l'utilisateur reste connecté
# ─────────────────────────────────────────────────────────────────────────────

# ── Contexte bcrypt ───────────────────────────────────────────────────────────
# passlib gère automatiquement le "salt" et le facteur de coût.
# deprecated="auto" : si un hash ancien est trouvé, passlib le re-hashe
# automatiquement lors de la prochaine connexion.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# ─────────────────────────────────────────────────────────────────────────────


# ── Mots de passe ─────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """
    Transforme un mot de passe en clair en hash bcrypt.
    Exemple : "monMotDePasse" → "$2b$12$..."

    On stocke uniquement le hash en base, JAMAIS le mot de passe en clair.
    bcrypt est irréversible : impossible de retrouver le mot de passe depuis le hash.
    """
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """
    Compare un mot de passe en clair avec son hash stocké en DB.
    Retourne True si c'est le bon mot de passe, False sinon.

    passlib s'occupe du timing constant pour éviter les timing attacks
    (une attaque qui devine si un email existe selon le temps de réponse).
    """
    return pwd_context.verify(plain, hashed)


# ── Tokens JWT ────────────────────────────────────────────────────────────────

def create_token(user_id: str) -> str:
    """
    Crée un token JWT signé qui contient l'id MongoDB de l'utilisateur.

    Structure du payload JWT :
      sub (subject) → l'id de l'utilisateur (convention standard JWT)
      exp (expiry)  → date d'expiration (vérifiée automatiquement par jose)

    Le token est signé avec JWT_SECRET → impossible à falsifier sans la clé.
    Le client reçoit ce token et l'envoie dans chaque requête protégée via :
      Authorization: Bearer <token>
    """
    expire  = datetime.now(timezone.utc) + timedelta(days=JWT_DAYS)
    payload = {
        "sub": user_id,   # subject = identifiant de l'utilisateur
        "exp": expire,    # expiry  = date d'expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> str | None:
    """
    Vérifie et décode un token JWT.

    Retourne l'user_id (sub) si le token est valide et non expiré.
    Retourne None si le token est invalide, falsifié ou expiré.

    python-jose vérifie automatiquement :
      • la signature  (le token n'a pas été falsifié)
      • l'expiration  (le token n'est pas périmé)
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        # Token invalide, falsifié ou expiré → on retourne None
        # La route appelante lèvera un HTTP 401
        return None