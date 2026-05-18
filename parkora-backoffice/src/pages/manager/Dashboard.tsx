// src/pages/manager/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useManagerParking } from "../../context/ManagerContext";
import { managerApi, type TodayReservations } from "../../api/managerApi";
import { BACKEND_URL } from "../../config";

export default function ManagerDashboard() {
  const { token }           = useAuth();
  const { parking, loading: parkingLoading } = useManagerParking();
  const navigate            = useNavigate();

  const [today,    setToday]    = useState<TodayReservations | null>(null);
  const [wsSpots,  setWsSpots]  = useState<{ id: number; status: string }[]>([]);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  // ── Réservations du jour ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    managerApi.getTodayReservations(token)
      .then(setToday)
      .catch(() => {});
  }, [token]);

  // ── WebSocket temps réel ───────────────────────────────────────────────────
  useEffect(() => {
    if (!parking?.id) return;
    const wsUrl = `${BACKEND_URL.replace("http", "ws")}/ws/${parking.id}`;
    let ws: WebSocket;

    function connect() {
      ws = new WebSocket(wsUrl);
      ws.onopen    = () => setWsStatus("connected");
      ws.onmessage = e => setWsSpots(JSON.parse(e.data).spots ?? []);
      ws.onclose   = () => { setWsStatus("disconnected"); setTimeout(connect, 3000); };
      ws.onerror   = () => ws.close();
    }
    connect();
    return () => ws?.close();
  }, [parking?.id]);

  if (parkingLoading) return <Loader />;
  if (!parking)       return <div style={{ color: "#f87171" }}>Parking introuvable.</div>;

  const free     = wsSpots.filter(s => s.status === "free").length;
  const occupied = wsSpots.filter(s => s.status === "occupied").length;
  const reserved = wsSpots.filter(s => s.status === "reserved").length;
  const total    = wsSpots.length || parking.total_spots;
  const fillPct  = total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;

  return (
    <div style={s.page}>

      {/* ── Carte parking ────────────────────────────────────────────────── */}
      <div style={s.parkingCard}>
        <div style={s.parkingCardLeft}>
          {parking.hero_image
            ? <img src={`${BACKEND_URL}/assets/images/entrance/${parking.hero_image}`}
                style={s.heroImg} alt="" />
            : <div style={s.heroPlaceholder}>🏢</div>
          }
        </div>
        <div style={s.parkingCardRight}>
          <div style={s.parkingCardHeader}>
            <h2 style={s.parkingTitle}>{parking.name}</h2>
            <span style={{
              ...s.openBadge,
              background: parking.is_open ? "#0a1a0a" : "#1c0a0a",
              color:      parking.is_open ? "#4ade80" : "#f87171",
              border:     `1px solid ${parking.is_open ? "#14532d" : "#7f1d1d"}`,
            }}>
              {parking.is_open ? "● Ouvert" : "● Fermé"}
            </span>
          </div>
          <p style={s.parkingAddr}>{parking.address || "—"}</p>
          <p style={s.parkingBio}>{parking.bio || "—"}</p>
          <div style={s.parkingMeta}>
            <span style={s.metaChip}>
              {parking.type === "paid" ? `💳 ${parking.price_per_hour} DA/h` : "🟢 Gratuit"}
            </span>
            <span style={s.metaChip}>🅿️ {parking.total_spots} places</span>
          </div>
          <button style={s.editBtn} onClick={() => navigate("/manager/parking")}>
            ✏️ Modifier les infos
          </button>
        </div>
      </div>

      {/* ── Stats temps réel ─────────────────────────────────────────────── */}
      <div style={s.sectionTitle}>
        <span>Occupation en temps réel</span>
        <span style={{
          ...s.wsBadge,
          background: wsStatus === "connected" ? "#0a1a0a" : "#1c1206",
          color:      wsStatus === "connected" ? "#4ade80" : "#fbbf24",
        }}>
          {wsStatus === "connected" ? "● Live" : wsStatus === "connecting" ? "○ Connexion…" : "✕ Déconnecté"}
        </span>
      </div>

      <div style={s.statsGrid}>
        <StatCard icon="✅" label="Libres"    value={free}     color="#22c55e" total={total} />
        <StatCard icon="🚗" label="Occupés"   value={occupied} color="#ef4444" total={total} />
        <StatCard icon="🔒" label="Réservés"  value={reserved} color="#f97316" total={total} />
        <StatCard icon="📊" label="Taux remplissage" value={`${fillPct}%`} color="#8b5cf6" />
      </div>

      {/* Barre globale */}
      {wsSpots.length > 0 && (
        <div style={s.barWrap}>
          <div style={s.barTrack}>
            <div style={{ ...s.barSeg, width: `${(free     / total) * 100}%`, background: "#22c55e" }} />
            <div style={{ ...s.barSeg, width: `${(reserved / total) * 100}%`, background: "#f97316" }} />
            <div style={{ ...s.barSeg, width: `${(occupied / total) * 100}%`, background: "#ef4444" }} />
          </div>
          <div style={s.barLegend}>
            <LegendItem color="#22c55e" label={`Libres (${free})`} />
            <LegendItem color="#f97316" label={`Réservés (${reserved})`} />
            <LegendItem color="#ef4444" label={`Occupés (${occupied})`} />
          </div>
        </div>
      )}

      {/* ── Planning du jour ─────────────────────────────────────────────── */}
      <div style={s.sectionTitle}>
        <span>Planning du jour</span>
        {today && <span style={s.todayBadge}>{today.total} réservation{today.total !== 1 ? "s" : ""}</span>}
      </div>

      {!today
        ? <Loader />
        : today.reservations.length === 0
        ? (
          <div style={s.emptyBox}>
            <span style={{ fontSize: "32px" }}>📅</span>
            <p style={{ color: "#6b7280", fontSize: "14px" }}>Aucune réservation confirmée aujourd'hui.</p>
          </div>
        )
        : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Place", "Horaire", "Durée", "Montant", "Client ID"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {today.reservations.map(r => (
                  <tr key={r.id} style={s.tr}>
                    <td style={s.td}><span style={s.spotBadge}>N°{r.spot_id}</span></td>
                    <td style={s.td}><strong style={{ color: "#f1f5f9" }}>{r.start_time}</strong> → {r.end_time}</td>
                    <td style={s.td}>{formatDuration(r.duration_min)}</td>
                    <td style={s.td}><span style={s.priceBadge}>{r.total_price} DA</span></td>
                    <td style={s.td}><code style={s.monoId}>{r.user_id.slice(-8)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(mins: number) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`) : `${m} min`;
}

function Loader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: "60px" }}>
      <div style={{ width: "28px", height: "28px", border: "3px solid #1e2535", borderTop: "3px solid #10b981", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function StatCard({ icon, label, value, color, total }: {
  icon: string; label: string; value: string | number; color: string; total?: number;
}) {
  return (
    <div style={{ background: "#161b27", border: "1px solid #1e2535", borderRadius: "14px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "26px", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, marginTop: "3px" }}>{label}</div>
        {total !== undefined && (
          <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "2px" }}>sur {total} places</div>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: color }} />
      <span style={{ fontSize: "12px", color: "#9ca3af" }}>{label}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:            { display: "flex", flexDirection: "column", gap: "20px" },
  parkingCard:     { display: "flex", background: "#161b27", border: "1px solid #1e2535", borderRadius: "14px", overflow: "hidden", minHeight: "160px" },
  parkingCardLeft: { width: "220px", flexShrink: 0 },
  heroImg:         { width: "220px", height: "100%", objectFit: "cover" },
  heroPlaceholder: { width: "220px", height: "160px", background: "#1e2535", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" },
  parkingCardRight:{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: "8px" },
  parkingCardHeader:{ display: "flex", alignItems: "center", gap: "12px" },
  parkingTitle:    { fontSize: "20px", fontWeight: 700, color: "#f1f5f9" },
  openBadge:       { fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "20px" },
  parkingAddr:     { fontSize: "13px", color: "#6b7280" },
  parkingBio:      { fontSize: "13px", color: "#4b5563", lineHeight: "1.6" },
  parkingMeta:     { display: "flex", gap: "8px", flexWrap: "wrap" },
  metaChip:        { background: "#1e2535", borderRadius: "8px", padding: "4px 12px", fontSize: "12px", color: "#9ca3af", fontWeight: 600 },
  editBtn:         { alignSelf: "flex-start", background: "#0a2010", border: "1px solid #14532d", borderRadius: "9px", color: "#4ade80", padding: "8px 16px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", fontWeight: 600, marginTop: "4px" },
  sectionTitle:    { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px", fontWeight: 700, color: "#f1f5f9" },
  wsBadge:         { fontSize: "11px", fontWeight: 600, padding: "4px 12px", borderRadius: "20px" },
  todayBadge:      { background: "#1e2d47", color: "#60a5fa", border: "1px solid #1d4ed8", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontWeight: 600 },
  statsGrid:       { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" },
  barWrap:         { background: "#161b27", border: "1px solid #1e2535", borderRadius: "12px", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" },
  barTrack:        { height: "10px", borderRadius: "5px", background: "#1e2535", display: "flex", overflow: "hidden" },
  barSeg:          { height: "100%", transition: "width 0.4s ease" },
  barLegend:       { display: "flex", gap: "20px" },
  emptyBox:        { background: "#161b27", border: "1px dashed #1e2535", borderRadius: "12px", padding: "40px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
  tableWrap:       { background: "#161b27", border: "1px solid #1e2535", borderRadius: "14px", overflow: "hidden" },
  table:           { width: "100%", borderCollapse: "collapse" },
  th:              { padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #1e2535", background: "#111827" },
  tr:              { borderBottom: "1px solid #1e2535" },
  td:              { padding: "12px 16px", fontSize: "13px", color: "#d1d5db", verticalAlign: "middle" },
  spotBadge:       { background: "#1e2d47", color: "#60a5fa", borderRadius: "8px", padding: "3px 10px", fontSize: "12px", fontWeight: 700 },
  priceBadge:      { color: "#a78bfa", fontWeight: 700 },
  monoId:          { fontSize: "11px", color: "#6b7280", fontFamily: "monospace", background: "#1e2535", padding: "2px 6px", borderRadius: "4px" },
};
