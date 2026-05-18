// src/layouts/ManagerLayout.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useManagerParking } from "../context/ManagerContext";

interface NavItem { path: string; icon: string; label: string; }

const NAV: NavItem[] = [
  { path: "/manager",              icon: "⬛", label: "Dashboard"    },
  { path: "/manager/parking",      icon: "🏢", label: "Mon Parking"  },
  { path: "/manager/reservations", icon: "📅", label: "Réservations" },
  { path: "/manager/livestream",   icon: "📷", label: "Caméra Live"  },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout }       = useAuth();
  const { parking }            = useManagerParking();
  const location               = useLocation();
  const navigate               = useNavigate();

  const activeNav = [...NAV].reverse().find(n => location.pathname.startsWith(n.path));

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
          <div style={s.logoBox}>P</div>
          <div>
            <div style={s.logoName}>Parkora</div>
            <div style={s.logoBadge}>Gestionnaire</div>
          </div>
        </div>

        <div style={s.divider} />

        {/* Parking assigné */}
        {parking && (
          <div style={s.parkingChip}>
            <div style={{
              ...s.parkingDot,
              background: parking.is_open ? "#22c55e" : "#ef4444",
              boxShadow:  parking.is_open
                ? "0 0 6px rgba(34,197,94,0.6)"
                : "0 0 6px rgba(239,68,68,0.6)",
            }} />
            <div style={s.parkingInfo}>
              <div style={s.parkingName}>{parking.name}</div>
              <div style={s.parkingStatus}>
                {parking.is_open ? "Ouvert" : "Fermé"} · {parking.total_spots} places
              </div>
            </div>
          </div>
        )}

        <div style={s.divider} />

        {/* Navigation */}
        <nav style={s.nav}>
          {NAV.map(item => {
            const active = location.pathname === item.path ||
              (item.path !== "/manager" && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}
                onClick={() => navigate(item.path)}
              >
                <span style={s.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
                {active && <div style={s.navDot} />}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />
        <div style={s.divider} />

        {/* User */}
        <div style={s.userSection}>
          <div style={s.userAvatar}>
            {user?.username?.[0]?.toUpperCase() ?? "G"}
          </div>
          <div style={s.userInfo}>
            <div style={s.userName}>{user?.username}</div>
            <div style={s.userRole}>Gestionnaire</div>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout} title="Déconnexion">⏏</button>
        </div>
      </aside>

      {/* ── Zone contenu ─────────────────────────────────────────────────── */}
      <div style={s.body}>
        <header style={s.header}>
          <div>
            <h1 style={s.pageTitle}>{activeNav?.label ?? "Gestionnaire"}</h1>
            <p style={s.pagePath}>{location.pathname}</p>
          </div>
          <div style={s.headerRight}>
            {parking && (
              <div style={{
                ...s.statusPill,
                background: parking.is_open ? "#0a1a0a" : "#1c0a0a",
                border:     `1px solid ${parking.is_open ? "#14532d" : "#7f1d1d"}`,
              }}>
                <span style={{
                  ...s.statusDot,
                  background:  parking.is_open ? "#22c55e" : "#ef4444",
                  animation:   parking.is_open ? "pulse 2s ease infinite" : "none",
                }} />
                <span style={{ color: parking.is_open ? "#4ade80" : "#f87171", fontSize: "12px", fontWeight: 600 }}>
                  {parking.is_open ? "Parking ouvert" : "Parking fermé"}
                </span>
              </div>
            )}
          </div>
        </header>
        <main style={s.main}>{children}</main>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        button:hover { filter: brightness(1.1); }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root:        { display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "#0f1117", fontFamily: "'DM Sans', system-ui, sans-serif" },
  sidebar:     { width: "240px", flexShrink: 0, background: "#111827", borderRight: "1px solid #1e2535", display: "flex", flexDirection: "column", padding: "20px 12px", gap: "4px", overflowY: "auto" },
  logoWrap:    { display: "flex", alignItems: "center", gap: "10px", padding: "4px 8px 16px" },
  logoBox:     { width: "36px", height: "36px", borderRadius: "10px", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 900, color: "#fff", flexShrink: 0, boxShadow: "0 0 16px rgba(5,150,105,0.3)" },
  logoName:    { fontSize: "16px", fontWeight: 700, color: "#f1f5f9" },
  logoBadge:   { fontSize: "10px", color: "#10b981", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" as const },
  divider:     { height: "1px", background: "#1e2535", margin: "8px 0" },
  parkingChip: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "#0a1a10", borderRadius: "10px", border: "1px solid #14532d" },
  parkingDot:  { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
  parkingInfo: { minWidth: 0 },
  parkingName: { fontSize: "12px", fontWeight: 700, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  parkingStatus:{ fontSize: "11px", color: "#4b5563", marginTop: "2px" },
  nav:         { display: "flex", flexDirection: "column", gap: "2px" },
  navItem:     { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "9px", border: "none", background: "transparent", color: "#6b7280", fontSize: "13px", fontWeight: 500, cursor: "pointer", textAlign: "left" as const, position: "relative", width: "100%", fontFamily: "inherit", transition: "all 0.15s" },
  navItemActive:{ background: "#0a2010", color: "#4ade80", fontWeight: 600 },
  navIcon:     { fontSize: "15px", width: "20px" },
  navDot:      { position: "absolute", right: "10px", width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" },
  userSection: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 8px" },
  userAvatar:  { width: "32px", height: "32px", borderRadius: "50%", background: "#0a2010", border: "1.5px solid #059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#4ade80", flexShrink: 0 },
  userInfo:    { flex: 1, minWidth: 0 },
  userName:    { fontSize: "13px", fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  userRole:    { fontSize: "11px", color: "#4b5563" },
  logoutBtn:   { background: "none", border: "none", color: "#4b5563", fontSize: "16px", cursor: "pointer", padding: "4px", borderRadius: "6px", flexShrink: 0 },
  body:        { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 },
  header:      { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid #1e2535", background: "#0f1117", flexShrink: 0 },
  pageTitle:   { fontSize: "20px", fontWeight: 700, color: "#f1f5f9" },
  pagePath:    { fontSize: "12px", color: "#374151", marginTop: "2px" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  statusPill:  { display: "flex", alignItems: "center", gap: "7px", borderRadius: "20px", padding: "6px 14px" },
  statusDot:   { width: "7px", height: "7px", borderRadius: "50%" },
  main:        { flex: 1, overflowY: "auto", padding: "28px 32px", animation: "fadeIn 0.3s ease both" },
};
