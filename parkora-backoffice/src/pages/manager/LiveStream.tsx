// src/pages/manager/LiveStream.tsx
import { useEffect, useRef, useState } from "react";
import { useManagerParking } from "../../context/ManagerContext";

const WS_URL = import.meta.env.VITE_WS_URL as string;

type SpotStatus = "free" | "occupied" | "reserved";
type ConnStatus = "connecting" | "connected" | "disconnected";
interface Spot {
  id: number;
  status: SpotStatus;
}

const STATUS: Record<SpotStatus, { color: string; bg: string; label: string }> =
  {
    free: { color: "#22c55e", bg: "#f0fdf4", label: "Libre" },
    occupied: { color: "#ef4444", bg: "#fef2f2", label: "Occupé" },
    reserved: { color: "#f97316", bg: "#fff7ed", label: "Réservé" },
  };

export default function LiveStream() {
  const { parking, loading } = useManagerParking();

  const [spots, setSpots] = useState<Spot[]>([]);
  const [connStatus, setConnStatus] = useState<ConnStatus>("connecting");
  const [lastUpdate, setLastUpdate] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!parking?.id) return;

    function connect() {
      setConnStatus("connecting");
      const ws = new WebSocket(`${WS_URL}/${parking!.id}`);
      wsRef.current = ws;
      ws.onopen = () => setConnStatus("connected");
      ws.onmessage = (e) => {
        setSpots(JSON.parse(e.data).spots ?? []);
        setLastUpdate(new Date().toLocaleTimeString("fr-FR"));
      };
      ws.onclose = () => {
        setConnStatus("disconnected");
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    }
    connect();
    return () => wsRef.current?.close();
  }, [parking?.id]);

  if (loading) return <Loader />;
  if (!parking)
    return <div style={{ color: "#ef4444" }}>Parking introuvable.</div>;

  const free = spots.filter((s) => s.status === "free").length;
  const occupied = spots.filter((s) => s.status === "occupied").length;
  const reserved = spots.filter((s) => s.status === "reserved").length;
  const total = spots.length || parking.total_spots;

  const connColor = {
    connecting: "#f59e0b",
    connected: "#22c55e",
    disconnected: "#ef4444",
  }[connStatus];
  const connBg = {
    connecting: "#fef9c3",
    connected: "#f0fdf4",
    disconnected: "#fef2f2",
  }[connStatus];
  const connBorder = {
    connecting: "#fde68a",
    connected: "#bbf7d0",
    disconnected: "#fecaca",
  }[connStatus];
  const connLabel = {
    connecting: "Connexion…",
    connected: "En direct",
    disconnected: "Déconnecté — reconnexion dans 3s",
  }[connStatus];

  return (
    <div style={s.page}>
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Caméra Live</h2>
          <p style={s.pageSub}>{parking.name} — détection YOLO en temps réel</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {lastUpdate && (
            <span style={s.lastUpdate}>Mis à jour à {lastUpdate}</span>
          )}
          <div
            style={{
              ...s.connPill,
              background: connBg,
              border: `1px solid ${connBorder}`,
            }}
          >
            <div style={{ ...s.connDot, background: connColor }} />
            <span
              style={{ color: connColor, fontSize: "12px", fontWeight: 600 }}
            >
              {connLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div style={s.statsRow}>
        {(["free", "occupied", "reserved"] as SpotStatus[]).map((st) => {
          const cfg = STATUS[st];
          const count = spots.filter((s) => s.status === st).length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div
              key={st}
              style={{ ...s.statCard, borderColor: cfg.color + "55" }}
            >
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  color: cfg.color,
                  lineHeight: 1,
                }}
              >
                {count}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  fontWeight: 600,
                  marginTop: "4px",
                }}
              >
                {cfg.label}
              </div>
              <div
                style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}
              >
                {pct}% des places
              </div>
            </div>
          );
        })}
        <div style={s.statCard}>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "#1a1a2e",
              lineHeight: 1,
            }}
          >
            {total}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#64748b",
              fontWeight: 600,
              marginTop: "4px",
            }}
          >
            Total
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
            places configurées
          </div>
        </div>
      </div>

      {/* ── Barre globale ────────────────────────────────────────────────── */}
      {spots.length > 0 && (
        <div style={s.barCard}>
          <div style={s.barHeader}>
            <span style={s.barTitle}>Occupation globale</span>
            <span style={{ fontSize: "13px", color: "#94a3b8" }}>
              {occupied + reserved} / {total} places utilisées
            </span>
          </div>
          <div style={s.barTrack}>
            <div
              style={{
                ...s.barSeg,
                width: `${(free / total) * 100}%`,
                background: "#22c55e",
              }}
            />
            <div
              style={{
                ...s.barSeg,
                width: `${(reserved / total) * 100}%`,
                background: "#f97316",
              }}
            />
            <div
              style={{
                ...s.barSeg,
                width: `${(occupied / total) * 100}%`,
                background: "#ef4444",
              }}
            />
          </div>
          <div style={s.barLegend}>
            {[
              { color: "#22c55e", label: `Libres (${free})` },
              { color: "#f97316", label: `Réservés (${reserved})` },
              { color: "#ef4444", label: `Occupés (${occupied})` },
            ].map((l) => (
              <div
                key={l.label}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "2px",
                    background: l.color,
                  }}
                />
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  {l.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Grille des spots ─────────────────────────────────────────────── */}
      <div style={s.gridCard}>
        <div style={s.gridHeader}>
          <span style={s.gridTitle}>Vue par emplacement</span>
          <div style={s.gridLegend}>
            {(["free", "occupied", "reserved"] as SpotStatus[]).map((st) => (
              <div
                key={st}
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: STATUS[st].color,
                  }}
                />
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  {STATUS[st].label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {spots.length === 0 ? (
          <div style={s.waitingBox}>
            <div style={s.waitingSpinner} />
            <div>
              <p style={s.waitingTitle}>En attente des données caméra…</p>
              <p style={s.waitingHint}>
                Assurez-vous que <code style={s.code}>detect.py</code> tourne
                avec le bon <code style={s.code}>PARKING_LOT_ID</code>.
              </p>
            </div>
          </div>
        ) : (
          <div style={s.spotsGrid}>
            {spots.map((spot) => {
              const cfg = STATUS[spot.status] ?? STATUS.free;
              return (
                <div
                  key={spot.id}
                  style={{
                    ...s.spotCard,
                    background: cfg.bg,
                    borderColor: cfg.color + "55",
                  }}
                >
                  <div style={{ ...s.spotDot, background: cfg.color }} />
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 800,
                      color: cfg.color,
                      lineHeight: 1,
                    }}
                  >
                    {spot.id}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: cfg.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {cfg.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Loader() {
  return (
    <div
      style={{ display: "flex", justifyContent: "center", paddingTop: "60px" }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
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

const s: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "20px" },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pageTitle: { fontSize: "22px", fontWeight: 700, color: "#1a1a2e" },
  pageSub: { fontSize: "13px", color: "#94a3b8", marginTop: "3px" },
  lastUpdate: { fontSize: "12px", color: "#94a3b8" },
  connPill: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    borderRadius: "20px",
    padding: "7px 14px",
  },
  connDot: { width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0 },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "14px",
  },
  statCard: {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  barCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  barHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  barTitle: { fontSize: "14px", fontWeight: 700, color: "#1a1a2e" },
  barTrack: {
    height: "8px",
    borderRadius: "4px",
    background: "#f0f4f8",
    display: "flex",
    overflow: "hidden",
  },
  barSeg: { height: "100%", transition: "width 0.5s ease" },
  barLegend: { display: "flex", gap: "20px" },
  gridCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    overflow: "hidden",
  },
  gridHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px",
    borderBottom: "1px solid #f1f5f9",
    background: "#f8fafc",
  },
  gridTitle: { fontSize: "13px", fontWeight: 700, color: "#1a1a2e" },
  gridLegend: { display: "flex", gap: "16px" },
  waitingBox: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "40px 24px",
  },
  waitingSpinner: {
    width: "32px",
    height: "32px",
    border: "3px solid #e2e8f0",
    borderTop: "3px solid #1a73e8",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  waitingTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#1a1a2e",
    marginBottom: "6px",
  },
  waitingHint: { fontSize: "13px", color: "#94a3b8", lineHeight: "1.7" },
  code: {
    background: "#f0f4f8",
    borderRadius: "4px",
    padding: "1px 6px",
    fontSize: "12px",
    fontFamily: "monospace",
    color: "#1a73e8",
  },
  spotsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
    gap: "12px",
    padding: "20px",
  },
  spotCard: {
    borderRadius: "12px",
    border: "1.5px solid",
    padding: "14px 10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    position: "relative",
  },
  spotDot: {
    position: "absolute",
    top: "8px",
    right: "8px",
    width: "7px",
    height: "7px",
    borderRadius: "50%",
  },
};
