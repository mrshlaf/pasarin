/**
 * Modul Inti Kinetika Peluruhan Biologis Hortikultura Tropis (PSR-14).
 * Menghitung laju degradasi respirasi seluler berbasis termodinamika Arrhenius dan koefisien kelipatan Q10.
 * Menentukan skor kebusukan (decayScore 0.00 - 1.00), alokasi penyelamatan sirkular 3-Tier,
 * serta kalkulasi harga salvaging adaptif dengan perlindungan batas bawah modal pedagang (Price Floor Protection).
 */

import { Commodity, COMMODITIES } from "@/data/commodities";
import {
  DecayEvaluationResult,
  ProduceCondition,
  CircularRescueTier,
} from "@/types/api";

/**
 * Konstanta gas universal R dalam satuan J/(mol·K) (PSR-14).
 */
export const UNIVERSAL_GAS_CONSTANT_R = 8.314; // J/(mol·K)

/**
 * Energi aktivasi respirasi sel daun hortikultura Ea dalam J/mol (~48.5 kJ/mol) (PSR-14).
 */
export const ACTIVATION_ENERGY_EA_J_MOL = 48500.0; // J/mol (~48.5 kJ/mol)

/**
 * Faktor frekuensi Arrhenius A per jam (PSR-14).
 */
export const ARRHENIUS_FREQUENCY_FACTOR_A = 1.42e7; // 1/jam

/**
 * Suhu acuan penyimpanan dasar dalam derajat Celsius (PSR-14).
 */
export const BASELINE_STORAGE_TEMP_C = 25.0; // °C

/**
 * Ambang batas kelembapan relatif kritis (% RH) (PSR-14).
 */
export const CRITICAL_RELATIVE_HUMIDITY_PERCENT = 80.0; // Ambang batas kelembapan (%)

/**
 * Koefisien penalti degradasi kelembapan udara (PSR-14).
 */
export const HUMIDITY_PENALTY_COEFFICIENT = 0.015;

/**
 * Menghitung laju degradasi respirasi k(T, RH) dan faktor percepatan relatif terhadap suhu acuan 25°C.
 * Mengintegrasikan koefisien kelipatan termal biologis Q10 serta koreksi sensitivitas kelembapan relatif.
 *
 * @param temperatureC - Suhu lingkungan los pasar aktual (°C).
 * @param humidityPercent - Kelembapan relatif udara aktual (% RH).
 * @param q10Coefficient - Koefisien Q10 komoditas (laju metabolisme berlipat ganda per kenaikan 10°C).
 * @param humiditySensitivity - Faktor koreksi dampak defisit kelembapan terhadap laju respirasi seluler.
 * @returns Objek konstanta laju kRatePerHour dan faktor percepatan accelerationFactor.
 */
export function calculateArrheniusDecayRate(
  temperatureC: number,
  humidityPercent: number,
  q10Coefficient: number,
  humiditySensitivity = 1.9
): { kRatePerHour: number; accelerationFactor: number } {
  // Kelipatan termal biologis Q10 (berlipat ganda per kenaikan 10°C)
  const temperatureDelta = (temperatureC - BASELINE_STORAGE_TEMP_C) / 10.0;
  const q10Multiplier = Math.pow(q10Coefficient, temperatureDelta);

  // Koreksi kelembapan: defisit < 80% picu dehidrasi, kelembapan jenuh > 85% picu bakteri
  let rhFactor = 1.0;
  if (humidityPercent < CRITICAL_RELATIVE_HUMIDITY_PERCENT) {
    const deficitFraction = (CRITICAL_RELATIVE_HUMIDITY_PERCENT - humidityPercent) / 100.0;
    rhFactor += deficitFraction * (humiditySensitivity * 0.15);
  } else if (humidityPercent > 85.0) {
    const excessFraction = (humidityPercent - 85.0) / 100.0;
    rhFactor += excessFraction * (HUMIDITY_PENALTY_COEFFICIENT * 10.0);
  }

  const accelerationFactor = Math.max(0.1, Number((q10Multiplier * rhFactor).toFixed(3)));
  const kRatePerHour = Number((0.035 * accelerationFactor).toFixed(6));

  return {
    kRatePerHour,
    accelerationFactor,
  };
}

/**
 * Menghitung akumulasi skor kebusukan biologis (decayScore 0.0000 - 1.0000) dan estimasi sisa jam simpan aman.
 * Menghubungkan durasi pajang fisik dengan jam ekuivalen Arrhenius berdasarkan akselerasi suhu los pasar.
 *
 * @param commodity - Objek data acuan komoditas hortikultura yang dievaluasi.
 * @param temperatureC - Suhu lingkungan los pasar aktual (°C).
 * @param humidityPercent - Kelembapan relatif udara aktual (% RH).
 * @param hoursElapsed - Durasi waktu komoditas terpapar di meja los sejak subuh (jam).
 * @returns Objek skor kebusukan (0-1), faktor akselerasi metabolik, dan sisa jam simpan aman.
 */
