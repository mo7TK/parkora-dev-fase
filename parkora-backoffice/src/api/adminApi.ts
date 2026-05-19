// src/api/adminApi.ts
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;

const BASE = `${BACKEND_URL}/backoffice/admin`;

export interface ParkingLot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  total_spots: number;
  hero_image: string;
  minimap_image: string;
  type: "free" | "paid";
  address: string;
  bio: string;
  price_per_hour: number;
  is_open: boolean;
  opening_hours: string | Record<string, string>;
  manager: { id: string; username: string; phone: string } | null;
}

export interface CreateParkingBody {
  name: string;
  latitude: number;
  longitude: number;
  total_spots: number;
  hero_image: string;
  minimap_image: string;
  type: "free" | "paid";
  address: string;
  bio: string;
  price_per_hour: number;
  is_open: boolean;
  opening_hours: string | Record<string, string>;
}

export interface Manager {
  id: string;
  username: string;
  phone: string;
  assigned_lot_id: string;
  assigned_lot_name: string;
  created_at: string;
}

export interface ManagerCreated extends Manager {
  generated_password: string;
}

export interface CreateManagerBody {
  username: string;
  phone: string;
  assigned_lot_id: string;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar: string;
  plate: string;
  favorites: string[];
}

export interface ClientDetail extends Client {
  total_reservations: number;
}

function h(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function req<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Erreur serveur");
  return data as T;
}

export const adminApi = {
  getParkings: (token: string) =>
    req<ParkingLot[]>(`${BASE}/parkings`, { headers: h(token) }),

  createParking: (token: string, body: CreateParkingBody) =>
    req<ParkingLot>(`${BASE}/parkings`, {
      method: "POST",
      headers: h(token),
      body: JSON.stringify(body),
    }),

  deleteParking: (token: string, id: string) =>
    req<{ status: string }>(`${BASE}/parkings/${id}`, {
      method: "DELETE",
      headers: h(token),
    }),

  getManagers: (token: string) =>
    req<Manager[]>(`${BASE}/managers`, { headers: h(token) }),

  getManager: (token: string, id: string) =>
    req<Manager>(`${BASE}/managers/${id}`, { headers: h(token) }),

  createManager: (token: string, body: CreateManagerBody) =>
    req<ManagerCreated>(`${BASE}/managers`, {
      method: "POST",
      headers: h(token),
      body: JSON.stringify(body),
    }),

  deleteManager: (token: string, id: string) =>
    req<{ status: string }>(`${BASE}/managers/${id}`, {
      method: "DELETE",
      headers: h(token),
    }),

  getClients: (token: string) =>
    req<Client[]>(`${BASE}/clients`, { headers: h(token) }),

  getClient: (token: string, id: string) =>
    req<ClientDetail>(`${BASE}/clients/${id}`, { headers: h(token) }),

  deleteClient: (token: string, id: string) =>
    req<{ status: string }>(`${BASE}/clients/${id}`, {
      method: "DELETE",
      headers: h(token),
    }),
};
