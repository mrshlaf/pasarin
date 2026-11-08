import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse, validateJsonBody } from "@/lib/api-response";
import { requireApiRole } from "@/lib/apiAuth";
import {
  addVendorStockServer, decideVendorOffer, readMarketSnapshot, payOfferServer,
  publishMarketOffers, confirmDeliveryServer,
} from "@/lib/serverSimulationState";

const offerId = z.string().min(1).max(100);
const actions = z.discriminatedUnion("action", [
  z.object({ action: z.literal("stock"), commodityId: z.string().min(1).max(100), quantityKg: z.number().positive().max(10000) }),
  z.object({ action: z.literal("publish"), stockId: offerId }),
  z.object({ action: z.literal("vendor_decision"), offerId, approved: z.boolean() }),
  z.object({ action: z.literal("payment"), offerId }),
  z.object({ action: z.literal("delivery"), offerId }),
]);

/** Returns the current data and decay visible to this account. */
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

/** Validates a market action before executing the authorized state transition. */
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
          result = await publishMarketOffers(user.vendorId, data.stockId);
        } else {
          result = await decideVendorOffer(data.offerId, user.vendorId, data.approved);
        }
        break;
      case "payment":
        if (user.role !== "warteg") return forbidden();
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
