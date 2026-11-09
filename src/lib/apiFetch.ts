/**
 * Modul Pembantu Pemanggilan API Klien Terotentikasi (Client-Side Fetcher) (PSR-2 / PSR-40).
 * Secara otomatis menyematkan Bearer token sesi aktif Supabase Auth ke dalam header Authorization
 * untuk setiap panggilan HTTP ke backend PASARIN.
 */

import { supabase } from "@/lib/supabase";

/**
 * Mengeksekusi permintaan HTTP fetch dengan injeksi otomatis token otorisasi Bearer dari sesi Supabase.
 *
 * @param path - URL target atau path relatif API (misal: "/api/simulation/state").
 * @param init - Opsi konfigurasi fetch standar (method, body, custom headers).
 * @returns Promise berisi objek Response fetch bawaan.
 */
export async function apiFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const { data: { session } } = await supabase.auth.getSession();
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);
  return fetch(path, { ...init, headers });
}
