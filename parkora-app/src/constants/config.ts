// ── Network ───────────────────────────────────────────────────────────────────
// Replace BACKEND_IP local IP (run `ipconfig` on Windows).
export const BACKEND_IP = "192.168.1.42";
export const BACKEND_URL = `http://${BACKEND_IP}:8000`;

// WS_BASE_URL does NOT include a lot id — that gets appended at runtime.
// Usage: `${WS_BASE_URL}/${lotId}`
export const WS_BASE_URL = `ws://${BACKEND_IP}:8000/ws`;
