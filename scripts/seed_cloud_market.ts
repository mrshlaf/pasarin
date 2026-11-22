// Skrip Penyemaian Awal Akun Pasar dan State Simulasi ke Supabase Cloud (PSR-2 / PSR-4).
// Menghubungkan secara langsung ke kluster PostgreSQL Supabase untuk mendaftarkan 142 akun peran
// dan menginisialisasi snapshot state pasar awal.
// Cakupan:
// 1. Pendaftaran akun multi-peran (pedagang, UMKM, dapur sosial, sentra maggot, kurir, dinas, manajemen).
// 2. Inisialisasi data stok komoditas pangan aktif dan penawaran penyelamatan.
// 3. Verifikasi jumlah akun dan entitas transaksi awal yang berhasil di-seed.

import { loadEnvFile } from "node:process";

// Memuat variabel konfigurasi lingkungan dari .env.local
try {
  loadEnvFile(".env.local");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

// Menetapkan backend state pasar ke Supabase PostgreSQL
process.env.PASARIN_STATE_BACKEND = "supabase";

// Menjalankan proses penyemaian akun pasar dan snapshot simulasi awal.
async function run() {
  // Validasi konfigurasi connection string Supabase
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error("Isi SUPABASE_DB_URL dengan koneksi PostgreSQL Supabase.");
  }
  
  // Mengimpor utilitas autentikasi server dan manipulasi state simulasi pasar
  const { seedAccounts, countMarketAccounts } = await import("@/lib/serverAuth");
  const { getServerSimulationState, seedMarketStateServer } = await import("@/lib/serverSimulationState");

  // Menyemai akun-akun pelaku pasar resmi
  console.log("Menyemai akun-akun pasar...");
  const actorIds = await seedAccounts();
  
  // Menginisialisasi katalog stok awal dan penawaran pasar berbasis ID pelaku yang terdaftar
  console.log("Menginisialisasi state pasar...");
  const seeded = await seedMarketStateServer(actorIds);
  if (!seeded.success) throw new Error(seeded.message);
  
  // Mengambil dan memvalidasi rekapitulasi data hasil penyemaian
  const state = await getServerSimulationState();
  console.log("Ringkasan Hasil Penyemaian:");
  console.log(JSON.stringify({
    accounts: await countMarketAccounts(),
    expectedAccounts: Object.keys(actorIds).length,
    stocks: state.stocks.length,
    offers: state.offers.length,
    transactions: state.transactions.length,
  }, null, 2));
}

// Menjalankan fungsi penyemaian dengan penanganan galat
run().catch((error) => {
  console.error("Seed pasar gagal:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
