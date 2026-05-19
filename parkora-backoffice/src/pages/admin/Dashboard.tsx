// src/pages/admin/Dashboard.tsx
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

  if (loading) return <Loader />;
  if (error) return <ErrorBox msg={error} />;

  const openLots = lots.filter((l) => l.is_open).length;
  const paidLots = lots.filter((l) => l.type === "paid").length;
  const withManager = lots.filter((l) => l.manager !== null).length;

  return (
    <div style={s.page}>
      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div style={s.statsGrid}>
        <StatCard
          icon={<IconBuilding />}
          label="Parkings"
          value={lots.length}
          sub={`${openLots} ouverts · ${paidLots} payants`}
          color="#1a73e8"
          onClick={() => navigate("/admin/parkings")}
        />
        <StatCard
          icon={<IconUsers />}
          label="Gestionnaires"
          value={managers.length}
          sub={`${withManager} parkings assignés`}
          color="#7c3aed"
          onClick={() => navigate("/admin/managers")}
        />
        <StatCard
          icon={<IconUser />}
          label="Clients"
          value={clients.length}
          sub="comptes app mobile"
          color="#059669"
          onClick={() => navigate("/admin/clients")}
        />
        <StatCard
          icon={<IconMap />}
          label="Couverture"
          value={`${withManager}/${lots.length}`}
          sub="parkings avec gestionnaire"
          color="#f59e0b"
        />
      </div>

      {/* ── Sections ─────────────────────────────────────────────────────── */}
      <div style={s.sectionsGrid}>
        {/* Parkings */}
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
            <Empty msg="Aucun parking créé." />
          ) : (
            lots.slice(0, 5).map((lot) => (
              <div key={lot.id} style={s.listRow}>
                <div style={s.listLeft}>
                  <div
                    style={{
                      ...s.typeDot,
                      background: lot.type === "paid" ? "#1a73e8" : "#059669",
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
                    background: lot.is_open ? "#f0fdf4" : "#fef2f2",
                    color: lot.is_open ? "#16a34a" : "#dc2626",
                    border: `1px solid ${lot.is_open ? "#bbf7d0" : "#fecaca"}`,
                  }}
                >
                  {lot.is_open ? "Ouvert" : "Fermé"}
                </span>
              </div>
            ))
          )}
          <button
            style={s.createBtn}
            onClick={() => navigate("/admin/create-parking")}
          >
            + Créer un parking
          </button>
        </div>

        {/* Gestionnaires */}
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
            <Empty msg="Aucun gestionnaire créé." />
          ) : (
            managers.slice(0, 5).map((m) => (
              <div key={m.id} style={s.listRow}>
                <div style={s.listLeft}>
                  <div style={s.avatar}>{m.username[0].toUpperCase()}</div>
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

// ── Icônes ────────────────────────────────────────────────────────────────────
const IconBuilding = () => (
  <svg
    width="22"
    height="22"
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
const IconUsers = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconUser = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconMap = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

// ── Sous-composants ───────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  onClick,
}: {
  icon: React.ReactNode;
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
      <div style={{ ...s.statIcon, background: color + "15", color }}>
        {icon}
      </div>
      <div>
        <div
          style={{ fontSize: "26px", fontWeight: 800, color, lineHeight: 1 }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "#1a1a2e",
            fontWeight: 600,
            marginTop: "3px",
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "24px",
        color: "#94a3b8",
        fontSize: "13px",
      }}
    >
      {msg}
    </div>
  );
}

export function PageLoader() {
  return (
    <div
      style={{ display: "flex", justifyContent: "center", paddingTop: "80px" }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          border: "3px solid #e2e8f0",
          borderTop: "3px solid #1a73e8",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Loader() {
  return <PageLoader />;
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div
      style={{
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "12px",
        padding: "16px 20px",
        color: "#ef4444",
        fontSize: "14px",
      }}
    >
      {msg}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "24px" },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
  },
  statCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  cardTitle: { fontSize: "14px", fontWeight: 700, color: "#1a1a2e" },
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
    borderBottom: "1px solid #f1f5f9",
  },
  listLeft: { display: "flex", alignItems: "center", gap: "10px" },
  listName: { fontSize: "13px", fontWeight: 600, color: "#1a1a2e" },
  listSub: { fontSize: "11px", color: "#94a3b8", marginTop: "1px" },
  typeDot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
  avatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "#e8f0fe",
    border: "1.5px solid #1a73e8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 700,
    color: "#1a73e8",
    flexShrink: 0,
  },
  badge: {
    fontSize: "11px",
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: "20px",
  },
  detailBtn: {
    background: "#f0f4f8",
    border: "none",
    borderRadius: "8px",
    color: "#64748b",
    fontSize: "12px",
    padding: "5px 12px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  createBtn: {
    marginTop: "12px",
    background: "none",
    border: "1px dashed #cbd5e1",
    borderRadius: "9px",
    color: "#94a3b8",
    fontSize: "13px",
    padding: "10px",
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
  },
};
