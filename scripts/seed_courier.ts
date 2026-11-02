/**
 * Skrip CLI Pemuatan Tugas Pengantaran Aktif Kurir & Rekening Escrow.
 * Menyiapkan 1 pesanan Kangkung Darat (20 kg) seharga Rp 50.000 yang tertahan di rekening bersama
 * untuk demonstrasi validasi serah terima geofence GPS <= 50 meter dan pencairan dana ke pedagang.
 *
 * Jalankan via terminal:
 *   cd "C:\Project\Pasarin"
 *   npm run seed:courier
 */

async function runSeedCourier() {
  console.log("================================================================================");
  console.log("  PASARIN SCENARIO RUNNER: LOGISTIK & SERAH TERIMA GEOFENCE GPS (PoD)");
  console.log("================================================================================\n");

  try {
    const res = await fetch("http://localhost:3000/api/simulation/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed_courier" }),
    });
    if (res.ok) {
      console.log("✔ [BERHASIL] 1 Tugas pengantaran kurir & rekening escrow Rp 50.000 disiapkan!");
    }
  } catch {
    console.log("ℹ Server dev offline / standalone mode.");
  }

  console.log("\n🚚 Tugas Pengantaran Aktif di Dasbor Kurir (kurir1 / kurir1):");
  console.log("  - Armada        : Armada Viar Roda Tiga 01 (Pak Joko)");
  console.log("  - Muatan        : Kangkung Darat (20 kg)");
  console.log("  - Tujuan        : Warteg Kharisma Bahari (1.8 km)");
  console.log("  - Status Escrow : HELD IN ESCROW (Rp 50.000)");
  console.log("  - Token PoD     : POD-HMAC-VIAR01");
  console.log("\n💡 Langsung login ke kurir1 di http://localhost:3000:");
  console.log("   Klik 'Validasi Serah Terima PoD' -> Geser jarak <= 50m -> Cairkan Escrow!");
  console.log("================================================================================\n");
}

runSeedCourier();
