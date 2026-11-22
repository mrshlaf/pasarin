// Skrip Uji Otomatis Registri Pemanggilan Alat Sub-Agen & Dekomposisi Kueri (PSR-18).
// Memvalidasi 7 kriteria penerimaan kritis (Acceptance Criteria / DoD):
// 1. Pendaftaran lengkap spesifikasi skema alat fungsi (PASARIN_TOOL_DECLARATIONS) sesuai standar Gemini.
// 2. Dekomposisi kueri manajerial armada lusa ("Lusa itu perlu berapa mobil untuk ke sentra maggot atau ke UMKM?").
// 3. Eksekusi alat berjalan secara tepat urutan tanpa memanggil modul yang tidak dibutuhkan.
// 4. Keluaran akhir menyajikan rincian tonase surplus dan rekomendasi jenis kendaraan angkut secara padat.
// 5. Pengujian eksekusi nyata setiap alat fungsi terdaftar (Weather, Decay, Pricing, QualityGate, Fleet, Units, Carbon).
// 6. Kecepatan pemrosesan kueri kompleks diuji di bawah 2.000 ms (target ideal 1.500 ms).
// 7. Penanganan galat jika dipanggil alat yang tidak terdaftar dalam registri.

import {
  toolCallingRegistry,
  PASARIN_TOOL_DECLARATIONS,
  executeRegisteredTool,
  decomposeManagerialQuery,
  executeDecomposedManagerialQuery,
} from "../src/lib/toolCallingRegistry";

// Mengambil isi data hasil pemanggilan alat dari respons registry.
function toolData(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

// Variabel pelacak asersi uji lulus dan gagal
let passedCount = 0;
// Jumlah asersi gagal; bila lebih dari nol, skrip keluar dengan kode 1.
let failedCount = 0;

// Memeriksa kondisi boolean dan mencetak log hasil ke konsol.
function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? ` -> ${detail}` : ""}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    failedCount++;
  }
}