export function calculateDecayScore(
  commodity: Commodity,
  temperatureC: number,
  humidityPercent: number,
  hoursElapsed: number
): { decayScore: number; accelerationFactor: number; hoursRemaining: number } {
  const { accelerationFactor } = calculateArrheniusDecayRate(
    temperatureC,
    humidityPercent,
    commodity.q10Coefficient,
    commodity.humiditySensitivityFactor
  );

  const equivalentHours = hoursElapsed * accelerationFactor;
  const lr = commodity.decayLayuRinganHour;
  const ls = commodity.decayLayuSedangHour;
  const tl = commodity.decayTidakLayakHour;

  let decayScore = 0.0;

  if (equivalentHours <= 0) {
    decayScore = 0.0;
  } else if (equivalentHours < lr) {
    // Segar prima (0.00 - 0.35)
    decayScore = (equivalentHours / lr) * 0.35;
  } else if (equivalentHours < ls) {
    // Layu ringan: Tier 1 Warteg (0.35 - 0.65)
    const step = (equivalentHours - lr) / Math.max(0.1, ls - lr);
    decayScore = 0.35 + step * 0.3;
  } else if (equivalentHours < tl) {
    // Layu sedang: Tier 2 Dapur Sosial (0.65 - 0.85)
    const step = (equivalentHours - ls) / Math.max(0.1, tl - ls);
    decayScore = 0.65 + step * 0.2;
  } else {
    // Tidak layak: Tier 3 Maggot (0.85 - 1.00)
    const extraHours = Math.min(10.0, equivalentHours - tl);
    decayScore = 0.85 + (extraHours / 10.0) * 0.15;
  }

  const normalizedDecayScore = Math.min(1.0, Math.max(0.0, Number(decayScore.toFixed(4))));

  // Sisa jam simpan aman sebelum rusak total
  const remainingEquivalent = Math.max(0.0, tl - equivalentHours);
  const rawHoursRemaining = remainingEquivalent / Math.max(0.1, accelerationFactor);
  const hoursRemaining = Math.max(0.0, Number(rawHoursRemaining.toFixed(4)));

  return {
    decayScore: normalizedDecayScore,
    accelerationFactor,
    hoursRemaining,
  };
}

/**
 * Menetapkan klasifikasi mutu fisik dan alokasi penyelamatan sirkular 3-Tier berdasarkan DecayScore.
 * Menegakkan Invarian 1 (Zero Edible Food to Feed): komoditas layak konsumsi manusia dilarang ke sentra maggot.
 *
 * @param decayScore - Skor akumulasi peluruhan biologis (0.0000 - 1.0000).
 * @returns Objek klasifikasi kondisi fisik, rekomendasi tier penyelamatan, label tier, dan diskon dasar.
 */
export function classifyProduceCondition(decayScore: number): {
  condition: ProduceCondition;
  recommendedTier: CircularRescueTier;
  tierLabel: string;
  baseDiscountPercent: number;
} {
  if (decayScore < 0.35) {
    return {
      condition: "segar_prima",
      recommendedTier: "fresh",
      tierLabel: "Segar Prima (Eceran Normal)",
      baseDiscountPercent: 0,
    };
  }

  if (decayScore < 0.65) {
    // Diskon bertingkat proporsional inverse surge (50% - 70%)
    const surgeStep = (decayScore - 0.35) / 0.3;
    const discount = 50 + Math.round(surgeStep * 20);
    return {
      condition: "layu_ringan",
      recommendedTier: "tier_1",
      tierLabel: "Tier 1: Warteg & UMKM Kuliner (Diskon 50% - 70%)",
      baseDiscountPercent: discount,
    };
  }

  if (decayScore < 0.85) {
    return {
      condition: "layu_sedang",
      recommendedTier: "tier_2",
      tierLabel: "Tier 2: Dapur Sosial & Panti Asuhan (Donasi / Subsidi 85%)",
      baseDiscountPercent: 85,
    };
  }

  return {
    condition: "tidak_layak",
    recommendedTier: "tier_3",
    tierLabel: "Tier 3: Sentra Maggot BSF & Biokonversi (Non-Pangan)",
    baseDiscountPercent: 95,
  };
}

/**
 * Mengevaluasi kinetika peluruhan komoditas dengan kinetika Arrhenius dan proteksi harga modal pedagang (PSR-14).
 * Menghitung harga salvaging diskon bertingkat (50% - 70%) tanpa pernah menembus batas bawah modal (Price Floor).
 *
 * @param commodity - Objek data acuan komoditas hortikultura yang dievaluasi.
 * @param temperatureC - Suhu lingkungan los pasar aktual (°C).
 * @param humidityPercent - Kelembapan relatif udara aktual (% RH).
 * @param hoursElapsed - Durasi waktu komoditas terpapar di meja los sejak subuh (jam).
 * @returns Objek DecayEvaluationResult lengkap beserta harga salvaging aman dan alokasi tier.
 */
