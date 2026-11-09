/**
 * Modul Pengelola State Simulasi Pasar dan Sinkronisasi Sesi Server (Server Simulation State) (PSR-4 / PSR-37).
 * Bertanggung jawab terhadap persistensi status buku besar pasar (lot penawaran, pasokan kios, mutasi rekening escrow),
 * mekanisme konkurensi optimistik (Compare-And-Swap revision locking), serta orkestrasi transaksi sirkular multi-peran.
 */

import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import { distributionTierForDecay, isDonation, isFreeMaggotOffer, isReadyForDelivery, roundKg, type RescueOffer, type EscrowTransaction, type StockConfirmation, type StockItem } from "@/types/market";
import type { AuthUser } from "@/data/accounts";
import { calculateDecay } from "@/lib/decayEngine";
import { getRealtimeWIBTimeString } from "@/lib/marketClock";
import { getHyperlocalMarketWeather } from "@/lib/weatherAgent";
import { calculateRainFootfallAttenuation, predictRetailSurplusKg } from "@/lib/pasarinCore";
import { executeEscrowSettlement } from "@/lib/qrisEscrowGateway";
import { getServiceRoleClient } from "@/lib/supabase";
import { buildMarketSeedState } from "@/lib/marketSeed";
import { databaseConfigured, getDatabasePool } from "@/lib/database";

/**
 * Pemetaan peran pembeli sirkular ke tingkatan alokasi penawaran yang sah (PSR-21 / PSR-22).
 */
export const BUYER_TIERS = { warteg: "tier_1", social_kitchen: "tier_2", maggot: "tier_3" } as const;

/**
 * Tipe peran pembeli sirkular yang sah dalam ekosistem PASARIN.
 */
export type BuyerRole = keyof typeof BUYER_TIERS;

/**
 * Kontrak struktur state buku besar pasar (Server Simulation State) (PSR-4 / PSR-37).
 */
export interface ServerState {
  offers: RescueOffer[];
  transactions: EscrowTransaction[];
  stocks: StockItem[];
  vendorWalletIdr: number;
  biomassProcessedKg: number;
  socialMealsServed: number;
  lastUpdated: string;
}

/**
 * Hasil mutasi transaksional state server.
 */
type MutationResult = { success: true; message: string; offer?: RescueOffer } |
  { success: false; message: string; status: 403 | 404 | 409 | 422 };

/**
 * Representasi aktor pengguna terotentikasi dalam transaksi mutasi pasar.
 */
type Actor = Pick<AuthUser, "id" | "name" | "role" | "vendorId">;

const table = "pasarin_simulation_state";
const stateKey = "market";
const stateFile = () => process.env.PASARIN_STATE_FILE ?? path.join(os.tmpdir(), "pasarin_market_state_v2.json");
const storesStateInDatabase = () => databaseConfigured() || process.env.NODE_ENV === "production" || process.env.PASARIN_STATE_BACKEND === "supabase";

/**
 * Menginisialisasi objek state pasar kosong baru tanpa pasokan awal.
 *
 * @returns Objek ServerState kosong dengan saldo awal nol dan stempel waktu ISO terkini.
 */
function newState(): ServerState {
  return {
    offers: [],
    transactions: [],
    stocks: [],
    vendorWalletIdr: 0,
    biomassProcessedKg: 0,
    socialMealsServed: 0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Menormalkan struktur state pasar dengan membersihkan token lama dan memastikan pesanan Maggot Rp0 bebas biaya.
 *
 * @param state - Objek ServerState mentah.
 * @returns Objek ServerState yang telah dinormalisasi.
 */
function normalizeState(state: ServerState): ServerState {
  return {
    ...state,
    offers: state.offers.map((offer: RescueOffer & { podToken?: string }) => {
      const { podToken, ...safe } = offer;
      if (offer.targetTier === "tier_3" && offer.paymentStatus === "unpaid" && offer.status !== "settled" && offer.status !== "rejected") {
        return { ...safe, distributionMode: "free", salvagePricePerKg: 0, totalAmountIdr: 0, discountPercentage: 100,
          paymentStatus: offer.status === "claimed" ? "not_required" : "unpaid" };
      }
      return podToken === undefined ? offer : safe;
    }),
  };
}

/**
 * Membaca state pasar dari berkas JSON lokal di sistem operasi.
 * Mendukung pembacaan fail-safe migrasi dari berkas state versi sebelumnya jika tersedia.
 *
 * @returns Objek ServerState lokal yang dinormalisasi.
 */
function readLocalState(): ServerState {
  const file = stateFile();
  if (fs.existsSync(/* turbopackIgnore: true */ file)) {
    return normalizeState(JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ file, "utf-8")) as ServerState);
  }
  if (!process.env.PASARIN_STATE_FILE) {
    const legacy = path.join(os.tmpdir(), "pasarin_server_state_v1.json");
    if (fs.existsSync(legacy)) {
      const data = JSON.parse(fs.readFileSync(legacy, "utf-8")) as Partial<ServerState>;
      const initial = newState();
      const stockById = new Map(initial.stocks.map((stock) => [stock.id, stock]));
      for (const stock of data.stocks ?? []) stockById.set(stock.id, stock);
      return normalizeState({ ...initial, ...data, stocks: [...stockById.values()] });
    }
  }
  return newState();
}

/**
 * Menyimpan pembaruan state pasar ke berkas lokal secara atomik (atomic rename) untuk mencegah korupsi data saat konkurensi.
 *
 * @param state - Objek ServerState yang akan dipersistensi.
 */
function writeLocalState(state: ServerState) {
  const file = stateFile();
  const temporary = file + "." + randomUUID();
  fs.writeFileSync(temporary, JSON.stringify(state), { mode: 0o600 });
  try {
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

/**
 * Menginisialisasi klien Supabase Service Role untuk akses tingkat server ke tabel simulasi.
 *
 * @returns Klien Supabase terotentikasi Service Role.
 */
function databaseClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for persistent simulation state.");
  }
  return getServiceRoleClient();
}

/**
 * Membaca snapshot state pasar beserta nomor revisi CAS (Compare-And-Swap) dari Supabase PostgREST API.
 *
 * @param client - Klien Supabase Service Role.
 * @returns Nomor revisi dan state pasar jika ditemukan, atau null.
 */
