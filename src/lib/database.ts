/**
 * Modul Pengelola Koneksi Basis Data Relasional PostgreSQL Supabase (PSR-3).
 * Menginisialisasi connection pool tunggal (singleton) per instans runtime Node.js/Next.js
 * dengan konfigurasi batas idle, timeout koneksi, serta dukungan SSL untuk cloud production.
 */

import { Pool } from "pg";

let pool: Pool | null = null;

/**
 * Memeriksa apakah string koneksi basis data PostgreSQL (SUPABASE_DB_URL) telah dikonfigurasi.
 *
 * @returns Boolean bernilai true jika SUPABASE_DB_URL tersedia di environment.
 */
export function databaseConfigured() {
  return Boolean(process.env.SUPABASE_DB_URL);
}

/**
 * Mengembalikan instans connection pool bersama (shared connection pool) untuk transaksi basis data server.
 * Membatasi maksimal 4 koneksi aktif untuk menghemat pool koneksi serverless Supabase.
 *
 * @returns Instans Pool objek pg.
 * @throws Galat jika variabel lingkungan SUPABASE_DB_URL belum dikonfigurasi.
 */
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
