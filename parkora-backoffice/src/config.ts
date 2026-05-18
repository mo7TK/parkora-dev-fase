// src/config.ts
// Constantes réseau partagées entre tous les modules du backoffice.

export const BACKEND_IP = import.meta.env.VITE_BACKEND_IP ?? "192.168.1.38";
export const BACKEND_URL = `http://${BACKEND_IP}:8000`;
export const WS_BASE_URL = `ws://${BACKEND_IP}:8000/ws`;