async function readDatabaseState(client: ReturnType<typeof databaseClient>) {
  const { data, error } = await client.from(table).select("revision, state").eq("id", stateKey).maybeSingle();
  if (error) throw error;
  return data ? { revision: data.revision as number, state: normalizeState(data.state as ServerState) } : null;
}

/**
 * Membaca snapshot state pasar beserta nomor revisi langsung melalui pool koneksi PostgreSQL native.
 *
 * @returns Objek berisi nomor revisi dan ServerState jika rekaman ditemukan.
 */
async function readPostgresState() {
  const result = await getDatabasePool().query<{ revision: string; state: ServerState }>(
    "select revision::text as revision, state from public.pasarin_simulation_state where id = $1",
    [stateKey],
  );
  const row = result.rows[0];
  return row ? { revision: Number(row.revision), state: normalizeState(row.state) } : null;
}

/**
 * Mengambil state pasar aktif dari penyimpanan persisten (PostgreSQL, Supabase REST, atau berkas lokal).
 *
 * @returns Promise berisi objek ServerState terkini.
 */
export async function getServerSimulationState() {
  if (!storesStateInDatabase()) return readLocalState();
  if (databaseConfigured()) return (await readPostgresState())?.state ?? newState();
  return (await readDatabaseState(databaseClient()))?.state ?? newState();
}

/** Antrean mutasi lokal untuk mencegah kondisi balapan (race condition) pada penyimpanan berkas. */
let localMutationQueue: Promise<void> = Promise.resolve();

/**
 * Menerapkan mutasi state pasar secara atomik dengan protokol penguncian optimistik (CAS) hingga 5 kali percobaan.
 *
 * @param mutate - Fungsi murni yang memodifikasi state dan mengembalikan status MutationResult.
 * @returns Status keberhasilan mutasi atau penolakan dengan kode status HTTP.
 */
async function updateState(mutate: (state: ServerState) => MutationResult): Promise<MutationResult> {
  if (!storesStateInDatabase()) {
    const run = localMutationQueue.then(() => {
      const state = readLocalState();
      const result = mutate(state);
      if (result.success) {
        state.lastUpdated = new Date().toISOString();
        writeLocalState(state);
      }
      return result;
    });
    localMutationQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  if (databaseConfigured()) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const snapshot = await readPostgresState();
      const state = snapshot?.state ?? newState();
      const result = mutate(state);
      if (!result.success) return result;
      state.lastUpdated = new Date().toISOString();
      const pool = getDatabasePool();
      if (!snapshot) {
        const inserted = await pool.query(
          `insert into public.pasarin_simulation_state (id, revision, state)
           values ($1, 1, $2::jsonb)
           on conflict (id) do nothing
           returning id`,
          [stateKey, JSON.stringify(state)],
        );
        if (inserted.rowCount) return result;
      } else {
        const updated = await pool.query(
          `update public.pasarin_simulation_state
           set state = $1::jsonb, revision = $2
           where id = $3 and revision = $4
           returning id`,
          [JSON.stringify(state), snapshot.revision + 1, stateKey, snapshot.revision],
        );
        if (updated.rowCount) return result;
      }
    }
    return { success: false, status: 409, message: "Data pasar baru berubah. Coba lagi." };
  }

  const client = databaseClient();
  // Predikat nomor revisi mencegah dua permintaan konkurensi saling menimpa data (Compare-And-Swap)
  for (let attempt = 0; attempt < 5; attempt++) {
    const snapshot = await readDatabaseState(client);
    const state = snapshot?.state ?? newState();
    const result = mutate(state);
    if (!result.success) return result;
    state.lastUpdated = new Date().toISOString();
    if (!snapshot) {
      const { error } = await client.from(table).insert({ id: stateKey, revision: 1, state });
      if (!error) return result;
      if (error.code !== "23505") throw error;
    } else {
      const { data, error } = await client.from(table)
        .update({ state, revision: snapshot.revision + 1 })
        .eq("id", stateKey).eq("revision", snapshot.revision)
        .select("id").maybeSingle();
      if (error) throw error;
      if (data) return result;
    }
  }
  return { success: false, status: 409, message: "Data pasar baru berubah. Coba lagi." };
}

/**
 * Mengisi ulang (seed) state pasar secara lengkap dalam satu revisi atomik.
 *
 * @param actorIds - Pemetaan opsional antara username dan UUID pengguna Supabase.
 * @returns Status mutasi penyimpanan.
 */
export async function seedMarketStateServer(actorIds: Record<string, string> = {}) {
  const seeded = buildMarketSeedState(actorIds);
  return updateState((state) => {
    Object.assign(state, seeded);
    return { success: true as const, message: "Data pasar berhasil dibuat ulang." };
  });
}

/**
 * Menyaring data inventaris, lot penawaran, dan buku besar transaksi sesuai hak akses peran pengguna aktif (RBAC).
 *
 * @param state - Objek ServerState lengkap.
 * @param user - Profil pengguna aktif (id, role, vendorId).
 * @returns Subset data ServerState yang berhak dilihat oleh peran pengguna yang bersangkutan.
 */
export function visibleMarketState(state: ServerState, user: Pick<AuthUser, "id" | "role" | "vendorId">) {
  const { role } = user;
  const supervisor = role === "admin" || role === "manager";
  const weighed = new Set(state.stocks.filter((stock) => stock.verifiedAt).map((stock) => stock.id));
  const visible = state.offers.filter((offer) => {
    if (supervisor) return true;
    if (role === "vendor") return offer.vendorId === user.vendorId;
    if (role === "logistics") return offer.paymentStatus !== "unpaid";
    return offer.claimedById === user.id || (offer.status === "active" && offer.targetTier === BUYER_TIERS[role] && weighed.has(offer.stockId));
  });
  const visibleIds = new Set(visible.map((offer) => offer.id));
  const stockIds = new Set(visible.map((offer) => offer.stockId));
  const transactions = state.transactions.filter((item) => visibleIds.has(item.offerId));
  const vendorWalletIdr = role === "vendor" ? transactions
    .filter((item) => item.status === "released")
    .reduce((total, item) => total + item.amountIdr, 0) : supervisor ? state.vendorWalletIdr : 0;
  return {
    ...state,
    vendorWalletIdr,
    stocks: state.stocks.filter((stock) => supervisor || (role === "vendor" ? stock.vendorId === user.vendorId : stockIds.has(stock.id))),
    offers: visible.map((offer) => marketOfferForUser(offer, user.id)),
    transactions,
  };
}

