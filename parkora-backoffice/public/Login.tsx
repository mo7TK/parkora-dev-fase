// src/pages/Login.tsx
// Page de connexion — style identique à l'app mobile (blanc + bleu #1a73e8).
// Pas d'animations, pas de stats, pas d'emojis, juste le logo + formulaire.

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types/auth";

// ── Icônes SVG inline (identiques au style Ionicons de l'app) ─────────────────

const IconUser = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#b0b8c8"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconLock = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#b0b8c8"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconEye = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#b0b8c8"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#b0b8c8"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconAlert = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#ef4444"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Login() {
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromRole = (location.state as { role?: Role } | null)?.role;

  const [role, setRole] = useState<Role>(fromRole ?? "admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Redirect si déjà connecté
  useEffect(() => {
    if (!authLoading && user) {
      navigate(user.role === "admin" ? "/admin" : "/manager", {
        replace: true,
      });
    }
  }, [user, authLoading, navigate]);

  // Focus auto sur le champ username
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Connexion échouée.");
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = role === "admin";

  return (
    <div style={s.screen}>
      {/* Fond dégradé en haut — identique à l'app mobile */}
      <div style={s.topBg} />

      <div style={s.container}>
        {/* ── Zone logo ──────────────────────────────────────────────────── */}
        <div style={s.logoArea}>
          <img src="/parkora-logo-white.png" alt="Parkora" style={s.logo} />
          <p style={s.tagline}>Stationnement Intelligent</p>
        </div>

        {/* ── Carte formulaire ───────────────────────────────────────────── */}
        <div style={s.card}>
          <h1 style={s.title}>Connexion</h1>
          <p style={s.subtitle}>
            {isAdmin ? "Espace Administrateur" : "Espace Gestionnaire"}
          </p>

          {/* Toggle Admin / Gestionnaire */}
          <div style={s.toggle}>
            <button
              type="button"
              style={{
                ...s.toggleBtn,
                ...(isAdmin ? s.toggleActive : s.toggleInactive),
              }}
              onClick={() => {
                setRole("admin");
                setError("");
              }}
            >
              Administrateur
            </button>
            <button
              type="button"
              style={{
                ...s.toggleBtn,
                ...(!isAdmin ? s.toggleActive : s.toggleInactive),
              }}
              onClick={() => {
                setRole("manager");
                setError("");
              }}
            >
              Gestionnaire
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} style={s.form}>
            {/* Username */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Nom d'utilisateur</label>
              <div style={s.field}>
                <span style={s.fieldIcon}>
                  <IconUser />
                </span>
                <input
                  ref={inputRef}
                  style={s.input}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isAdmin ? "admin" : "gestionnaire"}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Mot de passe</label>
              <div style={s.field}>
                <span style={s.fieldIcon}>
                  <IconLock />
                </span>
                <input
                  style={s.input}
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  style={s.eyeBtn}
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex={-1}
                >
                  {showPw ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div style={s.errorBox}>
                <IconAlert />
                <span style={s.errorText}>{error}</span>
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              style={{ ...s.btn, ...(loading ? s.btnOff : {}) }}
              disabled={loading}
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>
      </div>

      {/* CSS global minimal */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f0f4f8; }
        input::placeholder { color: #c8cdd8; }
        input:focus { outline: none; }
        button:focus-visible { outline: 2px solid #1a73e8; outline-offset: 2px; }
      `}</style>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: "100vh",
    backgroundColor: "#f0f4f8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    position: "relative",
  },

  // Dégradé en haut identique à l'app mobile
  topBg: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "280px",
    background: "linear-gradient(135deg, #1a73e8, #4da3ff)",
    borderBottomLeftRadius: "36px",
    borderBottomRightRadius: "36px",
    zIndex: 0,
  },

  container: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "400px",
    padding: "60px 20px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "24px",
  },

  // Logo
  logoArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
  },
  logo: {
    width: "200px",
    height: "auto",
  },
  tagline: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.85)",
    fontWeight: 600,
    letterSpacing: "1px",
  },

  // Carte
  card: {
    backgroundColor: "#fff",
    borderRadius: "24px",
    padding: "28px 24px",
    width: "100%",
    boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
  },
  title: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#1a1a2e",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "13px",
    color: "#94a3b8",
    marginBottom: "20px",
  },

  // Toggle
  toggle: {
    display: "flex",
    backgroundColor: "#f7f9fc",
    borderRadius: "12px",
    padding: "4px",
    gap: "4px",
    marginBottom: "24px",
    border: "1.5px solid #e2e8f0",
  },
  toggleBtn: {
    flex: 1,
    padding: "10px 0",
    borderRadius: "9px",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    fontFamily: "inherit",
  },
  toggleActive: {
    backgroundColor: "#1a73e8",
    color: "#fff",
    boxShadow: "0 2px 8px rgba(26,115,232,0.3)",
  },
  toggleInactive: {
    backgroundColor: "transparent",
    color: "#94a3b8",
  },

  // Formulaire
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#4a5568",
  },
  field: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#f7f9fc",
    borderRadius: "12px",
    border: "1.5px solid #e2e8f0",
    paddingLeft: "14px",
    paddingRight: "14px",
    height: "50px",
    gap: "10px",
  },
  fieldIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: "none",
    background: "transparent",
    fontSize: "15px",
    color: "#1a1a2e",
    outline: "none",
    fontFamily: "inherit",
  },
  eyeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "4px",
    flexShrink: 0,
  },

  // Erreur
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#fef2f2",
    borderRadius: "10px",
    padding: "12px",
    border: "1px solid #fecaca",
  },
  errorText: {
    fontSize: "13px",
    color: "#ef4444",
    flex: 1,
  },

  // Bouton
  btn: {
    backgroundColor: "#1a73e8",
    borderRadius: "14px",
    height: "52px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 700,
    color: "#fff",
    fontFamily: "inherit",
    boxShadow: "0 4px 12px rgba(26,115,232,0.3)",
    marginTop: "4px",
    width: "100%",
  },
  btnOff: {
    backgroundColor: "#74aaf0",
    cursor: "not-allowed",
    boxShadow: "none",
  },
};
