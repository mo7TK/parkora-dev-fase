// src/layouts/AdminLayout.tsx
// Layout principal de la zone admin.
// Sidebar fixe 240px + zone contenu scrollable.

import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface NavItem {
  path:  string;
  icon:  string;
  label: string;
}

const NAV: NavItem[] = [
  { path: "/admin",           icon: "⬛", label: "Dashboard"      },
  { path: "/admin/parkings",  icon: "🏢", label: "Parkings"       },
  { path: "/admin/managers",  icon: "👔", label: "Gestionnaires"  },
  { path: "/admin/clients",   icon: "👤", label: "Clients"        },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();

  // Titre de la page active
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
            <div style={s.logoBadge}>Administration</div>
          </div>
        </div>

        <div style={s.sidebarDivider} />

        {/* Navigation */}
        <nav style={s.nav}>
          {NAV.map(item => {
            const active = location.pathname === item.path ||
              (item.path !== "/admin" && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}
                onClick={() => navigate(item.path)}
              >
                <span style={s.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
                {active && <div style={s.navActiveDot} />}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />
        <div style={s.sidebarDivider} />

        {/* User info + logout */}
        <div style={s.userSection}>
          <div style={s.userAvatar}>
            {user?.username?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div style={s.userInfo}>
            <div style={s.userName}>{user?.username}</div>
            <div style={s.userRole}>Administrateur</div>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout} title="Déconnexion">
            ⏏
          </button>
        </div>
      </aside>

      {/* ── Zone contenu ─────────────────────────────────────────────────── */}
      <div style={s.body}>

        {/* Header */}
        <header style={s.header}>
          <div>
            <h1 style={s.pageTitle}>{activeNav?.label ?? "Backoffice"}</h1>
            <p style={s.pagePath}>{location.pathname}</p>
          </div>
          <div style={s.headerRight}>
            <div style={s.liveIndicator}>
              <span style={s.liveDot} />
              <span style={s.liveText}>Système actif</span>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main style={s.main}>
          {children}
        </main>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        button:hover { filter: brightness(1.1); }
      `}</style>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: {
    display:   "flex",
    height:    "100vh",
    width:     "100vw",
    overflow:  "hidden",
    background: "#0f1117",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },

  // Sidebar
  sidebar: {
    width:         "240px",
    flexShrink:    0,
    background:    "#111827",
    borderRight:   "1px solid #1e2535",
    display:       "flex",
    flexDirection: "column",
    padding:       "20px 12px",
    gap:           "4px",
    overflowY:     "auto",
  },
  logoWrap: {
    display:    "flex",
    alignItems: "center",
    gap:        "10px",
    padding:    "4px 8px 16px",
  },
  logoBox: {
    width:          "36px",
    height:         "36px",
    borderRadius:   "10px",
    background:     "#1a73e8",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontSize:       "18px",
    fontWeight:     900,
    color:          "#fff",
    flexShrink:     0,
    boxShadow:      "0 0 16px rgba(26,115,232,0.3)",
  },
  logoName: {
    fontSize:   "16px",
    fontWeight: 700,
    color:      "#f1f5f9",
  },
  logoBadge: {
    fontSize:     "10px",
    color:        "#1a73e8",
    fontWeight:   600,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  sidebarDivider: {
    height:     "1px",
    background: "#1e2535",
    margin:     "8px 0",
  },
  nav: {
    display:       "flex",
    flexDirection: "column",
    gap:           "2px",
  },
  navItem: {
    display:       "flex",
    alignItems:    "center",
    gap:           "10px",
    padding:       "10px 12px",
    borderRadius:  "9px",
    border:        "none",
    background:    "transparent",
    color:         "#6b7280",
    fontSize:      "13px",
    fontWeight:    500,
    cursor:        "pointer",
    textAlign:     "left",
    position:      "relative",
    width:         "100%",
    fontFamily:    "inherit",
    transition:    "all 0.15s ease",
  },
  navItemActive: {
    background: "#1e2d47",
    color:      "#60a5fa",
    fontWeight: 600,
  },
  navIcon: {
    fontSize: "15px",
    width:    "20px",
  },
  navActiveDot: {
    position:     "absolute",
    right:        "10px",
    width:        "6px",
    height:       "6px",
    borderRadius: "50%",
    background:   "#1a73e8",
  },
  userSection: {
    display:    "flex",
    alignItems: "center",
    gap:        "10px",
    padding:    "10px 8px",
  },
  userAvatar: {
    width:          "32px",
    height:         "32px",
    borderRadius:   "50%",
    background:     "#1e2d47",
    border:         "1.5px solid #1a73e8",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontSize:       "13px",
    fontWeight:     700,
    color:          "#60a5fa",
    flexShrink:     0,
  },
  userInfo: {
    flex:    1,
    minWidth: 0,
  },
  userName: {
    fontSize:     "13px",
    fontWeight:   600,
    color:        "#f1f5f9",
    overflow:     "hidden",
    textOverflow: "ellipsis",
    whiteSpace:   "nowrap",
  },
  userRole: {
    fontSize: "11px",
    color:    "#4b5563",
  },
  logoutBtn: {
    background:   "none",
    border:       "none",
    color:        "#4b5563",
    fontSize:     "16px",
    cursor:       "pointer",
    padding:      "4px",
    borderRadius: "6px",
    transition:   "color 0.15s",
    flexShrink:   0,
  },

  // Corps
  body: {
    flex:          1,
    display:       "flex",
    flexDirection: "column",
    overflow:      "hidden",
    minWidth:      0,
  },
  header: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    padding:        "20px 32px",
    borderBottom:   "1px solid #1e2535",
    background:     "#0f1117",
    flexShrink:     0,
  },
  pageTitle: {
    fontSize:   "20px",
    fontWeight: 700,
    color:      "#f1f5f9",
  },
  pagePath: {
    fontSize:  "12px",
    color:     "#374151",
    marginTop: "2px",
  },
  headerRight: {
    display:    "flex",
    alignItems: "center",
    gap:        "12px",
  },
  liveIndicator: {
    display:      "flex",
    alignItems:   "center",
    gap:          "7px",
    background:   "#0a1a0a",
    border:       "1px solid #14532d",
    borderRadius: "20px",
    padding:      "6px 14px",
  },
  liveDot: {
    width:        "7px",
    height:       "7px",
    borderRadius: "50%",
    background:   "#22c55e",
    animation:    "pulse 2s ease infinite",
  },
  liveText: {
    fontSize:  "12px",
    color:     "#4ade80",
    fontWeight: 500,
  },
  main: {
    flex:       1,
    overflowY:  "auto",
    padding:    "28px 32px",
    animation:  "fadeIn 0.3s ease both",
  },
};
