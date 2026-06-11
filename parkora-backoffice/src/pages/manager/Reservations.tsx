// src/pages/manager/Reservations.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { managerApi, type Reservation } from "../../api/managerApi";
import { Modal } from "../admin/ParkingsList";

type FilterStatus = "all" | "confirmed" | "cancelled";
type FilterTab = "today" | "all";

const STATUS_CFG: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  confirmed: {
    label: "Confirmée",
    bg: "#e8f0fe",
    color: "#1a73e8",
    border: "#bfdbfe",
  },
  ongoing: {
    label: "En cours",
    bg: "#ede9fe",
    color: "#7c3aed",
    border: "#c4b5fd",
  },
  cancelled: {
    label: "Annulée",
    bg: "#f0f4f8",
    color: "#64748b",
    border: "#e2e8f0",
  },
  completed: {
    label: "Terminée",
    bg: "#f0fdf4",
    color: "#16a34a",
    border: "#bbf7d0",
  },
};

function getDisplayStatus(r: Reservation): string {
  if (r.status !== "confirmed") return r.status;
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  if (r.date !== todayStr) return "confirmed";
  const [sh, sm] = r.start_time.split(":").map(Number);
  const [eh, em] = r.end_time.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin >= sh * 60 + sm && nowMin < eh * 60 + em) return "ongoing";
  return "confirmed";
}

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

// ── Modal détail ──────────────────────────────────────────────────────────────

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

        {/* Client */}
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

        {/* Réservation */}
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

// ── Page principale ───────────────────────────────────────────────────────────