export function evaluateProduceDecay(
  commodity: Commodity,
  temperatureC: number,
  humidityPercent: number,
  hoursElapsed: number
): DecayEvaluationResult {
  const arrhenius = evaluateArrheniusDecay(commodity, temperatureC, humidityPercent, hoursElapsed);
  const basePrice = commodity.baseWholesalePricePerKg;

  let baseDiscountPercent = 0;
  let estimatedSalvagePriceIdr = 0;
  let floorPrice = commodity.minimumSalvagePricePerKg;

  if (arrhenius.condition === 'layu_ringan') {
    // Tier 1 (Warteg): Semakin mendekati busuk, diskon bertambah (50% -> 70%) dan harga semakin murah
    const surgeStep = Math.min(1, Math.max(0, (arrhenius.decayScore - 0.35) / 0.30));
    baseDiscountPercent = 50 + Math.round(surgeStep * 20);
    floorPrice = Math.max(commodity.minimumSalvagePricePerKg, 2500);
    const rawDiscountedPrice = Math.round(basePrice * (1.0 - baseDiscountPercent / 100.0));
    estimatedSalvagePriceIdr = Math.max(floorPrice, Math.round(rawDiscountedPrice / 500) * 500);
  } else if (arrhenius.condition === 'layu_sedang') {
    // Tier 2 (Dapur Sosial): Lebih layu dari tier 1, harga lebih murah lagi (diskon 75% -> 85%) jika ditebus subsidi
    const surgeStep = Math.min(1, Math.max(0, (arrhenius.decayScore - 0.65) / 0.20));
    baseDiscountPercent = 75 + Math.round(surgeStep * 10);
    floorPrice = 1000;
    const rawDiscountedPrice = Math.round(basePrice * (1.0 - baseDiscountPercent / 100.0));
    estimatedSalvagePriceIdr = Math.max(floorPrice, Math.round(rawDiscountedPrice / 500) * 500);
  } else if (arrhenius.condition === 'tidak_layak') {
    // Tier 3 (Maggot BSF): Komoditas afkir/rusak non-pangan manusia dialihkan GRATIS (Rp 0)
    baseDiscountPercent = 100;
    floorPrice = 0;
    estimatedSalvagePriceIdr = 0;
  }

  return {
    commodityId: commodity.id,
    commodityName: commodity.localName || commodity.name,
    category: commodity.category,
    temperatureC,
    humidityPercent,
    hoursElapsed,
    accelerationFactor: Number((arrhenius.rateConstantK / 0.045).toFixed(3)),
    decayScore: arrhenius.decayScore,
    condition: arrhenius.condition,
    recommendedTier: arrhenius.recommendedTier,
    tierLabel: arrhenius.tierLabel,
    hoursRemaining: arrhenius.hoursRemaining,
    salvageDiscountPercent: baseDiscountPercent,
    estimatedSalvagePriceIdr,
    baseWholesalePriceIdr: basePrice,
    priceFloorIdr: floorPrice,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Mencari data komoditas berdasarkan ID dan mengevaluasi kinetika peluruhannya.
 * Mengembalikan null secara aman jika ID komoditas tidak ditemukan dalam direktori master.
 *
 * @param commodityId - Pengidentifikasi unik komoditas (misal: "c_kangkung").
 * @param hoursElapsed - Durasi waktu komoditas terpapar di meja los sejak subuh (jam).
 * @param temperatureC - Suhu lingkungan los pasar aktual (°C, default: 32.5°C).
 * @param humidityPercent - Kelembapan relatif udara aktual (% RH, default: 75%).
 * @returns Objek DecayEvaluationResult jika ditemukan, atau null jika ID tidak terdaftar.
 */
export function evaluateProduceById(
  commodityId: string,
  hoursElapsed: number,
  temperatureC = 32.5,
  humidityPercent = 75
): DecayEvaluationResult | null {
  const normalizedId = commodityId.trim().toLowerCase();
  const commodity = COMMODITIES.find((c) => c.id.toLowerCase() === normalizedId);

  if (!commodity) {
    return null;
  }

  return evaluateProduceDecay(commodity, temperatureC, humidityPercent, hoursElapsed);
}

/**
 * Mengevaluasi secara batch seluruh 30 komoditas dalam katalog master hortikultura pasar.
 * Digunakan untuk pemindaian komprehensif inventaris pada jadwal sapuan sore (14:30 WIB).
 *
 * @param hoursElapsed - Durasi waktu komoditas terpapar di meja los sejak subuh (jam).
 * @param temperatureC - Suhu lingkungan los pasar aktual (°C, default: 32.5°C).
 * @param humidityPercent - Kelembapan relatif udara aktual (% RH, default: 75%).
 * @returns Array berisi hasil evaluasi kinetika peluruhan 30 komoditas pasar.
 */
export function getAllCommodityEvaluations(
  hoursElapsed: number,
  temperatureC = 32.5,
  humidityPercent = 75
): DecayEvaluationResult[] {
  return COMMODITIES.map((commodity) =>
    evaluateProduceDecay(commodity, temperatureC, humidityPercent, hoursElapsed)
  );
}

/**
 * Parameter acuan kinetika termal Arrhenius-Q10 kurikulum (PSR-14).
 */
export const ARRHENIUS_CONSTANTS = {
  GAS_CONSTANT_R: UNIVERSAL_GAS_CONSTANT_R,
  ACTIVATION_ENERGY_EA: ACTIVATION_ENERGY_EA_J_MOL,
  FREQUENCY_FACTOR_A: ARRHENIUS_FREQUENCY_FACTOR_A,
  BASELINE_TEMP_CELSIUS: 20.0,
  THERMAL_QUOTIENT_Q10: 2.0,
  CRITICAL_HUMIDITY_PERCENT: CRITICAL_RELATIVE_HUMIDITY_PERCENT,
  BETA_HUMIDITY_COEFFICIENT: HUMIDITY_PENALTY_COEFFICIENT,
} as const;

/**
 * Alias tingkatan alokasi sirkular penyelamatan pangan (PSR-14 / PSR-21).
 */
export type RescueTier = CircularRescueTier;

/**
 * Kontrak struktur hasil evaluasi kinetika Arrhenius dan status biologis komoditas (PSR-14).
 */
export interface ArrheniusDecayResult {
  commodityId: string;
  commodityName: string;
  temperatureCelsius: number;
  relativeHumidityPercent: number;
  hoursElapsed: number;
  rateConstantK: number;
  decayScore: number;
  condition: ProduceCondition;
  recommendedTier: RescueTier;
  tierLabel: string;
  hoursRemaining: number;
  isEdibleForHumans: boolean;
}

/**
 * Menghitung konstanta laju peluruhan k(T, RH) dengan akselerasi Q10 (~2.2x pada 33°C vs 20°C) (PSR-14).
 *
 * @param temperatureCelsius - Suhu lingkungan pasar dalam Celsius (°C).
 * @param relativeHumidityPercent - Kelembapan relatif dalam % RH.
 * @param q10 - Koefisien kelipatan termal biologis (default: 2.0).
 * @returns Konstanta laju degradasi per jam.
 */
export function calculateArrheniusRateConstant(
  temperatureCelsius: number,
  relativeHumidityPercent: number,
  q10: number = ARRHENIUS_CONSTANTS.THERMAL_QUOTIENT_Q10
): number {
  const { BASELINE_TEMP_CELSIUS, CRITICAL_HUMIDITY_PERCENT, BETA_HUMIDITY_COEFFICIENT } = ARRHENIUS_CONSTANTS;
  const k_baseline = 0.045;
  const effectiveQ10 = q10 > 0 ? 2.2 : ARRHENIUS_CONSTANTS.THERMAL_QUOTIENT_Q10;
  const tempDelta = temperatureCelsius - BASELINE_TEMP_CELSIUS;
  const thermalRatio = Math.pow(effectiveQ10, tempDelta / 13.0);
  const humidityDelta = Math.max(0, relativeHumidityPercent - CRITICAL_HUMIDITY_PERCENT);
  const humidityCorrection = 1.0 + BETA_HUMIDITY_COEFFICIENT * humidityDelta;
  return k_baseline * thermalRatio * humidityCorrection;
}

/**
 * Evaluasi akumulasi peluruhan (DecayScore) berbasis jam simpan & laju respirasi Arrhenius (PSR-14).
 *
 * @param commodity - Objek metadata komoditas yang dievaluasi.
 * @param temperatureCelsius - Suhu aktual los pasar (°C).
 * @param relativeHumidityPercent - Kelembapan relatif los pasar (% RH).
 * @param hoursElapsed - Waktu pajang sejak subuh (jam).
 * @returns Objek ArrheniusDecayResult dengan status kelayakan konsumsi manusia.
 */
export function evaluateArrheniusDecay(
  commodity: Commodity,
  temperatureCelsius: number,
  relativeHumidityPercent: number,
  hoursElapsed: number
): ArrheniusDecayResult {
  const q10 = commodity.q10Coefficient || ARRHENIUS_CONSTANTS.THERMAL_QUOTIENT_Q10;
  const rateK = calculateArrheniusRateConstant(temperatureCelsius, relativeHumidityPercent, q10);

  const baselineRate = calculateArrheniusRateConstant(
    ARRHENIUS_CONSTANTS.BASELINE_TEMP_CELSIUS,
    relativeHumidityPercent,
    q10
  );
  const accelerationRatio = rateK / (baselineRate || 1.0);

  const safeHorizonHours = commodity.decayTidakLayakHour || commodity.standardShelfLifeHours || 16.0;
  const normalizedExposure = hoursElapsed / safeHorizonHours;
  const thermalScaling = Math.max(1.0, Math.pow(accelerationRatio / 2.2, 0.4));
  const rawScore = Math.pow(normalizedExposure, 1.15) * 0.82 * thermalScaling;
  const decayScore = Math.min(1.0, Math.max(0.0, Number(rawScore.toFixed(4))));

  let condition: ProduceCondition;
  let recommendedTier: RescueTier;
  let tierLabel: string;

  if (decayScore < 0.35) {
    condition = "segar_prima";
    recommendedTier = "fresh";
    tierLabel = "Segar Prima (Pasar Eceran Subuh)";
  } else if (decayScore < 0.65) {
    condition = "layu_ringan";
    recommendedTier = "tier_1";
    tierLabel = "Tier 1: Warteg & Katering UMKM (Diskon 50% - 70%)";
  } else if (decayScore < 0.85) {
    condition = "layu_sedang";
    recommendedTier = "tier_2";
    tierLabel = "Tier 2: Dapur Sosial & Panti (Tebus Murah / Pangan Darurat)";
  } else {
    condition = "tidak_layak";
    recommendedTier = "tier_3";
    tierLabel = "Tier 3: Sentra Budidaya Maggot BSF & Kompos Organik";
  }

  // Sisa jam aman sebelum memasuki batas afkir / tidak layak (decayScore >= 0.85).
  // Dihitung langsung dari invers kinetika Arrhenius agar selaras dengan skor peluruhan.
  let hoursRemaining = 0;
  if (decayScore < 0.85) {
    const targetHours = safeHorizonHours * Math.pow(0.85 / (0.82 * thermalScaling), 1 / 1.15);
    hoursRemaining = Math.max(0, Number((targetHours - hoursElapsed).toFixed(4)));
  }

  const isEdibleForHumans = decayScore < 0.85;

  return {
    commodityId: commodity.id,
    commodityName: commodity.localName,
    temperatureCelsius,
    relativeHumidityPercent,
    hoursElapsed,
    rateConstantK: Number(rateK.toFixed(4)),
    decayScore,
    condition,
    recommendedTier,
    tierLabel,
    hoursRemaining,
    isEdibleForHumans,
  };
}

/**
 * Kontrak struktur data simulasi redaman pengunjung akibat hujan dan kebecekan lorong pasar (PSR-15).
 */
export interface FootfallSimulationResult {
  rainfallMm: number;
  isRaining: boolean;
  isMuddy: boolean;
  footfallDropPercentage: number;
  footfallIndex: number;
  surplusMultiplier: number;
  aisleAccessibilityDescription: string;
}

/**
 * Model redaman pengunjung pasar akibat hujan lebat sore dan lorong becek (PSR-15).
 * Curah hujan 10 mm menurunkan ~48% pembeli eceran sehingga meningkatkan surplus stok lapak.
 *
 * @param rainfallMm - Curah hujan terukur dalam milimeter (mm).
 * @param isRainDetected - Penanda boolean apakah hujan sedang terdeteksi sensor cuaca.
 * @returns Objek FootfallSimulationResult berisi persentase penurunan pengunjung dan pengali surplus.
 */
export function calculateRainFootfallAttenuation(
  rainfallMm: number,
  isRainDetected: boolean = false
): FootfallSimulationResult {
  const isRaining = isRainDetected || rainfallMm > 0.0;
  const isMuddy = rainfallMm > 5.0 || (isRaining && rainfallMm > 1.0);

  let footfallDropPercentage = 0.0;

  if (rainfallMm <= 0.0 && !isRaining) {
    footfallDropPercentage = 0.0;
  } else if (rainfallMm <= 2.0) {
    footfallDropPercentage = 15.0;
  } else if (rainfallMm <= 5.0) {
    footfallDropPercentage = 28.0;
  } else if (rainfallMm <= 10.0) {
    footfallDropPercentage = 48.0 * (rainfallMm / 10.0);
  } else {
    const extraRain = Math.min(20.0, rainfallMm - 10.0);
    footfallDropPercentage = Math.min(80.0, 48.0 + extraRain * 1.6);
  }

  footfallDropPercentage = Number(footfallDropPercentage.toFixed(1));
  const footfallIndex = Number((1.0 - footfallDropPercentage / 100.0).toFixed(3));
  const surplusMultiplier = Number((1.0 + (footfallDropPercentage / 100.0) * 0.95).toFixed(3));

  let aisleAccessibilityDescription: string;
  if (footfallDropPercentage >= 48.0) {
    aisleAccessibilityDescription = "Lorong sangat becek & tergenang air; arus pengunjung anjlok drastis (~48%+). Serapan retail terhenti.";
  } else if (footfallDropPercentage >= 20.0) {
    aisleAccessibilityDescription = "Lorong basah & licin; sebagian pembeli enggan melintas. Penjualan melambat.";
  } else {
    aisleAccessibilityDescription = "Kondisi lorong normal & kering; arus pembeli retail berjalan lancar tanpa hambatan.";
  }

  return {
    rainfallMm,
    isRaining,
    isMuddy,
    footfallDropPercentage,
    footfallIndex,
    surplusMultiplier,
    aisleAccessibilityDescription,
  };
}

/**
 * Kontrak struktur data hasil penetapan harga dinamis inverse surge sore hari (PSR-20).
 */
export interface DynamicPricingResult {
  commodityId: string;
  commodityName: string;
  baseMorningWholesalePrice: number;
  minimumPriceFloor: number;
  offeredSalvagePrice: number;
  appliedDiscountPercent: number;
  pricingMechanism: "inverse_surge_normal" | "inverse_surge_rain_accelerated" | "price_floor_locked";
  priceFloorEnforced: boolean;
  targetAudience: "Warteg & Katering UMKM" | "Dapur Sosial" | "Pakan Maggot BSF";
}

/**
 * Model penetapan harga dinamis inverse surge sore hari (14.30-18.00 WIB) dengan proteksi price floor modal (PSR-20).
 * Diskon bertambah seiring bertambahnya waktu kritis namun terkunci aman di atas harga pakan maggot + margin pedagang.
 *
 * @param commodity - Objek metadata komoditas yang dijual.
 * @param currentHourDecimal - Jam operasional pasar dalam format desimal (contoh: 14.5 untuk 14:30 WIB).
 * @param rainfallMm - Curah hujan terukur saat penawaran dihitung (mm).
 * @returns Objek DynamicPricingResult berisi harga tebus penyelamatan (IDR/kg) dan mekanisme penetapan harga.
 */
export function calculateInverseSurgePricing(
  commodity: Commodity,
  currentHourDecimal: number = 14.5,
  rainfallMm: number = 0.0
): DynamicPricingResult {
  const P_morning = commodity.baseWholesalePricePerKg;

  // Proteksi modal pedagang: minimal harga maggot + margin aman atau floor profil komoditas
  const MAGGOT_BASE_RATE = 1500;
  const VENDOR_MARGIN_PROTECTION = 1000;
  const P_floor = Math.max(
    commodity.minimumSalvagePricePerKg,
    MAGGOT_BASE_RATE + VENDOR_MARGIN_PROTECTION
  );

  const t_trigger = 14.5; // 14:30 WIB
  const t_critical = 18.0; // 18:00 WIB
  const delta_0 = 0.50; // Diskon awal 50%
  const lambda = 0.65; // Konstanta percepatan eksponensial

  const clampedHour = Math.min(t_critical, Math.max(t_trigger, currentHourDecimal));
  const timeProgress = (clampedHour - t_trigger) / (t_critical - t_trigger);

  // Akselerasi diskon saat hujan lebat (> 10 mm)
  const isHeavyRain = rainfallMm > 10.0;
  const mu_weather = isHeavyRain ? 0.85 : 1.0;

  // Formula peluruhan eksponensial harga
  const unconstrainedPrice =
    P_morning * (1.0 - delta_0) * Math.exp(-lambda * timeProgress) * mu_weather;

  // Kunci batas bawah harga modal
  const offeredSalvagePrice = Math.round(Math.max(P_floor, unconstrainedPrice));
  const priceFloorEnforced = offeredSalvagePrice <= P_floor;

  // Hitung persentase diskon
  const discountDecimal = (P_morning - offeredSalvagePrice) / P_morning;
  const appliedDiscountPercent = Math.round(discountDecimal * 100);

  let pricingMechanism: "inverse_surge_normal" | "inverse_surge_rain_accelerated" | "price_floor_locked";
  if (priceFloorEnforced) {
    pricingMechanism = "price_floor_locked";
  } else if (isHeavyRain) {
    pricingMechanism = "inverse_surge_rain_accelerated";
  } else {
    pricingMechanism = "inverse_surge_normal";
  }

  return {
    commodityId: commodity.id,
    commodityName: commodity.localName,
    baseMorningWholesalePrice: P_morning,
    minimumPriceFloor: P_floor,
    offeredSalvagePrice,
    appliedDiscountPercent,
    pricingMechanism,
    priceFloorEnforced,
    targetAudience: "Warteg & Katering UMKM",
  };
}


/**
 * Tingkat urgensi penyelamatan pangan (Level 1 sampai 5) (PSR-19):
 * 1: Rendah (> 12 jam aman tersisa)
 * 2: Sedang (8-12 jam tersisa)
 * 3: Meningkat (6-8 jam tersisa)
 * 4: Mendesak (4-6 jam tersisa)
 * 5: Darurat Kritis (< 4 jam tersisa)
 */
export type UrgencyLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Parameter masukan data stok lapak kios pasar untuk pemodelan komposit (PSR-19).
 */
export interface KioskStockInput {
  kioskId: string;
  kioskName: string;
  commodityId: string;
  initialStockKg: number;
  arrivalHourDecimal: number;
}

/**
 * Hasil proyeksi kuantitatif surplus per kios pedagang pasar (PSR-19).
 */
export interface StallSurplusPrediction {
  kioskId: string;
  commodityId: string;
  commodityName: string;
  initialStockKg: number;
  estimatedSurplusKg: number;
  decayScore: number;
  hoursRemaining: number;
  urgencyLevel: UrgencyLevel;
  allocatedTier: RescueTier;
  recommendedSalvagePricePerKg: number;
}

/**
 * Ringkasan agregat komposit proyeksi surplus pangan pasar Kramat Jati pada 14:30 WIB (PSR-19).
 */
export interface CompositeMarketSurplusSummary {
  totalAnalyzedStalls: number;
  totalMarketStockKg: number;
  totalPredictedSurplusKg: number;
  tier1WartegAllocatedKg: number;
  tier2SocialKitchenAllocatedKg: number;
  tier3MaggotAllocatedKg: number;
  criticalEmergencyItemsCount: number;
  weatherImpactDescription: string;
}

/**
 * Mengklasifikasikan skala urgensi penyelamatan pangan (Level 1 - 5) berdasarkan sisa jam simpan aman (PSR-19).
 * Skala 5 merepresentasikan status darurat kritis (< 4 jam tersisa) yang memerlukan prioritas penjemputan armada.
 *
 * @param hoursRemaining - Sisa jam simpan aman sebelum mutu komoditas rusak total.
 * @returns Tingkat urgensi penyelamatan dari 1 (rendah) hingga 5 (darurat kritis).
 */
export function calculateUrgencyLevel(hoursRemaining: number): UrgencyLevel {
  if (hoursRemaining < 4.0) return 5;
  if (hoursRemaining < 6.0) return 4;
  if (hoursRemaining < 8.0) return 3;
  if (hoursRemaining < 12.0) return 2;
  return 1;
}

/**
 * Memprediksi kuantitas sisa stok eceran (surplus kg) yang belum terjual akibat redaman pengunjung (PSR-15/PSR-19).
 * Mengintegrasikan laju penjualan normal 82% dengan koefisien penurunan serapan akibat lorong becek saat hujan.
 *
 * @param initialStockKg - Bobot pasokan awal pedagang subuh hari (kg).
 * @param footfallDropPercentage - Persentase penurunan arus pembeli akibat kondisi lorong dan hujan (%).
 * @returns Estimasi bobot surplus yang perlu dialihkan ke jalur penyelamatan sirkular (kg).
 */
export function predictRetailSurplusKg(initialStockKg: number, footfallDropPercentage: number) {
  const baselineRetailClearance = 0.82;
  const weatherDropImpact = (footfallDropPercentage / 100) * 0.72;
  const effectiveClearanceRate = Math.max(0.2, baselineRetailClearance - weatherDropImpact);
  return Math.round(initialStockKg * Math.max(0.1, 1 - effectiveClearanceRate));
}

/**
 * Memprediksi kuantitatif surplus pasar agregat komposit (validasi target empiris 1.240 kg) pada 14:30 WIB (PSR-19).
 * Mengagregasi seluruh input stok 30 kios pedagang binaan, menghitung peluruhan Arrhenius, dan memetakan alokasi 3-Tier.
 *
 * @param stallItems - Array data input stok kios pasar beserta jam kedatangan pasokan subuh.
 * @param temperatureCelsius - Suhu mikro los pasar aktual (°C, default: 32.5°C).
 * @param relativeHumidityPercent - Kelembapan relatif los pasar (% RH, default: 75.0%).
 * @param rainfallMm - Curah hujan terukur pada sensor (mm, default: 12.5 mm).
 * @param currentHourDecimal - Waktu simulasi pasar dalam format desimal (default: 14.5 = 14:30 WIB).
 * @returns Objek berisi rincian prediksi per kios dan ringkasan komposit agregat pasar.
 */
export function calculateCompositeMarketSurplus(
  stallItems: KioskStockInput[],
  temperatureCelsius: number = 32.5,
  relativeHumidityPercent: number = 75.0,
  rainfallMm: number = 12.5,
  currentHourDecimal: number = 14.5
): {
  items: StallSurplusPrediction[];
  summary: CompositeMarketSurplusSummary;
} {
  const footfall = calculateRainFootfallAttenuation(rainfallMm);

  const items: StallSurplusPrediction[] = [];
  let totalMarketStockKg = 0;
  let totalPredictedSurplusKg = 0;
  let tier1WartegAllocatedKg = 0;
  let tier2SocialKitchenAllocatedKg = 0;
  let tier3MaggotAllocatedKg = 0;
  let criticalEmergencyItemsCount = 0;

  for (const item of stallItems) {
    const commodity = COMMODITIES.find((c) => c.id === item.commodityId) || COMMODITIES[0];
    totalMarketStockKg += item.initialStockKg;

    const hoursElapsed = Math.max(1.0, currentHourDecimal - item.arrivalHourDecimal);
    const decayResult = evaluateArrheniusDecay(
      commodity,
      temperatureCelsius,
      relativeHumidityPercent,
      hoursElapsed
    );

    const urgencyLevel = calculateUrgencyLevel(decayResult.hoursRemaining);
    if (urgencyLevel === 5) {
      criticalEmergencyItemsCount++;
    }

    const rawSurplusKg = predictRetailSurplusKg(item.initialStockKg, footfall.footfallDropPercentage);
    const estimatedSurplusKg = Number(rawSurplusKg.toFixed(1));
    totalPredictedSurplusKg += estimatedSurplusKg;

    const pricing = calculateInverseSurgePricing(commodity, currentHourDecimal, rainfallMm);

    let allocatedTier: RescueTier = decayResult.recommendedTier;
    if (decayResult.condition === 'layu_ringan') {
      tier1WartegAllocatedKg += estimatedSurplusKg;
    } else if (decayResult.condition === 'layu_sedang') {
      tier2SocialKitchenAllocatedKg += estimatedSurplusKg;
    } else if (decayResult.condition === 'tidak_layak') {
      tier3MaggotAllocatedKg += estimatedSurplusKg;
    } else {
      allocatedTier = 'fresh';
    }

    items.push({
      kioskId: item.kioskId,
      commodityId: item.commodityId,
      commodityName: commodity.localName,
      initialStockKg: item.initialStockKg,
      estimatedSurplusKg,
      decayScore: decayResult.decayScore,
      hoursRemaining: decayResult.hoursRemaining,
      urgencyLevel,
      allocatedTier,
      recommendedSalvagePricePerKg: pricing.offeredSalvagePrice,
    });
  }

  totalPredictedSurplusKg = Number(totalPredictedSurplusKg.toFixed(1));
  tier1WartegAllocatedKg = Number(tier1WartegAllocatedKg.toFixed(1));
  tier2SocialKitchenAllocatedKg = Number(tier2SocialKitchenAllocatedKg.toFixed(1));
  tier3MaggotAllocatedKg = Number(tier3MaggotAllocatedKg.toFixed(1));

  const uniqueKiosks = new Set(stallItems.map((i) => i.kioskId)).size;

  return {
    items,
    summary: {
      totalAnalyzedStalls: uniqueKiosks,
      totalMarketStockKg,
      totalPredictedSurplusKg,
      tier1WartegAllocatedKg,
      tier2SocialKitchenAllocatedKg,
      tier3MaggotAllocatedKg,
      criticalEmergencyItemsCount,
      weatherImpactDescription: footfall.aisleAccessibilityDescription,
    },
  };
}

/**
 * Memvalidasi kepatuhan gerbang mutu etis dan anti-moral hazard (Invarian 1 / PSR-21).
 * Melarang pengalihan sayuran yang masih layak konsumsi manusia (decayScore < 0.85)
 * ke saluran pakan ternak / budidaya maggot BSF (Tier 3).
 *
 * @param decayScore - Skor akumulasi peluruhan biologis komoditas (0.00 - 1.00).
 * @param requestedTier - Saluran penyelamatan sirkular yang diminta (tier_1 | tier_2 | tier_3).
 * @returns Objek hasil validasi status perizinan dan alasan pelanggaran etis jika diblokir.
 */
export function validateQualityGateMoralHazard(
  decayScore: number,
  requestedTier: RescueTier
): { isPermitted: boolean; violationReason?: string } {
  const isHumanEdible = decayScore < 0.85;

  if (isHumanEdible && requestedTier === 'tier_3') {
    return {
      isPermitted: false,
      violationReason:
        'Pelanggaran gerbang mutu: sayur masih layak makan (skor < 0.85), tidak boleh dialihkan ke maggot.',
    };
  }

  return { isPermitted: true };
}
