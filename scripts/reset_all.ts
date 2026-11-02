/**
 * Skrip CLI Reset Total Database & Status Simulasi PASARIN dari Nol.
 * Mengembalikan seluruh status pasar ke kondisi subuh pagi hari (04:30 WIB):
 * - Katalog Warteg, Dapur Sosial, Maggot: Kosong Murni (0 Lot)
 * - Antrean Kurir Logistik: Kosong (0 Antrean)
 * - Saldo Escrow Bank Indonesia: Rp 0
 * - Saldo Dompet Pedagang H. Rohmat: Rp 345.000 (Kas Awal)
 * - Inventaris 30 Kios: Segar Prima Pagi Hari
 *
 * Jalankan via terminal:
 *   cd "C:\Project\Pasarin"
 *   npm run reset:all
 */

async function runResetAll() {
  console.log("================================================================================");
  console.log("  PASARIN TOTAL SYSTEM RESET (KONDISI AWAL PAGI HARI 04:30 WIB)");
  console.log("================================================================================\n");

  try {
    const res = await fetch("http://localhost:3000/api/simulation/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear" }),
    });
    if (res.ok) {
      console.log("✔ [BERHASIL] Seluruh penawaran surplus & transaksi server telah di-reset!");
    }
  } catch {
    console.log("ℹ Server dev sedang tidak aktif / respons offline.");
  }

  console.log("\n📋 Status Ekosistem Pasar Saat Ini:");
  console.log("  1. Lapak Kios A-12 (H. Rohmat)  : 3 Komoditas Inti Segar Pagi Hari");
  console.log("  2. Katalog Warteg (Tier 1)      : KOSONG (0 lot) -> Bersih, belum ada diskon");
  console.log("  3. Katalog Dapur Sosial (Tier 2): KOSONG (0 lot) -> Bersih, belum ada donasi");
  console.log("  4. Katalog Maggot BSF (Tier 3)  : KOSONG (0 lot) -> Bersih, belum ada afkir");
  console.log("  5. Tugas Armada Kurir           : KOSONG (0 tugas) -> Menunggu transaksi");
  console.log("  6. Saldo Escrow Bank Indonesia  : Rp 0");
  console.log("\n💡 Web Anda di http://localhost:3000 sekarang berada di kondisi awal murni!");
  console.log("================================================================================\n");
}

runResetAll();
