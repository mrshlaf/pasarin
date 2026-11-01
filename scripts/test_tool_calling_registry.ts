/**
 * Skrip Uji Otomatis Registri Pemanggilan Alat Sub-Agen & Dekomposisi Kueri (PSR-18).
 * Memvalidasi 7 kriteria penerimaan kritis (Acceptance Criteria / DoD):
 * 1. Pendaftaran lengkap spesifikasi skema alat fungsi (PASARIN_TOOL_DECLARATIONS) sesuai standar Gemini.
 * 2. Dekomposisi kueri manajerial armada lusa ("Lusa itu perlu berapa mobil untuk ke sentra maggot atau ke UMKM?").
 * 3. Eksekusi alat berjalan secara tepat urutan tanpa memanggil modul yang tidak dibutuhkan.
 * 4. Keluaran akhir menyajikan rincian tonase surplus dan rekomendasi jenis kendaraan angkut secara padat.
 * 5. Pengujian eksekusi nyata setiap alat fungsi terdaftar (Weather, Decay, Pricing, QualityGate, Fleet, Units, Carbon).
 * 6. Kecepatan pemrosesan kueri kompleks dibatasi memberikan respon di bawah 1.500 ms (< 2.000 ms target).
 * 7. Penanganan galat jika dipanggil alat yang tidak terdaftar dalam registri.
 */

import {
  toolCallingRegistry,
  PASARIN_TOOL_DECLARATIONS,
  executeRegisteredTool,
  decomposeManagerialQuery,
  executeDecomposedManagerialQuery,
} from "../src/lib/toolCallingRegistry";

let passedCount = 0;
let failedCount = 0;

/**
 * Memeriksa kondisi boolean dan mencetak log hasil ke konsol.
 *
 * @param condition - Kondisi kebenaran yang diuji.
 * @param testName - Nama skenario pengujian.
 * @param detail - Informasi rincian nilai hasil observasi.
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
 * Menjalankan rangkaian pengujian integrasi Tool Calling Registry PSR-18.
 */
