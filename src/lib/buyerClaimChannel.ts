// Kanal Siaran Instan & Fast Claim Terproteksi Mutex Lock (PSR-26)

import { COMMODITIES } from "@/data/commodities";
import { CircularBuyer } from "@/data/buyers";
import { RescueOffer } from "@/lib/simulationStore";

// Struktur payload broadcast penawaran Telegram ke mitra pembeli
export interface BuyerBroadcastPayload {
  broadcastId: string;
  recipientBuyerId: string;
  recipientName: string;
  telegramChatId?: string;
  targetTier: "tier_1" | "tier_2" | "tier_3";
  offerId: string;
  commodityId: string;
  commodityName: string;
  quantityKg: number;
  originalPricePerKg: number;
  salvagePricePerKg: number;
  savingsPercentage: number;
  totalCostIdr: number;
  totalSavingsIdr: number;
  fastClaimUrl: string;
  expiresInMinutes: number;
  broadcastTimestamp: string;
  formattedMessageText: string;
}

// Hasil eksekusi transaksi klaim cepat pembeli
export interface FastClaimResult {
  success: boolean;
  code: "CLAIM_SUCCESS" | "OFFER_NOT_FOUND" | "ALREADY_CLAIMED" | "TIER_MISMATCH" | "LOCK_ACQUISITION_TIMEOUT";
  message: string;
  offerId: string;
  claimedBy?: string;
  claimedAt?: string;
  assignedTier?: string;
  qrisPaymentReference?: string;
  podVerificationToken?: string;
  executionDurationMs: number;
}

// In-memory mutex table untuk cegah double-claim race condition
const inMemoryClaimLocks = new Map<string, { lockedBy: string; lockedAtTimestamp: number }>();

// Acquire lock atomik sebelum mutasi offer status
function acquireAtomicClaimLock(offerId: string, claimantId: string): boolean {
  const existingLock = inMemoryClaimLocks.get(offerId);
  const now = Date.now();

  // Stale lock guard: lepas otomatis setelah 5 detik
  if (existingLock && now - existingLock.lockedAtTimestamp < 5000) {
    return false;
  }

  inMemoryClaimLocks.set(offerId, { lockedBy: claimantId, lockedAtTimestamp: now });
  return true;
}

// Release lock atomik setelah mutasi selesai
function releaseAtomicClaimLock(offerId: string): void {
  inMemoryClaimLocks.delete(offerId);
}

// Format payload pesan siaran Telegram ke pembeli
export function generateBuyerBroadcastMessage(
  offer: {
    id: string;
    commodityId: string;
    quantityKg: number;
    originalPricePerKg: number;
    salvagePricePerKg: number;
    discountPercentage: number;
    totalAmountIdr: number;
    targetTier: "tier_1" | "tier_2" | "tier_3";
    expiresInMinutes?: number;
  },
  buyer: CircularBuyer
): BuyerBroadcastPayload {
  const comm = COMMODITIES.find((c) => c.id === offer.commodityId);
  const commodityName = comm?.localName ?? offer.commodityId;

  const totalOriginal = offer.originalPricePerKg * offer.quantityKg;
  const totalCostIdr = offer.salvagePricePerKg * offer.quantityKg;
  const totalSavingsIdr = Math.max(0, totalOriginal - totalCostIdr);
  const expiresInMinutes = offer.expiresInMinutes ?? 30;

  const fastClaimUrl = `https://pasarin.id/claim?offerId=${offer.id}&buyerId=${buyer.id}`;
  const nowIso = new Date().toISOString();

  let tierHeader = "🥘 [ALOKASI WARTEG & UMKM]";
  if (offer.targetTier === "tier_2") tierHeader = "🍲 [ALOKASI PANGAN DARURAT SOSIAL]";
  if (offer.targetTier === "tier_3") tierHeader = "🪱 [ALOKASI BIOKONVERSI MAGGOT BSF]";

  const formattedMessageText = [
    `⚡ ${tierHeader} ⚡`,
    `Halo ${buyer.name}, ada stok surplus segar layak olah dari Pasar Kramat Jati:`,
    ``,
    `📦 Komoditas: *${commodityName}*`,
    `⚖️ Kuantitas: *${offer.quantityKg} kg*`,
    `💰 Harga Tebus: *Rp ${offer.salvagePricePerKg.toLocaleString("id-ID")}/kg* (Diskon ${offer.discountPercentage}%)`,
    `🏷️ Harga Normal: ~Rp ${offer.originalPricePerKg.toLocaleString("id-ID")}/kg~`,
    `💵 Total Biaya: *Rp ${totalCostIdr.toLocaleString("id-ID")}*`,
    `✨ Estimasi Hemat: *Rp ${totalSavingsIdr.toLocaleString("id-ID")}*`,
    `⏳ Masa Berlaku: *${expiresInMinutes} menit*`,
    ``,
    `Klik tombol di bawah untuk klaim instan sebelum diamankan mitra lain:`,
    `👉 ${fastClaimUrl}`,
  ].join("\n");

  return {
    broadcastId: `bc_${Date.now()}_${offer.id}_${buyer.id}`,
    recipientBuyerId: buyer.id,
    recipientName: buyer.name,
    telegramChatId: buyer.telegramChatId,
    targetTier: offer.targetTier,
    offerId: offer.id,
    commodityId: offer.commodityId,
    commodityName,
    quantityKg: offer.quantityKg,
    originalPricePerKg: offer.originalPricePerKg,
    salvagePricePerKg: offer.salvagePricePerKg,
    savingsPercentage: offer.discountPercentage,
    totalCostIdr,
    totalSavingsIdr,
    fastClaimUrl,
    expiresInMinutes,
    broadcastTimestamp: nowIso,
    formattedMessageText,
  };
}

