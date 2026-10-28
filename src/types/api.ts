/**
 * PASARIN API Standard Type Definitions
 * Aligned with PRD_FIX_PASARIN.md Section 15.4 (Jira PSR-3 & PSR-4)
 *
 * Provides standardized envelope for all autonomous sub-agent endpoints,
 * scheduled cron runners, health probes, and audit logging.
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

export interface HealthCheckData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  checks: {
    database: 'connected' | 'configured' | 'unconfigured' | 'error';
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
    storage: 'supabase' | 'in_memory';
  };
}

/**
 * Kontrak data telemetri cuaca mikro Pasar Induk Kramat Jati
 * @see Jira Ticket PSR-5 (Hyperlocal Climate Telemetry Agent)
 * @see PRD Section 4.3 & 15.4
 */
export interface WeatherTelemetryData {
  /** Suhu udara aktual dalam derajat Celsius */
  temperatureC: number;
  /** Kelembapan relatif udara dalam persen (0 - 100%) */
  humidityPercent: number;
  /** Estimasi curah hujan per jam dalam satuan milimeter (mm) */
  rainfallMm: number;
  /** Deskripsi kondisi cuaca teks singkat (misal: 'Clouds', 'Rain', 'Clear') */
  weatherCondition: string;
  /** Penanda boolean apakah kondisi cuaca saat ini hujan (memicu redaman pembeli PSR-15) */
  isRaining: boolean;
  /** Koordinat geografis stasiun pengamatan mikro */
  coordinates: {
    latitude: number;
    longitude: number;
    locationName: string;
  };
  /** Status pemenuhan data telemetri: HIT (dari cache memori), MISS (panggilan API baru), atau FALLBACK (darurat offline) */
  source: 'CACHE' | 'LIVE_API' | 'FALLBACK';
  /** Stempel waktu ISO-8601 saat data direkam atau dicache */
  recordedAt: string;
  /** Waktu kedaluwarsa cache dalam ISO-8601 (15 menit pasca perekaman) */
  cacheExpiresAt: string;
  temperatureCelsius: number;
  relativeHumidityPercent: number;
  location: { latitude: number; longitude: number; name?: string };
}

/**
 * Klasifikasi kondisi fisik kesegaran komoditas hortikultura
 * @see PRD Bagian 5.1 & Tiket Jira PSR-14
 */
export type ProduceCondition = 'segar_prima' | 'layu_ringan' | 'layu_sedang' | 'tidak_layak';

/**
 * Tingkatan alokasi penyelamatan pangan sirkular 3-Tier PASARIN
 * @see PRD Bagian 3 & Tiket Jira PSR-14
 */
export type CircularRescueTier = 'fresh' | 'tier_1' | 'tier_2' | 'tier_3';

/**
 * Kontrak data hasil evaluasi kinetika peluruhan biologis komoditas
 * @see Jira Ticket PSR-14 (Biological Shelf-Life Decay Engine)
 * @see PRD Bagian 5.1 & Bagian 15.4.1
 */
export interface DecayEvaluationResult {
  /** ID unik komoditas (misal: 'kangkung', 'bayam') */
  commodityId: string;
  /** Nama lokal komoditas pasar (misal: 'Kangkung Darat') */
  commodityName: string;
  /** Kategori taksonomi pangan */
  category: string;
  /** Suhu lingkungan los pasar yang dievaluasi (°C) */
  temperatureC: number;
  /** Kelembapan relatif los pasar yang dievaluasi (%) */
  humidityPercent: number;
  /** Durasi waktu komoditas terpapar di meja los pasar sejak subuh (jam) */
  hoursElapsed: number;
  /** Laju percepatan metabolisme respirasi seluler efektif (pengali terhadap baseline 20°C) */
  accelerationFactor: number;
  /** Nilai skor kebusukan fisik terakumulasi dalam rentang 0.0000 s/d 1.0000 */
  decayScore: number;
  /** Klasifikasi mutu fisik saat ini */
  condition: ProduceCondition;
  /** Rekomendasi tingkatan penyelamatan 3-Tier */
  recommendedTier: CircularRescueTier;
  /** Label deskripsi tingkatan penyelamatan untuk antarmuka pengguna */
  tierLabel: string;
  /** Estimasi sisa jam simpan aman sebelum komoditas membusuk total (jam) */
  hoursRemaining: number;
  /** Rekomendasi persentase potongan harga penyelamatan (0% - 95%) */
  salvageDiscountPercent: number;
  /** Estimasi harga tebusan penyelamatan per kilogram dengan proteksi Price Floor (Rp/kg) */
  estimatedSalvagePriceIdr: number;
  /** Harga modal kulakan subuh acuan (Rp/kg) */
  baseWholesalePriceIdr: number;
  /** Batas bawah harga tebus mutlak terlindungi (Rp/kg) */
  priceFloorIdr: number;
  /** Stempel waktu ISO-8601 kalkulasi kinetika dieksekusi */
  calculatedAt: string;
}

/**
 * Parameter masukan permintaan evaluasi kinetika peluruhan
 */
export interface CalculateDecayRequestPayload {
  commodityId: string;
  hoursElapsed: number;
  temperatureC?: number;
  humidityPercent?: number;
}
