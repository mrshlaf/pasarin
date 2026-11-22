/**
 * Rute API Asisten Publik Landing Page.
 * Menjawab pertanyaan pengunjung yang belum masuk dari etalase publik dan panduan PASARIN.
 * Dibatasi 12 pertanyaan per 5 menit per alamat IP agar kuota model tidak habis.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse, validateJsonBody } from "@/lib/api-response";
import { answerPublicQuestion } from "@/lib/publicChatbot";
import { allowRequest } from "@/lib/rateLimit";

const query = z.object({ query: z.string().trim().min(1).max(500), forceHeuristic: z.boolean().optional() });

/**
 * Menjawab satu pertanyaan pengunjung. Validasi dijalankan sebelum kuota dihitung
 * sehingga permintaan rusak tidak memakan jatah pertanyaan.
 *
 * @returns 200 berisi jawaban, 422 untuk input tidak valid, 429 bila melewati batas, atau 503 bila data pasar tidak tersedia.
 */
export async function POST(req: NextRequest) {
  const input = await validateJsonBody(req, query);
  if (!input.success) return input.errorResponse;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonim";
  if (!allowRequest("public:" + ip, 12, 5 * 60 * 1000)) {
    return errorResponse("Terlalu banyak pertanyaan dalam waktu singkat. Coba lagi beberapa menit lagi.", 429);
  }
  try {
    return successResponse(await answerPublicQuestion(input.data.query, input.data.forceHeuristic));
  } catch {
    return errorResponse("Data pasar belum tersedia.", 503);
  }
}
