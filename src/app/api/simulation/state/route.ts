/**
 * Rute API Status Snapshot Simulasi Pasar dan Penanganan Mutasi Peran (PSR-4 / PSR-37).
 * Menyediakan sinkronisasi snapshot inventaris, penawaran, telemetri cuaca, dan buku besar,
 * serta memproses aksi mutasi terotorisasi (pencatatan stok, publikasi, pembayaran, dan serah terima).
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse, validateJsonBody } from "@/lib/api-response";
import { requireApiRole } from "@/lib/apiAuth";
import {
  addVendorStockServer, decideVendorOffer, readMarketSnapshot, payOfferServer,
  publishMarketOffers, confirmDeliveryServer,
} from "@/lib/serverSimulationState";

const offerId = z.string().min(1).max(100);
const confirmation = z.strictObject({
  confirmedKg: z.number().nonnegative().max(10_000),
  mode: z.enum(["sale", "donation"]).optional(),
});
const actions = z.discriminatedUnion("action", [
  z.object({ action: z.literal("stock"), commodityId: z.string().min(1).max(100), quantityKg: z.number().positive().max(10000) }),
  z.object({ action: z.literal("publish"), stockId: offerId, confirmation }),
  z.object({ action: z.literal("vendor_decision"), offerId, approved: z.boolean(), confirmation: confirmation.optional() }),
  z.object({ action: z.literal("payment"), offerId }),
  z.object({ action: z.literal("delivery"), offerId }),
]);

/**
 * Mengembalikan snapshot data pasar dan skor peluruhan biologis yang berhak dilihat oleh akun pengguna saat ini.
 *
 * @param req - Objek NextRequest masuk.
 * @returns Respons API berisi snapshot state pasar.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole(req);
  if (auth.response) return auth.response;
  try {
    return successResponse(await readMarketSnapshot(auth.user));
  } catch (error) {
    console.error("Cannot read simulation state", error);
    return errorResponse("Data pasar sedang tidak tersedia.", 503);
  }
}

/**
 * Memvalidasi dan mengeksekusi mutasi status pasar sesuai otorisasi peran pengguna.
 *
 * @param req - Objek NextRequest masuk.
 * @returns Respons API hasil mutasi status.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(req);
  if (auth.response) return auth.response;

  const validation = await validateJsonBody(req, actions);
  if (!validation.success) return validation.errorResponse;
  const { data } = validation;
  const { user } = auth;
  const forbidden = () => errorResponse("Peran ini tidak dapat menjalankan tindakan tersebut.", 403);

  try {
    let result;
    switch (data.action) {
      case "stock":
      case "publish":
      case "vendor_decision":
        if (user.role !== "vendor" || !user.vendorId) return forbidden();
        if (data.action === "stock") {
          result = await addVendorStockServer(data.commodityId, data.quantityKg, user.vendorId);
        } else if (data.action === "publish") {
          result = await publishMarketOffers(user.vendorId, data.stockId, data.confirmation);
        } else {
          result = await decideVendorOffer(data.offerId, user.vendorId, data.approved, data.confirmation);
        }
        break;
      case "payment":
        if (user.role !== "warteg" && user.role !== "social_kitchen") return forbidden();
        result = await payOfferServer(data.offerId, user.id);
        break;
      case "delivery":
        if (user.role !== "logistics") return forbidden();
        result = await confirmDeliveryServer(data.offerId);
        break;
    }

    if (!result.success) return errorResponse(result.message, result.status);
    return successResponse({
      message: result.message,
      state: await readMarketSnapshot(user),
    });
  } catch (error) {
    console.error("Cannot update simulation state", error);
    return errorResponse("Penyimpanan data pasar sedang tidak tersedia.", 503);
  }
}
