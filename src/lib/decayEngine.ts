import { Commodity, COMMODITIES } from "@/data/commodities";

export interface DecayEvaluation {
  commodityId: string;
  temperatureC: number;
  humidityPercent: number;
  hoursElapsed: number;
  decayScore: number; // 0.0 - 1.0
  condition: "segar_prima" | "layu_ringan" | "layu_sedang" | "tidak_layak";
  recommendedTier: "fresh" | "tier_1" | "tier_2" | "tier_3";
  tierLabel: string;
  hoursRemaining: number;
  salvageDiscount: number; // e.g. 0.60 = 60% diskon
  estimatedSalvagePrice: number;
}

/**
 * Menghitung kinetika pembusukan biologis sayuran & buah
 * berbasis persamaan laju respirasi Arrhenius-Q10 & sensitivitas termal.
 */
export function calculateDecay(
  commodity: Commodity,
  temperatureC: number,
  humidityPercent: number,
  hoursElapsed: number
): DecayEvaluation {
  // 1. Hitung faktor kelipatan temperatur Q10
  // Rumus: Q10^((T - 25)/10)
  const tempDelta = (temperatureC - 25.0) / 10.0;
  const q10Multiplier = Math.pow(commodity.q10Coefficient, tempDelta);

  // 2. Koreksi sensitivitas kelembapan (RH rendah mempercepat dehidrasi sel)
  const rhDeficit = Math.max(0, (85.0 - humidityPercent) / 100.0);
  const rhMultiplier = 1.0 + rhDeficit * commodity.humiditySensitivityFactor;

  // 3. Laju respirasi efektif
  const effectiveRate = commodity.respirationRateBase * q10Multiplier * rhMultiplier;

  // 4. Decay Score akumulatif non-linear (0.0 s/d 1.0)
  const normalizedTime = hoursElapsed / commodity.standardShelfLifeHours;
  const rawScore = 1.0 - Math.exp(-normalizedTime * (effectiveRate / 20.0));
  const decayScore = Math.min(1.0, Math.max(0.0, Number(rawScore.toFixed(4))));

  // 5. Klasifikasi Mutu & Rekomendasi 3-Tier Sirkular
  let condition: "segar_prima" | "layu_ringan" | "layu_sedang" | "tidak_layak";
  let recommendedTier: "fresh" | "tier_1" | "tier_2" | "tier_3";
  let tierLabel: string;
  let salvageDiscount = 0;

  if (decayScore < 0.35) {
    condition = "segar_prima";
    recommendedTier = "fresh";
    tierLabel = "Segar Prima (Eceran Normal)";
    salvageDiscount = 0;
  } else if (decayScore < 0.65) {
    condition = "layu_ringan";
    recommendedTier = "tier_1";
    tierLabel = "Tier 1: Warteg & Katering (Diskon 50% - 70%)";
    // Diskon bertingkat inverse surge
    salvageDiscount = Math.min(0.7, 0.5 + (decayScore - 0.35) * 0.66);
  } else if (decayScore < 0.85) {
    condition = "layu_sedang";
    recommendedTier = "tier_2";
    tierLabel = "Tier 2: Dapur Sosial & Panti (Tebus Murah / Rp 0)";
    salvageDiscount = 0.85;
  } else {
    condition = "tidak_layak";
    recommendedTier = "tier_3";
    tierLabel = "Tier 3: Sentra Maggot BSF & Kompos (Non-Pangan)";
    salvageDiscount = 0.95;
  }

  // Sisa jam simpan aman
  const hoursRemaining = Math.max(
    0,
    Number(((1.0 - decayScore) * commodity.standardShelfLifeHours).toFixed(1))
  );

  // Estimasi harga penyelamatan per kg (memperhatikan Price Floor minimum)
  const discountPrice = Math.round(commodity.baseWholesalePricePerKg * (1 - salvageDiscount));
  const estimatedSalvagePrice = Math.max(
    commodity.minimumSalvagePricePerKg,
    discountPrice
  );

  return {
    commodityId: commodity.id,
    temperatureC,
    humidityPercent,
    hoursElapsed,
    decayScore,
    condition,
    recommendedTier,
    tierLabel,
    hoursRemaining,
    salvageDiscount: Number((salvageDiscount * 100).toFixed(0)),
    estimatedSalvagePrice,
  };
}

export function getCommodityById(id: string): Commodity | undefined {
  return COMMODITIES.find((c) => c.id === id);
}
