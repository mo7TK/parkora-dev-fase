// src/pages/admin/ManagersList.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  adminApi,
  type Manager,
  type ParkingLot,
  type CreateManagerBody,
  type ManagerCreated,
} from "../../api/adminApi";
import { PageLoader, ErrorBanner, Modal } from "./ParkingsList";

export default function ManagersList() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [managers, setManagers] = useState<Manager[]>([]);
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [created, setCreated] = useState<ManagerCreated | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([adminApi.getManagers(token), adminApi.getParkings(token)])
      .then(([m, l]) => {
        setManagers(m);
        setLots(l);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function confirmDelete() {
    if (!deleteId || !token) return;
    setDeleting(true);
    try {
      await adminApi.deleteManager(token, deleteId);
      setManagers((prev) => prev.filter((m) => m.id !== deleteId));
      setDeleteId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur suppression");
    } finally {
      setDeleting(false);
    }
  }

  function onCreated(m: ManagerCreated) {
    setManagers((prev) => [m, ...prev]);
    setShowCreate(false);
    setCreated(m);
  }

  if (loading) return <PageLoader />;

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Gestionnaires</h2>
          <p style={s.pageSub}>
            {managers.length} gestionnaire{managers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button style={s.primaryBtn} onClick={() => setShowCreate(true)}>
          + Nouveau gestionnaire
        </button>
      </div>

      {error && <ErrorBanner msg={error} onClose={() => setError("")} />}

      {managers.length === 0 ? (
        <div style={s.emptyState}>
          <p style={s.emptyTitle}>Aucun gestionnaire</p>
          <p style={s.emptySub}>Créez un compte pour assigner un parking.</p>
          <button style={s.primaryBtn} onClick={() => setShowCreate(true)}>
            + Créer un gestionnaire
          </button>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {[
                  "Utilisateur",
                  "Téléphone",
                  "Parking assigné",
                  "Créé le",
                  "Actions",
                ].map((h) => (
                  <th key={h} style={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {managers.map((m) => (
                <tr key={m.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.userCell}>
                      <div style={s.avatar}>{m.username[0].toUpperCase()}</div>
                      <div>
                        <div style={s.userName}>{m.username}</div>
                        <div style={s.userId}>id: {m.id.slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>{m.phone || "—"}</td>
                  <td style={s.td}>
                    <span style={s.lotBadge}>{m.assigned_lot_name}</span>
                  </td>
                  <td style={s.td}>
                    {new Date(m.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td style={s.td}>
                    <div style={s.actionRow}>
                      <button
                        style={s.detailBtn}
                        onClick={() => navigate(`/admin/managers/${m.id}`)}
                      >
                        Détails
                      </button>
                      <button
                        style={s.deleteBtn}
                        onClick={() => setDeleteId(m.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateManagerModal
          lots={lots}
          onCreated={onCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {created && (
        <PasswordModal manager={created} onClose={() => setCreated(null)} />
      )}

      {deleteId && (
        <Modal
          title="Supprimer ce gestionnaire ?"
          message={`${managers.find((m) => m.id === deleteId)?.username ?? ""} sera définitivement supprimé. Le parking restera intact.`}
          confirmLabel={deleting ? "Suppression…" : "Oui, supprimer"}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
          danger
        />
      )}
    </div>
  );
}

// ── Modal création ────────────────────────────────────────────────────────────

function CreateManagerModal({
  lots,
  onCreated,
  onClose,
}: {
  lots: ParkingLot[];
  onCreated: (m: ManagerCreated) => void;
  onClose: () => void;
}) {
  const { token } = useAuth();

  const [form, setForm] = useState<CreateManagerBody>({
    username: "",
    phone: "",
    assigned_lot_id: lots[0]?.id ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    phone?: string;
    server?: string;
  }>({});

  function validate() {
    const e: typeof errors = {};
    if (!form.username.trim()) e.username = "Le nom d'utilisateur est requis.";
    if (!form.phone.trim()) e.phone = "Le numéro de téléphone est requis.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    if (!token) return;
    setLoading(true);
    setErrors({});
    try {
      const result = await adminApi.createManager(token, form);
      onCreated(result);
    } catch (e: unknown) {
      setErrors({ server: e instanceof Error ? e.message : "Erreur création" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={m.overlay}>
      <div style={m.modal}>
        <div style={m.mHeader}>
          <h3 style={m.mTitle}>Créer un gestionnaire</h3>
          <button style={m.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} style={m.mForm}>
          {/* Nom d'utilisateur */}
          <MField label="Nom d'utilisateur *">
            <input
              style={{ ...m.input, ...(errors.username ? m.inputError : {}) }}
              value={form.username}
              onChange={(e) => {
                setForm((p) => ({ ...p, username: e.target.value }));
                setErrors((p) => ({ ...p, username: undefined }));
              }}
              placeholder="Entrer le nom d'utilisateur"
            />
            {errors.username && (
              <span style={m.fieldError}>{errors.username}</span>
            )}
          </MField>

          {/* Téléphone */}
          <MField label="Téléphone *">
            <input
              style={{ ...m.input, ...(errors.phone ? m.inputError : {}) }}
              value={form.phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setForm((p) => ({ ...p, phone: digits }));
                setErrors((p) => ({ ...p, phone: undefined }));
              }}
              placeholder="Entrer le numéro de téléphone"
              inputMode="numeric"
            />
            {errors.phone && <span style={m.fieldError}>{errors.phone}</span>}
          </MField>

          {/* Parking */}
          <MField label="Parking assigné *">
            <select
              style={m.select}
              value={form.assigned_lot_id}
              onChange={(e) =>
                setForm((p) => ({ ...p, assigned_lot_id: e.target.value }))
              }
            >
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </MField>

          <div style={m.infoBox}>
            Un mot de passe sécurisé sera généré automatiquement et affiché une
            seule fois.
          </div>

          {errors.server && <div style={m.errBox}>{errors.server}</div>}

          <div style={m.mActions}>
            <button type="button" style={m.cancelBtn} onClick={onClose}>
              Annuler
            </button>
            <button type="submit" style={m.submitBtn} disabled={loading}>
              {loading ? "Création…" : "Créer le compte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "#64748b",
          textTransform: "uppercase" as const,
          letterSpacing: "0.4px",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Modal mot de passe généré ─────────────────────────────────────────────────

function PasswordModal({
  manager,
  onClose,
}: {
  manager: ManagerCreated;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(manager.generated_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={m.overlay}>
      <div
        style={{ ...m.modal, maxWidth: "440px", textAlign: "center" as const }}
      >
        <h3
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#1a1a2e",
            marginBottom: "8px",
          }}
        >
          Compte créé avec succès
        </h3>
        <p
          style={{
            fontSize: "13px",
            color: "#64748b",
            marginBottom: "20px",
            lineHeight: "1.6",
          }}
        >
          Communiquez ce mot de passe à{" "}
          <strong style={{ color: "#1a1a2e" }}>{manager.username}</strong>. Il
          ne sera plus jamais affiché.
        </p>
        <div style={m.pwBox}>
          <code style={m.pwCode}>{manager.generated_password}</code>
          <button
            style={{
              ...m.copyBtn,
              background: copied ? "#f0fdf4" : "#f0f4f8",
              color: copied ? "#16a34a" : "#64748b",
              border: `1px solid ${copied ? "#bbf7d0" : "#e2e8f0"}`,
            }}
            onClick={copy}
          >
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
        <div style={{ ...m.infoBox, marginBottom: "16px" }}>
          Parking :{" "}
          <strong style={{ color: "#1a1a2e" }}>
            {manager.assigned_lot_name}
          </strong>
        </div>
        <button style={{ ...m.submitBtn, width: "100%" }} onClick={onClose}>
          J'ai noté le mot de passe
        </button>
      </div>
    </div>
  );
}

const m: Record<string, React.CSSProperties> = {
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
    padding: "24px",
    width: "100%",
    maxWidth: "480px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  },
  mHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
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
  mForm: { display: "flex", flexDirection: "column", gap: "14px" },
  input: {
    background: "#f7f9fc",
    border: "1.5px solid #e2e8f0",
    borderRadius: "9px",
    padding: "10px 14px",
    color: "#1a1a2e",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
  },
  select: {
    background: "#f7f9fc",
    border: "1.5px solid #e2e8f0",
    borderRadius: "9px",
    padding: "10px 14px",
    color: "#1a1a2e",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
  },
  infoBox: {
    background: "#f0f4f8",
    borderRadius: "9px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#64748b",
  },
  errBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "9px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#ef4444",
  },
  mActions: { display: "flex", gap: "10px", justifyContent: "flex-end" },
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
  submitBtn: {
    background: "#1a73e8",
    border: "none",
    borderRadius: "9px",
    color: "#fff",
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    fontFamily: "inherit",
  },
  pwBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#f7f9fc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px 16px",
    marginBottom: "12px",
  },
  pwCode: {
    flex: 1,
    fontSize: "18px",
    fontWeight: 700,
    color: "#1a73e8",
    fontFamily: "monospace",
    letterSpacing: "2px",
    textAlign: "left" as const,
  },
  copyBtn: {
    borderRadius: "8px",
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "inherit",
    fontWeight: 600,
    flexShrink: 0,
  },
  fieldError: {
    fontSize: "12px",
    color: "#ef4444",
    marginTop: "4px",
    marginLeft: "2px",
  },
  inputError: { borderColor: "#ef4444" },
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
  userCell: { display: "flex", alignItems: "center", gap: "10px" },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#e8f0fe",
    border: "1.5px solid #1a73e8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
    color: "#1a73e8",
    flexShrink: 0,
  },
  userName: { fontWeight: 600, color: "#1a1a2e", fontSize: "13px" },
  userId: { fontSize: "11px", color: "#94a3b8" },
  lotBadge: {
    background: "#e8f0fe",
    color: "#1a73e8",
    border: "1px solid #bfdbfe",
    borderRadius: "20px",
    padding: "3px 10px",
    fontSize: "11px",
    fontWeight: 600,
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
  deleteBtn: {
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