// Eksekusi fast-claim dengan atomic mutex lock untuk cegah double-claim (PSR-26)
export async function executeFastClaim(
  offersPool: RescueOffer[],
  offerId: string,
  claimant: {
    buyerId: string;
    buyerName: string;
    role: "warteg" | "social_kitchen" | "maggot";
  }
): Promise<FastClaimResult> {
  const startTime = performance.now();

  // 1. Dapatkan Kunci Atomik (Mutex Lock)
  const lockAcquired = acquireAtomicClaimLock(offerId, claimant.buyerId);
  if (!lockAcquired) {
    const endTime = performance.now();
    return {
      success: false,
      code: "ALREADY_CLAIMED",
      message: "Mohon maaf, penawaran lot surplus ini sedang dalam proses klaim oleh mitra lain beberapa milidetik yang lalu.",
      offerId,
      executionDurationMs: Number((endTime - startTime).toFixed(2)),
    };
  }

  try {
    // 2. Cari Penawaran dalam Pool
    const targetOffer = offersPool.find((o) => o.id === offerId);
    if (!targetOffer) {
      const endTime = performance.now();
      return {
        success: false,
        code: "OFFER_NOT_FOUND",
        message: `Penawaran dengan ID '${offerId}' tidak ditemukan dalam katalog aktif pasar.`,
        offerId,
        executionDurationMs: Number((endTime - startTime).toFixed(2)),
      };
    }

    // 3. Validasi Keselarasan Peran terhadap Target Tier (Role Authorization Guard)
    const roleTierMapping: Record<string, string> = {
      warteg: "tier_1",
      social_kitchen: "tier_2",
      maggot: "tier_3",
    };

    if (roleTierMapping[claimant.role] !== targetOffer.targetTier) {
      const endTime = performance.now();
      return {
        success: false,
        code: "TIER_MISMATCH",
        message: `Peran akun '${claimant.role}' tidak berwenang mengklaim lot peruntukan '${targetOffer.targetTier}'.`,
        offerId,
        executionDurationMs: Number((endTime - startTime).toFixed(2)),
      };
    }

    // 4. Verifikasi Status Ketersediaan (Anti-Double Claim Guard)
    if (targetOffer.status !== "active") {
      const endTime = performance.now();
      return {
        success: false,
        code: "ALREADY_CLAIMED",
        message: `Mohon maaf, penawaran lot ini telah resmi diklaim oleh ${targetOffer.claimedBy ?? "mitra lain"}. Penawaran telah ditutup.`,
        offerId,
        claimedBy: targetOffer.claimedBy,
        claimedAt: targetOffer.claimedAt,
        executionDurationMs: Number((endTime - startTime).toFixed(2)),
      };
    }

    // 5. Mutasi Status Atomik ke 'claimed'
    const nowIso = new Date().toISOString();
    const qrisRef = `QRIS-PASARIN-${offerId.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const podToken = `POD-HMAC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    targetOffer.status = "claimed";
    targetOffer.claimedBy = claimant.buyerName;
    targetOffer.claimedAt = nowIso;
    targetOffer.claimantRole = claimant.role;
    targetOffer.qrisReference = qrisRef;
    targetOffer.podToken = podToken;

    const endTime = performance.now();
    const executionDurationMs = Number((endTime - startTime).toFixed(2));

    return {
      success: true,
      code: "CLAIM_SUCCESS",
      message: `Selamat! Lot surplus ${offerId} berhasil Anda amankan. Silakan selesaikan pembayaran QRIS resmi untuk memulai pengiriman armada.`,
      offerId,
      claimedBy: claimant.buyerName,
      claimedAt: nowIso,
      assignedTier: targetOffer.targetTier,
      qrisPaymentReference: qrisRef,
      podVerificationToken: podToken,
      executionDurationMs,
    };
  } finally {
    // 6. Lepaskan Kunci Atomik
    releaseAtomicClaimLock(offerId);
  }
}

// Reset semua lock untuk isolasi testbench
export function resetClaimLocks(): void {
  inMemoryClaimLocks.clear();
}

// Fasad kanal siaran dan klaim cepat pembeli (PSR-26)
export const buyerClaimChannel = {
  generateBuyerBroadcastMessage,
  executeFastClaim,
  resetClaimLocks,
};
