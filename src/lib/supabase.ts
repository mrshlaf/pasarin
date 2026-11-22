// Inisialisasi Klien Basis Data Supabase PostgreSQL (PSR-2).
// Menyediakan instans klien publik anonim untuk operasi frontend/App Router (terikat Row Level Security)
// serta pembuat klien service role berkemampuan penuh untuk background worker.
import { createClient } from "@supabase/supabase-js";

// Indikator boolean apakah kredensial Supabase Auth (URL & Anon Key) telah dikonfigurasi di environment (PSR-2).
export const supabaseAuthConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// URL Supabase; jatuh ke Supabase lokal default agar build tidak gagal tanpa env.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
// Kunci anon; nilai dummy hanya agar createClient tidak melempar galat saat env kosong.
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";

// Klien Supabase publik dengan kunci anonim.
// Seluruh kueri dibatasi oleh aturan Row Level Security (RLS) PostgreSQL.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Menghasilkan klien Supabase berkemampuan administratif (Service Role).
// Digunakan secara eksklusif oleh cron sweeper dan background worker untuk melewati batasan RLS saat agregasi data.
export function getServiceRoleClient() {
  // Kunci service role hanya ada di server; tanpa kunci ini fungsi sengaja gagal.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diatur.");
  return createClient(supabaseUrl, serviceKey, {
    // Klien server tidak menyimpan sesi dan tidak me-refresh token.
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