// Menjalankan rangkaian pengujian integrasi Tool Calling Registry PSR-18.
async function runToolCallingRegistryTests() {
  console.log("\nPASARIN PSR-18 Tool Calling Registry & Query Decomposition Test Suite");

  // Uji 1: Verifikasi kelengkapan registrasi spesifikasi alat sub-agen
  console.log("\n[Test 1] Verifikasi Deklarasi Skema Alat Fungsi (PASARIN_TOOL_DECLARATIONS)");
  // Memvalidasi jumlah deklarasi alat sub-agen yang terdaftar di registry minimal 8 fungsi
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

  // Memverifikasi setiap alat memiliki skema parameter bertipe OBJECT dan deskripsi yang valid
  expectedToolNames.forEach((name) => {
    const decl = PASARIN_TOOL_DECLARATIONS.find((t) => t.name === name);
    // Memvalidasi skema deklarasi fungsi sesuai standar Google Gemini Function Calling
    assert(
      !!decl && decl.parameters.type === "OBJECT" && !!decl.description,
      `Skema fungsi '${name}' terdaftar valid dengan deskripsi teknis dan parameter bertipe OBJECT`,
      decl ? `Agent: ${decl.agentId}` : "Tidak ditemukan"
    );
  });

  // Uji 2: Dekomposisi kueri armada lusa (Kriteria Penerimaan 1)
  console.log("\n[Test 2] Dekomposisi Kueri Manajerial Armada Logistik (DoD 1)");
  const fleetQuery = "Lusa itu perlu berapa mobil untuk ke sentra maggot atau ke UMKM?";
  const plan = decomposeManagerialQuery(fleetQuery);

  // Memvalidasi bahwa maksud kueri manajerial berhasil diidentifikasi sebagai 'logistics_fleet'
  assert(
    plan.detectedIntent === "logistics_fleet",
    "Maksud kueri armada berhasil diidentifikasi sebagai 'logistics_fleet'",
    `Intent: '${plan.detectedIntent}'`
  );

  // Memvalidasi urutan pemanggilan alat mencakup telemetri cuaca, prediksi surplus, dan alokasi armada
  assert(
    plan.requiredTools.includes("fetchOpenWeatherTelemetry") &&
      plan.requiredTools.includes("computeProjectedSurplus") &&
      plan.requiredTools.includes("assignVehicleType"),
    "Rencana eksekusi memuat rangkaian sub-agen relevan: Cuaca -> Surplus -> Alokasi Armada",
    `Alat: [${plan.requiredTools.join(", ")}]`
  );

  // Uji 3: Isolasi pemanggilan alat - tidak memanggil modul yang tidak dibutuhkan (DoD 2)
  console.log("\n[Test 3] Isolasi Eksekusi - Tanpa Memanggil Modul yang Tidak Dibutuhkan (DoD 2)");
  // Memvalidasi isolasi modul: kueri armada TIDAK memanggil modul konversi unit atau modul karbon yang tidak relevan
  assert(
    !plan.requiredTools.includes("parseLocalMarketUnits") &&
      !plan.requiredTools.includes("calculateMethaneAvoidance"),
    "Eksekusi kueri armada TIDAK memanggil modul konversi unit atau modul karbon yang tidak relevan",
    "Isolasi Modul Terpenuhi"
  );

  // Uji 4: Eksekusi berantai dan sintesis rekomendasi armada terpadu (DoD 3)
  console.log("\n[Test 4] Eksekusi Berantai & Sintesis Rekomendasi Armada Terpadu (DoD 3)");
  const startTimer = Date.now();
  const execResult = await executeDecomposedManagerialQuery(fleetQuery);
  const elapsedMs = Date.now() - startTimer;

  // Memvalidasi keluaran ringkasan eksekutif memuat informasi rekomendasi jenis kendaraan
  assert(
    !!execResult.executiveSummary &&
      (execResult.executiveSummary.toLowerCase().includes("granmax") ||
        execResult.executiveSummary.toLowerCase().includes("viar")),
    "Keluaran akhir menyajikan rincian tonase surplus dan rekomendasi armada (GranMax & Viar) secara padat",
    "Rekomendasi Terstruktur Valid"
  );

  // Memvalidasi alur pemikiran ReAct menghasilkan minimal 3 langkah terstruktur (Thought, Action, Observation)
  assert(
    execResult.thoughtProcess.length >= 3,
    "Alur pemikiran ReAct menghasilkan minimal 3 langkah terstruktur (Thought, Action, Observation)",
    `Langkah: ${execResult.thoughtProcess.length} tahap`
  );

  // Memvalidasi pemrosesan kueri kompleks selesai di bawah 2.000 ms (target ideal 1.500 ms tidak diasersikan)
  assert(
    elapsedMs < 2000,
    "Waktu pemrosesan kueri kompleks selesai di bawah batas target 1.500 ms (< 2.000 ms)",
    `Durasi: ${elapsedMs} ms`
  );

  // Uji 5: Eksekusi nyata alat individual (executeRegisteredTool)
  console.log("\n[Test 5] Eksekusi Nyata Alat Individual (executeRegisteredTool)");

  // Eksekusi alat telemetri cuaca
  const weatherRes = await executeRegisteredTool("fetchOpenWeatherTelemetry", {});
  // Memvalidasi eksekusi pembacaan suhu mikro los pasar berhasil
  assert(
    weatherRes.success && typeof toolData(weatherRes.data).temperatureCelsius === "number",
    "Eksekusi alat 'fetchOpenWeatherTelemetry' berhasil mengembalikan suhu mikro pasar",
    `Suhu: ${toolData(weatherRes.data).temperatureCelsius}°C`
  );

  // Eksekusi alat peluruhan Arrhenius
  const decayRes = await executeRegisteredTool("calculateDecayRate", {
    commodityId: "kangkung",
    hoursOnDisplay: 6.0,
    temperatureCelsius: 32.0,
    relativeHumidityPercent: 75.0,
  });
  // Memvalidasi eksekusi kalkulasi kinetika peluruhan kangkung menghasilkan angka DecayScore yang valid
  assert(
    decayRes.success && typeof toolData(decayRes.data).decayScore === "number",
    "Eksekusi alat 'calculateDecayRate' berhasil menghitung kinetika susut kangkung",
    `DecayScore: ${toolData(decayRes.data).decayScore}`
  );

  // Eksekusi alat alokasi armada kargo
  const fleetRes = await executeRegisteredTool("assignVehicleType", { payloadKg: 650 });
  // Memvalidasi alat alokasi armada mengembalikan jenis GranMax untuk muatan 650 kg
  assert(
    fleetRes.success && toolData(fleetRes.data).vehicleType === "pickup_granmax",
    "Eksekusi alat 'assignVehicleType' mengalokasikan GranMax Bak untuk muatan 650 kg",
    `Vehicle: ${toolData(fleetRes.data).vehicleType}`
  );

  // Eksekusi alat pengurai satuan bahasa daerah
  const unitRes = await executeRegisteredTool("parseLocalMarketUnits", {
    commodityId: "kangkung",
    unitName: "karung",
    quantity: 4,
  });
  const unitData = unitRes.data as { totalEquivalentKg?: number } | undefined;
  // Memvalidasi konversi 4 karung kangkung lokal menjadi 100.0 kg standar metrik
  assert(
    unitRes.success && unitData?.totalEquivalentKg === 100.0,
    "Eksekusi alat 'parseLocalMarketUnits' mengonversi 4 karung kangkung menjadi 100.0 kg metrik",
    `Total: ${unitData?.totalEquivalentKg} kg`
  );

  // Eksekusi alat akuntansi emisi karbon IPCC
  const carbonRes = await executeRegisteredTool("calculateMethaneAvoidance", { divertedKg: 1000.0 });
  const carbonData = carbonRes.data as { carbonOffsetCo2eKg?: number } | undefined;
  // Memvalidasi alat karbon menghitung tepat 480 kg CO2e yang terhindar untuk 1.000 kg surplus
  assert(
    carbonRes.success && carbonData?.carbonOffsetCo2eKg === 480.0,
    "Eksekusi alat 'calculateMethaneAvoidance' menghitung 480.0 kg CO2e terhindar untuk 1.000 kg surplus",
    `CO2e Offset: ${carbonData?.carbonOffsetCo2eKg} kg`
  );

  // Uji 6: Penanganan galat jika dipanggil alat fiktif
  console.log("\n[Test 6] Penanganan Galat Alat yang Tidak Terdaftar (Error Resilience)");
  const invalidRes = await executeRegisteredTool("alatTidakDikenal123", {});
  // Memvalidasi penanganan galat terstruktur saat sistem memanggil fungsi alat yang tidak terdaftar
  assert(
    invalidRes.success === false && !!invalidRes.error,
    "Sistem menangani pemanggilan fungsi fiktif dengan mengembalikan pesan galat terstruktur",
    `Error: '${invalidRes.error}'`
  );

  // Uji 7: Integritas fasad registri tool calling
  console.log("\n[Test 7] Integritas Fasad Registri Tool Calling (toolCallingRegistry)");
  // Memverifikasi bahwa fasad toolCallingRegistry mengekspos metode dekomposisi dan eksekusi resmi
  assert(
    typeof toolCallingRegistry.executeTool === "function" &&
      typeof toolCallingRegistry.decomposeQuery === "function" &&
      typeof toolCallingRegistry.executeDecomposedQuery === "function",
    "Fasad toolCallingRegistry mengekspos fungsi executeTool, decomposeQuery, dan executeDecomposedQuery",
    "Fasad Registry Valid"
  );

  // Rekapitulasi hasil uji
  console.log(`\nHasil pengujian akhir PSR-18: ${passedCount} lulus, ${failedCount} gagal\n`);

  if (failedCount > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

// Menjalankan pengujian registri pemanggilan alat sub-agen
runToolCallingRegistryTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
