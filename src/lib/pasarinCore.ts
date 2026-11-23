// Modul Inti Kinetika Peluruhan Biologis Hortikultura Tropis (PSR-14).
// Menghitung kecepatan peluruhan dengan persamaan Arrhenius; energi aktivasi tiap komoditas diturunkan dari koefisien Q10-nya.
// Menentukan skor kebusukan (decayScore 0.00 - 1.00), alokasi penyelamatan sirkular 3-Tier,
// serta harga penyelamatan dari satu tabel diskon dengan perlindungan batas bawah modal pedagang (Price Floor Protection).

import { Commodity, COMMODITIES } from "@/data/commodities";
import {
  DecayEvaluationResult,
  ProduceCondition,
  CircularRescueTier,
} from "@/types/api";

// Konstanta gas universal R dalam satuan J/(mol·K) (PSR-14).
export const UNIVERSAL_GAS_CONSTANT_R = 8.314; // J/(mol·K)

// Selisih skala Celsius dan Kelvin; persamaan Arrhenius memakai suhu mutlak.
const KELVIN_OFFSET = 273.15;

// Q10 komoditas dibaca pada rentang suhu los pasar 27,5 sampai 37,5 C (simetris di sekitar suhu acuan 32,5 C).
// Energi aktivasi diturunkan dari rentang ini, jadi pada rentang itu model Arrhenius memberi kelipatan tepat sebesar Q10.
export const Q10_RANGE_LOW_C = 27.5;
export const Q10_RANGE_HIGH_C = 37.5;

// Q10 bawaan bila data komoditas kosong atau tidak valid.
export const DEFAULT_Q10 = 2.0;

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

// Energi aktivasi peluruhan komoditas (J/mol), diturunkan dari Q10: Ea = R x ln(Q10) x T1 x T2 / 10,
// dengan T1 = 27,5 C dan T2 = 37,5 C dalam Kelvin. Literatur pascapanen umumnya melaporkan Q10, bukan Ea, jadi Ea dihitung dari Q10.
// Contoh: kangkung Q10 2,5 memberi Ea = 8,314 x 0,916 x 300,65 x 310,65 / 10 = sekitar 71 kJ/mol.
export function activationEnergyJPerMol(commodity: Commodity) {
  const q10 = commodity.q10Coefficient > 0 ? commodity.q10Coefficient : DEFAULT_Q10;
  const t1 = Q10_RANGE_LOW_C + KELVIN_OFFSET;
  const t2 = Q10_RANGE_HIGH_C + KELVIN_OFFSET;
  return (UNIVERSAL_GAS_CONSTANT_R * Math.log(q10) * t1 * t2) / 10.0;
}

// Faktor suhu Arrhenius: k(T) / k(T acuan) = exp(Ea/R x (1/T acuan - 1/T)), suhu dalam Kelvin.
// Faktor frekuensi A pada k = A x e^(-Ea/RT) saling menghapus karena yang dihitung adalah rasio terhadap suhu acuan 32,5 C.
// Contoh: kangkung pada 27 C: exp(8.558 x (1/305,65 - 1/300,15)) = 0,60, jadi peluruhan sekitar 40 persen lebih lambat.
export function arrheniusTemperatureFactor(commodity: Commodity, temperatureCelsius: number) {
  const eaOverR = activationEnergyJPerMol(commodity) / UNIVERSAL_GAS_CONSTANT_R;
  const t = temperatureCelsius + KELVIN_OFFSET;
  const tRef = REFERENCE_TEMPERATURE_C + KELVIN_OFFSET;
  return Math.exp(eaOverR * (1 / tRef - 1 / t));
}

