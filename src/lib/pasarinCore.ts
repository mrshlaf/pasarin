// Modul Inti Kinetika Peluruhan Biologis Hortikultura Tropis (PSR-14).
// Menghitung laju degradasi respirasi seluler berbasis termodinamika Arrhenius dan koefisien kelipatan Q10.
// Menentukan skor kebusukan (decayScore 0.00 - 1.00), alokasi penyelamatan sirkular 3-Tier,
// serta kalkulasi harga salvaging adaptif dengan perlindungan batas bawah modal pedagang (Price Floor Protection).

import { Commodity, COMMODITIES } from "@/data/commodities";
import {
  DecayEvaluationResult,
  ProduceCondition,
  CircularRescueTier,
} from "@/types/api";

// Konstanta gas universal R dalam satuan J/(mol·K) (PSR-14).
export const UNIVERSAL_GAS_CONSTANT_R = 8.314; // J/(mol·K)

// Energi aktivasi respirasi sel daun hortikultura Ea dalam J/mol (~48.5 kJ/mol) (PSR-14).
export const ACTIVATION_ENERGY_EA_J_MOL = 48500.0; // J/mol (~48.5 kJ/mol)

// Faktor frekuensi Arrhenius A per jam (PSR-14).
export const ARRHENIUS_FREQUENCY_FACTOR_A = 1.42e7; // 1/jam

// Suhu acuan penyimpanan dasar dalam derajat Celsius (PSR-14).
export const BASELINE_STORAGE_TEMP_C = 25.0; // °C

// Ambang batas kelembapan relatif kritis (% RH) (PSR-14).
export const CRITICAL_RELATIVE_HUMIDITY_PERCENT = 80.0; // Ambang batas kelembapan (%)

// Koefisien penalti degradasi kelembapan udara (PSR-14).
export const HUMIDITY_PENALTY_COEFFICIENT = 0.015;

// Kondisi acuan: jam batas layu pada data komoditas (decayLayuRinganHour, decayLayuSedangHour, decayTidakLayakHour)
// berlaku pada suhu los pasar Jakarta 32,5 C dan kelembapan 75 persen. Ini asumsi awal yang belum dikalibrasi lapangan.
export const REFERENCE_TEMPERATURE_C = 32.5;
export const REFERENCE_HUMIDITY_PERCENT = 75.0;
// Kecepatan relatif dibatasi agar suhu ekstrem tidak menghasilkan skor yang tidak masuk akal.
const MIN_RELATIVE_SPEED = 0.2;
const MAX_RELATIVE_SPEED = 5.0;

// Pengali laju akibat kelembapan: udara terlalu kering mempercepat kehilangan air, udara jenuh (di atas 85 persen) memicu bakteri.
// Kering: 1 + (80 - RH)/100 x (sensitivitas x 0,15). Lembap: 1 + (RH - 85)/100 x (0,015 x 10). Di antara 80 dan 85 persen: 1.
function humidityRateFactor(relativeHumidityPercent: number, sensitivity: number) {
  // RH di bawah batas kritis: udara kering mempercepat layu; makin kering makin besar faktornya, diskalakan oleh sensitivitas komoditas.
  if (relativeHumidityPercent < CRITICAL_RELATIVE_HUMIDITY_PERCENT) {
    return 1.0 + ((CRITICAL_RELATIVE_HUMIDITY_PERCENT - relativeHumidityPercent) / 100.0) * (sensitivity * 0.15);
  }
  // RH di atas 85 persen: udara lembap mempercepat pembusukan (jamur dan bakteri); tambahan sebanding dengan kelebihan RH di atas 85.
  if (relativeHumidityPercent > 85.0) {
    return 1.0 + ((relativeHumidityPercent - 85.0) / 100.0) * (HUMIDITY_PENALTY_COEFFICIENT * 10.0);
  }
  // RH di antara batas kritis dan 85 persen dianggap netral: faktor 1, tidak mengubah kecepatan.
  return 1.0;
}

