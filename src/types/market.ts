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
  paymentStatus: "unpaid" | "held_in_escrow" | "released_to_vendor";
  claimedBy?: string;
  claimedById?: string;
  isMine?: boolean;
  claimedAt?: string;
  deliveredOn?: string;
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
