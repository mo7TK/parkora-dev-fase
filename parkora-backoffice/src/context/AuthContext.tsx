// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { BackofficeUser, Role } from "../types/auth";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;
const TOKEN_KEY = "bo_token";
const USER_KEY = "bo_user";

interface AuthContextType {
  user: BackofficeUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Traduit les messages d'erreur techniques en phrases lisibles. */
function friendlyError(raw: string): string {
  const msg = raw.toLowerCase();

  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network")
  )
    return "Impossible de joindre le serveur. Vérifiez votre connexion internet.";
  if (msg.includes("load failed") || msg.includes("fetch"))
    return "La connexion au serveur a échoué. Réessayez dans quelques instants.";
  if (msg.includes("timeout"))
    return "Le serveur met trop de temps à répondre. Réessayez plus tard.";
  if (
    msg.includes("401") ||
    msg.includes("incorrect") ||
    msg.includes("invalide")
  )
    return "Nom d'utilisateur ou mot de passe incorrect.";
  if (msg.includes("403"))
    return "Vous n'avez pas l'autorisation d'accéder à cet espace.";
  if (msg.includes("404"))
    return "Le service demandé est introuvable. Contactez l'administrateur.";
  if (msg.includes("500") || msg.includes("serveur"))
    return "Une erreur s'est produite côté serveur. Réessayez ou contactez le support.";
  if (msg.includes("connexion échouée"))
    return "La connexion a échoué. Vérifiez vos identifiants et réessayez.";

  // Si le message vient déjà du backend (en français), on le garde tel quel.
  return raw;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<BackofficeUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as BackofficeUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if ((savedToken && !savedUser) || (!savedToken && savedUser)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      Promise.resolve().then(() => {
        setToken(null);
        setUser(null);
        setLoading(false);
      });
    }
  }, []);

  async function login(
    username: string,
    password: string,
    role: Role,
  ): Promise<void> {
    const endpoint =
      role === "admin"
        ? `${BACKEND_URL}/backoffice/admin/login`
        : `${BACKEND_URL}/backoffice/manager/login`;

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Erreur réseau";
      throw new Error(friendlyError(raw));
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(friendlyError(data.detail ?? "Connexion échouée"));
    }

    const newUser: BackofficeUser =
      role === "admin"
        ? { ...data.admin, role: "admin" as const }
        : { ...data.manager, role: "manager" as const };

    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(data.access_token);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() doit être dans <AuthProvider>");
  return ctx;
}
