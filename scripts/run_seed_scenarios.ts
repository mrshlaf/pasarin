/**
 * ============================================================================
 * PASARIN TESTING SCENARIOS SEED RUNNER
 * File: scripts/run_seed_scenarios.ts
 *
 * Menginjeksikan 7 Skenario Pengujian Nyata ke dalam Sistem PASARIN:
 *   1. Skenario Segar Prima (Retail Normal di Kios A-01, Decay < 0.35)
 *   2. Skenario Layu Ringan (Tier 1: Warteg Diskon 58%, Decay 0.42)
 *   3. Skenario Layu Kritis (Tier 2: Dapur Sosial Jendela 30m, Decay 0.72)
 *   4. Skenario Tidak Layak / Afkir (Tier 3: Biokonversi Maggot BSF, Decay >= 0.85)
 *   5. Skenario Audit Invarian 1 (Percobaan Moral Hazard Terblokir & Penalti)
 *   6. Skenario Escrow QRIS BI & Antrean Kurir (Held in Escrow, Siap Antar)
 *   7. Skenario Transaksi Selesai (Settled & Saldo Cair ke Dompet Pedagang)
 *
 * Cara Menjalankan:
 *   npm run seed:scenarios
 *   atau: npx tsx scripts/run_seed_scenarios.ts
 * ============================================================================
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "pg";
import type { ServerState } from "../src/lib/serverSimulationState";
import type { RescueOffer, StockItem, EscrowTransaction } from "../src/types/market";
import { buildMarketSeedState } from "../src/lib/marketSeed";

// Muat env lokal jika ada
try {
  const envCandidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(__dirname, "../.env.local"),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      for (const line of envContent.split("\n")) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim();
      }
      break;
    }
  }
} catch {}

const stateFile = process.env.PASARIN_STATE_FILE ?? path.join(os.tmpdir(), "pasarin_market_state_v2.json");

// Definisi 7 Skenario Pengujian Komprehensif
const scenarioStocks: StockItem[] = [
  // 1. Skenario Segar Prima
  {
    id: "stk_test_01_segar",
    vendorId: "kiosk_01",
    commodityId: "kangkung",
    initialKg: 50,
    remainingKg: 50,
    lotNumber: "LOT-TEST-SEGAR-01",
    arrivalClock: "06:00 WIB",
    hoursOffset: 2.0,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "stk_test_02_segar",
    vendorId: "kiosk_01",
    commodityId: "bayam",
    initialKg: 40,
    remainingKg: 40,
    lotNumber: "LOT-TEST-SEGAR-02",
    arrivalClock: "06:30 WIB",
    hoursOffset: 2.5,
    createdAt: new Date(Date.now() - 2.5 * 3600000).toISOString(),
  },

  // 2. Skenario Layu Ringan (Tier 1 Warteg)
  {
    id: "stk_test_03_layu_tier1",
    vendorId: "kiosk_01",
    commodityId: "kangkung",
    initialKg: 35,
    remainingKg: 35,
    lotNumber: "LOT-TEST-TIER1-01",
    arrivalClock: "05:00 WIB",
    hoursOffset: 8.5,
    createdAt: new Date(Date.now() - 8.5 * 3600000).toISOString(),
  },
  {
    id: "stk_test_04_layu_tier1",
    vendorId: "kiosk_02",
    commodityId: "pakcoy",
    initialKg: 30,
    remainingKg: 30,
    lotNumber: "LOT-TEST-TIER1-02",
    arrivalClock: "05:00 WIB",
    hoursOffset: 9.0,
    createdAt: new Date(Date.now() - 9.0 * 3600000).toISOString(),
  },

  // 3. Skenario Layu Kritis (Tier 2 Dapur Sosial)
  {
    id: "stk_test_05_layu_tier2",
    vendorId: "kiosk_03",
    commodityId: "sawi_hijau",
    initialKg: 25,
    remainingKg: 25,
    lotNumber: "LOT-TEST-TIER2-01",
    arrivalClock: "04:00 WIB",
    hoursOffset: 13.0,
    createdAt: new Date(Date.now() - 13.0 * 3600000).toISOString(),
  },

  // 4. Skenario Tidak Layak / Afkir (Tier 3 Maggot BSF)
  {
    id: "stk_test_06_afkir_tier3",
    vendorId: "kiosk_04",
    commodityId: "sawi_hijau",
    initialKg: 60,
    remainingKg: 60,
    lotNumber: "LOT-TEST-TIER3-01",
    arrivalClock: "Kemarin",
    hoursOffset: 18.0,
    createdAt: new Date(Date.now() - 18.0 * 3600000).toISOString(),
  },
  {
    id: "stk_test_07_afkir_tier3",
    vendorId: "kiosk_12",
    commodityId: "tomat",
    initialKg: 40,
    remainingKg: 40,
    lotNumber: "LOT-TEST-TIER3-02",
    arrivalClock: "Kemarin",
    hoursOffset: 22.0,
    createdAt: new Date(Date.now() - 22.0 * 3600000).toISOString(),
  },

  // 6. Skenario Escrow In-Transit
  {
    id: "stk_test_08_escrow_active",
    vendorId: "kiosk_01",
    commodityId: "kangkung",
    initialKg: 25,
    remainingKg: 0,
    lotNumber: "LOT-TEST-ESCROW-01",
    arrivalClock: "05:30 WIB",
    hoursOffset: 8.0,
    createdAt: new Date(Date.now() - 8.0 * 3600000).toISOString(),
  },

  // 7. Skenario Settled
  {
    id: "stk_test_09_settled",
    vendorId: "kiosk_02",
    commodityId: "sawi_hijau",
    initialKg: 20,
    remainingKg: 0,
    lotNumber: "LOT-TEST-SETTLED-01",
    arrivalClock: "04:30 WIB",
    hoursOffset: 10.0,
    createdAt: new Date(Date.now() - 10.0 * 3600000).toISOString(),
  },
];

const scenarioOffers: RescueOffer[] = [
  // Tier 1 Warteg Penawaran Aktif (Diskon 58% & 56%)
  {
    id: "ofr_test_01_warteg_kangkung",
    stockId: "stk_test_03_layu_tier1",
    vendorId: "kiosk_01",
    commodityId: "kangkung",
    targetTier: "tier_1",
    quantityKg: 35,
    originalPricePerKg: 6000,
    salvagePricePerKg: 2500,
    discountPercentage: 58.33,
    totalAmountIdr: 87500,
    expiresInMinutes: 45,
    createdAt: new Date().toISOString(),
    status: "active",
    paymentStatus: "unpaid",
  },
  {
    id: "ofr_test_02_warteg_pakcoy",
    stockId: "stk_test_04_layu_tier1",
    vendorId: "kiosk_02",
    commodityId: "pakcoy",
    targetTier: "tier_1",
    quantityKg: 30,
    originalPricePerKg: 8000,
    salvagePricePerKg: 3500,
    discountPercentage: 56.25,
    totalAmountIdr: 105000,
    expiresInMinutes: 45,
    createdAt: new Date().toISOString(),
    status: "active",
    paymentStatus: "unpaid",
  },

  // Tier 2 Dapur Sosial (Diskon 92% - Jendela 30 Menit)
  {
    id: "ofr_test_03_sosial_sawi",
    stockId: "stk_test_05_layu_tier2",
    vendorId: "kiosk_03",
    commodityId: "sawi_hijau",
    targetTier: "tier_2",
    quantityKg: 25,
    originalPricePerKg: 6500,
    salvagePricePerKg: 500,
    discountPercentage: 92.31,
    totalAmountIdr: 12500,
    expiresInMinutes: 30,
    createdAt: new Date().toISOString(),
    status: "active",
    paymentStatus: "unpaid",
  },

  // Tier 3 Biokonversi Maggot BSF (Hibah Limbah Organik Rp 0)
  {
    id: "ofr_test_04_maggot_sawi",
    stockId: "stk_test_06_afkir_tier3",
    vendorId: "kiosk_04",
    commodityId: "sawi_hijau",
    targetTier: "tier_3",
    quantityKg: 60,
    originalPricePerKg: 6500,
    salvagePricePerKg: 0,
    discountPercentage: 100,
    totalAmountIdr: 0,
    expiresInMinutes: 120,
    createdAt: new Date().toISOString(),
    status: "active",
    paymentStatus: "unpaid",
  },
  {
    id: "ofr_test_05_maggot_tomat",
    stockId: "stk_test_07_afkir_tier3",
    vendorId: "kiosk_12",
    commodityId: "tomat",
    targetTier: "tier_3",
    quantityKg: 40,
    originalPricePerKg: 9000,
    salvagePricePerKg: 0,
    discountPercentage: 100,
    totalAmountIdr: 0,
    expiresInMinutes: 120,
    createdAt: new Date().toISOString(),
    status: "active",
    paymentStatus: "unpaid",
  },

  // Skenario 6: Escrow QRIS Aktif & Siap Diantar Kurir
  {
    id: "ofr_test_06_in_transit",
    stockId: "stk_test_08_escrow_active",
    vendorId: "kiosk_01",
    commodityId: "kangkung",
    targetTier: "tier_1",
    quantityKg: 25,
    originalPricePerKg: 6000,
    salvagePricePerKg: 2500,
    discountPercentage: 58.33,
    totalAmountIdr: 62500,
    expiresInMinutes: 60,
    createdAt: new Date().toISOString(),
    status: "claimed",
    claimedBy: "Warteg Kharisma Bahari Condet",
    claimedById: "local:warteg1",
    claimedAt: "14:35 WIB",
    paymentStatus: "held_in_escrow",
  },

  // Skenario 7: Transaksi Selesai (Settled)
  {
    id: "ofr_test_07_settled",
    stockId: "stk_test_09_settled",
    vendorId: "kiosk_02",
    commodityId: "sawi_hijau",
    targetTier: "tier_1",
    quantityKg: 20,
    originalPricePerKg: 6500,
    salvagePricePerKg: 2500,
    discountPercentage: 61.54,
    totalAmountIdr: 50000,
    expiresInMinutes: 60,
    createdAt: new Date().toISOString(),
    status: "settled",
    claimedBy: "Warteg Ibu Yayu Hek Kramat Jati",
    claimedById: "local:warteg2",
    claimedAt: "14:15 WIB",
    deliveredOn: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date()),
    paymentStatus: "released_to_vendor",
  },
];

const scenarioTransactions: EscrowTransaction[] = [
  // Transaksi 1: Dana Tertahan di Escrow (Kurir Siap Antar)
  {
    id: "tx_test_01_escrow",
    offerId: "ofr_test_06_in_transit",
    buyerName: "Warteg Kharisma Bahari Condet",
    vendorName: "H. Rohmat Sayur Daun (Kios A-12)",
    commodityName: "Kangkung Darat",
    amountIdr: 62500,
    status: "held_in_escrow",
    createdAt: new Date().toISOString(),
  },
  // Transaksi 2: Dana Sudah Cair ke Dompet Pedagang
  {
    id: "tx_test_02_released",
    offerId: "ofr_test_07_settled",
    buyerName: "Warteg Ibu Yayu Hek Kramat Jati",
    vendorName: "Pak Asep Pasokan Sukabumi (Kios A-18)",
    commodityName: "Caisim / Sawi Hijau",
    amountIdr: 50000,
    status: "released",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    releasedAt: new Date().toISOString(),
  },
];

async function seedTestingScenarios() {
  console.log("================================================================================");
  console.log("         PASARIN TESTING SCENARIOS INJECTION & VERIFICATION ENGINE              ");
  console.log("================================================================================\n");

  // 1. Buat Fresh Seed State untuk seluruh 30 Kios pasar berstandar sirkular
  const baseSeed = buildMarketSeedState();
  const currentState: ServerState = {
    ...baseSeed,
    vendorWalletIdr: 50000,
    biomassProcessedKg: 100,
    socialMealsServed: 100,
    lastUpdated: new Date().toISOString(),
  };

  // Tambahkan skenario baru di urutan teratas (unshift)
  currentState.stocks.unshift(...scenarioStocks);
  currentState.offers.unshift(...scenarioOffers);
  currentState.transactions.unshift(...scenarioTransactions);
  currentState.vendorWalletIdr = 50000;
  currentState.lastUpdated = new Date().toISOString();

  // Tulis kembali ke file state
  fs.writeFileSync(stateFile, JSON.stringify(currentState, null, 2), "utf-8");
  console.log(`[PASS] State File Terupdate: ${stateFile}`);
  console.log(`       -> ${scenarioStocks.length} Stok Skenario Disuntikkan`);
  console.log(`       -> ${scenarioOffers.length} Penawaran Skenario Disuntikkan`);
  console.log(`       -> ${scenarioTransactions.length} Transaksi Escrow Disuntikkan\n`);

  // 2. Sinkronkan ke Supabase Cloud (pasarin_simulation_state) agar Vercel otomatis sinkron 100%
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    try {
      console.log("[INFO] Menyinkronkan state ke Supabase Cloud (Vercel State Engine)...");
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, serviceKey);
      const { data: current } = await supabase
        .from("pasarin_simulation_state")
        .select("revision")
        .eq("id", "market")
        .maybeSingle();

      const nextRevision = (current?.revision ?? 0) + 1;
      const { error: upsertErr } = await supabase
        .from("pasarin_simulation_state")
        .upsert({
          id: "market",
          revision: nextRevision,
          state: currentState,
        });

      if (upsertErr) {
        console.warn(`[WARN] Sinkronisasi Supabase Cloud dilewati / error: ${upsertErr.message}`);
      } else {
        console.log(`[PASS] Supabase Cloud Database (Vercel State) Terupdate ke Revisi ${nextRevision} (100% Sinkron dengan Localhost)!\n`);
      }
    } catch (e: any) {
      console.warn(`[WARN] Gagal menyinkronkan ke Supabase: ${e.message}\n`);
    }
  }

  // 3. Jika SUPABASE_DB_URL tersedia, jalankan SQL ke Postgres
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (dbUrl) {
    console.log("[INFO] Menginjeksikan ke Supabase PostgreSQL Database...");
    const sqlPath = path.resolve(process.cwd(), "supabase/seed_testing_scenarios.sql");
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, "utf-8");
      const client = new Client({
        connectionString: dbUrl,
        connectionTimeoutMillis: 10000,
        ...(/localhost|127\.0\.0\.1/.test(dbUrl) ? {} : { ssl: { rejectUnauthorized: false } }),
      });
      try {
        await client.connect();
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");
        console.log("[PASS] Supabase PostgreSQL Database Berhasil Di-seed dengan SQL Skenario!");
      } catch (err: any) {
        await client.query("ROLLBACK").catch(() => {});
        console.warn(`[WARN] Eksekusi Postgres dilewati / error: ${err.message}`);
      } finally {
        await client.end().catch(() => {});
      }
    }
  }

  // 4. Ringkasan Peta Skenario untuk Presentasi
  console.log("================================================================================");
  console.log("            RINGKASAN 7 SKENARIO TESTING SIAP DEMO DI PASARIN                  ");
  console.log("================================================================================");
  console.log("1. SKENARIO SEGAR PRIMA (Retail Normal):");
  console.log("   • Komoditas: Kangkung (50 kg) & Bayam (40 kg)");
  console.log("   • Decay: 0.075 (< 0.35) | Status: Di Kios A-01 | Belum Ada Diskon");
  console.log("   • Uji Coba: Login sebagai 'pasar1' (password: pasar1) -> Cek tab Inventaris.\n");

  console.log("2. SKENARIO LAYU RINGAN (Tier 1 Warteg & Katering):");
  console.log("   • Komoditas: Kangkung (35 kg @ Rp 2.500) & Pakcoy (30 kg @ Rp 3.500)");
  console.log("   • Decay: 0.42 (Layu Ringan) | Diskon: ~58% (Price Floor Terlindungi)");
  console.log("   • Uji Coba: Login sebagai 'warteg1' (password: warteg1) -> Cek katalog penawaran.\n");

  console.log("3. SKENARIO LAYU KRITIS (Tier 2 Dapur Sosial & Panti Asuhan):");
  console.log("   • Komoditas: Caisim / Sawi Hijau (25 kg @ Rp 500)");
  console.log("   • Decay: 0.72 (Layu Kritis) | Jendela Eksklusif: 30 Menit");
  console.log("   • Uji Coba: Login sebagai 'sosial1' (password: sosial1) -> Cek alokasi bansos.\n");

  console.log("4. SKENARIO AFKIR / TIDAK LAYAK KONSUMSI (Tier 3 Maggot BSF):");
  console.log("   • Komoditas: Sawi Afkir (60 kg) & Tomat Busuk (40 kg)");
  console.log("   • Decay: 0.95 (Afkir) | Harga: Rp 0 (Hibah Biokonversi)");
  console.log("   • Uji Coba: Login sebagai 'maggot1' (password: maggot1) -> Cek bahan biomassa.\n");

  console.log("5. SKENARIO AUDIT INVARIAN 1 (Pencegahan Moral Hazard):");
  console.log("   • Aksi: Percobaan mengalihkan bayam segar prima ke pakan maggot.");
  console.log("   • Sistem: Otomatis memblokir & mencatat penalti reputasi -5 poin.");
  console.log("   • File Bukti: Tercatat di tabel system_audit_trail & modal Laporan DLH.\n");

  console.log("6. SKENARIO ESCROW QRIS BI & ANTREAN PENGANTARAN KURIR:");
  console.log("   • Pesanan: 25 kg Kangkung oleh Warteg Condet.");
  console.log("   • Status: QRIS Dibayar -> Dana Ditahan di Escrow (Rp 62.500).");
  console.log("   • Uji Coba: Login sebagai 'kurir1' (password: kurir1) -> Klik 'Serah terima'.\n");

  console.log("7. SKENARIO SETTLED (DANA CAIR KE DOMPET PEDAGANG):");
  console.log("   • Transaksi: 20 kg Sawi Hijau selesai diantar.");
  console.log("   • Status: Dana Rp 50.000 cair otomatis ke saldo dompet pedagang Kios A-18.");
  console.log("   • Uji Coba: Login sebagai 'pasar2' atau 'pengelola1' -> Cek Pembayaran.\n");

  console.log("================================================================================");
  console.log("                INJEKSI SKENARIO TESTING SELESAI DENGAN SUKSES!                 ");
  console.log("================================================================================\n");
}

seedTestingScenarios().catch((err) => {
  console.error("Gagal menjalankan seed skenario:", err);
  process.exit(1);
});
