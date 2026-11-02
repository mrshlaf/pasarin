/**
 * Skrip CLI Pemuatan Data Benih (Seed) Penawaran Surplus 3-Tier PASARIN.
 * Memuat 8 lot surplus multi-tingkat (Tier 1 Warteg, Tier 2 Dapur Sosial, Tier 3 Maggot).
 *
 * Jalankan via terminal:
 *   cd "C:\Project\Pasarin"
 *   npm run seed:demo
 */

import { DEMO_SEED_OFFERS } from "../src/lib/simulationStore";
import { COMMODITIES } from "../src/data/commodities";
import { KIOSKS } from "../src/data/kiosks";

async function runSeed() {
  console.log("================================================================================");
  console.log("  PASARIN 3-TIER DEMO LOTS SEED RUNNER");
  console.log("  Penyedia Data Penawaran Surplus Multi-Tingkat untuk Pengujian Web");
  console.log("================================================================================\n");

  const tier1 = DEMO_SEED_OFFERS.filter((o) => o.targetTier === "tier_1" && o.status === "active");
  const tier2 = DEMO_SEED_OFFERS.filter((o) => o.targetTier === "tier_2" && o.status === "active");
  const tier3 = DEMO_SEED_OFFERS.filter((o) => o.targetTier === "tier_3" && o.status === "active");
  const claimed = DEMO_SEED_OFFERS.filter((o) => o.status === "claimed");

  console.log("🥦 [TIER 1 - WARTEG & USAHA MIKRO KULINER] (Diskon 50% - 65% | Konsumsi Manusia)");
  tier1.forEach((o, i) => {
    const c = COMMODITIES.find((item) => item.id === o.commodityId);
    const k = KIOSKS.find((item) => item.id === o.vendorId);
    console.log(
      `   ${i + 1}. [${o.id}] ${c?.localName || o.commodityId} (${o.quantityKg} kg) - Diskon ${o.discountPercentage}%`
    );
    console.log(
      `      Harga Pagi: Rp ${o.originalPricePerKg.toLocaleString("id-ID")}/kg -> Salvage: Rp ${o.salvagePricePerKg.toLocaleString("id-ID")}/kg`
    );
    console.log(`      Lapak: ${k?.name} (${k?.stallNumber}) | Status: ${o.status.toUpperCase()}`);
  });

  console.log("\n🍲 [TIER 2 - DAPUR SOSIAL & PANTI ASUHAN] (Subsidi 80% - 85% / Donasi | Nutrisi)");
  tier2.forEach((o, i) => {
    const c = COMMODITIES.find((item) => item.id === o.commodityId);
    const k = KIOSKS.find((item) => item.id === o.vendorId);
    console.log(
      `   ${i + 1}. [${o.id}] ${c?.localName || o.commodityId} (${o.quantityKg} kg) - Subsidi ${o.discountPercentage}%`
    );
    console.log(
      `      Harga Salvage: Rp ${o.salvagePricePerKg.toLocaleString("id-ID")}/kg | Total: Rp ${o.totalAmountIdr.toLocaleString("id-ID")}`
    );
    console.log(`      Lapak: ${k?.name} (${k?.stallNumber}) | Status: ${o.status.toUpperCase()}`);
  });

  console.log("\n🪱 [TIER 3 - SENTRA MAGGOT BSF & TPS 3R] (Biomassa Pakan Ternak | Afkir Non-Pangan)");
  tier3.forEach((o, i) => {
    const c = COMMODITIES.find((item) => item.id === o.commodityId);
    const k = KIOSKS.find((item) => item.id === o.vendorId);
    console.log(
      `   ${i + 1}. [${o.id}] ${c?.localName || o.commodityId} (${o.quantityKg} kg) - Invarian 1 Afkir Non-Pangan`
    );
    console.log(
      `      Nilai Pakan Maggot: Rp ${o.salvagePricePerKg.toLocaleString("id-ID")}/kg | Total: Rp ${o.totalAmountIdr.toLocaleString("id-ID")}`
    );
    console.log(`      Lapak: ${k?.name} (${k?.stallNumber}) | Status: ${o.status.toUpperCase()}`);
  });

  console.log("\n🚚 [LOGISTIK & KURIR - ARMADA PENGIRIMAN AKTIF] (Validasi GPS Geofence <= 50m)");
  claimed.forEach((o, i) => {
    const c = COMMODITIES.find((item) => item.id === o.commodityId);
    console.log(`   ${i + 1}. [${o.id}] ${c?.localName || o.commodityId} (${o.quantityKg} kg) -> Tujuan: ${o.claimedBy}`);
    console.log(`      Driver: ${o.allocatedDriver} | Status: ${o.paymentStatus} | Token: ${o.podToken}`);
  });

  // Sinkronisasi ke server dev lokal jika sedang aktif
  try {
    const res = await fetch("http://localhost:3000/api/simulation/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed" }),
    });
    if (res.ok) {
      console.log("\n🌐 [HTTP 200 OK] Server lokal terupdate: 8 Lot demo berhasil disuntikkan ke server!");
    }
  } catch {
    // Server lokal belum aktif / standalone CLI
  }

  console.log("\n================================================================================");
  console.log("✔ Total Benih Demo: 8 Lot Penawaran (3 Tier-1, 2 Tier-2, 2 Tier-3, 1 Aktif Kurir)");
  console.log("✔ Kios H. Rohmat A-12: 3 Komoditas Inti (Kangkung, Bayam, Sawi Inap)");
  console.log("💡 Buka/Refresh browser di http://localhost:3000 untuk melihat katalog langsung terisi!");
  console.log("💡 Jika ingin mengosongkan kembali ke kondisi pagi: npm run clear:demo");
  console.log("================================================================================\n");
}

runSeed();
