// Rute API Evaluasi Kinetika Peluruhan Biologis Hortikultura (PSR-14).
// Menyediakan endpoint HTTP GET (evaluasi tunggal/katalog lengkap via query params)
// dan POST (evaluasi muatan inventaris kustom kios pedagang).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse, validateJsonBody } from "@/lib/api-response";
import {
  evaluateProduceById,
  getAllCommodityEvaluations,
} from "@/lib/pasarinCore";
import { DecayEvaluationResult } from "@/types/api";

// Hasil bergantung pada parameter kueri tiap permintaan, jadi tidak dirender statis.
export const dynamic = "force-dynamic";

// Kondisi pajang dengan nilai bawaan 10,5 jam, 32,5 °C, dan kelembapan 75% bila tidak dikirim klien.
const conditions = z.object({
  hoursElapsed: z.number().nonnegative().default(10.5),
  temperatureC: z.number().default(32.5),
  humidityPercent: z.number().min(0).max(100).default(75),
});
// ID komoditas dibatasi 100 karakter agar kueri katalog tidak menerima string liar.
const commodityIdSchema = z.string().trim().min(1).max(100);
// Body POST: maksimal 200 item, tiap item berupa ID atau objek dengan jam pajang sendiri.
const batch = conditions.extend({
  items: z.array(z.union([
    commodityIdSchema,
    z.object({ commodityId: commodityIdSchema, hoursElapsed: z.number().nonnegative().optional() }),
  ])).min(1).max(200),
});

// Menangani evaluasi peluruhan komoditas melalui parameter kueri URL.
// Jika parameter `commodityId` disertakan, sistem mengembalikan evaluasi tunggal komoditas tersebut.
// Jika tanpa `commodityId`, sistem mengevaluasi seluruh 30 komoditas katalog pasar secara serentak.
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;

    const commodityId = searchParams.get("commodityId");
    const hoursElapsed = Number(searchParams.get("hoursElapsed") ?? "10.5");
    const temperatureC = Number(searchParams.get("temperatureC") ?? "32.5");
    const humidityPercent = Number(searchParams.get("humidityPercent") ?? "75");

    // Number() mengubah teks tak valid menjadi NaN, dan z.number() menolaknya di sini.
    if (!conditions.safeParse({ hoursElapsed, temperatureC, humidityPercent }).success) {
      return errorResponse("Parameter jam pajang, suhu, atau kelembapan tidak valid.", 400);
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

// Menangani evaluasi peluruhan biologis untuk daftar inventaris komoditas kustom berbasis muatan JSON.
// Memproses setiap entri dalam larik `items` dengan jam pajang dan kondisi mikroklimat spesifik.
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const input = await validateJsonBody(req, batch);
    if (!input.success) return input.errorResponse;
    const { items, hoursElapsed, temperatureC, humidityPercent } = input.data;

    const results: DecayEvaluationResult[] = [];
    const notFoundIds: string[] = [];

    for (const item of items) {
      const commId = typeof item === "string" ? item : item.commodityId;
      // Jam pajang per item menimpa nilai global bila disertakan.
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

// Menangani pemeriksaan ketersediaan ringan (health probe) endpoint kinetika peluruhan.
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
