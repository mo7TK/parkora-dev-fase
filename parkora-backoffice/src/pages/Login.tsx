// src/pages/Login.tsx
// Page de connexion du backoffice Parkora.
//
// Design : deux panneaux — branding à gauche, formulaire à droite.
// Toggle en haut du formulaire pour choisir Admin ou Gestionnaire.
// Détecte le rôle depuis le state de navigation si redirigé par ProtectedRoute.

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types/auth";

export default function Login() {
  const { login, user } = useAuth();
  const navigate        = useNavigate();
  const location        = useLocation();

  // Rôle pré-sélectionné si redirigé par ProtectedRoute
  const fromRole = (location.state as { role?: Role } | null)?.role;
  const wrongRole = (location.state as { wrongRole?: boolean } | null)?.wrongRole;

  const [role, setRole]         = useState<Role>(fromRole ?? "admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Redirige si déjà connecté
  useEffect(() => {
    if (user) {
      navigate(user.role === "admin" ? "/admin" : "/manager", { replace: true });
    }
  }, [user, navigate]);

  // Focus automatique sur le champ username
  useEffect(() => {
    inputRef.current?.focus();
  }, [role]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password, role);
      // La redirection est gérée par le useEffect ci-dessus via user
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Connexion échouée.");
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = role === "admin";

  return (
    <div style={s.root}>
      {/* ── Panneau gauche — Branding ──────────────────────────────────── */}
      <div style={s.left}>
        {/* Motif de grille en fond */}
        <div style={s.grid} />

        <div style={s.leftContent}>
          {/* Logo */}
          <div style={s.logoRow}>
            <div style={s.logoIcon}>P</div>
            <span style={s.logoText}>arkora</span>
          </div>

          <p style={s.leftTagline}>
            Plateforme de gestion<br />de stationnement intelligent
          </p>

          {/* Cartes stats déco */}
          <div style={s.statsCards}>
            <StatCard icon="🅿️" label="Parkings actifs"  value="2"    color="#1a73e8" />
            <StatCard icon="📅" label="Réservations/jour" value="48+"  color="#8b5cf6" />
            <StatCard icon="👤" label="Clients inscrits"  value="200+" color="#10b981" />
          </div>
        </div>

        <p style={s.leftFooter}>© 2025 Parkora — Sétif, Algérie</p>
      </div>

      {/* ── Panneau droit — Formulaire ─────────────────────────────────── */}
      <div style={s.right}>
        <div style={s.formCard}>
          {/* En-tête */}
          <div style={s.formHeader}>
            <h1 style={s.formTitle}>Connexion</h1>
            <p style={s.formSub}>Accès réservé au personnel autorisé</p>
          </div>

          {/* Alerte mauvais rôle */}
          {wrongRole && (
            <div style={s.alertBox}>
              <span>⚠️</span>
              <span>Vous n'avez pas les droits pour cette section.</span>
            </div>
          )}

          {/* Toggle Admin / Gestionnaire */}
          <div style={s.toggle}>
            <button
              style={{
                ...s.toggleBtn,
                ...(isAdmin ? s.toggleBtnActive : s.toggleBtnInactive),
              }}
              onClick={() => { setRole("admin"); setError(""); }}
              type="button"
            >
              <span style={s.toggleIcon}>🔑</span> Administrateur
            </button>
            <button
              style={{
                ...s.toggleBtn,
                ...(!isAdmin ? s.toggleBtnActive : s.toggleBtnInactive),
              }}
              onClick={() => { setRole("manager"); setError(""); }}
              type="button"
            >
              <span style={s.toggleIcon}>🏢</span> Gestionnaire
            </button>
          </div>

          {/* Badge rôle actif */}
          <div style={{ ...s.roleBadge, background: isAdmin ? "#1a2d5a" : "#1e2d1e" }}>
            <div style={{
              ...s.roleDot,
              background: isAdmin ? "#1a73e8" : "#10b981",
            }} />
            <span style={{ ...s.roleBadgeText, color: isAdmin ? "#60a5fa" : "#34d399" }}>
              {isAdmin
                ? "Accès complet — gestion globale du système"
                : "Accès limité — gestion de votre parking assigné"}
            </span>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} style={s.form}>
            {/* Username */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Nom d'utilisateur</label>
              <div style={s.inputWrap}>
                <span style={s.inputIcon}>👤</span>
                <input
                  ref={inputRef}
                  style={s.input}
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={isAdmin ? "admin" : "gestionnaire"}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Mot de passe</label>
              <div style={s.inputWrap}>
                <span style={s.inputIcon}>🔒</span>
                <input
                  style={s.input}
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  style={s.eyeBtn}
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                >
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div style={s.errorBox}>
                <span>⛔</span>
                <span>{error}</span>
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              style={{
                ...s.submitBtn,
                background:   loading ? "#374151" : isAdmin ? "#1a73e8" : "#059669",
                cursor:       loading ? "not-allowed" : "pointer",
                boxShadow:    loading
                  ? "none"
                  : isAdmin
                  ? "0 4px 24px rgba(26,115,232,0.35)"
                  : "0 4px 24px rgba(5,150,105,0.35)",
              }}
              disabled={loading}
            >
              {loading ? (
                <span style={s.spinnerWrap}>
                  <span style={s.spinner} />
                  Connexion en cours…
                </span>
              ) : (
                `Se connecter en tant que ${isAdmin ? "Admin" : "Gestionnaire"}`
              )}
            </button>
          </form>

          <p style={s.secureNote}>
            🔐 Connexion sécurisée — Session chiffrée JWT · 7 jours
          </p>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f1117; }
        input::placeholder { color: #4b5563; }
        input:focus { outline: none; border-color: #1a73e8 !important; }
        button:focus-visible { outline: 2px solid #1a73e8; outline-offset: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gridMove {
          from { transform: translateY(0); }
          to   { transform: translateY(40px); }
        }
      `}</style>
    </div>
  );
}

// ── Sous-composant StatCard ───────────────────────────────────────────────────

function StatCard({
  icon, label, value, color,
}: {
  icon: string; label: string; value: string; color: string;
}) {
  return (
    <div style={{
      background:   "rgba(255,255,255,0.04)",
      border:       "1px solid rgba(255,255,255,0.07)",
      borderRadius: "12px",
      padding:      "14px 18px",
      display:      "flex",
      alignItems:   "center",
      gap:          "12px",
      animation:    "fadeIn 0.6s ease both",
    }}>
      <span style={{ fontSize: "22px" }}>{icon}</span>
      <div>
        <div style={{ fontSize: "18px", fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>
          {value}
        </div>
        <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "1px" }}>
          {label}
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: {
    display:       "flex",
    minHeight:     "100vh",
    background:    "#0f1117",
    fontFamily:    "'DM Sans', 'Outfit', system-ui, sans-serif",
  },

  // ── Panneau gauche ──────────────────────────────────────────────────────────
  left: {
    flex:           "0 0 420px",
    background:     "linear-gradient(160deg, #0d1b2e 0%, #0f1117 60%)",
    borderRight:    "1px solid rgba(255,255,255,0.06)",
    display:        "flex",
    flexDirection:  "column",
    justifyContent: "space-between",
    padding:        "40px",
    position:       "relative",
    overflow:       "hidden",
  },
  grid: {
    position:           "absolute",
    inset:              0,
    backgroundImage:    `
      linear-gradient(rgba(26,115,232,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(26,115,232,0.06) 1px, transparent 1px)
    `,
    backgroundSize:     "40px 40px",
    animation:          "gridMove 8s linear infinite",
    pointerEvents:      "none",
  },
  leftContent: {
    position:      "relative",
    zIndex:        1,
    display:       "flex",
    flexDirection: "column",
    gap:           "32px",
  },
  logoRow: {
    display:    "flex",
    alignItems: "center",
    gap:        "10px",
  },
  logoIcon: {
    width:          "44px",
    height:         "44px",
    borderRadius:   "12px",
    background:     "#1a73e8",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontSize:       "22px",
    fontWeight:     900,
    color:          "#fff",
    fontFamily:     "'DM Mono', monospace",
    boxShadow:      "0 0 24px rgba(26,115,232,0.4)",
  },
  logoText: {
    fontSize:   "26px",
    fontWeight: 700,
    color:      "#f1f5f9",
    letterSpacing: "-0.5px",
  },
  leftTagline: {
    fontSize:   "15px",
    color:      "#6b7280",
    lineHeight: "1.7",
  },
  statsCards: {
    display:       "flex",
    flexDirection: "column",
    gap:           "10px",
  },
  leftFooter: {
    position:  "relative",
    zIndex:    1,
    fontSize:  "12px",
    color:     "#374151",
  },

  // ── Panneau droit ───────────────────────────────────────────────────────────
  right: {
    flex:           1,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    padding:        "40px 24px",
  },
  formCard: {
    width:         "100%",
    maxWidth:      "460px",
    animation:     "fadeIn 0.5s ease both",
    display:       "flex",
    flexDirection: "column",
    gap:           "24px",
  },
  formHeader: {
    display:       "flex",
    flexDirection: "column",
    gap:           "6px",
  },
  formTitle: {
    fontSize:      "32px",
    fontWeight:    700,
    color:         "#f1f5f9",
    letterSpacing: "-0.8px",
  },
  formSub: {
    fontSize: "14px",
    color:    "#6b7280",
  },
  alertBox: {
    display:      "flex",
    alignItems:   "center",
    gap:          "10px",
    background:   "#1f1206",
    border:       "1px solid #78350f",
    borderRadius: "10px",
    padding:      "12px 16px",
    fontSize:     "13px",
    color:        "#fbbf24",
  },

  // ── Toggle ──────────────────────────────────────────────────────────────────
  toggle: {
    display:      "flex",
    background:   "#161b27",
    border:       "1px solid rgba(255,255,255,0.07)",
    borderRadius: "12px",
    padding:      "4px",
    gap:          "4px",
  },
  toggleBtn: {
    flex:           1,
    padding:        "10px 0",
    borderRadius:   "9px",
    border:         "none",
    cursor:         "pointer",
    fontSize:       "13px",
    fontWeight:     600,
    fontFamily:     "inherit",
    transition:     "all 0.2s ease",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            "6px",
  },
  toggleBtnActive: {
    background: "#1e2535",
    color:      "#f1f5f9",
    boxShadow:  "0 2px 8px rgba(0,0,0,0.3)",
  },
  toggleBtnInactive: {
    background: "transparent",
    color:      "#4b5563",
  },
  toggleIcon: { fontSize: "14px" },

  // ── Role badge ──────────────────────────────────────────────────────────────
  roleBadge: {
    display:      "flex",
    alignItems:   "center",
    gap:          "8px",
    borderRadius: "8px",
    padding:      "10px 14px",
  },
  roleDot: {
    width:        "7px",
    height:       "7px",
    borderRadius: "50%",
    flexShrink:   0,
  },
  roleBadgeText: {
    fontSize:  "12px",
    fontWeight: 500,
  },

  // ── Formulaire ──────────────────────────────────────────────────────────────
  form: {
    display:       "flex",
    flexDirection: "column",
    gap:           "16px",
  },
  fieldGroup: {
    display:       "flex",
    flexDirection: "column",
    gap:           "7px",
  },
  label: {
    fontSize:   "12px",
    fontWeight: 600,
    color:      "#9ca3af",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  inputWrap: {
    position:   "relative",
    display:    "flex",
    alignItems: "center",
  },
  inputIcon: {
    position:    "absolute",
    left:        "14px",
    fontSize:    "15px",
    pointerEvents: "none",
    userSelect:  "none",
  },
  input: {
    width:        "100%",
    background:   "#161b27",
    border:       "1.5px solid #1e2535",
    borderRadius: "10px",
    padding:      "12px 14px 12px 42px",
    fontSize:     "15px",
    color:        "#f1f5f9",
    fontFamily:   "inherit",
    transition:   "border-color 0.2s ease",
  },
  eyeBtn: {
    position:   "absolute",
    right:      "12px",
    background: "none",
    border:     "none",
    cursor:     "pointer",
    fontSize:   "15px",
    padding:    "4px",
    lineHeight: 1,
  },
  errorBox: {
    display:      "flex",
    alignItems:   "center",
    gap:          "10px",
    background:   "#1c0a0a",
    border:       "1px solid #7f1d1d",
    borderRadius: "10px",
    padding:      "12px 16px",
    fontSize:     "13px",
    color:        "#fca5a5",
  },
  submitBtn: {
    width:        "100%",
    padding:      "14px",
    borderRadius: "12px",
    border:       "none",
    fontSize:     "15px",
    fontWeight:   700,
    color:        "#fff",
    fontFamily:   "inherit",
    letterSpacing: "0.2px",
    transition:   "all 0.2s ease",
    marginTop:    "4px",
  },
  spinnerWrap: {
    display:    "flex",
    alignItems: "center",
    justifyContent: "center",
    gap:        "10px",
  },
  spinner: {
    display:      "inline-block",
    width:        "16px",
    height:       "16px",
    border:       "2px solid rgba(255,255,255,0.2)",
    borderTop:    "2px solid #fff",
    borderRadius: "50%",
    animation:    "spin 0.7s linear infinite",
  },
  secureNote: {
    textAlign:  "center",
    fontSize:   "12px",
    color:      "#374151",
  },
};
