/**
 * Rute API Klaim dan Pembacaan Katalog Lot Penawaran Mitra Pembeli (PSR-26).
 * Memproses permintaan klaim instan (fast claim) oleh mitra pembeli sirkular
 * dengan proteksi idempoten (requestId) dan penegakan batasan peran (RBAC).
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse, validateJsonBody } from "@/lib/api-response";
import { requireApiRole } from "@/lib/apiAuth";
import { claimOfferServer, getSurplusOffersForRole, marketOfferForUser } from "@/lib/serverSimulationState";

const buyerRoles = ["warteg", "social_kitchen", "maggot"] as const;
const claim = z.strictObject({
  offerId: z.string().trim().min(1).max(100),
  quantityKg: z.number().positive().max(10_000).optional(),
  requestId: z.string().trim().min(1).max(100).optional(),
});

/**
 * Menangani reservasi lot penawaran khusus untuk mitra pembeli yang terotentikasi.
 *
 * @param req - Objek NextRequest masuk.
 * @returns Respons API hasil klaim lot penawaran.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(req, buyerRoles);
  if (auth.response) return auth.response;
  const { user } = auth;
  const { role } = user;
  if (role !== "warteg" && role !== "social_kitchen" && role !== "maggot") return errorResponse("Peran pembeli diperlukan.", 403);

  const input = await validateJsonBody(req, claim);
  if (!input.success) return input.errorResponse;
  try {
    const result = await claimOfferServer(input.data.offerId, { ...user, role }, input.data.quantityKg, input.data.requestId);
    if (!result.success) return errorResponse(result.message, result.status);
    return successResponse({ ...result, offer: result.offer && marketOfferForUser(result.offer, user.id) });
  } catch (error) {
    console.error("Cannot claim offer", error);
    return errorResponse("Penyimpanan data pasar sedang tidak tersedia.", 503);
  }
}

/**
 * Mengambil katalog penawaran aktif yang memenuhi syarat kelayakan bagi peran pembeli yang bersangkutan.
 *
 * @param req - Objek NextRequest masuk.
 * @returns Respons API berisi array lot penawaran yang tersedia.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole(req, buyerRoles);
  if (auth.response) return auth.response;
  const { role } = auth.user;
  if (role !== "warteg" && role !== "social_kitchen" && role !== "maggot") return errorResponse("Peran pembeli diperlukan.", 403);

  try {
    return successResponse(await getSurplusOffersForRole(role));
  } catch (error) {
    console.error("Cannot read offers", error);
    return errorResponse("Katalog pasar sedang tidak tersedia.", 503);
  }
}
