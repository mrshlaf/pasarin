/**
 * Tipe data dan entitas domain transaksi pasar PASARIN.
 * Mengatur model pasokan kios, lot penawaran penyelamatan pangan (Rescue Offer),
 * saluran distribusi (penjualan komersial vs donasi sosial), dan transaksi rekening bersama (Escrow).
 */

export type DistributionMode = "sale" | "donation";

export interface StockConfirmation {
  confirmedKg: number;
  mode?: DistributionMode;
}

export interface StockItem {
  id: string;
  vendorId: string;
  commodityId: string;
  initialKg: number;
  remainingKg: number;
  arrivalClock: string;
  lotNumber: string;
  hoursOffset?: number;
  createdAt?: string;
  verifiedAt?: string;
}

export interface RescueOffer {
  id: string;
  stockId: string;
  vendorId: string;
  commodityId: string;
  targetTier: "tier_1" | "tier_2" | "tier_3";
  quantityKg: number;
  originalPricePerKg: number;
  salvagePricePerKg: number;
  discountPercentage: number;
  totalAmountIdr: number;
  expiresInMinutes: number;
  createdAt?: string;
  status: "pending_vendor" | "active" | "claimed" | "settled" | "rejected";
  paymentStatus: "unpaid" | "held_in_escrow" | "released_to_vendor" | "not_required";
  distributionMode?: DistributionMode | "free";
  listingId?: string;
  reservationKey?: string;
  claimedBy?: string;
  claimedById?: string;
  isMine?: boolean;
  claimedAt?: string;
  deliveredOn?: string;
}

/**
 * Menentukan apakah lot penawaran merupakan transaksi donasi sosial bebas biaya (Rp0).
 * Mengidentifikasi penawaran Tier 2 untuk Dapur Sosial & Panti Asuhan baik yang berstatus aktif maupun terselesaikan.
 *
 * @param offer - Objek penawaran dengan atribut targetTier, distributionMode, totalAmountIdr, dan status.
 * @returns Boolean bernilai true jika penawaran merupakan donasi kemanusiaan.
 */
export function isDonation(offer: Pick<RescueOffer, "distributionMode" | "targetTier" | "totalAmountIdr" | "status">) {
  return offer.targetTier === "tier_2" && (offer.distributionMode === "donation" || (offer.distributionMode === undefined &&
    offer.totalAmountIdr === 0 && (offer.status === "claimed" || offer.status === "settled")));
}

/**
 * Menentukan apakah penawaran merupakan alokasi Tier 3 (Biomassa Maggot BSF) tanpa biaya tebusan (Rp0).
 * Melindungi histori transaksi berbayar sembari memfasilitasi pengalihan sisa organik non-pangan manusia.
 *
 * @param offer - Objek penawaran dengan atribut targetTier, status, dan paymentStatus.
 * @returns Boolean bernilai true jika penawaran merupakan alokasi Maggot bebas biaya.
 */
export function isFreeMaggotOffer(offer: Pick<RescueOffer, "targetTier" | "status" | "paymentStatus">) {
  return offer.targetTier === "tier_3" && (offer.status === "active" || offer.status === "pending_vendor" || offer.paymentStatus === "not_required");
}

/**
 * Memvalidasi apakah pesanan siap dijemput oleh armada logistik kurir.
 * Menegakkan syarat bahwa pesanan berbayar wajib berada dalam status dana tertahan di rekening escrow,
 * atau merupakan pesanan bebas biaya (donasi / maggot) yang sudah dikonfirmasi klaimnya.
 *
 * @param offer - Objek penawaran dengan atribut status dan paymentStatus.
 * @returns Boolean bernilai true jika muatan siap diangkut oleh kurir logistik.
 */
export function isReadyForDelivery(offer: Pick<RescueOffer, "status" | "paymentStatus">) {
  return offer.status === "claimed" && (offer.paymentStatus === "held_in_escrow" || offer.paymentStatus === "not_required");
}

/**
 * Membulatkan nilai timbangan fisik komoditas dengan presisi 2 tempat desimal (akurasi 10 gram).
 * Menjaga konsistensi pencatatan buku besar logistik fisik los pasar.
 *
 * @param value - Nilai bobot mentah dalam satuan kilogram (kg).
 * @returns Nilai bobot terstandarisasi dengan 2 desimal.
 */
export function roundKg(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Menentukan klasifikasi tier distribusi sirkular berdasarkan skor peluruhan biologis (DecayScore).
 * Tier 1: Skor < 0.65 (Warteg & UMKM), Tier 2: 0.65 - 0.85 (Dapur Sosial), Tier 3: >= 0.85 (Sentra Maggot BSF).
 *
 * @param score - Skor peluruhan biologis normalisasi (0.0000 - 1.0000).
 * @returns Klasifikasi tier peruntukan komoditas ("tier_1" | "tier_2" | "tier_3").
 */
export function distributionTierForDecay(score: number): RescueOffer["targetTier"] {
  return score < 0.65 ? "tier_1" : score < 0.85 ? "tier_2" : "tier_3";
}

/**
 * Menghitung akumulasi jumlah lot unik komoditas yang berhasil disalurkan sebagai donasi sosial oleh pedagang.
 * Digunakan untuk perhitungan skor reputasi etis pedagang dan insentif retribusi pasar.
 *
 * @param offers - Seluruh riwayat penawaran pasar.
 * @param vendorId - Pengidentifikasi unik pedagang (kios).
 * @returns Jumlah lot pasokan unik yang tuntas disumbangkan.
 */
export function completedDonationLots(offers: RescueOffer[], vendorId: string) {
  return new Set(offers.filter((offer) => offer.vendorId === vendorId && offer.status === "settled" && isDonation(offer))
    .map((offer) => offer.stockId)).size;
}

export interface EscrowTransaction {
  id: string;
  offerId: string;
  buyerName: string;
  vendorName: string;
  commodityName: string;
  amountIdr: number;
  status: "held_in_escrow" | "released" | "refunded";
  createdAt: string;
  releasedAt?: string;
}