// Kecepatan peluruhan relatif terhadap kondisi acuan (32,5 C, 75 persen). Bernilai 1 pada kondisi acuan,
// di atas 1 bila lebih panas atau lebih ekstrem kelembapannya, di bawah 1 bila lebih sejuk.
// Rumus: faktor suhu Arrhenius x faktorKelembapan(RH) / faktorKelembapan(75). Q10 dan sensitivitas kelembapan diambil dari data komoditas.
// Faktor kelembapan adalah koreksi empiris di luar persamaan Arrhenius.
export function relativeDecaySpeed(commodity: Commodity, temperatureCelsius: number, relativeHumidityPercent: number) {
  // Bagian suhu: persamaan Arrhenius dengan energi aktivasi komoditas.
  const thermal = arrheniusTemperatureFactor(commodity, temperatureCelsius);
  const sensitivity = commodity.humiditySensitivityFactor;
  // Bagian kelembapan: faktor pada RH aktual dibagi faktor pada RH acuan 75 persen, supaya kondisi acuan bernilai tepat 1.
  const humidity = humidityRateFactor(relativeHumidityPercent, sensitivity) / humidityRateFactor(REFERENCE_HUMIDITY_PERCENT, sensitivity);
  // Hasil dibatasi antara kecepatan minimum dan maksimum (0,2 sampai 5 kali) agar suhu ekstrem tidak menghasilkan angka tak masuk akal.
  return Math.min(MAX_RELATIVE_SPEED, Math.max(MIN_RELATIVE_SPEED, thermal * humidity));
}

// ---------------------------------------------------------------------------------------------
// TABEL TUNGGAL MUTU, TIER, DAN DISKON. Semua harga penyelamatan di aplikasi (dasbor, katalog,
// penerbitan lot, sinkronisasi tier, seed, chatbot, Telegram, dan alat orkestrator) dihitung dari sini.
//
//   Skor susut      Kondisi        Jalur                        Diskon dari harga grosir
//   < 0,35          segar prima    eceran; bila ditawarkan      50% (diskon awal Tier 1)
//                                  ikut Tier 1
//   0,35 - < 0,65   layu ringan    Tier 1 Warteg & UMKM         50% naik linear ke 70%
//   0,65 - < 0,85   layu sedang    Tier 2 Dapur Sosial & Panti  75% naik linear ke 85% (atau donasi Rp0)
//   >= 0,85         tidak layak    Tier 3 Sentra Maggot         100% (gratis, bukan pangan)
//
// Harga = harga grosir x (1 - diskon), dibulatkan ke kelipatan Rp500, lalu dikunci harga lantai tier.
// Diskon hanya bergantung pada mutu, jadi harga tidak pernah naik ketika mutu turun.
// ---------------------------------------------------------------------------------------------

// Batas skor tiap fase mutu.
export const DECAY_THRESHOLDS = {
  LAYU_RINGAN: 0.35,
  LAYU_SEDANG: 0.65,
  TIDAK_LAYAK: 0.85,
} as const;

// Rentang diskon tiap tier pangan: diskon naik linear dari minPercent ke maxPercent sepanjang rentang skor tier itu.
export const SALVAGE_DISCOUNT_BANDS = {
  tier_1: { fromScore: DECAY_THRESHOLDS.LAYU_RINGAN, toScore: DECAY_THRESHOLDS.LAYU_SEDANG, minPercent: 50, maxPercent: 70 },
  tier_2: { fromScore: DECAY_THRESHOLDS.LAYU_SEDANG, toScore: DECAY_THRESHOLDS.TIDAK_LAYAK, minPercent: 75, maxPercent: 85 },
} as const;

// Harga lantai Tier 1: tarif dasar pakan maggot Rp1.500 ditambah margin pedagang Rp1.000; harga lantai komoditas berlaku bila lebih tinggi.
export const TIER1_PRICE_FLOOR_IDR = 2500;
// Harga lantai Tier 2 (tebus murah dapur sosial). Donasi tetap Rp0 karena dipilih pedagang, bukan hasil tabel.
export const TIER2_PRICE_FLOOR_IDR = 1000;
// Pembulatan harga ke kelipatan Rp500 agar mudah dibayar tunai.
const PRICE_STEP_IDR = 500;

// Tier yang menerima penawaran penyelamatan (lot segar yang tetap diterbitkan masuk Tier 1).
export type SalvageTier = Exclude<CircularRescueTier, "fresh">;

// Diskon nominal (persen) dari tabel menurut skor susut. Skor di bawah 0,35 memakai diskon awal Tier 1 (50 persen).
// Contoh: skor 0,50 berada di tengah Tier 1, (0,50 - 0,35) / 0,30 = 0,5, jadi diskon 50 + 0,5 x 20 = 60 persen.
export function salvageDiscountPercent(decayScore: number) {
  if (decayScore >= DECAY_THRESHOLDS.TIDAK_LAYAK) return 100;
  const band = decayScore >= DECAY_THRESHOLDS.LAYU_SEDANG ? SALVAGE_DISCOUNT_BANDS.tier_2 : SALVAGE_DISCOUNT_BANDS.tier_1;
  const progress = Math.min(1, Math.max(0, (decayScore - band.fromScore) / (band.toScore - band.fromScore)));
  return band.minPercent + Math.round(progress * (band.maxPercent - band.minPercent));
}

