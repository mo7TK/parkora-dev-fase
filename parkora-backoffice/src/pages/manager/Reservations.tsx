// src/pages/manager/Reservations.tsx
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { managerApi, type Reservation } from "../../api/managerApi";
import { Modal } from "../admin/ParkingsList";

type FilterStatus = "all" | "confirmed" | "cancelled";
type FilterTab    = "today" | "all";

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  confirmed: { label: "Confirmée", bg: "#1e2d47", color: "#60a5fa", border: "#1d4ed8" },
  cancelled: { label: "Annulée",   bg: "#1e2535", color: "#6b7280", border: "#374151" },
  completed: { label: "Terminée",  bg: "#0a1a0a", color: "#4ade80", border: "#14532d" },
};

function formatDuration(mins: number) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`) : `${m} min`;
}

export default function Reservations() {
  const { token } = useAuth();

  const [tab,        setTab]        = useState<FilterTab>("today");
  const [status,     setStatus]     = useState<FilterStatus>("all");
  const [date,       setDate]       = useState("");
  const [items,      setItems]      = useState<Reservation[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [cancelId,   setCancelId]   = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [total,      setTotal]      = useState<number | null>(null);

  const fetchData = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError("");

    const promise = tab === "today"
      ? managerApi.getTodayReservations(token).then(r => {
          setTotal(r.total);
          return r.reservations;
        })
      : managerApi.getReservations(token, {
          status: status !== "all" ? status : undefined,
          date:   date || undefined,
        }).then(r => { setTotal(r.length); return r; });

    promise
      .then(setItems)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, tab, status, date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function confirmCancel() {
    if (!cancelId || !token) return;
    setCancelling(true);
    try {
      await managerApi.cancelReservation(token, cancelId);
      setItems(prev => prev.map(r =>
        r.id === cancelId ? { ...r, status: "cancelled" as const } : r
      ));
      setCancelId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur annulation");
    } finally {
      setCancelling(false);
    }
  }

  const cancelTarget = items.find(r => r.id === cancelId);

  return (
    <div style={s.page}>

      {/* En-tête */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Réservations</h2>
          <p style={s.pageSub}>
            {total !== null ? `${total} résultat${total !== 1 ? "s" : ""}` : "Chargement…"}
          </p>
        </div>
      </div>

      {/* Onglets Aujourd'hui / Toutes */}
      <div style={s.tabs}>
        {(["today", "all"] as FilterTab[]).map(t => (
          <button
            key={t}
            style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
            onClick={() => { setTab(t); setStatus("all"); setDate(""); }}
          >
            {t === "today" ? "📅 Aujourd'hui" : "📋 Toutes"}
          </button>
        ))}
      </div>

      {/* Filtres (visible uniquement sur l'onglet "toutes") */}
      {tab === "all" && (
        <div style={s.filters}>
          <div style={s.filterGroup}>
            <label style={s.filterLabel}>Statut</label>
            <select
              style={s.select}
              value={status}
              onChange={e => setStatus(e.target.value as FilterStatus)}
            >
              <option value="all">Tous</option>
              <option value="confirmed">Confirmées</option>
              <option value="cancelled">Annulées</option>
            </select>
          </div>
          <div style={s.filterGroup}>
            <label style={s.filterLabel}>Date</label>
            <input
              style={s.input}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          {(status !== "all" || date) && (
            <button
              style={s.clearBtn}
              onClick={() => { setStatus("all"); setDate(""); }}
            >
              ✕ Réinitialiser
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={s.errorBox}>⛔ {error}</div>
      )}

      {/* Contenu */}
      {loading
        ? <Loader />
        : items.length === 0
        ? (
          <div style={s.emptyBox}>
            <span style={{ fontSize: "36px" }}>📅</span>
            <p style={s.emptyTitle}>
              {tab === "today" ? "Aucune réservation aujourd'hui" : "Aucun résultat"}
            </p>
            <p style={s.emptySub}>
              {tab === "today"
                ? "Les réservations confirmées pour aujourd'hui apparaîtront ici."
                : "Essayez de modifier les filtres."}
            </p>
          </div>
        )
        : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Place", "Date", "Horaire", "Durée", "Montant", "Statut", "Actions"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(r => {
                  const cfg = STATUS_CFG[r.status] ?? STATUS_CFG.completed;
                  return (
                    <tr key={r.id} style={s.tr}>
                      <td style={s.td}>
                        <span style={s.spotBadge}>N°{r.spot_id}</span>
                      </td>
                      <td style={s.td}>{r.date}</td>
                      <td style={s.td}>
                        <strong style={{ color: "#f1f5f9" }}>{r.start_time}</strong>
                        <span style={{ color: "#6b7280" }}> → {r.end_time}</span>
                      </td>
                      <td style={s.td}>{formatDuration(r.duration_min)}</td>
                      <td style={s.td}>
                        <span style={{ color: "#a78bfa", fontWeight: 700 }}>{r.total_price} DA</span>
                      </td>
                      <td style={s.td}>
                        <span style={{
                          fontSize: "11px", fontWeight: 700,
                          padding: "3px 10px", borderRadius: "20px",
                          background: cfg.bg, color: cfg.color,
                          border: `1px solid ${cfg.border}`,
                        }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={s.td}>
                        {r.status === "confirmed" && (
                          <button
                            style={s.cancelBtn}
                            onClick={() => setCancelId(r.id)}
                          >
                            Annuler
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Modal confirmation annulation */}
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
  page:       { display: "flex", flexDirection: "column", gap: "16px" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  pageTitle:  { fontSize: "22px", fontWeight: 700, color: "#f1f5f9" },
  pageSub:    { fontSize: "13px", color: "#6b7280", marginTop: "3px" },
  tabs:       { display: "flex", background: "#161b27", border: "1px solid #1e2535", borderRadius: "12px", padding: "4px", gap: "4px", alignSelf: "flex-start" },
  tab:        { padding: "8px 20px", borderRadius: "9px", border: "none", background: "transparent", color: "#6b7280", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" },
  tabActive:  { background: "#0a2010", color: "#4ade80", border: "1px solid #14532d" },
  filters:    { display: "flex", alignItems: "flex-end", gap: "14px", flexWrap: "wrap" },
  filterGroup:{ display: "flex", flexDirection: "column", gap: "6px" },
  filterLabel:{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.4px" },
  select:     { background: "#161b27", border: "1.5px solid #1e2535", borderRadius: "9px", padding: "9px 14px", color: "#f1f5f9", fontSize: "13px", fontFamily: "inherit", outline: "none", minWidth: "140px" },
  input:      { background: "#161b27", border: "1.5px solid #1e2535", borderRadius: "9px", padding: "9px 14px", color: "#f1f5f9", fontSize: "13px", fontFamily: "inherit", outline: "none" },
  clearBtn:   { background: "none", border: "1px solid #1e2535", borderRadius: "9px", color: "#6b7280", padding: "9px 14px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", marginBottom: "1px" },
  errorBox:   { background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", color: "#fca5a5" },
  emptyBox:   { background: "#161b27", border: "1px dashed #1e2535", borderRadius: "14px", padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
  emptyTitle: { fontSize: "18px", fontWeight: 700, color: "#f1f5f9" },
  emptySub:   { fontSize: "13px", color: "#6b7280" },
  tableWrap:  { background: "#161b27", border: "1px solid #1e2535", borderRadius: "14px", overflow: "hidden" },
  table:      { width: "100%", borderCollapse: "collapse" },
  th:         { padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #1e2535", background: "#111827" },
  tr:         { borderBottom: "1px solid #1e2535" },
  td:         { padding: "12px 16px", fontSize: "13px", color: "#d1d5db", verticalAlign: "middle" },
  spotBadge:  { background: "#1e2d47", color: "#60a5fa", borderRadius: "8px", padding: "3px 10px", fontSize: "12px", fontWeight: 700 },
  cancelBtn:  { background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: "7px", color: "#f87171", padding: "5px 12px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" },
};
