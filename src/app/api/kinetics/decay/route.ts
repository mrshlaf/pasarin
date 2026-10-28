/**
 * GET /api/kinetics/decay: hitung peluruhan kinetika komoditas (single / batch 30 komoditas)
 * POST /api/kinetics/decay: evaluasi dinamis batch item inventaris lapak
 */

import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  evaluateProduceById,
  getAllCommodityEvaluations,
} from "@/lib/pasarinCore";
import { DecayEvaluationResult } from "@/types/api";

export const dynamic = "force-dynamic";

// Evaluasi via query params (?commodityId=kangkung&hoursElapsed=8.5)
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;

    const commodityId = searchParams.get("commodityId");
    const hoursElapsed = Number(searchParams.get("hoursElapsed") ?? "10.5");
    const temperatureC = Number(searchParams.get("temperatureC") ?? "32.5");
    const humidityPercent = Number(searchParams.get("humidityPercent") ?? "75");

    if (isNaN(hoursElapsed) || hoursElapsed < 0) {
      return errorResponse("Parameter hoursElapsed wajib berupa angka bernilai positif", 400);
    }

    if (commodityId && commodityId.trim().length > 0) {
      const singleEvaluation: DecayEvaluationResult | null = evaluateProduceById(
        commodityId,
        hoursElapsed,
        temperatureC,
        humidityPercent
      );

      if (!singleEvaluation) {
        return errorResponse(
          `Komoditas dengan ID '${commodityId}' tidak ditemukan dalam katalog 30 komoditas pasar`,
          404
        );
      }

      return successResponse(singleEvaluation, 200);
    }

    // Default: evaluasi batch seluruh 30 komoditas
    const batchEvaluations: DecayEvaluationResult[] = getAllCommodityEvaluations(
      hoursElapsed,
      temperatureC,
      humidityPercent
    );

    return successResponse(batchEvaluations, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal kalkulasi kinetika";
    console.error("[GET /api/kinetics/decay Error]:", error);
    return errorResponse(message, 500);
  }
}

// Evaluasi batch via POST body JSON
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { items, hoursElapsed = 10.5, temperatureC = 32.5, humidityPercent = 75 } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse("Body request wajib memuat array 'items' non-kosong", 400);
    }

    const results: DecayEvaluationResult[] = [];
    const notFoundIds: string[] = [];

    for (const item of items) {
      const commId = typeof item === "string" ? item : item.commodityId;
      const itemHours = typeof item === "object" && item.hoursElapsed !== undefined ? item.hoursElapsed : hoursElapsed;

      const evalResult = evaluateProduceById(commId, itemHours, temperatureC, humidityPercent);
      if (evalResult) {
        results.push(evalResult);
      } else {
        notFoundIds.push(commId);
      }
    }

    return successResponse(
      {
        totalEvaluated: results.length,
        notFoundCount: notFoundIds.length,
        notFoundIds,
        evaluations: results,
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses payload POST peluruhan";
    console.error("[POST /api/kinetics/decay Error]:", error);
    return errorResponse(message, 500);
  }
}

// Health probe tanpa payload
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