// Tier penyaluran menurut skor; sama dengan distributionTierForDecay di types/market.
export function salvageTierForScore(decayScore: number): SalvageTier {
  if (decayScore >= DECAY_THRESHOLDS.TIDAK_LAYAK) return "tier_3";
  return decayScore >= DECAY_THRESHOLDS.LAYU_SEDANG ? "tier_2" : "tier_1";
}

// Harga per kg setelah diskon, dibulatkan Rp500, tidak di bawah harga lantai.
function discountedPrice(commodity: Commodity, discountPercent: number, floor: number) {
  const raw = commodity.baseWholesalePricePerKg * (1.0 - discountPercent / 100.0);
  return Math.max(floor, Math.round(raw / PRICE_STEP_IDR) * PRICE_STEP_IDR);
}

// Harga lantai Tier 1 untuk satu komoditas.
function tier1Floor(commodity: Commodity) {
  return Math.max(commodity.minimumSalvagePricePerKg, TIER1_PRICE_FLOOR_IDR);
}

// Penawaran harga penyelamatan satu komoditas pada skor susut tertentu.
export interface SalvagePriceQuote {
  tier: SalvageTier;
  // Diskon dari tabel sebelum pembulatan dan harga lantai.
  nominalDiscountPercent: number;
  // Diskon nyata terhadap harga grosir setelah pembulatan dan harga lantai; angka ini yang tampil di penawaran.
  discountPercent: number;
  pricePerKg: number;
  floorPerKg: number;
  wholesalePricePerKg: number;
}

// Satu-satunya fungsi harga penyelamatan. Tier 2 juga dibatasi Rp500 di bawah harga Tier 1 termurah komoditas itu,
// supaya Invarian 2 (harga Tier 1 > Tier 2 > Tier 3) tetap berlaku meski ada pembulatan dan harga lantai.
// Contoh: kangkung Rp6.000. Skor 0,50: diskon 60 persen, Rp2.400 dibulatkan Rp2.500. Lot segar (skor 0,02) juga Rp3.000 (diskon 50 persen), tidak lebih murah.
export function quoteSalvagePrice(commodity: Commodity, decayScore: number): SalvagePriceQuote {
  const wholesale = commodity.baseWholesalePricePerKg;
  const tier = salvageTierForScore(decayScore);
  const nominalDiscountPercent = salvageDiscountPercent(decayScore);

  let pricePerKg = 0;
  let floorPerKg = 0;
  if (tier === "tier_1") {
    floorPerKg = tier1Floor(commodity);
    pricePerKg = discountedPrice(commodity, nominalDiscountPercent, floorPerKg);
  } else if (tier === "tier_2") {
    floorPerKg = TIER2_PRICE_FLOOR_IDR;
    const cheapestTier1 = discountedPrice(commodity, SALVAGE_DISCOUNT_BANDS.tier_1.maxPercent, tier1Floor(commodity));
    // Batas atas Tier 2: kelipatan Rp500 terbesar yang masih di bawah harga Tier 1 termurah (Rp2.800 menjadi Rp2.500).
    const tier2Ceiling = Math.ceil(cheapestTier1 / PRICE_STEP_IDR) * PRICE_STEP_IDR - PRICE_STEP_IDR;
    pricePerKg = Math.max(floorPerKg, Math.min(discountedPrice(commodity, nominalDiscountPercent, floorPerKg), tier2Ceiling));
  }

  const discountPercent = wholesale > 0 ? Math.min(100, Math.max(0, Math.round(100 * (1 - pricePerKg / wholesale)))) : 100;
  return { tier, nominalDiscountPercent, discountPercent, pricePerKg, floorPerKg, wholesalePricePerKg: wholesale };
}

