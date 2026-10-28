/**
 * Endpoint Evaluasi Kinetika Peluruhan Biologis Arrhenius-Q10
 *
 * Rute: GET /api/kinetics/decay
 * Rute: POST /api/kinetics/decay
 *
 * @see Jira Ticket PSR-14 (Biological Shelf-Life Decay Engine)
 * @see PRD_FIX_PASARIN.md Bagian 5.1 & Bagian 15.4.1
 *
 * Kriteria Penerimaan (DoD) yang Dipenuhi:
 * [x] Laju penurunan mutu daun terbukti meningkat dua kali lipat lebih cepat pada suhu terik pasar (Arrhenius-Q10).
 * [x] Sayuran dengan masa pajang melebihi batas waktu aman otomatis masuk kategori penyelamatan tingkat pertama (Tier 1).
 * [x] Perhitungan berjalan murni berbasis formula matematika tanpa ketergantungan perangkat keras kamera.
 */

import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  evaluateProduceById,
  getAllCommodityEvaluations,
} from "@/lib/pasarinCore";
import { DecayEvaluationResult } from "@/types/api";

export const dynamic = "force-dynamic";

/**
 * Menangani permintaan HTTP GET untuk evaluasi kinetika pembusukan sayuran.
 *
 * Parameter Kueri URL (Opsional):
 * - `commodityId`: String ID komoditas (misal: 'kangkung', 'bayam', 'sawi_hijau'). Jika tidak disertakan, sistem mengevaluasi seluruh 30 komoditas.
 * - `hoursElapsed`: Angka jam pajang sejak subuh (default: 10.5 jam jika tidak diisi).
 * - `temperatureC`: Angka suhu lingkungan los pasar (°C, default: 32.5°C).
 * - `humidityPercent`: Angka kelembapan relatif los pasar (%, default: 75%).
 *
 * @param req - Objek NextRequest yang memuat parameter kueri URL.
 * @returns NextResponse berisi ApiResponse dengan objek DecayEvaluationResult tunggal atau array.
 */
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
          `Komoditas dengan ID '${commodityId}' tidak ditemukan di dalam katalog pasar`,
          404
        );
      }

      return successResponse(singleEvaluation, 200);
    }

    // Jika commodityId tidak ditentukan, evaluasi seluruh 30 komoditas pasar secara batch
    const batchEvaluations: DecayEvaluationResult[] = getAllCommodityEvaluations(
      hoursElapsed,
      temperatureC,
      humidityPercent
    );

    return successResponse(batchEvaluations, 200);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan internal saat mengevaluasi kinetika peluruhan";
    console.error("[GET /api/kinetics/decay Error]:", error);
    return errorResponse(message, 500);
  }
}

/**
 * Menangani permintaan HTTP POST untuk evaluasi kinetika dengan badan JSON terstruktur.
 *
 * @param req - Objek NextRequest yang membawa badan JSON CalculateDecayRequestPayload.
 * @returns NextResponse berisi hasil evaluasi kinetika berformat standar.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse("Request body wajib berupa objek JSON yang valid", 400);
    }

    const { commodityId, hoursElapsed, temperatureC = 32.5, humidityPercent = 75 } = body;

    if (!commodityId || typeof commodityId !== "string") {
      return errorResponse("Field 'commodityId' bertipe string wajib disertakan", 400);
    }

    const numericHours = Number(hoursElapsed);
    if (isNaN(numericHours) || numericHours < 0) {
      return errorResponse("Field 'hoursElapsed' wajib berupa angka bernilai positif", 400);
    }

    const evaluation = evaluateProduceById(
      commodityId,
      numericHours,
      Number(temperatureC),
      Number(humidityPercent)
    );

    if (!evaluation) {
      return errorResponse(`Komoditas dengan ID '${commodityId}' tidak terdaftar di katalog pasar`, 404);
    }

    return successResponse(evaluation, 200);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan internal saat memproses evaluasi kinetika";
    console.error("[POST /api/kinetics/decay Error]:", error);
    return errorResponse(message, 500);
  }
}
