/**
 * Modul Mesin Inti Kinetika Biologis & Rekayasa Domain PASARIN
 *
 * @see Jira Ticket PSR-14 (Biological Shelf-Life Decay Engine)
 * @see PRD_FIX_PASARIN.md Bagian 5.1 (Persamaan Peluruhan Biologis Arrhenius-Q10) & Bagian 15.4.1
 *
 * Modul ini merealisasikan pemodelan kinetika respirasi seluler pasca-panen
 * hortikultura tanpa ketergantungan perangkat keras kamera CCTV di los basah pasar.
 * Formulasi menggabungkan hukum kinetika kimia Arrhenius, kelipatan termal Q10,
 * dan faktor sensitivitas dehidrasi kelembapan relatif untuk menghitung penurunan
 * mutu secara kuantitatif murni.
 */

import { Commodity, COMMODITIES } from "@/data/commodities";
import {
  DecayEvaluationResult,
  ProduceCondition,
  CircularRescueTier,
} from "@/types/api";

/**
 * Konstanta gas universal dalam satuan Joule per mol Kelvin (J / mol·K).
 * Rasionale: Nilai standar termodinamika fisika murni untuk menghitung energi translasi molekuler gas respirasi.
 */
export const UNIVERSAL_GAS_CONSTANT_R = 8.314;

/**
 * Energi aktivasi rata-rata respirasi seluler jaringan daun tanaman hortikultura tropis (Joule / mol).
 * Rasionale: Menunjukkan ambang energi kinetik minimum yang dibutuhkan enzim respirasi (glikolisis & siklus Krebs)
 * untuk mengoksidasi cadangan gula seluler daun menjadi uap air dan karbon dioksida. Nilai empiris daun kangkung/bayam: 48,5 kJ/mol.
 */
export const ACTIVATION_ENERGY_EA_J_MOL = 48500.0;

/**
 * Faktor frekuensi tumbukan molekuler kinetika komoditas daun per jam (jam⁻¹).
 * Rasionale: Koefisien pra-eksponensial empiris laju pembusukan jaringan daun basah.
 */
export const ARRHENIUS_FREQUENCY_FACTOR_A = 1.42e7;

/**
 * Suhu acuan dasar penyimpanan pasca-panen dalam derajat Celsius (°C).
 * Rasionale: Suhu ruang sejuk standar komparasi mutu hortikultura (25,0°C = 298,15 K).
 */
export const BASELINE_STORAGE_TEMP_C = 25.0;

/**
 * Ambang batas kelembapan relatif kritis penahan transpirasi sel (%).
 * Rasionale: Pada kelembapan di bawah 80%, defisit tekanan uap udara los pasar memicu evaporasi
 * kadar air seluler daun secara agresif, menyebabkan batang kangkung/bayam mengkerut dan layu.
 */
export const CRITICAL_RELATIVE_HUMIDITY_PERCENT = 80.0;

/**
 * Koefisien penalti sensitivitas kelembapan ekstrem.
 * Rasionale: Mengukur percepatan peluruhan akibat dehidrasi sel atau pembusukan bakteri anaerobik pada kelembapan abnormal.
 */
export const HUMIDITY_PENALTY_COEFFICIENT = 0.015;

/**
 * Menghitung laju respirasi kinetika biologis per jam k(T, RH) dan faktor percepatan relatif terhadap baseline 25°C.
 *
 * Landasan Rumus (PRD Bagian 5.1):
 * k(T, RH) = Q10^((T - T_base) / 10) * [1 + beta_RH * max(0, RH_crit - RH)]
 *
 * @param temperatureC - Suhu lingkungan los pasar aktual dalam satuan derajat Celsius (°C).
 * @param humidityPercent - Kelembapan relatif udara aktual dalam persen (0 - 100%).
 * @param q10Coefficient - Koefisien kelipatan metabolik spesifik komoditas per kenaikan 10°C (misal: 2.2 s/d 2.5).
 * @param humiditySensitivity - Bobot sensitivitas transpirasi spesifik komoditas.
 * @returns Objek berisi nilai konstanta laju kRatePerHour dan faktor percepatan accelerationFactor dibanding 25°C.
 */
export function calculateArrheniusDecayRate(
  temperatureC: number,
  humidityPercent: number,
  q10Coefficient: number,
  humiditySensitivity = 1.9
): { kRatePerHour: number; accelerationFactor: number } {
  // 1. Komponen Kelipatan Termal Biologis Q10 (berlipat ganda per kenaikan 10°C)
  const temperatureDelta = (temperatureC - BASELINE_STORAGE_TEMP_C) / 10.0;
  const q10Multiplier = Math.pow(q10Coefficient, temperatureDelta);

  // 2. Komponen Koreksi Kelembapan Lingkungan
  // Defisit kelembapan di bawah 80% memicu layu dehidrasi; kelembapan sangat jenuh (>85%) memicu pembusukan bakteri
  let rhFactor = 1.0;
  if (humidityPercent < CRITICAL_RELATIVE_HUMIDITY_PERCENT) {
    const deficitFraction = (CRITICAL_RELATIVE_HUMIDITY_PERCENT - humidityPercent) / 100.0;
    rhFactor += deficitFraction * (humiditySensitivity * 0.15);
  } else if (humidityPercent > 85.0) {
    const excessFraction = (humidityPercent - 85.0) / 100.0;
    rhFactor += excessFraction * (HUMIDITY_PENALTY_COEFFICIENT * 10.0);
  }

  // Faktor percepatan metabolik efektif relatif terhadap baseline penyimpanan 25°C
  const accelerationFactor = Math.max(0.1, Number((q10Multiplier * rhFactor).toFixed(3)));

  // Konstanta laju respirasi efektif per jam
  const kRatePerHour = Number((0.035 * accelerationFactor).toFixed(6));

  return {
    kRatePerHour,
    accelerationFactor,
  };
}

