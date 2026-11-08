import type { RescueOffer } from "@/types/market";

/** Maps an offer and its payment to the labels used in every role. */
export function orderStatus(offer: RescueOffer) {
  if (offer.status === "settled") return "Selesai";
  if (offer.status === "claimed") return offer.paymentStatus === "unpaid" ? "Menunggu pembayaran" : "Siap diantar";
  if (offer.status === "pending_vendor") return "Perlu persetujuan";
  return offer.status === "active" ? "Tersedia" : "Ditolak";
}
