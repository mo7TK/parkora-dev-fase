// src/pages/manager/LiveStream.tsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useManagerParking } from "../../context/ManagerContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;

type StreamStatus = "connecting" | "live" | "no_signal" | "error";

export default function LiveStream() {
  const { token } = useAuth();
  const { parking, loading } = useManagerParking();

  const imgRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [fullscreen, setFullscreen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Construction de l'URL du flux MJPEG avec le token en query param
  const streamUrl =
    parking && token
      ? `${BACKEND_URL}/stream/video/${parking.id}?token=${token}`
      : null;

  // Gestion fullscreen natif
  useEffect(() => {
    function onFsChange() {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (!wrapRef.current) return;
    if (!document.fullscreenElement) {
      wrapRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Reconnexion automatique si l'image coupe
  useEffect(() => {
    if (!streamUrl || !imgRef.current) return;
    setStatus("connecting");

    const img = imgRef.current;
    let retryTimer: ReturnType<typeof setTimeout>;

    function onLoad() {
      setStatus("live");
    }
    function onError() {
      setStatus("no_signal");
      // Réessayer dans 3 s
      retryTimer = setTimeout(() => {
        if (imgRef.current) {
          setStatus("connecting");
          imgRef.current.src = streamUrl + "&t=" + Date.now();
        }
      }, 3000);
    }

    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
    img.src = streamUrl;

    return () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
      img.src = "";
      clearTimeout(retryTimer);
    };
  }, [streamUrl]);

  if (loading) return <Loader />;
  if (!parking)
    return (
      <div style={{ color: "#ef4444", padding: "40px" }}>
        Parking introuvable.
      </div>
    );

  return (
    <div style={s.page}>
      {/* ── En-tête minimaliste ───────────────────────────────────────── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <h2 style={s.title}>Caméra Live</h2>
          <span style={s.parkingName}>{parking.name}</span>
        </div>
        <StatusPill status={status} />
      </div>

      {/* ── Lecteur vidéo ─────────────────────────────────────────────── */}
      <div
        ref={wrapRef}
        style={{ ...s.playerWrap, ...(fullscreen ? s.playerFs : {}) }}
      >
        {/* Image MJPEG */}
        <img
          ref={imgRef}
          alt="Flux vidéo parking"
          style={s.videoImg}
          draggable={false}
        />

        {/* Overlay quand pas de signal */}
        {status !== "live" && (
          <div style={s.overlay}>
            <div style={s.overlayInner}>
              {status === "connecting" && (
                <>
                  <div style={s.spinner} />
                  <p style={s.overlayTitle}>Connexion au flux…</p>
                  <p style={s.overlayHint}>
                    Assurez-vous que <code style={s.code}>detect.py</code> est
                    en cours d'exécution.
                  </p>
                </>
              )}
              {status === "no_signal" && (
                <>
                  <div style={s.noSignalIcon}>
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#64748b"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </div>
                  <p style={s.overlayTitle}>Aucun signal</p>
                  <p style={s.overlayHint}>
                    Reconnexion automatique dans 3 secondes…
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Barre de contrôles en bas */}
        <div style={{ ...s.controls, opacity: fullscreen ? 1 : undefined }}>
          {/* Infos parking */}
          <div style={s.controlsLeft}>
            <div style={s.liveDot} />
            <span style={s.controlsText}>{parking.name}</span>
          </div>

          {/* Plein écran */}
          <button
            style={s.fsBtn}
            onClick={toggleFullscreen}
            title={fullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {fullscreen ? <IconMinimize /> : <IconMaximize />}
          </button>
        </div>
      </div>

      {/* ── Aide ──────────────────────────────────────────────────────── */}
      <div style={s.helpBox}>
        <span style={s.helpIcon}>ℹ</span>
        <span style={s.helpText}>
          Le flux vidéo est envoyé en direct par{" "}
          <code style={s.code}>detect.py</code>. Les emplacements sont annotés
          en <span style={{ color: "#22c55e", fontWeight: 600 }}>vert</span>{" "}
          (libre) et en{" "}
          <span style={{ color: "#ef4444", fontWeight: 600 }}>rouge</span>{" "}
          (occupé).
        </span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

        /* Contrôles visibles au survol */
        .player-wrap:hover .controls-bar { opacity: 1 !important; }

        /* Fullscreen : fond noir total */
        :fullscreen { background: #000; }
      `}</style>
    </div>
  );
}

// ── StatusPill ────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: StreamStatus }) {
  const cfg = {
    connecting: {
      bg: "#fef9c3",
      border: "#fde68a",
      color: "#ca8a04",
      dot: "#f59e0b",
      label: "Connexion…",
      pulse: true,
    },
    live: {
      bg: "#f0fdf4",
      border: "#bbf7d0",
      color: "#16a34a",
      dot: "#22c55e",
      label: "En direct",
      pulse: true,
    },
    no_signal: {
      bg: "#f1f5f9",
      border: "#e2e8f0",
      color: "#64748b",
      dot: "#94a3b8",
      label: "Aucun signal",
      pulse: false,
    },
    error: {
      bg: "#fef2f2",
      border: "#fecaca",
      color: "#dc2626",
      dot: "#ef4444",
      label: "Erreur",
      pulse: false,
    },
  }[status];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "7px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: "20px",
        padding: "7px 14px",
      }}
    >
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: cfg.dot,
          animation: cfg.pulse ? "pulse 1.5s ease infinite" : "none",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: "13px", fontWeight: 700, color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  );
}

// ── Icônes ────────────────────────────────────────────────────────────────────

const IconMaximize = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);
const IconMinimize = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
  </svg>
);

// ── Loader ────────────────────────────────────────────────────────────────────

function Loader() {
  return (
    <div
      style={{ display: "flex", justifyContent: "center", paddingTop: "80px" }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
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

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  // En-tête
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    display: "flex",
    alignItems: "baseline",
    gap: "12px",
  },
  title: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#1a1a2e",
  },
  parkingName: {
    fontSize: "14px",
    color: "#94a3b8",
    fontWeight: 500,
  },

  // Lecteur
  playerWrap: {
    position: "relative",
    background: "#0a0a0f",
    borderRadius: "16px",
    overflow: "hidden",
    aspectRatio: "16 / 9",
    width: "100%",
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    border: "1px solid #1e2535",
  },
  playerFs: {
    borderRadius: 0,
    border: "none",
    aspectRatio: "unset",
    width: "100vw",
    height: "100vh",
    position: "fixed",
    inset: 0,
    zIndex: 9999,
  },
  videoImg: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  },

  // Overlay "pas de signal"
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(10,10,15,0.92)",
  },
  overlayInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "14px",
    textAlign: "center",
    padding: "0 40px",
  },
  spinner: {
    width: "44px",
    height: "44px",
    border: "3px solid rgba(255,255,255,0.1)",
    borderTop: "3px solid #1a73e8",
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
  },
  noSignalIcon: {
    opacity: 0.4,
  },
  overlayTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#fff",
    margin: 0,
  },
  overlayHint: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.45)",
    margin: 0,
    lineHeight: 1.6,
  },

  // Barre de contrôles
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "20px 20px 16px",
    background:
      "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    transition: "opacity 0.2s",
  },
  controlsLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  liveDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#ef4444",
    animation: "pulse 1.5s ease infinite",
    flexShrink: 0,
  },
  controlsText: {
    fontSize: "13px",
    fontWeight: 600,
    color: "rgba(255,255,255,0.85)",
  },
  fsBtn: {
    background: "rgba(255,255,255,0.12)",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    padding: "7px",
    display: "flex",
    alignItems: "center",
    backdropFilter: "blur(4px)",
  },

  // Aide
  helpBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px 16px",
  },
  helpIcon: {
    fontSize: "14px",
    color: "#94a3b8",
    flexShrink: 0,
    marginTop: "1px",
  },
  helpText: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: 1.6,
  },
  code: {
    background: "#e2e8f0",
    borderRadius: "4px",
    padding: "1px 6px",
    fontSize: "12px",
    fontFamily: "monospace",
    color: "#1a73e8",
  },
};
