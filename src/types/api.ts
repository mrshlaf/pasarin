// Kontrak tipe data API & domain PASARIN

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

export interface SystemAuditTrailRecord {
  event_id: string;
  subsystem: string;
  action_type: string;
  payload_json: Record<string, unknown>;
  execution_duration_ms?: number;
  occurred_at: string;
}

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

// Telemetri cuaca mikro Pasar Kramat Jati (PSR-5)
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
  source: "CACHE" | "LIVE_API" | "FALLBACK";
  recordedAt: string;
  cacheExpiresAt: string;
  temperatureCelsius: number;
  relativeHumidityPercent: number;
  location: { latitude: number; longitude: number; name?: string };
}

// Kondisi fisik mutu sayuran (segar, layu ringan, layu sedang, afkir/maggot)
export type ProduceCondition = "segar_prima" | "layu_ringan" | "layu_sedang" | "tidak_layak";

// Alokasi penyelamatan sirkular 3-Tier
export type CircularRescueTier = "fresh" | "tier_1" | "tier_2" | "tier_3";

// Hasil kalkulasi kinetika peluruhan Arrhenius-Q10 (PSR-14)
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
