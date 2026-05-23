// src/pages/admin/CreateParking.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { adminApi, type CreateParkingBody } from "../../api/adminApi";

const DAYS = [
  { key: "lun", label: "Lundi" },
  { key: "mar", label: "Mardi" },
  { key: "mer", label: "Mercredi" },
  { key: "jeu", label: "Jeudi" },
  { key: "ven", label: "Vendredi" },
  { key: "sam", label: "Samedi" },
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

type Errors = {
  name?: string;
  total_spots?: string;
  price_per_hour?: string;
  latitude?: string;
  longitude?: string;
  server?: string;
};

export default function CreateParking() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<CreateParkingBody>({
    name: "",
    latitude: 0,
    longitude: 0,
    total_spots: 0,
    hero_image: "",
    minimap_image: "",
    type: "free",
    address: "",
    bio: "",
    price_per_hour: 0,
    is_open: true,
    opening_hours: "24/7",
  });

  const [hoursMode, setHoursMode] = useState<"247" | "schedule">("247");
  const [schedule, setSchedule] = useState<Record<string, string>>({
    ...DEFAULT_SCHEDULE,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  function set<K extends keyof CreateParkingBody>(
    key: K,
    value: CreateParkingBody[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!form.name.trim()) e.name = "Entrer le nom du parking.";
    if (!form.total_spots || form.total_spots < 1)
      e.total_spots = "Entrer un nombre de places valide.";
    if (!form.latitude) e.latitude = "Entrer la latitude.";
    if (!form.longitude) e.longitude = "Entrer la longitude.";
    if (form.type === "paid" && form.price_per_hour <= 0)
      e.price_per_hour = "Entrer un prix par heure valide.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    const body: CreateParkingBody = {
      ...form,
      opening_hours: hoursMode === "247" ? "24/7" : schedule,
    };
    setLoading(true);
    setErrors({});
    try {
      await adminApi.createParking(token, body);
      navigate("/admin/parkings");
    } catch (e: unknown) {
      setErrors({ server: e instanceof Error ? e.message : "Erreur création" });
    } finally {
      setLoading(false);
    }
  }

  const err = (key: keyof Errors) => errors[key];
  const inputStyle = (key: keyof Errors) => ({
    ...s.input,
    ...(err(key) ? s.inputError : {}),
  });

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <button style={s.backBtn} onClick={() => navigate("/admin/parkings")}>
          ← Retour
        </button>
        <h2 style={s.pageTitle}>Créer un parking</h2>
        <p style={s.pageSub}>Remplissez les informations du nouveau parking.</p>
      </div>

      {errors.server && <div style={s.serverError}>{errors.server}</div>}

      <form onSubmit={handleSubmit} style={s.form}>
        {/* ── Informations générales ───────────────────────────────────── */}
        <Section title="Informations générales">
          <div style={s.row2}>
            <Field label="Nom du parking *">
              <input
                style={inputStyle("name")}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Entrer le nom du parking"
              />
              {err("name") && <FieldError msg={err("name")!} />}
            </Field>
            <Field label="Type">
              <div style={s.toggleGroup}>
                {(["free", "paid"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    style={{
                      ...s.toggleOpt,
                      ...(form.type === t ? s.toggleOptActive : {}),
                    }}
                    onClick={() => set("type", t)}
                  >
                    {t === "free" ? "Gratuit" : "Payant"}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div style={s.row2}>
            <Field label="Nombre de places *">
              <input
                style={inputStyle("total_spots")}
                type="number"
                min={1}
                value={form.total_spots || ""}
                placeholder="Entrer le nombre de places"
                onChange={(e) => set("total_spots", Number(e.target.value))}
              />
              {err("total_spots") && <FieldError msg={err("total_spots")!} />}
            </Field>
            {form.type === "paid" && (
              <Field label="Prix par heure (DA) *">
                <input
                  style={inputStyle("price_per_hour")}
                  type="number"
                  min={1}
                  value={form.price_per_hour || ""}
                  placeholder="Entrer le prix par heure"
                  onChange={(e) =>
                    set("price_per_hour", Number(e.target.value))
                  }
                />
                {err("price_per_hour") && (
                  <FieldError msg={err("price_per_hour")!} />
                )}
              </Field>
            )}
          </div>

          <Field label="Adresse">
            <input
              style={s.input}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Entrer l'adresse"
            />
          </Field>

          <Field label="Description">
            <textarea
              style={s.textarea}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="Entrer une description"
              rows={3}
            />
          </Field>
        </Section>

        {/* ── Coordonnées GPS ──────────────────────────────────────────── */}
        <Section title="Coordonnées GPS">
          <div style={s.row2}>
            <Field label="Latitude *">
              <input
                style={inputStyle("latitude")}
                type="number"
                step="any"
                value={form.latitude || ""}
                placeholder="Entrer la latitude"
                onChange={(e) => set("latitude", parseFloat(e.target.value))}
              />
              {err("latitude") && <FieldError msg={err("latitude")!} />}
            </Field>
            <Field label="Longitude *">
              <input
                style={inputStyle("longitude")}
                type="number"
                step="any"
                value={form.longitude || ""}
                placeholder="Entrer la longitude"
                onChange={(e) => set("longitude", parseFloat(e.target.value))}
              />
              {err("longitude") && <FieldError msg={err("longitude")!} />}
            </Field>
          </div>
          <p style={s.hint}>
            Ouvrez Google Maps, faites un clic droit sur l'emplacement et copiez
            les coordonnées.
          </p>
        </Section>

        {/* ── Images ───────────────────────────────────────────────────── */}
        <Section title="Images (noms de fichiers)">
          <div style={s.row2}>
            <Field label="Photo d'entrée">
              <input
                style={s.input}
                value={form.hero_image}
                onChange={(e) => set("hero_image", e.target.value)}
                placeholder="Entrer le nom du fichier"
              />
            </Field>
            <Field label="Plan minimap">
              <input
                style={s.input}
                value={form.minimap_image}
                onChange={(e) => set("minimap_image", e.target.value)}
                placeholder="Entrer le nom du fichier"
              />
            </Field>
          </div>
          <div style={s.infoBox}>
            Déposez les fichiers dans{" "}
            <code style={s.code}>assets/images/entrance/</code> et{" "}
            <code style={s.code}>assets/images/minimaps/</code>
          </div>
        </Section>

        {/* ── Statut & Horaires ─────────────────────────────────────────── */}
        <Section title="Statut & Horaires">
          <Field label="Statut initial">
            <div style={s.toggleGroup}>
              <button
                type="button"
                style={{
                  ...s.toggleOpt,
                  ...(form.is_open ? s.toggleOptGreen : {}),
                }}
                onClick={() => set("is_open", true)}
              >
                Ouvert
              </button>
              <button
                type="button"
                style={{
                  ...s.toggleOpt,
                  ...(!form.is_open ? s.toggleOptRed : {}),
                }}
                onClick={() => set("is_open", false)}
              >
                Fermé
              </button>
            </div>
          </Field>

          <Field label="Horaires d'ouverture">
            <div style={s.toggleGroup}>
              <button
                type="button"
                style={{
                  ...s.toggleOpt,
                  ...(hoursMode === "247" ? s.toggleOptActive : {}),
                }}
                onClick={() => setHoursMode("247")}
              >
                24h/24 — 7j/7
              </button>
              <button
                type="button"
                style={{
                  ...s.toggleOpt,
                  ...(hoursMode === "schedule" ? s.toggleOptActive : {}),
                }}
                onClick={() => setHoursMode("schedule")}
              >
                Planning hebdomadaire
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
                    onChange={(e) =>
                      setSchedule((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    placeholder="08:00-20:00 ou Fermé"
                  />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div style={s.actions}>
          <button
            type="button"
            style={s.cancelBtn}
            onClick={() => navigate("/admin/parkings")}
          >
            Annuler
          </button>
          <button type="submit" style={s.submitBtn} disabled={loading}>
            {loading ? "Création…" : "Créer le parking"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function FieldError({ msg }: { msg: string }) {
  return (
    <span
      style={{
        fontSize: "12px",
        color: "#ef4444",
        marginTop: "4px",
        marginLeft: "2px",
      }}
    >
      {msg}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={ss.section}>
      <h3 style={ss.sectionTitle}>{title}</h3>
      <div style={ss.sectionBody}>{children}</div>
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
    <div style={ss.field}>
      <label style={ss.label}>{label}</label>
      {children}
    </div>
  );
}

const ss: Record<string, React.CSSProperties> = {
  section: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    padding: "14px 20px",
    borderBottom: "1px solid #f1f5f9",
    background: "#f8fafc",
  },
  sectionBody: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
};

const s: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    maxWidth: "760px",
  },
  pageHeader: { display: "flex", flexDirection: "column", gap: "4px" },
  backBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "13px",
    padding: 0,
    marginBottom: "4px",
    fontFamily: "inherit",
    alignSelf: "flex-start",
  },
  pageTitle: { fontSize: "22px", fontWeight: 700, color: "#1a1a2e" },
  pageSub: { fontSize: "13px", color: "#94a3b8" },
  serverError: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    padding: "14px 20px",
    color: "#ef4444",
    fontSize: "14px",
  },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
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
  inputError: { borderColor: "#ef4444" },
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
  toggleGroup: { display: "flex", gap: "8px" },
  toggleOpt: {
    flex: 1,
    padding: "9px 14px",
    borderRadius: "9px",
    border: "1.5px solid #e2e8f0",
    background: "#f7f9fc",
    color: "#94a3b8",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 500,
  },
  toggleOptActive: {
    background: "#e8f0fe",
    borderColor: "#bfdbfe",
    color: "#1a73e8",
    fontWeight: 600,
  },
  toggleOptGreen: {
    background: "#f0fdf4",
    borderColor: "#bbf7d0",
    color: "#16a34a",
    fontWeight: 600,
  },
  toggleOptRed: {
    background: "#fef2f2",
    borderColor: "#fecaca",
    color: "#ef4444",
    fontWeight: 600,
  },
  infoBox: {
    background: "#f0f4f8",
    borderRadius: "9px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#64748b",
  },
  code: {
    background: "#e2e8f0",
    borderRadius: "4px",
    padding: "1px 6px",
    fontSize: "12px",
    fontFamily: "monospace",
    color: "#1a73e8",
  },
  hint: { fontSize: "12px", color: "#94a3b8" },
  scheduleGrid: { display: "flex", flexDirection: "column", gap: "8px" },
  scheduleRow: { display: "flex", alignItems: "center", gap: "12px" },
  scheduleDay: {
    width: "80px",
    fontSize: "13px",
    color: "#64748b",
    fontWeight: 600,
    flexShrink: 0,
  },
  actions: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    paddingTop: "8px",
  },
  cancelBtn: {
    background: "#f0f4f8",
    border: "none",
    borderRadius: "10px",
    color: "#64748b",
    padding: "12px 24px",
    cursor: "pointer",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  submitBtn: {
    background: "#1a73e8",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    padding: "12px 24px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    fontFamily: "inherit",
    boxShadow: "0 4px 12px rgba(26,115,232,0.25)",
  },
};