/**
 * Membersihkan ID internal pemilik dan kunci reservasi dari respons penawaran publik.
 *
 * @param offer - Objek penawaran RescueOffer.
 * @param userId - ID pengguna aktif untuk menetapkan bendera isMine.
 * @returns Objek penawaran yang telah disanitasi.
 */
export function marketOfferForUser(offer: RescueOffer, userId: string) {
  const visible = { ...offer, isMine: offer.claimedById === userId };
  delete visible.claimedById;
  delete visible.reservationKey;
  return visible;
}

/**
 * Mencatat kepemilikan klaim pembeli pada lot penawaran sebelum penyelesaian pembayaran.
 *
 * @param offer - Objek penawaran yang diklaim.
 * @param buyer - Profil aktor pembeli yang melakukan klaim.
 */
function reserveOffer(offer: RescueOffer, buyer: Actor & { role: BuyerRole }) {
  offer.status = "claimed";
  offer.claimedBy = buyer.name;
  offer.claimedById = buyer.id;
  offer.claimedAt = getRealtimeWIBTimeString();
}

/**
 * Membuat rekaman transaksi rekening bersama (Escrow) baru dengan status held_in_escrow.
 *
 * @param state - Objek ServerState yang sedang dimutasi.
 * @param offer - Objek penawaran yang sedang ditahan dananya.
 */
function holdPayment(state: ServerState, offer: RescueOffer) {
  const transaction: EscrowTransaction = {
    id: randomUUID(),
    offerId: offer.id,
    buyerName: offer.claimedBy ?? "Pembeli",
    vendorName: KIOSKS.find((kiosk) => kiosk.id === offer.vendorId)?.name ?? offer.vendorId,
    commodityName: COMMODITIES.find((commodity) => commodity.id === offer.commodityId)?.localName ?? offer.commodityId,
    amountIdr: offer.totalAmountIdr,
    status: "held_in_escrow",
    createdAt: getRealtimeWIBTimeString(),
  };
  offer.paymentStatus = "held_in_escrow";
  state.transactions.unshift(transaction);
}

/**
 * Mereservasi sebagian atau seluruh kuantitas kilogram lot penawaran untuk pembeli tertentu.
 * Menegakkan aturan kuota stok, kelayakan mutu biologis, dan jendela reservasi.
 *
 * @param offerId - ID lot penawaran yang ingin diklaim.
 * @param buyer - Aktor pembeli yang terotentikasi.
 * @param quantityKg - Kuantitas kilogram yang dipesan (opsional, jika tidak ditentukan mengambil seluruh sisa).
 * @param reservationKey - Kunci idempoten untuk mencegah klaim ganda akibat pengiriman ulang jaringan.
 * @returns Status mutasi dan objek pesanan yang terbentuk.
 */
export async function claimOfferServer(
  offerId: string, buyer: Actor & { role: BuyerRole }, quantityKg?: number, reservationKey?: string,
) {
  const weather = await getHyperlocalMarketWeather();
  return updateState((state) => {
    const prior = reservationKey && state.offers.find((item) => item.reservationKey === reservationKey && item.claimedById === buyer.id);
    if (prior) {
      return (prior.listingId ?? prior.id) === offerId && (quantityKg === undefined || prior.quantityKg === quantityKg)
        ? { success: true, offer: prior, message: "Pesanan ini sudah tercatat." }
        : { success: false, status: 409, message: "Permintaan sebelumnya sudah tercatat. Buka ulang penawaran." };
    }
    const offer = state.offers.find((item) => item.id === offerId);
    if (!offer) return { success: false, status: 404, message: "Penawaran tidak ditemukan." };
    if (BUYER_TIERS[buyer.role] !== offer.targetTier) {
      return { success: false, status: 403, message: "Peran ini tidak dapat mengklaim penawaran tersebut." };
    }
    if (offer.status !== "active") {
      return { success: false, status: 409, message: "Penawaran sudah tidak tersedia." };
    }
    const stock = state.stocks.find((item) => item.id === offer.stockId);
    const requested = quantityKg ?? offer.quantityKg;
    if (!validWeight(requested) || requested === 0 || requested > offer.quantityKg) {
      return { success: false, status: 422, message: "Pilih berat yang tersedia pada penawaran." };
    }
    if (!stock?.verifiedAt || roundKg(stock.remainingKg - reservedStockKg(state, stock.id)) < requested ||
      !isOfferSuitable(offer, evaluateMarketStock(stock, weather)?.decayScore)) {
      return { success: false, status: 422, message: "Stok atau mutu lot sudah berubah. Pilih penawaran lain." };
    }
    const donation = isDonation(offer);
    const free = isFreeMaggotOffer(offer);
    const order = requested === offer.quantityKg
      ? offer
      : { ...offer, id: randomUUID(), listingId: offer.id, quantityKg: requested };
    if (order !== offer) {
      offer.quantityKg = roundKg(offer.quantityKg - requested);
      offer.totalAmountIdr = donation || free ? 0 : Math.round(offer.salvagePricePerKg * offer.quantityKg);
      state.offers.unshift(order);
    }
    order.distributionMode = free ? "free" : donation ? "donation" : "sale";
    order.totalAmountIdr = donation || free ? 0 : Math.round(order.salvagePricePerKg * requested);
    order.reservationKey = reservationKey;
    reserveOffer(order, buyer);
    if (free) order.paymentStatus = "not_required";
    else if (donation) holdPayment(state, order);
    const message = free ? "Lot Maggot gratis diklaim dan siap diantar."
      : donation ? "Donasi diklaim dan siap diantar." : "Pesanan diklaim. Lanjutkan ke pembayaran simulasi.";
    return { success: true, offer: order, message };
  });
}

