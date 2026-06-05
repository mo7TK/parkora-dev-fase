// src/pages/admin/ClientsList.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { adminApi, type Client } from "../../api/adminApi";
import { PageLoader, ErrorBanner, Modal } from "./ParkingsList";

export default function ClientsList() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
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
        <div style={s.searchWrap}>
          <Search size={15} color="#94a3b8" />
          <input
            style={s.searchInput}
            placeholder="Rechercher par nom ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
                {["Client", "Téléphone", "Email", "Actions"].map((h) => (
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
                      <div>
                        <div style={s.userName}>
                          {c.first_name} {c.last_name}
                        </div>
                        <div style={s.userId}>id: {c.id.slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>{c.phone || "—"}</td>
                  <td style={s.td}>{c.email}</td>
                  <td style={s.td}>
                    <div style={s.actionRow}>
                      <button
                        style={s.detailBtn}
                        onClick={() => navigate(`/admin/clients/${c.id}`)}
                      >
                        Détails
                      </button>
                      <button
                        style={s.deleteBtn}
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

const s: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "20px" },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageTitle: { fontSize: "22px", fontWeight: 700, color: "#1a1a2e" },
  pageSub: { fontSize: "13px", color: "#94a3b8", marginTop: "3px" },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    padding: "10px 16px",
    width: "260px",
  },
  searchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#1a1a2e",
    fontSize: "14px",
    fontFamily: "inherit",
    width: "100%",
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
