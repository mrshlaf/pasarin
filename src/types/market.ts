export type DistributionMode = "sale" | "donation";

export interface StockConfirmation {
  confirmedKg: number;
  mode?: DistributionMode;
}

export interface StockItem {
  id: string;
  vendorId: string;
  commodityId: string;
  initialKg: number;
  remainingKg: number;
  arrivalClock: string;
  lotNumber: string;
  hoursOffset?: number;
  createdAt?: string;
  verifiedAt?: string;
}
export interface RescueOffer {
  id: string;
  stockId: string;
  vendorId: string;
  commodityId: string;
  targetTier: "tier_1" | "tier_2" | "tier_3";
  quantityKg: number;
  originalPricePerKg: number;
  salvagePricePerKg: number;
  discountPercentage: number;
  totalAmountIdr: number;
  expiresInMinutes: number;
  createdAt?: string;
  status: "pending_vendor" | "active" | "claimed" | "settled" | "rejected";
  paymentStatus: "unpaid" | "held_in_escrow" | "released_to_vendor" | "not_required";
  distributionMode?: DistributionMode | "free";
  listingId?: string;
  reservationKey?: string;
  claimedBy?: string;
  claimedById?: string;
  isMine?: boolean;
  claimedAt?: string;
  deliveredOn?: string;
}

/** Treats older zero-price social orders as donations and older listings as sales. */
export function isDonation(offer: Pick<RescueOffer, "distributionMode" | "targetTier" | "totalAmountIdr" | "status">) {
  return offer.targetTier === "tier_2" && (offer.distributionMode === "donation" || (offer.distributionMode === undefined &&
    offer.totalAmountIdr === 0 && (offer.status === "claimed" || offer.status === "settled")));
}

/** Keeps the price history of older paid orders while identifying free Tier 3 stock. */
export function isFreeMaggotOffer(offer: Pick<RescueOffer, "targetTier" | "status" | "paymentStatus">) {
  return offer.targetTier === "tier_3" && (offer.status === "active" || offer.status === "pending_vendor" || offer.paymentStatus === "not_required");
}

/** Includes free claims in the same courier queue as paid orders. */
export function isReadyForDelivery(offer: Pick<RescueOffer, "status" | "paymentStatus">) {
  return offer.status === "claimed" && (offer.paymentStatus === "held_in_escrow" || offer.paymentStatus === "not_required");
}

/** Keeps the physical ledger at the precision used by intake and claims. */
export function roundKg(value: number) {
  return Math.round(value * 100) / 100;
}

/** Routes stock by its current decay score before the seller chooses sale or donation. */
export function distributionTierForDecay(score: number): RescueOffer["targetTier"] {
  return score < 0.65 ? "tier_1" : score < 0.85 ? "tier_2" : "tier_3";
}

/** Awards at most one point for each stock lot that has completed a donation. */
export function completedDonationLots(offers: RescueOffer[], vendorId: string) {
  return new Set(offers.filter((offer) => offer.vendorId === vendorId && offer.status === "settled" && isDonation(offer))
    .map((offer) => offer.stockId)).size;
}

export interface EscrowTransaction {
  id: string;
  offerId: string;
  buyerName: string;
  vendorName: string;
  commodityName: string;
  amountIdr: number;
  status: "held_in_escrow" | "released" | "refunded";
  createdAt: string;
  releasedAt?: string;
}
