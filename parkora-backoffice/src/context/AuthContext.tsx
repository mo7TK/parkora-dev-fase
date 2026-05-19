// src/context/AuthContext.tsx
// Contexte d'authentification du backoffice Parkora.
// BACKEND_URL vient uniquement de src/config.ts — ne pas redéfinir ici.

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BackofficeUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.detail ?? "Connexion échouée");

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
