// src/pages/admin/CreateParking.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { adminApi, type CreateParkingBody } from "../../api/adminApi";
import { ErrorBanner } from "./ParkingsList";

const DAYS = [
  { key: "lun", label: "Lundi"    },
  { key: "mar", label: "Mardi"    },
  { key: "mer", label: "Mercredi" },
  { key: "jeu", label: "Jeudi"    },
  { key: "ven", label: "Vendredi" },
  { key: "sam", label: "Samedi"   },
  { key: "dim", label: "Dimanche" },
];

const DEFAULT_SCHEDULE: Record<string, string> = {
  lun: "08:00-20:00",
  mar: "08:00-20:00",
  mer: "08:00-20:00",
  jeu: "08:00-20:00",
  ven: "08:00-18:00",
  sam: "09:00-13:00",
  dim: "Fermé",
};

export default function CreateParking() {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [form, setForm] = useState<CreateParkingBody>({
    name:           "",
    latitude:       36.75,
    longitude:      5.039,
    total_spots:    10,
    hero_image:     "",
    minimap_image:  "",
    type:           "free",
    address:        "",
    bio:            "",
    price_per_hour: 0,
    is_open:        true,
    opening_hours:  "24/7",
  });

  const [hoursMode, setHoursMode] = useState<"247" | "schedule">("247");
  const [schedule,  setSchedule]  = useState<Record<string, string>>({ ...DEFAULT_SCHEDULE });
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  function set<K extends keyof CreateParkingBody>(key: K, value: CreateParkingBody[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!form.name.trim()) { setError("Le nom du parking est requis."); return; }
    if (form.type === "paid" && form.price_per_hour <= 0) {
      setError("Un parking payant doit avoir un prix par heure > 0.");
      return;
    }

    const body: CreateParkingBody = {
      ...form,
      opening_hours: hoursMode === "247" ? "24/7" : schedule,
    };

    setLoading(true);
    setError("");
    try {
      await adminApi.createParking(token, body);
      navigate("/admin/parkings");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur création");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      {/* En-tête */}
      <div style={s.pageHeader}>
        <div>
          <button style={s.backBtn} onClick={() => navigate("/admin/parkings")}>← Retour</button>
          <h2 style={s.pageTitle}>Créer un parking</h2>
          <p style={s.pageSub}>Remplissez les informations du nouveau parking.</p>
        </div>
      </div>

      {error && <ErrorBanner msg={error} onClose={() => setError("")} />}

      <form onSubmit={handleSubmit} style={s.form}>

        {/* ── Informations de base ─────────────────────────────────────── */}
        <Section title="Informations générales">
          <div style={s.row2}>
            <Field label="Nom du parking *">
              <input style={s.input} value={form.name}
                onChange={e => set("name", e.target.value)} placeholder="Ex: Parking Centre-Ville" required />
            </Field>
            <Field label="Type">
              <div style={s.toggleGroup}>
                {(["free", "paid"] as const).map(t => (
                  <button key={t} type="button"
                    style={{ ...s.toggleOpt, ...(form.type === t ? s.toggleOptActive : {}) }}
                    onClick={() => set("type", t)}>
                    {t === "free" ? "🟢 Gratuit" : "💳 Payant"}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div style={s.row2}>
            <Field label="Nombre de places *">
              <input style={s.input} type="number" min={1} value={form.total_spots}
                onChange={e => set("total_spots", Number(e.target.value))} required />
            </Field>
            {form.type === "paid" && (
              <Field label="Prix par heure (DA) *">
                <input style={s.input} type="number" min={1} value={form.price_per_hour}
                  onChange={e => set("price_per_hour", Number(e.target.value))} required />
              </Field>
            )}
          </div>

          <Field label="Adresse">
            <input style={s.input} value={form.address}
              onChange={e => set("address", e.target.value)}
              placeholder="Ex: Rue Didouche Mourad, Sétif 19000" />
          </Field>

          <Field label="Description (bio)">
            <textarea style={s.textarea} value={form.bio}
              onChange={e => set("bio", e.target.value)}
              placeholder="Courte description visible dans l'app mobile…"
              rows={3} />
          </Field>
        </Section>

        {/* ── Coordonnées GPS ──────────────────────────────────────────── */}
        <Section title="Coordonnées GPS">
          <div style={s.row2}>
            <Field label="Latitude *">
              <input style={s.input} type="number" step="any" value={form.latitude}
                onChange={e => set("latitude", parseFloat(e.target.value))} required />
            </Field>
            <Field label="Longitude *">
              <input style={s.input} type="number" step="any" value={form.longitude}
                onChange={e => set("longitude", parseFloat(e.target.value))} required />
            </Field>
          </div>
          <p style={s.hint}>💡 Ouvrez Google Maps, faites un clic droit sur l'emplacement → copier les coordonnées.</p>
        </Section>

        {/* ── Images ───────────────────────────────────────────────────── */}
        <Section title="Images (noms de fichiers)">
          <div style={s.row2}>
            <Field label="Photo d'entrée (hero_image)">
              <input style={s.input} value={form.hero_image}
                onChange={e => set("hero_image", e.target.value)}
                placeholder="parking_entrance.jpg" />
            </Field>
            <Field label="Plan minimap (minimap_image)">
              <input style={s.input} value={form.minimap_image}
                onChange={e => set("minimap_image", e.target.value)}
                placeholder="parking_map.png" />
            </Field>
          </div>
          <p style={s.hint}>
            📁 Déposez les fichiers dans :<br/>
            <code style={s.code}>assets/images/entrance/</code> pour hero_image<br/>
            <code style={s.code}>assets/images/minimaps/</code> pour minimap_image
          </p>
        </Section>

        {/* ── Statut & Horaires ─────────────────────────────────────────── */}
        <Section title="Statut & Horaires">
          <Field label="Statut initial">
            <div style={s.toggleGroup}>
              <button type="button"
                style={{ ...s.toggleOpt, ...(form.is_open ? s.toggleOptGreen : {}) }}
                onClick={() => set("is_open", true)}>
                ✅ Ouvert
              </button>
              <button type="button"
                style={{ ...s.toggleOpt, ...(!form.is_open ? s.toggleOptRed : {}) }}
                onClick={() => set("is_open", false)}>
                🔴 Fermé
              </button>
            </div>
          </Field>

          <Field label="Horaires d'ouverture">
            <div style={s.toggleGroup}>
              <button type="button"
                style={{ ...s.toggleOpt, ...(hoursMode === "247" ? s.toggleOptActive : {}) }}
                onClick={() => setHoursMode("247")}>
                🕐 24h/24 — 7j/7
              </button>
              <button type="button"
                style={{ ...s.toggleOpt, ...(hoursMode === "schedule" ? s.toggleOptActive : {}) }}
                onClick={() => setHoursMode("schedule")}>
                📅 Planning hebdomadaire
              </button>
            </div>
          </Field>

          {hoursMode === "schedule" && (
            <div style={s.scheduleGrid}>
              {DAYS.map(({ key, label }) => (
                <div key={key} style={s.scheduleRow}>
                  <label style={s.scheduleDay}>{label}</label>
                  <input
                    style={{ ...s.input, flex: 1 }}
                    value={schedule[key] ?? ""}
                    onChange={e => setSchedule(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder="08:00-20:00 ou Fermé"
                  />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div style={s.actions}>
          <button type="button" style={s.cancelBtn} onClick={() => navigate("/admin/parkings")}>
            Annuler
          </button>
          <button type="submit" style={s.submitBtn} disabled={loading}>
            {loading ? "Création…" : "✅ Créer le parking"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={ss.section}>
      <h3 style={ss.sectionTitle}>{title}</h3>
      <div style={ss.sectionBody}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={ss.field}>
      <label style={ss.label}>{label}</label>
      {children}
    </div>
  );
}

const ss: Record<string, React.CSSProperties> = {
  section: {
    background: "#161b27", border: "1px solid #1e2535",
    borderRadius: "14px", overflow: "hidden",
  },
  sectionTitle: {
    fontSize: "13px", fontWeight: 700, color: "#9ca3af",
    textTransform: "uppercase", letterSpacing: "0.5px",
    padding: "14px 20px", borderBottom: "1px solid #1e2535",
    background: "#111827",
  },
  sectionBody: { padding: "20px", display: "flex", flexDirection: "column", gap: "16px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "12px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.4px" },
};

const s: Record<string, React.CSSProperties> = {
  page:      { display: "flex", flexDirection: "column", gap: "20px", maxWidth: "760px" },
  pageHeader: { display: "flex", flexDirection: "column", gap: "4px" },
  backBtn:   { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "13px", padding: 0, marginBottom: "6px", fontFamily: "inherit" },
  pageTitle: { fontSize: "22px", fontWeight: 700, color: "#f1f5f9" },
  pageSub:   { fontSize: "13px", color: "#6b7280" },
  form:      { display: "flex", flexDirection: "column", gap: "16px" },
  row2:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  input: {
    background: "#111827", border: "1.5px solid #1e2535",
    borderRadius: "9px", padding: "10px 14px",
    color: "#f1f5f9", fontSize: "14px", fontFamily: "inherit",
    outline: "none", width: "100%",
  },
  textarea: {
    background: "#111827", border: "1.5px solid #1e2535",
    borderRadius: "9px", padding: "10px 14px",
    color: "#f1f5f9", fontSize: "14px", fontFamily: "inherit",
    outline: "none", resize: "vertical", width: "100%",
  },
  toggleGroup: { display: "flex", gap: "8px" },
  toggleOpt: {
    flex: 1, padding: "9px 14px", borderRadius: "9px",
    border: "1.5px solid #1e2535", background: "#111827",
    color: "#6b7280", fontSize: "13px", cursor: "pointer",
    fontFamily: "inherit", fontWeight: 500, transition: "all 0.15s",
  },
  toggleOptActive: { background: "#1e2d47", borderColor: "#1a73e8", color: "#60a5fa" },
  toggleOptGreen:  { background: "#0a1a0a", borderColor: "#14532d", color: "#4ade80" },
  toggleOptRed:    { background: "#1c0a0a", borderColor: "#7f1d1d", color: "#f87171" },
  hint: { fontSize: "12px", color: "#4b5563", lineHeight: "1.8" },
  code: { background: "#111827", border: "1px solid #1e2535", borderRadius: "4px", padding: "1px 6px", fontSize: "12px", fontFamily: "monospace", color: "#60a5fa" },
  scheduleGrid: { display: "flex", flexDirection: "column", gap: "8px" },
  scheduleRow:  { display: "flex", alignItems: "center", gap: "12px" },
  scheduleDay:  { width: "80px", fontSize: "13px", color: "#9ca3af", fontWeight: 600, flexShrink: 0 },
  actions:    { display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "8px" },
  cancelBtn:  { background: "#1e2535", border: "none", borderRadius: "10px", color: "#9ca3af", padding: "12px 24px", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" },
  submitBtn:  { background: "#1a73e8", border: "none", borderRadius: "10px", color: "#fff", padding: "12px 24px", cursor: "pointer", fontSize: "14px", fontWeight: 600, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(26,115,232,0.3)" },
};
