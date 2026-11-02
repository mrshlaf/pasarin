/**
 * Master Data Benih Demo Surplus 3-Tier PASARIN (seedData.ts).
 * Berkas data murni tanpa konteks React agar dapat diimpor bebas oleh
 * komponen klien, rute API server, dan skrip CLI terminal.
 */

import { AppRole } from "@/lib/simulationStore";

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
  status: "pending_vendor" | "active" | "claimed" | "settled" | "rejected";
  paymentStatus: "unpaid" | "held_in_escrow" | "released_to_vendor";
  claimantRole?: "warteg" | "social_kitchen" | "maggot";
  claimedBy?: string;
  claimedAt?: string;
  allocatedDriver?: string;
  podToken?: string;
  qrisReference?: string;
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
  qrisPayload: string;
}

export const DEMO_SEED_OFFERS: RescueOffer[] = [
  // --- TIER 1: Warteg & Usaha Kuliner (Diskon 50% - 65%) ---
  {
    id: "ofr_01",
    stockId: "stk_01",
    vendorId: "vendor_kramat_01",
    commodityId: "kangkung",
    targetTier: "tier_1",
    quantityKg: 45,
    originalPricePerKg: 6000,
    salvagePricePerKg: 2500,
    discountPercentage: 58,
    totalAmountIdr: 112500,
    expiresInMinutes: 45,
    status: "active",
    paymentStatus: "unpaid",
  },
  {
    id: "ofr_02",
    stockId: "stk_02",
    vendorId: "vendor_kramat_01",
    commodityId: "bayam",
    targetTier: "tier_1",
    quantityKg: 35,
    originalPricePerKg: 7000,
    salvagePricePerKg: 2500,
    discountPercentage: 64,
    totalAmountIdr: 87500,
    expiresInMinutes: 30,
    status: "active",
    paymentStatus: "unpaid",
  },
  {
    id: "ofr_05",
    stockId: "stk_07",
    vendorId: "vendor_kramat_01",
    commodityId: "tomat",
    targetTier: "tier_1",
    quantityKg: 50,
    originalPricePerKg: 14000,
    salvagePricePerKg: 7000,
    discountPercentage: 50,
    totalAmountIdr: 350000,
    expiresInMinutes: 60,
    status: "active",
    paymentStatus: "unpaid",
  },

  // --- TIER 2: Dapur Sosial & Panti Asuhan (Subsidi 80% - 85% / Nutrisi) ---
  {
    id: "ofr_03",
    stockId: "stk_04",
    vendorId: "vendor_kramat_01",
    commodityId: "pakcoy",
    targetTier: "tier_2",
    quantityKg: 40,
    originalPricePerKg: 8000,
    salvagePricePerKg: 1200,
    discountPercentage: 85,
    totalAmountIdr: 48000,
    expiresInMinutes: 25,
    status: "active",
    paymentStatus: "unpaid",
  },
  {
    id: "ofr_06",
    stockId: "stk_05",
    vendorId: "vendor_kramat_01",
    commodityId: "buncis",
    targetTier: "tier_2",
    quantityKg: 25,
    originalPricePerKg: 12000,
    salvagePricePerKg: 2400,
    discountPercentage: 80,
    totalAmountIdr: 60000,
    expiresInMinutes: 30,
    status: "active",
    paymentStatus: "unpaid",
  },

  // --- TIER 3: Sentra Budidaya Maggot BSF & TPS 3R (Limbah Organik Non-Pangan) ---
  {
    id: "ofr_04",
    stockId: "stk_03",
    vendorId: "vendor_kramat_01",
    commodityId: "sawi_hijau",
    targetTier: "tier_3",
    quantityKg: 30,
    originalPricePerKg: 6500,
    salvagePricePerKg: 500,
    discountPercentage: 92,
    totalAmountIdr: 15000,
    expiresInMinutes: 120,
    status: "active",
    paymentStatus: "unpaid",
  },
  {
    id: "ofr_07",
    stockId: "stk_09",
    vendorId: "vendor_kramat_01",
    commodityId: "terung_ungu",
    targetTier: "tier_3",
    quantityKg: 35,
    originalPricePerKg: 7000,
    salvagePricePerKg: 400,
    discountPercentage: 94,
    totalAmountIdr: 14000,
    expiresInMinutes: 180,
    status: "active",
    paymentStatus: "unpaid",
  },

];

export const DEMO_SEED_TRANSACTIONS: EscrowTransaction[] = [];
