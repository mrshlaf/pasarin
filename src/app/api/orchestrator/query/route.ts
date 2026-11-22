// Rute API Asisten Dashboard.
// POST menjawab pertanyaan akun yang sedang masuk; GET memberi metrik operasional untuk pengelola dan admin.

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/apiAuth";
import { errorResponse, successResponse, validateJsonBody } from "@/lib/api-response";
import { getMarketOperations } from "@/lib/marketOperations";
import { answerDashboardQuestion } from "@/lib/marketChatbot";
import { APP_ROLES } from "@/data/accounts";

// Pertanyaan dibatasi 1000 karakter; `forceHeuristic` melewati model AI dan memakai jawaban berbasis aturan.
const query = z.object({ query: z.string().trim().min(1).max(1000), forceHeuristic: z.boolean().optional() });

// Metrik operasional pasar, hanya untuk pengelola dan admin.
export async function GET(req: NextRequest) {
  const auth = await requireApiRole(req, ["manager", "admin"]);
  if (auth.response) return auth.response;
  try {
    return successResponse(await getMarketOperations());
  } catch {
    return errorResponse("Data pasar belum tersedia.", 503);
  }
}

// Menjawab satu pertanyaan dari akun yang sedang masuk; 401 tanpa sesi, 422 untuk input tidak valid.
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(req, APP_ROLES);
  if (auth.response) return auth.response;
  const input = await validateJsonBody(req, query);
  if (!input.success) return input.errorResponse;
  try {
    return successResponse(await answerDashboardQuestion(auth.user, input.data.query, input.data.forceHeuristic));
  } catch {
    return errorResponse("Data pasar belum tersedia.", 503);
  }
}

// Pemeriksaan ketersediaan rute tanpa isi.
export async function HEAD() {
  return new Response(null, { status: 200 });
}
