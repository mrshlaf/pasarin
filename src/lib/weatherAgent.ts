/**
 * Agen Telemetri Cuaca Mikro Hiperlokal (Hyperlocal Climate Telemetry Agent)
 *
 * @see Jira Ticket PSR-5 (TASK Sprint 2 / Sprint 1 Foundation)
 * @see PRD_FIX_PASARIN.md Bagian 4.3 (Agent 3) & Bagian 15.4.1
 *
 * Modul ini bertugas mengakuisisi parameter mikroklimat fisik (suhu udara,
 * kelembapan relatif, curah hujan) di kawasan Pasar Induk Kramat Jati secara
 * waktu nyata. Parameter ini menjadi data masukan primer bagi formula kinetika
 * respirasi biologis Arrhenius-Q10 (PSR-14) dan model redaman pengunjung pasar (PSR-15).
 */

import { WeatherTelemetryData } from "@/types/api";
import { getEnv } from "@/lib/env";

/**
 * Koordinat geografis stasiun pengamatan mikro Pasar Induk Kramat Jati, Jakarta Timur.
 * Rasionale: Dipatok presisi pada titik tengah area los basah hortikultura Blok A
 * guna merefleksikan paparan panas fisik atap seng dan sirkulasi udara nyata pedagang.
 */
export const KRAMAT_JATI_COORDINATES = {
  latitude: -6.2644,
  longitude: 106.8687,
  locationName: "Pasar Induk Kramat Jati, Jakarta Timur",
} as const;

/**
 * Durasi penyimpanan memori sementara (cache TTL) dalam satuan milidetik.
 * Rasionale: 15 menit (900.000 ms) dipilih untuk menyeimbangkan kebaruan fluktuasi
 * cuaca tropis Jakarta dengan batas kuota langganan gratis OpenWeatherMap
 * (maksimal 1.000 panggilan per hari / 60 panggilan per jam).
 */
export const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Profil iklim cadangan darurat (Climatic Fallback Profile).
 * Rasionale: Sesuai ketetapan PRD Bagian 16.2.2 (Runbook RB-02), jika jaringan seluler
 * pasar terputus atau batas kuota API pihak ketiga habis, sistem dilarang berhenti beroperasi.
 * Nilai suhu 32,5°C dan kelembapan 75% mewakili rata-rata empiris siang hari los Kramat Jati.
 */
export const TROPICAL_FALLBACK_PROFILE: Readonly<WeatherTelemetryData> = Object.freeze({
  temperatureC: 32.5,
  humidityPercent: 75,
  rainfallMm: 0.0,
  weatherCondition: "Clouds",
  isRaining: false,
  coordinates: KRAMAT_JATI_COORDINATES,
  source: "FALLBACK",
  recordedAt: new Date(0).toISOString(),
  cacheExpiresAt: new Date(0).toISOString(),
});

/**
 * Wadah penyimpan data telemetri di memori proses (in-memory single slot cache).
 */
interface CachedWeatherEntry {
  data: WeatherTelemetryData;
  expiresAtTimestamp: number;
}

let memoryCache: CachedWeatherEntry | null = null;

/**
 * Mengakuisisi data telemetri cuaca mikro Pasar Induk Kramat Jati.
 *
 * Alur Kerja:
 * 1. Evaluasi cache: Jika data pada memori proses masih segar dan opsi paksa segarkan
 *    (forceRefresh) bernilai false, data langsung dikembalikan dari RAM (status: 'CACHE').
 * 2. Permintaan jaringan: Jika cache kedaluwarsa, modul menghubungi endpoint
 *    OpenWeatherMap API via protokol HTTPS menggunakan API Key dari variabel lingkungan.
 * 3. Ekstraksi data: Mengekstrak suhu (Celsius), kelembapan (%), deteksi hujan, dan curah hujan (mm).
 * 4. Penanganan kegagalan (Fail-safe Fallback): Jika API Key tidak terkonfigurasi, kuota habis,
 *    atau koneksi internet pasar terputus, modul mengembalikan profil tropis darurat (status: 'FALLBACK').
 *
 * @param forceRefresh - Abaikan cache memori dan paksa panggilan baru ke OpenWeatherMap.
 * @returns Promise berisi objek WeatherTelemetryData terstruktur dan type-safe.
 */
