// Modul Definisi Peran Aplikasi dan Pemetaan Profil Pengguna (PSR-2).
// Mengatur taksonomi peran resmi PASARIN:
// - vendor: Pedagang los pasar pemilik stok komoditas.
// - warteg: Mitra pembeli komersial pangan terjangkau (Tier 1).
// - social_kitchen: Dapur sosial dan panti asuhan penerima donasi pangan (Tier 2).
// - maggot: Fasilitas budidaya biokonversi maggot BSF pengolah limbah organik (Tier 3).
// - logistics: Pengemudi armada kurir pengantaran muatan.
// - manager: Pengelola unit pasar (UPB Pasar Jaya) pengawas kelancaran operasional.
// - admin: Administrator sistem pemantau telemetri dan audit trail.

import type { User } from "@supabase/supabase-js";

// Daftar peran akun yang valid; urutannya dipakai untuk menurunkan tipe AppRole.
export const APP_ROLES = ["vendor", "warteg", "social_kitchen", "maggot", "logistics", "manager", "admin"] as const;
// Tujuh peran aplikasi; peran menentukan data dan tindakan yang boleh diakses.
export type AppRole = typeof APP_ROLES[number];

// Profil akun yang sudah terautentikasi. vendorId hanya ada untuk pedagang.
export interface AuthUser {
  id: string;
  email: string;
  role: AppRole;
  name: string;
  organization: string;
  vendorId?: string;
}

// Menyelesaikan identifier login (username atau email) ke format email resmi Supabase Auth (@pasarin.id).
export function resolveLoginEmail(identifier: string) {
  const login = identifier.trim().toLowerCase();
  return login.includes("@") ? login : `${login}@pasarin.id`;
}

// Type guard untuk memvalidasi apakah suatu nilai merupakan peran aplikasi (AppRole) yang sah.
// Digunakan untuk sanitasi masukan sesi web dan bot Telegram.
export function isAppRole(value: unknown): value is AppRole {
  return APP_ROLES.some((role) => role === value);
}

// Memetakan pengguna terotentikasi Supabase ke objek profil AuthUser menggunakan metadata aman (app_metadata).
// Rasionale Keamanan: Peran disimpan di app_metadata (hanya dapat dimodifikasi via Service Role)
// untuk mencegah pengguna memanipulasi hak akses peran mereka sendiri di sisi klien.
export function accountProfile(user: User): AuthUser | null {
  const role: unknown = user.app_metadata.pasarin_role;
  if (!isAppRole(role)) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof user.user_metadata.name === "string" ? user.user_metadata.name : user.email ?? user.id,
    organization: typeof user.user_metadata.organization === "string" ? user.user_metadata.organization : "",
    role,
    vendorId: typeof user.app_metadata.pasarin_vendor_id === "string" ? user.app_metadata.pasarin_vendor_id : undefined,
  };
}
