/**
 * Rute API Validasi Gerbang Kendali Mutu & Anti-Moral Hazard (PSR-21).
 * Menyediakan endpoint HTTP POST dan GET untuk memvalidasi tiket penawaran surplus,
 * menguji kepatuhan terhadap Invarian 1 (Zero Edible Food to Feed),
 * serta mencatat upaya manipulasi moral hazard ke audit trail sistem.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse, validateJsonBody } from "@/lib/api-response";
import { verifyHumanGradeIntegrity } from "@/lib/qualityGateAgent";
import { QualityGateRequestPayload, CircularRescueTier } from "@/types/api";

export const dynamic = "force-dynamic";

/**
 * Skema validasi Zod untuk payload permintaan verifikasi gerbang mutu.
 */
const qualityGatePayloadSchema = z.object({
  commodityId: z.string().min(1, "ID komoditas tidak boleh kosong"),
  hoursOnDisplay: z.number().min(0, "Jam pajang komoditas harus bernilai non-negatif"),
  requestedTier: z.enum(["fresh", "tier_1", "tier_2", "tier_3"]),
  vendorId: z.string().optional(),
  temperatureC: z.number().optional(),
  humidityPercent: z.number().optional(),
  imageBase64: z.string().optional(),
  chlorophyllRatio: z.number().min(0).max(1).optional(),
});

/**
 * Menangani evaluasi gerbang kendali mutu via HTTP POST berbasis body JSON.
 * Digunakan oleh form penerbitan tiket penawaran pedagang dan alur cron otomatis.
 *
 * @param req - Objek NextRequest pembawa payload JSON pengajuan penawaran surplus.
 * @returns Respons JSON QualityGateEvaluationResult dengan rincian status kelulusan.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const validation = await validateJsonBody(req, qualityGatePayloadSchema);
    if (!validation.success) {
      return validation.errorResponse;
    }

    const payload: QualityGateRequestPayload = {
      commodityId: validation.data.commodityId,
      hoursOnDisplay: validation.data.hoursOnDisplay,
      requestedTier: validation.data.requestedTier as CircularRescueTier,
      vendorId: validation.data.vendorId,
      temperatureC: validation.data.temperatureC,
      humidityPercent: validation.data.humidityPercent,
      imageBase64: validation.data.imageBase64,
      chlorophyllRatio: validation.data.chlorophyllRatio,
    };
    const evaluationResult = await verifyHumanGradeIntegrity(payload);

    return successResponse(evaluationResult, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengevaluasi gerbang kendali mutu";
    console.error("[POST /api/quality-gate/validate Error]:", error);
    return errorResponse(message, 500);
  }
}

/**
 * Menangani evaluasi gerbang kendali mutu via HTTP GET berbasis parameter kueri URL.
 * Mempermudah pengujian inspeksi visual dan integrasi ReAct Tool Calling Agent.
 *
 * @param req - Objek NextRequest pembawa query params (?commodityId=...&hoursOnDisplay=...&requestedTier=...).
 * @returns Respons JSON QualityGateEvaluationResult.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;

    const commodityId = searchParams.get("commodityId");
    if (!commodityId || commodityId.trim().length === 0) {
      return errorResponse("Parameter 'commodityId' wajib disertakan", 400);
    }

    const hoursOnDisplay = Number(searchParams.get("hoursOnDisplay") ?? "4.0");
    const requestedTier = (searchParams.get("requestedTier") ?? "tier_3") as CircularRescueTier;
    const vendorId = searchParams.get("vendorId") ?? "vendor_kramat_01";
    const temperatureC = searchParams.has("temperatureC") ? Number(searchParams.get("temperatureC")) : undefined;
    const humidityPercent = searchParams.has("humidityPercent") ? Number(searchParams.get("humidityPercent")) : undefined;
    const chlorophyllRatio = searchParams.has("chlorophyllRatio") ? Number(searchParams.get("chlorophyllRatio")) : undefined;

    if (isNaN(hoursOnDisplay) || hoursOnDisplay < 0) {
      return errorResponse("Parameter 'hoursOnDisplay' harus berupa angka positif", 400);
    }

    const payload: QualityGateRequestPayload = {
      commodityId,
      hoursOnDisplay,
      requestedTier,
      vendorId,
      temperatureC,
      humidityPercent,
      chlorophyllRatio,
    };
    const evaluationResult = await verifyHumanGradeIntegrity(payload);

    return successResponse(evaluationResult, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses validasi mutu GET";
    console.error("[GET /api/quality-gate/validate Error]:", error);
    return errorResponse(message, 500);
  }
}

/**
 * Menangani pemeriksaan ketersediaan ringan (health probe) endpoint validasi gerbang mutu.
 *
 * @returns Respons HTTP kosong dengan status 200 OK.
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
