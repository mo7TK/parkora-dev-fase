// src/layouts/ManagerLayout.tsx
// Layout gestionnaire — thème blanc/bleu identique à l'app mobile.

import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useManagerParking } from "../context/ManagerContext";

// Icônes SVG inline
const IconGrid = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);
const IconBuilding = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
const IconCalendar = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconCamera = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const IconLogOut = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const NAV = [
  { path: "/manager", label: "Dashboard", icon: <IconGrid /> },
  { path: "/manager/parking", label: "Mon Parking", icon: <IconBuilding /> },
  {
    path: "/manager/reservations",
    label: "Réservations",
    icon: <IconCalendar />,
  },
  { path: "/manager/livestream", label: "Caméra Live", icon: <IconCamera /> },
];

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const { parking } = useManagerParking();
  const location = useLocation();
  const navigate = useNavigate();

  const activeNav = [...NAV]
    .reverse()
    .find((n) => location.pathname.startsWith(n.path));

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div style={s.root}>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={s.sidebar}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <img src="/parkora-logo.png" alt="Parkora" style={s.logo} />
          <span style={s.logoBadge}>Gestionnaire</span>
        </div>

        <div style={s.divider} />

        {/* Parking assigné */}
        {parking && (
          <div style={s.parkingChip}>
            <div
              style={{
                ...s.parkingDot,
                background: parking.is_open ? "#22c55e" : "#ef4444",
              }}
            />
            <div style={s.parkingInfo}>
              <div style={s.parkingName}>{parking.name}</div>
              <div style={s.parkingStatus}>
                {parking.is_open ? "Ouvert" : "Fermé"} · {parking.total_spots}{" "}
                places
              </div>
            </div>
          </div>
        )}

        <div style={s.divider} />

        {/* Navigation */}
        <nav style={s.nav}>
          {NAV.map((item) => {
            const active =
              location.pathname === item.path ||
              (item.path !== "/manager" &&
                location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}
                onClick={() => navigate(item.path)}
              >
                <span style={{ color: active ? "#1a73e8" : "#94a3b8" }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {active && <div style={s.navDot} />}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />
        <div style={s.divider} />

        {/* User */}
        <div style={s.userRow}>
          <div style={s.userAvatar}>
            {user?.username?.[0]?.toUpperCase() ?? "G"}
          </div>
          <div style={s.userInfo}>
            <div style={s.userName}>{user?.username}</div>
            <div style={s.userRole}>Gestionnaire</div>
          </div>
          <button
            style={s.logoutBtn}
            onClick={handleLogout}
            title="Déconnexion"
          >
            <IconLogOut />
          </button>
        </div>
      </aside>

      {/* ── Zone contenu ─────────────────────────────────────────────────── */}
      <div style={s.body}>
        <header style={s.header}>
          <div>
            <h1 style={s.pageTitle}>{activeNav?.label ?? "Gestionnaire"}</h1>
            <p style={s.pagePath}>{location.pathname}</p>
          </div>
          {parking && (
            <div
              style={{
                ...s.statusPill,
                background: parking.is_open ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${parking.is_open ? "#bbf7d0" : "#fecaca"}`,
              }}
            >
              <div
                style={{
                  ...s.statusDot,
                  background: parking.is_open ? "#22c55e" : "#ef4444",
                }}
              />
              <span
                style={{
                  color: parking.is_open ? "#16a34a" : "#dc2626",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                {parking.is_open ? "Parking ouvert" : "Parking fermé"}
              </span>
            </div>
          )}
        </header>
        <main style={s.main}>{children}</main>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        button:hover { opacity: 0.85; }
        button { transition: opacity 0.15s; }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    background: "#f0f4f8",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  sidebar: {
    width: "240px",
    flexShrink: 0,
    background: "#fff",
    borderRight: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    padding: "20px 12px",
    gap: "4px",
    overflowY: "auto",
  },
  logoWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    padding: "4px 8px 16px",
  },
  logo: { width: "130px", height: "auto" },
  logoBadge: {
    fontSize: "10px",
    color: "#1a73e8",
    fontWeight: 700,
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
    marginLeft: "2px",
  },
  divider: { height: "1px", background: "#e2e8f0", margin: "8px 0" },
  parkingChip: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    background: "#f0f4f8",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  parkingDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  parkingInfo: { minWidth: 0 },
  parkingName: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#1a1a2e",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  parkingStatus: { fontSize: "11px", color: "#94a3b8", marginTop: "2px" },
  nav: { display: "flex", flexDirection: "column", gap: "2px" },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "left" as const,
    position: "relative",
    width: "100%",
    fontFamily: "inherit",
  },
  navItemActive: { background: "#e8f0fe", color: "#1a73e8", fontWeight: 700 },
  navDot: {
    position: "absolute",
    right: "10px",
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#1a73e8",
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 8px",
  },
  userAvatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#e8f0fe",
    border: "2px solid #1a73e8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
    color: "#1a73e8",
    flexShrink: 0,
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#1a1a2e",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  userRole: { fontSize: "11px", color: "#94a3b8" },
  logoutBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  body: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minWidth: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 32px",
    borderBottom: "1px solid #e2e8f0",
    background: "#fff",
    flexShrink: 0,
  },
  pageTitle: { fontSize: "20px", fontWeight: 700, color: "#1a1a2e" },
  pagePath: { fontSize: "12px", color: "#94a3b8", marginTop: "2px" },
  statusPill: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    borderRadius: "20px",
    padding: "6px 14px",
  },
  statusDot: { width: "7px", height: "7px", borderRadius: "50%" },
  main: { flex: 1, overflowY: "auto", padding: "28px 32px" },
};
