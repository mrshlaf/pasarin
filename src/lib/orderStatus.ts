// Modul Standarisasi Label Status Pesanan Penyelamatan Pangan (PSR-37).
// Menyediakan pemetaan status lot penawaran dan pembayaran ke dalam label Bahasa Indonesia
// yang seragam di seluruh antarmuka peran (pedagang, pembeli, kurir, pengawas).

import type { RescueOffer } from "@/types/market";

// Memetakan status penawaran dan status pembayaran rekening escrow ke label deskriptif berbahasa Indonesia.
export function orderStatus(offer: RescueOffer) {
  // Urutan pengecekan mengikuti alur hidup pesanan: selesai, diklaim, menunggu vendor, lalu aktif atau ditolak.
  if (offer.status === "settled") return "Selesai";
  // Setelah diklaim, statusnya bergantung pada pembayaran escrow.
  if (offer.status === "claimed") return offer.paymentStatus === "unpaid" ? "Menunggu pembayaran" : "Siap diantar";
  if (offer.status === "pending_vendor") return "Perlu persetujuan";
  return offer.status === "active" ? "Tersedia" : "Ditolak";
}
