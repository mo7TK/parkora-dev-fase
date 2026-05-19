// src/pages/manager/ParkingSettings.tsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useManagerParking } from "../../context/ManagerContext";
import { managerApi, type UpdateParkingBody } from "../../api/managerApi";

const DAYS = [
  { key: "lun", label: "Lundi" },
  { key: "mar", label: "Mardi" },
  { key: "mer", label: "Mercredi" },
  { key: "jeu", label: "Jeudi" },
  { key: "ven", label: "Vendredi" },
  { key: "sam", label: "Samedi" },
  { key: "dim", label: "Dimanche" },
];

// ── helpers ───────────────────────────────────────────────────────────────────

function initHoursMode(
  oh: string | Record<string, string>,
): "247" | "schedule" {
  return oh === "24/7" || typeof oh === "string" ? "247" : "schedule";
}

function initSchedule(
  oh: string | Record<string, string>,
): Record<string, string> {
  return typeof oh === "object" && oh !== null
    ? (oh as Record<string, string>)
    : {};
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ParkingSettings() {
  const { token } = useAuth();
  const { parking, loading, refresh } = useManagerParking();

  // Derive a stable "parkingId" so the reset effect only fires when the
  // parking itself changes, not on every re-render.
  const parkingId = parking?.id ?? null;

  // All form state is keyed to parkingId; when it changes we re-initialise.
  const initialAddress = useMemo(() => parking?.address ?? "", [parkingId]); // eslint-disable-line react-hooks/exhaustive-deps
  const initialBio = useMemo(() => parking?.bio ?? "", [parkingId]); // eslint-disable-line react-hooks/exhaustive-deps
  const initialIsOpen = useMemo(() => parking?.is_open ?? true, [parkingId]); // eslint-disable-line react-hooks/exhaustive-deps
  const initialPrice = useMemo(() => parking?.price_per_hour ?? 0, [parkingId]); // eslint-disable-line react-hooks/exhaustive-deps
  const initialHoursMode = useMemo(
    () => (parking ? initHoursMode(parking.opening_hours) : ("247" as const)),
    [parkingId],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const initialSchedule = useMemo(
    () => (parking ? initSchedule(parking.opening_hours) : {}),
    [parkingId],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const [address, setAddress] = useState(initialAddress);
  const [bio, setBio] = useState(initialBio);
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [pricePerHour, setPricePerHour] = useState(initialPrice);
  const [hoursMode, setHoursMode] = useState<"247" | "schedule">(
    initialHoursMode,
  );
  const [schedule, setSchedule] =
    useState<Record<string, string>>(initialSchedule);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Reset form fields when the parking data loads or changes.
  // We use a microtask (Promise.resolve().then) so the setState calls happen
  // asynchronously — outside the effect body — which avoids the React Compiler
  // "setState synchronously within an effect" warning.
  useEffect(() => {
    if (!parking) return;
    const p = parking;
    Promise.resolve().then(() => {
      setAddress(p.address ?? "");
      setBio(p.bio ?? "");
      setIsOpen(p.is_open);
      setPricePerHour(p.price_per_hour);
      setHoursMode(initHoursMode(p.opening_hours));
      setSchedule(initSchedule(p.opening_hours));
    });
  }, [parkingId]); // only re-run when the parking identity changes

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (parking?.type === "paid" && pricePerHour < 0) {
      setError("Le prix ne peut pas être négatif.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess(false);
    const body: UpdateParkingBody = {
      address,
      bio,
      is_open: isOpen,
      price_per_hour: pricePerHour,
      opening_hours: hoursMode === "247" ? "24/7" : schedule,
    };
    try {
      await managerApi.updateMyParking(token, body);
      refresh();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader />;
  if (!parking)
    return <div style={{ color: "#ef4444" }}>Parking introuvable.</div>;

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Mon Parking</h2>
        <p style={s.pageSub}>
          Modifier les informations de{" "}
          <strong style={{ color: "#1a1a2e" }}>{parking.name}</strong>
        </p>
      </div>

      {/* Champs non modifiables */}
      <div style={s.readonlyCard}>
        <p style={s.readonlyTitle}>
          Informations non modifiables — contactez l'administrateur pour les
          changer.
        </p>
        <div style={s.readonlyGrid}>
          <ReadonlyField label="Nom" value={parking.name} />
          <ReadonlyField
            label="Type"
            value={parking.type === "paid" ? "Payant" : "Gratuit"}
          />
          <ReadonlyField label="Places" value={String(parking.total_spots)} />
          <ReadonlyField
            label="Coordonnées"
            value={`${parking.latitude}, ${parking.longitude}`}
          />
        </div>
      </div>

      {success && (
        <div style={s.successBox}>Informations mises à jour avec succès.</div>
      )}
      {error && <div style={s.errorBox}>{error}</div>}

      <form onSubmit={handleSave} style={s.form}>
        {/* Statut */}
        <Section title="Statut d'ouverture">
          <div style={s.toggleGroup}>
            <ToggleBtn
              active={isOpen}
              color="green"
              onClick={() => setIsOpen(true)}
              label="Ouvert — Accepter les clients"
            />
            <ToggleBtn
              active={!isOpen}
              color="red"
              onClick={() => setIsOpen(false)}
              label="Fermé — Suspendre l'activité"
            />
          </div>
        </Section>

        {/* Prix */}
        {parking.type === "paid" && (
          <Section title="Tarification">
            <Field label="Prix par heure (DA)">
              <input
                style={s.input}
                type="number"
                min={0}
                value={pricePerHour}
                onChange={(e) => setPricePerHour(Number(e.target.value))}
              />
            </Field>
            <p style={s.hint}>
              Tarif actuel :{" "}
              <strong style={{ color: "#1a73e8" }}>
                {parking.price_per_hour} DA/h
              </strong>
            </p>
          </Section>
        )}

        {/* Adresse & Bio */}
        <Section title="Description & Localisation">
          <Field label="Adresse">
            <input
              style={s.input}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Rue Didouche Mourad, Sétif 19000"
            />
          </Field>
          <Field label="Description">
            <textarea
              style={s.textarea}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Description visible dans l'application mobile…"
              rows={3}
            />
          </Field>
        </Section>

        {/* Horaires */}
        <Section title="Horaires d'ouverture">
          <div style={s.toggleGroup}>
            <ToggleBtn
              active={hoursMode === "247"}
              color="blue"
              onClick={() => setHoursMode("247")}
              label="Ouvert 24h/24 — 7j/7"
            />
            <ToggleBtn
              active={hoursMode === "schedule"}
              color="blue"
              onClick={() => setHoursMode("schedule")}
              label="Planning hebdomadaire"
            />
          </div>
          {hoursMode === "schedule" && (
            <div style={s.scheduleGrid}>
              {DAYS.map(({ key, label }) => (
                <div key={key} style={s.scheduleRow}>
                  <label style={s.scheduleDay}>{label}</label>
                  <input
                    style={{ ...s.input, flex: 1 }}
                    value={schedule[key] ?? ""}
                    onChange={(e) =>
                      setSchedule((p) => ({ ...p, [key]: e.target.value }))
                    }
                    placeholder="08:00-20:00 ou Fermé"
                  />
                </div>
              ))}
            </div>
          )}
        </Section>

        <button
          type="submit"
          style={{
            ...s.saveBtn,
            background: saving ? "#74aaf0" : "#1a73e8",
            cursor: saving ? "not-allowed" : "pointer",
          }}
          disabled={saving}
        >
          {saving ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </form>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
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

function Field({
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

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      <span
        style={{
          fontSize: "11px",
          color: "#94a3b8",
          textTransform: "uppercase" as const,
          letterSpacing: "0.4px",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "13px", color: "#64748b" }}>{value}</span>
    </div>
  );
}

function ToggleBtn({
  active,
  color,
  onClick,
  label,
}: {
  active: boolean;
  color: "green" | "red" | "blue";
  onClick: () => void;
  label: string;
}) {
  const colors = {
    green: { bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a" },
    red: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
    blue: { bg: "#e8f0fe", border: "#bfdbfe", text: "#1a73e8" },
  };
  const c = colors[color];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "12px 16px",
        borderRadius: "10px",
        border: `1.5px solid ${active ? c.border : "#e2e8f0"}`,
        background: active ? c.bg : "#f7f9fc",
        color: active ? c.text : "#94a3b8",
        fontSize: "13px",
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left" as const,
      }}
    >
      {label}
    </button>
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
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    maxWidth: "720px",
  },
  pageHeader: { display: "flex", flexDirection: "column", gap: "4px" },
  pageTitle: { fontSize: "22px", fontWeight: 700, color: "#1a1a2e" },
  pageSub: { fontSize: "13px", color: "#94a3b8", marginTop: "3px" },
  readonlyCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px 20px",
  },
  readonlyTitle: { fontSize: "12px", color: "#94a3b8", marginBottom: "12px" },
  readonlyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
  },
  successBox: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    padding: "12px 16px",
    fontSize: "14px",
    color: "#16a34a",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "12px 16px",
    fontSize: "14px",
    color: "#ef4444",
  },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  toggleGroup: { display: "flex", gap: "10px" },
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
  textarea: {
    background: "#f7f9fc",
    border: "1.5px solid #e2e8f0",
    borderRadius: "9px",
    padding: "10px 14px",
    color: "#1a1a2e",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical",
    width: "100%",
  },
  scheduleGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "4px",
  },
  scheduleRow: { display: "flex", alignItems: "center", gap: "12px" },
  scheduleDay: {
    width: "80px",
    fontSize: "13px",
    color: "#64748b",
    fontWeight: 600,
    flexShrink: 0,
  },
  hint: { fontSize: "12px", color: "#94a3b8" },
  saveBtn: {
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    padding: "14px 28px",
    fontSize: "15px",
    fontWeight: 700,
    fontFamily: "inherit",
    alignSelf: "flex-start",
    boxShadow: "0 4px 12px rgba(26,115,232,0.25)",
  },
};
