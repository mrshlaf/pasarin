import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const projectRef = "ioodfuykddznygvbivfo";
const host = "aws-0-ap-northeast-1.pooler.supabase.com"; // Terdeteksi: Region Tokyo (ap-northeast-1)
const port = 6543;
const user = `postgres.${projectRef}`;
const database = "postgres";
const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.argv[2];

if (!dbPassword) {
  console.error("❌ ERROR: Database password belum diberikan!");
  console.log("Cara penggunaan: npx tsx scripts/migrate_and_seed.ts <DB_PASSWORD>");
  console.log("Atau tambahkan SUPABASE_DB_PASSWORD=<password> di .env.local");
  process.exit(1);
}

async function runMigrationAndSeed() {
  const client = new Client({
    host,
    port,
    user,
    password: dbPassword,
    database,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("🔌 Menghubungkan ke Supabase PostgreSQL (Tokyo Pooler)...");
    await client.connect();
    console.log("✅ Terhubung sukses ke database!\n");

    // 1. Eksekusi Skema DDL
    const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20261005000000_init_pasarin_schema.sql");
    console.log("📜 Menjalankan migrasi DDL dari:", migrationPath);
    const ddlSql = fs.readFileSync(migrationPath, "utf-8");
    await client.query(ddlSql);
    console.log("✅ DDL Schema berhasil dieksekusi tanpa error!\n");

    // 2. Eksekusi Seed Data
    const seedPath = path.resolve(process.cwd(), "supabase/seed.sql");
    console.log("🌱 Menjalankan seeding data 30 kios & 30 komoditas dari:", seedPath);
    const seedSql = fs.readFileSync(seedPath, "utf-8");
    await client.query(seedSql);
    console.log("✅ Seed data berhasil dimasukkan ke basis data!\n");

    // 3. Verifikasi Indeks B-Tree Aktif
    console.log("🔍 Memverifikasi indeks B-Tree yang terpasang...");
    const indexQuery = `
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename IN ('kiosks', 'commodities', 'stock_items', 'offers', 'claims')
      ORDER BY tablename, indexname;
    `;
    const indexRes = await client.query(indexQuery);
    console.table(indexRes.rows);

    // 4. Verifikasi Jumlah Data
    const countKiosks = await client.query("SELECT COUNT(*) FROM kiosks;");
    const countCommodities = await client.query("SELECT COUNT(*) FROM commodities;");
    const countStock = await client.query("SELECT COUNT(*) FROM stock_items;");
    const countOffers = await client.query("SELECT COUNT(*) FROM offers;");

    console.log("📊 Ringkasan Data Terverifikasi di Supabase:");
    console.log(`• Kiosks Terdaftar: ${countKiosks.rows[0].count} kios`);
    console.log(`• Komoditas Biologis: ${countCommodities.rows[0].count} jenis komoditas`);
    console.log(`• Stock Items Awal: ${countStock.rows[0].count} lot`);
    console.log(`• Offers Aktif: ${countOffers.rows[0].count} penawaran`);

    console.log("\n🎉 SELURUH TAHAPAN MIGRASI & SEEDING SELESAI 100%!");
  } catch (err: any) {
    console.error("❌ Terjadi kesalahan saat migrasi/seeding:", err.message);
  } finally {
    await client.end();
  }
}

runMigrationAndSeed();
