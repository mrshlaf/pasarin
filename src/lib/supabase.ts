/**
 * Inisialisasi Klien Basis Data Supabase PostgreSQL (PSR-2).
 * Menyediakan instans klien publik anonim untuk operasi frontend/App Router (terikat Row Level Security)
 * serta pembuat klien service role berkemampuan penuh untuk background worker.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cawsaaotwrqacqzyvhsl.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";

/**
 * Klien Supabase publik dengan kunci anonim.
 * Seluruh kueri dibatasi oleh aturan Row Level Security (RLS) PostgreSQL.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Menghasilkan klien Supabase berkemampuan administratif (Service Role).
 * Digunakan secara eksklusif oleh cron sweeper dan background worker untuk melewati batasan RLS saat agregasi data.
 *
 * @returns Instans klien Supabase dengan sesi non-persisten dan auto-refresh dinonaktifkan.
 */
export function getServiceRoleClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
