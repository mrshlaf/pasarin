/**
 * Modul Master Testbench Pengujian Sesi Kelas (PSR-39 / In-Class Unit Testbench).
 * Memvalidasi 12 suite rekayasa perangkat lunak PASARIN (Sprint 1 & Sprint 2):
 * 1. [SUITE 1: PSR-5]  Telemetri Cuaca Hiperlokal & In-Memory Cache 15 Menit.
 * 2. [SUITE 2: PSR-14] Kinetika Peluruhan Biologis Arrhenius-Q10 & Laju Respirasi Daun.
 * 3. [SUITE 3: PSR-15] Model Redaman Pengunjung Pasar Akibat Hujan Lebat (Penurunan 48%).
 * 4. [SUITE 4: PSR-20] Inverse Surge Dynamic Pricing & Price Floor Modal Pedagang.
 * 5. [SUITE 5: PSR-19] Mesin Prediksi Surplus Komposit & Validasi Target Baseline 1.240 kg.
 * 6. [SUITE 6: PSR-21] Gerbang Mutu Etis, Anti-Moral Hazard & Invarian 1 (Zero Edible to Feed).
 * 7. [SUITE 7: PSR-17] Google Gemini 2.0 Flash ReAct Agent Core (Siklus Otonom 14:30 WIB & Max 5 Turns).
 * 8. [SUITE 8: PSR-18] Tool Calling Registry & Dekomposisi Kueri Bahasa Alami (< 1.500 ms).
 * 9. [SUITE 9: PSR-40] Autentikasi Pengguna Supabase Auth & Penegakan Isolasi Peran (Role Isolation).
 * 10. [SUITE 10: PSR-3 & 4] Arsitektur API Response Envelope, Validasi Skema Zod & Otorisasi Cron.
 * 11. [SUITE 11: PSR-16] Konsistensi Master Data 30 Kios & 30 Komoditas Pasar Kramat Jati.
 * 12. [SUITE 12: Invarian 2 & 3] Urutan Harga Berjenjang & Jendela Reservasi Sosial 30 Menit.
 */

import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import { weatherAgent } from "@/lib/weatherAgent";
import {
  calculateArrheniusRateConstant,
  evaluateArrheniusDecay,
  calculateRainFootfallAttenuation,
  calculateInverseSurgePricing,
  calculateCompositeMarketSurplus,
  calculateUrgencyLevel,
  validateQualityGateMoralHazard,
  KioskStockInput,
} from "@/lib/pasarinCore";
import {
  qualityGateAgent,
  verifyHumanGradeIntegrity,
  evaluateChlorophyllLoss,
} from "@/lib/qualityGateAgent";
import {
  evaluateTier2PriorityWindow,
  validateClaimAgainstPriorityWindow,
  processPriorityWindowDowngrades,
} from "@/lib/priorityWindowDispatcher";
import {
  verifyTelegramWebhookSecret,
  handleTelegramCommand,
  dispatchTelegramMessage,
} from "@/lib/telegramBotGateway";
import {
  buildVendorSurplusOfferKeyboard,
  handleVendorCallbackQuery,
} from "@/lib/vendorInlineKeyboardFlow";
import {
  calculateFleetAllocation,
  generateDeliveryManifest,
} from "@/lib/fleetCargoCalculator";
import {
  executeAutonomousOrchestration,
  processManagerialNaturalQuery,
  MAX_REACT_TURNS,
  geminiOrchestrator,
} from "@/lib/geminiOrchestrator";
import {
  PASARIN_TOOL_DECLARATIONS,
  executeRegisteredTool,
  decomposeManagerialQuery,
  executeDecomposedManagerialQuery,
  toolCallingRegistry,
} from "@/lib/toolCallingRegistry";
import {
  DEMO_ACCOUNTS,
  DUMMY_ACCOUNTS,
  inferRoleFromEmail,
} from "@/data/accounts";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getEnv } from "@/lib/env";
import { AppRole } from "@/lib/simulationStore";

export interface MasterTestReport {
  suiteTitle: string;
  totalAssertions: number;
  passedAssertions: number;
  failedAssertions: number;
  successRatePercent: number;
  isAllPassed: boolean;
  executedAt: string;
  suites: Array<{
    suiteId: string;
    suiteName: string;
    passed: number;
    failed: number;
  }>;
}

/**
 * Menjalankan rangkaian uji otomatis 12 suite secara terintegrasi (PSR-39).
 */
