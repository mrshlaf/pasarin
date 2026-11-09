/**
 * Rute API Pemicu Siklus Orkestrasi dan Evaluasi Mutu Stok Manual (PSR-17).
 * Menyediakan titik masuk bagi administrator untuk menjalankan evaluasi stok 30 kios secara massal
 * dan mengembalikan snapshot ruang kerja terbaru hasil perhitungan alokasi sirkular.
 */

import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/apiAuth";
import { getMarketOperations } from "@/lib/marketOperations";
import { publishMarketOffers, readMarketSnapshot } from "@/lib/serverSimulationState";

/**
 * Mengembalikan metrik beban kerja operasional pasar terkini kepada pengawas (Admin/Manajer).
 *
 * @param req - Objek NextRequest masuk.
 * @returns Respons API berisi metrik operasional.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole(req, ["admin", "manager"]);
  if (auth.response) return auth.response;
  try {
    return successResponse(await getMarketOperations());
  } catch {
    return errorResponse("Data pasar belum tersedia.", 503);
  }
}

/**
 * Menjalankan evaluasi kinetika mutu stok seluruh kios dan menerbitkan usulan penawaran penyelamatan pangan.
 *
 * @param req - Objek NextRequest masuk.
 * @returns Respons API status evaluasi dan snapshot ruang kerja termutakhir.
 */
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

/**
 * Menjawab probe pemantauan ketersediaan endpoint tanpa menjalankan evaluasi stok fisik.
 *
 * @returns Respons HTTP 200 OK.
 */
export async function HEAD() {
  return new Response(null, { status: 200 });
}
