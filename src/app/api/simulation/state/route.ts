// Rute API Status Snapshot Simulasi Pasar dan Penanganan Mutasi Peran (PSR-4 / PSR-37).
// Menyediakan sinkronisasi snapshot inventaris, penawaran, telemetri cuaca, dan buku besar,
// serta memproses aksi mutasi terotorisasi (pencatatan stok, publikasi, pembayaran, dan serah terima).

// Impor: tipe Next, zod, pembungkus respons API, otorisasi, dan fungsi perubahan data pasar.
import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse, validateJsonBody } from "@/lib/api-response";
import { requireApiRole } from "@/lib/apiAuth";
import {
  addVendorStockServer, decideVendorOffer, readMarketSnapshot, payOfferServer,
  publishMarketOffers, confirmDeliveryServer,
} from "@/lib/serverSimulationState";

// ID lot atau stok dibatasi 100 karakter.
const offerId = z.string().min(1).max(100);
// Hasil timbang ulang pedagang; `mode` menentukan lot dijual atau didonasikan.
const confirmation = z.strictObject({
  confirmedKg: z.number().nonnegative().max(10_000),
  mode: z.enum(["sale", "donation"]).optional(),
});
// Daftar aksi mutasi yang diterima POST, dibedakan oleh field `action`.
const actions = z.discriminatedUnion("action", [
  z.object({ action: z.literal("stock"), commodityId: z.string().min(1).max(100), quantityKg: z.number().positive().max(10000) }),
  z.object({ action: z.literal("publish"), stockId: offerId, confirmation }),
  z.object({ action: z.literal("vendor_decision"), offerId, approved: z.boolean(), confirmation: confirmation.optional() }),
  z.object({ action: z.literal("payment"), offerId }),
  z.object({ action: z.literal("delivery"), offerId }),
]);

// Mengembalikan snapshot data pasar dan skor peluruhan biologis yang berhak dilihat oleh akun pengguna saat ini.
export async function GET(req: NextRequest) {
  const auth = await requireApiRole(req);
  if (auth.response) return auth.response;
  // Tiap aksi dibatasi peran (stok, terbit, keputusan: pedagang; bayar: Warteg dan dapur sosial; antar: kurir) lalu diarahkan ke fungsi server yang sesuai.
  try {
    return successResponse(await readMarketSnapshot(auth.user));
  } catch (error) {
    console.error("Cannot read simulation state", error);
    return errorResponse("Data pasar sedang tidak tersedia.", 503);
  }
}

// Memvalidasi dan mengeksekusi mutasi status pasar sesuai otorisasi peran pengguna.
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(req);
  if (auth.response) return auth.response;

  const validation = await validateJsonBody(req, actions);
  if (!validation.success) return validation.errorResponse;
  const { data } = validation;
  const { user } = auth;
  // Respons 403 seragam ketika peran tidak cocok dengan aksi.
  const forbidden = () => errorResponse("Peran ini tidak dapat menjalankan tindakan tersebut.", 403);

  try {
    let result;
    switch (data.action) {
      case "stock":
      case "publish":
      case "vendor_decision":
        // Aksi stok hanya untuk pedagang, dan selalu memakai vendorId dari sesi, bukan dari body.
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
        // Lot jalur maggot bebas biaya, jadi pembayaran hanya untuk warteg dan dapur sosial.
        if (user.role !== "warteg" && user.role !== "social_kitchen") return forbidden();
        result = await payOfferServer(data.offerId, user.id);
        break;
      case "delivery":
        if (user.role !== "logistics") return forbidden();
        result = await confirmDeliveryServer(data.offerId);
        break;
    }

    // Aksi yang gagal membawa kode status dari server; aksi sukses mengembalikan pesan dan state terbaru milik peran ini.
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
