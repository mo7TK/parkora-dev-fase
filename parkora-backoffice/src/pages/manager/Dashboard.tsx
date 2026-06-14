// src/pages/manager/Dashboard.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useManagerParking } from "../../context/ManagerContext";
import {
  managerApi,
  type TodayReservations,
  type Reservation,
  type ParkingStats,
} from "../../api/managerApi";
import { Landmark, Banknote } from "lucide-react";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;
const WS_URL = import.meta.env.VITE_WS_URL as string;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(mins: number) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60),
    m = mins % 60;
  return h > 0
    ? m > 0
      ? `${h}h${String(m).padStart(2, "0")}`
      : `${h}h`
    : `${m} min`;
}

function fmtDA(n: number) {
  return n.toLocaleString("fr-DZ") + " DA";
}

// ── Chart.js bar chart (reservations + annulations + taux %) ─────────────────

function ReservationsBarChart({
  stats,
  mode = "month",
  today,
}: {
  stats: ParkingStats | null;
  mode?: "month" | "today";
  today?: TodayReservations | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<unknown>(null);

  useEffect(() => {
    if ((window as unknown as Record<string, unknown>).Chart) return;
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!stats) return;

    const tryDraw = () => {
      if (!(window as unknown as Record<string, unknown>).Chart) {
        setTimeout(tryDraw, 100);
        return;
      }
      const ctx = canvasRef.current;
      if (!ctx) return;

      const confirmedVal =
        mode === "today" ? (stats.confirmed_jour ?? 0) : stats.confirmed_mois;
      const completedVal =
        mode === "today" ? (stats.completed_jour ?? 0) : stats.completed_mois;
      const cancelledVal =
        mode === "today" ? (stats.cancelled_jour ?? 0) : stats.cancelled_mois;
      const totalVal2 = Math.max(confirmedVal + completedVal + cancelledVal, 1);
      const confirmedPct = Math.round((confirmedVal / totalVal2) * 100);
      const completedPct = Math.round((completedVal / totalVal2) * 100);
      const cancelledPct = Math.round((cancelledVal / totalVal2) * 100);

      if (chartRef.current) {
        (chartRef.current as { destroy: () => void }).destroy();
      }

      // @ts-expect-error Chart loaded via CDN
      chartRef.current = new window.Chart(ctx, {
        type: "bar",
        data: {
          labels:
            mode === "today"
              ? ["Honorées", "Annulées", "Programmées"]
              : ["Honorées", "Annulées"],
          datasets: [
            {
              data:
                mode === "today"
                  ? [completedVal, cancelledVal, confirmedVal]
                  : [completedVal, cancelledVal],
              backgroundColor:
                mode === "today"
                  ? ["#22c55e", "#ef4444", "#1a73e8"]
                  : ["#22c55e", "#ef4444"],
              borderRadius: 6,
              borderSkipped: false,
              maxBarThickness: 48,
              barThickness: 40,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: { raw: number; dataIndex: number }) => {
                  const pcts =
                    mode === "today"
                      ? [completedPct, cancelledPct, confirmedPct]
                      : [completedPct, cancelledPct];
                  return `${ctx.raw} (${pcts[ctx.dataIndex] ?? 0}%)`;
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, color: "#94a3b8", font: { size: 11 } },
              grid: { color: "#f1f5f9" },
            },
            x: {
              ticks: { color: "#64748b", font: { size: 12, weight: "600" } },
              grid: { display: false },
            },
          },
          animation: { duration: 600 },
        },
        plugins: [
          {
            id: "insideLabels",
            afterDatasetsDraw(chart: {
              ctx: CanvasRenderingContext2D;
              data: { datasets: { data: number[] }[] };
              getDatasetMeta: (i: number) => {
                data: { x: number; y: number; width: number; height: number }[];
              };
            }) {
              const { ctx: c, data } = chart;
              const meta = chart.getDatasetMeta(0);
              const totalVal = Math.max(
                mode === "today"
                  ? (stats!.total_jour ?? stats!.total_mois)
                  : stats!.total_mois,
                1,
              );
              data.datasets[0].data.forEach((val: number, i: number) => {
                const bar = meta.data[i];
                const pct = Math.round((val / totalVal) * 100);
                const label = `${pct}%`;
                c.save();
                c.font = "bold 13px sans-serif";
                c.fillStyle = "#fff";
                c.textAlign = "center";
                c.textBaseline = "middle";
                const midY = bar.y + bar.height / 2;
                if (bar.height > 22) {
                  c.fillText(label, bar.x, midY);
                }
                c.restore();
              });
            },
          },
        ],
      });
    };
    tryDraw();

    return () => {
      if (chartRef.current) {
        (chartRef.current as { destroy: () => void }).destroy();
        chartRef.current = null;
      }
    };
  }, [stats]);

  return (
    <div style={s.chartCard}>
      <p style={s.chartTitle}>
        {mode === "today"
          ? `Réservations du jour${stats ? ` (${stats.today})` : ""}`
          : stats
            ? `Réservations de ${new Date(stats.month + "-01").toLocaleDateString("fr-FR", { month: "long" })}`
            : "Réservations du mois"}
      </p>
      {/* legend */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
        <span style={s.legendItem}>
          <span style={{ ...s.legendDot, background: "#22c55e" }} />
          {mode === "today"
            ? `Honorées (${stats?.completed_jour ?? 0})`
            : `Honorées (${stats?.completed_mois ?? 0})`}
        </span>
        <span style={s.legendItem}>
          <span style={{ ...s.legendDot, background: "#ef4444" }} />
          {mode === "today"
            ? `Annulées (${stats?.cancelled_jour ?? 0})`
            : `Annulées (${stats?.cancelled_mois ?? 0})`}
        </span>
        {mode === "today" && (
          <span style={s.legendItem}>
            <span style={{ ...s.legendDot, background: "#1a73e8" }} />
            {`Programmées (${stats?.confirmed_jour ?? 0})`}
          </span>
        )}
      </div>
      <div style={{ position: "relative", height: "180px" }}>
        {!stats && <div style={s.chartLoading}>Chargement…</div>}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Diagramme en barres des réservations honorées et annulées du mois"
        >
          {stats
            ? `Confirmées: ${stats.confirmed_mois}, Honorées: ${stats.completed_mois}, Annulées: ${stats.cancelled_mois}`
            : "Chargement"}
        </canvas>
      </div>
    </div>
  );
}

