// src/layouts/AdminLayout.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutGrid,
  SquareParking,
  Users,
  UserStar,
  LogOut,
} from "lucide-react";

const NAV = [
  { path: "/admin", label: "Dashboard", icon: <LayoutGrid size={18} /> },
  {
    path: "/admin/parkings",
    label: "Parkings",
    icon: <SquareParking size={18} />,
  },
  {
    path: "/admin/managers",
    label: "Gestionnaires",
    icon: <UserStar size={18} />,
  },
  { path: "/admin/clients", label: "Clients", icon: <Users size={18} /> },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeNav = [...NAV]
    .reverse()
    .find((n) => location.pathname.startsWith(n.path));

  function handleLogout() {
    logout();
    navigate("/login/admin", { replace: true });
  }

  return (
    <div style={s.root}>
      <aside style={s.sidebar}>
        <div style={s.logoWrap}>
          <img src="/parkora-logo.png" alt="Parkora" style={s.logo} />
          <span style={s.logoBadge}>Administration</span>
        </div>

        <div style={s.divider} />

        <nav style={s.nav}>
          {NAV.map((item) => {
            const active =
              location.pathname === item.path ||
              (item.path !== "/admin" &&
                location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}
                onClick={() => navigate(item.path)}
              >
                <span
                  style={{
                    color: active ? "#1a73e8" : "#94a3b8",
                    display: "flex",
                  }}
                >
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

        <div style={s.userRow}>
          <div style={s.userAvatar}>
            {user?.username?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div style={s.userInfo}>
            <div style={s.userName}>{user?.username}</div>
            <div style={s.userRole}>Administrateur</div>
          </div>
          <button
            style={s.logoutBtn}
            onClick={handleLogout}
            title="Déconnexion"
          >
            <LogOut size={18} color="#94a3b8" />
          </button>
        </div>
      </aside>

      <div style={s.body}>
        <header style={s.header}>
          <div>
            <h1 style={s.pageTitle}>{activeNav?.label ?? "Backoffice"}</h1>
            <p style={s.pagePath}>{location.pathname}</p>
          </div>
        </header>
        <main style={s.main}>{children}</main>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} button:hover{opacity:.85} button{transition:opacity .15s}`}</style>
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
  main: { flex: 1, overflowY: "auto", padding: "28px 32px" },
};
