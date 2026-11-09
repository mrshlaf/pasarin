/**
 * Skrip Pelaksana Rangkaian Pengujian Menyeluruh (Master Automated Test Orchestrator).
 * Mengorkestrasi eksekusi seluruh berkas pengujian mandiri dalam lingkungan uji terisolasi.
 */

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const scripts = fileURLToPath(new URL(".", import.meta.url));
const tests = readdirSync(scripts).filter((file) => /^test_.*\.ts$/.test(file) && file !== "test_supabase_connection.ts");
const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "test" };
for (const name of [
  "GEMINI_API_KEY", "OPENWEATHER_API_KEY", "TELEGRAM_BOT_TOKEN", "SUPABASE_SERVICE_ROLE_KEY", "PASARIN_STATE_BACKEND",
]) {
  delete env[name];
}

for (const script of ["run_unit_tests.ts", ...tests]) {
  console.log("\nRunning " + script);
  const result = spawnSync(process.execPath, ["--import", "tsx", script], { cwd: scripts, stdio: "inherit", env });
  if (result.status !== 0) {
    if (result.error) console.error(result.error.message);
    process.exitCode = 1;
  }
}
