/**
 * Rute API Tanya Jawab Pengelola Pasar Berbasis ReAct AI Gemini (PSR-17 / PSR-18).
 * Memproses pertanyaan bahasa alami manajerial mengenai rantai pasok dan operasional pasar
 * menggunakan Google Gemini 2.0 Flash dengan fail-safe generator heuristik terukur.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/apiAuth";
import { errorResponse, successResponse, validateJsonBody } from "@/lib/api-response";
import { answerMarketQuestion, getMarketOperations } from "@/lib/marketOperations";

const roles = ["admin", "manager"] as const;
const query = z.object({ query: z.string().trim().min(1).max(1000), forceHeuristic: z.boolean().optional() });

/**
 * Menyediakan metrik langsung operasional pasar untuk pengawas terotorisasi (Manajer/Admin).
 *
 * @param req - Objek NextRequest masuk.
 * @returns Respons API berisi metrik operasional pasar hari ini.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole(req, roles);
  if (auth.response) return auth.response;
  try {
    return successResponse(await getMarketOperations());
  } catch {
    return errorResponse("Data pasar belum tersedia.", 503);
  }
}

/**
 * Memproses kueri bahasa alami manajerial pengelola pasar menggunakan model Gemini atau fallback heuristik.
 *
 * @param req - Objek NextRequest masuk.
 * @returns Respons API ringkasan jawaban manajerial.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(req, roles);
  if (auth.response) return auth.response;
  const input = await validateJsonBody(req, query);
  if (!input.success) return input.errorResponse;
  try {
    return successResponse(await answerMarketQuestion(input.data.query, input.data.forceHeuristic));
  } catch {
    return errorResponse("Data pasar belum tersedia.", 503);
  }
}

/**
 * Endpoint probe kesiapan uptime server tanpa mengeksekusi komputasi kueri AI.
 *
 * @returns Respons HTTP 200 OK kosong.
 */
export async function HEAD() {
  return new Response(null, { status: 200 });
}
