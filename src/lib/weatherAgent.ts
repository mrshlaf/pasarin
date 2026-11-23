// Modul Agen Telemetri Cuaca Mikro Pasar Induk Kramat Jati (PSR-5).
// Bertanggung jawab mengambil parameter fisik cuaca (suhu, kelembapan, curah hujan)
// untuk input kinetika peluruhan biologis Arrhenius-Q10 dan redaman pengunjung.
// Dilengkapi proteksi kuota API melalui cache memori 15 menit dan profil cadangan offline.

import { WeatherTelemetryData } from "@/types/api";
import { getEnv } from "@/lib/env";
import { Commodity } from "@/data/commodities";
import { calculateDecay } from "@/lib/decayEngine";

// Titik referensi geospasial los basah Blok A Pasar Induk Kramat Jati.
// Koordinat ini menjadi jangkar pembacaan stasiun cuaca mikro.
export const KRAMAT_JATI_COORDINATES = {
  latitude: -6.2675,
  longitude: 106.8702,
  locationName: "Pasar Induk Kramat Jati, Jakarta Timur",
} as const;

// Durasi masa aktif cache telemetri cuaca dalam milidetik (15 menit = 900.000 ms).
// Ditetapkan untuk membatasi konsumsi kuota OpenWeatherMap agar tetap di bawah
// batas paket gratis (1.000 panggilan per hari).
export const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;

// Profil iklim tropis darurat saat koneksi internet pasar terputus atau kuota API habis.
// Mengacu pada rata-rata empiris iklim mikro los pasar tradisional Jakarta:
// suhu 32,0°C dan kelembapan relatif 75% RH.
export const TROPICAL_FALLBACK_PROFILE: Readonly<WeatherTelemetryData> = Object.freeze({
  // Nilai tetap profil cadangan: suhu, kelembapan, tanpa hujan; field kembar (temperatureCelsius dan sejenisnya) menjaga dua penamaan yang dipakai modul lain.
  // Profil cadangan iklim tropis (32 C, 75 persen RH, tanpa hujan) dipakai bila semua sumber gagal; hasilnya ditandai sebagai sumber cadangan, bukan pengukuran.
  temperatureC: 32.0,
  humidityPercent: 75.0,
  rainfallMm: 0.0,
  weatherCondition: "Clouds",
  isRaining: false,
  coordinates: KRAMAT_JATI_COORDINATES,
  source: "FALLBACK",
  recordedAt: new Date(0).toISOString(),
  cacheExpiresAt: new Date(0).toISOString(),
  temperatureCelsius: 32.0,
  relativeHumidityPercent: 75.0,
  location: {
    latitude: KRAMAT_JATI_COORDINATES.latitude,
    longitude: KRAMAT_JATI_COORDINATES.longitude,
    name: KRAMAT_JATI_COORDINATES.locationName,
  },
});

// Struktur data entri cache memori telemetri cuaca pasar (PSR-5).
interface CachedWeatherEntry {
  data: WeatherTelemetryData;
  expiresAtTimestamp: number;
}

// Cache cuaca per proses; profil cadangan juga di-cache agar API yang gagal tidak dipanggil ulang tiap permintaan.
let memoryCache: CachedWeatherEntry | null = null;

// Open-Meteo: sumber cuaca kedua tanpa kunci API, dipakai bila OpenWeather tidak ada atau gagal.
// Aktif otomatis di produksi; di pengembangan dan pengujian hanya bila PASARIN_WEATHER_OPEN_METEO=1.
// Matikan dengan PASARIN_WEATHER_OPEN_METEO=0. Catatan lisensi: Open-Meteo gratis hanya untuk penggunaan non-komersial.
function openMeteoEnabled() {
  const flag = process.env.PASARIN_WEATHER_OPEN_METEO;
  if (flag === "0") return false;
  return flag === "1" || process.env.NODE_ENV === "production";
}

