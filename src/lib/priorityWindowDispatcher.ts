/**
 * Modul Pengatur Jendela Waktu Prioritas Dapur Sosial Tier 2 (PSR-23).
 * Menerapkan spesifikasi Invarian 3 (30-Minute Priority Window) dari PRD:
 * 1. Menghitung waktu mundur 30 menit sejak penawaran Tier 2 diterbitkan.
 * 2. Memblokir klaim pihak budidaya maggot selama masa reservasi sosial masih aktif.
 * 3. Memungkinkan pengalihan mandiri (auto-downgrade) ke biomassa pakan maggot jika masa reservasi 30 menit berakhir tanpa klaim.
 */

import { RescueOffer } from "@/lib/simulationStore";

/**
 * Durasi default jendela waktu reservasi eksklusif Dapur Sosial (30 menit).
 */
export const SOCIAL_RESERVATION_WINDOW_MINUTES = 30;

/**
 * Hasil evaluasi jendela waktu reservasi eksklusif Dapur Sosial (PSR-23 / Invarian 3).
 */
export interface PriorityWindowEvaluationResult {
  offerId: string;
  targetTier: "tier_1" | "tier_2" | "tier_3";
  isWindowActive: boolean;
  elapsedMinutes: number;
  remainingMinutes: number;
  canSocialKitchenClaim: boolean;
  canMaggotClaim: boolean;
  actionDecision: "exclusive_social" | "open_all" | "eligible_tier3_downgrade";
  statusMessage: string;
}

/**
 * Mengevaluasi status keaktifan jendela waktu reservasi prioritas untuk penawaran Tier 2.
 *
 * @param offer - Objek penawaran surplus dari sistem.
 * @param currentClock - Waktu acuan evaluasi (default: Date.now()).
 * @param windowDurationMinutes - Durasi jendela reservasi (default: 30 menit).
 * @returns Objek hasil evaluasi jendela prioritas secara terperinci.
 */
export function evaluateTier2PriorityWindow(
  offer: Pick<RescueOffer, "id" | "targetTier"> & {
    createdAt?: string | Date;
    expiresInMinutes?: number;
  },
  currentClock: Date = new Date(),
  windowDurationMinutes: number = SOCIAL_RESERVATION_WINDOW_MINUTES
): PriorityWindowEvaluationResult {
  const isTier2 = offer.targetTier === "tier_2";

  // Jika bukan penawaran Tier 2, jendela prioritas tidak berlaku
  if (!isTier2) {
    return {
      offerId: offer.id,
      targetTier: offer.targetTier as "tier_1" | "tier_2" | "tier_3",
      isWindowActive: false,
      elapsedMinutes: 0,
      remainingMinutes: 0,
      canSocialKitchenClaim: true,
      canMaggotClaim: offer.targetTier === "tier_3",
      actionDecision: "open_all",
      statusMessage: "Jendela prioritas sosial tidak berlaku untuk alokasi non-Tier 2.",
    };
  }

  // Hitung selisih waktu dari createdAt atau fallback ke sisa durasi penawaran
  let elapsedMinutes = 0;
  if (offer.createdAt) {
    const createdTime = typeof offer.createdAt === "string" ? new Date(offer.createdAt).getTime() : offer.createdAt.getTime();
    elapsedMinutes = Math.max(0, Math.floor((currentClock.getTime() - createdTime) / 60000));
  } else if (typeof offer.expiresInMinutes === "number") {
    // Estimasi elapsed berbasis slot 30 menit default
    elapsedMinutes = Math.max(0, windowDurationMinutes - offer.expiresInMinutes);
  }

  const remainingMinutes = Math.max(0, windowDurationMinutes - elapsedMinutes);
  const isWindowActive = remainingMinutes > 0;

  if (isWindowActive) {
    return {
      offerId: offer.id,
      targetTier: "tier_2",
      isWindowActive: true,
      elapsedMinutes,
      remainingMinutes,
      canSocialKitchenClaim: true,
      canMaggotClaim: false, // Invarian 3: Sentra maggot DILARANG klaim saat jendela masih aktif
      actionDecision: "exclusive_social",
      statusMessage: `Jendela prioritas Dapur Sosial aktif. Sisa waktu eksklusif: ${remainingMinutes} menit.`,
    };
  }

  return {
    offerId: offer.id,
    targetTier: "tier_2",
    isWindowActive: false,
    elapsedMinutes,
    remainingMinutes: 0,
    canSocialKitchenClaim: true,
    canMaggotClaim: true, // Telah melewati 30 menit tanpa klaim sosial, berhak dialihkan ke Tier 3
    actionDecision: "eligible_tier3_downgrade",
    statusMessage: "Jendela prioritas 30 menit telah berakhir. Komoditas berhak dialihkan ke pakan ternak / maggot.",
  };
}

/**
 * Validasi gerbang etis pemenuhan hak pangan (Invarian 3 Gatekeeper).
 * Menolak klaim peran maggot jika jendela prioritas 30 menit Dapur Sosial masih berlangsung.
 *
 * @param offer - Penawaran yang hendak diklaim.
 * @param claimantRole - Peran aktor yang mencoba melakukan klaim.
 * @param currentClock - Waktu acuan evaluasi.
 * @returns Status kelayakan klaim beserta alasan penolakan jika terblokir.
 */
export function validateClaimAgainstPriorityWindow(
  offer: RescueOffer,
  claimantRole: "warteg" | "social_kitchen" | "maggot",
  currentClock: Date = new Date()
): { allowed: boolean; reason?: string } {
  // Evaluasi jendela prioritas Tier 2
  if (offer.targetTier === "tier_2") {
    const evalResult = evaluateTier2PriorityWindow(offer, currentClock);

    // Jika maggot mencoba klaim saat masa reservasi 30 menit masih aktif
    if (claimantRole === "maggot" && evalResult.isWindowActive) {
      return {
        allowed: false,
        reason: `KLAIM DITOLAK (Invarian 3 - PSR-23): Jendela reservasi eksklusif Dapur Sosial masih aktif (${evalResult.remainingMinutes} menit tersisa). Sentra maggot dilarang mengambil alokasi pangan bergizi ini!`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Otomasi pengalihan komoditas Tier 2 ke Tier 3 (Maggot) jika masa reservasi 30 menit telah berakhir.
 *
 * @param offers - Kumpulan seluruh penawaran yang terdaftar di sistem.
 * @param currentClock - Waktu acuan evaluasi.
 * @returns Daftar penawaran termutakhir beserta jumlah tiket yang dialihkan.
 */
export function processPriorityWindowDowngrades(
  offers: RescueOffer[],
  currentClock: Date = new Date()
): { updatedOffers: RescueOffer[]; downgradedCount: number } {
  let downgradedCount = 0;

  const updatedOffers = offers.map((offer) => {
    if (offer.targetTier === "tier_2" && offer.status === "active") {
      const evaluation = evaluateTier2PriorityWindow(offer, currentClock);
      if (!evaluation.isWindowActive && evaluation.actionDecision === "eligible_tier3_downgrade") {
        downgradedCount++;
        return {
          ...offer,
          targetTier: "tier_3" as const,
          salvagePricePerKg: Math.min(offer.salvagePricePerKg, 500),
          totalAmountIdr: Math.min(offer.salvagePricePerKg, 500) * offer.quantityKg,
        };
      }
    }
    return offer;
  });

  return { updatedOffers, downgradedCount };
}
