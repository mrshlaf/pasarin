// Mesin Pencocokan Sirkular 3-Tier (PSR-22): Haversine <= 5km, kuota harian, reputasi

import {
  CircularBuyer,
  CIRCULAR_BUYERS,
  MARKET_ANCHOR_COORDINATES,
  MAX_MATCHMAKING_RADIUS_KM,
} from "@/data/buyers";

// Radius bola bumi rata-rata (WGS-84 spherical approximation)
export const EARTH_RADIUS_KM = 6371.0;

// Bobot fungsi objektif: Jarak 50%, Kapasitas 30%, Reputasi 20%
export const MATCHMAKING_WEIGHTS = {
  DISTANCE: 0.50,    // Kedekatan fisik dari los pasar
  CAPACITY: 0.30,    // Sisa kuota tampung harian
  REPUTATION: 0.20,  // Rekam jejak mitra
} as const;

// Skor kecocokan per mitra pembeli
export interface BuyerMatchScore {
  buyerId: string;
  buyerName: string;
  tier: "tier_1" | "tier_2" | "tier_3";
  typeLabel: string;
  distanceKm: number;
  remainingCapacityKg: number;
  isEligible: boolean;
  ineligibilityReason?: string;
  subScores: {
    distanceScore: number;     // 0.0 - 1.0
    capacityScore: number;     // 0.0 - 1.0
    reputationScore: number;   // 0.0 - 1.0
    commodityPreferenceBonus: number; // 0.0 atau 0.05
  };
  totalMatchScore: number;     // 0.0 - 1.0 (Skor komposit terbobot)
  estimatedTransitMinutes: number;
}

// Output hasil pencocokan mitra untuk satu lot surplus
export interface MatchmakingResult {
  offerId: string;
  commodityId: string;
  quantityKg: number;
  targetTier: "tier_1" | "tier_2" | "tier_3";
  marketAnchor: {
    latitude: number;
    longitude: number;
    name: string;
  };
  searchRadiusKm: number;
  totalCandidatesEvaluated: number;
  totalEligibleMatches: number;
  rankedMatches: BuyerMatchScore[];
  topRecommendedBuyer: CircularBuyer | null;
  matchmakingDurationMs: number;
  executedAt: string;
}

// Jarak lingkaran besar antar koordinat GPS bumi via formula trigonometri Haversine
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180.0;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  // Formula Haversine: a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
  const a =
    Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);

  // Sudut sentral c = 2 * atan2(√a, √(1−a))
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));

  const distance = EARTH_RADIUS_KM * c;
  return Number(distance.toFixed(3));
}

