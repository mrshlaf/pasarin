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
  VEHICLE_SPECIFICATIONS,
  CargoStop,
} from "../src/lib/fleetCargoCalculator";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? ` -> ${detail}` : ""}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    failedCount++;
  }
}

async function runFleetCalculatorTests() {
  console.log("================================================================================");
  console.log("  PENGUJIAN UNIT MANDIRI: PSR-27 (LOGISTICS FLEET & CARGO CALCULATOR)");
  console.log("  Fokus: Weight Dispatch Rule, Rute Multi-Stop, & Manifes Digital");
  console.log("================================================================================\n");

  // Test 1: Aturan Penugasan Muatan Ringan (<= 300 kg -> Viar Roda 3)
  console.log("[Test 1] Alokasi Muatan Ringan <= 300 kg (Motor Viar Roda 3)");
  const lightAllocation = calculateFleetAllocation(180, "warteg");
  assert(
    lightAllocation.vehicleType === "viar_trike",
    "Muatan 180 kg dialokasikan ke Motor Viar Roda 3",
    lightAllocation.vehicleSpec.displayName
  );
  assert(
    lightAllocation.unitsRequired === 1,
    "Jumlah kendaraan yang dibutuhkan tepat 1 unit",
    "1 Unit Viar"
  );
  assert(
    lightAllocation.recommendedDriver.includes("Joko"),
    "Pengemudi otomatis ditugaskan ke Pak Joko Santoso",
    lightAllocation.recommendedDriver
  );

  // Test 2: Aturan Penugasan Muatan Menengah (301 - 1.000 kg -> GranMax Pikap)
  console.log("\n[Test 2] Alokasi Muatan Menengah 301 - 1.000 kg (GranMax Pikap)");
  const mediumAllocation = calculateFleetAllocation(750, "social_kitchen");
  assert(
    mediumAllocation.vehicleType === "granmax_pickup",
    "Muatan 750 kg komersial warteg/panti dialokasikan ke GranMax Pikap",
    mediumAllocation.vehicleSpec.displayName
  );
  assert(
    mediumAllocation.capacityUtilizationPct === 75.0,
    "Pemanfaatan kapasitas muatan terhitung 75.0% (750 / 1.000 kg)",
    `${mediumAllocation.capacityUtilizationPct}%`
  );

  // Test 3: Aturan Penugasan Muatan Massal (> 1.000 kg -> Truk Isuzu Elf)
  console.log("\n[Test 3] Alokasi Muatan Massal > 1.000 kg (Truk Isuzu Elf)");
  const heavyAllocation = calculateFleetAllocation(2400, "maggot");
  assert(
    heavyAllocation.vehicleType === "isuzu_truck",
    "Muatan massal reject organik 2.400 kg dialokasikan ke Truk Isuzu Elf",
    heavyAllocation.vehicleSpec.displayName
  );
  assert(
    heavyAllocation.vehicleSpec.fuelType === "Bio Solar",
    "Spesifikasi bahan bakar truk menggunakan Bio Solar ekonomis",
    heavyAllocation.vehicleSpec.fuelType
  );

  // Test 4: Rute Penjemputan Terurut (Blok A -> Blok B -> Blok C)
  console.log("\n[Test 4] Optimalisasi Urutan Rute Penjemputan Los Kios Pasar (Blok A -> B -> C)");
  const messyStops: CargoStop[] = [
    { kioskStall: "C-04", kioskName: "Kios Kentang Dieng", block: "C", commodityName: "Kentang", weightKg: 50 },
    { kioskStall: "A-18", kioskName: "Kios Pakcoy Sukabumi", block: "A", commodityName: "Pakcoy", weightKg: 40 },
    { kioskStall: "B-22", kioskName: "Kios Tomat Garut", block: "B", commodityName: "Tomat", weightKg: 30 },
    { kioskStall: "A-12", kioskName: "Kios Sayur Daun", block: "A", commodityName: "Kangkung", weightKg: 45 },
  ];

  const destination = {
    name: "Warteg Kharisma Bahari Condet",
    role: "warteg" as const,
    distanceKm: 2.4,
  };

  const manifest = generateDeliveryManifest(messyStops, destination);
  const orderedStalls = manifest.orderedPickUpStops.map((s) => s.kioskStall);
  assert(
    orderedStalls[0] === "A-12" && orderedStalls[1] === "A-18" && orderedStalls[2] === "B-22" && orderedStalls[3] === "C-04",
    "Rute penjemputan terurut sempurna dari Blok A-12 -> A-18 -> B-22 -> C-04",
    orderedStalls.join(" -> ")
  );

  // Test 5: Integritas Manifes Perjalanan & Kalkulasi BBM
  console.log("\n[Test 5] Manifes Perjalanan Digital & Estimasi Konsumsi BBM");
  assert(
    manifest.totalWeightKg === 165,
    "Total berat muatan manifes terakumulasi presisi 165 kg",
    `${manifest.totalWeightKg} kg`
  );
  assert(
    manifest.fuelConsumptionLiters > 0 && manifest.estimatedFuelCostIdr > 0,
    "Estimasi konsumsi liter BBM dan biaya bahan bakar terhitung valid",
    `${manifest.fuelConsumptionLiters} Liter | Rp ${manifest.estimatedFuelCostIdr.toLocaleString("id-ID")}`
  );
  assert(
    manifest.estimatedDurationMinutes > 0,
    "Estimasi durasi penjemputan dan pengantaran terhitung realistis",
    `${manifest.estimatedDurationMinutes} menit`
  );

  console.log("\n================================================================================");
  console.log(`HASIL AKHIR PENGUJIAN PSR-27: ${passedCount} LULUS, ${failedCount} GAGAL`);
  console.log("================================================================================\n");

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

runFleetCalculatorTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