/**
 * Mencatat simulasi pembayaran pesanan dan memindahkan pesanan ke antrean penjemputan armada kurir.
 *
 * @param offerId - ID pesanan yang dibayar.
 * @param buyerId - ID pembeli yang sah pemilik pesanan.
 * @returns Status keberhasilan pencatatan pembayaran.
 */
export function payOfferServer(offerId: string, buyerId: string) {
  return updateState((state) => {
    const offer = state.offers.find((item) => item.id === offerId);
    if (!offer) return { success: false, status: 404, message: "Penawaran tidak ditemukan." };
    if (offer.claimedById !== buyerId) return { success: false, status: 403, message: "Pesanan ini milik akun lain." };
    if (offer.targetTier === "tier_3") return { success: false, status: 403, message: "Lot Maggot gratis dan tidak memerlukan pembayaran." };
    if (offer.status !== "claimed" || offer.paymentStatus !== "unpaid") {
      return { success: false, status: 409, message: "Pesanan sudah diproses atau belum dapat dibayar." };
    }
    holdPayment(state, offer);
    return { success: true, message: "Pembayaran simulasi berhasil dicatat." };
  });
}

/**
 * Menyelesaikan serah terima pengantaran muatan (Proof-of-Delivery) dan mencairkan dana escrow seketika ke dompet pedagang.
 *
 * @param offerId - ID pesanan yang diserahterimakan.
 * @returns Status mutasi dan pesan konfirmasi serah terima.
 */
export function confirmDeliveryServer(offerId: string) {
  return updateState((state) => {
    const offer = state.offers.find((item) => item.id === offerId);
    if (!offer) return { success: false, status: 404, message: "Penawaran tidak ditemukan." };
    if (offer.status === "settled") return { success: true, message: "Pengantaran sudah dikonfirmasi." };

    if (!isReadyForDelivery(offer)) {
      return { success: false, status: 409, message: "Pesanan belum siap diserahterimakan." };
    }
    if (offer.paymentStatus === "held_in_escrow") {
      const transaction = state.transactions.find((item) => item.offerId === offerId && item.status === "held_in_escrow");
      if (!transaction) return { success: false, status: 409, message: "Catatan pembayaran belum tersedia." };
      const result = executeEscrowSettlement(transaction.amountIdr, offer.paymentStatus);
      if (!result.settled) return { success: false, status: 422, message: result.message };
      offer.paymentStatus = "released_to_vendor";
      transaction.status = "released";
      transaction.releasedAt = getRealtimeWIBTimeString();
      state.vendorWalletIdr += result.creditedAmountIdr;
    }

    offer.status = "settled";
    offer.deliveredOn = new Date().toISOString();
    if (offer.targetTier === "tier_3") state.biomassProcessedKg += offer.quantityKg;
    if (offer.targetTier === "tier_2") state.socialMealsServed += offer.quantityKg * 4;
    const stock = state.stocks.find((item) => item.id === offer.stockId);
    if (stock) stock.remainingKg = Math.max(0, roundKg(stock.remainingKg - offer.quantityKg));
    return { success: true, message: isFreeMaggotOffer(offer) ? "Serah terima lot Maggot gratis dikonfirmasi." : isDonation(offer)
      ? "Donasi telah diserahterimakan. Reputasi kios diperbarui."
      : "Serah terima dikonfirmasi. Saldo simulasi pedagang diperbarui." };
  });
}

/**
 * Mencatat kedatangan pasokan fisik baru kios pada subuh hari dengan penomoran lot otomatis.
 *
 * @param commodityId - Pengenal komoditas yang masuk.
 * @param quantityKg - Bobot pasokan masuk (kg).
 * @param vendorId - ID kios pedagang pemilik pasokan.
 * @param sourceId - ID sumber opsional untuk mencegah duplikasi masukan dari bot Telegram.
 * @returns Status keberhasilan pencatatan pasokan.
 */
export function addVendorStockServer(commodityId: string, quantityKg: number, vendorId: string, sourceId?: string) {
  return updateState((state) => {
    const kiosk = KIOSKS.find((item) => item.id === vendorId);
    if (!kiosk || !COMMODITIES.some((item) => item.id === commodityId) ||
      !validWeight(quantityKg) || quantityKg === 0) {
      return { success: false, status: 422, message: "Pasokan harus memiliki kios, komoditas, dan berat yang valid." };
    }
    if (sourceId && state.stocks.some((stock) => stock.id === sourceId)) {
      return { success: true, message: "Pasokan ini sudah tercatat." };
    }
    state.stocks.unshift({
      id: sourceId ?? randomUUID(), vendorId, commodityId, initialKg: quantityKg, remainingKg: quantityKg,
      arrivalClock: getRealtimeWIBTimeString(), lotNumber: "LOT-" + kiosk.stallNumber + "-" + randomBytes(3).toString("hex").toUpperCase(),
      createdAt: new Date().toISOString(),
    });
    return { success: true, message: "Pasokan berhasil dicatat." };
  });
}

/**
 * Mengevaluasi kinetika peluruhan biologis stok kios berdasarkan waktu pajang dan kondisi cuaca lapangan terkini.
 *
 * @param stock - Objek pasokan kios StockItem.
 * @param weather - Data telemetri cuaca mikro (suhu dan kelembapan).
 * @param now - Stempel waktu waktu komputasi saat ini (ms).
 * @returns Hasil evaluasi peluruhan kinetika biologis DecayEvaluation atau null.
 */
export function evaluateMarketStock(stock: StockItem, weather: { temperatureC: number; humidityPercent: number }, now = Date.now()) {
  const commodity = COMMODITIES.find((item) => item.id === stock.commodityId);
  if (!commodity) return null;
  const created = Date.parse(stock.createdAt ?? "");
  const elapsed = Number.isFinite(created) ? Math.max(0, (now - created) / 3_600_000) : 0;
  return calculateDecay(commodity, weather.temperatureC, weather.humidityPercent, (stock.hoursOffset ?? 0) + elapsed);
}

/**
 * Membaca snapshot komprehensif pasar terkini dengan pembaruan dinamis skor mutu dan estimasi sisa stok.
 *
 * @param user - Profil aktor yang melakukan pembacaan snapshot.
 * @returns Snapshot pasar terpadu beserta status mutu stok dan telemetri cuaca.
 */
