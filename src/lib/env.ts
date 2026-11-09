/**
 * Modul Validasi Variabel Lingkungan Runtime (PSR-3).
 * Memvalidasi kredensial Supabase, kunci API eksternal (OpenWeather, Gemini, Telegram),
 * dan token rahasia pemicu cron melalui skema Zod dengan mekanisme fallback aman saat tahap build.
 */

import { z } from "zod";

/**
 * Skema validasi Zod untuk seluruh variabel lingkungan yang dibutuhkan sistem PASARIN.
 */
export const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL")
    .default("http://127.0.0.1:54321"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY cannot be empty")
    .default("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .optional(),

  // API pihak ketiga (free-tier)
  GEMINI_API_KEY: z.string().min(1).optional(),
  OPENWEATHER_API_KEY: z.string().min(1).optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_WEBHOOK_SECRET: z
    .string()
    .min(1)
    .optional(),
  // Kunci pengaman cron sweeper (PSR-4)
  CRON_SECRET_KEY: z
    .string()
    .min(1)
    .optional(),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

/**
 * Tipe inferensi TypeScript dari skema validasi variabel lingkungan Zod (PSR-3).
 */
export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Membaca, memvalidasi, dan menyimpan variabel lingkungan ke dalam cache memori lokal.
 * Mencegah kegagalan fatal saat proses build Next.js dengan menyediakan nilai default fallback yang aman.
 *
 * @returns Objek konfigurasi lingkungan runtime Env yang telah divalidasi.
 */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const rawEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || undefined,
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY?.trim() || undefined,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN?.trim() || undefined,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || process.env.TELEGRAM_SECRET_TOKEN?.trim() || undefined,
    CRON_SECRET_KEY: process.env.CRON_SECRET?.trim() || process.env.CRON_SECRET_KEY?.trim() || undefined,
    NODE_ENV: process.env.NODE_ENV,
  };

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.warn(
      "[Env Warning] Ada variabel env yang belum lengkap:",
      parsed.error.flatten().fieldErrors
    );
    // Gunakan fallback default agar proses tidak crash saat build
    cachedEnv = envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy",
    });
    return cachedEnv;
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/**
 * Mengosongkan cache variabel lingkungan lokal.
 * Digunakan pada pengujian unit terisolasi saat menyimulasikan pergantian variabel environment.
 */
export function resetEnvCache(): void {
  cachedEnv = null;
}
