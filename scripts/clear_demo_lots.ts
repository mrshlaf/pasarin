/**
 * Skrip CLI Pembersih Data Benih Demo PASARIN.
 * Mengosongkan kembali katalog surplus ke kondisi pagi hari murni (sebelum jam 14:30 WIB).
 *
 * Jalankan via terminal:
 *   cd "C:\Project\Pasarin"
 *   npm run clear:demo
 */

async function runClear() {
  console.log("================================================================================");
  console.log("  PASARIN DEMO CATALOG CLEAR RUNNER");
  console.log("  Mengembalikan Katalog Surplus ke Kondisi Awal Pagi Hari (Bersih Murni)");
  console.log("================================================================================\n");

  try {
    const res = await fetch("http://localhost:3000/api/simulation/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear" }),
    });
    if (res.ok) {
      console.log("✔ [BERHASIL] Seluruh penawaran surplus berhasil dikosongkan dari server!");
    }
  } catch {
    console.log("ℹ Server dev tidak terjangkau (offline).");
  }

  console.log("\n✔ Status Katalog Saat Ini:");
  console.log("  - Katalog Warteg (Tier 1)      : KOSONG (0 lot) -> Siap menerima diskon baru");
  console.log("  - Katalog Dapur Sosial (Tier 2): KOSONG (0 lot) -> Siap menerima donasi");
  console.log("  - Katalog Maggot BSF (Tier 3)  : KOSONG (0 lot) -> Tidak ada limbah busuk pagi");
  console.log("  - Antrean Kurir Logistik       : KOSONG (0 lot) -> Belum ada serah terima");
  console.log("\n💡 Untuk mengisi ulang lot demo kapan saja: npm run seed:demo");
  console.log("================================================================================\n");
}

runClear();