// Invarian 2 (Strict Price Ordering) untuk satu komoditas: harga Tier 1 termurah > harga Tier 2 termahal > harga Tier 3 (gratis).
// Dicek pada titik batas tier, tempat pelanggaran paling mungkin terjadi akibat pembulatan dan harga lantai.
export function salvagePriceOrderingHolds(commodity: Commodity) {
  const cheapestTier1 = quoteSalvagePrice(commodity, DECAY_THRESHOLDS.LAYU_SEDANG - 1e-6).pricePerKg;
  const dearestTier2 = quoteSalvagePrice(commodity, DECAY_THRESHOLDS.LAYU_SEDANG).pricePerKg;
  const tier3 = quoteSalvagePrice(commodity, DECAY_THRESHOLDS.TIDAK_LAYAK).pricePerKg;
  return cheapestTier1 > dearestTier2 && dearestTier2 > tier3;
}

// Menetapkan klasifikasi mutu fisik dan alokasi penyelamatan sirkular 3-Tier berdasarkan DecayScore.
// Menegakkan Invarian 1 (Zero Edible Food to Feed): komoditas layak konsumsi manusia dilarang ke sentra maggot.
// Diskon diambil dari tabel tunggal di atas, sama dengan harga di dasbor.
export function classifyProduceCondition(decayScore: number): {
  condition: ProduceCondition;
  recommendedTier: CircularRescueTier;
  tierLabel: string;
  baseDiscountPercent: number;
} {
  const baseDiscountPercent = salvageDiscountPercent(decayScore);

  // Skor di bawah 0,35: masih segar prima untuk eceran biasa; bila tetap ditawarkan, ikut diskon awal Tier 1.
  if (decayScore < DECAY_THRESHOLDS.LAYU_RINGAN) {
    return { condition: "segar_prima", recommendedTier: "fresh", tierLabel: "Segar Prima (Eceran Normal)", baseDiscountPercent };
  }
  // Skor 0,35 sampai di bawah 0,65: layu ringan, jalur Tier 1 (Warteg dan UMKM kuliner).
  if (decayScore < DECAY_THRESHOLDS.LAYU_SEDANG) {
    return { condition: "layu_ringan", recommendedTier: "tier_1", tierLabel: "Tier 1: Warteg & Katering UMKM (Diskon 50% - 70%)", baseDiscountPercent };
  }
  // Skor 0,65 sampai di bawah 0,85: layu sedang, jalur Tier 2 (dapur sosial dan panti).
  if (decayScore < DECAY_THRESHOLDS.TIDAK_LAYAK) {
    return { condition: "layu_sedang", recommendedTier: "tier_2", tierLabel: "Tier 2: Dapur Sosial & Panti (Diskon 75% - 85% atau Donasi)", baseDiscountPercent };
  }
  // Skor 0,85 ke atas: tidak layak konsumsi manusia, jalur Tier 3 (maggot dan kompos), bukan pangan.
  return { condition: "tidak_layak", recommendedTier: "tier_3", tierLabel: "Tier 3: Sentra Maggot BSF & Biokonversi (Gratis, Non-Pangan)", baseDiscountPercent };
}

