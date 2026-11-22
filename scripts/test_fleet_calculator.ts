/**
 * Skrip Pengujian Unit Mandiri: PSR-27 (Logistics Fleet and Cargo Calculator).
 * Memverifikasi:
 * 1. Aturan Ambang Batas Muatan (Weight Dispatch Rule):
 *    - Muatan <= 300 kg dialokasikan ke Motor Viar Roda 3.
 *    - Muatan 301 - 1.000 kg dialokasikan ke Mobil Daihatsu GranMax Pikap.
 *    - Muatan > 1.000 kg dialokasikan ke Truk Engkel Isuzu Elf.
 * 2. Rute Penjemputan Terurut (Multi-stop sequencing: Blok A -> Blok B -> Blok C).
 * 3. Manifes Perjalanan Pengantaran Digital & Kalkulasi Konsumsi BBM.
 */

import {
  calculateFleetAllocation,
  generateDeliveryManifest,
  CargoStop,
} from "../src/lib/fleetCargoCalculator";

// Penghitung jumlah asersi pengujian yang berhasil dan gagal
let passedCount = 0;
// Jumlah asersi gagal; bila lebih dari nol, skrip keluar dengan kode 1.
let failedCount = 0;

/**
 * Fungsi pembantu (helper) untuk mengevaluasi kondisi kebenaran asersi.
 * Mencetak log status lulus/gagal beserta nama skenario dan detail nilai observasi.
 *
 * @param condition - Kondisi boolean yang diuji (harus bernilai true untuk lulus).
 * @param testName - Nama atau deskripsi ringkas skenario pengujian.
 * @param detail - Detail nilai aktual atau teks observasi tambahan.
 */
function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? ` -> ${detail}` : ""}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    failedCount++;
  }
}

/**
 * Fungsi utama eksekutor rangkaian uji coba kalkulator armada logistik PSR-27.
 * Menguji kalkulasi armada berdasarkan bobot muatan, pengurutan rute kios, dan pembuatan manifes.
 */
