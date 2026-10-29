/**
 * Definisi Tipe Data Kontrak API dan Entitas Domain PASARIN.
 * Memuat skema amplop HTTP seragam, telemetri mikroklimat cuaca (PSR-5),
 * kinetika peluruhan biologis Arrhenius (PSR-14), dan hasil sapuan surplus sore (PSR-4).
 */

/**
 * Amplop respons API standar untuk seluruh endpoint HTTP PASARIN.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  timestamp: string;
}

export interface ApiPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: ApiPagination;
}

/**
 * Struktur payload diagnostik status kesehatan layanan dan konektivitas basis data (PSR-3).
 */
export interface HealthCheckData {
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  checks: {
    database: "connected" | "configured" | "unconfigured" | "error";
    memoryUsageMB: number;
  };
}

export interface AgentSweepTriggerPayload {
  cronSecret?: string;
  forcedTrigger?: boolean;
  targetKiosksCount?: number;
}

/**
 * Struktur catatan audit sistem untuk persistensi ke tabel system_audit_trail (PSR-4).
 */
export interface SystemAuditTrailRecord {
  event_id: string;
  subsystem: string;
  action_type: string;
  payload_json: Record<string, unknown>;
  execution_duration_ms?: number;
  occurred_at: string;
}

/**
 * Ringkasan hasil eksekusi sapuan surplus harian 14.30 WIB beserta alokasi 3-Tier (PSR-4).
 */
export interface AfternoonSweepResult {
  eventId: string;
  subsystem: string;
  actionType: string;
  schedule: string;
  triggeredAt: string;
  result: string;
  executionDurationMs: number;
  kiosksScanned: number;
  surplusDetectedKg: number;
  allocations: {
    tier1WartegKg: number;
    tier2SocialKg: number;
    tier3MaggotKg: number;
  };
  financials: {
    estimatedCapitalRecoveredIdr: number;
    discountAveragePercent: number;
  };
  auditTrail: {
    logged: boolean;
    storage: "supabase" | "in_memory";
  };
}

/**
 * Struktur data telemetri cuaca mikro di los basah Pasar Induk Kramat Jati (PSR-5).
 */
export interface WeatherTelemetryData {
  temperatureC: number;
  humidityPercent: number;
  rainfallMm: number;
  weatherCondition: string;
  isRaining: boolean;
  coordinates: {
    latitude: number;
    longitude: number;
    locationName: string;
  };
  source: "CACHE" | "LIVE_API" | "FALLBACK" | "cache" | "live_api" | "fallback_offline";
  recordedAt: string;
  cacheExpiresAt: string;
  temperatureCelsius: number;
  relativeHumidityPercent: number;
  location: { latitude: number; longitude: number; name?: string };
}

/**
 * Klasifikasi kondisi fisik mutu sayuran berdasarkan skor peluruhan biologis:
 * segar_prima (< 0.35), layu_ringan (0.35 - 0.65), layu_sedang (0.65 - 0.85), tidak_layak (>= 0.85).
 */
export type ProduceCondition = "segar_prima" | "layu_ringan" | "layu_sedang" | "tidak_layak";

/**
 * Tingkatan alokasi penyelamatan sirkular:
 * fresh (eceran normal), tier_1 (Warteg/UMKM), tier_2 (Dapur Sosial), tier_3 (Sentra Maggot BSF).
 */
export type CircularRescueTier = "fresh" | "tier_1" | "tier_2" | "tier_3";

/**
 * Hasil komprehensif evaluasi kinetika peluruhan biologis Arrhenius-Q10 komoditas (PSR-14).
 */
export interface DecayEvaluationResult {
  commodityId: string;
  commodityName: string;
  category: string;
  temperatureC: number;
  humidityPercent: number;
  hoursElapsed: number;
  accelerationFactor: number;
  decayScore: number;
  condition: ProduceCondition;
  recommendedTier: CircularRescueTier;
  tierLabel: string;
  hoursRemaining: number;
  salvageDiscountPercent: number;
  estimatedSalvagePriceIdr: number;
  baseWholesalePriceIdr: number;
  priceFloorIdr: number;
  calculatedAt: string;
}

export interface CalculateDecayRequestPayload {
  commodityId: string;
  hoursElapsed: number;
  temperatureC?: number;
  humidityPercent?: number;
}

/**
 * Hasil verifikasi gerbang kendali mutu etis dan anti-moral hazard (PSR-21).
 */
export interface QualityGateEvaluationResult {
  gateStatus: "passed" | "blocked";
  isHumanConsumable: boolean;
  decayScore: number;
  detectedCondition: ProduceCondition;
  recommendedTier: CircularRescueTier;
  requestedTier: CircularRescueTier;
  isMoralHazardViolation: boolean;
  violationReason?: string;
  correctiveAction?: string;
  socialReservationWindowMinutes?: number;
  auditEventId?: string;
  evaluatedAt: string;
}

/**
 * Parameter payload permintaan verifikasi integritas kelayakan konsumsi manusia (PSR-21).
 */
export interface QualityGateRequestPayload {
  commodityId: string;
  hoursOnDisplay: number;
  requestedTier: CircularRescueTier;
  vendorId?: string;
  temperatureC?: number;
  humidityPercent?: number;
}