// Mengevaluasi kinetika peluruhan komoditas dengan persamaan Arrhenius dan harga penyelamatan dari tabel tunggal (PSR-14).
export function evaluateProduceDecay(
  commodity: Commodity,
  temperatureC: number,
  humidityPercent: number,
  hoursElapsed: number
): DecayEvaluationResult {
  const arrhenius = evaluateArrheniusDecay(commodity, temperatureC, humidityPercent, hoursElapsed);
  const quote = quoteSalvagePrice(commodity, arrhenius.decayScore);

  // Hasil akhir evaluasi: identitas komoditas, kondisi cuaca masukan, skor, tier, sisa jam, diskon, dan harga penyelamatan.
  return {
    commodityId: commodity.id,
    commodityName: commodity.localName || commodity.name,
    category: commodity.category,
    temperatureC,
    humidityPercent,
    hoursElapsed,
    // Kelipatan kecepatan peluruhan terhadap kondisi acuan 32,5 C dan 75 persen.
    accelerationFactor: Number(relativeDecaySpeed(commodity, temperatureC, humidityPercent).toFixed(3)),
    decayScore: arrhenius.decayScore,
    condition: arrhenius.condition,
    recommendedTier: arrhenius.recommendedTier,
    tierLabel: arrhenius.tierLabel,
    hoursRemaining: arrhenius.hoursRemaining,
    salvageDiscountPercent: quote.discountPercent,
    estimatedSalvagePriceIdr: quote.pricePerKg,
    baseWholesalePriceIdr: quote.wholesalePricePerKg,
    priceFloorIdr: quote.floorPerKg,
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

// Parameter acuan kinetika Arrhenius (PSR-14). Energi aktivasi tidak tercantum di sini karena dihitung per komoditas dari Q10.
export const ARRHENIUS_CONSTANTS = {
  GAS_CONSTANT_R: UNIVERSAL_GAS_CONSTANT_R,
  REFERENCE_TEMPERATURE_C,
  REFERENCE_HUMIDITY_PERCENT,
  Q10_RANGE_LOW_C,
  Q10_RANGE_HIGH_C,
  THERMAL_QUOTIENT_Q10: DEFAULT_Q10,
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
  // Energi aktivasi komoditas dalam kJ/mol, diturunkan dari Q10.
  activationEnergyKjPerMol: number;
  // Kelipatan kecepatan peluruhan terhadap kondisi acuan 32,5 C dan 75 persen (faktor Arrhenius x faktor kelembapan).
  relativeSpeed: number;
  // Konstanta laju per jam: bagian batas umur simpan yang terpakai tiap jam pada kondisi ini (kecepatan relatif / batas jam).
  rateConstantK: number;
  decayScore: number;
  condition: ProduceCondition;
  recommendedTier: RescueTier;
  tierLabel: string;
  // Jam tersisa sampai skor mencapai 0,85 (batas tidak layak konsumsi); 0 bila sudah lewat.
  hoursRemaining: number;
  isEdibleForHumans: boolean;
}

// Evaluasi akumulasi peluruhan (DecayScore) berbasis jam simpan dan kecepatan peluruhan Arrhenius (PSR-14).
export function evaluateArrheniusDecay(
  commodity: Commodity,
  temperatureCelsius: number,
  relativeHumidityPercent: number,
  hoursElapsed: number
): ArrheniusDecayResult {
  // Kecepatan peluruhan relatif terhadap kondisi acuan; 1 berarti jam batas komoditas berlaku apa adanya.
  const speed = relativeDecaySpeed(commodity, temperatureCelsius, relativeHumidityPercent);

  // Batas jam sampai tidak layak: dari data komoditas; jika kosong pakai umur simpan standar, dan jika kosong juga 16 jam.
  const safeHorizonHours = commodity.decayTidakLayakHour || commodity.standardShelfLifeHours || 16.0;
  // Laju per jam: bagian batas umur simpan yang terpakai tiap jam pada suhu dan kelembapan ini.
  const rateK = speed / safeHorizonHours;
  // Paparan ternormalisasi = jam pajang dibagi batas jam; bernilai 1 saat tepat di batas.
  const normalizedExposure = hoursElapsed / safeHorizonHours;
  // Skor = (paparan x kecepatan relatif)^1,15 x 0,82. Paparan x kecepatan adalah lama pajang setara pada kondisi acuan.
  // Pada paparan 1 dan kecepatan 1 skornya 0,82 (belum 0,85); eksponen 1,15 membuat peluruhan makin cepat menjelang akhir.
  // Contoh: batas 16 jam, pajang 8 jam pada kondisi acuan: 0,5^1,15 x 0,82 = 0,37. Pada suhu lebih panas dengan kecepatan 1,5: (0,75)^1,15 x 0,82 = 0,59.
  // Konstanta 0,82 dan eksponen 1,15 adalah kalibrasi buatan agar skor pada batas jam tidak langsung mencapai 0,85, bukan hasil pengukuran. Skor adalah indeks relatif.
  const rawScore = Math.pow(normalizedExposure * speed, 1.15) * 0.82;
  const decayScore = Math.min(1.0, Math.max(0.0, Number(rawScore.toFixed(4))));

  // Kondisi, tier, dan label dari klasifikasi tunggal yang juga dipakai gerbang mutu.
  const { condition, recommendedTier, tierLabel } = classifyProduceCondition(decayScore);

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
    activationEnergyKjPerMol: Number((activationEnergyJPerMol(commodity) / 1000).toFixed(1)),
    relativeSpeed: Number(speed.toFixed(4)),
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
  // Harga tebus dari tabel diskon tunggal (quoteSalvagePrice), rupiah per kg; Tier 3 bernilai 0.
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

    // Harga dari tabel diskon tunggal, sama dengan harga yang akan tampil di katalog.
    const pricing = quoteSalvagePrice(commodity, decayResult.decayScore);

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
      recommendedSalvagePricePerKg: pricing.pricePerKg,
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
