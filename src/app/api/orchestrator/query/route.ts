/**
 * Rute API Pemrosesan Kueri Bahasa Alami Pengelola Pasar (PSR-17 / PSR-18 / PRD §16).
 * Menerima pertanyaan teks natural language manajer pasar, mendekomposisi kueri melalui
 * penalaran ReAct multi-tahap (Gemini 2.0 Flash / Heuristic), dan menghasilkan sintesis keputusan.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse, validateJsonBody } from "@/lib/api-response";
import {
  processManagerialNaturalQuery,
  getLatestQueryHistory,
} from "@/lib/geminiOrchestrator";

export const dynamic = "force-dynamic";

/**
 * Skema validasi Zod untuk kueri bahasa alami manajerial.
 */
const queryPayloadSchema = z.object({
  query: z.string().min(1, "Pertanyaan kueri tidak boleh kosong"),
  forceHeuristic: z.boolean().optional(),
});

/**
 * Menangani evaluasi kueri teks bahasa alami via HTTP POST.
 *
 * @param req - Objek NextRequest pembawa muatan body JSON { query: string }.
 * @returns Respons JSON OrchestratorQueryResult berisi thoughtProcess dan executiveSummary.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const validation = await validateJsonBody(req, queryPayloadSchema);
    if (!validation.success) {
      return validation.errorResponse;
    }

    const { query, forceHeuristic } = validation.data;
    const queryResult = await processManagerialNaturalQuery(query, { forceHeuristic });

    return successResponse(queryResult, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses kueri manajerial";
    console.error("[POST /api/orchestrator/query Error]:", error);
    return errorResponse(message, 500);
  }
}

/**
 * Mengambil riwayat kueri manajerial terakhir via HTTP GET atau memproses query parameter ?q=...
 *
 * @param req - Objek NextRequest pembawa parameter kueri URL opsional.
 * @returns Respons JSON berisi hasil pemrosesan kueri atau daftar riwayat kueri sebelumnya.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;
    const queryParam = searchParams.get("query") || searchParams.get("q");

    if (queryParam && queryParam.trim().length > 0) {
      const forceHeuristic = searchParams.get("heuristic") === "true";
      const result = await processManagerialNaturalQuery(queryParam, { forceHeuristic });
      return successResponse(result, 200);
    }

    // Default: kembalikan riwayat kueri terakhir
    const history = getLatestQueryHistory(10);
    return successResponse(history, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membaca riwayat kueri";
    console.error("[GET /api/orchestrator/query Error]:", error);
    return errorResponse(message, 500);
  }
}

/**
 * Menangani pemeriksaan ketersediaan ringan (health probe) endpoint kueri orkestrator.
 *
 * @returns Respons HTTP kosong dengan status 200 OK.
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
