/**
 * Skrip Migrasi Skema dan Penyemaian Data Basis Data PostgreSQL (PSR-2).
 * Mengeksekusi berkas migrasi SQL secara transaksional (BEGIN-COMMIT-ROLLBACK)
 * ke instance PostgreSQL target (lokal maupun Supabase Cloud).
 *
 * Cakupan:
 * 1. Skema master inisialisasi tabel, relasi, dan fungsi pemicu (trigger).
 * 2. Tabel audit log, histori status transaksi, dan state simulasi pasar.
 * 3. Penyemaian benih data katalog komoditas, direktori kios, dan akun demo.
 */

import { readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { Client } from "pg";

// Memuat variabel lingkungan dari file .env.local jika tersedia
try { loadEnvFile(".env.local"); } catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

// Memvalidasi URI string koneksi target database PostgreSQL Supabase
const rawConnectionString = process.env.SUPABASE_DB_URL;
if (!rawConnectionString) {
  console.error("Isi SUPABASE_DB_URL dengan URL koneksi PostgreSQL target.");
  process.exit(1);
}
// Salinan bertipe string agar closure `run()` tidak perlu memeriksa undefined lagi.
const connectionString: string = rawConnectionString;

// Urutan berkas SQL migrasi skema dan seed data
const files = [
  "supabase/migrations/20261005000000_init_pasarin_schema.sql",
  "supabase/migrations/20261108000000_audit_and_simulation_state.sql",
  "supabase/migrations/20261120000000_align_relational_schema.sql",
  "supabase/seed.sql",
];

/**
 * Menjalankan migrasi database dalam satu blok transaksi atomik aman.
 */
async function run() {
  // Inisialisasi klien koneksi pg client dengan konfigurasi SSL untuk koneksi cloud
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10000,
    ...(/localhost|127\.0\.0\.1/.test(connectionString) ? {} : { ssl: { rejectUnauthorized: false } }),
  });
  
  // Membuka koneksi ke server basis data
  await client.connect();
  try {
    // Memulai blok transaksi database atomik
    await client.query("BEGIN");
    
    // Mengeksekusi setiap berkas SQL secara berurutan
    for (const file of files) {
      console.log(`Mengeksekusi migrasi: ${file}`);
      await client.query(readFileSync(file, "utf-8"));
    }
    
    // Mengonfirmasi dan menyimpan seluruh perubahan ke database
    await client.query("COMMIT");
    console.log("Migrasi dan seed pasar selesai dengan sukses.");
  } catch (error) {
    // Batalkan seluruh perubahan jika terjadi galat selama eksekusi migrasi
    await client.query("ROLLBACK");
    throw error;
  } finally {
    // Menutup koneksi database client
    await client.end();
  }
}

// Menjalankan prosedur migrasi dengan penanganan galat terpusat
run().catch((error) => {
  console.error("Migrasi gagal:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
