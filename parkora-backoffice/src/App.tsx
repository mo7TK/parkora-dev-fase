// src/App.tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ManagerProvider } from "./context/ManagerContext";
import ProtectedRoute from "./components/common/ProtectedRoute";

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginAdmin from "./pages/LoginAdmin";
import LoginManager from "./pages/LoginManager";

// ── Layouts ───────────────────────────────────────────────────────────────────
import AdminLayout from "./layouts/AdminLayout";
import ManagerLayout from "./layouts/ManagerLayout";

// ── Pages admin ───────────────────────────────────────────────────────────────
import Dashboard from "./pages/admin/Dashboard";
import ParkingsList from "./pages/admin/ParkingsList";
import CreateParking from "./pages/admin/CreateParking";
import ManagersList from "./pages/admin/ManagersList";
import ManagerDetails from "./pages/admin/ManagerDetails";
import ClientsList from "./pages/admin/ClientsList";
import ClientDetails from "./pages/admin/ClientDetails";

// ── Pages manager ─────────────────────────────────────────────────────────────
import ManagerDashboard from "./pages/manager/Dashboard";
import ParkingSettings from "./pages/manager/ParkingSettings";
import Reservations from "./pages/manager/Reservations";
import LiveStream from "./pages/manager/LiveStream";

// ── Redirect racine ───────────────────────────────────────────────────────────

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login/admin" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/manager" replace />;
}

// ── Wrapper manager ───────────────────────────────────────────────────────────

function ManagerGuard({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute role="manager">
      <ManagerProvider>
        <ManagerLayout>{children}</ManagerLayout>
      </ManagerProvider>
    </ProtectedRoute>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ───────────────────────────────────────────────────── */}
        <Route path="/login" element={<Navigate to="/login/admin" replace />} />
        <Route path="/login/admin" element={<LoginAdmin />} />
        <Route path="/login/manager" element={<LoginManager />} />
        <Route path="/" element={<RootRedirect />} />

        {/* ── Admin ────────────────────────────────────────────────────── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout>
                <Dashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/parkings"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout>
                <ParkingsList />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/create-parking"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout>
                <CreateParking />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/managers"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout>
                <ManagersList />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/managers/:id"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout>
                <ManagerDetails />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/clients"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout>
                <ClientsList />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/clients/:id"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout>
                <ClientDetails />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* ── Manager ──────────────────────────────────────────────────── */}
        <Route
          path="/manager"
          element={
            <ManagerGuard>
              <ManagerDashboard />
            </ManagerGuard>
          }
        />
        <Route
          path="/manager/parking"
          element={
            <ManagerGuard>
              <ParkingSettings />
            </ManagerGuard>
          }
        />
        <Route
          path="/manager/reservations"
          element={
            <ManagerGuard>
              <Reservations />
            </ManagerGuard>
          }
        />
        <Route
          path="/manager/livestream"
          element={
            <ManagerGuard>
              <LiveStream />
            </ManagerGuard>
          }
        />

        {/* ── 404 ──────────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