export async function readMarketSnapshot(user: Pick<AuthUser, "id" | "role" | "vendorId">) {
  const [state, weather] = await Promise.all([getServerSimulationState(), getHyperlocalMarketWeather()]);
  const visible = visibleMarketState(state, user);
  const now = Date.now();
  const stockHealth = Object.fromEntries(visible.stocks.map((stock) => [stock.id, evaluateMarketStock(stock, weather, now)]));
  const estimatesVisible = user.role === "vendor" || user.role === "admin" || user.role === "manager";
  const { footfallDropPercentage } = calculateRainFootfallAttenuation(weather.rainfallMm);
  const estimatedUnsoldKg = estimatesVisible
    ? Object.fromEntries(visible.stocks.filter((stock) => !stock.verifiedAt)
      .map((stock) => [stock.id, estimateUnsoldStockKg(state, stock, footfallDropPercentage)]))
    : {};
  if (user.role === "warteg" || user.role === "social_kitchen" || user.role === "maggot") {
    const stockById = new Map(visible.stocks.map((stock) => [stock.id, stock]));
    visible.offers = visible.offers.filter((offer) => offer.status !== "active" ||
      canClaimStock(state, offer, stockById.get(offer.stockId), stockHealth[offer.stockId]?.decayScore));
  }
  return { ...visible, stockHealth, estimatedUnsoldKg, weather: { isEstimated: weather.isEstimated ?? false, temperatureC: weather.temperatureC, humidityPercent: weather.humidityPercent } };
}

let aiForecastCache: {
  key: string;
  expiresAt: number;
  data: {
    summary: string;
    recommendation: string;
    model: string;
    source: "gemini" | "heuristik";
  };
} | null = null;

/**
 * Menghasilkan sintesis analisis operasional pasar berbasis Google Gemini 2.0 Flash dengan cache cerdas 10 menit (PSR-17).
 * Menyediakan fail-safe otomatis ke ringkasan heuristik terformat jika API key tidak tersedia atau kuota habis.
 *
 * @param temperatureC - Suhu mikroklimat los pasar (°C).
 * @param humidityPercent - Kelembapan relatif udara pasar (% RH).
 * @param wartegKg - Total alokasi muatan Tier 1 Warteg (kg).
 * @param socialKg - Total alokasi muatan Tier 2 Dapur Sosial (kg).
 * @param maggotKg - Total alokasi muatan Tier 3 Sentra Maggot (kg).
 * @param couriersCount - Jumlah kurir armada yang dialokasikan.
 * @param vehiclesList - Rincian jenis kendaraan armada aktif.
 * @returns Objek ringkasan status pasar, rekomendasi rute penjemputan, versi model, dan label sumber.
 */
async function generateOverviewAiAnalysis(
  temperatureC: number,
  humidityPercent: number,
  wartegKg: number,
  socialKg: number,
  maggotKg: number,
  couriersCount: number,
  vehiclesList: string
): Promise<{ summary: string; recommendation: string; model: string; source: "gemini" | "heuristik" }> {
  const cacheKey = `${temperatureC}_${wartegKg}_${socialKg}_${maggotKg}_${couriersCount}`;
  if (aiForecastCache && aiForecastCache.key === cacheKey && Date.now() < aiForecastCache.expiresAt) {
    return aiForecastCache.data;
  }

  const defaultHeuristic = {
    summary: `Suhu los ${temperatureC}°C (${humidityPercent}% RH). Total ${roundKg(wartegKg + socialKg + maggotKg)} kg komoditas siap salur (${wartegKg} kg Warteg, ${socialKg} kg Dapur Sosial, ${maggotKg} kg Maggot).`,
    recommendation: `Prioritas penjemputan sayuran daun Blok A sebelum 15:00 WIB menggunakan ${couriersCount} kurir armada (${vehiclesList}).`,
    model: "gemini-3.5-flash-lite",
    source: "heuristik" as const,
  };

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey.length < 15) {
    aiForecastCache = { key: cacheKey, expiresAt: Date.now() + 5 * 60 * 1000, data: defaultHeuristic };
    return defaultHeuristic;
  }

  try {
    const prompt = `Anda adalah asisten logistik Pasar Induk Kramat Jati.
Data hari ini:
- Suhu: ${temperatureC}°C, Kelembapan: ${humidityPercent}% RH
- Alokasi Warteg: ${wartegKg} kg, Dapur Sosial: ${socialKg} kg, Maggot: ${maggotKg} kg
- Armada: ${couriersCount} kurir (${vehiclesList})

Berikan jawaban singkat, faktual, padat, tanpa kata-kata klise:
1. Satu kalimat status kondisi pasar dan total muatan.
2. Satu kalimat instruksi rute pengantaran prioritas.
Format persis:
RINGKASAN: [isi 1 kalimat ringkas]
REKOMENDASI: [isi 1 kalimat instruksi]`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 180, temperature: 0.2 },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (response.ok) {
      const json = await response.json();
      const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text.length > 20) {
        let summary = defaultHeuristic.summary;
        let recommendation = defaultHeuristic.recommendation;

        const summaryMatch = text.match(/RINGKASAN:\s*([\s\S]*?)(?=REKOMENDASI:|$)/i);
        const recMatch = text.match(/REKOMENDASI:\s*([\s\S]*?)$/i);

        if (summaryMatch && summaryMatch[1].trim()) summary = summaryMatch[1].trim();
        if (recMatch && recMatch[1].trim()) recommendation = recMatch[1].trim();

        const geminiResult = {
          summary,
          recommendation,
          model: "gemini-3.5-flash-lite",
          source: "gemini" as const,
        };
        aiForecastCache = { key: cacheKey, expiresAt: Date.now() + 10 * 60 * 1000, data: geminiResult };
        return geminiResult;
      }
    }
  } catch {
    // Fail-safe graceful fallback to heuristic without blocking
  }

  aiForecastCache = { key: cacheKey, expiresAt: Date.now() + 3 * 60 * 1000, data: defaultHeuristic };
  return defaultHeuristic;
}

/**
 * Menyusun ringkasan agregat pasar publik untuk beranda tanpa membocorkan privasi akun maupun transaksi.
 * Memetakan proyeksi serapan 3-tier, kebutuhan armada kurir, serta sintesis catatan operasional AI.
 *
 * @returns Data ringkasan publik mencakup lot tersedia, komoditas teratas, dan prakiraan armada distribusi.
 */