export async function getHyperlocalMarketWeather(forceRefresh = false): Promise<WeatherTelemetryData> {
  const now = Date.now();

  // Evaluasi ketersediaan dan kesegaran cache memori
  if (!forceRefresh && memoryCache !== null && now < memoryCache.expiresAtTimestamp) {
    return {
      ...memoryCache.data,
      source: "CACHE",
    };
  }

  const env = getEnv();
  const apiKey = env.OPENWEATHER_API_KEY;

  // Jika API Key eksternal belum dikonfigurasi, gunakan profil cadangan tropis
  if (!apiKey || apiKey.includes("your-openweather") || apiKey.trim().length === 0) {
    const fallbackData: WeatherTelemetryData = {
      ...TROPICAL_FALLBACK_PROFILE,
      recordedAt: new Date().toISOString(),
      cacheExpiresAt: new Date(now + WEATHER_CACHE_TTL_MS).toISOString(),
      source: "FALLBACK",
    };
    memoryCache = {
      data: fallbackData,
      expiresAtTimestamp: now + WEATHER_CACHE_TTL_MS,
    };
    return fallbackData;
  }

  const { latitude, longitude, locationName } = KRAMAT_JATI_COORDINATES;
  const targetUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 900 }, // Integrasi ISR 15 menit Next.js
    });

    if (!response.ok) {
      console.warn(
        `[WeatherAgent Warning] Permintaan OpenWeatherMap gagal dengan kode status HTTP ${response.status}. Mengalihkan ke profil cadangan.`
      );
      return returnFallbackProfile(now);
    }

    const payload = await response.json();

    // Ekstraksi parameter meteorologis aktual
    const temperatureC = Math.round(Number(payload.main?.temp ?? 32.0) * 10) / 10;
    const humidityPercent = Math.round(Number(payload.main?.humidity ?? 75));
    const weatherCondition = String(payload.weather?.[0]?.main ?? "Clouds");
    const weatherDescription = String(payload.weather?.[0]?.description ?? "").toLowerCase();

    // Deteksi indikasi hujan untuk memicu simulasi redaman pembeli (PSR-15)
    const conditionLower = weatherCondition.toLowerCase();
    const isRaining =
      conditionLower.includes("rain") ||
      conditionLower.includes("drizzle") ||
      conditionLower.includes("thunderstorm") ||
      weatherDescription.includes("hujan");

    // Perhitungan curah hujan per jam (jika sensor stasiun mencatat volume presipitasi)
    const rainfallMm = Number(payload.rain?.["1h"] ?? (isRaining ? 12.5 : 0.0));

    const freshData: WeatherTelemetryData = {
      temperatureC,
      humidityPercent,
      rainfallMm,
      weatherCondition,
      isRaining,
      coordinates: { latitude, longitude, locationName },
      source: "LIVE_API",
      recordedAt: new Date(now).toISOString(),
      cacheExpiresAt: new Date(now + WEATHER_CACHE_TTL_MS).toISOString(),
    };

    // Perbarui cache memori
    memoryCache = {
      data: freshData,
      expiresAtTimestamp: now + WEATHER_CACHE_TTL_MS,
    };

    return freshData;
  } catch (networkError) {
    console.warn(
      "[WeatherAgent Warning] Terjadi gangguan koneksi jaringan saat memanggil OpenWeatherMap:",
      networkError instanceof Error ? networkError.message : String(networkError)
    );
    return returnFallbackProfile(now);
  }
}

/**
 * Menghasilkan objek data telemetri berbasis profil cadangan tropis darurat
 * saat koneksi jaringan gagal atau kuota API habis.
 *
 * @param currentTimestampMs - Stempel waktu saat kegagalan terjadi dalam milidetik.
 * @returns Objek WeatherTelemetryData berstatus FALLBACK dengan stempel waktu terkini.
 */
function returnFallbackProfile(currentTimestampMs: number): WeatherTelemetryData {
  const fallbackData: WeatherTelemetryData = {
    ...TROPICAL_FALLBACK_PROFILE,
    recordedAt: new Date(currentTimestampMs).toISOString(),
    cacheExpiresAt: new Date(currentTimestampMs + WEATHER_CACHE_TTL_MS).toISOString(),
    source: "FALLBACK",
  };

  memoryCache = {
    data: fallbackData,
    expiresAtTimestamp: currentTimestampMs + WEATHER_CACHE_TTL_MS,
  };

  return fallbackData;
}

/**
 * Menghapus cache memori aktif untuk kebutuhan pengujian unit (unit testing)
 * atau reset manual oleh administrator sistem.
 */
export function resetWeatherMemoryCache(): void {
  memoryCache = null;
}