// Kecepatan peluruhan relatif terhadap kondisi acuan (32,5 C, 75 persen). Bernilai 1 pada kondisi acuan,
// di atas 1 bila lebih panas atau lebih ekstrem kelembapannya, di bawah 1 bila lebih sejuk.
// Rumus: Q10^((T - 32,5)/10) x faktorKelembapan(RH) / faktorKelembapan(75). Q10 dan sensitivitas kelembapan diambil dari data komoditas.
// Contoh: Q10 2,5 pada 27 C: 2,5^(-0,55) = 0,60, jadi peluruhan 40 persen lebih lambat dan umur simpan sekitar 1,7 kali lebih panjang.
export function relativeDecaySpeed(commodity: Commodity, temperatureCelsius: number, relativeHumidityPercent: number) {
  // Q10 komoditas dipakai bila valid (lebih dari 0); bila tidak, pakai nilai bawaan global.
  const q10 = commodity.q10Coefficient > 0 ? commodity.q10Coefficient : ARRHENIUS_CONSTANTS.THERMAL_QUOTIENT_Q10;
  // Bagian suhu: Q10 dipangkatkan (selisih suhu dari 32,5 C dibagi 10). Tiap kenaikan 10 C, kecepatan naik sebesar Q10 kali.
  const thermal = Math.pow(q10, (temperatureCelsius - REFERENCE_TEMPERATURE_C) / 10.0);
  const sensitivity = commodity.humiditySensitivityFactor;
  // Bagian kelembapan: faktor pada RH aktual dibagi faktor pada RH acuan 75 persen, supaya kondisi acuan bernilai tepat 1.
  const humidity = humidityRateFactor(relativeHumidityPercent, sensitivity) / humidityRateFactor(REFERENCE_HUMIDITY_PERCENT, sensitivity);
  // Hasil dibatasi antara kecepatan minimum dan maksimum (0,2 sampai 5 kali) agar suhu ekstrem tidak menghasilkan angka tak masuk akal.
  return Math.min(MAX_RELATIVE_SPEED, Math.max(MIN_RELATIVE_SPEED, thermal * humidity));
}