export async function readPublicMarketOverview() {
  const [state, weather] = await Promise.all([getServerSimulationState(), getHyperlocalMarketWeather()]);
  const now = Date.now();
  const stockById = new Map(state.stocks.map((stock) => [stock.id, stock]));
  const lanes = { tier_1: { lots: 0, kg: 0 }, tier_2: { lots: 0, kg: 0 }, tier_3: { lots: 0, kg: 0 } };
  const commodities = new Map<string, number>();
  let availableLots = 0;
  let availableKg = 0;
  let distributedKg = 0;
  let completedDeliveries = 0;
  for (const offer of state.offers) {
    if (offer.status === "settled") {
      distributedKg += offer.quantityKg;
      completedDeliveries++;
    }
    if (offer.status !== "active") continue;
    const stock = stockById.get(offer.stockId);
    const score = stock && evaluateMarketStock(stock, weather, now)?.decayScore;
    if (!canClaimStock(state, offer, stock, score)) continue;
    const commodity = COMMODITIES.find((item) => item.id === offer.commodityId);
    if (!commodity) continue;
    lanes[offer.targetTier].lots++;
    lanes[offer.targetTier].kg += offer.quantityKg;
    availableLots++;
    availableKg += offer.quantityKg;
    commodities.set(commodity.localName, (commodities.get(commodity.localName) ?? 0) + offer.quantityKg);
  }
  const topCommodities = [...commodities].map(([name, kg]) => ({ name, kg }))
    .sort((a, b) => b.kg - a.kg || a.name.localeCompare(b.name, "id")).slice(0, 5);

  const wartegKg = lanes.tier_1.kg;
  const wartegLots = lanes.tier_1.lots;
  const socialKg = lanes.tier_2.kg;
  const socialLots = lanes.tier_2.lots;
  const maggotKg = lanes.tier_3.kg;
  const maggotLots = lanes.tier_3.lots;

  // Alokasi armada logistik berdasarkan ambang batas bobot muatan (Weight Dispatch Rule PSR-27)
  const viarUnits = wartegKg > 0 ? Math.max(1, Math.ceil(wartegKg / 300)) : 1;
  const granmaxUnits = (socialKg > 0 || wartegKg > 300) ? Math.max(1, Math.ceil((socialKg + Math.max(0, wartegKg - 300)) / 1000)) : 1;
  const isuzuUnits = maggotKg > 300 ? Math.max(1, Math.ceil(maggotKg / 4000)) : (availableKg > 800 ? 1 : 0);

  const vehicles = [
    {
      type: "viar_trike" as const,
      name: "Motor Viar Roda 3",
      units: viarUnits,
      driverName: "Pak Joko Santoso",
      licensePlate: "B 4521 TXX",
      capacityKg: 300,
      fuelType: "Pertalite",
      targetLane: "Warteg & UMKM",
      description: "Rute los basah dan warteg mitra.",
    },
    {
      type: "granmax_pickup" as const,
      name: "Daihatsu GranMax Pikap",
      units: granmaxUnits,
      driverName: "Pak Hendra Wijaya",
      licensePlate: "B 9812 SAA",
      capacityKg: 1000,
      fuelType: "Pertamax",
      targetLane: "Dapur Sosial & Panti",
      description: "Rute gabungan Warteg dan Dapur Sosial.",
    },
    ...(isuzuUnits > 0 ? [{
      type: "isuzu_truck" as const,
      name: "Truk Engkel Isuzu Elf",
      units: isuzuUnits,
      driverName: "Bpk. Rahmat Hidayat",
      licensePlate: "B 7710 KDA",
      capacityKg: 4000,
      fuelType: "Bio Solar",
      targetLane: "Sentra Maggot BSF",
      description: "Pengangkutan limbah organik ke sentra maggot.",
    }] : []),
  ];

  const totalCouriers = vehicles.reduce((sum, v) => sum + v.units, 0);
  const vehicleSummary = vehicles.map((v) => `${v.units} ${v.name}`).join(", ");

  const aiAnalysis = await generateOverviewAiAnalysis(
    weather.temperatureC,
    weather.humidityPercent,
    wartegKg,
    socialKg,
    maggotKg,
    totalCouriers,
    vehicleSummary
  );

  const forecast = {
    weather: {
      temperatureC: weather.temperatureC,
      humidityPercent: weather.humidityPercent,
      isEstimated: weather.isEstimated ?? false,
    },
    recipients: {
      warteg: {
        lots: wartegLots,
        kg: wartegKg,
        partnerCount: 5,
        estimatedMeals: Math.round(wartegKg * 4),
        description: "Sayuran segar & layu ringan siap olah untuk Warteg & UMKM kuliner.",
      },
      socialKitchen: {
        lots: socialLots,
        kg: socialKg,
        partnerCount: 3,
        estimatedBeneficiaries: Math.round(socialKg * 4),
        description: "Bahan pangan bernutrisi terlindungi jendela 30 menit untuk dapur sosial dan panti asuhan.",
      },
      maggot: {
        lots: maggotLots,
        kg: maggotKg,
        partnerCount: 2,
        landfillDivertedKg: maggotKg,
        description: "Biomassa afkir teralihkan ke biokonversi maggot BSF bebas biaya (Rp0).",
      },
    },
    fleet: {
      totalCouriers,
      totalPayloadKg: availableKg,
      vehicles,
    },
    aiAnalysis,
  };

  return { availableLots, availableKg, distributedKg, completedDeliveries, lanes, topCommodities, forecast };
}

/**
 * Memvalidasi apakah lot penawaran masih memiliki sisa fisik yang memadai dan mutu yang sesuai untuk diklaim.
 *
 * @param state - Objek ServerState.
 * @param offer - Penawaran yang diajukan.
 * @param stock - Objek pasokan kios terkait.
 * @param score - Skor peluruhan mutu terkini.
 * @returns Boolean bernilai true jika lot memenuhi syarat klaim.
 */
