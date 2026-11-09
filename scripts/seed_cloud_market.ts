/**
 * Skrip Penyemaian Awal Akun Pasar dan State Simulasi ke Supabase Cloud (PSR-2 / PSR-4).
 * Menghubungkan secara langsung ke kluster PostgreSQL Supabase untuk mendaftarkan 142 akun peran
 * dan menginisialisasi snapshot state pasar awal.
 */

import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

process.env.PASARIN_STATE_BACKEND = "supabase";

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error("Isi SUPABASE_DB_URL dengan koneksi PostgreSQL Supabase.");
  }
  const { seedAccounts, countMarketAccounts } = await import("@/lib/serverAuth");
  const { getServerSimulationState, seedMarketStateServer } = await import("@/lib/serverSimulationState");

  const actorIds = await seedAccounts();
  const seeded = await seedMarketStateServer(actorIds);
  if (!seeded.success) throw new Error(seeded.message);
  const state = await getServerSimulationState();
  console.log(JSON.stringify({
    accounts: await countMarketAccounts(),
    expectedAccounts: Object.keys(actorIds).length,
    stocks: state.stocks.length,
    offers: state.offers.length,
    transactions: state.transactions.length,
  }));
}

run().catch((error) => {
  console.error("Seed pasar gagal:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
