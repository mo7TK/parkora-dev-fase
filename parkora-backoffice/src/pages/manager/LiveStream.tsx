// src/pages/manager/LiveStream.tsx
// Visualisation temps réel des places de parking via WebSocket.
// Affiche une grille de spots colorés + stats + statut de connexion.

import { useEffect, useRef, useState } from "react";
import { useManagerParking } from "../../context/ManagerContext";
import { BACKEND_URL } from "../../config";

type SpotStatus = "free" | "occupied" | "reserved";
type ConnStatus = "connecting" | "connected" | "disconnected";

interface Spot {
  id:     number;
  status: SpotStatus;
}

const STATUS_CFG: Record<SpotStatus, { color: string; bg: string; label: string; icon: string }> = {
  free:     { color: "#22c55e", bg: "#0a1a0a",  label: "Libre",    icon: "✅" },
  occupied: { color: "#ef4444", bg: "#1c0a0a",  label: "Occupé",   icon: "🚗" },
  reserved: { color: "#f97316", bg: "#1a0f00",  label: "Réservé",  icon: "🔒" },
};

const CONN_CFG: Record<ConnStatus, { color: string; bg: string; border: string; label: string }> = {
  connecting:    { color: "#fbbf24", bg: "#1a1206", border: "#78350f", label: "Connexion…"   },
  connected:     { color: "#4ade80", bg: "#0a1a0a", border: "#14532d", label: "En direct"    },
  disconnected:  { color: "#f87171", bg: "#1c0a0a", border: "#7f1d1d", label: "Déconnecté — reconnexion dans 3s" },
};