// Kondisi cuaca (bahasa OpenWeather) dari kode cuaca WMO yang dipakai Open-Meteo.
// Kode cuaca WMO dari Open-Meteo diubah ke kata kunci seperti OpenWeather (Clear, Clouds, Fog, Drizzle, dan seterusnya) agar deteksi hujan satu jalur.
function conditionFromWmoCode(code: number) {
  if (code === 0) return "Clear";
  if (code >= 1 && code <= 3) return "Clouds";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Rain";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snow";
  return "Clouds";
}

// Membaca cuaca terkini dari Open-Meteo. Mengembalikan null bila dimatikan, gagal, atau datanya tidak masuk akal,
// supaya pemanggil jatuh ke profil cadangan alih-alih memakai angka yang rusak.
// Sumber kedua tanpa kunci: Open-Meteo untuk koordinat Kramat Jati; mengembalikan null bila dimatikan lewat PASARIN_WEATHER_OPEN_METEO atau gagal.
async function fetchOpenMeteo(now: number): Promise<WeatherTelemetryData | null> {
  if (!openMeteoEnabled()) return null;
  const { latitude, longitude, locationName } = KRAMAT_JATI_COORDINATES;
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + latitude + "&longitude=" + longitude +
    "&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&timezone=Asia%2FJakarta";
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;
    const current = (await response.json())?.current;
    const temperatureC = Number(current?.temperature_2m);
    const humidityPercent = Number(current?.relative_humidity_2m);
    const rainfallMm = Number(current?.precipitation ?? 0);
    const code = Number(current?.weather_code ?? 3);
    // Nilai di luar rentang fisik dianggap data rusak.
    // Validasi nilai: suhu -10 sampai 60 C, RH 0 sampai 100 persen, hujan tidak negatif. Di luar itu data dibuang dan cadangan dipakai.
    if (!Number.isFinite(temperatureC) || temperatureC < -10 || temperatureC > 60) return null;
    if (!Number.isFinite(humidityPercent) || humidityPercent < 0 || humidityPercent > 100) return null;
    if (!Number.isFinite(rainfallMm) || rainfallMm < 0) return null;
    const weatherCondition = conditionFromWmoCode(Number.isFinite(code) ? code : 3);
    const roundedTemperature = Math.round(temperatureC * 10) / 10;
    const roundedHumidity = Math.round(humidityPercent);
    return {
      temperatureC: roundedTemperature,
      humidityPercent: roundedHumidity,
      rainfallMm,
      weatherCondition,
      isRaining: rainfallMm > 0 || weatherCondition === "Rain" || weatherCondition === "Drizzle" || weatherCondition === "Thunderstorm",
      coordinates: { latitude, longitude, locationName },
      source: "OPEN_METEO",
      isEstimated: false,
      recordedAt: new Date(now).toISOString(),
      cacheExpiresAt: new Date(now + WEATHER_CACHE_TTL_MS).toISOString(),
      temperatureCelsius: roundedTemperature,
      relativeHumidityPercent: roundedHumidity,
      location: { latitude, longitude, name: locationName },
    };
  } catch {
    return null;
  }
}

// Mencoba Open-Meteo, lalu jatuh ke profil cadangan. Hasil Open-Meteo juga disimpan di cache 15 menit.
// Urutan sumber: Open-Meteo bila ada, bila tidak profil cadangan. Hasil Open-Meteo disimpan di cache selama masa berlaku.
async function secondarySourceOrFallback(now: number): Promise<WeatherTelemetryData> {
  const data = await fetchOpenMeteo(now);
  if (!data) return returnFallbackProfile(now, "FALLBACK");
  memoryCache = { data, expiresAtTimestamp: now + WEATHER_CACHE_TTL_MS };
  return data;
}

