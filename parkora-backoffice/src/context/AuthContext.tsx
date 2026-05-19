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

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialise directly from localStorage — no effect needed for this.
  // This avoids the "setState synchronously inside useEffect" warning while
  // keeping the component synchronously hydrated on first render.
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

  // loading is only true long enough for an in-progress async restore;
  // since we now read localStorage synchronously, we can start as false.
  const [loading, setLoading] = useState(false);

  // If somehow the saved data is corrupted, clear it once on mount.
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if ((savedToken && !savedUser) || (!savedToken && savedUser)) {
      // Inconsistent state — clear everything
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      // Use a microtask so we're outside the effect body when calling setState
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
