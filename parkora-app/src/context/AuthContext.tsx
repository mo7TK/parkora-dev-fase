/**
 * src/context/AuthContext.tsx
 * ────────────────────────────
 * Ajout de setUser pour permettre la mise à jour du profil depuis l'écran Profile.
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

export type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar: string;
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
  /** Met à jour le user dans le state ET dans SecureStore (après édition du profil) */
  setUser: (user: User) => Promise<void>;
};

const TOKEN_KEY = "parkora_token";
const USER_KEY = "parkora_user";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const [savedToken, savedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUserState(JSON.parse(savedUser));
        }
      } catch {
        await _clearStorage();
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  async function _saveSession(newToken: string, newUser: User) {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, newToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser)),
    ]);
    setToken(newToken);
    setUserState(newUser);
  }

  async function _clearStorage() {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  }

  async function login(email: string, password: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Connexion échouée");
    await _saveSession(data.access_token, data.user);
  }

  async function register(form: RegisterData): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Inscription échouée");
    await _saveSession(data.access_token, data.user);
  }

  async function logout(): Promise<void> {
    await _clearStorage();
    setToken(null);
    setUserState(null);
  }

  /** Mise à jour du profil après modification — persiste dans SecureStore */
  async function setUser(updated: User): Promise<void> {
    setUserState(updated);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error(
      "useAuth() doit être utilisé à l'intérieur de <AuthProvider>",
    );
  return ctx;
}
