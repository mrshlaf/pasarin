/**
 * Rute API Asisten Publik Landing Page.
 * Menjawab pertanyaan pengunjung yang belum masuk dari etalase publik dan panduan PASARIN.
 * Dibatasi per alamat IP agar kuota model tidak habis oleh penggunaan berlebih.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse, validateJsonBody } from "@/lib/api-response";
import { answerPublicQuestion } from "@/lib/publicChatbot";

const query = z.object({ query: z.string().trim().min(1).max(500), forceHeuristic: z.boolean().optional() });

const WINDOW_MS = 5 * 60 * 1000;
const MAX_QUESTIONS = 12;
const recent = new Map<string, number[]>();

/** Pembatas sederhana per instans server: maksimal 12 pertanyaan per 5 menit per IP. */
function allowRequest(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonim";
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  if (times.length >= MAX_QUESTIONS) return false;
  times.push(now);
  recent.set(ip, times);
  if (recent.size > 5000) {
    for (const [key, value] of recent) if (value.every((time) => now - time >= WINDOW_MS)) recent.delete(key);
  }
  return true;
}

export async function POST(req: NextRequest) {
  const input = await validateJsonBody(req, query);
  if (!input.success) return input.errorResponse;
  if (!allowRequest(req)) return errorResponse("Terlalu banyak pertanyaan dalam waktu singkat. Coba lagi beberapa menit lagi.", 429);
  try {
    return successResponse(await answerPublicQuestion(input.data.query, input.data.forceHeuristic));
  } catch {
    return errorResponse("Data pasar belum tersedia.", 503);
  }
}
