// src/pages/admin/Dashboard.tsx
// Dashboard principal de l'admin — stats globales + accès rapides.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  adminApi,
  type ParkingLot,
  type Manager,
  type Client,
} from "../../api/adminApi";

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([
      adminApi.getParkings(token),
      adminApi.getManagers(token),
      adminApi.getClients(token),
    ])
      .then(([l, m, c]) => {
        setLots(l);
        setManagers(m);
        setClients(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorBanner msg={error} />;

  const openLots = lots.filter((l) => l.is_open).length;
  const paidLots = lots.filter((l) => l.type === "paid").length;
  const withManager = lots.filter((l) => l.manager !== null).length;

  return (
    <div style={s.page}>
      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div style={s.statsGrid}>
        <StatCard
          icon="🏢"
          label="Parkings"
          value={lots.length}
          sub={`${openLots} ouverts · ${paidLots} payants`}
          color="#1a73e8"
          onClick={() => navigate("/admin/parkings")}
        />
        <StatCard
          icon="👔"
          label="Gestionnaires"
          value={managers.length}
          sub={`${withManager} parkings assignés`}
          color="#8b5cf6"
          onClick={() => navigate("/admin/managers")}
        />
        <StatCard
          icon="👤"
          label="Clients"
          value={clients.length}
          sub="comptes app mobile"
          color="#10b981"
          onClick={() => navigate("/admin/clients")}
        />
        <StatCard
          icon="📍"
          label="Couverture"
          value={`${withManager}/${lots.length}`}
          sub="parkings avec gestionnaire"
          color="#f59e0b"
        />
      </div>

      {/* ── Sections rapides ─────────────────────────────────────────────── */}
      <div style={s.sectionsGrid}>
        {/* Parkings récents */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Parkings</span>
            <button
              style={s.cardLink}
              onClick={() => navigate("/admin/parkings")}
            >
              Voir tout →
            </button>
          </div>
          {lots.length === 0 ? (
            <EmptyState msg="Aucun parking créé." />
          ) : (
            lots.slice(0, 5).map((lot) => (
              <div key={lot.id} style={s.listRow}>
                <div style={s.listLeft}>
                  <div
                    style={{
                      ...s.typeDot,
                      background: lot.type === "paid" ? "#1a73e8" : "#10b981",
                    }}
                  />
                  <div>
                    <div style={s.listName}>{lot.name}</div>
                    <div style={s.listSub}>
                      {lot.total_spots} places · {lot.address || "—"}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    ...s.badge,
                    background: lot.is_open ? "#0a1a0a" : "#1c0a0a",
                    color: lot.is_open ? "#4ade80" : "#f87171",
                    border: `1px solid ${lot.is_open ? "#14532d" : "#7f1d1d"}`,
                  }}
                >
                  {lot.is_open ? "Ouvert" : "Fermé"}
                </span>
              </div>
            ))
          )}
          <button
            style={s.createBtn}
            onClick={() => navigate("/admin/parkings")}
          >
            + Créer un parking
          </button>
        </div>

        {/* Gestionnaires récents */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Gestionnaires</span>
            <button
              style={s.cardLink}
              onClick={() => navigate("/admin/managers")}
            >
              Voir tout →
            </button>
          </div>
          {managers.length === 0 ? (
            <EmptyState msg="Aucun gestionnaire créé." />
          ) : (
            managers.slice(0, 5).map((m) => (
              <div key={m.id} style={s.listRow}>
                <div style={s.listLeft}>
                  <div style={s.managerAvatar}>
                    {m.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={s.listName}>{m.username}</div>
                    <div style={s.listSub}>{m.assigned_lot_name}</div>
                  </div>
                </div>
                <button
                  style={s.detailBtn}
                  onClick={() => navigate(`/admin/managers/${m.id}`)}
                >
                  Détails
                </button>
              </div>
            ))
          )}
          <button
            style={s.createBtn}
            onClick={() => navigate("/admin/managers")}
          >
            + Créer un gestionnaire
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  onClick,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      style={{ ...s.statCard, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      <div style={{ ...s.statIcon, background: color + "18", color }}>
        {icon}
      </div>
      <div>
        <div style={{ ...s.statValue, color }}>{value}</div>
        <div style={s.statLabel}>{label}</div>
        <div style={s.statSub}>{sub}</div>
      </div>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "24px",
        color: "#4b5563",
        fontSize: "13px",
      }}
    >
      {msg}
    </div>
  );
}

function PageLoader() {
  return (
    <div
      style={{ display: "flex", justifyContent: "center", paddingTop: "80px" }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          border: "3px solid #1e2535",
          borderTop: "3px solid #1a73e8",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div
      style={{
        background: "#1c0a0a",
        border: "1px solid #7f1d1d",
        borderRadius: "12px",
        padding: "16px 20px",
        color: "#fca5a5",
        fontSize: "14px",
      }}
    >
      ⛔ {msg}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "24px" },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
  },
  statCard: {
    background: "#161b27",
    border: "1px solid #1e2535",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    transition: "border-color 0.2s",
  },
  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    flexShrink: 0,
  },
  statValue: {
    fontSize: "26px",
    fontWeight: 800,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: "13px",
    color: "#9ca3af",
    fontWeight: 600,
    marginTop: "3px",
  },
  statSub: {
    fontSize: "11px",
    color: "#4b5563",
    marginTop: "2px",
  },

  sectionsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  card: {
    background: "#161b27",
    border: "1px solid #1e2535",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  cardTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#f1f5f9",
  },
  cardLink: {
    background: "none",
    border: "none",
    color: "#1a73e8",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "inherit",
  },

  listRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #1e2535",
  },
  listLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  listName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#f1f5f9",
  },
  listSub: {
    fontSize: "11px",
    color: "#4b5563",
    marginTop: "1px",
  },
  typeDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  managerAvatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "#1e2d47",
    border: "1.5px solid #1a73e8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 700,
    color: "#60a5fa",
    flexShrink: 0,
  },
  badge: {
    fontSize: "11px",
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: "20px",
  },
  detailBtn: {
    background: "#1e2535",
    border: "none",
    borderRadius: "7px",
    color: "#9ca3af",
    fontSize: "12px",
    padding: "5px 12px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  createBtn: {
    marginTop: "12px",
    background: "none",
    border: "1px dashed #1e2535",
    borderRadius: "9px",
    color: "#4b5563",
    fontSize: "13px",
    padding: "10px",
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
    transition: "all 0.15s",
  },
};
