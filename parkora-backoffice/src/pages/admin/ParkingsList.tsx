// src/pages/admin/ParkingsList.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { adminApi, type ParkingLot } from "../../api/adminApi";

export default function ParkingsList() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
    adminApi
      .getParkings(token)
      .then(setLots)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function confirmDelete() {
    if (!deleteId || !token) return;
    setDeleting(true);
    try {
      await adminApi.deleteParking(token, deleteId);
      setLots((prev) => prev.filter((l) => l.id !== deleteId));
      setDeleteId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur suppression");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Parkings</h2>
          <p style={s.pageSub}>
            {lots.length} parking{lots.length !== 1 ? "s" : ""} enregistré
            {lots.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          style={s.primaryBtn}
          onClick={() => navigate("/admin/create-parking")}
        >
          + Nouveau parking
        </button>
      </div>

      {error && <ErrorBanner msg={error} onClose={() => setError("")} />}

      {lots.length === 0 ? (
        <div style={s.emptyState}>
          <p style={s.emptyTitle}>Aucun parking</p>
          <p style={s.emptySub}>Créez votre premier parking pour commencer.</p>
          <button
            style={s.primaryBtn}
            onClick={() => navigate("/admin/create-parking")}
          >
            + Créer un parking
          </button>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {[
                  "Nom",
                  "Type",
                  "Places",
                  "Gestionnaire",
                  "Statut",
                  "Prix/h",
                  "Actions",
                ].map((h) => (
                  <th key={h} style={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <tr key={lot.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.lotName}>{lot.name}</div>
                    <div style={s.lotAddr}>{lot.address || "—"}</div>
                  </td>
                  <td style={s.td}>
                    <span
                      style={{
                        ...s.typeBadge,
                        background: lot.type === "paid" ? "#e8f0fe" : "#f0fdf4",
                        color: lot.type === "paid" ? "#1a73e8" : "#16a34a",
                        border: `1px solid ${lot.type === "paid" ? "#bfdbfe" : "#bbf7d0"}`,
                      }}
                    >
                      {lot.type === "paid" ? "Payant" : "Gratuit"}
                    </span>
                  </td>
                  <td style={{ ...s.td, textAlign: "center" }}>
                    {lot.total_spots}
                  </td>
                  <td style={s.td}>
                    {lot.manager ? (
                      <span style={s.managerCell}>
                        <span style={s.managerDot} />
                        {lot.manager.username}
                      </span>
                    ) : (
                      <span style={s.noManager}>Non assigné</span>
                    )}
                  </td>
                  <td style={{ ...s.td, textAlign: "center" }}>
                    <span
                      style={{
                        ...s.statusBadge,
                        background: lot.is_open ? "#f0fdf4" : "#fef2f2",
                        color: lot.is_open ? "#16a34a" : "#dc2626",
                        border: `1px solid ${lot.is_open ? "#bbf7d0" : "#fecaca"}`,
                      }}
                    >
                      {lot.is_open ? "Ouvert" : "Fermé"}
                    </span>
                  </td>
                  <td style={{ ...s.td, textAlign: "center" }}>
                    {lot.type === "paid" ? `${lot.price_per_hour} DA` : "—"}
                  </td>
                  <td style={s.td}>
                    <button
                      style={s.deleteBtn}
                      onClick={() => setDeleteId(lot.id)}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteId && (
        <Modal
          title="Supprimer ce parking ?"
          message={`${lots.find((l) => l.id === deleteId)?.name ?? ""} sera définitivement supprimé.`}
          confirmLabel={deleting ? "Suppression…" : "Oui, supprimer"}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
          danger
        />
      )}
    </div>
  );
}

// ── Composants partagés exportés ──────────────────────────────────────────────

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

export function ErrorBanner({
  msg,
  onClose,
}: {
  msg: string;
  onClose?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "12px",
        padding: "14px 20px",
        color: "#ef4444",
        fontSize: "14px",
      }}
    >
      <span>{msg}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function Modal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <div style={ms.overlay}>
      <div style={ms.modal}>
        <h3 style={ms.title}>{title}</h3>
        <p style={ms.msg}>{message}</p>
        <div style={ms.btns}>
          <button style={ms.cancelBtn} onClick={onCancel}>
            Annuler
          </button>
          <button
            style={{
              ...ms.confirmBtn,
              background: danger ? "#ef4444" : "#1a73e8",
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const ms: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  modal: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "28px",
    width: "420px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  },
  title: { fontSize: "18px", fontWeight: 700, color: "#1a1a2e" },
  msg: { fontSize: "14px", color: "#64748b", lineHeight: "1.6" },
  btns: { display: "flex", gap: "10px", justifyContent: "flex-end" },
  cancelBtn: {
    background: "#f0f4f8",
    border: "none",
    borderRadius: "9px",
    color: "#64748b",
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  confirmBtn: {
    border: "none",
    borderRadius: "9px",
    color: "#fff",
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: "14px",
    fontFamily: "inherit",
    fontWeight: 600,
  },
};

const s: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "20px" },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pageTitle: { fontSize: "22px", fontWeight: 700, color: "#1a1a2e" },
  pageSub: { fontSize: "13px", color: "#94a3b8", marginTop: "3px" },
  primaryBtn: {
    background: "#1a73e8",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    fontFamily: "inherit",
    boxShadow: "0 4px 12px rgba(26,115,232,0.25)",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "80px 20px",
    background: "#fff",
    border: "1px dashed #cbd5e1",
    borderRadius: "14px",
  },
  emptyTitle: { fontSize: "18px", fontWeight: 700, color: "#1a1a2e" },
  emptySub: { fontSize: "14px", color: "#94a3b8" },
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
    padding: "13px 16px",
    fontSize: "13px",
    color: "#4a5568",
    verticalAlign: "middle",
  },
  lotName: { fontWeight: 600, color: "#1a1a2e" },
  lotAddr: { fontSize: "11px", color: "#94a3b8", marginTop: "2px" },
  typeBadge: {
    fontSize: "11px",
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: "20px",
  },
  statusBadge: {
    fontSize: "11px",
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: "20px",
  },
  managerCell: { display: "flex", alignItems: "center", gap: "7px" },
  managerDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#22c55e",
    flexShrink: 0,
  },
  noManager: { fontSize: "12px", color: "#94a3b8", fontStyle: "italic" },
  deleteBtn: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    color: "#ef4444",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "inherit",
  },
};
