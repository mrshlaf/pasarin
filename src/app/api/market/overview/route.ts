/**
 * Rute API Ringkasan Publik Agregat Pasar Induk Kramat Jati.
 * Menyediakan data publik teragregasi (lot tersedia, komoditas teratas, alokasi armada)
 * dengan header cache edge CDN untuk meringankan beban server.
 */

import { errorResponse, successResponse } from "@/lib/api-response";
import { readPublicMarketOverview } from "@/lib/serverSimulationState";

/**
 * Mengembalikan data agregat pasar publik anonim tanpa mengekspos akun privat.
 *
 * @returns Respons API terformat JSON dengan instruksi cache publik.
 */
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
