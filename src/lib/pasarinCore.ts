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
 * Parameter fisik dan konstanta acuan kinetika respirasi sel daun hortikultura tropis (suhu acuan 25,0°C).
 */
export const UNIVERSAL_GAS_CONSTANT_R = 8.314; // J/(mol·K)
export const ACTIVATION_ENERGY_EA_J_MOL = 48500.0; // J/mol (~48.5 kJ/mol)
export const ARRHENIUS_FREQUENCY_FACTOR_A = 1.42e7; // 1/jam
export const BASELINE_STORAGE_TEMP_C = 25.0; // °C
export const CRITICAL_RELATIVE_HUMIDITY_PERCENT = 80.0; // Ambang batas kelembapan (%)
export const HUMIDITY_PENALTY_COEFFICIENT = 0.015;

/**
 * Menghitung laju degradasi respirasi k(T, RH) dan faktor percepatan relatif terhadap suhu acuan 25°C.
 * Memperhitungkan efek eksponensial suhu melalui model Q10 dan penalti defisit/kelebihan kelembapan udara.
 *
 * @param temperatureC - Suhu lingkungan los pasar dalam derajat Celsius (°C).
 * @param humidityPercent - Kelembapan relatif udara dalam persen (0 - 100% RH).
 * @param q10Coefficient - Koefisien pelipatgandaan metabolik komoditas per kenaikan 10°C (lazimnya 1,8 - 2,5).
 * @param humiditySensitivity - Sensitivitas komoditas terhadap kekeringan atau kelembapan ekstrem (default: 1.9).
 * @returns Objek berisi laju degradasi per jam (kRatePerHour) dan faktor percepatan komparatif (accelerationFactor).
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
 * Menghitung akumulasi skor kebusukan biologis (0.0000 - 1.0000) dan estimasi sisa jam simpan aman.
 * Mentransformasikan jam pajang riil ke dalam jam pajang ekuivalen berdasarkan faktor percepatan mikroklimat.
 *
 * @param commodity - Objek metadata komoditas dari katalog acuan pasar.
 * @param temperatureC - Suhu aktual los pasar dalam derajat Celsius (°C).
 * @param humidityPercent - Kelembapan relatif aktual dalam persen (% RH).
 * @param hoursElapsed - Durasi waktu komoditas telah berada di los pasar sejak pembongkaran subuh (jam).
 * @returns Objek berisi skor kebusukan (decayScore), faktor percepatan, dan sisa jam sebelum rusak (hoursRemaining).
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
  const hoursRemaining = Math.max(0.0, Number(rawHoursRemaining.toFixed(1)));

  return {
    decayScore: normalizedDecayScore,
    accelerationFactor,
    hoursRemaining,
  };
}

/**
 * Mengklasifikasikan mutu fisik komoditas dan memetakan alokasi penyelamatan sirkular 3-Tier.
 * Ambang batas: < 0.35 (Segar Prima), 0.35 - 0.65 (Tier 1 Warteg), 0.65 - 0.85 (Tier 2 Dapur Sosial), >= 0.85 (Tier 3 Maggot).
 *
 * @param decayScore - Skor akumulasi kebusukan biologis dalam rentang 0.0000 hingga 1.0000.
 * @returns Objek status fisik, tingkatan alokasi penyelamatan, label representasi, dan persentase diskon dasar.
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
 * Mengevaluasi kinetika peluruhan komoditas secara komprehensif serta menghitung harga salvaging dengan proteksi modal.
 * Mencegah moral hazard dengan mengunci harga jual tidak boleh lebih rendah dari batas modal pedagang (Price Floor).
 *
 * @param commodity - Objek komoditas hortikultura yang dievaluasi.
 * @param temperatureC - Suhu los pasar dalam derajat Celsius (°C).
 * @param humidityPercent - Kelembapan relatif los pasar dalam persen (% RH).
 * @param hoursElapsed - Lama waktu pajang di los pasar sejak tiba (jam).
 * @returns Hasil evaluasi lengkap berisi skor biologis, tier alokasi sirkular, dan kalkulasi harga penyelamatan (IDR).
 */
export function evaluateProduceDecay(
  commodity: Commodity,
  temperatureC: number,
  humidityPercent: number,
  hoursElapsed: number
): DecayEvaluationResult {
  const { decayScore, accelerationFactor, hoursRemaining } = calculateDecayScore(
    commodity,
    temperatureC,
    humidityPercent,
    hoursElapsed
  );

  const { condition, recommendedTier, tierLabel, baseDiscountPercent } =
    classifyProduceCondition(decayScore);

  const basePrice = commodity.baseWholesalePricePerKg;
  const floorPrice = commodity.minimumSalvagePricePerKg;

  // Proteksi modal pedagang: harga tebus dikunci minimal seharga floor
  const rawDiscountedPrice = Math.round(basePrice * (1.0 - baseDiscountPercent / 100.0));
  const estimatedSalvagePriceIdr = Math.max(floorPrice, Math.round(rawDiscountedPrice / 500) * 500);

  return {
    commodityId: commodity.id,
    commodityName: commodity.localName || commodity.name,
    category: commodity.category,
    temperatureC,
    humidityPercent,
    hoursElapsed,
    accelerationFactor,
    decayScore,
    condition,
    recommendedTier,
    tierLabel,
    hoursRemaining,
    salvageDiscountPercent: baseDiscountPercent,
    estimatedSalvagePriceIdr,
    baseWholesalePriceIdr: basePrice,
    priceFloorIdr: floorPrice,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Mencari komoditas berdasarkan pengidentifikasi unik (ID) dan menghitung kinetika peluruhannya.
 *
 * @param commodityId - Pengidentifikasi unik komoditas (contoh: "bayam", "kangkung").
 * @param hoursElapsed - Durasi waktu pajang di los pasar dalam satuan jam.
 * @param temperatureC - Suhu los pasar (opsional, default: 32,5°C iklim siang Kramat Jati).
 * @param humidityPercent - Kelembapan los pasar (opsional, default: 75% RH).
 * @returns Objek evaluasi kinetika lengkap atau null jika komoditas tidak ditemukan dalam katalog.
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
 * Mengevaluasi status kinetika peluruhan untuk seluruh 30 komoditas terdaftar dalam katalog pasar secara serentak.
 * Digunakan untuk menyusun matriks risiko surplus komposit pasar menjelang sapuan pukul 14.30 WIB.
 *
 * @param hoursElapsed - Waktu pajang komoditas sejak subuh dalam satuan jam.
 * @param temperatureC - Suhu lingkungan pasar dalam derajat Celsius (°C).
 * @param humidityPercent - Kelembapan lingkungan pasar dalam persen (% RH).
 * @returns Larik hasil evaluasi kinetika peluruhan untuk 30 komoditas.
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
