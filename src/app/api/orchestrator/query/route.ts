import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/apiAuth";
import { errorResponse, successResponse, validateJsonBody } from "@/lib/api-response";
import { answerMarketQuestion, getMarketOperations } from "@/lib/marketOperations";

const roles = ["admin", "manager"] as const;
const query = z.object({ query: z.string().trim().min(1).max(1000), forceHeuristic: z.boolean().optional() });

/** Provides live operations counters to authorized supervisors. */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole(req, roles);
  if (auth.response) return auth.response;
  try {
    return successResponse(await getMarketOperations());
  } catch {
    return errorResponse("Data pasar belum tersedia.", 503);
  }
}

/** Runs a read-only market question using Gemini or the measured counts fallback. */
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

/** Allows the existing uptime probe without executing a query. */
export async function HEAD() {
  return new Response(null, { status: 200 });
}
