import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/apiAuth";
import { getMarketOperations } from "@/lib/marketOperations";
import { publishMarketOffers, readMarketSnapshot } from "@/lib/serverSimulationState";

/** Returns the current operational workload to supervisors. */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole(req, ["admin", "manager"]);
  if (auth.response) return auth.response;
  try {
    return successResponse(await getMarketOperations());
  } catch {
    return errorResponse("Data pasar belum tersedia.", 503);
  }
}

/** Runs a live stock review and returns the resulting workspace snapshot. */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(req, ["admin"]);
  if (auth.response) return auth.response;
  try {
    const result = await publishMarketOffers();
    if (!result.success) return errorResponse(result.message, result.status);
    return successResponse({ message: result.message, state: await readMarketSnapshot(auth.user) });
  } catch {
    return errorResponse("Evaluasi stok belum dapat dijalankan.", 503);
  }
}

/** Answers monitoring probes without performing a stock review. */
export async function HEAD() {
  return new Response(null, { status: 200 });
}