// Evaluasi dan pemeringkatan mitra pembeli (hard constraints: radius <= 5 km, tier, kapasitas)
export function findMatchesForOffer(
  offer: {
    id: string;
    commodityId: string;
    quantityKg: number;
    targetTier: "tier_1" | "tier_2" | "tier_3";
  },
  options?: {
    maxRadiusKm?: number;
    customBuyers?: CircularBuyer[];
    originCoordinates?: { latitude: number; longitude: number; name: string };
  }
): MatchmakingResult {
  const startTime = performance.now();

  const maxRadiusKm = options?.maxRadiusKm ?? MAX_MATCHMAKING_RADIUS_KM;
  const buyersPool = options?.customBuyers ?? CIRCULAR_BUYERS;
  const origin = options?.originCoordinates ?? MARKET_ANCHOR_COORDINATES;

  const matchScores: BuyerMatchScore[] = [];

  for (const buyer of buyersPool) {
    // 1. Filter Kategori Tier (Isolasi Peran Sirkular)
    if (buyer.tier !== offer.targetTier) {
      continue;
    }

    // 2. Kalkulasi Jarak Riil via Formula Haversine
    const distanceKm = haversineDistanceKm(
      origin.latitude,
      origin.longitude,
      buyer.latitude,
      buyer.longitude
    );

    // 3. Evaluasi Kapasitas Serap Harian yang Tersisa
    const remainingCapacityKg = Math.max(0, buyer.dailyCapacityKg - buyer.currentAllocatedKg);

    // 4. Verifikasi Kelayakan (Hard Constraints)
    let isEligible = true;
    let ineligibilityReason: string | undefined;

    if (distanceKm > maxRadiusKm) {
      isEligible = false;
      ineligibilityReason = `Jarak lokasi (${distanceKm} km) melebihi batas radius maksimal ${maxRadiusKm} km`;
    } else if (remainingCapacityKg < offer.quantityKg) {
      isEligible = false;
      ineligibilityReason = `Sisa kapasitas harian (${remainingCapacityKg} kg) tidak mencukupi untuk muatan ${offer.quantityKg} kg`;
    }

    // 5. Pembobotan Sub-Skor Ternormalisasi (0.0 s/d 1.0)
    // Skor Jarak: Makin dekat ke pasar, skor makin mendekati 1.0
    const distanceScore = Math.max(0.0, 1.0 - distanceKm / maxRadiusKm);

    // Skor Kapasitas: Rasio sisa kuota terhadap total kapasitas harian
    const capacityScore =
      buyer.dailyCapacityKg > 0 ? remainingCapacityKg / buyer.dailyCapacityKg : 0.0;

    // Skor Reputasi: Ternormalisasi ke skala 0.0 - 1.0
    const reputationScore = Math.min(1.0, Math.max(0.0, buyer.reputationScore / 100.0));

    // Bonus Preferensi Komoditas: Tambahan 0.05 jika komoditas termasuk daftar favorit pembeli
    const isPreferred =
      buyer.preferredCommodities.includes(offer.commodityId) ||
      buyer.preferredCommodities.includes("semua_organik");
    const commodityPreferenceBonus = isPreferred ? 0.05 : 0.0;

    // 6. Hitung Skor Komposit Terbobot
    const compositeScore =
      MATCHMAKING_WEIGHTS.DISTANCE * distanceScore +
      MATCHMAKING_WEIGHTS.CAPACITY * capacityScore +
      MATCHMAKING_WEIGHTS.REPUTATION * reputationScore +
      commodityPreferenceBonus;

    const totalMatchScore = isEligible
      ? Number(Math.min(1.0, compositeScore).toFixed(4))
      : 0.0;

    // Estimasi Waktu Angkut Kurir (asumsi kecepatan padat perkotaan Jakarta 15 km/jam + 5 menit muat)
    const estimatedTransitMinutes = Math.round(distanceKm * 4.0 + 5.0);

    matchScores.push({
      buyerId: buyer.id,
      buyerName: buyer.name,
      tier: buyer.tier,
      typeLabel: buyer.typeLabel,
      distanceKm,
      remainingCapacityKg,
      isEligible,
      ineligibilityReason,
      subScores: {
        distanceScore: Number(distanceScore.toFixed(3)),
        capacityScore: Number(capacityScore.toFixed(3)),
        reputationScore: Number(reputationScore.toFixed(3)),
        commodityPreferenceBonus,
      },
      totalMatchScore,
      estimatedTransitMinutes,
    });
  }

  // 7. Pengurutan Prioritas: Mitra yang memenuhi syarat dengan skor tertinggi berada di puncak
  matchScores.sort((a, b) => {
    if (a.isEligible && !b.isEligible) return -1;
    if (!a.isEligible && b.isEligible) return 1;
    return b.totalMatchScore - a.totalMatchScore;
  });

  const eligibleMatches = matchScores.filter((m) => m.isEligible);
  const topMatch = eligibleMatches.length > 0 ? eligibleMatches[0] : null;
  const topRecommendedBuyer = topMatch
    ? buyersPool.find((b) => b.id === topMatch.buyerId) ?? null
    : null;

  const endTime = performance.now();
  const matchmakingDurationMs = Number((endTime - startTime).toFixed(2));

  return {
    offerId: offer.id,
    commodityId: offer.commodityId,
    quantityKg: offer.quantityKg,
    targetTier: offer.targetTier,
    marketAnchor: origin,
    searchRadiusKm: maxRadiusKm,
    totalCandidatesEvaluated: matchScores.length,
    totalEligibleMatches: eligibleMatches.length,
    rankedMatches: matchScores,
    topRecommendedBuyer,
    matchmakingDurationMs,
    executedAt: new Date().toISOString(),
  };
}

// Eksekusi pemadanan batch untuk seluruh antrean penawaran aktif
export function batchMatchOffers(
  offers: Array<{
    id: string;
    commodityId: string;
    quantityKg: number;
    targetTier: "tier_1" | "tier_2" | "tier_3";
  }>
): MatchmakingResult[] {
  return offers.map((offer) => findMatchesForOffer(offer));
}

// Fasad terpadu mesin pencocokan sirkular (PSR-22)
export const matchmakingEngine = {
  haversineDistanceKm,
  findMatchesForOffer,
  batchMatchOffers,
  MAX_RADIUS_KM: MAX_MATCHMAKING_RADIUS_KM,
  ANCHOR: MARKET_ANCHOR_COORDINATES,
};