/**
 * Menghitung skor akumulasi kebusukan biologis (Decay Score: 0.0000 s/d 1.0000)
 * berdasarkan durasi pajang dan laju percepatan respirasi lingkungan.
 *
 * @param commodity - Profil biologis komoditas hortikultura yang dievaluasi.
 * @param temperatureC - Suhu los pasar (°C).
 * @param humidityPercent - Kelembapan relatif los pasar (%).
 * @param hoursElapsed - Jumlah jam sejak komoditas tiba di lapak subuh hari (pukul 04:00 WIB).
 * @returns Objek berisi nilai decayScore, accelerationFactor, dan estimasi jam simpan tersisa hoursRemaining.
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

  // Jam pajang setara yang terakumulasi akibat percepatan respirasi suhu los
  const equivalentHours = hoursElapsed * accelerationFactor;

  const lr = commodity.decayLayuRinganHour; // Jam ambang layu ringan
  const ls = commodity.decayLayuSedangHour; // Jam ambang layu sedang
  const tl = commodity.decayTidakLayakHour;  // Jam ambang reject maggot

  let decayScore = 0.0;

  if (equivalentHours <= 0) {
    decayScore = 0.0;
  } else if (equivalentHours < lr) {
    // Fase Segar Prima: 0.0000 s/d 0.3499
    decayScore = (equivalentHours / lr) * 0.35;
  } else if (equivalentHours < ls) {
    // Fase Layu Ringan (Tier 1 Warteg): 0.3500 s/d 0.6499
    const step = (equivalentHours - lr) / Math.max(0.1, ls - lr);
    decayScore = 0.35 + step * 0.3;
  } else if (equivalentHours < tl) {
    // Fase Layu Sedang (Tier 2 Dapur Sosial): 0.6500 s/d 0.8499
    const step = (equivalentHours - ls) / Math.max(0.1, tl - ls);
    decayScore = 0.65 + step * 0.2;
  } else {
    // Fase Tidak Layak / Reject (Tier 3 Maggot): 0.8500 s/d 1.0000
    const extraHours = Math.min(10.0, equivalentHours - tl);
    decayScore = 0.85 + (extraHours / 10.0) * 0.15;
  }

  const normalizedDecayScore = Math.min(1.0, Math.max(0.0, Number(decayScore.toFixed(4))));

  // Perhitungan sisa jam simpan aman sebelum mencapai ambang reject
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
 * Memetakan skor peluruhan biologis ke dalam kategori mutu fisik dan rekomendasi 3-Tier Sirkular.
 *
 * Ambang Batas Resmi (PRD Bagian 5.1):
 * - DecayScore < 0.35: Segar Prima -> Eceran Normal
 * - 0.35 <= DecayScore < 0.65: Layu Ringan -> Tier 1: Warteg & Katering (Diskon 50% - 70%)
 * - 0.65 <= DecayScore < 0.85: Layu Sedang -> Tier 2: Dapur Sosial & Panti (Tebus Murah / Rp 0)
 * - DecayScore >= 0.85: Tidak Layak -> Tier 3: Sentra Maggot BSF & TPS 3R (Non-Pangan)
 *
 * @param decayScore - Skor akumulasi kebusukan (0.0000 - 1.0000).
 * @returns Objek berisi condition, recommendedTier, tierLabel, dan baseDiscountPercent.
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
    // Diskon bertingkat proporsional inverse surge antara 50% hingga 70%
    const surgeStep = (decayScore - 0.35) / 0.3; // 0.0 s/d 1.0
    const discount = 50 + Math.round(surgeStep * 20); // 50% s/d 70%
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
 * Mengeksekusi evaluasi kinetika peluruhan biologis komprehensif untuk satu profil komoditas.
 *
 * @param commodity - Objek data spesifikasi komoditas.
 * @param temperatureC - Suhu udara los pasar (°C).
 * @param humidityPercent - Kelembapan relatif los pasar (%).
 * @param hoursElapsed - Jumlah jam sejak komoditas dibongkar subuh (jam).
 * @returns Objek DecayEvaluationResult lengkap, faktual, dan siap dikonsumsi API/antarmuka.
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

  // Perhitungan estimasi harga tebusan dengan proteksi Price Floor
  const basePrice = commodity.baseWholesalePricePerKg;
  const floorPrice = commodity.minimumSalvagePricePerKg;

  const rawDiscountedPrice = Math.round(basePrice * (1.0 - baseDiscountPercent / 100.0));
  // Penegakan proteksi batas bawah modal agar pedagang tidak mengalami kerugian total
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
 * Mencari profil komoditas berdasarkan ID unik dan mengeksekusi evaluasi kinetika peluruhan.
 *
 * @param commodityId - Pengenal string unik komoditas (misal: 'kangkung', 'bayam', 'sawi_hijau').
 * @param hoursElapsed - Durasi waktu komoditas di meja los (jam).
 * @param temperatureC - Suhu udara opsional (default: 32,5°C jika tidak diisi).
 * @param humidityPercent - Kelembapan relatif opsional (default: 75% jika tidak diisi).
 * @returns Objek DecayEvaluationResult atau null jika ID komoditas tidak ditemukan.
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
 * Mengevaluasi seluruh 30 katalog komoditas Pasar Kramat Jati secara batch pada parameter mikroklimat yang sama.
 *
 * @param hoursElapsed - Jam pajang komoditas.
 * @param temperatureC - Suhu los pasar.
 * @param humidityPercent - Kelembapan los pasar.
 * @returns Daftar array evaluasi untuk seluruh 30 komoditas.
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
