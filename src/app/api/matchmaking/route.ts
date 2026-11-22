// Rute API Mesin Pencocokan Sirkular 3-Tier (PSR-22 / Matchmaking Engine API).
// Menghitung kecocokan geografis dan kapasitas serap mitra pembeli sirkular
// berdasarkan jarak radius (haversine) dan kompatibilitas komoditas.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse, validateJsonBody } from "@/lib/api-response";
import {
  findMatchesForOffer,
  batchMatchOffers,
  MatchmakingResult,
} from "@/lib/matchmakingEngine";

// Hasil bergantung pada parameter kueri tiap permintaan, jadi tidak dirender statis.
export const dynamic = "force-dynamic";

// Satu penawaran yang dicocokkan; kuantitas dibatasi 10 ton agar perhitungan tetap wajar.
const matchOffer = z.object({
  id: z.string().min(1).max(100),
  commodityId: z.string().min(1).max(100),
  quantityKg: z.number().positive().max(10_000),
  targetTier: z.enum(["tier_1", "tier_2", "tier_3"]),
});
// Body POST: 1 sampai 200 penawaran per permintaan.
const matchBatch = z.object({ offers: z.array(matchOffer).min(1).max(200) });

// Mencari rekomendasi pembeli sirkular terdekat berdasarkan parameter kueri URL.
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;

    const commodityId = searchParams.get("commodityId") ?? "kangkung";
    const quantityKg = Number(searchParams.get("quantityKg") ?? "30");
    const targetTier = (searchParams.get("targetTier") ?? "tier_1") as "tier_1" | "tier_2" | "tier_3";
    const maxRadiusKm = Number(searchParams.get("radiusKm") ?? "5.0");

    // Cast targetTier di atas belum aman; enum di skema inilah yang benar-benar memvalidasinya.
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

// Mengevaluasi rekomendasi pencocokan pembeli untuk kumpulan penawaran secara massal.
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

// Menangani pemeriksaan ketersediaan ringan (probe) rute pencocokan.
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
