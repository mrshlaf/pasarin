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

// Parameter fisik dan konstanta acuan kinetika respirasi sel daun hortikultura tropis (suhu acuan 25,0°C)
export const UNIVERSAL_GAS_CONSTANT_R = 8.314; // J/(mol·K)
export const ACTIVATION_ENERGY_EA_J_MOL = 48500.0; // J/mol (~48.5 kJ/mol)
export const ARRHENIUS_FREQUENCY_FACTOR_A = 1.42e7; // 1/jam
export const BASELINE_STORAGE_TEMP_C = 25.0; // °C
export const CRITICAL_RELATIVE_HUMIDITY_PERCENT = 80.0; // Ambang batas kelembapan (%)
export const HUMIDITY_PENALTY_COEFFICIENT = 0.015;

// Hitung laju degradasi respirasi k(T, RH) dan faktor percepatan relatif terhadap suhu acuan 25°C
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

// Hitung akumulasi skor kebusukan biologis (0.0000 - 1.0000) dan estimasi sisa jam simpan aman
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
  const hoursRemaining = Math.max(0.0, Number(rawHoursRemaining.toFixed(1)));

  return {
    decayScore: normalizedDecayScore,
    accelerationFactor,
    hoursRemaining,
  };
}

// Klasifikasi mutu fisik dan alokasi penyelamatan sirkular 3-Tier
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

// Evaluasi kinetika peluruhan komoditas dengan kinetika Arrhenius dan proteksi price floor (PSR-14)
export function evaluateProduceDecay(
  commodity: Commodity,
  temperatureC: number,
  humidityPercent: number,
  hoursElapsed: number
): DecayEvaluationResult {
  const arrhenius = evaluateArrheniusDecay(commodity, temperatureC, humidityPercent, hoursElapsed);
  const basePrice = commodity.baseWholesalePricePerKg;
  const floorPrice = Math.max(commodity.minimumSalvagePricePerKg, 2500);

  let baseDiscountPercent = 0;
  if (arrhenius.condition === 'layu_ringan') {
    const surgeStep = (arrhenius.decayScore - 0.35) / 0.3;
    baseDiscountPercent = 50 + Math.round(surgeStep * 20);
  } else if (arrhenius.condition === 'layu_sedang') {
    baseDiscountPercent = 85;
  } else if (arrhenius.condition === 'tidak_layak') {
    baseDiscountPercent = 95;
  }

  const rawDiscountedPrice = Math.round(basePrice * (1.0 - baseDiscountPercent / 100.0));
  const estimatedSalvagePriceIdr = Math.max(floorPrice, Math.round(rawDiscountedPrice / 500) * 500);

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

// Cari komoditas berdasarkan ID dan hitung kinetika peluruhannya
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

// Evaluasi batch seluruh 30 komoditas katalog pasar
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

export type RescueTier = CircularRescueTier;

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
  // Mengikuti hukum waktu: jam aman monoton berkurang dan tidak bertambah saat suhu mendingin.
  let hoursRemaining = 0;
  if (decayScore < 0.85) {
    const remainingFraction = (0.85 - decayScore) / 0.85;
    const physicalHoursLeft = Math.max(0, safeHorizonHours - hoursElapsed);
    hoursRemaining = Math.max(
      0,
      Number((remainingFraction * physicalHoursLeft).toFixed(1))
    );
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


export type UrgencyLevel = 1 | 2 | 3 | 4 | 5;

export interface KioskStockInput {
  kioskId: string;
  kioskName: string;
  commodityId: string;
  initialStockKg: number;
  arrivalHourDecimal: number;
}

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

// Klasifikasi skala urgensi penyelamatan pangan (Level 5 = sisa waktu < 4 jam) (PSR-19)
export function calculateUrgencyLevel(hoursRemaining: number): UrgencyLevel {
  if (hoursRemaining < 4.0) return 5;
  if (hoursRemaining < 6.0) return 4;
  if (hoursRemaining < 8.0) return 3;
  if (hoursRemaining < 12.0) return 2;
  return 1;
}

// Prediksi kuantitatif surplus pasar komposit (baseline 1.240 kg) pada jam 14:30 WIB (PSR-19)
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

    const baselineRetailClearance = 0.82;
    const weatherDropImpact = (footfall.footfallDropPercentage / 100.0) * 0.72;
    const effectiveClearanceRate = Math.max(0.20, baselineRetailClearance - weatherDropImpact);
    const unsoldSurplusRate = Math.max(0.10, 1.0 - effectiveClearanceRate);

    const rawSurplusKg = item.initialStockKg * unsoldSurplusRate;
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

// Quality gate moral hazard: sayur layak konsumsi dilarang dialihkan ke pakan ternak maggot (PSR-21)
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
