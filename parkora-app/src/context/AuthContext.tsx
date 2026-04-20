/**
 * src/context/AuthContext.tsx
 * ────────────────────────────
 * Le "cerveau" de l'authentification côté app.
 *
 * Ce Context expose à TOUS les écrans :
 *   • user      → les infos de l'utilisateur connecté (null si déconnecté)
 *   • token     → le JWT (null si déconnecté)
 *   • loading   → true pendant la restauration de session au démarrage
 *   • login()   → appelle POST /auth/login, sauvegarde le token
 *   • register()→ appelle POST /auth/register, sauvegarde le token
 *   • logout()  → efface tout du stockage sécurisé
 *
 * Stockage :
 *   expo-secure-store chiffre les données sur l'appareil
 *   (Keychain sur iOS, EncryptedSharedPreferences sur Android).
 *   C'est bien plus sûr que AsyncStorage qui stocke en clair.
 *
 * Utilisation dans n'importe quel écran :
 *   const { user, login, logout } = useAuth();
 */

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { BACKEND_URL } from "@/src/constants/config";

// ── Types ─────────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar: string; // emoji choisi lors de l'inscription
  plate: string;
};

export type RegisterData = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  password: string;
  avatar: string;
  plate?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
};

// ─────────────────────────────────────────────────────────────────────────────

// Clés utilisées dans expo-secure-store
// Les données sont stockées chiffrées sous ces noms sur l'appareil.
const TOKEN_KEY = "parkora_token";
const USER_KEY = "parkora_user";

// Le contexte — null par défaut, on lève une erreur si utilisé hors Provider
const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
// À placer une seule fois tout en haut de l'arbre de composants (dans _layout.tsx).
// Tous les enfants auront accès au contexte via useAuth().

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // true au démarrage

  // ── Restauration de session au démarrage ──────────────────────────────────
  // Quand l'app se lance, on cherche si un token est déjà sauvegardé.
  // Si oui → l'utilisateur reste connecté sans re-saisir ses identifiants.
  // C'est ce qui donne l'effet "l'app se souvient de moi".
  useEffect(() => {
    async function restoreSession() {
      try {
        // On lit le token ET les données user en parallèle (plus rapide)
        const [savedToken, savedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
        // Si l'un des deux est absent → l'utilisateur n'était pas connecté
      } catch {
        // Stockage corrompu → on repart de zéro proprement
        await _clearStorage();
      } finally {
        // loading passe à false → le Guard dans _layout.tsx peut décider
        // vers quel écran naviguer (sign-in ou tabs)
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  // ── Helpers internes ───────────────────────────────────────────────────────

  async function _saveSession(newToken: string, newUser: User) {
    // 1. Sauvegarde chiffrée sur l'appareil (persiste entre les sessions)
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, newToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser)),
    ]);
    // 2. Mise à jour du state React → tous les écrans abonnés re-renderent
    setToken(newToken);
    setUser(newUser);
  }

  async function _clearStorage() {
    // Supprime les deux clés du stockage sécurisé
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  }

  // ── login ─────────────────────────────────────────────────────────────────
  // Appelle POST /auth/login avec email + mot de passe.
  // En cas de succès → sauvegarde token + user et met à jour le state.
  // En cas d'erreur → propage l'exception pour que l'écran l'affiche.

  async function login(email: string, password: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      // Le backend a retourné une erreur (401 = mauvais identifiants, etc.)
      throw new Error(data.detail ?? "Connexion échouée");
    }

    await _saveSession(data.access_token, data.user);
    // Après _saveSession → user != null → le Guard redirige vers les tabs
  }

  // ── register ──────────────────────────────────────────────────────────────
  // Appelle POST /auth/register avec toutes les données du formulaire.
  // L'utilisateur est automatiquement connecté après inscription
  // (le backend retourne le token directement, pas besoin de se connecter ensuite).

  async function register(form: RegisterData): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      // Ex : HTTP 409 si l'email est déjà utilisé
      throw new Error(data.detail ?? "Inscription échouée");
    }

    await _saveSession(data.access_token, data.user);
    // Après _saveSession → user != null → le Guard redirige vers les tabs
  }

  // ── logout ────────────────────────────────────────────────────────────────
  // Efface tout du stockage sécurisé et remet le state à null.
  // Le Guard dans _layout.tsx détecte user === null et redirige vers sign-in.

  async function logout(): Promise<void> {
    await _clearStorage();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook d'accès ──────────────────────────────────────────────────────────────
// Lève une erreur claire si useAuth() est appelé hors de <AuthProvider>.

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error(
      "useAuth() doit être utilisé à l'intérieur de <AuthProvider>",
    );
  return ctx;
}
