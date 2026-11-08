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

/** Removes old handover tokens and makes legacy unpaid Maggot orders free. */
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

/** Strips internal order ownership and retry keys from API responses. */
export function marketOfferForUser(offer: RescueOffer, userId: string) {
  const visible = { ...offer, isMine: offer.claimedById === userId };
  delete visible.claimedById;
  delete visible.reservationKey;
  return visible;
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

/** Reserves a measured share of a listing and retains the rest for other buyers. */
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

/** Moves an owned unpaid order into the courier queue. */
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

/** Completes a delivery once and settles the ledger only when it has an escrow entry. */
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

/** Records actual arrival time and deduplicates retried Telegram updates. */
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
    summary: `Di bawah suhu mikroklimat ${temperatureC}°C (${humidityPercent}% RH), pasar memproyeksikan penyaluran ${roundKg(wartegKg + socialKg + maggotKg)} kg komoditas pangan dan biomassa. Sebanyak ${wartegKg} kg dialokasikan untuk ketahanan pangan Warteg dan ${socialKg} kg disiagakan untuk Dapur Sosial.`,
    recommendation: `Siagakan ${couriersCount} kurir armada (${vehiclesList}) dengan rute penjemputan prioritas sayuran daun Blok A sebelum jam 15:00 WIB guna meminimalkan akselerasi respirasi seluler.`,
    model: "gemini-3.5-flash-lite",
    source: "heuristik" as const,
  };

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey.length < 15) {
    aiForecastCache = { key: cacheKey, expiresAt: Date.now() + 5 * 60 * 1000, data: defaultHeuristic };
    return defaultHeuristic;
  }

  try {
    const prompt = `Anda adalah AI Asisten Operasional Logistik Pasar Induk Kramat Jati (PASARIN).
Data operasional hari ini:
- Suhu los pasar: ${temperatureC}°C, Kelembapan: ${humidityPercent}% RH
- Estimasi alokasi Warteg (Tier 1): ${wartegKg} kg
- Estimasi alokasi Dapur Sosial & Panti (Tier 2): ${socialKg} kg
- Estimasi alokasi Sentra Maggot (Tier 3): ${maggotKg} kg
- Kesiapan armada: ${couriersCount} kurir (${vehiclesList})

Tuliskan dalam Bahasa Indonesia yang ringkas dan profesional:
1. Ringkasan operasional (maksimal 2 kalimat mengenai dinamika suhu vs kecepatan distribusi pangan).
2. Satu kalimat rekomendasi taktis pengantaran kurir hari ini.
Format persis:
RINGKASAN: [isi ringkasan]
REKOMENDASI: [isi rekomendasi]`;

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

/** Publishes only totals by lane and commodity. Account and transaction records stay private. */
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

  // Logistics fleet allocation (Weight Dispatch Rule PSR-27)
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
      targetLane: "Warteg & UMKM Kuliner",
      description: "Muatan ringan (<= 300 kg), lincah bermanuver di lorong sempit los pasar dan gang warteg.",
    },
    {
      type: "granmax_pickup" as const,
      name: "Daihatsu GranMax Pikap",
      units: granmaxUnits,
      driverName: "Pak Hendra Wijaya",
      licensePlate: "B 9812 SAA",
      capacityKg: 1000,
      fuelType: "Pertamax",
      targetLane: "Dapur Sosial & Panti Asuhan",
      description: "Muatan menengah (301 - 1.000 kg), distribusi multi-stop Warteg & Dapur Sosial.",
    },
    ...(isuzuUnits > 0 ? [{
      type: "isuzu_truck" as const,
      name: "Truk Engkel Isuzu Elf",
      units: isuzuUnits,
      driverName: "Bpk. Rahmat Hidayat",
      licensePlate: "B 7710 KDA",
      capacityKg: 4000,
      fuelType: "Bio Solar",
      targetLane: "Sentra Maggot BSF & TPS 3R",
      description: "Muatan massal (> 1.000 kg), limbah afkir organik langsung ke biokonversi maggot.",
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

/** Rejects listings whose physical stock or current quality no longer supports a claim. */
function canClaimStock(state: ServerState, offer: RescueOffer, stock: StockItem | undefined, score: number | undefined) {
  return Boolean(stock?.verifiedAt && roundKg(stock.remainingKg - reservedStockKg(state, stock.id)) >= offer.quantityKg && isOfferSuitable(offer, score));
}

/** Keeps stock that already belongs to an order separate from available kilograms. */
function reservedStockKg(state: ServerState, stockId: string) {
  return roundKg(state.offers.reduce((sum, offer) => sum + (offer.stockId === stockId && offer.status === "claimed" ? offer.quantityKg : 0), 0));
}

/** Counts kilograms already handed over from the same intake lot. */
function distributedStockKg(state: ServerState, stockId: string) {
  return roundKg(state.offers.reduce((sum, offer) => sum + (offer.stockId === stockId && offer.status === "settled" ? offer.quantityKg : 0), 0));
}

/** Estimates unreserved stock without changing the last recorded physical weight. */
function estimateUnsoldStockKg(state: ServerState, stock: StockItem, footfallDropPercentage: number) {
  const reserved = reservedStockKg(state, stock.id);
  const estimated = predictRetailSurplusKg(stock.initialKg, footfallDropPercentage) - distributedStockKg(state, stock.id) - reserved;
  return Math.max(0, roundKg(Math.min(stock.remainingKg - reserved, estimated)));
}

/** Validates the common precision and bounds used by both web and Telegram. */
function validWeight(weight: number) {
  return Number.isFinite(weight) && weight >= 0 && weight <= 10_000 && roundKg(weight) === weight;
}

/** Hides listings when a change in quality moves the remainder to a different lane. */
function isOfferSuitable(offer: RescueOffer, score: number | undefined) {
  return score !== undefined && offer.targetTier === distributionTierForDecay(score);
}

/** Derives an offer from the stock evaluation shared by the live inventory view. */
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

/** Records the seller's physical count and publishes the offer in the same revision. */
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

/** Creates scheduled proposals or publishes one lot confirmed by its owner. */
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

/** Publishes a pending proposal or withdraws an unclaimed listing for the owner. */
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

/** Lists the same eligible catalog shown in the buyer workspace. */
export async function getSurplusOffersForRole(role: BuyerRole) {
  const state = await readMarketSnapshot({ id: "", role });
  return state.offers.filter((offer) => offer.status === "active");
}
