// src/context/ManagerContext.tsx
// Charge le parking assigné une seule fois à la connexion du gestionnaire
// et le partage à toutes les pages via useManagerParking().

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { managerApi, type ManagedParking } from "../api/managerApi";

interface ManagerContextType {
  parking: ManagedParking | null;
  loading: boolean;
  error:   string;
  refresh: () => void;
}

const Ctx = createContext<ManagerContextType | null>(null);

export function ManagerProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();

  const [parking, setParking] = useState<ManagedParking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [tick,    setTick]    = useState(0);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    managerApi.getMyParking(token)
      .then(setParking)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, tick]);

  const refresh = () => setTick(t => t + 1);

  return (
    <Ctx.Provider value={{ parking, loading, error, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useManagerParking(): ManagerContextType {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useManagerParking() doit être dans <ManagerProvider>");
  return ctx;
}
