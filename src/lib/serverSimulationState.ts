import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import type { RescueOffer, EscrowTransaction, StockItem } from "@/types/market";
import type { AuthUser } from "@/data/accounts";
import { calculateDecay } from "@/lib/decayEngine";
import { getRealtimeWIBTimeString } from "@/lib/marketClock";
import { getHyperlocalMarketWeather } from "@/lib/weatherAgent";
import { executeEscrowSettlement } from "@/lib/qrisEscrowGateway";
import { getServiceRoleClient } from "@/lib/supabase";
import { buildMarketSeedState } from "@/lib/marketSeed";
import { databaseConfigured, getDatabasePool } from "@/lib/database";

export const BUYER_TIERS = { warteg: "tier_1", social_kitchen: "tier_2", maggot: "tier_3" } as const;
export type BuyerRole = keyof typeof BUYER_TIERS;

export interface ServerState {
  offers: RescueOffer[];
  transactions: EscrowTransaction[];
  stocks: StockItem[];
  vendorWalletIdr: number;
  biomassProcessedKg: number;
  socialMealsServed: number;
  lastUpdated: string;
}

type MutationResult = { success: true; message: string; offer?: RescueOffer } |
  { success: false; message: string; status: 403 | 404 | 409 | 422 };
type Actor = Pick<AuthUser, "id" | "name" | "role" | "vendorId">;

const table = "pasarin_simulation_state";
const stateKey = "market";
const stateFile = () => process.env.PASARIN_STATE_FILE ?? path.join(os.tmpdir(), "pasarin_market_state_v2.json");
const storesStateInDatabase = () => databaseConfigured() || process.env.NODE_ENV === "production" || process.env.PASARIN_STATE_BACKEND === "supabase";

/** Initializes an empty market without inserting sample stock. */
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

/** Drops the old handover token when loading previously saved state. */
function normalizeState(state: ServerState): ServerState {
  return {
    ...state,
    offers: state.offers.map((offer: RescueOffer & { podToken?: string }) => {
      const { podToken, ...safe } = offer;
      return podToken === undefined ? offer : safe;
    }),
  };
}

/** Loads local market data while preserving earlier stock and transactions. */
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

/** Replaces the persisted file atomically so readers never see partial JSON. */
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

/** Requires the server-only credential for production market state. */
function databaseClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for persistent simulation state.");
  }
  return getServiceRoleClient();
}

/** Reads the state and revision used for compare-and-swap writes. */
async function readDatabaseState(client: ReturnType<typeof databaseClient>) {
  const { data, error } = await client.from(table).select("revision, state").eq("id", stateKey).maybeSingle();
  if (error) throw error;
  return data ? { revision: data.revision as number, state: normalizeState(data.state as ServerState) } : null;
}

/** Reads the same revisioned row through the direct Postgres pool. */
async function readPostgresState() {
  const result = await getDatabasePool().query<{ revision: string; state: ServerState }>(
    "select revision::text as revision, state from public.pasarin_simulation_state where id = $1",
    [stateKey],
  );
  const row = result.rows[0];
  return row ? { revision: Number(row.revision), state: normalizeState(row.state) } : null;
}

/** Reads persistent market data and starts empty for a new installation. */
export async function getServerSimulationState() {
  if (!storesStateInDatabase()) return readLocalState();
  if (databaseConfigured()) return (await readPostgresState())?.state ?? newState();
  return (await readDatabaseState(databaseClient()))?.state ?? newState();
}

/** Serializes local file mutations so two concurrent claims cannot both win. */
let localMutationQueue: Promise<void> = Promise.resolve();

/** Applies one mutation atomically, retrying if a concurrent Supabase update wins. */
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
  // The revision predicate prevents simultaneous requests from overwriting each other.
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

/** Replaces the market with the full market population in one atomic revision. */
export async function seedMarketStateServer(actorIds: Record<string, string> = {}) {
  const seeded = buildMarketSeedState(actorIds);
  return updateState((state) => {
    Object.assign(state, seeded);
    return { success: true as const, message: "Data pasar berhasil dibuat ulang." };
  });
}