// Mengambil telemetri cuaca pasar terkini dari OpenWeatherMap, lalu Open-Meteo, atau cache in-memory.
// Mengimplementasikan mekanisme fail-safe: beralih ke profil cadangan saat terjadi galat jaringan.
export async function getHyperlocalMarketWeather(forceRefresh = false): Promise<WeatherTelemetryData> {
  // Cache segar dipakai lebih dulu supaya kuota API gratis aman; label sumbernya diganti CACHE.
  const now = Date.now();

  // Return dari cache jika masih valid
  // Cache dalam memori: selama belum kedaluwarsa dan tidak dipaksa segarkan, data lama dikembalikan dengan sumber CACHE.
  if (!forceRefresh && memoryCache !== null && now < memoryCache.expiresAtTimestamp) {
    return {
      ...memoryCache.data,
      source: "CACHE",
    };
  }

  // Tanpa kunci API valid, langsung memakai profil cadangan tanpa panggilan jaringan.
  const env = getEnv();
  const apiKey = env.OPENWEATHER_API_KEY;

  // Kunci contoh dari .env.example diperlakukan sama dengan kunci kosong.
  if (!apiKey || apiKey.includes("your-openweather") || apiKey.trim().length === 0) {
    return secondarySourceOrFallback(now);
  }

  const { latitude, longitude, locationName } = KRAMAT_JATI_COORDINATES;
  // Koordinat tetap Pasar Induk Kramat Jati; satuan metrik (derajat Celsius).
  const targetUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      // Cache fetch Next.js 15 menit, selaras dengan TTL cache memori.
      next: { revalidate: 900 },
    });

    // Respons non-200 (kuota habis, kunci salah) dianggap kegagalan dan jatuh ke profil cadangan.
    if (!response.ok) {
      console.warn(`[WeatherAgent] OpenWeather error ${response.status}, beralih ke sumber cadangan.`);
      return secondarySourceOrFallback(now);
    }

    const payload = await response.json();

    // Nilai dibulatkan: suhu satu desimal, kelembapan bilangan bulat; nilai bawaan dipakai bila field hilang.
    const temperatureC = Math.round(Number(payload.main?.temp ?? 32.0) * 10) / 10;
    const humidityPercent = Math.round(Number(payload.main?.humidity ?? 75));
    const weatherCondition = String(payload.weather?.[0]?.main ?? "Clouds");
    const weatherDescription = String(payload.weather?.[0]?.description ?? "").toLowerCase();

    // Deteksi hujan untuk trigger model redaman pengunjung (PSR-15)
    // Hujan terdeteksi dari kata kunci kondisi cuaca (rain, drizzle, dan sejenisnya).
    const conditionLower = weatherCondition.toLowerCase();
    const isRaining =
      conditionLower.includes("rain") ||
      conditionLower.includes("drizzle") ||
      conditionLower.includes("thunderstorm") ||
      weatherDescription.includes("hujan");

    // OpenWeather tidak selalu mengirim rain.1h; saat hujan tanpa angka, diasumsikan 12,5 mm (hujan lebat sore).
    const rainfallMm = Number(payload.rain?.["1h"] ?? (isRaining ? 12.5 : 0.0));

    // Data segar dari sumber utama: suhu, RH, hujan, kondisi, waktu rekam, dan batas cache.
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
      temperatureCelsius: temperatureC,
      relativeHumidityPercent: humidityPercent,
      location: { latitude, longitude, name: locationName },
    };

    // Simpan hasil sukses agar permintaan berikutnya dalam 15 menit tidak memanggil API.
    memoryCache = {
      data: freshData,
      expiresAtTimestamp: now + WEATHER_CACHE_TTL_MS,
    };

    return freshData;
  // Jaringan gagal: pakai profil cadangan alih-alih membiarkan halaman error.
  } catch (networkError) {
    console.warn("[WeatherAgent] Gagal terhubung ke OpenWeatherMap:", networkError);
    return secondarySourceOrFallback(now);
  }
}

