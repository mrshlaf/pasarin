/**
 * Environment Variables Schema & Runtime Validator
 * Aligned with PRD_FIX_PASARIN.md Section 15.4 (Jira PSR-3)
 *
 * Enforces strict runtime validation using Zod for all cloud credentials,
 * API keys, and autonomous cron secrets while permitting safe fallbacks.
 */

import { z } from "zod";

export const envSchema = z.object({
  // Supabase PostgreSQL Credentials
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL")
    .default("https://cawsaaotwrqacqzyvhsl.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY cannot be empty")
    .default("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .optional(),

  // Free-Tier External Agents
  GEMINI_API_KEY: z.string().min(1).optional(),
  OPENWEATHER_API_KEY: z.string().min(1).optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),

  // Automated Background Sweeper Security (PSR-4)
  CRON_SECRET_KEY: z
    .string()
    .min(1)
    .default("pasarin-cron-secret-dev-2026"),

  // Application Runtime
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Validates and returns parsed environment variables.
 * Caches validated result for subsequent sub-agent invocations.
 */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const rawEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    CRON_SECRET_KEY: process.env.CRON_SECRET_KEY,
    NODE_ENV: process.env.NODE_ENV,
  };

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.warn(
      "[PASARIN Env Warning] Invalid or missing environment variables:",
      parsed.error.format()
    );
    // In build or edge runtime without full env, return safe defaults
    cachedEnv = envSchema.parse({});
    return cachedEnv;
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/**
 * Quick capability check for external service integration
 */
export const hasConfigured = {
  supabase: () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !!url && url.startsWith("https://") && !url.includes("placeholder");
  },
  gemini: () => !!process.env.GEMINI_API_KEY,
  weather: () => !!process.env.OPENWEATHER_API_KEY,
  telegram: () => !!process.env.TELEGRAM_BOT_TOKEN,
};
