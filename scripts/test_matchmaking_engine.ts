/**
 * Automated Test Suite untuk Validasi Mesin Pencocokan Sirkular 3-Tier (PSR-22).
 * Menguji akurasi formula Haversine, pemeringkatan prioritas jarak, proteksi kapasitas,
 * dan batas waktu eksekusi SLA (< 100 ms).
 */

import {
  haversineDistanceKm,
  findMatchesForOffer,
  batchMatchOffers,
  matchmakingEngine,
} from "../src/lib/matchmakingEngine";
import {
  CIRCULAR_BUYERS,
  MARKET_ANCHOR_COORDINATES,
  CircularBuyer,
} from "../src/data/buyers";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testId: string, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  \x1b[32m✔ [PASS]\x1b[0m \x1b[1m${testId}\x1b[0m: ${testName}${detail ? ` \x1b[90m(${detail})\x1b[0m` : ""}`);
    passedTests++;
  } else {
    console.error(`  \x1b[31m✖ [FAIL]\x1b[0m \x1b[1m${testId}\x1b[0m: ${testName}${detail ? ` \x1b[31m(${detail})\x1b[0m` : ""}`);
    failedTests++;
  }
}

async function runMatchmakingTestSuite() {
  console.log("\n================================================================================");
  console.log("  PASARIN PSR-22 CIRCULAR 3-TIER MATCHMAKING ENGINE TEST SUITE");
  console.log("  Mata Kuliah : Rekayasa Perangkat Lunak - Fakultas Teknik Universitas Indonesia");
  console.log(`  Jangkar GPS : ${MARKET_ANCHOR_COORDINATES.name} (${MARKET_ANCHOR_COORDINATES.latitude}, ${MARKET_ANCHOR_COORDINATES.longitude})`);
  console.log(`  Waktu Uji   : ${new Date().toLocaleString("id-ID")}`);
  console.log("================================================================================\n");

  // --- Test 1: Akurasi Geospasial Formula Haversine ---
  console.log("\x1b[33m▶ [Uji 1] Akurasi Geospasial Formula Haversine (Haversine Distance Accuracy)\x1b[0m");

  // Jarak ke Warteg Ibu Yayu Hek (-6.264, 106.872) ~0.4 km
  const distYayu = haversineDistanceKm(
    MARKET_ANCHOR_COORDINATES.latitude,
    MARKET_ANCHOR_COORDINATES.longitude,
    -6.264,
    106.872
  );
  assert(
    distYayu >= 0.35 && distYayu <= 0.55,
    "TC-MM01",
    "Formula Haversine menghitung jarak presisi ke Warteg Hek (~0.43 km)",
    `Jarak aktual: ${distYayu} km`
  );

  // Jarak ke Warteg Condet (-6.275, 106.862) ~1.2 km
  const distCondet = haversineDistanceKm(
    MARKET_ANCHOR_COORDINATES.latitude,
    MARKET_ANCHOR_COORDINATES.longitude,
    -6.275,
    106.862
  );
  assert(
    distCondet >= 1.0 && distCondet <= 1.5,
    "TC-MM02",
    "Formula Haversine menghitung jarak presisi ke Condet (~1.22 km)",
    `Jarak aktual: ${distCondet} km`
  );

  // Jarak ke titik yang sama persis harus 0.000 km
  const distZero = haversineDistanceKm(
    MARKET_ANCHOR_COORDINATES.latitude,
    MARKET_ANCHOR_COORDINATES.longitude,
    MARKET_ANCHOR_COORDINATES.latitude,
    MARKET_ANCHOR_COORDINATES.longitude
  );
  assert(
    distZero === 0,
    "TC-MM03",
    "Jarak titik terhadap dirinya sendiri bernilai nol mutlak (0.000 km)",
    `Jarak: ${distZero} km`
  );

  // --- Test 2: Isolasi Kategori 3-Tier ---
  console.log("\n\x1b[33m▶ [Uji 2] Isolasi Peran 3-Tier (Tier Filtering Integrity)\x1b[0m");

  const sampleOfferTier1 = {
    id: "ofr_test_01",
    commodityId: "kangkung",
    quantityKg: 35,
    targetTier: "tier_1" as const,
  };
  const matchResultTier1 = findMatchesForOffer(sampleOfferTier1);
  const allTier1 = matchResultTier1.rankedMatches.every((m) => m.tier === "tier_1");
  assert(
    allTier1 && matchResultTier1.rankedMatches.length > 0,
    "TC-MM04",
    "Penawaran Tier 1 hanya dievaluasi dan dipasangkan ke mitra Warteg & UMKM",
    `Total kandidat terfilter: ${matchResultTier1.rankedMatches.length} mitra`
  );

  const sampleOfferTier3 = {
    id: "ofr_test_03",
    commodityId: "sawi_hijau",
    quantityKg: 40,
    targetTier: "tier_3" as const,
  };
  const matchResultTier3 = findMatchesForOffer(sampleOfferTier3);
  const allTier3 = matchResultTier3.rankedMatches.every((m) => m.tier === "tier_3");
  assert(
    allTier3 && matchResultTier3.rankedMatches.length > 0,
    "TC-MM05",
    "Penawaran Tier 3 hanya dievaluasi dan dipasangkan ke Sentra Maggot BSF",
    `Total kandidat terfilter: ${matchResultTier3.rankedMatches.length} mitra`
  );

  // --- Test 3: Pembatasan Radius Geospasial (Maksimal 5.0 km) ---
  console.log("\n\x1b[33m▶ [Uji 3] Pembatasan Radius Geospasial Maksimal 5.0 km (Radius Enforcing)\x1b[0m");

  // Tambahkan mock pembeli di Depok / Bogor (jarak > 15 km)
  const farBuyer: CircularBuyer = {
    id: "buyer_far_bogor",
    name: "Warteg Jauh di Depok Margonda",
    ownerName: "Pak Joko",
    phone: "081299998888",
    tier: "tier_1",
    typeLabel: "Warteg & Katering UMKM",
    latitude: -6.372,
    longitude: 106.832, // ~12 km dari Kramat Jati
    address: "Jl. Margonda Raya No. 100, Depok",
    dailyCapacityKg: 100,
    currentAllocatedKg: 0,
    reputationScore: 90,
    preferredCommodities: ["kangkung"],
    operationalHours: { openClock: "06:00", closeClock: "22:00" },
  };

  const poolWithFarBuyer = [...CIRCULAR_BUYERS, farBuyer];
  const matchWithFar = findMatchesForOffer(sampleOfferTier1, { customBuyers: poolWithFarBuyer });
  const farMatch = matchWithFar.rankedMatches.find((m) => m.buyerId === "buyer_far_bogor")!;

  assert(
    farMatch.isEligible === false && farMatch.distanceKm > 5.0,
    "TC-MM06",
    "Mitra dengan jarak > 5.0 km otomatis ditandai TIDAK ELIGIBLE",
    `Jarak: ${farMatch.distanceKm} km, Alasan: '${farMatch.ineligibilityReason}'`
  );

  // --- Test 4: Proteksi Kelebihan Kapasitas Harian (Anti-Overcapacity Guard) ---
  console.log("\n\x1b[33m▶ [Uji 4] Proteksi Batas Kapasitas Harian Mitra (Capacity Overload Guard)\x1b[0m");

  // Muatan raksasa 75 kg (melebihi kapasitas tersisa Warteg Ibu Yayu yang hanya 40 kg tersisa)
  const giantOffer = {
    id: "ofr_giant_01",
    commodityId: "kangkung",
    quantityKg: 75,
    targetTier: "tier_1" as const,
  };
  const matchGiant = findMatchesForOffer(giantOffer);
  const yayuMatch = matchGiant.rankedMatches.find((m) => m.buyerId === "buyer_warteg_02")!;

  assert(
    yayuMatch.isEligible === false,
    "TC-MM07",
    "Mitra yang kuota tampungnya tidak mencukupi muatan surplus otomatis ditandai TIDAK ELIGIBLE",
    `Sisa Kuota: ${yayuMatch.remainingCapacityKg} kg vs Muatan: 75 kg`
  );

  // Katering Berkah Cawang (kuota tersisa 80 kg) harus tetap eligible
  const cawangMatch = matchGiant.rankedMatches.find((m) => m.buyerId === "buyer_warteg_04")!;
  assert(
    cawangMatch.isEligible === true && cawangMatch.remainingCapacityKg >= 75,
    "TC-MM08",
    "Mitra dengan kapasitas mencukupi tetap berstatus ELIGIBLE",
    `Sisa Kuota: ${cawangMatch.remainingCapacityKg} kg`
  );

  // --- Test 5: Pemeringkatan Prioritas Jarak Terdekat ---
  console.log("\n\x1b[33m▶ [Uji 5] Pemeringkatan Prioritas Mitra Terdekat (DoD Acceptance Criteria)\x1b[0m");

  const normalOffer = {
    id: "ofr_normal_01",
    commodityId: "kangkung",
    quantityKg: 20,
    targetTier: "tier_1" as const,
  };
  const rankedNormal = findMatchesForOffer(normalOffer);
  const topBuyer = rankedNormal.topRecommendedBuyer!;

  assert(
    topBuyer.id === "buyer_warteg_02", // Warteg Ibu Yayu Hek (0.43 km terdekat)
    "TC-MM09",
    "Warteg pada radius terdekat (0.43 km) otomatis menempati rekomendasi pertama (Top Rank)",
    `Rekomendasi #1: ${topBuyer.name} (${rankedNormal.rankedMatches[0].distanceKm} km, Skor: ${rankedNormal.rankedMatches[0].totalMatchScore})`
  );

  // --- Test 6: SLA Kecepatan Perhitungan (< 100 ms) ---
  console.log("\n\x1b[33m▶ [Uji 6] Tolok Ukur Kecepatan Eksekusi / SLA (< 100 ms)\x1b[0m");

  const sampleLots = [
    { id: "lot_01", commodityId: "kangkung", quantityKg: 40, targetTier: "tier_1" as const },
    { id: "lot_02", commodityId: "bayam", quantityKg: 25, targetTier: "tier_1" as const },
    { id: "lot_03", commodityId: "pakcoy", quantityKg: 30, targetTier: "tier_2" as const },
    { id: "lot_04", commodityId: "sawi_hijau", quantityKg: 50, targetTier: "tier_3" as const },
  ];

  const benchStart = performance.now();
  const batchResults = batchMatchOffers(sampleLots);
  const benchEnd = performance.now();
  const batchDuration = Number((benchEnd - benchStart).toFixed(2));

  assert(
    batchDuration < 100.0 && batchResults.length === 4,
    "TC-MM10",
    "Pencocokan batch seluruh lot aktif selesai dalam durasi di bawah seratus milidetik (< 100 ms)",
    `Durasi eksekusi: ${batchDuration} ms (Target: < 100 ms)`
  );

  // --- Test 7: Integritas Fasad Modul ---
  console.log("\n\x1b[33m▶ [Uji 7] Integritas Fasad Modul matchmakingEngine\x1b[0m");

  assert(
    typeof matchmakingEngine.findMatchesForOffer === "function" &&
    typeof matchmakingEngine.haversineDistanceKm === "function" &&
    matchmakingEngine.MAX_RADIUS_KM === 5.0,
    "TC-MM11",
    "Fasad matchmakingEngine mengekspos seluruh fungsi dan konstanta kurikulum resmi",
    `Radius acuan: ${matchmakingEngine.MAX_RADIUS_KM} km`
  );

  console.log("\n================================================================================");
  if (failedTests === 0) {
    console.log(`\x1b[32m🎉 SEMUA PENGUJIAN PSR-22 LULUS 100%! (${passedTests}/${totalTests} TESTS PASSED)\x1b[0m`);
    console.log("✔ Seluruh Kriteria Penerimaan (DoD) Tiket PSR-22 Terpenuhi Sempurna.");
  } else {
    console.error(`\x1b[31m✖ PENGUJIAN GAGAL: ${failedTests} pengujian tidak memenuhi syarat.\x1b[0m`);
  }
  console.log("================================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMatchmakingTestSuite().catch((err) => {
  console.error("Testbench execution error:", err);
  process.exit(1);
});