/** Scopes inventory, offers and the ledger to the authenticated workspace. */
export function visibleMarketState(state: ServerState, user: Pick<AuthUser, "id" | "role" | "vendorId">) {
  const { role } = user;
  const supervisor = role === "admin" || role === "manager";
  const visible = state.offers.filter((offer) => {
    if (supervisor) return true;
    if (role === "vendor") return offer.vendorId === user.vendorId;
    if (role === "logistics") return offer.paymentStatus !== "unpaid";
    return offer.claimedById === user.id || (offer.status === "active" && offer.targetTier === BUYER_TIERS[role]);
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
    offers: visible.map(({ claimedById, ...offer }) => ({ ...offer, isMine: claimedById === user.id })),
    transactions,
  };
}

/** Records ownership and creates the unpaid order before settlement. */
function reserveOffer(offer: RescueOffer, buyer: Actor & { role: BuyerRole }) {
  offer.status = "claimed";
  offer.claimedBy = buyer.name;
  offer.claimedById = buyer.id;
  offer.claimedAt = getRealtimeWIBTimeString();
}

/** Creates the single escrow ledger entry shared across both channels. */
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

/** Reserves one eligible lot; the state revision prevents competing buyers from both succeeding. */
export async function claimOfferServer(offerId: string, buyer: Actor & { role: BuyerRole }, donated = false) {
  const weather = await getHyperlocalMarketWeather();
  return updateState((state) => {
    const offer = state.offers.find((item) => item.id === offerId);
    if (!offer) return { success: false, status: 404, message: "Penawaran tidak ditemukan." };
    if (BUYER_TIERS[buyer.role] !== offer.targetTier || (donated && buyer.role !== "social_kitchen")) {
      return { success: false, status: 403, message: "Peran ini tidak dapat mengklaim penawaran tersebut." };
    }
    if (offer.status !== "active") {
      return { success: false, status: 409, message: "Penawaran sudah tidak tersedia." };
    }
    const stock = state.stocks.find((item) => item.id === offer.stockId);
    if (!stock || stock.remainingKg < offer.quantityKg || !isOfferSuitable(offer, evaluateMarketStock(stock, weather)?.decayScore)) {
      return { success: false, status: 422, message: "Stok atau mutu lot sudah berubah. Pilih penawaran lain." };
    }
    reserveOffer(offer, buyer);
    if (donated) offer.totalAmountIdr = 0;
    if (buyer.role !== "warteg") holdPayment(state, offer);
    return { success: true, offer, message: "Penawaran berhasil diklaim." };
  });
}

/** Moves an owned unpaid order into the courier queue. */
export function payOfferServer(offerId: string, buyerId: string) {
  return updateState((state) => {
    const offer = state.offers.find((item) => item.id === offerId);
    if (!offer) return { success: false, status: 404, message: "Penawaran tidak ditemukan." };
    if (offer.claimedById !== buyerId) return { success: false, status: 403, message: "Pesanan ini milik akun lain." };
    if (offer.status !== "claimed" || offer.paymentStatus !== "unpaid") {
      return { success: false, status: 409, message: "Pesanan sudah diproses atau belum dapat dibayar." };
    }
    holdPayment(state, offer);
    return { success: true, message: "Pembayaran simulasi berhasil dicatat." };
  });
}

/** Settles a paid order once and updates inventory and the ledger together. */
export function confirmDeliveryServer(offerId: string) {
  return updateState((state) => {
    const offer = state.offers.find((item) => item.id === offerId);
    if (!offer) return { success: false, status: 404, message: "Penawaran tidak ditemukan." };
    if (offer.status === "settled") return { success: true, message: "Pengantaran sudah dikonfirmasi." };

    const transaction = state.transactions.find((item) => item.offerId === offerId && item.status === "held_in_escrow");
    if (offer.status !== "claimed" || !transaction) {
      return { success: false, status: 409, message: "Pesanan belum siap diserahterimakan." };
    }
    const result = executeEscrowSettlement(transaction.amountIdr, offer.paymentStatus);
    if (!result.settled) return { success: false, status: 422, message: result.message };

    offer.status = "settled";
    offer.deliveredOn = new Date().toISOString();
    offer.paymentStatus = "released_to_vendor";
    transaction.status = "released";
    transaction.releasedAt = getRealtimeWIBTimeString();
    state.vendorWalletIdr += result.creditedAmountIdr;
    if (offer.targetTier === "tier_3") state.biomassProcessedKg += offer.quantityKg;
    if (offer.targetTier === "tier_2") state.socialMealsServed += offer.quantityKg * 4;
    const stock = state.stocks.find((item) => item.id === offer.stockId);
    if (stock) stock.remainingKg = Math.max(0, stock.remainingKg - offer.quantityKg);
    return { success: true, message: "Serah terima dikonfirmasi. Saldo simulasi pedagang diperbarui." };
  });
}

/** Records actual arrival time and deduplicates retried Telegram updates. */
export function addVendorStockServer(commodityId: string, quantityKg: number, vendorId: string, sourceId?: string) {
  return updateState((state) => {
    const kiosk = KIOSKS.find((item) => item.id === vendorId);
    if (!kiosk || !COMMODITIES.some((item) => item.id === commodityId) ||
      !Number.isFinite(quantityKg) || quantityKg <= 0 || quantityKg > 10000) {
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

/** Calculates decay from arrival time and current telemetry, including legacy fixture offsets. */
export function evaluateMarketStock(stock: StockItem, weather: { temperatureC: number; humidityPercent: number }, now = Date.now()) {
  const commodity = COMMODITIES.find((item) => item.id === stock.commodityId);
  if (!commodity) return null;
  const created = Date.parse(stock.createdAt ?? "");
  const elapsed = Number.isFinite(created) ? Math.max(0, (now - created) / 3_600_000) : 0;
  return calculateDecay(commodity, weather.temperatureC, weather.humidityPercent, (stock.hoursOffset ?? 0) + elapsed);
}

/** Refreshes decay for visible inventory without resetting its arrival time or writing to storage. */
export async function readMarketSnapshot(user: Pick<AuthUser, "id" | "role" | "vendorId">) {
  const [state, weather] = await Promise.all([getServerSimulationState(), getHyperlocalMarketWeather()]);
  const visible = visibleMarketState(state, user);
  const now = Date.now();
  const stockHealth = Object.fromEntries(visible.stocks.map((stock) => [stock.id, evaluateMarketStock(stock, weather, now)]));
  if (user.role === "warteg" || user.role === "social_kitchen" || user.role === "maggot") {
    visible.offers = visible.offers.filter((offer) => offer.status !== "active" ||
      isOfferSuitable(offer, stockHealth[offer.stockId]?.decayScore));
  }
  return { ...visible, stockHealth, weather: { isEstimated: weather.isEstimated ?? false, temperatureC: weather.temperatureC, humidityPercent: weather.humidityPercent } };
}

/** Keeps inedible produce out of food channels and edible produce out of feed. */
function isOfferSuitable(offer: RescueOffer, score: number | undefined) {
  return score !== undefined && (offer.targetTier === "tier_3" ? score >= 0.85 : score < 0.85);
}

/** Derives an offer from the stock evaluation shared by the live inventory view. */
function evaluateStockOffer(stock: StockItem, weather: { temperatureC: number; humidityPercent: number }, automatic: boolean): RescueOffer | null {
  const commodity = COMMODITIES.find((item) => item.id === stock.commodityId);
  const evaluation = evaluateMarketStock(stock, weather);
  if (!commodity || !evaluation || stock.remainingKg <= 0) return null;
  if (automatic && evaluation.decayScore < 0.35) return null;
  const tier = evaluation.recommendedTier === "tier_2" || evaluation.recommendedTier === "tier_3" ? evaluation.recommendedTier : "tier_1";
  const floor = tier === "tier_1" ? commodity.minimumSalvagePricePerKg : 0;
  const price = Math.max(floor, evaluation.estimatedSalvagePrice);
  return {
    id: randomUUID(), stockId: stock.id, vendorId: stock.vendorId, commodityId: commodity.id,
    targetTier: tier, quantityKg: stock.remainingKg, originalPricePerKg: commodity.baseWholesalePricePerKg,
    salvagePricePerKg: price, discountPercentage: Math.round(100 * (1 - price / commodity.baseWholesalePricePerKg)),
    totalAmountIdr: Math.round(price * stock.remainingKg), expiresInMinutes: 30,
    createdAt: new Date().toISOString(), status: automatic ? "pending_vendor" : "active", paymentStatus: "unpaid",
  };
}

/** Creates a sale offer or scheduled approval proposal from current conditions. */
export async function publishMarketOffers(vendorId?: string, stockId?: string) {
  const weather = await getHyperlocalMarketWeather();
  return updateState((state) => {
    const candidates = state.stocks.filter((stock) => (!stockId || stock.id === stockId) && (!vendorId || stock.vendorId === vendorId));
    const published = candidates
      .filter((stock) => !state.offers.some((offer) => offer.stockId === stock.id && offer.status !== "rejected" && offer.status !== "settled"))
      .map((stock) => evaluateStockOffer(stock, weather, !stockId)).filter((offer) => offer !== null);
    if (stockId && published.length === 0) {
      return { success: false, status: 409, message: "Stok ini tidak tersedia atau sudah memiliki penawaran." };
    }
    state.offers.unshift(...published);
    return { success: true, message: published.length + " penawaran berhasil disiapkan." };
  });
}

/** Publishes a pending proposal or withdraws an unclaimed listing for the owner. */
export function decideVendorOffer(offerId: string, vendorId: string, approved: boolean) {
  return updateState((state) => {
    const offer = state.offers.find((item) => item.id === offerId && item.vendorId === vendorId);
    if (!offer) return { success: false, status: 404, message: "Penawaran kios tidak ditemukan." };
    if (offer.status !== "pending_vendor" && (approved || offer.status !== "active")) {
      return { success: false, status: 409, message: "Penawaran sudah diproses." };
    }
    offer.status = approved ? "active" : "rejected";
    if (approved) offer.createdAt = new Date().toISOString();
    return { success: true, message: approved ? "Penawaran diterbitkan." : "Penawaran ditolak." };
  });
}

/** Returns only paid orders that can be handed over. */
export async function getActiveCourierTasks() {
  return (await getServerSimulationState()).offers.filter(
    (offer) => offer.status === "claimed" && offer.paymentStatus === "held_in_escrow"
  );
}

/** Lists the same eligible catalog shown in the buyer workspace. */
export async function getSurplusOffersForRole(role: BuyerRole) {
  const state = await readMarketSnapshot({ id: "", role });
  return state.offers.filter((offer) => offer.status === "active");
}
