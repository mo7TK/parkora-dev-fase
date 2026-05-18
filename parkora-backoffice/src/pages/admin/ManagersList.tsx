// src/pages/admin/ManagersList.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  adminApi,
  type Manager, type ParkingLot, type CreateManagerBody, type ManagerCreated,
} from "../../api/adminApi";
import { PageLoader, ErrorBanner, Modal } from "./ParkingsList";

export default function ManagersList() {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [managers,   setManagers]   = useState<Manager[]>([]);
  const [lots,       setLots]       = useState<ParkingLot[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [deleting,   setDeleting]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [created,    setCreated]    = useState<ManagerCreated | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([adminApi.getManagers(token), adminApi.getParkings(token)])
      .then(([m, l]) => { setManagers(m); setLots(l); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function confirmDelete() {
    if (!deleteId || !token) return;
    setDeleting(true);
    try {
      await adminApi.deleteManager(token, deleteId);
      setManagers(prev => prev.filter(m => m.id !== deleteId));
      setDeleteId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur suppression");
    } finally { setDeleting(false); }
  }

  function onCreated(m: ManagerCreated) {
    setManagers(prev => [m, ...prev]);
    setShowCreate(false);
    setCreated(m);
  }

  if (loading) return <PageLoader />;

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Gestionnaires</h2>
          <p style={s.pageSub}>{managers.length} gestionnaire{managers.length !== 1 ? "s" : ""}</p>
        </div>
        <button style={s.primaryBtn} onClick={() => setShowCreate(true)}>
          + Nouveau gestionnaire
        </button>
      </div>

      {error && <ErrorBanner msg={error} onClose={() => setError("")} />}

      {managers.length === 0
        ? (
          <div style={s.emptyState}>
            <span style={{ fontSize: "40px" }}>👔</span>
            <p style={s.emptyTitle}>Aucun gestionnaire</p>
            <p style={s.emptySub}>Créez un compte pour assigner un parking.</p>
            <button style={s.primaryBtn} onClick={() => setShowCreate(true)}>
              + Créer un gestionnaire
            </button>
          </div>
        )
        : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Utilisateur", "Téléphone", "Parking assigné", "Créé le", "Actions"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {managers.map(m => (
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
                        <button style={s.detailBtn}
                          onClick={() => navigate(`/admin/managers/${m.id}`)}>
                          Détails
                        </button>
                        <button style={s.deleteBtn}
                          onClick={() => setDeleteId(m.id)}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Modal création */}
      {showCreate && (
        <CreateManagerModal
          lots={lots}
          onCreated={onCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Modal mot de passe généré */}
      {created && (
        <PasswordModal manager={created} onClose={() => setCreated(null)} />
      )}

      {/* Modal suppression */}
      {deleteId && (
        <Modal
          title="Supprimer ce gestionnaire ?"
          message={`${managers.find(m => m.id === deleteId)?.username ?? ""} sera définitivement supprimé. Le parking restera intact.`}
          confirmLabel={deleting ? "Suppression…" : "Oui, supprimer"}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
          danger
        />
      )}
    </div>
  );
}

// ── Modal création gestionnaire ───────────────────────────────────────────────

function CreateManagerModal({ lots, onCreated, onClose }: {
  lots: ParkingLot[];
  onCreated: (m: ManagerCreated) => void;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState<CreateManagerBody>({
    username: "", phone: "", assigned_lot_id: lots[0]?.id ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!form.username.trim()) { setError("Le username est requis."); return; }
    if (!form.assigned_lot_id) { setError("Choisissez un parking."); return; }
    setLoading(true); setError("");
    try {
      const result = await adminApi.createManager(token, form);
      onCreated(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur création");
    } finally { setLoading(false); }
  }

  return (
    <div style={m.overlay}>
      <div style={m.modal}>
        <div style={m.mHeader}>
          <h3 style={m.mTitle}>Créer un gestionnaire</h3>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={m.mForm}>
          <MField label="Nom d'utilisateur *">
            <input style={m.input} value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              placeholder="Ex: manager_setif1" required />
          </MField>
          <MField label="Téléphone">
            <input style={m.input} value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+213XXXXXXXXX" />
          </MField>
          <MField label="Parking assigné *">
            <select style={m.select}
              value={form.assigned_lot_id}
              onChange={e => setForm(p => ({ ...p, assigned_lot_id: e.target.value }))}>
              {lots.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </MField>
          <div style={m.infoBox}>
            🔑 Un mot de passe sécurisé sera <strong>auto-généré</strong> et affiché une seule fois.
          </div>
          {error && <div style={m.errBox}>⛔ {error}</div>}
          <div style={m.mActions}>
            <button type="button" style={m.cancelBtn} onClick={onClose}>Annuler</button>
            <button type="submit" style={m.submitBtn} disabled={loading}>
              {loading ? "Création…" : "Créer le compte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "12px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.4px" }}>{label}</label>
      {children}
    </div>
  );
}

// ── Modal affichage du mot de passe ───────────────────────────────────────────

function PasswordModal({ manager, onClose }: { manager: ManagerCreated; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copyPassword() {
    navigator.clipboard.writeText(manager.generated_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={m.overlay}>
      <div style={{ ...m.modal, maxWidth: "440px" }}>
        <div style={{ textAlign: "center" as const, padding: "8px 0" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔑</div>
          <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>
            Compte créé avec succès !
          </h3>
          <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px", lineHeight: "1.6" }}>
            Communiquez ce mot de passe à <strong style={{ color: "#f1f5f9" }}>{manager.username}</strong>.
            Il ne sera plus jamais affiché.
          </p>
          <div style={m.pwBox}>
            <code style={m.pwCode}>{manager.generated_password}</code>
            <button style={{ ...m.copyBtn, background: copied ? "#14532d" : "#1e2535" }} onClick={copyPassword}>
              {copied ? "✅ Copié" : "📋 Copier"}
            </button>
          </div>
          <div style={m.infoBox}>
            Parking : <strong style={{ color: "#f1f5f9" }}>{manager.assigned_lot_name}</strong>
          </div>
          <button style={{ ...m.submitBtn, width: "100%", marginTop: "16px" }} onClick={onClose}>
            J'ai noté le mot de passe
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles modaux ─────────────────────────────────────────────────────────────

const m: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal:   { background: "#161b27", border: "1px solid #1e2535", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "480px" },
  mHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  mTitle:  { fontSize: "18px", fontWeight: 700, color: "#f1f5f9" },
  closeBtn:{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "18px", padding: "4px" },
  mForm:   { display: "flex", flexDirection: "column", gap: "14px" },
  input:   { background: "#111827", border: "1.5px solid #1e2535", borderRadius: "9px", padding: "10px 14px", color: "#f1f5f9", fontSize: "14px", fontFamily: "inherit", outline: "none", width: "100%" },
  select:  { background: "#111827", border: "1.5px solid #1e2535", borderRadius: "9px", padding: "10px 14px", color: "#f1f5f9", fontSize: "14px", fontFamily: "inherit", outline: "none", width: "100%" },
  infoBox: { background: "#1e2535", borderRadius: "9px", padding: "10px 14px", fontSize: "13px", color: "#9ca3af" },
  errBox:  { background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: "9px", padding: "10px 14px", fontSize: "13px", color: "#fca5a5" },
  mActions:{ display: "flex", gap: "10px", justifyContent: "flex-end" },
  cancelBtn:{ background: "#1e2535", border: "none", borderRadius: "9px", color: "#9ca3af", padding: "10px 20px", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" },
  submitBtn:{ background: "#1a73e8", border: "none", borderRadius: "9px", color: "#fff", padding: "10px 20px", cursor: "pointer", fontSize: "14px", fontWeight: 600, fontFamily: "inherit" },
  pwBox:   { display: "flex", alignItems: "center", gap: "10px", background: "#111827", border: "1px solid #1e2535", borderRadius: "10px", padding: "14px 16px", marginBottom: "12px" },
  pwCode:  { flex: 1, fontSize: "18px", fontWeight: 700, color: "#fbbf24", fontFamily: "monospace", letterSpacing: "2px" },
  copyBtn: { border: "none", borderRadius: "8px", color: "#f1f5f9", padding: "8px 14px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", fontWeight: 600, flexShrink: 0 },
};

// ── Styles page ───────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page:       { display: "flex", flexDirection: "column", gap: "20px" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  pageTitle:  { fontSize: "22px", fontWeight: 700, color: "#f1f5f9" },
  pageSub:    { fontSize: "13px", color: "#6b7280", marginTop: "3px" },
  primaryBtn: { background: "#1a73e8", border: "none", borderRadius: "10px", color: "#fff", padding: "10px 20px", cursor: "pointer", fontSize: "14px", fontWeight: 600, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(26,115,232,0.3)" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "80px 20px", background: "#161b27", border: "1px dashed #1e2535", borderRadius: "14px" },
  emptyTitle: { fontSize: "18px", fontWeight: 700, color: "#f1f5f9" },
  emptySub:   { fontSize: "14px", color: "#6b7280" },
  tableWrap:  { background: "#161b27", border: "1px solid #1e2535", borderRadius: "14px", overflow: "hidden" },
  table:      { width: "100%", borderCollapse: "collapse" },
  th:         { padding: "13px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #1e2535", background: "#111827" },
  tr:         { borderBottom: "1px solid #1e2535" },
  td:         { padding: "13px 16px", fontSize: "13px", color: "#d1d5db", verticalAlign: "middle" },
  userCell:   { display: "flex", alignItems: "center", gap: "10px" },
  avatar:     { width: "32px", height: "32px", borderRadius: "50%", background: "#1e2d47", border: "1.5px solid #1a73e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#60a5fa", flexShrink: 0 },
  userName:   { fontWeight: 600, color: "#f1f5f9", fontSize: "13px" },
  userId:     { fontSize: "11px", color: "#4b5563" },
  lotBadge:   { background: "#1e2d47", color: "#60a5fa", border: "1px solid #1d4ed8", borderRadius: "20px", padding: "3px 10px", fontSize: "11px", fontWeight: 600 },
  actionRow:  { display: "flex", gap: "8px" },
  detailBtn:  { background: "#1e2535", border: "none", borderRadius: "7px", color: "#9ca3af", fontSize: "12px", padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" },
  deleteBtn:  { background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: "7px", color: "#f87171", padding: "5px 10px", cursor: "pointer", fontSize: "13px" },
};