// ── Modal détail réservation ──────────────────────────────────────────────────

function ReservationDetailModal({
  r,
  onClose,
}: {
  r: Reservation;
  onClose: () => void;
}) {
  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.modal} onClick={(e) => e.stopPropagation()}>
        <div style={ms.mHeader}>
          <h3 style={ms.mTitle}>Détail de la réservation</h3>
          <button style={ms.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={ms.section}>
          <p style={ms.sectionLabel}>Client</p>
          <InfoRow label="Nom" value={r.user_name || "—"} />
          <InfoRow label="Téléphone" value={r.user_phone || "—"} />
          <InfoRow label="Email" value={r.user_email || "—"} />
          <InfoRow
            label="Immatriculation"
            value={r.user_plate || "Non renseignée"}
          />
        </div>
        <div style={ms.section}>
          <p style={ms.sectionLabel}>Réservation</p>
          <InfoRow label="Place" value={`N°${r.spot_id}`} />
          <InfoRow label="Date" value={r.date} />
          <InfoRow label="Horaire" value={`${r.start_time} → ${r.end_time}`} />
          <InfoRow label="Durée" value={formatDuration(r.duration_min)} />
          <InfoRow label="Montant" value={`${r.total_price} DA`} />
          <InfoRow label="Paiement" value={r.payment_method.toUpperCase()} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: "13px", color: "#94a3b8" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a2e" }}>
        {value}
      </span>
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { token } = useAuth();
  const { parking, loading: parkingLoading } = useManagerParking();
  const navigate = useNavigate();

  const [today, setToday] = useState<TodayReservations | null>(null);
  const [stats, setStats] = useState<ParkingStats | null>(null);
  const [wsSpots, setWsSpots] = useState<{ id: number; status: string }[]>([]);
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [detailReservation, setDetailReservation] =
    useState<Reservation | null>(null);

  useEffect(() => {
    if (!token) return;
    managerApi
      .getTodayReservations(token)
      .then(setToday)
      .catch(() => {});
    managerApi
      .getStats(token)
      .then(setStats)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!parking?.id) return;
    let ws: WebSocket;
    function connect() {
      ws = new WebSocket(`${WS_URL}/${parking!.id}`);
      ws.onopen = () => setWsStatus("connected");
      ws.onmessage = (e) => setWsSpots(JSON.parse(e.data).spots ?? []);
      ws.onclose = () => {
        setWsStatus("disconnected");
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    }
    connect();
    return () => ws?.close();
  }, [parking?.id]);

  if (parkingLoading) return <Loader />;
  if (!parking)
    return <div style={{ color: "#ef4444" }}>Parking introuvable.</div>;

  const isPaid = parking.type === "paid";
  const free = wsSpots.filter((s) => s.status === "free").length;
  const occupied = wsSpots.filter((s) => s.status === "occupied").length;
  const reserved = wsSpots.filter((s) => s.status === "reserved").length;
  const total = wsSpots.length || parking.total_spots;
  const fillPct =
    total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;

  return (
    <div style={s.page}>
      {/* ── Carte parking ────────────────────────────────────────────────── */}
      <div style={s.parkingCard}>
        <div style={s.parkingCardLeft}>
          {parking.hero_image ? (
            <img
              src={`${BACKEND_URL}/assets/images/entrance/${parking.hero_image}`}
              style={s.heroImg}
              alt=""
            />
          ) : (
            <div style={s.heroPlaceholder}>🏢</div>
          )}
        </div>
        <div style={s.parkingCardRight}>
          <div style={s.parkingCardHeader}>
            <h2 style={s.parkingTitle}>{parking.name}</h2>
            <span
              style={{
                ...s.openBadge,
                background: parking.is_open ? "#f0fdf4" : "#fef2f2",
                color: parking.is_open ? "#16a34a" : "#dc2626",
                border: `1px solid ${parking.is_open ? "#bbf7d0" : "#fecaca"}`,
              }}
            >
              {parking.is_open ? "Ouvert" : "Fermé"}
            </span>
          </div>
          <p style={s.parkingAddr}>{parking.address || "—"}</p>
          <p style={s.parkingBio}>{parking.bio || "—"}</p>
          <div style={s.parkingMeta}>
            <span style={s.metaChip}>
              {isPaid ? `${parking.price_per_hour} DA/h` : "Gratuit"}
            </span>
            <span style={s.metaChip}>{parking.total_spots} places</span>
          </div>
          <button
            style={s.editBtn}
            onClick={() => navigate("/manager/parking")}
          >
            Modifier les infos
          </button>
        </div>
      </div>

      {/* ── Occupation en temps réel ─────────────────────────────────────── */}
      <div style={s.sectionHeader}>
        <span style={s.sectionTitle}>Occupation en temps réel</span>
        <span
          style={{
            ...s.wsBadge,
            background: wsStatus === "connected" ? "#f0fdf4" : "#fef9c3",
            color: wsStatus === "connected" ? "#16a34a" : "#ca8a04",
            border: `1px solid ${wsStatus === "connected" ? "#bbf7d0" : "#fde68a"}`,
          }}
        >
          {wsStatus === "connected"
            ? "Live"
            : wsStatus === "connecting"
              ? "Connexion…"
              : "Déconnecté"}
        </span>
      </div>

      <div style={s.statsGrid}>
        <StatCard label="Libres" value={free} color="#22c55e" total={total} />
        <StatCard
          label="Occupés"
          value={occupied}
          color="#ef4444"
          total={total}
        />
        <StatCard
          label="Réservés"
          value={reserved}
          color="#f97316"
          total={total}
        />
        <StatCard
          label="Taux de remplissage"
          value={`${fillPct}%`}
          color="#1a73e8"
        />
      </div>

      {wsSpots.length > 0 && (
        <div style={s.barCard}>
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
            <LegendItem color="#22c55e" label={`Libres (${free})`} />
            <LegendItem color="#f97316" label={`Réservés (${reserved})`} />
            <LegendItem color="#ef4444" label={`Occupés (${occupied})`} />
          </div>
        </div>
      )}

      {/* ── Statistiques du mois — parking payant uniquement ─────────────── */}
      {isPaid && (
        <>
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>Statistiques du mois</span>
            {stats && (
              <span style={s.monthBadge}>
                {new Date(stats.month + "-01").toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          <div
            style={{ ...s.statsMonthGrid, gridTemplateColumns: "1fr 1fr 1fr" }}
          >
            {/* ── Gauche : revenus empilés ─── */}
            <div style={s.revenueCard}>
              {/* Revenu du mois */}
              <div style={s.revenueRow}>
                <div style={{ ...s.revenueIconWrap, background: "#dcfce7" }}>
                  <Landmark size={20} />
                </div>
                <div>
                  <p style={s.revenueLabel}>
                    {stats
                      ? `Revenu de ${new Date(stats.month + "-01").toLocaleDateString("fr-FR", { month: "long" })}`
                      : "Revenu du mois"}
                  </p>
                  <p style={s.revenueValue}>
                    {stats ? fmtDA(stats.revenu_mois) : "…"}
                  </p>
                  {stats && (
                    <p style={s.revenueSub}>
                      {stats.completed_mois} réservation
                      {stats.completed_mois !== 1 ? "s" : ""} honorées
                    </p>
                  )}
                </div>
              </div>

              <div style={s.revenueDivider} />

              {/* Revenu du jour */}
              <div style={s.revenueRow}>
                <div style={{ ...s.revenueIconWrap, background: "#dcfce7" }}>
                  <Banknote size={20} />
                </div>
                <div>
                  <p style={s.revenueLabel}>Revenu du jour</p>
                  <p style={s.revenueValue}>
                    {stats ? fmtDA(stats.revenu_jour) : "…"}
                  </p>
                  {stats && (
                    <p style={s.revenueSub}>
                      {today?.total ?? 0} réservation
                      {(today?.total ?? 0) !== 1 ? "s" : ""} aujourd'hui
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Milieu : diagramme du mois ─── */}
            <ReservationsBarChart stats={stats} mode="month" />
            {/* ── Droite : diagramme du jour ─── */}
            <ReservationsBarChart stats={stats} mode="today" today={today} />
          </div>
        </>
      )}

      {/* ── Planning du jour ─────────────────────────────────────────────── */}
      <div style={s.sectionHeader}>
        <span style={s.sectionTitle}>Planning du jour</span>
        {today && (
          <span style={s.countBadge}>
            {today.total} réservation{today.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!today ? (
        <Loader />
      ) : today.reservations.length === 0 ? (
        <div style={s.emptyBox}>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            Aucune réservation confirmée aujourd'hui.
          </p>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Place", "Horaire", "Durée", "Montant", "Client", ""].map(
                  (h) => (
                    <th key={h} style={s.th}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {today.reservations.map((r) => (
                <tr key={r.id} style={s.tr}>
                  <td style={s.td}>
                    <span style={s.spotBadge}>N°{r.spot_id}</span>
                  </td>
                  <td style={s.td}>
                    <strong style={{ color: "#1a1a2e" }}>{r.start_time}</strong>{" "}
                    → {r.end_time}
                  </td>
                  <td style={s.td}>{formatDuration(r.duration_min)}</td>
                  <td style={s.td}>
                    <span style={s.priceBadge}>{r.total_price} DA</span>
                  </td>
                  <td style={s.td}>
                    <span style={{ fontWeight: 600, color: "#1a1a2e" }}>
                      {r.user_name || "—"}
                    </span>
                  </td>
                  <td style={s.td}>
                    <button
                      style={s.detailBtn}
                      onClick={() => setDetailReservation(r)}
                    >
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailReservation && (
        <ReservationDetailModal
          r={detailReservation}
          onClose={() => setDetailReservation(null)}
        />
      )}
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  total,
}: {
  label: string;
  value: string | number;
  color: string;
  total?: number;
}) {
  return (
    <div style={s.statCard}>
      <div style={{ fontSize: "28px", fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </div>
      <div
        style={{
          fontSize: "13px",
          color: "#64748b",
          fontWeight: 600,
          marginTop: "4px",
        }}
      >
        {label}
      </div>
      {total !== undefined && (
        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
          sur {total} places
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "2px",
          background: color,
        }}
      />
      <span style={{ fontSize: "12px", color: "#64748b" }}>{label}</span>
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

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "20px" },

  parkingCard: {
    display: "flex",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflow: "hidden",
    minHeight: "160px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  parkingCardLeft: { width: "220px", flexShrink: 0 },
  heroImg: { width: "220px", height: "100%", objectFit: "cover" },
  heroPlaceholder: {
    width: "220px",
    height: "160px",
    background: "#f0f4f8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "48px",
  },
  parkingCardRight: {
    flex: 1,
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  parkingCardHeader: { display: "flex", alignItems: "center", gap: "12px" },
  parkingTitle: { fontSize: "20px", fontWeight: 700, color: "#1a1a2e" },
  openBadge: {
    fontSize: "12px",
    fontWeight: 700,
    padding: "4px 12px",
    borderRadius: "20px",
  },
  parkingAddr: { fontSize: "13px", color: "#64748b" },
  parkingBio: { fontSize: "13px", color: "#94a3b8", lineHeight: "1.6" },
  parkingMeta: { display: "flex", gap: "8px", flexWrap: "wrap" },
  metaChip: {
    background: "#f0f4f8",
    borderRadius: "8px",
    padding: "4px 12px",
    fontSize: "12px",
    color: "#64748b",
    fontWeight: 600,
    border: "1px solid #e2e8f0",
  },
  editBtn: {
    alignSelf: "flex-start",
    background: "#e8f0fe",
    border: "none",
    borderRadius: "9px",
    color: "#1a73e8",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "inherit",
    fontWeight: 600,
    marginTop: "4px",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: "15px", fontWeight: 700, color: "#1a1a2e" },
  monthBadge: {
    fontSize: "11px",
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: "20px",
    background: "#f0f4f8",
    color: "#64748b",
    border: "1px solid #e2e8f0",
    textTransform: "capitalize",
  },

  statsMonthGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.5fr",
    gap: "14px",
    alignItems: "stretch",
  },

  revenueCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "0px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  revenueRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "12px 0",
  },
  revenueIconWrap: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  revenueLabel: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: 600,
    margin: 0,
    marginBottom: "2px",
  },
  revenueValue: {
    fontSize: "20px",
    fontWeight: 800,
    margin: 0,
    lineHeight: 1.2,
    color: "#1a1a2e",
  },
  revenueSub: {
    fontSize: "11px",
    color: "#94a3b8",
    margin: 0,
    marginTop: "2px",
  },
  revenueDivider: { height: "1px", background: "#f1f5f9", margin: "0 0" },

  chartCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px 24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  chartTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#1a1a2e",
    margin: 0,
    marginBottom: "10px",
  },
  chartLoading: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    color: "#94a3b8",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#64748b",
  },
  legendDot: {
    width: "10px",
    height: "10px",
    borderRadius: "2px",
    display: "inline-block",
  },

  wsBadge: {
    fontSize: "11px",
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: "20px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "14px",
  },
  statCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  barCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  barTrack: {
    height: "8px",
    borderRadius: "4px",
    background: "#f0f4f8",
    display: "flex",
    overflow: "hidden",
  },
  barSeg: { height: "100%", transition: "width 0.4s ease" },
  barLegend: { display: "flex", gap: "20px" },

  countBadge: {
    background: "#e8f0fe",
    color: "#1a73e8",
    border: "1px solid #bfdbfe",
    borderRadius: "20px",
    padding: "3px 12px",
    fontSize: "12px",
    fontWeight: 600,
  },
  emptyBox: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tableWrap: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    overflow: "hidden",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: "11px",
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: {
    padding: "12px 16px",
    fontSize: "13px",
    color: "#4a5568",
    verticalAlign: "middle",
  },
  spotBadge: {
    background: "#e8f0fe",
    color: "#1a73e8",
    borderRadius: "8px",
    padding: "3px 10px",
    fontSize: "12px",
    fontWeight: 700,
  },
  priceBadge: { color: "#7c3aed", fontWeight: 700 },
  detailBtn: {
    background: "#f0f4f8",
    border: "none",
    borderRadius: "7px",
    color: "#64748b",
    fontSize: "12px",
    padding: "5px 12px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

const ms: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },
  modal: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "24px",
    width: "100%",
    maxWidth: "440px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  mHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mTitle: { fontSize: "18px", fontWeight: 700, color: "#1a1a2e" },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "18px",
    padding: "4px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: "#f8fafc",
    borderRadius: "10px",
    padding: "14px 16px",
  },
  sectionLabel: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: "2px",
  },
};