// Menetapkan klasifikasi mutu fisik dan alokasi penyelamatan sirkular 3-Tier berdasarkan DecayScore.
// Menegakkan Invarian 1 (Zero Edible Food to Feed): komoditas layak konsumsi manusia dilarang ke sentra maggot.
export function classifyProduceCondition(decayScore: number): {
  condition: ProduceCondition;
  recommendedTier: CircularRescueTier;
  tierLabel: string;
  baseDiscountPercent: number;
} {
  // Skor di bawah 0,35: masih segar prima, dijual eceran biasa tanpa diskon penyelamatan.
  if (decayScore < 0.35) {
    return {
      condition: "segar_prima",
      recommendedTier: "fresh",
      tierLabel: "Segar Prima (Eceran Normal)",
      baseDiscountPercent: 0,
    };
  }

  // Skor 0,35 sampai di bawah 0,65: layu ringan, jalur Tier 1 (Warteg dan UMKM kuliner).
  if (decayScore < 0.65) {
    // Diskon bertingkat proporsional inverse surge (50% - 70%)
    // Diskon tier 1 naik linear 50 sampai 70 persen sesuai posisi skor antara 0,35 dan 0,65.
    // Posisi skor di dalam fase ini dari 0 sampai 1. Contoh: skor 0,50 memberi (0,50 - 0,35) / 0,30 = 0,5, jadi diskon 50 + 10 = 60 persen.
    const surgeStep = (decayScore - 0.35) / 0.3;
    const discount = 50 + Math.round(surgeStep * 20);
    return {
      condition: "layu_ringan",
      recommendedTier: "tier_1",
      tierLabel: "Tier 1: Warteg & UMKM Kuliner (Diskon 50% - 70%)",
      baseDiscountPercent: discount,
    };
  }

  // Skor 0,65 sampai di bawah 0,85: layu sedang, jalur Tier 2 (dapur sosial dan panti) dengan subsidi 85 persen.
  if (decayScore < 0.85) {
    // Skor 0,85 ke atas: tidak layak konsumsi manusia, jalur Tier 3 (maggot dan kompos), bukan pangan.
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

// Mengevaluasi kinetika peluruhan komoditas dengan kinetika Arrhenius dan proteksi harga modal pedagang (PSR-14).
// Menghitung harga salvaging diskon bertingkat (50% - 70%) tanpa pernah menembus batas bawah modal (Price Floor).
export function evaluateProduceDecay(
  commodity: Commodity,
  temperatureC: number,
  humidityPercent: number,
  hoursElapsed: number
): DecayEvaluationResult {
  const arrhenius = evaluateArrheniusDecay(commodity, temperatureC, humidityPercent, hoursElapsed);
  // Harga grosir komoditas adalah dasar semua diskon; harga lantai dan diskon dihitung per fase di bawah ini.
  const basePrice = commodity.baseWholesalePricePerKg;

  let baseDiscountPercent = 0;
  let estimatedSalvagePriceIdr = 0;
  let floorPrice = commodity.minimumSalvagePricePerKg;

  if (arrhenius.condition === 'layu_ringan') {
    // Tier 1 (Warteg): Semakin mendekati busuk, diskon bertambah (50% -> 70%) dan harga semakin murah
    // surgeStep = posisi skor di dalam fase (0..1); diskon tier 1 = 50 + 20 x surgeStep persen.
    const surgeStep = Math.min(1, Math.max(0, (arrhenius.decayScore - 0.35) / 0.30));
    baseDiscountPercent = 50 + Math.round(surgeStep * 20);
    floorPrice = Math.max(commodity.minimumSalvagePricePerKg, 2500);
    // Harga dibulatkan ke kelipatan Rp500 agar mudah dibayar tunai, lalu dikunci di atas harga lantai.
    // Harga = harga grosir x (1 - diskon). Dibulatkan ke kelipatan Rp500, lalu tidak boleh di bawah harga lantai. Contoh: Rp6.000 diskon 60 persen = Rp2.400, dibulatkan Rp2.500.
    const rawDiscountedPrice = Math.round(basePrice * (1.0 - baseDiscountPercent / 100.0));
    estimatedSalvagePriceIdr = Math.max(floorPrice, Math.round(rawDiscountedPrice / 500) * 500);
  } else if (arrhenius.condition === 'layu_sedang') {
    // Tier 2 (Dapur Sosial): Lebih layu dari tier 1, harga lebih murah lagi (diskon 75% -> 85%) jika ditebus subsidi
    // Tier 2 memakai diskon 75 sampai 85 persen: 75 + 10 x surgeStep, posisi dihitung dari skor 0,65 sampai 0,85.
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

  // Hasil akhir evaluasi: identitas komoditas, kondisi cuaca masukan, skor, tier, sisa jam, diskon, dan harga penyelamatan.
  return {
    commodityId: commodity.id,
    commodityName: commodity.localName || commodity.name,
    category: commodity.category,
    temperatureC,
    humidityPercent,
    hoursElapsed,
    // 0,045 adalah k dasar pada 20°C, sehingga nilai ini adalah kelipatan laju terhadap suhu acuan.
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

// Mencari data komoditas berdasarkan ID dan mengevaluasi kinetika peluruhannya.
// Mengembalikan null secara aman jika ID komoditas tidak ditemukan dalam direktori master.
export function evaluateProduceById(
  commodityId: string,
  hoursElapsed: number,
  temperatureC = 32.5,
  humidityPercent = 75
): DecayEvaluationResult | null {
  // Nama komoditas dibersihkan (spasi dan huruf besar) sebelum dicari di katalog; ID tak dikenal mengembalikan null.
  const normalizedId = commodityId.trim().toLowerCase();
  const commodity = COMMODITIES.find((c) => c.id.toLowerCase() === normalizedId);

  if (!commodity) {
    return null;
  }

  return evaluateProduceDecay(commodity, temperatureC, humidityPercent, hoursElapsed);
}

// Mengevaluasi secara batch seluruh 30 komoditas dalam katalog master hortikultura pasar.
// Digunakan untuk pemindaian komprehensif inventaris pada jadwal sapuan sore (14:30 WIB).
export function getAllCommodityEvaluations(
  hoursElapsed: number,
  temperatureC = 32.5,
  humidityPercent = 75
): DecayEvaluationResult[] {
  return COMMODITIES.map((commodity) =>
    evaluateProduceDecay(commodity, temperatureC, humidityPercent, hoursElapsed)
  );
}

// Parameter acuan kinetika termal Arrhenius-Q10 kurikulum (PSR-14).
export const ARRHENIUS_CONSTANTS = {
  GAS_CONSTANT_R: UNIVERSAL_GAS_CONSTANT_R,
  ACTIVATION_ENERGY_EA: ACTIVATION_ENERGY_EA_J_MOL,
  FREQUENCY_FACTOR_A: ARRHENIUS_FREQUENCY_FACTOR_A,
  // Acuan laju dasar k(T, RH) adalah 20°C. BASELINE_STORAGE_TEMP_C (25°C) hanya konstanta rujukan penyimpanan dan tidak dipakai rumus skor.
  BASELINE_TEMP_CELSIUS: 20.0,
  THERMAL_QUOTIENT_Q10: 2.0,
  CRITICAL_HUMIDITY_PERCENT: CRITICAL_RELATIVE_HUMIDITY_PERCENT,
  BETA_HUMIDITY_COEFFICIENT: HUMIDITY_PENALTY_COEFFICIENT,
} as const;

// Faktor emisi limbah makanan yang tidak masuk TPA (asumsi awal, belum dikalibrasi untuk Bantar Gebang).
// Metana per kg limbah mengikuti rumus IPCC 2006: DOC x DOCf x MCF x F x 16/12. Dengan DOC 0,15, DOCf 0,5, F 0,5,
// dan MCF sekitar 0,8 hasilnya sekitar 0,04 kg CH4; angka yang dipakai 0,038. Nilai DOC dan MCF belum diverifikasi ke dokumen sumber.
export const FOOD_WASTE_METHANE_KG_PER_KG = 0.038;
// Potensi pemanasan global CH4 dalam 100 tahun. IPCC 2006 memakai 21; laporan terbaru memakai 28-30, jadi hasil CO2e di sini batas bawah.
export const METHANE_GWP_100 = 21;
// CO2e per kg limbah = metana x GWP. 0,038 x 21 = 0,798.
export const FOOD_WASTE_CO2E_KG_PER_KG = FOOD_WASTE_METHANE_KG_PER_KG * METHANE_GWP_100;

// Alias tingkatan alokasi sirkular penyelamatan pangan (PSR-14 / PSR-21).
export type RescueTier = CircularRescueTier;

// Kontrak struktur hasil evaluasi kinetika Arrhenius dan status biologis komoditas (PSR-14).
export interface ArrheniusDecayResult {
  commodityId: string;
  commodityName: string;
  temperatureCelsius: number;
  relativeHumidityPercent: number;
  hoursElapsed: number;
  // Konstanta laju peluruhan per jam, dibulatkan 4 desimal.
  rateConstantK: number;
  decayScore: number;
  condition: ProduceCondition;
  recommendedTier: RescueTier;
  tierLabel: string;
  // Jam tersisa sampai skor mencapai 0,85 (batas tidak layak konsumsi); 0 bila sudah lewat.
  hoursRemaining: number;
  isEdibleForHumans: boolean;
}

// Menghitung konstanta laju dasar k(T, RH) sesuai spesifikasi PSR-14: akselerasi tetap 2,2x pada 33°C dibanding 20°C.
// Parameter q10 hanya menentukan apakah nilai bawaan dipakai (bila nol atau negatif); sensitivitas suhu tiap komoditas
// diterapkan terpisah oleh relativeDecaySpeed. Nilai ini dipakai untuk rateConstantK dan accelerationFactor, bukan untuk skor.
export function calculateArrheniusRateConstant(
  temperatureCelsius: number,
  relativeHumidityPercent: number,
  q10: number = ARRHENIUS_CONSTANTS.THERMAL_QUOTIENT_Q10
): number {
  const { BASELINE_TEMP_CELSIUS, CRITICAL_HUMIDITY_PERCENT, BETA_HUMIDITY_COEFFICIENT } = ARRHENIUS_CONSTANTS;
  // Laju k per jam = 0,045 x 2,2^((T - 20)/13) x (1 + 0,015 x max(0, RH - 80)). Artinya: 0,045 adalah laju pada 20 C, setiap kenaikan 13 C melipatkan laju 2,2 kali, dan kelembapan di atas 80 persen menambah laju sedikit.
  const k_baseline = 0.045;
  // Q10 komoditas tidak dipakai langsung: nilai positif apa pun diganti 2,2 per 13°C (kalibrasi ~2,2x pada 33°C vs 20°C).
  // Koreksi kelembapan hanya menambah laju di atas 80% RH.
  // Rumus laju lama untuk konstanta k: Q10 efektif 2,2 per 13 C. Hanya dipakai untuk rateConstantK dan faktor percepatan; skor memakai relativeDecaySpeed.
  const effectiveQ10 = q10 > 0 ? 2.2 : ARRHENIUS_CONSTANTS.THERMAL_QUOTIENT_Q10;
  const tempDelta = temperatureCelsius - BASELINE_TEMP_CELSIUS;
  // Rasio termal: Q10 efektif dipangkatkan (selisih suhu dari suhu dasar dibagi 13).
  const thermalRatio = Math.pow(effectiveQ10, tempDelta / 13.0);
  // Koreksi kelembapan: 1 + beta x (RH di atas batas kritis); makin lembap makin cepat.
  const humidityDelta = Math.max(0, relativeHumidityPercent - CRITICAL_HUMIDITY_PERCENT);
  const humidityCorrection = 1.0 + BETA_HUMIDITY_COEFFICIENT * humidityDelta;
  return k_baseline * thermalRatio * humidityCorrection;
}

// Evaluasi akumulasi peluruhan (DecayScore) berbasis jam simpan & laju respirasi Arrhenius (PSR-14).
export function evaluateArrheniusDecay(
  commodity: Commodity,
  temperatureCelsius: number,
  relativeHumidityPercent: number,
  hoursElapsed: number
): ArrheniusDecayResult {
  // Q10 komoditas dibaca dari data; bila kosong memakai nilai bawaan.
  const q10 = commodity.q10Coefficient || ARRHENIUS_CONSTANTS.THERMAL_QUOTIENT_Q10;
  const rateK = calculateArrheniusRateConstant(temperatureCelsius, relativeHumidityPercent, q10);

  // Kecepatan peluruhan relatif terhadap kondisi acuan; 1 berarti jam batas komoditas berlaku apa adanya.
  const speed = relativeDecaySpeed(commodity, temperatureCelsius, relativeHumidityPercent);

  // Batas jam sampai tidak layak: dari data komoditas; jika kosong pakai umur simpan standar, dan jika kosong juga 16 jam.
  const safeHorizonHours = commodity.decayTidakLayakHour || commodity.standardShelfLifeHours || 16.0;
  // Paparan ternormalisasi = jam pajang dibagi batas jam; bernilai 1 saat tepat di batas.
  const normalizedExposure = hoursElapsed / safeHorizonHours;
  // Skor = (paparan x kecepatan relatif)^1,15 x 0,82. Paparan x kecepatan adalah lama pajang setara pada kondisi acuan.
  // Pada paparan 1 dan kecepatan 1 skornya 0,82 (belum 0,85); eksponen 1,15 membuat peluruhan makin cepat menjelang akhir.
  // Contoh: batas 16 jam, pajang 8 jam pada kondisi acuan: 0,5^1,15 x 0,82 = 0,37. Pada suhu lebih panas dengan kecepatan 1,5: (0,75)^1,15 x 0,82 = 0,59.
  // Konstanta 0,82 dan eksponen 1,15 adalah kalibrasi buatan agar skor pada batas jam tidak langsung mencapai 0,85, bukan hasil pengukuran. Skor adalah indeks relatif.
  const rawScore = Math.pow(normalizedExposure * speed, 1.15) * 0.82;
  const decayScore = Math.min(1.0, Math.max(0.0, Number(rawScore.toFixed(4))));

  let condition: ProduceCondition;
  let recommendedTier: RescueTier;
  let tierLabel: string;

  // Skor di bawah 0,35: segar prima.
  if (decayScore < 0.35) {
    condition = "segar_prima";
    recommendedTier = "fresh";
    tierLabel = "Segar Prima (Pasar Eceran Subuh)";
  } else if (decayScore < 0.65) {
    // Skor di bawah 0,65: layu ringan, Tier 1.
    condition = "layu_ringan";
    recommendedTier = "tier_1";
    tierLabel = "Tier 1: Warteg & Katering UMKM (Diskon 50% - 70%)";
  } else if (decayScore < 0.85) {
    // Skor di bawah 0,85: layu sedang, Tier 2.
    condition = "layu_sedang";
    recommendedTier = "tier_2";
    tierLabel = "Tier 2: Dapur Sosial & Panti (Tebus Murah / Pangan Darurat)";
  } else {
    // Skor 0,85 ke atas: tidak layak, Tier 3. Ambang yang sama dipakai classifyProduceCondition.
    condition = "tidak_layak";
    recommendedTier = "tier_3";
    tierLabel = "Tier 3: Sentra Budidaya Maggot BSF & Kompos Organik";
  }

  // Sisa jam aman sebelum memasuki batas afkir / tidak layak (decayScore >= 0.85).
  // Dihitung langsung dari invers kinetika Arrhenius agar selaras dengan skor peluruhan.
  let hoursRemaining = 0;
  if (decayScore < 0.85) {
    // Membalik rumus skor untuk skor 0,85: jam batas = horizon x (0,85/0,82)^(1/1,15) / kecepatan relatif. Sisa jam = jam batas dikurangi jam yang sudah berlalu.
    const targetHours = (safeHorizonHours * Math.pow(0.85 / 0.82, 1 / 1.15)) / speed;
    hoursRemaining = Math.max(0, Number((targetHours - hoursElapsed).toFixed(4)));
  }

  const isEdibleForHumans = decayScore < 0.85;

  // Hasil lengkap: skor, kondisi, tier, sisa jam, dan penanda layak konsumsi manusia (skor di bawah 0,85).
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

// Rincian langkah perhitungan skor peluruhan, untuk dijelaskan ke pengguna.
// Semua nilai dihitung dengan rumus yang sama seperti evaluateArrheniusDecay; tidak ada AI di sini.
export interface DecayBreakdown {
  commodityName: string;
  temperatureCelsius: number;
  relativeHumidityPercent: number;
  hoursElapsed: number;
  // Batas jam sampai tidak layak konsumsi pada suhu baku.
  horizonHours: number;
  // Jam pajang dibagi batas jam; 1 berarti tepat di batas.
  exposure: number;
  // Kecepatan peluruhan relatif terhadap kondisi acuan (32,5 C, 75 persen); 1 berarti sama, di atas 1 lebih cepat.
  relativeSpeed: number;
  // Skor sebelum dibulatkan dan dibatasi 0 sampai 1.
  rawScore: number;
  decayScore: number;
  condition: ProduceCondition;
  recommendedTier: RescueTier;
  tierLabel: string;
  hoursRemaining: number;
}

// Menghitung rincian faktor di balik skor peluruhan satu lot.
// Skor akhirnya diambil dari evaluateArrheniusDecay agar selalu sama dengan angka di dasbor.
export function explainArrheniusDecay(
  commodity: Commodity,
  temperatureCelsius: number,
  relativeHumidityPercent: number,
  hoursElapsed: number
): DecayBreakdown {
  const relativeSpeed = relativeDecaySpeed(commodity, temperatureCelsius, relativeHumidityPercent);
  const horizonHours = commodity.decayTidakLayakHour || commodity.standardShelfLifeHours || 16.0;
  // Paparan = jam pajang dibagi batas jam. Contoh: 8 jam dari batas 16 jam = 0,5.
  const exposure = hoursElapsed / horizonHours;
  const rawScore = Math.pow(exposure * relativeSpeed, 1.15) * 0.82;
  const result = evaluateArrheniusDecay(commodity, temperatureCelsius, relativeHumidityPercent, hoursElapsed);
  return {
    commodityName: commodity.localName,
    temperatureCelsius,
    relativeHumidityPercent,
    hoursElapsed,
    horizonHours,
    exposure,
    relativeSpeed,
    rawScore,
    decayScore: result.decayScore,
    condition: result.condition,
    recommendedTier: result.recommendedTier,
    tierLabel: result.tierLabel,
    hoursRemaining: result.hoursRemaining,
  };
}

// Kontrak struktur data simulasi redaman pengunjung akibat hujan dan kebecekan lorong pasar (PSR-15).
export interface FootfallSimulationResult {
  rainfallMm: number;
  isRaining: boolean;
  isMuddy: boolean;
  // Persentase penurunan pengunjung (0-80).
  footfallDropPercentage: number;
  // Rasio pengunjung tersisa (0-1), yaitu 1 - penurunan/100.
  footfallIndex: number;
  // Pengali surplus stok (1,0 sampai ~1,76) akibat pembeli yang batal datang.
  surplusMultiplier: number;
  aisleAccessibilityDescription: string;
}

// Model redaman pengunjung pasar akibat hujan lebat sore dan lorong becek (PSR-15).
// Curah hujan 10 mm menurunkan ~48% pembeli eceran sehingga meningkatkan surplus stok lapak.
export function calculateRainFootfallAttenuation(
  rainfallMm: number,
  isRainDetected: boolean = false
): FootfallSimulationResult {
  const isRaining = isRainDetected || rainfallMm > 0.0;
  const isMuddy = rainfallMm > 5.0 || (isRaining && rainfallMm > 1.0);

  // Penurunan bertingkat: gerimis 15%, hujan sedang 28%, lalu naik linear hingga 48% di 10 mm dan dibatasi 80%.
  // Besar penurunan 15, 28, 48, dan maksimal 80 persen adalah asumsi awal; belum diukur di Pasar Induk Kramat Jati.
  let footfallDropPercentage = 0.0;

  // Tanpa hujan: pengunjung tidak turun.
  if (rainfallMm <= 0.0 && !isRaining) {
    footfallDropPercentage = 0.0;
  } else if (rainfallMm <= 2.0) {
    // Gerimis (sampai 2 mm): pengunjung turun 15 persen.
    footfallDropPercentage = 15.0;
  } else if (rainfallMm <= 5.0) {
    // Hujan ringan (sampai 5 mm): turun 28 persen.
    footfallDropPercentage = 28.0;
  } else if (rainfallMm <= 10.0) {
    // Hujan sedang (5 sampai 10 mm): naik lurus sampai 48 persen di 10 mm, dengan lantai 28 persen supaya tidak turun saat melewati 5 mm. Contoh: 7,5 mm memberi 36 persen.
    footfallDropPercentage = Math.max(28.0, 48.0 * (rainfallMm / 10.0));
  } else {
    // Hujan deras (di atas 10 mm): 48 persen ditambah 1,6 persen per mm tambahan (tambahan dibatasi 20 mm), maksimum 80 persen. Contoh: 15 mm memberi 48 + 8 = 56 persen.
    const extraRain = Math.min(20.0, rainfallMm - 10.0);
    footfallDropPercentage = Math.min(80.0, 48.0 + extraRain * 1.6);
  }

  footfallDropPercentage = Number(footfallDropPercentage.toFixed(1));
  // Indeks pengunjung = 1 - penurunan/100. Pengali surplus = 1 + 0,95 x penurunan/100. Contoh: penurunan 48 persen memberi indeks 0,52 dan pengali 1,456.
  const footfallIndex = Number((1.0 - footfallDropPercentage / 100.0).toFixed(3));
  const surplusMultiplier = Number((1.0 + (footfallDropPercentage / 100.0) * 0.95).toFixed(3));

  // Teks kondisi lorong menurut besar penurunan pengunjung: 48 persen ke atas, 20 persen ke atas, dan normal.
  let aisleAccessibilityDescription: string;
  if (footfallDropPercentage >= 48.0) {
    aisleAccessibilityDescription = "Lorong sangat becek & tergenang air; arus pengunjung anjlok drastis (~48%+). Serapan retail terhenti.";
  } else if (footfallDropPercentage >= 20.0) {
    aisleAccessibilityDescription = "Lorong basah & licin; sebagian pembeli enggan melintas. Penjualan melambat.";
  } else {
    aisleAccessibilityDescription = "Kondisi lorong normal & kering; arus pembeli retail berjalan lancar tanpa hambatan.";
  }

  // Hasil: curah hujan, status hujan dan becek, penurunan pengunjung, indeks, pengali surplus, dan deskripsi lorong.
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

// Kontrak struktur data hasil penetapan harga dinamis inverse surge sore hari (PSR-20).
export interface DynamicPricingResult {
  commodityId: string;
  commodityName: string;
  // Harga grosir pagi dalam rupiah per kg.
  baseMorningWholesalePrice: number;
  // Harga lantai rupiah per kg; minimal Rp2.500 (tarif maggot + margin pedagang).
  minimumPriceFloor: number;
  // Harga tebus penyelamatan rupiah per kg setelah dikunci harga lantai.
  offeredSalvagePrice: number;
  appliedDiscountPercent: number;
  pricingMechanism: "inverse_surge_normal" | "inverse_surge_rain_accelerated" | "price_floor_locked";
  priceFloorEnforced: boolean;
  targetAudience: "Warteg & Katering UMKM" | "Dapur Sosial" | "Pakan Maggot BSF";
}

// Model penetapan harga dinamis inverse surge sore hari (14.30-18.00 WIB) dengan proteksi price floor modal (PSR-20).
// Diskon bertambah seiring bertambahnya waktu kritis namun terkunci aman di atas harga pakan maggot + margin pedagang.
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

  // Jam dibatasi pada 14.30 sampai 18.00; progres waktu 0 pada 14.30 dan 1 pada 18.00.
  const clampedHour = Math.min(t_critical, Math.max(t_trigger, currentHourDecimal));
  const timeProgress = (clampedHour - t_trigger) / (t_critical - t_trigger);

  // Akselerasi diskon saat hujan lebat (> 10 mm)
  const isHeavyRain = rainfallMm > 10.0;
  const mu_weather = isHeavyRain ? 0.85 : 1.0;

  // Formula peluruhan eksponensial harga
  // Harga = harga pagi x (1 - 0,50) x e^(-0,65 x progres) x faktor hujan. Pada 14.30 harga tinggal 50 persen harga pagi; pada 18.00 sekitar 26 persen (0,5 x e^-0,65 = 0,26). Hujan lebat (>10 mm) mengalikan 0,85.
  const unconstrainedPrice =
    P_morning * (1.0 - delta_0) * Math.exp(-lambda * timeProgress) * mu_weather;

  // Kunci batas bawah harga modal
  // Harga akhir tidak pernah di bawah harga lantai; flag priceFloorEnforced menandai bila lantai yang berlaku.
  const offeredSalvagePrice = Math.round(Math.max(P_floor, unconstrainedPrice));
  const priceFloorEnforced = offeredSalvagePrice <= P_floor;

  // Hitung persentase diskon
  const discountDecimal = (P_morning - offeredSalvagePrice) / P_morning;
  const appliedDiscountPercent = Math.round(discountDecimal * 100);

  // Mekanisme harga yang dipakai: harga lantai mengunci, hujan deras mempercepat diskon, selain itu inverse surge normal.
  let pricingMechanism: "inverse_surge_normal" | "inverse_surge_rain_accelerated" | "price_floor_locked";
  if (priceFloorEnforced) {
    pricingMechanism = "price_floor_locked";
  } else if (isHeavyRain) {
    pricingMechanism = "inverse_surge_rain_accelerated";
  } else {
    pricingMechanism = "inverse_surge_normal";
  }

  // Hasil harga: harga pagi, harga lantai, harga tawar, diskon, mekanisme, dan sasaran Warteg dan UMKM.
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


// Tingkat urgensi penyelamatan pangan (Level 1 sampai 5) (PSR-19):
// 1: Rendah (> 12 jam aman tersisa)
// 2: Sedang (8-12 jam tersisa)
// 3: Meningkat (6-8 jam tersisa)
// 4: Mendesak (4-6 jam tersisa)
// 5: Darurat Kritis (< 4 jam tersisa)
export type UrgencyLevel = 1 | 2 | 3 | 4 | 5;

// Parameter masukan data stok lapak kios pasar untuk pemodelan komposit (PSR-19).
export interface KioskStockInput {
  kioskId: string;
  kioskName: string;
  commodityId: string;
  initialStockKg: number;
  // Jam kedatangan pasokan dalam format desimal WIB, misalnya 4.5 untuk 04:30.
  arrivalHourDecimal: number;
}

// Hasil proyeksi kuantitatif surplus per kios pedagang pasar (PSR-19).
export interface StallSurplusPrediction {
  kioskId: string;
  commodityId: string;
  commodityName: string;
  initialStockKg: number;
  estimatedSurplusKg: number;
  decayScore: number;
  // Jam tersisa sampai batas tidak layak konsumsi (skor 0,85).
  hoursRemaining: number;
  urgencyLevel: UrgencyLevel;
  allocatedTier: RescueTier;
  // Harga tebus hasil inverse surge, rupiah per kg.
  recommendedSalvagePricePerKg: number;
}

// Ringkasan agregat komposit proyeksi surplus pangan pasar Kramat Jati pada 14:30 WIB (PSR-19).
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

// Mengklasifikasikan skala urgensi penyelamatan pangan (Level 1 - 5) berdasarkan sisa jam simpan aman (PSR-19).
// Skala 5 merepresentasikan status darurat kritis (< 4 jam tersisa) yang memerlukan prioritas penjemputan armada.
export function calculateUrgencyLevel(hoursRemaining: number): UrgencyLevel {
  // Tingkat urgensi 1 sampai 5 dari sisa jam: kurang dari 4 jam = 5, 6 = 4, 8 = 3, 12 = 2, selebihnya 1.
  if (hoursRemaining < 4.0) return 5;
  if (hoursRemaining < 6.0) return 4;
  if (hoursRemaining < 8.0) return 3;
  if (hoursRemaining < 12.0) return 2;
  return 1;
}

// Memprediksi kuantitas sisa stok eceran (surplus kg) yang belum terjual akibat redaman pengunjung (PSR-15/PSR-19).
// Mengintegrasikan laju penjualan normal 82% dengan koefisien penurunan serapan akibat lorong becek saat hujan.
export function predictRetailSurplusKg(initialStockKg: number, footfallDropPercentage: number) {
  // Normalnya 82% stok laku eceran; hujan memangkas serapan, tetapi serapan minimal 20% dan surplus minimal 10% stok.
  // Angka serapan 82 persen dan pengaruh hujan 0,72 adalah asumsi awal yang belum dikalibrasi dengan data penjualan nyata.
  const baselineRetailClearance = 0.82;
  // Hujan menurunkan serapan: dampak = penurunan pengunjung/100 x 0,72. Contoh: penurunan 48 persen mengurangi serapan 0,35.
  const weatherDropImpact = (footfallDropPercentage / 100) * 0.72;
  const effectiveClearanceRate = Math.max(0.2, baselineRetailClearance - weatherDropImpact);
  // Surplus = stok x (1 - serapan efektif). Tanpa hujan 18 persen stok tersisa; dengan penurunan 48 persen serapan 0,47 sehingga surplus sekitar 53 persen.
  return Math.round(initialStockKg * Math.max(0.1, 1 - effectiveClearanceRate));
// Tiap kios dinilai terpisah, lalu hasilnya dijumlahkan menjadi total pasar dan per tier.
}

// Memprediksi kuantitatif surplus pasar agregat komposit (validasi target empiris 1.240 kg) pada 14:30 WIB (PSR-19).
// Mengagregasi seluruh input stok 30 kios pedagang binaan, menghitung peluruhan Arrhenius, dan memetakan alokasi 3-Tier.
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

  // Penampung hasil per kios dan penjumlah total stok, surplus, alokasi per tier, dan jumlah barang darurat.
  const items: StallSurplusPrediction[] = [];
  let totalMarketStockKg = 0;
  let totalPredictedSurplusKg = 0;
  let tier1WartegAllocatedKg = 0;
  let tier2SocialKitchenAllocatedKg = 0;
  let tier3MaggotAllocatedKg = 0;
  let criticalEmergencyItemsCount = 0;

  for (const item of stallItems) {
    // ID komoditas yang tidak dikenal jatuh ke komoditas pertama katalog agar agregat tetap terhitung.
    const commodity = COMMODITIES.find((c) => c.id === item.commodityId) || COMMODITIES[0];
    totalMarketStockKg += item.initialStockKg;

    // Lama pajang minimal 1 jam agar pasokan yang baru datang tetap dievaluasi.
    // Lama pajang dihitung dari jam saat ini dikurangi jam datang, minimal 1 jam.
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

    // Alokasi berat surplus ke tier sesuai kondisi; kondisi segar tidak dialokasikan ke tier penyelamatan.
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

    // Baris hasil per kios: stok awal, surplus, skor, sisa jam, urgensi, tier, dan harga penyelamatan.
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

  // Ringkasan agregat: jumlah kios, total stok, total surplus, alokasi tiap tier, dan dampak cuaca.
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

// Memvalidasi kepatuhan gerbang mutu etis dan anti-moral hazard (Invarian 1 / PSR-21).
// Melarang pengalihan sayuran yang masih layak konsumsi manusia (decayScore < 0.85)
// ke saluran pakan ternak / budidaya maggot BSF (Tier 3).
export function validateQualityGateMoralHazard(
  decayScore: number,
  requestedTier: RescueTier
): { isPermitted: boolean; violationReason?: string } {
  const isHumanEdible = decayScore < 0.85;

  // Pelanggaran Invarian 1: bahan yang masih layak dimakan manusia (skor di bawah 0,85) dilarang dialihkan ke maggot.
  if (isHumanEdible && requestedTier === 'tier_3') {
    return {
      isPermitted: false,
      violationReason:
        'Pelanggaran gerbang mutu: sayur masih layak makan (skor < 0.85), tidak boleh dialihkan ke maggot.',
    };
  }

  return { isPermitted: true };
}
