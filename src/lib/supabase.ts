import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cawsaaotwrqacqzyvhsl.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy";

/**
 * Supabase Client resmi untuk aplikasi Next.js (TypeScript)
 * Digunakan untuk operasi baca/tulis data kiosks, commodities, stock_items, dan offers
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Client dengan hak akses Service Role (untuk background worker dan script verifikasi backend)
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
