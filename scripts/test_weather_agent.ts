/**
 * Skrip Uji Integrasi Agen Telemetri Cuaca Mikro Kramat Jati (PSR-5).
 * Memvalidasi 4 skenario kritis:
 * 1. Akurasi pembacaan koordinat, suhu, kelembapan, dan curah hujan aktual.
 * 2. Integritas in-memory cache 15 menit (900.000 ms) untuk efisiensi kuota.
 * 3. Failover otomatis ke profil darurat saat terjadi simulasi putus jaringan.
 * 4. Integrasi telemetri mikro dengan modul peluruhan biologis dan proteksi harga bawah.
 */

import { weatherAgent } from "../src/lib/weatherAgent";
import { COMMODITIES } from "../src/data/commodities";

let passedCount = 0;
let failedCount = 0;

/**
 * Memeriksa kondisi kebenaran pengujian dan mencetak log hasil ke konsol.
 *
 * @param condition - Kondisi boolean yang diuji.
 * @param testName - Label nama skenario pengujian.
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
 * Menjalankan rangkaian pengujian integrasi telemetri cuaca PSR-5 secara sekuensial.
 */
async function runWeatherTests() {
  console.log("\n--- PASARIN PSR-5 WEATHER TELEMETRY TEST SUITE ---");

  weatherAgent.clearCache();

  // Test 1: Baca telemetri cuaca mikro di koordinat Kramat Jati
  console.log("\n[Test 1] Pengujian Pembacaan Telemetri Cuaca Aktual (Kramat Jati)");
  const weather1 = await weatherAgent.getMarketWeather({ forceRefresh: true });

  assert(
    weather1.location.latitude === -6.2675 && weather1.location.longitude === 106.8702,
    "Koordinat geografis tepat pada Pasar Induk Kramat Jati (-6.2675, 106.8702)",
    `${weather1.location.latitude}, ${weather1.location.longitude}`
  );
  assert(
    typeof weather1.temperatureCelsius === "number" && weather1.temperatureCelsius > 20 && weather1.temperatureCelsius < 45,
    "Suhu udara terbaca valid secara stabil",
    `${weather1.temperatureCelsius}°C`
  );
  assert(
    typeof weather1.relativeHumidityPercent === "number" && weather1.relativeHumidityPercent >= 50 && weather1.relativeHumidityPercent <= 100,
    "Kelembapan udara terbaca valid",
    `${weather1.relativeHumidityPercent}% RH`
  );
  assert(
    typeof weather1.rainfallMm === "number" && weather1.rainfallMm >= 0,
    "Curah hujan terbaca valid",
    `${weather1.rainfallMm} mm`
  );

  // Test 2: In-memory cache 15 menit untuk hemat kuota gratis
  console.log("\n[Test 2] Pengujian In-Memory Cache (15 Menit / 900.000 ms)");
  
  // Panggilan kedua tanpa forceRefresh dilayani langsung dari cache
  const weather2 = await weatherAgent.getMarketWeather();

  assert(
    weather2.source === "cache",
    "Panggilan data berurutan dilayani langsung dari in-memory cache",
    `source: '${weather2.source}'`
  );

  const metrics = weatherAgent.getCacheMetrics();
  assert(
    metrics.hasActiveCache && metrics.expiresInSeconds > 800,
    "Masa berlaku cache tercatat ~15 menit",
    `Sisa TTL: ${metrics.expiresInSeconds} detik`
  );

  // Test 3: Pengalihan otomatis ke profil cadangan saat offline
  console.log("\n[Test 3] Pengujian Simulasi Putus Jaringan & Profil Cadangan");
  
  weatherAgent.clearCache();
  const fallbackWeather = await weatherAgent.getMarketWeather({ simulateOffline: true });

  assert(
    fallbackWeather.source === "fallback_offline",
    "Sistem beralih otomatis ke mode profil cadangan saat jaringan putus",
    `source: '${fallbackWeather.source}'`
  );
  assert(
    fallbackWeather.temperatureCelsius === 32.0,
    "Suhu profil cadangan terpasang tepat 32 derajat Celsius",
    `${fallbackWeather.temperatureCelsius}°C`
  );
  assert(
    fallbackWeather.relativeHumidityPercent === 75.0,
    "Kelembapan profil cadangan terpasang tepat 75 persen",
    `${fallbackWeather.relativeHumidityPercent}% RH`
  );

  // Test 4: Integrasi langsung cuaca mikro dengan modul peluruhan biologis
  console.log("\n[Test 4] Pengujian Integrasi Cuaca Mikro dengan Modul Peluruhan Biologis");
  
  const kangkung = COMMODITIES.find((c) => c.id === "kangkung");
  assert(!!kangkung, "Komoditas Kangkung Darat tersedia dalam katalog 30 komoditas");

  if (kangkung) {
    const hoursElapsed = 8.0; // 8 jam di los pasar
    const evalResult = await weatherAgent.evaluateCommodityDecay(kangkung, hoursElapsed);

    assert(
      typeof evalResult.decay.decayScore === "number" && evalResult.decay.decayScore > 0,
      "DecayScore terhitung dinamis dari suhu dan kelembapan pasar aktual",
      `DecayScore: ${evalResult.decay.decayScore}`
    );
    assert(
      !!evalResult.decay.recommendedTier,
      "Rekomendasi alokasi 3-Tier Sirkular terbentuk secara otomatis",
      `Tier: ${evalResult.decay.tierLabel}`
    );
    assert(
      evalResult.decay.estimatedSalvagePrice >= kangkung.minimumSalvagePricePerKg,
      "Price floor modal pedagang terlindungi pada harga salvaging",
      `Harga: Rp ${evalResult.decay.estimatedSalvagePrice}/kg (Price Floor: Rp ${kangkung.minimumSalvagePricePerKg}/kg)`
    );
  }

  // Ringkasan hasil test
  console.log(`\n🎉 HASIL PENGUJIAN AKHIR PSR-5: ${passedCount} LULUS, ${failedCount} GAGAL\n`);

  if (failedCount > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

runWeatherTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
