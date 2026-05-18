// src/api/managerApi.ts
// Requêtes HTTP vers /backoffice/manager/* centralisées ici.

import { BACKEND_URL } from "../config";

const BASE = `${BACKEND_URL}/backoffice/manager`;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ManagedParking {
  id:             string;
  name:           string;
  latitude:       number;
  longitude:      number;
  total_spots:    number;
  hero_image:     string;
  minimap_image:  string;
  type:           "free" | "paid";
  address:        string;
  bio:            string;
  price_per_hour: number;
  is_open:        boolean;
  opening_hours:  string | Record<string, string>;
}

export interface UpdateParkingBody {
  address?:        string;
  bio?:            string;
  is_open?:        boolean;
  opening_hours?:  string | Record<string, string>;
  price_per_hour?: number;
}

export interface Reservation {
  id:             string;
  user_id:        string;
  lot_id:         string;
  lot_name:       string;
  spot_id:        number;
  date:           string;
  start_time:     string;
  end_time:       string;
  duration_min:   number;
  total_price:    number;
  status:         "confirmed" | "cancelled" | "completed";
  payment_method: string;
  created_at:     string;
}

export interface TodayReservations {
  date:         string;
  total:        number;
  reservations: Reservation[];
}

export interface SpotStatus {
  id:     number;
  status: "free" | "occupied" | "reserved";
}

// ── Helper ────────────────────────────────────────────────────────────────────

function h(token: string): HeadersInit {
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

async function req<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res  = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Erreur serveur");
  return data as T;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const managerApi = {

  // ── Parking ─────────────────────────────────────────────────────────────────
  getMyParking: (token: string) =>
    req<ManagedParking>(`${BASE}/parking`, { headers: h(token) }),

  updateMyParking: (token: string, body: UpdateParkingBody) =>
    req<ManagedParking>(`${BASE}/parking`, {
      method:  "PUT",
      headers: h(token),
      body:    JSON.stringify(body),
    }),

  // ── Réservations ────────────────────────────────────────────────────────────
  getReservations: (token: string, params?: { status?: string; date?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.date)   q.set("date",   params.date);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return req<Reservation[]>(`${BASE}/reservations${qs}`, { headers: h(token) });
  },

  getTodayReservations: (token: string) =>
    req<TodayReservations>(`${BASE}/reservations/today`, { headers: h(token) }),

  cancelReservation: (token: string, id: string) =>
    req<{ status: string }>(`${BASE}/reservations/${id}`, {
      method:  "DELETE",
      headers: h(token),
    }),
};
