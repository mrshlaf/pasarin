/**
 * Skrip CLI Pemuatan Penawaran Pangan Sosial (Tier 2).
 * Menyiapkan sayuran bernutrisi tinggi subsidi 80% - 85% untuk Dapur Sosial & Panti Asuhan
 * di bawah perlindungan Invarian 3 (Jendela Reservasi Eksklusif 30 Menit).
 *
 * Jalankan via terminal:
 *   cd "C:\Project\Pasarin"
 *   npm run seed:social
 */

async function runSeedSocial() {
  console.log("================================================================================");
  console.log("  PASARIN SCENARIO RUNNER: TIER 2 (DAPUR SOSIAL & PANTI ASUHAN)");
  console.log("================================================================================\n");

  try {
    const res = await fetch("http://localhost:3000/api/simulation/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed_social" }),
    });
    if (res.ok) {
      console.log("✔ [BERHASIL] 2 Lot alokasi sosial Tier 2 berhasil disuntikkan ke server!");
    }
  } catch {
    console.log("ℹ Server dev offline / standalone mode.");
  }

  console.log("\n🍲 Komoditas Siap Ditebus di Dasbor Dapur Sosial (sosial1 / sosial1):");
  console.log("  1. Pakcoy Hijau (40 kg) - Subsidi 85% -> Rp 1.200/kg (160 Porsi Bergizi)");
  console.log("  2. Buncis Tegak (25 kg) - Subsidi 80% -> Rp 2.400/kg (100 Porsi Bergizi)");
  console.log("\n💡 Langsung login ke sosial1 di http://localhost:3000 untuk mencoba tombol Tebus Subsidi / Donasi!");
  console.log("================================================================================\n");
}

runSeedSocial();
