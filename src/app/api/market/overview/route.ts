import { errorResponse, successResponse } from "@/lib/api-response";
import { readPublicMarketOverview } from "@/lib/serverSimulationState";

/** Returns the same anonymous market totals for every visitor. */
export async function GET() {
  try {
    const response = successResponse(await readPublicMarketOverview());
    response.headers.set("Vercel-CDN-Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    return response;
  } catch (error) {
    console.error("Cannot read public market overview", error);
    return errorResponse("Ringkasan pasar sedang tidak tersedia.", 503);
  }
}
