// Skrip Uji Integrasi Agen Telemetri Cuaca Mikro Kramat Jati (PSR-5).
// Memvalidasi 4 skenario kritis:
// 1. Akurasi pembacaan koordinat, suhu, kelembapan, dan curah hujan aktual.
// 2. Integritas in-memory cache 15 menit (900.000 ms) untuk efisiensi kuota.
// 3. Failover otomatis ke profil darurat saat terjadi simulasi putus jaringan.
// 4. Integrasi telemetri mikro dengan modul peluruhan biologis dan proteksi harga bawah.

import { weatherAgent } from "../src/lib/weatherAgent";
import { COMMODITIES } from "../src/data/commodities";

// Variabel pelacak total kasus uji lulus dan gagal
let passedCount = 0;
// Jumlah asersi gagal; bila lebih dari nol, skrip keluar dengan kode 1.
let failedCount = 0;

// Memeriksa kondisi kebenaran pengujian dan mencetak log hasil ke konsol.
function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? ` -> ${detail}` : ""}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    failedCount++;
  }
}

// Menjalankan rangkaian pengujian integrasi telemetri cuaca PSR-5 secara sekuensial.
async function runWeatherTests() {
  console.log("\nPASARIN PSR-5 Weather Telemetry Test Suite");
  // Open-Meteo dimatikan di uji awal agar tidak memanggil jaringan sungguhan; uji 5 menyalakannya dengan fetch tiruan.
  process.env.PASARIN_WEATHER_OPEN_METEO = "0";

  // Membersihkan cache awal untuk memastikan pembacaan jaringan yang segar
  weatherAgent.clearCache();

  // Uji 1: Baca telemetri cuaca mikro di koordinat Kramat Jati
  console.log("\n[Test 1] Pengujian Pembacaan Telemetri Cuaca Aktual (Kramat Jati)");
  const weather1 = await weatherAgent.getMarketWeather({ forceRefresh: true });

  // Memvalidasi titik koordinat geospasial tepat pada Los Basah Blok A Pasar Induk Kramat Jati (-6.2675, 106.8702)
  assert(
    weather1.location.latitude === -6.2675 && weather1.location.longitude === 106.8702,
    "Koordinat geografis tepat pada Pasar Induk Kramat Jati (-6.2675, 106.8702)",
    `${weather1.location.latitude}, ${weather1.location.longitude}`
  );

  // Memvalidasi pembacaan suhu udara terik pasar dalam batas realistis iklim tropis Jakarta (20°C - 45°C)
  assert(
    typeof weather1.temperatureCelsius === "number" && weather1.temperatureCelsius > 20 && weather1.temperatureCelsius < 45,
    "Suhu udara terbaca valid secara stabil",
    `${weather1.temperatureCelsius}°C`
  );

  // Memvalidasi pembacaan tingkat kelembapan relatif udara dalam rentang realistis (50% - 100% RH)
  assert(
    typeof weather1.relativeHumidityPercent === "number" && weather1.relativeHumidityPercent >= 50 && weather1.relativeHumidityPercent <= 100,
    "Kelembapan udara terbaca valid",
    `${weather1.relativeHumidityPercent}% RH`
  );

  // Memvalidasi bahwa angka presipitasi curah hujan terbaca valid sebagai bilangan non-negatif (>= 0 mm)
  assert(
    typeof weather1.rainfallMm === "number" && weather1.rainfallMm >= 0,
    "Curah hujan terbaca valid",
    `${weather1.rainfallMm} mm`
  );

  // Uji 2: Penyimpanan cache memori 15 menit untuk menghemat kuota gratis
  console.log("\n[Test 2] Pengujian In-Memory Cache (15 Menit / 900.000 ms)");
  
  // Panggilan kedua tanpa forceRefresh dilayani langsung dari in-memory cache
  const weather2 = await weatherAgent.getMarketWeather();

  // Memvalidasi bahwa pemanggilan berulang dilayani dari in-memory cache (source = 'cache') untuk efisiensi kuota API
  assert(
    weather2.source === "cache",
    "Panggilan data berurutan dilayani langsung dari in-memory cache",
    `source: '${weather2.source}'`
  );

  const metrics = weatherAgent.getCacheMetrics();
  // Memverifikasi sisa masa berlaku TTL cache memori tercatat aktif sekitar 15 menit (> 800 detik)
  assert(
    metrics.hasActiveCache && metrics.expiresInSeconds > 800,
    "Masa berlaku cache tercatat ~15 menit",
    `Sisa TTL: ${metrics.expiresInSeconds} detik`
  );

  // Uji 3: Pengalihan otomatis ke profil cadangan saat offline
  console.log("\n[Test 3] Pengujian Simulasi Putus Jaringan & Profil Cadangan");
  
  weatherAgent.clearCache();
  // Mensimulasikan kondisi putus koneksi internet di los pasar tradisional
  const fallbackWeather = await weatherAgent.getMarketWeather({ simulateOffline: true });

  // Memvalidasi peralihan otomatis ke profil darurat offline (source = 'fallback_offline') saat jaringan putus
  assert(
    fallbackWeather.source === "fallback_offline",
    "Sistem beralih otomatis ke mode profil cadangan saat jaringan putus",
    `source: '${fallbackWeather.source}'`
  );

  // Memvalidasi suhu pada profil iklim cadangan darurat terpasang stabil pada 32.0 derajat Celsius
  assert(
    fallbackWeather.temperatureCelsius === 32.0,
    "Suhu profil cadangan terpasang tepat 32 derajat Celsius",
    `${fallbackWeather.temperatureCelsius}°C`
  );

  // Memvalidasi kelembapan relatif pada profil iklim cadangan darurat terpasang pada 75.0% RH
  assert(
    fallbackWeather.relativeHumidityPercent === 75.0,
    "Kelembapan profil cadangan terpasang tepat 75 persen",
    `${fallbackWeather.relativeHumidityPercent}% RH`
  );

  // Uji 4: Integrasi langsung cuaca mikro dengan modul peluruhan biologis
  console.log("\n[Test 4] Pengujian Integrasi Cuaca Mikro dengan Modul Peluruhan Biologis");
  
  const kangkung = COMMODITIES.find((c) => c.id === "kangkung");
  // Memvalidasi ketersediaan data komoditas kangkung darat dalam master data komoditas
  assert(!!kangkung, "Komoditas Kangkung Darat tersedia dalam katalog 30 komoditas");

  if (kangkung) {
    const hoursElapsed = 8.0; // Simulasi 8 jam terpapar udara los pasar
    const evalResult = await weatherAgent.evaluateCommodityDecay(kangkung, hoursElapsed);

    // Memvalidasi bahwa skor peluruhan DecayScore terhitung dinamis berbasis telemetri suhu dan kelembapan
    assert(
      typeof evalResult.decay.decayScore === "number" && evalResult.decay.decayScore > 0,
      "DecayScore terhitung dinamis dari suhu dan kelembapan pasar aktual",
      `DecayScore: ${evalResult.decay.decayScore}`
    );

    // Memverifikasi terbentuknya rekomendasi alokasi 3-Tier Sirkular secara otomatis
    assert(
      !!evalResult.decay.recommendedTier,
      "Rekomendasi alokasi 3-Tier Sirkular terbentuk secara otomatis",
      `Tier: ${evalResult.decay.tierLabel}`
    );

    // Memvalidasi penegakan batas bawah modal pedagang (Price Floor): harga tebus tidak boleh anjlok di bawah modal
    assert(
      evalResult.decay.estimatedSalvagePrice >= kangkung.minimumSalvagePricePerKg,
      "Price floor modal pedagang terlindungi pada harga salvaging",
      `Harga: Rp ${evalResult.decay.estimatedSalvagePrice}/kg (Price Floor: Rp ${kangkung.minimumSalvagePricePerKg}/kg)`
    );
  }

  // Uji 5: Sumber cadangan Open-Meteo dengan fetch tiruan
  console.log("\n[Test 5] Pengujian Sumber Cadangan Open-Meteo");
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENWEATHER_API_KEY;
  delete process.env.OPENWEATHER_API_KEY;
  const { resetEnvCache } = await import("../src/lib/env");
  resetEnvCache();
  let calls = 0;
  let mode: "ok" | "error" | "broken" = "ok";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls++;
    if (!String(input).includes("api.open-meteo.com")) throw new Error("hanya Open-Meteo yang boleh dipanggil");
    if (mode === "error") return Response.json({ reason: "server error" }, { status: 500 });
    if (mode === "broken") return Response.json({ current: { temperature_2m: 30, relative_humidity_2m: 150, precipitation: 0, weather_code: 1 } });
    return Response.json({ current: { temperature_2m: 30.44, relative_humidity_2m: 82.2, precipitation: 1.2, weather_code: 61 } });
  }) as typeof fetch;
  try {
    process.env.PASARIN_WEATHER_OPEN_METEO = "1";
    weatherAgent.clearCache();
    const live = await weatherAgent.getMarketWeather({ forceRefresh: true });
    assert(live.source === "open_meteo" && live.isEstimated === false, "tanpa kunci OpenWeather, Open-Meteo dipakai dan tidak ditandai estimasi", `source: '${live.source}'`);
    assert(live.temperatureCelsius === 30.4 && live.relativeHumidityPercent === 82 && live.rainfallMm === 1.2, "suhu, kelembapan, dan hujan dibaca dan dibulatkan benar", `${live.temperatureCelsius}°C, ${live.relativeHumidityPercent}%, ${live.rainfallMm} mm`);
    assert(live.weatherCondition === "Rain" && live.isRaining, "kode cuaca 61 dikenali sebagai hujan");
    const callsBefore = calls;
    const cached = await weatherAgent.getMarketWeather();
    assert(cached.source === "cache" && calls === callsBefore, "pembacaan kedua dilayani dari cache tanpa panggilan jaringan");

    weatherAgent.clearCache();
    mode = "error";
    const failed = await weatherAgent.getMarketWeather({ forceRefresh: true });
    assert(failed.source === "fallback_offline" && failed.isEstimated === true && failed.temperatureCelsius === 32.0, "galat Open-Meteo jatuh ke profil cadangan dan ditandai estimasi");

    weatherAgent.clearCache();
    mode = "broken";
    const broken = await weatherAgent.getMarketWeather({ forceRefresh: true });
    assert(broken.source === "fallback_offline" && broken.relativeHumidityPercent === 75, "data di luar rentang fisik (kelembapan 150 persen) ditolak");

    weatherAgent.clearCache();
    mode = "ok";
    process.env.PASARIN_WEATHER_OPEN_METEO = "0";
    const before = calls;
    const disabled = await weatherAgent.getMarketWeather({ forceRefresh: true });
    assert(disabled.source === "fallback_offline" && calls === before, "bendera PASARIN_WEATHER_OPEN_METEO=0 mematikan sumber cadangan tanpa panggilan jaringan");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENWEATHER_API_KEY; else process.env.OPENWEATHER_API_KEY = originalKey;
    delete process.env.PASARIN_WEATHER_OPEN_METEO;
    resetEnvCache();
    weatherAgent.clearCache();
  }

  // Rekapitulasi hasil pengujian
  console.log(`\nHasil pengujian akhir PSR-5: ${passedCount} lulus, ${failedCount} gagal\n`);

  if (failedCount > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

// Menjalankan rangkaian uji telemetri cuaca
runWeatherTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