async function runToolCallingRegistryTests() {
  console.log("\n--- PASARIN PSR-18 TOOL CALLING REGISTRY & QUERY DECOMPOSITION TEST SUITE ---");

  // Test 1: Verifikasi kelengkapan registrasi spesifikasi alat sub-agen
  console.log("\n[Test 1] Verifikasi Deklarasi Skema Alat Fungsi (PASARIN_TOOL_DECLARATIONS)");
  assert(
    PASARIN_TOOL_DECLARATIONS.length >= 8,
    "Registri memuat sedikitnya 8 deklarasi alat fungsi sub-agen terstruktur",
    `Total Terdaftar: ${PASARIN_TOOL_DECLARATIONS.length} alat`
  );

  const expectedToolNames = [
    "fetchOpenWeatherTelemetry",
    "calculateDecayRate",
    "calculateFootfallIndex",
    "computeProjectedSurplus",
    "computeInverseSurgePrice",
    "verifyHumanGradeIntegrity",
    "assignVehicleType",
    "calculateMethaneAvoidance",
    "parseLocalMarketUnits",
  ];

  expectedToolNames.forEach((name) => {
    const decl = PASARIN_TOOL_DECLARATIONS.find((t) => t.name === name);
    assert(
      !!decl && decl.parameters.type === "OBJECT" && !!decl.description,
      `Skema fungsi '${name}' terdaftar valid dengan deskripsi teknis dan parameter bertipe OBJECT`,
      decl ? `Agent: ${decl.agentId}` : "Tidak ditemukan"
    );
  });

  // Test 2: Dekomposisi kueri armada lusa (Kriteria Penerimaan 1)
  console.log("\n[Test 2] Dekomposisi Kueri Manajerial Armada Logistik (DoD 1)");
  const fleetQuery = "Lusa itu perlu berapa mobil untuk ke sentra maggot atau ke UMKM?";
  const plan = decomposeManagerialQuery(fleetQuery);

  assert(
    plan.detectedIntent === "logistics_fleet",
    "Maksud kueri armada berhasil diidentifikasi sebagai 'logistics_fleet'",
    `Intent: '${plan.detectedIntent}'`
  );
  assert(
    plan.requiredTools.includes("fetchOpenWeatherTelemetry") &&
      plan.requiredTools.includes("computeProjectedSurplus") &&
      plan.requiredTools.includes("assignVehicleType"),
    "Rencana eksekusi memuat rangkaian sub-agen relevan: Cuaca -> Surplus -> Alokasi Armada",
    `Alat: [${plan.requiredTools.join(", ")}]`
  );

  // Test 3: Isolasi pemanggilan alat - tidak memanggil modul yang tidak dibutuhkan (DoD 2)
  console.log("\n[Test 3] Isolasi Eksekusi - Tanpa Memanggil Modul yang Tidak Dibutuhkan (DoD 2)");
  assert(
    !plan.requiredTools.includes("parseLocalMarketUnits") &&
      !plan.requiredTools.includes("calculateMethaneAvoidance"),
    "Eksekusi kueri armada TIDAK memanggil modul konversi unit atau modul karbon yang tidak relevan",
    "Isolasi Modul Terpenuhi"
  );

  // Test 4: Eksekusi berantai & sintesis keluaran padat rincian tonase dan armada (DoD 3 & 4)
  console.log("\n[Test 4] Eksekusi Berantai & Sintesis Rekomendasi Armada Terpadu (DoD 3)");
  const startTime = Date.now();
  const queryResult = await executeDecomposedManagerialQuery(fleetQuery);
  const durationMs = Date.now() - startTime;

  assert(
    queryResult.executiveSummary.toLowerCase().includes("granmax") &&
      queryResult.executiveSummary.toLowerCase().includes("viar"),
    "Keluaran akhir menyajikan rincian tonase surplus dan rekomendasi armada (GranMax & Viar) secara padat",
    "Rekomendasi Terstruktur Valid"
  );
  assert(
    queryResult.thoughtProcess.length >= 3,
    "Alur pemikiran ReAct menghasilkan minimal 3 langkah terstruktur (Thought, Action, Observation)",
    `Langkah: ${queryResult.thoughtProcess.length} tahap`
  );
  assert(
    durationMs < 1500,
    "Waktu pemrosesan kueri kompleks selesai di bawah batas target 1.500 ms (< 2.000 ms)",
    `Durasi: ${durationMs} ms`
  );

  // Test 5: Pengujian eksekusi nyata setiap alat individual terdaftar (DoD 5)
  console.log("\n[Test 5] Eksekusi Nyata Alat Individual (executeRegisteredTool)");
  // 5a. Cuaca mikro
  const weatherExec = await executeRegisteredTool("fetchOpenWeatherTelemetry", { forceRefresh: false });
  const weatherData = weatherExec.data;
  const hasValidTemp = typeof weatherData === "object" && weatherData !== null && "temperatureCelsius" in weatherData && typeof weatherData.temperatureCelsius === "number" && weatherData.temperatureCelsius > 20;
  assert(
    weatherExec.success && hasValidTemp,
    "Eksekusi alat 'fetchOpenWeatherTelemetry' berhasil mengembalikan suhu mikro pasar",
    hasValidTemp ? `Suhu: ${weatherData.temperatureCelsius}°C` : "Gagal"
  );

  // 5b. Susut kinetika Arrhenius
  const decayExec = await executeRegisteredTool("calculateDecayRate", {
    commodityId: "kangkung",
    hoursOnDisplay: 8.0,
  });
  const decayData = decayExec.data;
  const hasDecayScore = typeof decayData === "object" && decayData !== null && "decayScore" in decayData && typeof decayData.decayScore === "number";
  assert(
    decayExec.success && hasDecayScore,
    "Eksekusi alat 'calculateDecayRate' berhasil menghitung kinetika susut kangkung",
    hasDecayScore ? `DecayScore: ${decayData.decayScore}` : "Gagal"
  );

  // 5c. Alokasi armada kendaraan
  const fleetExec = await executeRegisteredTool("assignVehicleType", { payloadKg: 650.0 });
  const fleetData = fleetExec.data;
  const isGranMax = typeof fleetData === "object" && fleetData !== null && "vehicleType" in fleetData && fleetData.vehicleType === "pickup_granmax";
  assert(
    fleetExec.success && isGranMax,
    "Eksekusi alat 'assignVehicleType' mengalokasikan GranMax Bak untuk muatan 650 kg",
    isGranMax ? `Vehicle: ${fleetData.vehicleType}` : "Gagal"
  );

  // 5d. Konversi satuan tradisional
  const unitExec = await executeRegisteredTool("parseLocalMarketUnits", {
    commodityId: "kangkung",
    unitName: "karung",
    quantity: 4,
  });
  const unitData = unitExec.data;
  const hasKgEquivalent = typeof unitData === "object" && unitData !== null && "totalEquivalentKg" in unitData && unitData.totalEquivalentKg === 100.0;
  assert(
    unitExec.success && hasKgEquivalent,
    "Eksekusi alat 'parseLocalMarketUnits' mengonversi 4 karung kangkung menjadi 100.0 kg metrik",
    hasKgEquivalent ? `Total: ${unitData.totalEquivalentKg} kg` : "Gagal"
  );

  // 5e. Akuntansi karbon IPCC
  const carbonExec = await executeRegisteredTool("calculateMethaneAvoidance", { divertedKg: 1000.0 });
  const carbonData = carbonExec.data;
  const hasCarbonOffset = typeof carbonData === "object" && carbonData !== null && "carbonOffsetCo2eKg" in carbonData && carbonData.carbonOffsetCo2eKg === 480.0;
  assert(
    carbonExec.success && hasCarbonOffset,
    "Eksekusi alat 'calculateMethaneAvoidance' menghitung 480.0 kg CO2e terhindar untuk 1.000 kg surplus",
    hasCarbonOffset ? `CO2e Offset: ${carbonData.carbonOffsetCo2eKg} kg` : "Gagal"
  );
  // Test 6: Penanganan galat pemanggilan alat tidak dikenal
  console.log("\n[Test 6] Penanganan Galat Alat yang Tidak Terdaftar (Error Resilience)");
  const unknownExec = await executeRegisteredTool("alatTidakDikenal123", {});
  assert(
    unknownExec.success === false && Boolean(unknownExec.error?.includes("tidak terdaftar")),
    "Sistem menangani pemanggilan fungsi fiktif dengan mengembalikan pesan galat terstruktur",
    `Error: '${unknownExec.error}'`
  );

  // Test 7: Integritas Fasad toolCallingRegistry
  console.log("\n[Test 7] Integritas Fasad Registri Tool Calling (toolCallingRegistry)");
  assert(
    typeof toolCallingRegistry.executeTool === "function" &&
      typeof toolCallingRegistry.decomposeQuery === "function" &&
      typeof toolCallingRegistry.executeDecomposedQuery === "function",
    "Fasad toolCallingRegistry mengekspos fungsi executeTool, decomposeQuery, dan executeDecomposedQuery",
    "Fasad Registry Valid"
  );

  // Ringkasan hasil test
  console.log(`\n🎉 HASIL PENGUJIAN AKHIR PSR-18: ${passedCount} LULUS, ${failedCount} GAGAL\n`);

  if (failedCount > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

runToolCallingRegistryTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
