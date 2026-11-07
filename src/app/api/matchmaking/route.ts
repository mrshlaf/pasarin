// Rute API Mesin Pencocokan Sirkular 3-Tier (PSR-22): GET & POST batch

import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  findMatchesForOffer,
  batchMatchOffers,
  MatchmakingResult,
} from "@/lib/matchmakingEngine";

export const dynamic = "force-dynamic";

// GET: Rekomendasi pembeli terdekat via query params (commodityId, quantityKg, targetTier, radiusKm)
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;

    const commodityId = searchParams.get("commodityId") ?? "kangkung";
    const quantityKg = Number(searchParams.get("quantityKg") ?? "30");
    const targetTier = (searchParams.get("targetTier") ?? "tier_1") as "tier_1" | "tier_2" | "tier_3";
    const maxRadiusKm = Number(searchParams.get("radiusKm") ?? "5.0");

    if (isNaN(quantityKg) || quantityKg <= 0) {
      return errorResponse("Parameter 'quantityKg' wajib berupa angka positif lebih dari nol", 400);
    }

    if (!["tier_1", "tier_2", "tier_3"].includes(targetTier)) {
      return errorResponse("Parameter 'targetTier' wajib salah satu dari: 'tier_1', 'tier_2', 'tier_3'", 400);
    }

    const matchmakingResult: MatchmakingResult = findMatchesForOffer(
      {
        id: `ofr_query_${Date.now()}`,
        commodityId,
        quantityKg,
        targetTier,
      },
      { maxRadiusKm }
    );

    return successResponse(matchmakingResult, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses pencocokan pembeli sirkular";
    console.error("[GET /api/matchmaking Error]:", error);
    return errorResponse(message, 500);
  }
}

// POST: Evaluasi batch penawaran surplus
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { offers } = body;

    if (!Array.isArray(offers) || offers.length === 0) {
      return errorResponse("Body permintaan wajib memuat larik 'offers' non-kosong", 400);
    }

    const batchResults = batchMatchOffers(offers);

    return successResponse(
      {
        totalOffersProcessed: batchResults.length,
        results: batchResults,
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses batch matchmaking";
    console.error("[POST /api/matchmaking Error]:", error);
    return errorResponse(message, 500);
  }
}

// HEAD: Probe kesehatan rute
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
