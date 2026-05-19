// src/pages/admin/ManagerDetails.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { adminApi, type Manager } from "../../api/adminApi";
import { PageLoader, ErrorBanner, Modal } from "./ParkingsList";

// ── Manager Details ───────────────────────────────────────────────────────────

export function ManagerDetails() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [manager, setManager] = useState<Manager | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDel, setShowDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    adminApi
      .getManager(token, id)
      .then(setManager)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  async function confirmDelete() {
    if (!token || !id) return;
    setDeleting(true);
    try {
      await adminApi.deleteManager(token, id);
      navigate("/admin/managers");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur suppression");
      setDeleting(false);
    }
  }

  if (loading) return <PageLoader />;
  if (error) return <ErrorBanner msg={error} />;
  if (!manager) return null;

  return (
    <div style={s.page}>
      <button style={s.backBtn} onClick={() => navigate("/admin/managers")}>
        ← Retour
      </button>

      <div style={s.headerRow}>
        <div style={s.avatarBig}>{manager.username[0].toUpperCase()}</div>
        <div>
          <h2 style={s.name}>{manager.username}</h2>
          <span style={s.roleBadge}>Gestionnaire</span>
        </div>
        <div style={{ flex: 1 }} />
        <button style={s.deleteBtn} onClick={() => setShowDel(true)}>
          Supprimer le compte
        </button>
      </div>

      <div style={s.grid}>
        <InfoCard title="Informations du compte">
          <InfoRow label="Username" value={manager.username} />
          <InfoRow label="Téléphone" value={manager.phone || "—"} />
          <InfoRow label="ID" value={manager.id} mono />
          <InfoRow
            label="Créé le"
            value={new Date(manager.created_at).toLocaleDateString("fr-FR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
        </InfoCard>
        <InfoCard title="Parking assigné">
          <InfoRow label="Nom du parking" value={manager.assigned_lot_name} />
          <InfoRow label="ID du parking" value={manager.assigned_lot_id} mono />
          <div style={{ marginTop: "12px" }}>
            <button
              style={s.linkBtn}
              onClick={() => navigate("/admin/parkings")}
            >
              Voir tous les parkings →
            </button>
          </div>
        </InfoCard>
      </div>

      {showDel && (
        <Modal
          title="Supprimer ce gestionnaire ?"
          message={`Le compte "${manager.username}" sera définitivement supprimé. Son parking restera intact.`}
          confirmLabel={deleting ? "Suppression…" : "Oui, supprimer"}
          onConfirm={confirmDelete}
          onCancel={() => setShowDel(false)}
          danger
        />
      )}
    </div>
  );
}

// ── Clients List ──────────────────────────────────────────────────────────────

export function ClientsList() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState<import("../../api/adminApi").Client[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
    adminApi
      .getClients(token)
      .then(setClients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = clients.filter((c) =>
    `${c.first_name} ${c.last_name} ${c.email}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  async function confirmDelete() {
    if (!deleteId || !token) return;
    setDeleting(true);
    try {
      await adminApi.deleteClient(token, deleteId);
      setClients((prev) => prev.filter((c) => c.id !== deleteId));
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
          <h2 style={s.pageTitle}>Clients</h2>
          <p style={s.pageSub}>
            {clients.length} compte{clients.length !== 1 ? "s" : ""} app mobile
          </p>
        </div>
        <input
          style={s.searchInput}
          placeholder="Rechercher par nom ou email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <ErrorBanner msg={error} onClose={() => setError("")} />}

      {filtered.length === 0 ? (
        <div style={s.emptyState}>
          <p style={s.emptyTitle}>
            {search ? "Aucun résultat" : "Aucun client"}
          </p>
          <p style={s.emptySub}>
            {search
              ? "Essayez un autre terme."
              : "Les comptes créés depuis l'app apparaîtront ici."}
          </p>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {[
                  "Client",
                  "Email",
                  "Téléphone",
                  "Plaque",
                  "Favoris",
                  "Actions",
                ].map((h) => (
                  <th key={h} style={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.userCell}>
                      <span style={{ fontSize: "22px" }}>{c.avatar}</span>
                      <div>
                        <div style={s.userName}>
                          {c.first_name} {c.last_name}
                        </div>
                        <div style={s.userId}>id: {c.id.slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>{c.email}</td>
                  <td style={s.td}>{c.phone || "—"}</td>
                  <td style={s.td}>
                    {c.plate ? (
                      <span style={s.plateBadge}>{c.plate}</span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td style={{ ...s.td, textAlign: "center" }}>
                    {c.favorites.length}
                  </td>
                  <td style={s.td}>
                    <div style={s.actionRow}>
                      <button
                        style={s.detailBtn}
                        onClick={() => navigate(`/admin/clients/${c.id}`)}
                      >
                        Détails
                      </button>
                      <button
                        style={s.deleteBtn2}
                        onClick={() => setDeleteId(c.id)}
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

      {deleteId && (
        <Modal
          title="Supprimer ce client ?"
          message={`${clients.find((c) => c.id === deleteId)?.email ?? ""} sera définitivement supprimé.`}
          confirmLabel={deleting ? "Suppression…" : "Oui, supprimer"}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
          danger
        />
      )}
    </div>
  );
}

// ── Client Details ────────────────────────────────────────────────────────────

export function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [client, setClient] = useState<
    import("../../api/adminApi").ClientDetail | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDel, setShowDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    adminApi
      .getClient(token, id)
      .then(setClient)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  async function confirmDelete() {
    if (!token || !id) return;
    setDeleting(true);
    try {
      await adminApi.deleteClient(token, id);
      navigate("/admin/clients");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur suppression");
      setDeleting(false);
    }
  }

  if (loading) return <PageLoader />;
  if (error) return <ErrorBanner msg={error} />;
  if (!client) return null;

  return (
    <div style={s.page}>
      <button style={s.backBtn} onClick={() => navigate("/admin/clients")}>
        ← Retour
      </button>

      <div style={s.headerRow}>
        <span style={{ fontSize: "52px" }}>{client.avatar}</span>
        <div>
          <h2 style={s.name}>
            {client.first_name} {client.last_name}
          </h2>
          <span
            style={{
              ...s.roleBadge,
              background: "#f0fdf4",
              color: "#16a34a",
              border: "1px solid #bbf7d0",
            }}
          >
            Client app mobile
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <button style={s.deleteBtn} onClick={() => setShowDel(true)}>
          Supprimer le compte
        </button>
      </div>

      <div style={s.statRow}>
        <div style={s.statChip}>
          <span style={s.statVal}>{client.total_reservations}</span>
          <span style={s.statLbl}>Réservations</span>
        </div>
        <div style={s.statChip}>
          <span style={s.statVal}>{client.favorites.length}</span>
          <span style={s.statLbl}>Favoris</span>
        </div>
      </div>

      <div style={s.grid}>
        <InfoCard title="Informations personnelles">
          <InfoRow label="Prénom" value={client.first_name} />
          <InfoRow label="Nom" value={client.last_name} />
          <InfoRow label="Email" value={client.email} />
          <InfoRow label="Téléphone" value={client.phone || "—"} />
          <InfoRow label="ID" value={client.id} mono />
        </InfoCard>
        <InfoCard title="Véhicule & Activité">
          <InfoRow label="Plaque" value={client.plate || "Non renseignée"} />
          <InfoRow
            label="Favoris"
            value={`${client.favorites.length} parking${client.favorites.length !== 1 ? "s" : ""}`}
          />
          <InfoRow
            label="Réservations"
            value={String(client.total_reservations)}
          />
        </InfoCard>
      </div>

      {showDel && (
        <Modal
          title="Supprimer ce client ?"
          message={`Le compte "${client.email}" sera définitivement supprimé.`}
          confirmLabel={deleting ? "Suppression…" : "Oui, supprimer"}
          onConfirm={confirmDelete}
          onCancel={() => setShowDel(false)}
          danger
        />
      )}
    </div>
  );
}

// ── Composants partagés ───────────────────────────────────────────────────────

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "13px 20px",
          borderBottom: "1px solid #f1f5f9",
          background: "#f8fafc",
          fontSize: "12px",
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase" as const,
          letterSpacing: "0.5px",
        }}
      >
        {title}
      </div>
      <div
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: "13px", color: "#94a3b8" }}>{label}</span>
      <span
        style={{
          fontSize: "13px",
          color: "#1a1a2e",
          fontWeight: 600,
          fontFamily: mono ? "monospace" : "inherit",
          maxWidth: "260px",
          textOverflow: "ellipsis",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "20px" },
  backBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "13px",
    padding: 0,
    alignSelf: "flex-start",
    fontFamily: "inherit",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px 24px",
  },
  avatarBig: {
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    background: "#e8f0fe",
    border: "2px solid #1a73e8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    fontWeight: 700,
    color: "#1a73e8",
    flexShrink: 0,
  },
  name: { fontSize: "22px", fontWeight: 700, color: "#1a1a2e" },
  roleBadge: {
    fontSize: "12px",
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: "20px",
    background: "#e8f0fe",
    color: "#1a73e8",
    border: "1px solid #bfdbfe",
    display: "inline-block",
    marginTop: "6px",
  },
  deleteBtn: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    color: "#ef4444",
    padding: "10px 18px",
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "inherit",
    fontWeight: 600,
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#1a73e8",
    cursor: "pointer",
    fontSize: "13px",
    padding: 0,
    fontFamily: "inherit",
  },
  statRow: { display: "flex", gap: "12px" },
  statChip: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  statVal: { fontSize: "24px", fontWeight: 800, color: "#1a1a2e" },
  statLbl: { fontSize: "12px", color: "#94a3b8" },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageTitle: { fontSize: "22px", fontWeight: 700, color: "#1a1a2e" },
  pageSub: { fontSize: "13px", color: "#94a3b8", marginTop: "3px" },
  searchInput: {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    padding: "10px 16px",
    color: "#1a1a2e",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    width: "260px",
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
  userName: { fontWeight: 600, color: "#1a1a2e", fontSize: "13px" },
  userId: { fontSize: "11px", color: "#94a3b8" },
  plateBadge: {
    background: "#fefce8",
    border: "1px solid #fde68a",
    color: "#92400e",
    borderRadius: "6px",
    padding: "2px 10px",
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: "monospace",
    letterSpacing: "2px",
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
  deleteBtn2: {
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
