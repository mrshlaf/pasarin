/**
 * Skrip CLI Pemuatan Penawaran Surplus Khusus Warteg & Kuliner (Tier 1).
 * Menyiapkan katalog komoditas murah diskon 50% - 65% untuk pengujian peran Warteg dan Escrow QRIS.
 *
 * Jalankan via terminal:
 *   cd "C:\Project\Pasarin"
 *   npm run seed:warteg
 */

async function runSeedWarteg() {
  console.log("================================================================================");
  console.log("  PASARIN SCENARIO RUNNER: TIER 1 (WARTEG & USAHA MIKRO KULINER)");
  console.log("================================================================================\n");

  try {
    const res = await fetch("http://localhost:3000/api/simulation/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed_warteg" }),
    });
    if (res.ok) {
      console.log("✔ [BERHASIL] 3 Lot penawaran surplus Tier 1 berhasil disuntikkan ke server!");
    }
  } catch {
    console.log("ℹ Server dev offline / standalone mode.");
  }

  console.log("\n🥦 Komoditas Siap Diklaim di Dasbor Warteg (warteg1 / warteg1):");
  console.log("  1. Kangkung Darat (45 kg) - Diskon 58% -> Rp 2.500/kg (Total: Rp 112.500)");
  console.log("  2. Bayam Hijau    (35 kg) - Diskon 64% -> Rp 2.500/kg (Total: Rp 87.500)");
  console.log("  3. Tomat Merah    (50 kg) - Diskon 50% -> Rp 7.000/kg (Total: Rp 350.000)");
  console.log("\n💡 Langsung login ke warteg1 di http://localhost:3000 untuk mencoba tombol Klaim & Bayar QRIS!");
  console.log("================================================================================\n");
}

runSeedWarteg();
