/**
 * Modul Standarisasi Label Status Pesanan Penyelamatan Pangan (PSR-37).
 * Menyediakan pemetaan status lot penawaran dan pembayaran ke dalam label Bahasa Indonesia
 * yang seragam di seluruh antarmuka peran (pedagang, pembeli, kurir, pengawas).
 */

import type { RescueOffer } from "@/types/market";

/**
 * Memetakan status penawaran dan status pembayaran rekening escrow ke label deskriptif berbahasa Indonesia.
 *
 * @param offer - Objek penawaran RescueOffer.
 * @returns Label status deskriptif ("Selesai", "Menunggu pembayaran", "Siap diantar", "Perlu persetujuan", "Tersedia", "Ditolak").
 */
export function orderStatus(offer: RescueOffer) {
  if (offer.status === "settled") return "Selesai";
  if (offer.status === "claimed") return offer.paymentStatus === "unpaid" ? "Menunggu pembayaran" : "Siap diantar";
  if (offer.status === "pending_vendor") return "Perlu persetujuan";
  return offer.status === "active" ? "Tersedia" : "Ditolak";
}
