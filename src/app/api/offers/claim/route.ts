// Rute API Klaim Cepat Penawaran Surplus Pembeli (PSR-26)

import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { executeFastClaim, FastClaimResult } from "@/lib/buyerClaimChannel";
import { RescueOffer } from "@/lib/simulationStore";

export const dynamic = "force-dynamic";

// Mock katalog penawaran surplus aktif
let liveApiOffers: RescueOffer[] = [
  {
    id: "ofr_live_01",
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
    id: "ofr_live_02",
    stockId: "stk_04",
    vendorId: "vendor_kramat_02",
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
    id: "ofr_live_03",
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
];

// POST: Klaim instan via atomic lock
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { offerId, buyerId, buyerName, role } = body;

    if (!offerId || !buyerName || !role) {
      return errorResponse("Parameter 'offerId', 'buyerName', dan 'role' wajib disertakan", 400);
    }

    if (!["warteg", "social_kitchen", "maggot"].includes(role)) {
      return errorResponse("Nilai 'role' wajib salah satu dari: 'warteg', 'social_kitchen', 'maggot'", 400);
    }

    const claimResult: FastClaimResult = await executeFastClaim(
      liveApiOffers,
      offerId,
      {
        buyerId: buyerId ?? `buyer_${Date.now()}`,
        buyerName,
        role: role as "warteg" | "social_kitchen" | "maggot",
      }
    );

    if (!claimResult.success) {
      const httpStatus = claimResult.code === "ALREADY_CLAIMED" ? 409 : 400;
      return NextResponse.json(
        {
          success: false,
          code: claimResult.code,
          error: claimResult.message,
          offerId: claimResult.offerId,
          claimedBy: claimResult.claimedBy,
          claimedAt: claimResult.claimedAt,
          timestamp: new Date().toISOString(),
        },
        { status: httpStatus }
      );
    }

    return successResponse(claimResult, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengeksekusi klaim cepat penawaran";
    console.error("[POST /api/offers/claim Error]:", error);
    return errorResponse(message, 500);
  }
}

/**
 * Mengambil daftar penawaran aktif yang tersedia untuk klaim pembeli.
 */
export async function GET(): Promise<NextResponse> {
  const activeOffers = liveApiOffers.filter((o) => o.status === "active");
  return successResponse(activeOffers, 200);
}
