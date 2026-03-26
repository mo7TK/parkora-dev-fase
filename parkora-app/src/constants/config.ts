// ── Backend ───────────────────────────────────────────────────────────────────
// Replace with your computer's local IP (run `ipconfig` on Windows)
export const BACKEND_IP = "192.168.1.36";
export const BACKEND_URL = `http://${BACKEND_IP}:8000`;
export const WS_URL = `ws://${BACKEND_IP}:8000/ws`;

// ── Parking lot (hardcoded for prototype) ─────────────────────────────────────
export const PARKING_LOT = {
  id: 1,
  name: "Parking Central",
  totalSpots: 6,
  latitude: 36.1913, // replace with your actual parking lot coordinates
  longitude: 5.4141,
};
