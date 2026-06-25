// src/pages/manager/Reservations.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { managerApi, type Reservation } from "../../api/managerApi";

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

// Motifs prédéfinis pour accélérer la saisie
const PRESET_REASONS = [
  "Fermeture exceptionnelle du parking",
  "Travaux de maintenance",
  "Problème technique",
  "Place réservée pour un évènement",
  "Erreur de réservation",
];

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

        {/* Motif d'annulation si présent */}
        {r.status === "cancelled" && r.cancellation_reason && (
          <div
            style={{
              ...ms.section,
              background: "#fef9ec",
              border: "1px solid #fde68a",
            }}
          >
            <p style={{ ...ms.sectionLabel, color: "#92400e" }}>
              Motif d'annulation
            </p>
            <p
              style={{
                fontSize: "14px",
                color: "#92400e",
                fontWeight: 500,
                lineHeight: "1.5",
              }}
            >
              {r.cancellation_reason}
            </p>
            {r.cancelled_by && (
              <p
                style={{ fontSize: "12px", color: "#a16207", marginTop: "4px" }}
              >
                Annulée par :{" "}
                {r.cancelled_by === "manager" ? "le gestionnaire" : "le client"}
              </p>
            )}
          </div>
        )}
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

// ── Modal d'annulation avec motif ─────────────────────────────────────────────

function CancelModal({
  reservation,
  onConfirm,
  onCancel,
  loading,
}: {
  reservation: Reservation;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div style={ms.overlay} onClick={onCancel}>
      <div
        style={{ ...ms.modal, maxWidth: "500px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div style={ms.mHeader}>
          <h3 style={{ ...ms.mTitle, color: "#dc2626" }}>
            Annuler la réservation
          </h3>
          <button style={ms.closeBtn} onClick={onCancel}>
            ✕
          </button>
        </div>

        {/* Résumé réservation */}
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#dc2626",
              margin: 0,
            }}
          >
            Place N°{reservation.spot_id} · {reservation.date}
          </p>
          <p style={{ fontSize: "13px", color: "#7f1d1d", margin: 0 }}>
            {reservation.start_time} → {reservation.end_time} ·{" "}
            {reservation.user_name || "Client"}
          </p>
        </div>

        {/* Motif */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase" as const,
              letterSpacing: "0.4px",
            }}
          >
            Motif d'annulation{" "}
            <span style={{ fontWeight: 400, color: "#94a3b8" }}>
              (optionnel)
            </span>
          </label>

          {/* Motifs prédéfinis */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {PRESET_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  border: `1.5px solid ${reason === preset ? "#ef4444" : "#e2e8f0"}`,
                  background: reason === preset ? "#fef2f2" : "#f7f9fc",
                  color: reason === preset ? "#dc2626" : "#64748b",
                  fontSize: "12px",
                  fontWeight: reason === preset ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.1s",
                }}
                onClick={() => setReason(reason === preset ? "" : preset)}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Champ libre */}
          <textarea
            style={{
              background: "#f7f9fc",
              border: "1.5px solid #e2e8f0",
              borderRadius: "9px",
              padding: "10px 14px",
              color: "#1a1a2e",
              fontSize: "14px",
              fontFamily: "inherit",
              outline: "none",
              resize: "vertical",
              minHeight: "80px",
              width: "100%",
            }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ou saisissez un motif personnalisé… (visible par le client dans son historique)"
            maxLength={300}
          />
          {reason.length > 0 && (
            <p
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                textAlign: "right" as const,
                margin: 0,
              }}
            >
              {reason.length}/300
            </p>
          )}

          {reason.trim().length > 0 && (
            <div
              style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "12px",
                color: "#0369a1",
              }}
            >
              Ce motif sera visible par le client dans l'historique de ses
              réservations.
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
        >
          <button
            style={ms.cancelActionBtn}
            onClick={onCancel}
            disabled={loading}
          >
            Garder la réservation
          </button>
          <button
            style={{
              ...ms.confirmActionBtn,
              background: loading ? "#fca5a5" : "#ef4444",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onClick={() => onConfirm(reason.trim())}
            disabled={loading}
          >
            {loading ? "Annulation…" : "Confirmer l'annulation"}
          </button>
        </div>
      </div>
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
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
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

  async function confirmCancel(reason: string) {
    if (!cancelTarget || !token) return;
    setCancelling(true);
    try {
      await managerApi.cancelReservation(
        token,
        cancelTarget.id,
        reason || undefined,
      );
      // Mettre à jour localement avec le motif
      setItems((prev) =>
        prev.map((r) =>
          r.id === cancelTarget.id
            ? {
                ...r,
                status: "cancelled" as const,
                cancellation_reason: reason || null,
                cancelled_by: "manager",
              }
            : r,
        ),
      );
      setCancelTarget(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur annulation");
    } finally {
      setCancelling(false);
    }
  }

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
                const hasCancelReason =
                  r.status === "cancelled" && r.cancellation_reason;

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
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "20px",
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                            display: "inline-block",
                            width: "fit-content",
                          }}
                        >
                          {cfg.label}
                        </span>
                        {/* Indicateur motif d'annulation */}
                        {hasCancelReason && (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "#a16207",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            💬 Motif renseigné
                          </span>
                        )}
                      </div>
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
                            onClick={() => setCancelTarget(r)}
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

      {/* Modal annulation avec motif */}
      {cancelTarget && (
        <CancelModal
          reservation={cancelTarget}
          onConfirm={confirmCancel}
          onCancel={() => setCancelTarget(null)}
          loading={cancelling}
        />
      )}

      {/* Modal détail */}
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
  cancelActionBtn: {
    background: "#f0f4f8",
    border: "none",
    borderRadius: "9px",
    color: "#64748b",
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  confirmActionBtn: {
    border: "none",
    borderRadius: "9px",
    color: "#fff",
    padding: "10px 20px",
    fontSize: "14px",
    fontFamily: "inherit",
    fontWeight: 600,
  },
};
