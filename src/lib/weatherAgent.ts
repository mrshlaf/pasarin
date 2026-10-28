/**
 * Weather telemetry agent untuk Pasar Induk Kramat Jati.
 * Mengambil data OpenWeatherMap dengan cache 15 menit dan fallback offline.
 */

import { WeatherTelemetryData } from "@/types/api";
import { getEnv } from "@/lib/env";
import { Commodity } from "@/data/commodities";
import { calculateDecay } from "@/lib/decayEngine";

// Titik tengah los basah Kramat Jati Blok A
export const KRAMAT_JATI_COORDINATES = {
  latitude: -6.2675,
  longitude: 106.8702,
  locationName: "Pasar Induk Kramat Jati, Jakarta Timur",
} as const;

// Cache TTL 15 menit untuk menghemat kuota free tier OpenWeather (1.000 call/hari)
export const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;

// Fallback jika API key belum diset, kuota habis, atau koneksi bermasalah
export const TROPICAL_FALLBACK_PROFILE: Readonly<WeatherTelemetryData> = Object.freeze({
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

interface CachedWeatherEntry {
  data: WeatherTelemetryData;
  expiresAtTimestamp: number;
}

let memoryCache: CachedWeatherEntry | null = null;

/**
 * Mengambil telemetri cuaca terkini dari OpenWeatherMap atau cache.
 * Jika koneksi gagal, sistem otomatis memakai profil cadangan (fallback).
 */
export async function getHyperlocalMarketWeather(forceRefresh = false): Promise<WeatherTelemetryData> {
  const now = Date.now();

  // Return dari cache jika masih valid
  if (!forceRefresh && memoryCache !== null && now < memoryCache.expiresAtTimestamp) {
    return {
      ...memoryCache.data,
      source: "CACHE",
    };
  }

  const env = getEnv();
  const apiKey = env.OPENWEATHER_API_KEY;

  if (!apiKey || apiKey.includes("your-openweather") || apiKey.trim().length === 0) {
    return returnFallbackProfile(now, "FALLBACK");
  }

  const { latitude, longitude, locationName } = KRAMAT_JATI_COORDINATES;
  const targetUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      console.warn(`[WeatherAgent] OpenWeather error ${response.status}, beralih ke fallback.`);
      return returnFallbackProfile(now, "FALLBACK");
    }

    const payload = await response.json();

    const temperatureC = Math.round(Number(payload.main?.temp ?? 32.0) * 10) / 10;
    const humidityPercent = Math.round(Number(payload.main?.humidity ?? 75));
    const weatherCondition = String(payload.weather?.[0]?.main ?? "Clouds");
    const weatherDescription = String(payload.weather?.[0]?.description ?? "").toLowerCase();

    // Deteksi hujan untuk trigger model redaman pengunjung (PSR-15)
    const conditionLower = weatherCondition.toLowerCase();
    const isRaining =
      conditionLower.includes("rain") ||
      conditionLower.includes("drizzle") ||
      conditionLower.includes("thunderstorm") ||
      weatherDescription.includes("hujan");

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
      temperatureCelsius: temperatureC,
      relativeHumidityPercent: humidityPercent,
      location: { latitude, longitude, name: locationName },
    };

    memoryCache = {
      data: freshData,
      expiresAtTimestamp: now + WEATHER_CACHE_TTL_MS,
    };

    return freshData;
  } catch (networkError) {
    console.warn("[WeatherAgent] Gagal terhubung ke OpenWeatherMap:", networkError);
    return returnFallbackProfile(now, "FALLBACK");
  }
}

function returnFallbackProfile(
  currentTimestampMs: number,
  sourceLabel: "FALLBACK" | "fallback_offline" = "FALLBACK"
): WeatherTelemetryData {
  const fallbackData: WeatherTelemetryData = {
    ...TROPICAL_FALLBACK_PROFILE,
    recordedAt: new Date(currentTimestampMs).toISOString(),
    cacheExpiresAt: new Date(currentTimestampMs + WEATHER_CACHE_TTL_MS).toISOString(),
    source: sourceLabel as any,
    temperatureCelsius: 32.0,
    relativeHumidityPercent: 75.0,
    location: {
      latitude: KRAMAT_JATI_COORDINATES.latitude,
      longitude: KRAMAT_JATI_COORDINATES.longitude,
      name: KRAMAT_JATI_COORDINATES.locationName,
    },
  };

  memoryCache = {
    data: fallbackData,
    expiresAtTimestamp: currentTimestampMs + WEATHER_CACHE_TTL_MS,
  };

  return fallbackData;
}

export function resetWeatherMemoryCache(): void {
  memoryCache = null;
}

/**
 * Adapter cuaca untuk pengujian unit dan evaluasi cepat komoditas.
 */
export const weatherAgent = {
  fetch: getHyperlocalMarketWeather,
  getHyperlocalMarketWeather,
  getMarketWeather: async (options?: { forceRefresh?: boolean; simulateOffline?: boolean }) => {
    if (options?.simulateOffline) {
      resetWeatherMemoryCache();
      return returnFallbackProfile(Date.now(), "fallback_offline");
    }
    const res = await getHyperlocalMarketWeather(options?.forceRefresh ?? false);
    const normalizedSource =
      res.source === "CACHE" ? "cache" : res.source === "LIVE_API" ? "live_api" : "fallback_offline";
    return {
      ...res,
      source: normalizedSource as any,
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
  getCacheMetrics: () => {
    const now = Date.now();
    const hasActiveCache = memoryCache !== null && now < memoryCache.expiresAtTimestamp;
    const expiresInSeconds = hasActiveCache
      ? Math.round((memoryCache!.expiresAtTimestamp - now) / 1000)
      : 0;
    return { hasActiveCache, expiresInSeconds };
  },
  evaluateCommodityDecay: async (commodity: Commodity, hoursElapsed: number) => {
    const weather = await getHyperlocalMarketWeather();
    const decay = calculateDecay(commodity, weather.temperatureC, weather.humidityPercent, hoursElapsed);
    return { weather, decay };
  },
  COORDINATES: KRAMAT_JATI_COORDINATES,
  FALLBACK: TROPICAL_FALLBACK_PROFILE,
};