function canClaimStock(state: ServerState, offer: RescueOffer, stock: StockItem | undefined, score: number | undefined) {
  return Boolean(stock?.verifiedAt && roundKg(stock.remainingKg - reservedStockKg(state, stock.id)) >= offer.quantityKg && isOfferSuitable(offer, score));
}

/**
 * Menghitung bobot komoditas yang sedang berada dalam status reservasi pesanan aktif.
 *
 * @param state - Objek ServerState.
 * @param stockId - ID pasokan kios.
 * @returns Total bobot tereservasi dalam kilogram.
 */
function reservedStockKg(state: ServerState, stockId: string) {
  return roundKg(state.offers.reduce((sum, offer) => sum + (offer.stockId === stockId && offer.status === "claimed" ? offer.quantityKg : 0), 0));
}

/**
 * Menghitung bobot komoditas yang telah berhasil diserahterimakan ke pembeli dari satu lot pasokan.
 *
 * @param state - Objek ServerState.
 * @param stockId - ID pasokan kios.
 * @returns Total bobot tersalurkan dalam kilogram.
 */
function distributedStockKg(state: ServerState, stockId: string) {
  return roundKg(state.offers.reduce((sum, offer) => sum + (offer.stockId === stockId && offer.status === "settled" ? offer.quantityKg : 0), 0));
}

/**
 * Memproyeksikan sisa stok eceran yang belum terjual akibat cuaca tanpa mengubah catatan timbangan fisik aktual.
 *
 * @param state - Objek ServerState.
 * @param stock - Pasokan kios yang dievaluasi.
 * @param footfallDropPercentage - Persentase penurunan arus pembeli akibat kondisi cuaca.
 * @returns Estimasi sisa stok surplus dalam kilogram.
 */
function estimateUnsoldStockKg(state: ServerState, stock: StockItem, footfallDropPercentage: number) {
  const reserved = reservedStockKg(state, stock.id);
  const estimated = predictRetailSurplusKg(stock.initialKg, footfallDropPercentage) - distributedStockKg(state, stock.id) - reserved;
  return Math.max(0, roundKg(Math.min(stock.remainingKg - reserved, estimated)));
}

/**
 * Memvalidasi kepatuhan nilai bobot terhadap rentang toleransi fisik dan batas presisi 2 desimal.
 *
 * @param weight - Nilai bobot numerik dalam kilogram.
 * @returns True jika bobot berada di antara 0 dan 10.000 kg serta memiliki presisi 2 desimal.
 */
function validWeight(weight: number) {
  return Number.isFinite(weight) && weight >= 0 && weight <= 10_000 && roundKg(weight) === weight;
}

/**
 * Memastikan peruntukan tier penawaran tetap selaras dengan kondisi kinetika peluruhan biologis terkini.
 *
 * @param offer - Objek penawaran.
 * @param score - Skor peluruhan mutu terkini.
 * @returns True jika tier penawaran cocok dengan hasil evaluasi mutu.
 */
function isOfferSuitable(offer: RescueOffer, score: number | undefined) {
  return score !== undefined && offer.targetTier === distributionTierForDecay(score);
}

/**
 * Mengonstruksi usulan penawaran penyelamatan pangan dari hasil evaluasi kinetika biologis dan proteksi harga modal.
 *
 * @param stock - Pasokan kios yang dievaluasi.
 * @param weather - Data telemetri cuaca terkini.
 * @param automatic - Apakah usulan dihasilkan secara otomatis oleh sistem (membutuhkan persetujuan pedagang).
 * @returns Objek RescueOffer atau null jika stok belum memenuhi kriteria salvaging.
 */
function evaluateStockOffer(stock: StockItem, weather: { temperatureC: number; humidityPercent: number }, automatic: boolean): RescueOffer | null {
  const commodity = COMMODITIES.find((item) => item.id === stock.commodityId);
  const evaluation = evaluateMarketStock(stock, weather);
  if (!commodity || !evaluation || stock.remainingKg <= 0) return null;
  if (automatic && evaluation.decayScore < 0.35) return null;
  const tier = distributionTierForDecay(evaluation.decayScore);
  const floor = tier === "tier_1" ? commodity.minimumSalvagePricePerKg : 0;
  const price = tier === "tier_3" ? 0 : Math.max(floor, evaluation.estimatedSalvagePrice);
  return {
    id: randomUUID(), stockId: stock.id, vendorId: stock.vendorId, commodityId: commodity.id,
    targetTier: tier, quantityKg: stock.remainingKg, originalPricePerKg: commodity.baseWholesalePricePerKg,
    salvagePricePerKg: price, discountPercentage: Math.round(100 * (1 - price / commodity.baseWholesalePricePerKg)),
    totalAmountIdr: Math.round(price * stock.remainingKg), expiresInMinutes: 30,
    createdAt: new Date().toISOString(), status: automatic ? "pending_vendor" : "active", paymentStatus: "unpaid",
  };
}

/**
 * Mencatat hasil penimbangan fisik pedagang dan menerbitkan penawaran aktif ke katalog pasar.
 *
 * @param state - Objek ServerState yang sedang dimutasi.
 * @param stock - Pasokan kios yang dikonfirmasi.
 * @param weather - Telemetri cuaca pasar terkini.
 * @param confirmation - Data hasil konfirmasi timbangan pedagang.
 * @param proposal - Usulan penawaran sebelumnya jika ada.
 * @returns Status mutasi penerbitan penawaran.
 */
