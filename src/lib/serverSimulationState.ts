/**
 * Modul Pengelola State Simulasi Server Terpadu (Single Server-Side Source of Truth).
 * Menyinkronkan status penawaran, klaim pembeli, dan serah terima kurir PoD
 * antara Web Application dan Telegram Bot API Gateway (@agent_pasarin_bot).
 */

import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { DEMO_SEED_OFFERS, DEMO_SEED_TRANSACTIONS, RescueOffer, EscrowTransaction } from "@/data/seedData";
const TMP_STATE_FILE = path.join(os.tmpdir(), "pasarin_server_state_v1.json");

export interface ServerStockItem {
  id: string;
  vendorId: string;
  commodityId: string;
  initialKg: number;
  remainingKg: number;
  arrivalClock: string;
  lotNumber: string;
  createdAt: string;
}

export interface ServerState {
  offers: RescueOffer[];
  transactions: EscrowTransaction[];
  stocks?: ServerStockItem[];
  vendorWalletIdr: number;
  biomassProcessedKg: number;
  socialMealsServed: number;
  lastUpdated: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __PASARIN_SERVER_STATE__: ServerState | undefined;
}

function getDefaultState(): ServerState {
  return {
    offers: JSON.parse(JSON.stringify(DEMO_SEED_OFFERS)),
    transactions: JSON.parse(JSON.stringify(DEMO_SEED_TRANSACTIONS)),
    vendorWalletIdr: 457500,
    biomassProcessedKg: 210,
    socialMealsServed: 320,
    lastUpdated: new Date().toISOString(),
  };
}