export default function LiveStream() {
  const { parking, loading } = useManagerParking();

  const [spots,      setSpots]      = useState<Spot[]>([]);
  const [connStatus, setConnStatus] = useState<ConnStatus>("connecting");
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!parking?.id) return;

    const wsUrl = `${BACKEND_URL.replace("http", "ws")}/ws/${parking.id}`;

    function connect() {
      setConnStatus("connecting");
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setConnStatus("connected");

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        setSpots(data.spots ?? []);
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
  if (!parking) return <div style={{ color: "#f87171" }}>Parking introuvable.</div>;

  const free     = spots.filter(s => s.status === "free").length;
  const occupied = spots.filter(s => s.status === "occupied").length;
  const reserved = spots.filter(s => s.status === "reserved").length;
  const total    = spots.length || parking.total_spots;
  const conn     = CONN_CFG[connStatus];

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
          <div style={{ ...s.connPill, background: conn.bg, border: `1px solid ${conn.border}` }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: conn.color, flexShrink: 0,
              animation: connStatus === "connected" ? "pulse 2s ease infinite" : "none",
              display: "inline-block",
            }} />
            <span style={{ color: conn.color, fontSize: "12px", fontWeight: 600 }}>
              {conn.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div style={s.statsRow}>
        {(["free", "occupied", "reserved"] as SpotStatus[]).map(st => {
          const cfg   = STATUS_CFG[st];
          const count = spots.filter(s => s.status === st).length;
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={st} style={{ ...s.statCard, borderColor: cfg.color + "44" }}>
              <div style={{ ...s.statIcon, background: cfg.bg, color: cfg.color }}>
                {cfg.icon}
              </div>
              <div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
                  {count}
                </div>
                <div style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, marginTop: "3px" }}>
                  {cfg.label}
                </div>
                <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "2px" }}>
                  {pct}% des places
                </div>
              </div>
            </div>
          );
        })}

        {/* Total */}
        <div style={s.statCard}>
          <div style={{ ...s.statIcon, background: "#1e2535", color: "#9ca3af" }}>📊</div>
          <div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>
              {total}
            </div>
            <div style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, marginTop: "3px" }}>
              Total
            </div>
            <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "2px" }}>
              places configurées
            </div>
          </div>
        </div>
      </div>

      {/* ── Barre d'occupation ───────────────────────────────────────────── */}
      {spots.length > 0 && (
        <div style={s.barCard}>
          <div style={s.barHeader}>
            <span style={s.barTitle}>Occupation globale</span>
            <span style={{ fontSize: "13px", color: "#9ca3af" }}>
              {occupied + reserved} / {total} places utilisées
            </span>
          </div>
          <div style={s.barTrack}>
            <div style={{ ...s.barSeg, width: `${(free     / total) * 100}%`, background: "#22c55e" }} />
            <div style={{ ...s.barSeg, width: `${(reserved / total) * 100}%`, background: "#f97316" }} />
            <div style={{ ...s.barSeg, width: `${(occupied / total) * 100}%`, background: "#ef4444" }} />
          </div>
          <div style={s.barLegend}>
            {[
              { color: "#22c55e", label: `Libres (${free})`          },
              { color: "#f97316", label: `Réservés (${reserved})`    },
              { color: "#ef4444", label: `Occupés (${occupied})`     },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: l.color }} />
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>{l.label}</span>
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
            {(["free", "occupied", "reserved"] as SpotStatus[]).map(st => (
              <div key={st} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: STATUS_CFG[st].color }} />
                <span style={{ fontSize: "11px", color: "#6b7280" }}>{STATUS_CFG[st].label}</span>
              </div>
            ))}
          </div>
        </div>

        {spots.length === 0
          ? (
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
          )
          : (
            <div style={s.spotsGrid}>
              {spots.map(spot => {
                const cfg = STATUS_CFG[spot.status] ?? STATUS_CFG.free;
                return (
                  <div
                    key={spot.id}
                    style={{
                      ...s.spotCard,
                      background:   cfg.bg,
                      borderColor:  cfg.color + "55",
                      boxShadow:    `0 0 10px ${cfg.color}18`,
                    }}
                  >
                    <div style={{ ...s.spotDot, background: cfg.color,
                      animation: spot.status === "free" ? "none" : "pulse 2.5s ease infinite",
                    }} />
                    <div style={{ ...s.spotNum, color: cfg.color }}>
                      {spot.id}
                    </div>
                    <div style={s.spotIcon}>{cfg.icon}</div>
                    <div style={{ ...s.spotLabel, color: cfg.color }}>
                      {cfg.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </div>

      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

function Loader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: "60px" }}>
      <div style={{ width: "28px", height: "28px", border: "3px solid #1e2535", borderTop: "3px solid #10b981", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:          { display: "flex", flexDirection: "column", gap: "20px" },
  pageHeader:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  pageTitle:     { fontSize: "22px", fontWeight: 700, color: "#f1f5f9" },
  pageSub:       { fontSize: "13px", color: "#6b7280", marginTop: "3px" },
  lastUpdate:    { fontSize: "12px", color: "#4b5563" },
  connPill:      { display: "flex", alignItems: "center", gap: "7px", borderRadius: "20px", padding: "7px 14px" },
  statsRow:      { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" },
  statCard:      { background: "#161b27", border: "1px solid #1e2535", borderRadius: "14px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" },
  statIcon:      { width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 },
  barCard:       { background: "#161b27", border: "1px solid #1e2535", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" },
  barHeader:     { display: "flex", justifyContent: "space-between", alignItems: "center" },
  barTitle:      { fontSize: "14px", fontWeight: 700, color: "#f1f5f9" },
  barTrack:      { height: "10px", borderRadius: "5px", background: "#1e2535", display: "flex", overflow: "hidden" },
  barSeg:        { height: "100%", transition: "width 0.5s ease" },
  barLegend:     { display: "flex", gap: "20px" },
  gridCard:      { background: "#161b27", border: "1px solid #1e2535", borderRadius: "14px", overflow: "hidden" },
  gridHeader:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #1e2535", background: "#111827" },
  gridTitle:     { fontSize: "13px", fontWeight: 700, color: "#f1f5f9" },
  gridLegend:    { display: "flex", gap: "16px" },
  waitingBox:    { display: "flex", alignItems: "center", gap: "20px", padding: "40px 24px" },
  waitingSpinner:{ width: "32px", height: "32px", border: "3px solid #1e2535", borderTop: "3px solid #10b981", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 },
  waitingTitle:  { fontSize: "15px", fontWeight: 600, color: "#f1f5f9", marginBottom: "6px" },
  waitingHint:   { fontSize: "13px", color: "#6b7280", lineHeight: "1.7" },
  code:          { background: "#1e2535", borderRadius: "4px", padding: "1px 6px", fontSize: "12px", fontFamily: "monospace", color: "#60a5fa" },
  spotsGrid:     { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "12px", padding: "20px" },
  spotCard:      { borderRadius: "12px", border: "1.5px solid", padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", transition: "all 0.3s ease", position: "relative" },
  spotDot:       { position: "absolute", top: "8px", right: "8px", width: "7px", height: "7px", borderRadius: "50%" },
  spotNum:       { fontSize: "22px", fontWeight: 800, lineHeight: 1 },
  spotIcon:      { fontSize: "18px" },
  spotLabel:     { fontSize: "11px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.5px" },
};
