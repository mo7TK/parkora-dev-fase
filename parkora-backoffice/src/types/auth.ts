// src/types/auth.ts
// Types d'authentification pour le backoffice Parkora

export type Role = "admin" | "manager";

export interface AdminUser {
  id: string;
  username: string;
  role: "admin";
}

export interface ManagerUser {
  id: string;
  username: string;
  phone: string;
  assigned_lot_id: string;
  assigned_lot_name: string;
  role: "manager";
}

export type BackofficeUser = AdminUser | ManagerUser;

export interface AuthState {
  user: BackofficeUser | null;
  token: string | null;
  loading: boolean;
}
