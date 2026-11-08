import { Pool } from "pg";

let pool: Pool | null = null;

/** True when the deployment has a Postgres connection string. */
export function databaseConfigured() {
  return Boolean(process.env.SUPABASE_DB_URL);
}

/** Returns one shared pool per server instance, or throws when the URL is missing. */
export function getDatabasePool() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL belum diatur.");
  if (!pool) {
    const isLocal = /(^|@)(localhost|127\.0\.0\.1)(:|\/)/.test(connectionString);
    pool = new Pool({
      connectionString,
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      application_name: "pasarin",
      ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
    });
    pool.on("error", (error) => console.error("Postgres pool error", error));
  }
  return pool;
}
