import { readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { Client } from "pg";

try { loadEnvFile(".env.local"); } catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const rawConnectionString = process.env.SUPABASE_DB_URL;
if (!rawConnectionString) {
  console.error("Isi SUPABASE_DB_URL dengan URL koneksi PostgreSQL target.");
  process.exit(1);
}
const connectionString: string = rawConnectionString;

const files = [
  "supabase/migrations/20261005000000_init_pasarin_schema.sql",
  "supabase/migrations/20261108000000_audit_and_simulation_state.sql",
  "supabase/seed.sql",
];

async function run() {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10000,
    ...(/localhost|127\.0\.0\.1/.test(connectionString) ? {} : { ssl: { rejectUnauthorized: false } }),
  });
  await client.connect();
  try {
    await client.query("BEGIN");
    for (const file of files) await client.query(readFileSync(file, "utf-8"));
    await client.query("COMMIT");
    console.log("Migrasi dan seed pasar selesai.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("Migrasi gagal:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
