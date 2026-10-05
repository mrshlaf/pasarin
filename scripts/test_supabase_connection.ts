import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local if exists
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("================================================================================");
console.log("             PASARIN SUPABASE DATABASE CONNECTIVITY & CRUD TEST               ");
console.log("================================================================================");

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERROR: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_ANON_KEY belum diatur pada .env.local!");
  console.log("Petunjuk: Isi kredensial Supabase Anda pada file .env.local terlebih dahulu.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDatabaseTests() {
  try {
    // --------------------------------------------------------------------------
    // Test 1: Operasi Baca (READ / SELECT)
    // --------------------------------------------------------------------------
    console.log("\n[Test 1] Menjalankan operasi BACA (SELECT) pada tabel 'commodities'...");
    const { data: commodities, error: readError } = await supabase
      .from("commodities")
      .select("id, name, local_name, category, base_wholesale_price_per_kg")
      .limit(5);

    if (readError) {
      console.error("❌ Gagal membaca tabel commodities:", readError.message);
      return;
    }

    console.log(`✅ Berhasil membaca ${commodities.length} komoditas dari database!`);
    console.table(commodities);

    // --------------------------------------------------------------------------
    // Test 2: Operasi Baca Kios Pedagang (READ kiosks)
    // --------------------------------------------------------------------------
    console.log("\n[Test 2] Menjalankan operasi BACA (SELECT) pada direktori 'kiosks'...");
    const { data: kiosks, error: kioskError } = await supabase
      .from("kiosks")
      .select("id, stall_number, name, owner_name, block, reputation_score")
      .limit(5);

    if (kioskError) {
      console.error("❌ Gagal membaca tabel kiosks:", kioskError.message);
      return;
    }

    console.log(`✅ Berhasil membaca ${kiosks.length} data kios pedagang Pasar Kramat Jati!`);
    console.table(kiosks);

    // --------------------------------------------------------------------------
    // Test 3: Operasi Tulis (WRITE / INSERT)
    // --------------------------------------------------------------------------
    console.log("\n[Test 3] Menjalankan operasi TULIS (INSERT) pada tabel 'stock_items'...");
    const testStockId = `test_stock_${Date.now()}`;
    const targetVendor = kiosks.length > 0 ? kiosks[0].id : "vendor_kramat_01";
    const targetCommodity = commodities.length > 0 ? commodities[0].id : "bayam";

    const { error: insertError } = await supabase.from("stock_items").insert({
      id: testStockId,
      vendor_id: targetVendor,
      commodity_id: targetCommodity,
      initial_quantity_kg: 50.0,
      remaining_quantity_kg: 50.0,
      physical_condition: "segar",
      decay_score: 0.12,
      allocated_tier: "tier_1",
      is_active: true,
    });

    if (insertError) {
      console.error("❌ Gagal melakukan INSERT ke stock_items:", insertError.message);
      return;
    }
    console.log(`✅ Berhasil INSERT item stok baru [${testStockId}] ke Supabase!`);

    // --------------------------------------------------------------------------
    // Test 4: Operasi Pembaruan (UPDATE)
    // --------------------------------------------------------------------------
    console.log("\n[Test 4] Menjalankan operasi PEMBARUAN (UPDATE) pada item stok...");
    const { error: updateError } = await supabase
      .from("stock_items")
      .update({ remaining_quantity_kg: 42.5, decay_score: 0.18 })
      .eq("id", testStockId);

    if (updateError) {
      console.error("❌ Gagal melakukan UPDATE:", updateError.message);
      return;
    }
    console.log(`✅ Berhasil UPDATE item stok [${testStockId}] (Sisa: 42.5 kg)!`);

    // --------------------------------------------------------------------------
    // Test 5: Operasi Pembersihan (DELETE)
    // --------------------------------------------------------------------------
    console.log("\n[Test 5] Menjalankan pembersihan data uji (DELETE)...");
    const { error: deleteError } = await supabase
      .from("stock_items")
      .delete()
      .eq("id", testStockId);

    if (deleteError) {
      console.error("❌ Gagal menghapus data uji:", deleteError.message);
      return;
    }
    console.log(`✅ Berhasil DELETE data uji [${testStockId}]!`);

    console.log("\n================================================================================");
    console.log("🎉 SELURUH PENGUJIAN OPERASI BACA & TULIS SUPABASE BERHASIL 100%!");
    console.log("================================================================================\n");
  } catch (err) {
    console.error("Terjadi pengecualian runtime:", err);
  }
}

runDatabaseTests();