export default function Reservations() {
  const { token } = useAuth();

  const [tab, setTab] = useState<FilterTab>("today");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [date, setDate] = useState("");
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [detailReservation, setDetailReservation] =
    useState<Reservation | null>(null);

  const fetchRef = useRef({ token, tab, status, date });
  useEffect(() => {
    fetchRef.current = { token, tab, status, date };
  });

  const fetchData = useCallback(() => {
    const { token: t, tab: tb, status: st, date: dt } = fetchRef.current;
    if (!t) return;
    setLoading(true);
    setError("");

    const promise =
      tb === "today"
        ? managerApi.getTodayReservations(t).then((r) => {
            setTotal(r.total);
            return r.reservations;
          })
        : managerApi
            .getReservations(t, {
              status: st !== "all" ? st : undefined,
              date: dt || undefined,
            })
            .then((r) => {
              setTotal(r.length);
              return r;
            });

    promise
      .then(setItems)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Erreur"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, token, tab, status, date]);

  async function confirmCancel() {
    if (!cancelId || !token) return;
    setCancelling(true);
    try {
      await managerApi.cancelReservation(token, cancelId);
      setItems((prev) =>
        prev.map((r) =>
          r.id === cancelId ? { ...r, status: "cancelled" as const } : r,
        ),
      );
      setCancelId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur annulation");
    } finally {
      setCancelling(false);
    }
  }

  const cancelTarget = items.find((r) => r.id === cancelId);

  return (
    <div style={s.page}>
      {/* En-tête */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Réservations</h2>
          <p style={s.pageSub}>
            {total !== null
              ? `${total} résultat${total !== 1 ? "s" : ""}`
              : "Chargement…"}
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div style={s.tabs}>
        {(["today", "all"] as FilterTab[]).map((t) => (
          <button
            key={t}
            style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
            onClick={() => {
              setTab(t);
              setStatus("all");
              setDate("");
            }}
          >
            {t === "today" ? "Aujourd'hui" : "Toutes"}
          </button>
        ))}
      </div>

      {/* Filtres */}
      {tab === "all" && (
        <div style={s.filters}>
          <div style={s.filterGroup}>
            <label style={s.filterLabel}>Statut</label>
            <select
              style={s.select}
              value={status}
              onChange={(e) => setStatus(e.target.value as FilterStatus)}
            >
              <option value="all">Tous</option>
              <option value="confirmed">Confirmées</option>
              <option value="cancelled">Annulées</option>
            </select>
          </div>
          <div style={s.filterGroup}>
            <label style={s.filterLabel}>Date</label>
            <input
              style={s.inputDate}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {(status !== "all" || date) && (
            <button
              style={s.clearBtn}
              onClick={() => {
                setStatus("all");
                setDate("");
              }}
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {error && <div style={s.errorBox}>{error}</div>}

      {/* Tableau */}
      {loading ? (
        <Loader />
      ) : items.length === 0 ? (
        <div style={s.emptyBox}>
          <p style={s.emptyTitle}>
            {tab === "today"
              ? "Aucune réservation aujourd'hui"
              : "Aucun résultat"}
          </p>
          <p style={s.emptySub}>
            {tab === "today"
              ? "Les réservations confirmées pour aujourd'hui apparaîtront ici."
              : "Essayez de modifier les filtres."}
          </p>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {[
                  "Place",
                  "Date",
                  "Horaire",
                  "Durée",
                  "Montant",
                  "Statut",
                  "",
                ].map((h) => (
                  <th key={h} style={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const displayStatus = getDisplayStatus(r);
                const cfg = STATUS_CFG[displayStatus] ?? STATUS_CFG.completed;
                return (
                  <tr key={r.id} style={s.tr}>
                    <td style={s.td}>
                      <span style={s.spotBadge}>N°{r.spot_id}</span>
                    </td>
                    <td style={s.td}>{r.date}</td>
                    <td style={s.td}>
                      <strong style={{ color: "#1a1a2e" }}>
                        {r.start_time}
                      </strong>
                      <span style={{ color: "#94a3b8" }}> → {r.end_time}</span>
                    </td>
                    <td style={s.td}>{formatDuration(r.duration_min)}</td>
                    <td style={s.td}>
                      <span style={{ color: "#1a73e8", fontWeight: 700 }}>
                        {r.total_price} DA
                      </span>
                    </td>
                    <td style={s.td}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: "20px",
                          background: cfg.bg,
                          color: cfg.color,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={s.actionRow}>
                        <button
                          style={s.detailBtn}
                          onClick={() => setDetailReservation(r)}
                        >
                          Détails
                        </button>
                        {r.status === "confirmed" && (
                          <button
                            style={s.cancelBtn}
                            onClick={() => setCancelId(r.id)}
                          >
                            Annuler
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {cancelId && cancelTarget && (
        <Modal
          title="Annuler cette réservation ?"
          message={`Place N°${cancelTarget.spot_id} · ${cancelTarget.date} · ${cancelTarget.start_time} → ${cancelTarget.end_time}. Le client sera impacté.`}
          confirmLabel={cancelling ? "Annulation…" : "Oui, annuler"}
          onConfirm={confirmCancel}
          onCancel={() => setCancelId(null)}
          danger
        />
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
  page: { display: "flex", flexDirection: "column", gap: "16px" },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pageTitle: { fontSize: "22px", fontWeight: 700, color: "#1a1a2e" },
  pageSub: { fontSize: "13px", color: "#94a3b8", marginTop: "3px" },
  tabs: {
    display: "flex",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "4px",
    gap: "4px",
    alignSelf: "flex-start",
  },
  tab: {
    padding: "8px 20px",
    borderRadius: "9px",
    border: "none",
    background: "transparent",
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  tabActive: {
    background: "#1a73e8",
    color: "#fff",
    boxShadow: "0 2px 6px rgba(26,115,232,0.25)",
  },
  filters: {
    display: "flex",
    alignItems: "flex-end",
    gap: "14px",
    flexWrap: "wrap",
  },
  filterGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  filterLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  select: {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: "9px",
    padding: "9px 14px",
    color: "#1a1a2e",
    fontSize: "13px",
    fontFamily: "inherit",
    outline: "none",
    minWidth: "140px",
  },
  inputDate: {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: "9px",
    padding: "9px 14px",
    color: "#1a1a2e",
    fontSize: "13px",
    fontFamily: "inherit",
    outline: "none",
  },
  clearBtn: {
    background: "#f0f4f8",
    border: "1px solid #e2e8f0",
    borderRadius: "9px",
    color: "#94a3b8",
    padding: "9px 14px",
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "inherit",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "12px 16px",
    fontSize: "13px",
    color: "#ef4444",
  },
  emptyBox: {
    background: "#fff",
    border: "1px dashed #cbd5e1",
    borderRadius: "14px",
    padding: "60px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
  emptyTitle: { fontSize: "18px", fontWeight: 700, color: "#1a1a2e" },
  emptySub: { fontSize: "13px", color: "#94a3b8" },
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
  actionRow: { display: "flex", gap: "8px" },
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
  cancelBtn: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "7px",
    color: "#ef4444",
    padding: "5px 12px",
    cursor: "pointer",
    fontSize: "12px",
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
