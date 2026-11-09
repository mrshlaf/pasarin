/**
 * Rute API Mesin Pencocokan Sirkular 3-Tier (PSR-22 / Matchmaking Engine API).
 * Menghitung kecocokan geografis dan kapasitas serap mitra pembeli sirkular
 * berdasarkan jarak radius (haversine) dan kompatibilitas komoditas.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse, validateJsonBody } from "@/lib/api-response";
import {
  findMatchesForOffer,
  batchMatchOffers,
  MatchmakingResult,
} from "@/lib/matchmakingEngine";

export const dynamic = "force-dynamic";

const matchOffer = z.object({
  id: z.string().min(1).max(100),
  commodityId: z.string().min(1).max(100),
  quantityKg: z.number().positive().max(10_000),
  targetTier: z.enum(["tier_1", "tier_2", "tier_3"]),
});
const matchBatch = z.object({ offers: z.array(matchOffer).min(1).max(200) });

/**
 * Mencari rekomendasi pembeli sirkular terdekat berdasarkan parameter kueri URL.
 *
 * @param req - Objek NextRequest pembawa parameter kueri pencocokan.
 * @returns Respons JSON daftar kandidat pembeli yang diurutkan berdasarkan skor gabungan.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;

    const commodityId = searchParams.get("commodityId") ?? "kangkung";
    const quantityKg = Number(searchParams.get("quantityKg") ?? "30");
    const targetTier = (searchParams.get("targetTier") ?? "tier_1") as "tier_1" | "tier_2" | "tier_3";
    const maxRadiusKm = Number(searchParams.get("radiusKm") ?? "5.0");

    const offer = matchOffer.safeParse({ id: `ofr_query_${Date.now()}`, commodityId, quantityKg, targetTier });
    if (!offer.success || !Number.isFinite(maxRadiusKm) || maxRadiusKm <= 0) {
      return errorResponse("Parameter pencocokan tidak valid.", 400);
    }
    const matchmakingResult: MatchmakingResult = findMatchesForOffer(offer.data, { maxRadiusKm });

    return successResponse(matchmakingResult, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses pencocokan pembeli sirkular";
    console.error("[GET /api/matchmaking Error]:", error);
    return errorResponse(message, 500);
  }
}

/**
 * Mengevaluasi rekomendasi pencocokan pembeli untuk kumpulan penawaran secara massal.
 *
 * @param req - Objek NextRequest pembawa array penawaran surplus.
 * @returns Respons JSON rekapitulasi hasil pencocokan batch.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const input = await validateJsonBody(req, matchBatch);
    if (!input.success) return input.errorResponse;
    const { offers } = input.data;

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

/**
 * Menangani pemeriksaan ketersediaan ringan (probe) rute pencocokan.
 *
 * @returns Respons HTTP 200 OK kosong.
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