function publishConfirmedStock(
  state: ServerState, stock: StockItem, weather: { temperatureC: number; humidityPercent: number },
  confirmation: StockConfirmation | undefined, proposal?: RescueOffer,
): MutationResult {
  const reserved = reservedStockKg(state, stock.id);
  const max = Math.max(0, roundKg(stock.initialKg - distributedStockKg(state, stock.id) - reserved));
  if (!confirmation || !validWeight(confirmation.confirmedKg) || confirmation.confirmedKg > max) {
    return { success: false, status: 422, message: "Konfirmasi berat sisa yang belum dipesan, maksimal " + max.toLocaleString("id-ID") + " kg." };
  }
  const { confirmedKg, mode } = confirmation;
  if (confirmedKg === 0) {
    stock.remainingKg = reserved;
    stock.verifiedAt = new Date().toISOString();
    if (proposal) proposal.status = "rejected";
    return { success: true, message: "Hasil timbang tersimpan. Tidak ada penawaran yang diterbitkan." };
  }
  const listing = evaluateStockOffer({ ...stock, remainingKg: confirmedKg }, weather, false);
  if (!listing) return { success: false, status: 422, message: "Mutu lot belum dapat dievaluasi." };
  if (listing.targetTier === "tier_2" && !mode) {
    return { success: false, status: 422, message: "Pilih jual atau donasi untuk lot dapur sosial." };
  }
  if (listing.targetTier !== "tier_2" && mode === "donation") {
    return { success: false, status: 422, message: "Donasi hanya berlaku untuk lot dapur sosial." };
  }
  listing.distributionMode = listing.targetTier === "tier_3" ? "free" : mode ?? "sale";
  if (listing.distributionMode === "donation") {
    listing.salvagePricePerKg = 0;
    listing.totalAmountIdr = 0;
    listing.discountPercentage = 100;
  }
  stock.remainingKg = roundKg(confirmedKg + reserved);
  stock.verifiedAt = new Date().toISOString();
  if (proposal) Object.assign(proposal, listing, { id: proposal.id });
  else state.offers.unshift(listing);
  const message = listing.distributionMode === "free" ? "Lot Maggot gratis diterbitkan."
    : listing.distributionMode === "donation" ? "Penawaran donasi diterbitkan." : "Penawaran jual diterbitkan.";
  return { success: true, message };
}

/**
 * Menerbitkan usulan penawaran terjadwal atau memublikasikan satu lot spesifik yang dikonfirmasi oleh pemiliknya.
 *
 * @param vendorId - ID pedagang (opsional jika pemindaian massal).
 * @param stockId - ID pasokan (opsional).
 * @param confirmation - Data timbangan konfirmasi.
 * @returns Status mutasi publikasi penawaran.
 */
export async function publishMarketOffers(vendorId?: string, stockId?: string, confirmation?: StockConfirmation) {
  const weather = await getHyperlocalMarketWeather();
  return updateState((state) => {
    if (vendorId || stockId) {
      const stock = state.stocks.find((item) => item.id === stockId && item.vendorId === vendorId);
      if (!stock || state.offers.some((offer) => offer.stockId === stock.id && (offer.status === "active" || offer.status === "pending_vendor"))) {
        return { success: false, status: 409, message: "Stok ini tidak tersedia atau sudah memiliki penawaran." };
      }
      return publishConfirmedStock(state, stock, weather, confirmation);
    }

    const stockById = new Map(state.stocks.map((stock) => [stock.id, stock]));
    for (const offer of state.offers) {
      if (offer.status !== "active") continue;
      const stock = stockById.get(offer.stockId);
      const score = stock && evaluateMarketStock(stock, weather)?.decayScore;
      if (stock && !stock.verifiedAt) offer.status = "pending_vendor";
      else if (score !== undefined && !isOfferSuitable(offer, score)) offer.status = "rejected";
    }

    const active = new Set(state.offers.filter((offer) => offer.status === "active").map((offer) => offer.stockId));
    const pending = new Map(state.offers.filter((offer) => offer.status === "pending_vendor").map((offer) => [offer.stockId, offer]));
    const { footfallDropPercentage } = calculateRainFootfallAttenuation(weather.rainfallMm);
    const newProposals: RescueOffer[] = [];
    let updated = 0;
    for (const stock of state.stocks) {
      if (active.has(stock.id)) continue;
      const proposedKg = estimateUnsoldStockKg(state, stock, footfallDropPercentage);
      const proposal = evaluateStockOffer({ ...stock, remainingKg: proposedKg }, weather, true);
      const existing = pending.get(stock.id);
      if (proposal && existing) {
        Object.assign(existing, proposal, { id: existing.id, createdAt: existing.createdAt });
        updated++;
      } else if (proposal) {
        newProposals.push(proposal);
      } else if (existing) {
        existing.status = "rejected";
      }
    }
    state.offers.unshift(...newProposals);
    return { success: true, message: newProposals.length + " usulan baru, " + updated + " diperbarui. Menunggu konfirmasi pedagang." };
  });
}

/**
 * Memproses keputusan pedagang atas usulan penawaran (menyetujui atau menolak/menarik penawaran aktif).
 *
 * @param offerId - ID penawaran yang diputuskan.
 * @param vendorId - ID pedagang pemilik penawaran.
 * @param approved - True jika disetujui, false jika ditolak/ditarik.
 * @param confirmation - Data timbangan fisik konfirmasi pedagang.
 * @returns Status mutasi keputusan pedagang.
 */
export async function decideVendorOffer(offerId: string, vendorId: string, approved: boolean, confirmation?: StockConfirmation) {
  const weather = approved ? await getHyperlocalMarketWeather() : undefined;
  return updateState((state) => {
    const offer = state.offers.find((item) => item.id === offerId && item.vendorId === vendorId);
    if (!offer) return { success: false, status: 404, message: "Penawaran kios tidak ditemukan." };
    if (offer.status !== "pending_vendor" && offer.status !== "active") {
      return { success: false, status: 409, message: "Penawaran sudah diproses." };
    }
    if (weather) {
      const stock = state.stocks.find((item) => item.id === offer.stockId && item.vendorId === vendorId);
      if (!stock) return { success: false, status: 404, message: "Stok penawaran tidak ditemukan." };
      if (offer.status === "active" && stock.verifiedAt) {
        return { success: false, status: 409, message: "Penawaran sudah aktif. Tarik sebelum menimbang ulang." };
      }
      return publishConfirmedStock(state, stock, weather, confirmation, offer);
    }
    offer.status = "rejected";
    return { success: true, message: "Penawaran ditarik atau ditolak." };
  });
}

/**
 * Mengambil katalog penawaran aktif yang memenuhi syarat kelayakan bagi peran pembeli tertentu.
 *
 * @param role - Peran pembeli sirkular ("warteg" | "social_kitchen" | "maggot").
 * @returns Array lot penawaran RescueOffer yang aktif dan siap diklaim.
 */
export async function getSurplusOffersForRole(role: BuyerRole) {
  const state = await readMarketSnapshot({ id: "", role });
  return state.offers.filter((offer) => offer.status === "active");
}
