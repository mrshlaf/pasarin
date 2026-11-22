// Modul Pembantu Pemanggilan API Klien Terotentikasi (Client-Side Fetcher) (PSR-2 / PSR-40).
// Secara otomatis menyematkan Bearer token sesi aktif Supabase Auth ke dalam header Authorization
// untuk setiap panggilan HTTP ke backend PASARIN.

import { supabase } from "@/lib/supabase";

// Mengeksekusi permintaan HTTP fetch dengan injeksi otomatis token otorisasi Bearer dari sesi Supabase.
export async function apiFetch(path: string, init?: RequestInit) {
  // Salin header bawaan pemanggil agar tidak ditimpa.
  const headers = new Headers(init?.headers);
  // Ambil sesi Supabase aktif; tanpa sesi, permintaan dikirim tanpa Authorization.
  const { data: { session } } = await supabase.auth.getSession();
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);
  // Header baru menggantikan header asli karena sudah memuat salinannya.
  return fetch(path, { ...init, headers });
}
