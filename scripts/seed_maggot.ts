/**
 * Skrip CLI Pemuatan Muatan Limbah Organik Maggot BSF (Tier 3).
 * Menyiapkan sayuran afkir/busuk non-pangan untuk pengujian fasilitas biokonversi TPS 3R
 * dan pembuktian Invarian 1 (Zero Edible Food to Feed).
 *
 * Jalankan via terminal:
 *   cd "C:\Project\Pasarin"
 *   npm run seed:maggot
 */

async function runSeedMaggot() {
  console.log("================================================================================");
  console.log("  PASARIN SCENARIO RUNNER: TIER 3 (SENTRA MAGGOT BSF & TPS 3R)");
  console.log("================================================================================\n");

  try {
    const res = await fetch("http://localhost:3000/api/simulation/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed_maggot" }),
    });
    if (res.ok) {
      console.log("✔ [BERHASIL] 2 Lot limbah afkir Tier 3 berhasil disuntikkan ke server!");
    }
  } catch {
    console.log("ℹ Server dev offline / standalone mode.");
  }

  console.log("\n🪱 Muatan Limbah Siap Masuk Biopond di Dasbor Maggot (maggot1 / maggot1):");
  console.log("  1. Sawi Hijau Inap (30 kg)  - Afkir Non-Pangan -> Rp 500/kg (Pakan Larva)");
  console.log("  2. Terung Ungu Rusak (35 kg) - Afkir Non-Pangan -> Rp 400/kg (Pakan Larva)");
  console.log("\n💡 Langsung login ke maggot1 di http://localhost:3000 untuk mencoba tombol Angkut ke Biopond!");
  console.log("================================================================================\n");
}

runSeedMaggot();
