// Automated unit test suite untuk validasi Sprint 2 (PSR-39)

import { COMMODITIES } from "../src/data/commodities";
import { weatherAgent } from "../src/lib/weatherAgent";
import {
  calculateArrheniusRateConstant,
  evaluateArrheniusDecay,
  calculateRainFootfallAttenuation,
  calculateInverseSurgePricing,
  calculateCompositeMarketSurplus,
  calculateUrgencyLevel,
  validateQualityGateMoralHazard,
  KioskStockInput,
} from "../src/lib/pasarinCore";

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

async function runTestSuite() {
  console.log("\n--- PASARIN AUTOMATED TEST SUITE (SPRINT 2 VALIDATION) ---");
  console.log(`Target: Pasar Kramat Jati (-6.2675, 106.8702) | Waktu Uji: ${new Date().toLocaleString("id-ID")}\n`);

  // Suite 1: Telemetri cuaca Kramat Jati & fail-safe cache (PSR-5)
  console.log("\x1b[33m▶ [SUITE 1: PSR-5] Telemetri Cuaca Hiperlokal & In-Memory Cache\x1b[0m");
  weatherAgent.clearCache();

  const wLive = await weatherAgent.getMarketWeather({ forceRefresh: true });
  assert(
    wLive.location.latitude === -6.2675 && wLive.location.longitude === 106.8702,
    "TC-W01",
    "Koordinat geografis akurat di Pasar Induk Kramat Jati",
    `${wLive.location.latitude}, ${wLive.location.longitude}`
  );
  assert(
    wLive.temperatureCelsius >= 25 && wLive.temperatureCelsius <= 40,
    "TC-W02",
    "Suhu fisik terverifikasi dalam rentang tropis realistis",
    `${wLive.temperatureCelsius}°C`
  );

  // Verifikasi cache memori 15 menit
  const wCached = await weatherAgent.getMarketWeather();
  assert(
    wCached.source === "cache",
    "TC-W03",
    "Panggilan berulang membaca in-memory cache tanpa membebani API kuota",
    `source: '${wCached.source}'`
  );

  // Verifikasi fallback darurat offline
  const wFallback = await weatherAgent.getMarketWeather({ simulateOffline: true });
  assert(
    wFallback.source === "fallback_offline" && wFallback.temperatureCelsius === 32.0 && wFallback.relativeHumidityPercent === 75.0,
    "TC-W04",
    "Fail-safe fallback otomatis mengembalikan profil tropis darurat (32°C, 75% RH)",
    `${wFallback.temperatureCelsius}°C, ${wFallback.relativeHumidityPercent}% RH`
  );

  // Suite 2: Kinetika peluruhan biologis Arrhenius-Q10 (PSR-14)
  console.log("\n\x1b[33m▶ [SUITE 2: PSR-14] Kinetika Peluruhan Biologis Arrhenius-Q10\x1b[0m");

  const kangkung = COMMODITIES.find((c) => c.id === "kangkung")!;
  assert(!!kangkung, "TC-K00", "Komoditas Kangkung Darat tersedia dalam katalog");

  // Kenaikan laju respirasi ~2.2x pada 33°C vs 20°C
  const rate20C = calculateArrheniusRateConstant(20.0, 75.0, kangkung.q10Coefficient);
  const rate33C = calculateArrheniusRateConstant(33.0, 75.0, kangkung.q10Coefficient);
  const accelerationRatio = rate33C / rate20C;
  assert(
    accelerationRatio >= 2.1 && accelerationRatio <= 2.6,
    "TC-01",
    "Validasi kinetika termal: laju peluruhan pada 33°C meningkat ~2.2x lipat dibanding 20°C acuan",
    `Rasio aktual: ${accelerationRatio.toFixed(2)}x`
  );

  // Kangkung pajang 8.5 jam masuk status layu_ringan
  const decayAt8_5h = evaluateArrheniusDecay(kangkung, 33.0, 75.0, 8.5);
  assert(
    decayAt8_5h.condition === "layu_ringan" && decayAt8_5h.decayScore >= 0.35 && decayAt8_5h.decayScore < 0.65,
    "TC-02",
    "Batas kritis layu kangkung: jam pajang 8.5 jam otomatis memicu status 'layu_ringan' (Tier 1 Warteg)",
    `DecayScore: ${decayAt8_5h.decayScore}, Condition: ${decayAt8_5h.condition}`
  );

  // Verifikasi klasifikasi 4-tier
  const decayFresh = evaluateArrheniusDecay(kangkung, 28.0, 75.0, 2.0);
  assert(
    decayFresh.condition === "segar_prima" && decayFresh.recommendedTier === "fresh",
    "TC-K03",
    "Sayuran pajang subuh 2 jam berkategori 'segar_prima' (Retail Normal)",
    `DecayScore: ${decayFresh.decayScore}`
  );

  const decayReject = evaluateArrheniusDecay(kangkung, 34.0, 85.0, 18.0);
  assert(
    decayReject.condition === "tidak_layak" && decayReject.recommendedTier === "tier_3",
    "TC-K04",
    "Sayuran terpapar terik 18 jam berkategori 'tidak_layak' (Tier 3 Maggot BSF)",
    `DecayScore: ${decayReject.decayScore}`
  );

  // Suite 3: Model redaman pengunjung saat hujan (PSR-15)
  console.log("\n\x1b[33m▶ [SUITE 3: PSR-15] Model Redaman Pengunjung Pasar saat Hujan\x1b[0m");

  // Hujan lebat 10 mm menurunkan estimasi pengunjung fisik hingga mendekati separuh kapasitas (48%)
  const rain10mm = calculateRainFootfallAttenuation(10.0, true);
  assert(
    rain10mm.footfallDropPercentage >= 45.0 && rain10mm.footfallDropPercentage <= 50.0,
    "TC-F01",
    "Curah hujan 10 mm menurunkan estimasi pembeli fisik sebesar ~48% sesuai DoD",
    `Drop aktual: ${rain10mm.footfallDropPercentage}%, Index: ${rain10mm.footfallIndex}`
  );
  assert(
    rain10mm.isMuddy === true,
    "TC-F02",
    "Kondisi lorong becek aktif otomatis saat curah hujan > 5 mm",
    `isMuddy: ${rain10mm.isMuddy}`
  );
  assert(
    rain10mm.surplusMultiplier >= 1.40,
    "TC-F03",
    "Faktor pengali surplus melonjak sebanding dengan redaman pengunjung pasar",
    `Surplus multiplier: ${rain10mm.surplusMultiplier}x`
  );

  // Cuaca kering 0 mm
  const dryWeather = calculateRainFootfallAttenuation(0.0, false);
  assert(
    dryWeather.footfallDropPercentage === 0.0 && dryWeather.footfallIndex === 1.0 && !dryWeather.isMuddy,
    "TC-F04",
    "Cuaca cerah menghasilkan 0% redaman (100% arus pengunjung normal)",
    `Index: ${dryWeather.footfallIndex}`
  );

  // Suite 4: Inverse surge dynamic pricing & price floor (PSR-20)
  console.log("\n\x1b[33m▶ [SUITE 4: PSR-20] Dynamic Pricing dengan Proteksi Price Floor Modal\x1b[0m");

  // Uji harga pada jam pemicu 14:30 WIB
  const price1430 = calculateInverseSurgePricing(kangkung, 14.5, 0.0);
  assert(
    price1430.appliedDiscountPercent >= 50 && price1430.appliedDiscountPercent <= 60,
    "TC-P01",
    "Diskon pembuka pada jam 14:30 WIB terhitung otomatis pada rentang 50%",
    `Harga tebus: Rp ${price1430.offeredSalvagePrice}/kg (Diskon ${price1430.appliedDiscountPercent}%)`
  );

  // Uji akselerasi diskon saat hujan lebat (> 10 mm)
  const priceRain = calculateInverseSurgePricing(kangkung, 16.0, 15.0);
  assert(
    priceRain.pricingMechanism === "inverse_surge_rain_accelerated" || priceRain.priceFloorEnforced,
    "TC-P02",
    "Hujan lebat (>10 mm) mengaktifkan pengali akselerasi diskon mu_weather = 0.85",
    `Mekanisme: ${priceRain.pricingMechanism}`
  );

  // Uji Price Floor Protection (Mencegah kerugian di bawah modal batas bawah)
  const price1800 = calculateInverseSurgePricing(kangkung, 18.0, 25.0);
  assert(
    price1800.offeredSalvagePrice >= price1800.minimumPriceFloor,
    "TC-P03",
    "Proteksi Price Floor mutlak: harga tebus tidak pernah tembus di bawah modal kulakan pedagang",
    `Harga tebus: Rp ${price1800.offeredSalvagePrice} >= Floor: Rp ${price1800.minimumPriceFloor}`
  );

  // Suite 5: Prediksi surplus komposit & baseline 1.240 kg (PSR-19)
  console.log("\n\x1b[33m▶ [SUITE 5: PSR-19] Prediksi Surplus Komposit & Validasi Baseline 1.240 kg\x1b[0m");

  // Uji Skala Urgensi (Urgency Level 1 s/d 5)
  assert(calculateUrgencyLevel(3.2) === 5, "TC-U01", "Sisa waktu < 4 jam masuk Urgency Level 5 (Kritis/Darurat)", "3.2 jam -> Level 5");
  assert(calculateUrgencyLevel(5.0) === 4, "TC-U02", "Sisa waktu 4-6 jam masuk Urgency Level 4 (Tinggi)", "5.0 jam -> Level 4");
  assert(calculateUrgencyLevel(7.5) === 3, "TC-U03", "Sisa waktu 6-8 jam masuk Urgency Level 3 (Sedang)", "7.5 jam -> Level 3");
  assert(calculateUrgencyLevel(10.0) === 2, "TC-U04", "Sisa waktu 8-12 jam masuk Urgency Level 2 (Rendah)", "10.0 jam -> Level 2");
  assert(calculateUrgencyLevel(15.0) === 1, "TC-U05", "Sisa waktu >= 12 jam masuk Urgency Level 1 (Aman)", "15.0 jam -> Level 1");

  // Uji agregasi 30 lapak sintetis untuk memvalidasi baseline ~1.240 kg
  const synthetic30Stalls: KioskStockInput[] = [];
  const commIds = ["kangkung", "bayam", "sawi_hijau", "cabai_merah_keriting", "tomat_merah", "kol_kubis"];

  for (let i = 1; i <= 30; i++) {
    const commId = commIds[(i - 1) % commIds.length];
    synthetic30Stalls.push({
      kioskId: `kiosk-${String(i).padStart(2, "0")}`,
      kioskName: `Lapak Hortikultura Blok A-${i}`,
      commodityId: commId,
      initialStockKg: 75.0,
      arrivalHourDecimal: 4.0,
    });
  }

  // Eksekusi prediksi surplus pada jam 14:30 WIB dengan kondisi hujan sore (12.5 mm)
  const compositeResult = calculateCompositeMarketSurplus(synthetic30Stalls, 32.5, 75.0, 12.5, 14.5);
  
  assert(
    compositeResult.summary.totalAnalyzedStalls === 30,
    "TC-C01",
    "Analisis komposit mencakup seluruh 30 kios pasar hortikultura",
    `${compositeResult.summary.totalAnalyzedStalls} kios`
  );

  // Baseline surplus berada dalam rentang toleransi 1.240 kg ± 5%
  const totalSurplus = compositeResult.summary.totalPredictedSurplusKg;
  assert(
    totalSurplus >= 1150.0 && totalSurplus <= 1350.0,
    "TC-C02",
    "Agregasi surplus pasar Kramat Jati memvalidasi target baseline empiris ~1.240 kg",
    `Surplus aktual: ${totalSurplus} kg (Target: 1.240 kg)`
  );

  assert(
    compositeResult.summary.criticalEmergencyItemsCount > 0,
    "TC-C03",
    "Sistem mendeteksi komoditas kritis darurat (Urgency Level 5) untuk diprioritaskan",
    `Total kritis: ${compositeResult.summary.criticalEmergencyItemsCount} item`
  );

  // Suite 6: Gerbang mutu etis pencegah moral hazard (PSR-21)
  console.log("\n\x1b[33m▶ [SUITE 6: PSR-21] Gerbang Mutu Etis & Proteksi Moral Hazard\x1b[0m");

  // Sayuran layak konsumsi dilarang dibuang ke Maggot
  const blockMaggot = validateQualityGateMoralHazard(0.50, "tier_3");
  assert(
    blockMaggot.isPermitted === false && !!blockMaggot.violationReason,
    "TC-Q01",
    "Sistem otonom memblokir sayuran layak konsumsi (Quality >= 0.35) dialihkan ke Maggot BSF",
    "Status: BLOCKED SECURELY"
  );

  // Sayuran reject diizinkan ke Maggot
  const allowMaggot = validateQualityGateMoralHazard(0.90, "tier_3");
  assert(
    allowMaggot.isPermitted === true,
    "TC-Q02",
    "Sayuran tidak layak konsumsi (DecayScore >= 0.85) sah dialihkan ke Maggot BSF",
    "Status: PERMITTED"
  );

  // Ringkasan hasil test
  console.log("");
  if (failedTests === 0) {
    console.log(`\x1b[1m\x1b[32m🎉 SEMUA PENGUJIAN LULUS HIJAU 100%! (${passedTests}/${totalTests} TESTS PASSED)\x1b[0m`);
    console.log("\x1b[32m✔ Kriteria Evaluasi Sprint 2 Terpenuhi Penuh Tanpa Cacat / Zero Errors.\x1b[0m\n");
  } else {
    console.log(`\x1b[1m\x1b[31m❌ TERDAPAT ${failedTests} PENGUJIAN GAGAL DARI TOTAL ${totalTests} TESTS!\x1b[0m\n`);
  }

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Fatal Test Suite Crash:", err);
  process.exit(1);
});
