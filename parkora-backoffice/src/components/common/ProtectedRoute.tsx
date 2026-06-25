// src/components/common/ProtectedRoute.tsx
// Garde de navigation basé sur le rôle.
//
// Utilisation dans App.tsx :
//   <ProtectedRoute role="admin">
//     <AdminDashboard />
//   </ProtectedRoute>
//
//   <ProtectedRoute role="manager">
//     <ManagerDashboard />
//   </ProtectedRoute>
//
// Comportement :
//   • loading → spinner centré
//   • non connecté → redirect /login
//   • mauvais rôle → redirect /login (avec message dans le state)
//   • OK → affiche le children

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../types/auth";

interface Props {
  role: Role;
  children: React.ReactNode;
}

export default function ProtectedRoute({ role, children }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // ── Spinner pendant la restauration de session ────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#0f1117",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid #1e2535",
            borderTop: "3px solid #1a73e8",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Non connecté ──────────────────────────────────────────────────────────
  if (!user) {
    return <Navigate to="/login" state={{ from: location, role }} replace />;
  }

  // ── Mauvais rôle ──────────────────────────────────────────────────────────
  if (user.role !== role) {
    return (
      <Navigate
        to="/login"
        state={{ from: location, role, wrongRole: true }}
        replace
      />
    );
  }

  return <>{children}</>;
}