// Menghasilkan objek telemetri cuaca darurat berbasis profil tropis statis
// dan memperbarui cache memori lokal agar tidak memicu panggilan jaringan berulang.
function returnFallbackProfile(
  currentTimestampMs: number,
  sourceLabel: "FALLBACK" | "fallback_offline" = "FALLBACK"
): WeatherTelemetryData {
  // Profil cadangan ditandai isEstimated agar antarmuka dan chatbot menyebutnya estimasi.
  // Data cadangan: profil tropis dengan waktu rekam sekarang dan masa berlaku cache yang sama.
  const fallbackData: WeatherTelemetryData = {
    ...TROPICAL_FALLBACK_PROFILE,
    recordedAt: new Date(currentTimestampMs).toISOString(),
    cacheExpiresAt: new Date(currentTimestampMs + WEATHER_CACHE_TTL_MS).toISOString(),
    source: sourceLabel,
    isEstimated: true,
    temperatureCelsius: 32.0,
    relativeHumidityPercent: 75.0,
    location: {
      latitude: KRAMAT_JATI_COORDINATES.latitude,
      longitude: KRAMAT_JATI_COORDINATES.longitude,
      name: KRAMAT_JATI_COORDINATES.locationName,
    },
  };

  // Profil cadangan ikut di-cache supaya API yang sedang gagal tidak dipanggil tiap permintaan.
  memoryCache = {
    data: fallbackData,
    expiresAtTimestamp: currentTimestampMs + WEATHER_CACHE_TTL_MS,
  };

  return fallbackData;
}

// Mengosongkan cache memori telemetri cuaca.
// Digunakan untuk isolasi kondisi pada pengujian otomatis dan simulasi pemutusan jaringan.
export function resetWeatherMemoryCache(): void {
  memoryCache = null;
}

// Objek fasad agen cuaca untuk adapter antarmuka pengguna dan integrasi modul kinetika peluruhan.
export const weatherAgent = {
  fetch: getHyperlocalMarketWeather,
  getHyperlocalMarketWeather,
  // Versi cuaca dengan label sumber huruf kecil (cache, live_api, fallback_offline) untuk UI.
  // simulateOffline mengosongkan cache dan langsung memakai profil cadangan.
  // Mode simulateOffline dipakai uji dan demo: cache dikosongkan lalu profil cadangan dikembalikan tanpa menghubungi jaringan.
  getMarketWeather: async (options?: { forceRefresh?: boolean; simulateOffline?: boolean }) => {
    if (options?.simulateOffline) {
      resetWeatherMemoryCache();
      return returnFallbackProfile(Date.now(), "fallback_offline");
    }
    const res = await getHyperlocalMarketWeather(options?.forceRefresh ?? false);
    // Label sumber dinormalkan ke huruf kecil untuk antarmuka.
    // Nama sumber dinormalkan ke huruf kecil (cache, live_api, open_meteo, fallback_offline) untuk dipakai antarmuka dan API.
    const normalizedSource =
      res.source === "CACHE" ? "cache" : res.source === "LIVE_API" ? "live_api" : res.source === "OPEN_METEO" ? "open_meteo" : "fallback_offline";
    return {
      ...res,
      source: normalizedSource,
      location: res.location || {
        latitude: res.coordinates.latitude,
        longitude: res.coordinates.longitude,
        name: res.coordinates.locationName,
      },
      temperatureCelsius: res.temperatureCelsius ?? res.temperatureC,
      relativeHumidityPercent: res.relativeHumidityPercent ?? res.humidityPercent,
    };
  },
  clearCache: resetWeatherMemoryCache,
  resetCache: resetWeatherMemoryCache,
  // Status cache saat ini dan sisa masa berlakunya dalam detik.
  // Metrik cache untuk pemantauan: apakah cache aktif dan sisa detik masa berlakunya.
  getCacheMetrics: () => {
    const now = Date.now();
    const hasActiveCache = memoryCache !== null && now < memoryCache.expiresAtTimestamp;
    const expiresInSeconds = hasActiveCache
      ? Math.round((memoryCache!.expiresAtTimestamp - now) / 1000)
      : 0;
    return { hasActiveCache, expiresInSeconds };
  },
  // Menghitung peluruhan komoditas memakai suhu dan kelembapan cuaca terkini.
  // Evaluasi susut satu komoditas memakai cuaca los saat ini dan jam pajang yang diberikan.
  evaluateCommodityDecay: async (commodity: Commodity, hoursElapsed: number) => {
    const weather = await getHyperlocalMarketWeather();
    const decay = calculateDecay(commodity, weather.temperatureC, weather.humidityPercent, hoursElapsed);
    return { weather, decay };
  },
  COORDINATES: KRAMAT_JATI_COORDINATES,
  FALLBACK: TROPICAL_FALLBACK_PROFILE,
};
