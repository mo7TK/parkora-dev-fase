// src/pages/admin/ClientDetails.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { adminApi, type ClientDetail } from "../../api/adminApi";
import { PageLoader, ErrorBanner, Modal } from "./ParkingsList";

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientDetail | null>(null);
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
          <span style={s.roleBadge}>Client app mobile</span>
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
          <InfoRow label="Téléphone" value={client.phone || "—"} />
          <InfoRow label="Email" value={client.email} />
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
  name: { fontSize: "22px", fontWeight: 700, color: "#1a1a2e" },
  roleBadge: {
    fontSize: "12px",
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: "20px",
    background: "#f0fdf4",
    color: "#16a34a",
    border: "1px solid #bbf7d0",
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
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
};
