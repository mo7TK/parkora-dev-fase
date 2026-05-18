// src/context/AuthContext.tsx
// Contexte d'authentification du backoffice Parkora.
//
// Stockage : localStorage (pas SecureStore — on est dans un navigateur web).
// Clés : "bo_token" et "bo_user"
//
// Expose :
//   user    → BackofficeUser (AdminUser | ManagerUser) ou null
//   token   → string JWT ou null
//   loading → true pendant la restauration depuis localStorage
//   login() → appelle /backoffice/admin/login ou /backoffice/manager/login
//   logout()→ efface localStorage + state

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import type { BackofficeUser, Role } from "../types/auth";

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND_IP  = import.meta.env.VITE_BACKEND_IP ?? "172.20.10.4";
export const BACKEND_URL = `http://${BACKEND_IP}:8000`;

const TOKEN_KEY = "bo_token";
const USER_KEY  = "bo_user";

// ── Types du contexte ─────────────────────────────────────────────────────────

interface AuthContextType {
  user: BackofficeUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<BackofficeUser | null>(null);
  const [token, setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Restauration de session au démarrage ──────────────────────────────────
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser  = localStorage.getItem(USER_KEY);
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser) as BackofficeUser);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── login ─────────────────────────────────────────────────────────────────
  // Choisit l'endpoint selon le rôle, puis sauvegarde token + user.

  async function login(
    username: string,
    password: string,
    role: Role,
  ): Promise<void> {
    const endpoint =
      role === "admin"
        ? `${BACKEND_URL}/backoffice/admin/login`
        : `${BACKEND_URL}/backoffice/manager/login`;

    const res = await fetch(endpoint, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail ?? "Connexion échouée");
    }

    // La réponse contient access_token + admin OU manager selon le rôle
    const newUser: BackofficeUser =
      role === "admin"
        ? { ...data.admin,   role: "admin"   as const }
        : { ...data.manager, role: "manager" as const };

    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY,  JSON.stringify(newUser));
    setToken(data.access_token);
    setUser(newUser);
  }

  // ── logout ────────────────────────────────────────────────────────────────

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

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() doit être dans <AuthProvider>");
  return ctx;
}