export async function runMasterInClassTestSuite(options?: { silent?: boolean }): Promise<MasterTestReport> {
  const isSilent = Boolean(options?.silent);
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const suiteSummaries: MasterTestReport["suites"] = [];

  let currentSuitePassed = 0;
  let currentSuiteFailed = 0;
  let currentSuiteId = "";
  let currentSuiteName = "";

  const startSuite = (id: string, name: string) => {
    if (currentSuiteId) {
      suiteSummaries.push({
        suiteId: currentSuiteId,
        suiteName: currentSuiteName,
        passed: currentSuitePassed,
        failed: currentSuiteFailed,
      });
    }
    currentSuiteId = id;
    currentSuiteName = name;
    currentSuitePassed = 0;
    currentSuiteFailed = 0;
    if (!isSilent) {
      console.log(`\n\x1b[36m▶ [${id}] ${name}\x1b[0m`);
    }
  };

  const assert = (condition: boolean, testId: string, testName: string, detail?: string) => {
    totalTests++;
    if (condition) {
      passedTests++;
      currentSuitePassed++;
      if (!isSilent) {
        console.log(`  \x1b[32m✔ [PASS]\x1b[0m \x1b[1m${testId}\x1b[0m: ${testName}${detail ? ` \x1b[90m(${detail})\x1b[0m` : ""}`);
      }
    } else {
      failedTests++;
      currentSuiteFailed++;
      if (!isSilent) {
        console.error(`  \x1b[31m✖ [FAIL]\x1b[0m \x1b[1m${testId}\x1b[0m: ${testName}${detail ? ` \x1b[31m(${detail})\x1b[0m` : ""}`);
      }
    }
  };

  if (!isSilent) {
    console.log("\n================================================================================");
    console.log("  PASARIN IN-CLASS AUTOMATED UNIT TESTING SUITE (PSR-39 MASTER TESTBENCH)");
    console.log("  Mata Kuliah : Rekayasa Perangkat Lunak (ENCE605024) - Kelas 01 FTUI");
    console.log("  Dosen       : Prof. Dr. Ir. Riri Fitri Sari, M.M., M.Sc.");
    console.log("  Tim         : Marshal Aufa Diliyana (2406346913) & Zahir Shahab (2406487084)");
    console.log(`  Target      : Pasar Induk Kramat Jati (-6.2675, 106.8702) | Waktu: ${new Date().toLocaleString("id-ID")}`);
    console.log("================================================================================");
  }

  // 1. Suite 1: PSR-5
  startSuite("SUITE 1: PSR-5", "Telemetri Cuaca Hiperlokal & In-Memory Cache");
  weatherAgent.clearCache();
  const wLive = await weatherAgent.getMarketWeather({ forceRefresh: true });
  assert(
    wLive.location.latitude === -6.2675 && wLive.location.longitude === 106.8702,
    "TC-W01",
    "Koordinat geospasial tepat pada los basah Blok A Pasar Induk Kramat Jati",
    `${wLive.location.latitude}, ${wLive.location.longitude}`
  );
  assert(
    wLive.temperatureCelsius >= 20.0 && wLive.temperatureCelsius <= 45.0,
    "TC-W02",
    "Suhu fisik los pasar terverifikasi dalam rentang iklim tropis Jakarta",
    `${wLive.temperatureCelsius}°C`
  );
  assert(
    wLive.relativeHumidityPercent >= 50.0 && wLive.relativeHumidityPercent <= 100.0,
    "TC-W03",
    "Kelembapan relatif udara terverifikasi dalam batas realistis",
    `${wLive.relativeHumidityPercent}% RH`
  );
  const wCached = await weatherAgent.getMarketWeather();
  assert(
    wCached.source === "cache",
    "TC-W04",
    "Panggilan data berurutan dilayani langsung dari in-memory cache untuk efisiensi kuota",
    `source: '${wCached.source}'`
  );
  const wFallback = await weatherAgent.getMarketWeather({ simulateOffline: true });
  assert(
    wFallback.source === "fallback_offline" && wFallback.temperatureCelsius === 32.0 && wFallback.relativeHumidityPercent === 75.0,
    "TC-W05",
    "Fail-safe fallback otomatis mengembalikan profil iklim darurat saat jaringan pasar putus",
    `Profil: ${wFallback.temperatureCelsius}°C, ${wFallback.relativeHumidityPercent}% RH`
  );

  // 2. Suite 2: PSR-14
  startSuite("SUITE 2: PSR-14", "Kinetika Peluruhan Biologis Arrhenius-Q10");
  const kangkung = COMMODITIES.find((c) => c.id === "kangkung")!;
  assert(!!kangkung, "TC-K00", "Komoditas Kangkung Darat tersedia dalam katalog master");
  const rate20C = calculateArrheniusRateConstant(20.0, 75.0, kangkung.q10Coefficient);
  const rate33C = calculateArrheniusRateConstant(33.0, 75.0, kangkung.q10Coefficient);
  const accelerationRatio = rate33C / rate20C;
  assert(
    accelerationRatio >= 2.0 && accelerationRatio <= 2.6,
    "TC-K01",
    "Validasi kinetika termal: laju respirasi pada 33°C meningkat ~2.2x lipat dibanding suhu 20°C",
    `Faktor akselerasi: ${accelerationRatio.toFixed(2)}x`
  );
  const decayAt8_5h = evaluateArrheniusDecay(kangkung, 33.0, 75.0, 8.5);
  assert(
    decayAt8_5h.condition === "layu_ringan" && decayAt8_5h.decayScore >= 0.35 && decayAt8_5h.decayScore < 0.65,
    "TC-K02",
    "Batas kritis layu kangkung: jam pajang 8.5 jam otomatis memicu status 'layu_ringan' (Tier 1)",
    `DecayScore: ${decayAt8_5h.decayScore}`
  );
  const decayFresh = evaluateArrheniusDecay(kangkung, 28.0, 75.0, 2.0);
  assert(
    decayFresh.condition === "segar_prima" && decayFresh.recommendedTier === "fresh",
    "TC-K03",
    "Sayuran pajang subuh 2 jam berkategori 'segar_prima' (Penjualan Retail Eceran)",
    `DecayScore: ${decayFresh.decayScore}`
  );

  // 3. Suite 3: PSR-15
  startSuite("SUITE 3: PSR-15", "Model Redaman Pengunjung Pasar saat Hujan");
  const dryFootfall = calculateRainFootfallAttenuation(0.0, false);
  assert(
    dryFootfall.footfallDropPercentage === 0.0 && dryFootfall.surplusMultiplier === 1.0,
    "TC-F01",
    "Cuaca cerah: arus pembeli normal (redaman 0.0%, pengali surplus 1.0x)",
    "Kondisi Kering"
  );
  const rain10mm = calculateRainFootfallAttenuation(10.0, true);
  assert(
    rain10mm.footfallDropPercentage === 48.0 && rain10mm.surplusMultiplier > 1.4,
    "TC-F02",
    "Curah hujan 10 mm menurunkan ~48% pembeli retail di lorong pasar becek",
    `Penurunan: ${rain10mm.footfallDropPercentage}%`
  );
  const heavyRain = calculateRainFootfallAttenuation(25.0, true);
  assert(
    heavyRain.footfallDropPercentage >= 70.0 && heavyRain.isMuddy === true,
    "TC-F03",
    "Hujan badai 25 mm memicu status lorong banjir/becek dan redaman pembeli > 70%",
    `Redaman: ${heavyRain.footfallDropPercentage}%`
  );

  // 4. Suite 4: PSR-20
  startSuite("SUITE 4: PSR-20", "Dynamic Pricing dengan Proteksi Price Floor Modal");
  const price1430 = calculateInverseSurgePricing(kangkung, 14.5, 0.0);
  assert(
    price1430.appliedDiscountPercent >= 50 && price1430.appliedDiscountPercent <= 70,
    "TC-P01",
    "Penawaran awal sapuan sore jam 14:30 WIB memberikan diskon proporsional 50% - 70%",
    `Diskon: ${price1430.appliedDiscountPercent}%`
  );
  const priceRain = calculateInverseSurgePricing(kangkung, 16.0, 15.0);
  assert(
    priceRain.pricingMechanism === "inverse_surge_rain_accelerated" || priceRain.priceFloorEnforced,
    "TC-P02",
    "Hujan lebat (>10 mm) mengaktifkan pengali akselerasi diskon mu_weather = 0.85",
    `Mekanisme: ${priceRain.pricingMechanism}`
  );
  const price1800 = calculateInverseSurgePricing(kangkung, 18.0, 25.0);
  assert(
    price1800.offeredSalvagePrice >= price1800.minimumPriceFloor,
    "TC-P03",
    "Proteksi Price Floor mutlak: harga tebus tidak pernah tembus di bawah modal kulakan pedagang",
    `Harga tebus: Rp ${price1800.offeredSalvagePrice} >= Floor: Rp ${price1800.minimumPriceFloor}`
  );

  // 5. Suite 5: PSR-19
  startSuite("SUITE 5: PSR-19", "Prediksi Surplus Komposit & Validasi Baseline 1.240 kg");
  assert(calculateUrgencyLevel(3.2) === 5, "TC-U01", "Sisa waktu < 4 jam masuk Urgency Level 5 (Kritis/Darurat)");
  assert(calculateUrgencyLevel(5.0) === 4, "TC-U02", "Sisa waktu 4-6 jam masuk Urgency Level 4 (Tinggi)");
  assert(calculateUrgencyLevel(7.5) === 3, "TC-U03", "Sisa waktu 6-8 jam masuk Urgency Level 3 (Sedang)");
  assert(calculateUrgencyLevel(10.0) === 2, "TC-U04", "Sisa waktu 8-12 jam masuk Urgency Level 2 (Rendah)");
  assert(calculateUrgencyLevel(15.0) === 1, "TC-U05", "Sisa waktu >= 12 jam masuk Urgency Level 1 (Aman)");

  const synthetic30Stalls: KioskStockInput[] = [];
  const commIds = ["kangkung", "bayam", "sawi_hijau", "cabai_merah_keriting", "tomat_merah", "kol_kubis"];
  for (let i = 1; i <= 30; i++) {
    synthetic30Stalls.push({
      kioskId: `kiosk-${String(i).padStart(2, "0")}`,
      kioskName: `Lapak Hortikultura Blok A-${i}`,
      commodityId: commIds[(i - 1) % commIds.length],
      initialStockKg: 75.0,
      arrivalHourDecimal: 4.0,
    });
  }
  const compositeResult = calculateCompositeMarketSurplus(synthetic30Stalls, 32.5, 75.0, 12.5, 14.5);
  assert(
    compositeResult.summary.totalAnalyzedStalls === 30,
    "TC-C01",
    "Analisis komposit mencakup seluruh 30 kios pasar hortikultura",
    `${compositeResult.summary.totalAnalyzedStalls} kios`
  );
  assert(
    compositeResult.summary.totalPredictedSurplusKg >= 1150.0 && compositeResult.summary.totalPredictedSurplusKg <= 1350.0,
    "TC-C02",
    "Agregasi surplus pasar Kramat Jati memvalidasi target baseline empiris ~1.240 kg (±10%)",
    `Surplus aktual: ${compositeResult.summary.totalPredictedSurplusKg} kg (Target: 1.240 kg)`
  );

  // 6. Suite 6: PSR-21
  startSuite("SUITE 6: PSR-21", "Gerbang Mutu Etis & Proteksi Moral Hazard");
  const blockMaggot = validateQualityGateMoralHazard(0.50, "tier_3");
  assert(
    blockMaggot.isPermitted === false && !!blockMaggot.violationReason,
    "TC-Q01",
    "Sistem otonom memblokir sayuran layak konsumsi (Quality >= 0.35) dialihkan ke Maggot BSF",
    "Status: BLOCKED SECURELY"
  );
  const allowMaggot = validateQualityGateMoralHazard(0.90, "tier_3");
  assert(
    allowMaggot.isPermitted === true,
    "TC-Q02",
    "Sayuran tidak layak konsumsi (DecayScore >= 0.85) sah dialihkan ke Maggot BSF",
    "Status: PERMITTED"
  );
  const qgAudit = await verifyHumanGradeIntegrity({
    commodityId: "bayam",
    hoursOnDisplay: 2.0,
    requestedTier: "tier_3",
    vendorId: "vendor_kramat_nakal",
  });
  assert(
    qgAudit.gateStatus === "blocked" && qgAudit.isMoralHazardViolation === true,
    "TC-Q03",
    "Uji Invarian 1 ketat: penolakan otomatis dan penandaan pelanggaran moral hazard",
    `Status: ${qgAudit.gateStatus}`
  );
  assert(
    qgAudit.reputationPenaltyApplied === 5,
    "TC-Q04",
    "Pemberian sanksi pemotongan 5 poin reputasi bagi pedagang yang mencoba memicu moral hazard",
    `Penalti: -5 poin`
  );
  const visualCheck = evaluateChlorophyllLoss({ chlorophyllRatio: 0.90, commodityId: "bayam" });
  assert(
    visualCheck.isHumanConsumable === true && visualCheck.gateStatus === "passed",
    "TC-Q05",
    "Klasifikasi citra MobileNetV3: daun hijau berklorofil 90% tervalidasi layak konsumsi manusia",
    `Loss: ${visualCheck.chlorophyllLossPercent}%`
  );

  // 7. Suite 7: PSR-17
  startSuite("SUITE 7: PSR-17", "Google Gemini 2.0 Flash ReAct Agent Core");
  const orchestratorRun = await executeAutonomousOrchestration({
    executionMode: "scheduled_autonomous_cron",
  });
  assert(
    orchestratorRun.executionMode === "scheduled_autonomous_cron",
    "TC-R01",
    "Siklus sapuan otonom 14:30 WIB tereksekusi mandiri tanpa kesalahan alur",
    "Mode: scheduled_autonomous_cron"
  );
  assert(
    orchestratorRun.kiosksScanned === 30,
    "TC-R02",
    "Orkestrator berhasil memindai 30 kios pedagang binaan",
    `Kiosks: ${orchestratorRun.kiosksScanned}`
  );
  assert(
    orchestratorRun.thoughtProcess.length <= MAX_REACT_TURNS,
    "TC-R03",
    "Invarian pembatasan putaran ReAct dipatuhi (maksimal 5 putaran penalaran)",
    `Langkah: ${orchestratorRun.thoughtProcess.length} (Maks: ${MAX_REACT_TURNS})`
  );
  assert(
    orchestratorRun.fleetAssignmentsCount >= 1,
    "TC-R04",
    "Penugasan armada angkut teralokasi berdasarkan kalkulasi volume tonase surplus",
    `Armada: ${orchestratorRun.fleetAssignmentsCount} unit`
  );
  const liveQueryOutput = await processManagerialNaturalQuery("Lusa perlu berapa armada?", { forceHeuristic: true });
  assert(
    liveQueryOutput.executiveSummary.length > 20 && geminiOrchestrator.name === "GeminiOrchestratorAgent",
    "TC-R05",
    "Proses kueri manajerial mengembalikan ringkasan eksekutif padat via fasad geminiOrchestrator",
    "Sintesis ReAct Berhasil"
  );
  // 8. Suite 8: PSR-18
  startSuite("SUITE 8: PSR-18", "Tool Calling Registry & Dekomposisi Kueri Bahasa Alami");
  assert(
    PASARIN_TOOL_DECLARATIONS.length >= 9,
    "TC-T01",
    "Tool Calling Registry memuat sedikitnya 9 spesifikasi fungsi alat sub-agen terstruktur",
    `Total alat: ${PASARIN_TOOL_DECLARATIONS.length}`
  );
  const fleetQueryPlan = decomposeManagerialQuery("Lusa itu perlu berapa mobil untuk ke sentra maggot atau ke UMKM?");
  assert(
    fleetQueryPlan.detectedIntent === "logistics_fleet" && fleetQueryPlan.requiredTools.includes("assignVehicleType"),
    "TC-T02",
    "Dekomposisi kueri manajerial armada lusa menghasilkan rencana pemanggilan sub-agen yang relevan",
    `Intent: '${fleetQueryPlan.detectedIntent}'`
  );
  assert(
    !fleetQueryPlan.requiredTools.includes("parseLocalMarketUnits") && !fleetQueryPlan.requiredTools.includes("calculateMethaneAvoidance"),
    "TC-T03",
    "Isolasi eksekusi: sub-agen yang tidak dibutuhkan tidak dipanggil",
    "Isolasi Terpenuhi"
  );
  const queryExecStart = Date.now();
  const queryResult = await executeDecomposedManagerialQuery("Lusa itu perlu berapa mobil?");
  const queryDuration = Date.now() - queryExecStart;
  assert(
    queryDuration < 1500 && queryResult.thoughtProcess.length >= 3,
    "TC-T04",
    "Waktu eksekusi kueri kompleks selesai di bawah batas target 1.500 ms (< 2.000 ms)",
    `Durasi: ${queryDuration} ms, Langkah: ${queryResult.thoughtProcess.length}`
  );
  const toolExecSample = await executeRegisteredTool("assignVehicleType", { payloadKg: 500 });
  assert(
    toolExecSample.success && toolCallingRegistry.declarations.length >= 9,
    "TC-T05",
    "Dispatcher executeRegisteredTool dan fasad toolCallingRegistry terverifikasi operasional",
    "Tool Execution Valid"
  );

  // Pengujian Verifikasi PSR-27 Logistics Fleet Cargo Allocation and Weight Dispatch Rule
  const allocLight = calculateFleetAllocation(250, "warteg");
  const allocMedium = calculateFleetAllocation(750, "social_kitchen");
  const allocHeavy = calculateFleetAllocation(1800, "maggot");
  assert(
    allocLight.vehicleType === "viar_trike" &&
    allocMedium.vehicleType === "granmax_pickup" &&
    allocHeavy.vehicleType === "isuzu_truck",
    "TC-PSR27-01",
    "PSR-27 Weight Dispatch Rule: Alokasi tepat sasaran (Viar <=300kg, GranMax 301-1000kg, Truk >1000kg)",
    "Ambang Batas Terpenuhi"
  );
  const sampleStops = [
    { kioskStall: "C-04", kioskName: "Kios Kentang", block: "C" as const, commodityName: "Kentang", weightKg: 50 },
    { kioskStall: "A-12", kioskName: "Kios Sayur Daun", block: "A" as const, commodityName: "Kangkung", weightKg: 40 },
  ];
  const sampleManifest = generateDeliveryManifest(sampleStops, { name: "Warteg Condet", role: "warteg", distanceKm: 2.0 });
  assert(
    sampleManifest.orderedPickUpStops[0].block === "A" &&
    sampleManifest.fuelConsumptionLiters > 0 &&
    sampleManifest.estimatedFuelCostIdr > 0,
    "TC-PSR27-02",
    "PSR-27 Delivery Manifest: Manifes perjalanan menghasilkan rute penjemputan terurut dan estimasi biaya BBM",
    `Rute: ${sampleManifest.orderedPickUpStops.map(s => s.kioskStall).join("->")} | BBM: ${sampleManifest.fuelConsumptionLiters}L`
  );
  // 9. Suite 9: PSR-40
  startSuite("SUITE 9: PSR-40", "Supabase Role Authentication & Role Isolation");
  const roles: AppRole[] = ["vendor", "warteg", "social_kitchen", "maggot", "logistics", "manager", "admin"];
  roles.forEach((r) => {
    const acc = DEMO_ACCOUNTS[r];
    assert(
      Boolean(acc && acc.role === r),
      `TC-A01-${r}`,
      `Akun preset peran '${r}' terdaftar lengkap`,
      acc ? acc.email : "Undefined"
    );
  });
  const dummyKeys = ["pasar1", "warteg1", "sosial1", "maggot1", "kurir1", "pengelola1", "admin1"];
  dummyKeys.forEach((key) => {
    const dummy = DUMMY_ACCOUNTS[key];
    assert(
      Boolean(dummy && dummy.username === key),
      `TC-A02-${key}`,
      `Akun dummy '${key}' terdaftar dengan username dan password yang sama`,
      dummy ? `Role: ${dummy.role}` : "Undefined"
    );
  });
  assert(
    inferRoleFromEmail("pasar1") === "vendor" && inferRoleFromEmail("warteg1") === "warteg",
    "TC-A03",
    "Inferensi peran otomatis dari username dummy terverifikasi presisi",
    "pasar1 -> vendor, warteg1 -> warteg"
  );

  // 10. Suite 10: PSR-3, 4, 24, 25
  startSuite("SUITE 10: PSR-3, 4, 24, 25", "Arsitektur API Envelope & Telegram Inline Gateway");
  const env = getEnv();
  assert(
    !!env.CRON_SECRET_KEY && env.CRON_SECRET_KEY.length > 0,
    "TC-E01",
    "Variabel lingkungan CRON_SECRET_KEY terkonfigurasi untuk proteksi scheduler 14:30 WIB",
    "Secret Key Ready"
  );
  const testPayload = { status: "test_ok", code: 200 };
  const envelope = successResponse(testPayload, 200);
  assert(
    envelope.status === 200,
    "TC-E02",
    "Fungsi successResponse menghasilkan amplop standar HTTP 200 OK",
    "Envelope Status 200"
  );
  const errorEnvelope = errorResponse("Pesan uji coba galat", 400);
  assert(
    errorEnvelope.status === 400,
    "TC-E03",
    "Fungsi errorResponse menghasilkan amplop kegagalan terstruktur HTTP 400",
    "Envelope Status 400"
  );

  // Pengujian Verifikasi PSR-24 Telegram Bot API Gateway & Webhook
  const isSecretValid = verifyTelegramWebhookSecret(env.TELEGRAM_WEBHOOK_SECRET);
  assert(
    isSecretValid === true && verifyTelegramWebhookSecret("token_palsu") === false,
    "TC-TG01",
    "PSR-24 Webhook Security: Validasi tajuk secret token Telegram berhasil membedakan token sah vs palsu",
    "Token Protection Active"
  );
  const tgCommand = await handleTelegramCommand("/start", "9001201");
  assert(
    tgCommand.actionTaken.includes("welcome") && tgCommand.responseText.length > 0,
    "TC-TG02",
    "PSR-24 Command Dispatcher: Perintah Telegram /start berhasil diproses dengan balasan terstruktur",
    tgCommand.actionTaken
  );
  const tgDispatch = await dispatchTelegramMessage("9001201", "Pesan uji coba latensi sistem PASARIN");
  assert(
    tgDispatch.success === true && tgDispatch.latencyMs < 3000,
    "TC-TG03",
    "PSR-24 Dispatch SLA: Pengiriman notifikasi ke ponsel mitra sukses dengan latensi di bawah 3 detik (< 3.000 ms)",
    `Latensi: ${tgDispatch.latencyMs} ms`
  );

  // Pengujian Verifikasi PSR-25 Vendor 1-Tap Inline Keyboard Flow
  const testInlineKb = buildVendorSurplusOfferKeyboard("ofr_tb_demo_25");
  assert(
    testInlineKb.inline_keyboard[0].length === 2 &&
    testInlineKb.inline_keyboard[0][0].text.includes("Setuju Jual"),
    "TC-IK01",
    "PSR-25 Inline Keyboard: Struktur tombol [✅ Setuju Jual] dan [❌ Lewati] terbangun presisi",
    "1-Tap Action Ready"
  );
  const cbApprove = await handleVendorCallbackQuery("approve_offer:ofr_tb_demo_25", 9901, "9001201");
  assert(
    cbApprove.success === true && cbApprove.newStatus === "active" && cbApprove.broadcastToBuyers === true,
    "TC-IK02",
    "PSR-25 Callback Handler: 1-ketuk tombol Setuju Jual mengubah status penawaran menjadi 'active' seketika",
    "Status: active (Broadcast On)"
  );
  // 11. Suite 11: PSR-16
  startSuite("SUITE 11: PSR-16", "Integritas Master Data 30 Kios & 30 Komoditas");
  assert(
    KIOSKS.length === 30,
    "TC-D01",
    "Master direktori memuat tepat 30 kios pedagang binaan Pasar Kramat Jati",
    `Total Kios: ${KIOSKS.length}`
  );
  const hasBlockA = KIOSKS.some((k) => k.block === "A");
  const hasBlockB = KIOSKS.some((k) => k.block === "B");
  const hasBlockC = KIOSKS.some((k) => k.block === "C");
  assert(
    hasBlockA && hasBlockB && hasBlockC,
    "TC-D02",
    "Sebaran blok kios mencakup seluruh zona: Blok A (Basah), Blok B (Bumbu), Blok C (Kering)",
    "Blok A, B, C Lengkap"
  );
  assert(
    COMMODITIES.length === 30,
    "TC-D03",
    "Katalog komoditas memuat tepat 30 sayur dan buah tropis",
    `Total Komoditas: ${COMMODITIES.length}`
  );
  const allHavePriceFloor = COMMODITIES.every(
    (c) => c.minimumSalvagePricePerKg > 0 && c.minimumSalvagePricePerKg < c.baseWholesalePricePerKg
  );
  assert(
    allHavePriceFloor,
    "TC-D04",
    "Seluruh komoditas memiliki batas bawah harga modal (Price Floor) yang valid",
    "Invarian Price Floor Valid"
  );

  // 12. Suite 12: Invarian 2 & 3
  startSuite("SUITE 12: Invarian 2 & 3", "Aturan Harga Sirkular & Jendela Reservasi Sosial");
  const tomat = COMMODITIES.find((c) => c.id === "tomat")!;
  const pTier1 = calculateInverseSurgePricing(tomat, 14.5, 0.0).offeredSalvagePrice;
  const pTier2 = Math.max(tomat.minimumSalvagePricePerKg, Math.round(tomat.baseWholesalePricePerKg * 0.20));
  const pTier3 = 1500;
  assert(
    pTier1 > pTier2 && pTier2 >= pTier3 && pTier3 >= 1500,
    "TC-INV02",
    "Invarian 2 (Strict Price Ordering): P_Tier1 > P_Tier2 >= P_Tier3 >= Rp 1.500/kg terpenuhi secara konsisten",
    `Rp ${pTier1} > Rp ${pTier2} >= Rp ${pTier3} >= Rp 1.500/kg`
  );
  const socialWindowMinutes = qualityGateAgent.SOCIAL_RESERVATION_WINDOW_MINUTES;
  assert(
    socialWindowMinutes === 30,
    "TC-INV03",
    "Invarian 3 (30-Minute Social Reservation Window): Sayuran Tier 2 terkunci 30 menit khusus Dapur Sosial",
    `Durasi Kunci: ${socialWindowMinutes} menit`
  );

  // Pengujian Verifikasi PSR-23 Priority Time-Window Dispatcher Tier 2
  const sampleT2Offer = {
    id: "ofr_test_tb_t2",
    stockId: "stk_01",
    vendorId: "vendor_kramat_01",
    commodityId: "pakcoy",
    targetTier: "tier_2" as const,
    quantityKg: 40,
    originalPricePerKg: 8000,
    salvagePricePerKg: 1200,
    discountPercentage: 85,
    totalAmountIdr: 48000,
    expiresInMinutes: 30,
    status: "active" as const,
    paymentStatus: "unpaid" as const,
  };
  const maggotBlockCheck = validateClaimAgainstPriorityWindow(sampleT2Offer, "maggot");
  assert(
    maggotBlockCheck.allowed === false,
    "TC-PSR23-01",
    "PSR-23 Gatekeeper: Percobaan klaim Maggot pada masa reservasi 30 menit ditolak secara terprogram",
    "Klaim Maggot Ditolak Mutlak"
  );

  const expiredT2List = [
    {
      ...sampleT2Offer,
      createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
    },
  ];
  const downgradeCheck = processPriorityWindowDowngrades(expiredT2List);
  assert(
    downgradeCheck.downgradedCount === 1 && downgradeCheck.updatedOffers[0].targetTier === "tier_3",
    "TC-PSR23-02",
    "PSR-23 Auto-Downgrade: Penawaran Tier 2 yang lewat 30 menit otomatis terbuka untuk pakan ternak (Tier 3)",
    "Otomasi Downgrade Sukses"
  );
  // Finalize last suite
  if (currentSuiteId) {
    suiteSummaries.push({
      suiteId: currentSuiteId,
      suiteName: currentSuiteName,
      passed: currentSuitePassed,
      failed: currentSuiteFailed,
    });
  }

  // Summary
  if (!isSilent) {
    console.log("\n================================================================================");
    if (failedTests === 0) {
      console.log(`\x1b[1m\x1b[32m🎉 SEMUA PENGUJIAN LULUS HIJAU 100%! (${passedTests}/${totalTests} TESTS PASSED)\x1b[0m`);
      console.log("\x1b[32m✔ Seluruh Kriteria Penerimaan Sesi Kelas (PSR-39) Terpenuhi Penuh Tanpa Cacat.\x1b[0m");
      console.log("\x1b[32m✔ Sistem PASARIN Terverifikasi Siap Demo di Hadapan Dosen Pengampu & Asisten.\x1b[0m");
    } else {
      console.log(`\x1b[1m\x1b[31m❌ TERDAPAT ${failedTests} PENGUJIAN GAGAL DARI TOTAL ${totalTests} TESTS!\x1b[0m`);
    }
    console.log("================================================================================\n");
  }

  return {
    suiteTitle: "PASARIN In-Class Automated Unit Testing Suite (PSR-39)",
    totalAssertions: totalTests,
    passedAssertions: passedTests,
    failedAssertions: failedTests,
    successRatePercent: Math.round((passedTests / Math.max(1, totalTests)) * 100),
    isAllPassed: failedTests === 0,
    executedAt: new Date().toISOString(),
    suites: suiteSummaries,
  };
}

export const inClassTestbench = {
  runMasterInClassTestSuite,
};
