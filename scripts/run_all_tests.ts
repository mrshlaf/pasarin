/**
 * Skrip Pelaksana Rangkaian Pengujian Menyeluruh (Master Automated Test Orchestrator - PSR-39).
 * Mengorkestrasi eksekusi seluruh berkas pengujian mandiri dalam lingkungan uji terisolasi.
 *
 * Alur Kerja:
 * 1. Mendeteksi direktori skrip pengujian aktif.
 * 2. Memindai seluruh berkas uji berawalan 'test_*.ts' (mengecualikan pengujian live DB Supabase agar hermetik).
 * 3. Menyiapkan environment terisolasi hermetik (menghapus API key eksternal agar fallback simulasi teruji).
 * 4. Menjalankan 'run_unit_tests.ts' dan seluruh sub-skrip pengujian secara sekuensial.
 * 5. Menetapkan exit code 1 jika ada satu pun pengujian yang gagal (CI/CD pipeline guard).
 */

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Resolusi path absolut direktori scripts
const scripts = fileURLToPath(new URL(".", import.meta.url));

// Filter berkas pengujian: seluruh test_*.ts kecuali test_supabase_connection.ts (yang butuh live network)
const tests = readdirSync(scripts).filter((file) => /^test_.*\.ts$/.test(file) && file !== "test_supabase_connection.ts");

// Konfigurasi environment hermetik untuk pengujian otomatis
const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "test" };

// Menghapus kredensial live API agar menguji ketahanan modul fallback offline dan simulasi mandiri
for (const name of [
  "GEMINI_API_KEY", "OPENWEATHER_API_KEY", "TELEGRAM_BOT_TOKEN", "SUPABASE_SERVICE_ROLE_KEY", "PASARIN_STATE_BACKEND",
]) {
  delete env[name];
}

// Menjalankan master in-class unit testbench terlebih dahulu, kemudian seluruh skrip integrasi
for (const script of ["run_unit_tests.ts", ...tests]) {
  console.log("\nRunning " + script);
  // Mengeksekusi skrip anak menggunakan tsx runtime dengan stdio inherit agar log hasil langsung tampil
  const result = spawnSync(process.execPath, ["--import", "tsx", script], { cwd: scripts, stdio: "inherit", env });
  
  // Validasi hasil eksekusi: jika kode status bukan 0, tandai kegagalan pada exit code proses induk
  if (result.status !== 0) {
    if (result.error) console.error(result.error.message);
    process.exitCode = 1;
  }
}