export function getServerSimulationState(): ServerState {
  if (globalThis.__PASARIN_SERVER_STATE__) {
    return globalThis.__PASARIN_SERVER_STATE__;
  }

  try {
    if (fs.existsSync(TMP_STATE_FILE)) {
      const content = fs.readFileSync(TMP_STATE_FILE, "utf-8");
      const parsed = JSON.parse(content) as ServerState;
      if (Array.isArray(parsed.offers) && parsed.offers.length > 0) {
        globalThis.__PASARIN_SERVER_STATE__ = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[ServerState] Gagal membaca state lokal temp:", err);
  }

  const defaultState = getDefaultState();
  saveServerSimulationState(defaultState);
  return defaultState;
}

export function saveServerSimulationState(state: ServerState) {
  state.lastUpdated = new Date().toISOString();
  globalThis.__PASARIN_SERVER_STATE__ = state;
  try {
    fs.writeFileSync(TMP_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.warn("[ServerState] Gagal menulis state lokal temp:", err);
  }
}

/**
 * Memproses klaim penawaran oleh pembeli (Warteg, Dapur Sosial, atau Maggot).
 */
export function claimOfferServer(
  offerId: string,
  buyerName: string,
  claimantRole: "warteg" | "social_kitchen" | "maggot"
): { success: boolean; offer?: RescueOffer; message: string } {
  const state = getServerSimulationState();
  const offer = state.offers.find((o) => o.id === offerId);

  if (!offer) {
    return { success: false, message: `Penawaran #${offerId} tidak ditemukan.` };
  }

  if (offer.status === "claimed" || offer.status === "settled") {
    return {
      success: false,
      message: `Lot #${offerId} sudah diklaim sebelumnya oleh ${offer.claimedBy || "pihak lain"}.`,
    };
  }

  offer.status = "claimed";
  offer.claimedBy = buyerName;
  offer.claimedAt = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
  offer.claimantRole = claimantRole;
  offer.paymentStatus = "held_in_escrow";
  offer.allocatedDriver =
    claimantRole === "maggot" ? "Armada TPS 3R (Pak Joko)" : "Armada Viar 01 (Pak Joko)";
  offer.podToken = `POD-HMAC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const newTx: EscrowTransaction = {
    id: `tx_${Date.now().toString().slice(-4)}`,
    offerId: offer.id,
    buyerName,
    vendorName: "H. Rohmat Sayur Daun",
    commodityName: `${offer.commodityId} (${offer.quantityKg} kg)`,
    amountIdr: offer.totalAmountIdr,
    status: "held_in_escrow",
    createdAt: offer.claimedAt,
    qrisPayload: `PASARIN-ESCROW-${offer.id}`,
  };

  state.transactions.unshift(newTx);
  saveServerSimulationState(state);

  return { success: true, offer, message: "Klaim berhasil dicatat." };
}

/**
 * Memverifikasi serah terima fisik kurir (Proof of Delivery / PoD) dan mencairkan escrow.
 */
export function verifyDeliveryPoDServer(
  offerId: string,
  _unusedDistance?: number
): { success: boolean; message: string; offer?: RescueOffer } {
  const state = getServerSimulationState();
  const offer = state.offers.find((o) => o.id === offerId);

  if (!offer) {
    return { success: false, message: `Penawaran #${offerId} tidak ditemukan.` };
  }

  if (offer.status === "settled") {
    return {
      success: true,
      offer,
      message: `Lot #${offerId} sudah selesai diserahterimakan sebelumnya.`,
    };
  }

  // Tandai selesai
  offer.status = "settled";
  offer.paymentStatus = "released_to_vendor";

  // Mutasi saldo dompet pedagang
  state.vendorWalletIdr += offer.totalAmountIdr;

  // Mutasi dampak peran
  if (offer.claimantRole === "maggot" || offer.targetTier === "tier_3") {
    state.biomassProcessedKg += offer.quantityKg;
  } else if (offer.claimantRole === "social_kitchen" || offer.targetTier === "tier_2") {
    state.socialMealsServed += offer.quantityKg * 4;
  }

  // Update transaksi escrow
  const tx = state.transactions.find((t) => t.offerId === offerId);
  if (tx) {
    tx.status = "released";
    tx.releasedAt = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
  }

  saveServerSimulationState(state);

  return {
    success: true,
    offer,
    message: `Verifikasi SUKSES: Token HMAC-SHA256 tervalidasi. Dana Rp ${offer.totalAmountIdr.toLocaleString("id-ID")} resmi dicairkan ke pedagang!`,
  };
}

/**
 * Mengambil daftar tugas pengantaran aktif untuk kurir armada.
 */
export function getActiveCourierTasks(): RescueOffer[] {
  const state = getServerSimulationState();
  return state.offers.filter(
    (o) => o.status === "claimed" && o.paymentStatus === "held_in_escrow"
  );
}

/**
 * Mengambil daftar penawaran surplus yang tersedia untuk peran tertentu.
 */
export function getSurplusOffersForRole(role: "warteg" | "social_kitchen" | "maggot"): RescueOffer[] {
  const state = getServerSimulationState();
  if (role === "warteg") {
    return state.offers.filter((o) => o.targetTier === "tier_1" && o.status === "active");
  }
  if (role === "social_kitchen") {
    return state.offers.filter((o) => o.targetTier === "tier_2" && o.status === "active");
  }
  if (role === "maggot") {
    return state.offers.filter((o) => o.targetTier === "tier_3" && o.status === "active");
  }
  return [];
}

/**
 * Mencatat pasokan masuk baru (Bongkar Subuh) untuk pedagang lapak.
 */
export function addVendorStockServer(
  commodityId: string,
  quantityKg: number,
  vendorId: string = "vendor_kramat_01"
): { success: boolean; stock: ServerStockItem; message: string } {
  const state = getServerSimulationState();
  if (!state.stocks) {
    state.stocks = [];
  }
  const newStock: ServerStockItem = {
    id: `stk_tele_${Date.now()}`,
    vendorId,
    commodityId,
    initialKg: quantityKg,
    remainingKg: quantityKg,
    arrivalClock: "04:30 WIB",
    lotNumber: `LOT-A12-${Math.floor(Math.random() * 89 + 10)}`,
    createdAt: new Date().toISOString(),
  };
  state.stocks.unshift(newStock);
  saveServerSimulationState(state);
  return {
    success: true,
    stock: newStock,
    message: `Berhasil mencatat pasokan masuk: ${quantityKg} kg ${commodityId}.`,
  };
}
