// src/pages/manager/LiveStream.tsx
import { useEffect, useRef, useState } from "react";
import { useManagerParking } from "../../context/ManagerContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;
const WS_URL = import.meta.env.VITE_WS_URL as string;

type SpotStatus = "free" | "occupied" | "reserved";
interface Spot {
  id: number;
  status: SpotStatus;
}

export default function LiveStream() {
  const { parking, loading } = useManagerParking();

  const [spots, setSpots] = useState<Spot[]>([]);
  const [imgError, setImgError] = useState(false);
  const [showStream, setShowStream] = useState(false); // bascule après 2s (MJPEG ne déclenche pas onLoad)
  const [isFullscreen, setIsFullscreen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // ── WebSocket spots ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!parking?.id) return;

    function connect() {
      const ws = new WebSocket(`${WS_URL}/${parking!.id}`);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        setSpots(JSON.parse(e.data).spots ?? []);
      };
      ws.onclose = () => {
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    }
    connect();
    return () => wsRef.current?.close();
  }, [parking?.id]);

  // ── Timer stream — MJPEG ne déclenche pas onLoad, on bascule après 2s ──────
  useEffect(() => {
    if (!parking?.id || imgError) return;
    setShowStream(false);
    const t = setTimeout(() => setShowStream(true), 2000);
    return () => clearTimeout(t);
  }, [parking?.id, imgError]);

  // ── Fullscreen API ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // ── URL stream MJPEG ───────────────────────────────────────────────────────
  const streamUrl = parking?.id
    ? `${BACKEND_URL}/stream/${parking.id}?t=${Date.now()}`
    : null;

  // ── Stats ──────────────────────────────────────────────────────────────────
  const isPaid = parking?.type === "paid";
  const total = spots.length || parking?.total_spots || 0;
  const free = spots.filter((s) => s.status === "free").length;
  const occupied = spots.filter((s) => s.status === "occupied").length;
  const reserved = spots.filter((s) => s.status === "reserved").length;

  if (loading) return <Loader />;
  if (!parking)
    return <div style={{ color: "#ef4444" }}>Parking introuvable.</div>;

  return (
    <div style={s.page}>
      {/* ── En-tête ───────────────────────────────────────────────────────── */}
      <div>
        <h1 style={s.title}>Diffusion en direct — {parking.name}</h1>
      </div>

      {/* ── Player MJPEG ──────────────────────────────────────────────────── */}
      <div ref={playerRef} style={s.playerWrap}>
        {streamUrl && !imgError ? (
          <>
            {/* Animation de chargement — disparaît après 2s quand le flux arrive */}
            {!showStream && (
              <div style={s.streamLoading}>
                <div style={s.spinnerWrap}>
                  <div style={s.spinnerRing} />
                  <div style={s.spinnerCenter}>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgba(255,255,255,0.7)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M23 7l-7 5 7 5V7z" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </div>
                </div>
                <p style={s.loadingText}>Connexion au flux vidéo…</p>
              </div>
            )}

            <img
              ref={imgRef}
              src={streamUrl}
              style={{ ...s.videoImg, opacity: showStream ? 1 : 0 }}
              alt="Flux caméra en direct"
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          /* ── No signal ─────────────────────────────────────────────────── */
          <div style={s.noSignal}>
            <div style={s.noSignalIcon}>📷</div>
            <p style={s.noSignalTitle}>Aucun signal caméra</p>
            <p style={s.noSignalHint}>
              Lancez <code style={s.code}>detect.py</code> avec le bon{" "}
              <code style={s.code}>PARKING_LOT_ID</code>
            </p>
            {imgError && (
              <button
                style={s.retryBtn}
                onClick={() => {
                  setImgError(false);
                  setShowStream(false);
                }}
              >
                Réessayer
              </button>
            )}
          </div>
        )}

        {/* Overlay : badge LIVE + bouton fullscreen */}
        <div style={s.playerOverlay}>
          <div style={s.liveBadge}>
            <div style={s.liveDot} />
            LIVE
          </div>
          <button
            style={s.fsBtn}
            onClick={toggleFullscreen}
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? (
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
                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
            ) : (
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
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Stats compactes ───────────────────────────────────────────────── */}
      <div
        style={{
          ...s.counters,
          gridTemplateColumns: isPaid ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
        }}
      >
        <Counter value={free} label="Libres" color="#22c55e" />
        <Counter value={occupied} label="Occupés" color="#ef4444" />
        {isPaid && (
          <Counter value={reserved} label="Réservés" color="#f97316" />
        )}
        <Counter value={total} label="Total" color="#1a73e8" />
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.25; } }
        @keyframes pulse { 0%,100% { transform: scale(1);   opacity:0.5; }
                           50%     { transform: scale(1.35); opacity:0;   } }
      `}</style>
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function Counter({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div style={{ ...s.counter, borderColor: color + "35" }}>
      <span style={{ fontSize: "20px", fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </span>
      <span
        style={{
          fontSize: "11px",
          color: "#94a3b8",
          fontWeight: 600,
          marginTop: "2px",
        }}
      >
        {label}
      </span>
    </div>
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

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: "14px" },

  // En-tête
  title: { fontSize: "20px", fontWeight: 700, color: "#1a1a2e" },
  sub: { fontSize: "13px", color: "#94a3b8", marginTop: "2px" },

  // Player
  playerWrap: {
    position: "relative",
    background: "#0f1117",
    borderRadius: "14px",
    overflow: "hidden",
    border: "1px solid #1e2535",
    aspectRatio: "16/9",
    maxHeight: "360px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  videoImg: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    transition: "opacity 0.3s ease",
  },

  // Animation chargement flux
  streamLoading: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    background: "#0f1117",
    zIndex: 2,
  },
  // Cercle pulsant derrière le spinner
  pulseRing: {
    position: "absolute",
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    border: "2px solid #1a73e8",
    animation: "pulse 1.8s ease-out infinite",
  },
  // Conteneur spinner + icône
  spinnerWrap: {
    position: "relative",
    width: "52px",
    height: "52px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerRing: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: "2.5px solid rgba(255,255,255,0.08)",
    borderTop: "2.5px solid #1a73e8",
    animation: "spin 1s linear infinite",
  },
  spinnerCenter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.55)",
    fontWeight: 500,
    marginTop: "4px",
  },
  // Overlay
  playerOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "10px 12px",
    pointerEvents: "none",
  },
  liveBadge: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "rgba(239,68,68,0.88)",
    borderRadius: "6px",
    padding: "3px 9px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "0.5px",
    pointerEvents: "none",
  },
  liveDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#fff",
    animation: "blink 1.2s ease-in-out infinite",
  },
  fsBtn: {
    background: "rgba(0,0,0,0.55)",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    padding: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "all",
    backdropFilter: "blur(4px)",
  },

  // No signal
  noSignal: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    padding: "40px 20px",
  },
  noSignalIcon: { fontSize: "38px" },
  noSignalTitle: { fontSize: "15px", fontWeight: 700, color: "#94a3b8" },
  noSignalHint: { fontSize: "12px", color: "#64748b", textAlign: "center" },
  retryBtn: {
    marginTop: "6px",
    background: "#1a73e8",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    padding: "7px 16px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  // Compteurs — hauteur réduite
  counters: {
    display: "grid",
    gap: "10px",
  },
  counter: {
    background: "#fff",
    border: "1.5px solid",
    borderRadius: "10px",
    padding: "8px 14px", // padding réduit vs avant
    display: "flex",
    flexDirection: "column",
    gap: "1px",
  },

  code: {
    background: "#1e2535",
    borderRadius: "4px",
    padding: "1px 5px",
    fontSize: "11px",
    fontFamily: "monospace",
    color: "#60a5fa",
  },
};