async function runFleetCalculatorTests() {
  console.log("\nPengujian Unit Mandiri: PSR-27 (Logistics Fleet & Cargo Calculator)");
  console.log("Fokus: Weight Dispatch Rule, Rute Multi-Stop, dan Manifes Digital\n");

  // Uji 1: Aturan Penugasan Muatan Ringan (<= 300 kg -> Viar Roda 3)
  console.log("[Test 1] Alokasi Muatan Ringan <= 300 kg (Motor Viar Roda 3)");
  // Menghitung alokasi armada logistik untuk muatan 180 kg ke mitra Warteg
  const lightAllocation = calculateFleetAllocation(180, "warteg");

  // Memvalidasi bahwa muatan <= 300 kg otomatis menggunakan moda transportasi roda tiga (Viar Trike)
  assert(
    lightAllocation.vehicleType === "viar_trike",
    "Muatan 180 kg dialokasikan ke Motor Viar Roda 3",
    lightAllocation.vehicleSpec.displayName
  );

  // Memvalidasi bahwa kapasitas angkut 1 unit Viar (300 kg) cukup untuk muatan 180 kg sehingga hanya butuh 1 unit
  assert(
    lightAllocation.unitsRequired === 1,
    "Jumlah kendaraan yang dibutuhkan tepat 1 unit",
    "1 Unit Viar"
  );

  // Memverifikasi penetapan nama kurir resmi terdaftar di rute pasar Kramat Jati (Pak Joko Santoso)
  assert(
    lightAllocation.recommendedDriver.includes("Joko"),
    "Pengemudi otomatis ditugaskan ke Pak Joko Santoso",
    lightAllocation.recommendedDriver
  );

  // Uji 2: Aturan Penugasan Muatan Menengah (301 - 1.000 kg -> GranMax Pikap)
  console.log("\n[Test 2] Alokasi Muatan Menengah 301 - 1.000 kg (GranMax Pikap)");
  // Menghitung alokasi armada logistik untuk muatan 750 kg ke mitra Dapur Sosial
  const mediumAllocation = calculateFleetAllocation(750, "social_kitchen");

  // Memvalidasi bahwa muatan 750 kg otomatis dialokasikan ke Mobil Pikap Daihatsu GranMax (kapasitas 1.000 kg)
  assert(
    mediumAllocation.vehicleType === "granmax_pickup",
    "Muatan 750 kg komersial warteg/panti dialokasikan ke GranMax Pikap",
    mediumAllocation.vehicleSpec.displayName
  );

  // Memvalidasi rasio utilisasi ruang kargo mobil pikap (750 kg / 1.000 kg kapasitas maksimum = 75.0%)
  assert(
    mediumAllocation.capacityUtilizationPct === 75.0,
    "Pemanfaatan kapasitas muatan terhitung 75.0% (750 / 1.000 kg)",
    `${mediumAllocation.capacityUtilizationPct}%`
  );

  // Uji 3: Aturan Penugasan Muatan Massal (> 1.000 kg -> Truk Isuzu Elf)
  console.log("\n[Test 3] Alokasi Muatan Massal > 1.000 kg (Truk Isuzu Elf)");
  // Menghitung alokasi armada logistik untuk muatan afkir 2.400 kg ke sentra budidaya Maggot BSF
  const heavyAllocation = calculateFleetAllocation(2400, "maggot");

  // Memvalidasi bahwa muatan > 1.000 kg otomatis menggunakan Truk Engkel Isuzu Elf (kapasitas hingga 2.500 kg)
  assert(
    heavyAllocation.vehicleType === "isuzu_truck",
    "Muatan massal reject organik 2.400 kg dialokasikan ke Truk Isuzu Elf",
    heavyAllocation.vehicleSpec.displayName
  );

  // Memverifikasi bahwa jenis bahan bakar truk terdaftar sebagai Bio Solar bersubsidi ramah operasional
  assert(
    heavyAllocation.vehicleSpec.fuelType === "Bio Solar",
    "Spesifikasi bahan bakar truk menggunakan Bio Solar ekonomis",
    heavyAllocation.vehicleSpec.fuelType
  );

  // Uji 4: Rute Penjemputan Terurut (Blok A -> Blok B -> Blok C)
  console.log("\n[Test 4] Optimalisasi Urutan Rute Penjemputan Los Kios Pasar (Blok A -> B -> C)");
  // Daftar titik jemput kios yang masih acak susunan bloknya
  const messyStops: CargoStop[] = [
    { kioskStall: "C-04", kioskName: "Kios Kentang Dieng", block: "C", commodityName: "Kentang", weightKg: 50 },
    { kioskStall: "A-18", kioskName: "Kios Pakcoy Sukabumi", block: "A", commodityName: "Pakcoy", weightKg: 40 },
    { kioskStall: "B-22", kioskName: "Kios Tomat Garut", block: "B", commodityName: "Tomat", weightKg: 30 },
    { kioskStall: "A-12", kioskName: "Kios Sayur Daun", block: "A", commodityName: "Kangkung", weightKg: 45 },
  ];

  // Parameter tujuan pengantaran ke mitra Warteg Condet dengan jarak tempuh 2.4 km
  const destination = {
    name: "Warteg Kharisma Bahari Condet",
    role: "warteg" as const,
    distanceKm: 2.4,
  };

  // Menjalankan algoritma pembuat manifes pengiriman terurut
  const manifest = generateDeliveryManifest(messyStops, destination);
  const orderedStalls = manifest.orderedPickUpStops.map((s) => s.kioskStall);

  // Memverifikasi bahwa rute kurir pasar diurutkan secara optimal menurut blok: Blok A (A-12, A-18), Blok B (B-22), lalu Blok C (C-04)
  assert(
    orderedStalls[0] === "A-12" && orderedStalls[1] === "A-18" && orderedStalls[2] === "B-22" && orderedStalls[3] === "C-04",
    "Rute penjemputan terurut sempurna dari Blok A-12 -> A-18 -> B-22 -> C-04",
    orderedStalls.join(" -> ")
  );

  // Uji 5: Integritas Manifes Perjalanan & Kalkulasi BBM
  console.log("\n[Test 5] Manifes Perjalanan Digital & Estimasi Konsumsi BBM");

  // Memvalidasi akumulasi total berat seluruh muatan jemputan (50 + 40 + 30 + 45 = 165 kg)
  assert(
    manifest.totalWeightKg === 165,
    "Total berat muatan manifes terakumulasi presisi 165 kg",
    `${manifest.totalWeightKg} kg`
  );

  // Memverifikasi perhitungan konsumsi BBM dalam liter dan estimasi biaya rupiah bahan bakar bernilai positif (> 0)
  assert(
    manifest.fuelConsumptionLiters > 0 && manifest.estimatedFuelCostIdr > 0,
    "Estimasi konsumsi liter BBM dan biaya bahan bakar terhitung valid",
    `${manifest.fuelConsumptionLiters} Liter | Rp ${manifest.estimatedFuelCostIdr.toLocaleString("id-ID")}`
  );

  // Memverifikasi bahwa estimasi waktu durasi operasional kurir terhitung realistis (> 0 menit)
  assert(
    manifest.estimatedDurationMinutes > 0,
    "Estimasi durasi penjemputan dan pengantaran terhitung realistis",
    `${manifest.estimatedDurationMinutes} menit`
  );

  // Rekapitulasi hasil pengujian
  console.log(`\nHasil akhir pengujian PSR-27: ${passedCount} lulus, ${failedCount} gagal\n`);

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

// Menjalankan skrip uji kalkulator armada dan menangani galat fatal jika terjadi
runFleetCalculatorTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
