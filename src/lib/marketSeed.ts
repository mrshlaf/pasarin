import { COMMODITIES, type Commodity } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import { MARKET_ACCOUNTS, localActorId } from "@/data/marketAccounts";
import type { EscrowTransaction, RescueOffer, StockItem } from "@/types/market";
import type { ServerState } from "@/lib/serverSimulationState";
import { calculateDecay } from "@/lib/decayEngine";

const SEED_WEATHER = { temperatureC: 32, humidityPercent: 75 } as const;

/** Six shelf-life stages per kiosk: fresh, two light-wilt, two medium-wilt, one feed-grade. */
const STAGES = [
  { decayTarget: 0.12, offerTier: null },
  { decayTarget: 0.46, offerTier: "tier_1" },
  { decayTarget: 0.60, offerTier: null },
  { decayTarget: 0.74, offerTier: "tier_2" },
  { decayTarget: 0.82, offerTier: null },
  { decayTarget: 0.94, offerTier: "tier_3" },
] as const;

type OfferTier = NonNullable<(typeof STAGES)[number]["offerTier"]>;

/** Finds commodity records that match the kiosk's written specialization, then fills the stall. */
function selectCommodities(kiosk: (typeof KIOSKS)[number], kioskIndex: number) {
  const selected: Commodity[] = [];
  for (const specialization of kiosk.specialization) {
    const needle = specialization.toLowerCase();
    const match = COMMODITIES.find((commodity) =>
      commodity.localName.toLowerCase().includes(needle) ||
      needle.includes(commodity.localName.toLowerCase()) ||
      commodity.name.toLowerCase().includes(needle));
    if (match && !selected.includes(match)) selected.push(match);
  }
  let cursor = 0;
  while (selected.length < STAGES.length) {
    const candidate = COMMODITIES[(kioskIndex * 7 + cursor * 11) % COMMODITIES.length];
    if (!selected.includes(candidate)) selected.push(candidate);
    cursor++;
  }
  return selected.slice(0, STAGES.length);
}

/** Binary-searches the display age that lands a commodity on a requested decay score. */
function hoursForDecay(commodity: Commodity, target: number) {
  let low = 0;
  let high = Math.max(24, commodity.standardShelfLifeHours * 3);
  for (let step = 0; step < 48; step++) {
    const middle = (low + high) / 2;
    if (calculateDecay(commodity, SEED_WEATHER.temperatureC, SEED_WEATHER.humidityPercent, middle).decayScore < target) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return Number(((low + high) / 2).toFixed(2));
}

function wibClockFromOffset(hours: number) {
  const date = new Date(Date.now() - hours * 3_600_000);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta",
  }).format(date);
}

function accountName(username: string) {
  return MARKET_ACCOUNTS.find((account) => account.username === username)?.name ?? username;
}

function priceForTier(commodity: Commodity, tier: OfferTier, evaluationPrice: number) {
  if (tier === "tier_3") return Math.max(500, Math.round((commodity.baseWholesalePricePerKg * 0.05) / 500) * 500);
  if (tier === "tier_2") return Math.max(1000, Math.round((commodity.baseWholesalePricePerKg * 0.15) / 500) * 500);
  return Math.max(commodity.minimumSalvagePricePerKg, evaluationPrice);
}

/** Builds a deterministic market with 30 kiosks, varied shelf life, and role-specific offers. */
export function buildMarketSeedState(actorIds: Record<string, string> = {}): ServerState {
  const stocks: StockItem[] = [];
  const offers: RescueOffer[] = [];
  const transactions: EscrowTransaction[] = [];
  const nowIso = new Date().toISOString();
  const nowClock = wibClockFromOffset(0);

  KIOSKS.forEach((kiosk, kioskIndex) => {
    const commodities = selectCommodities(kiosk, kioskIndex);
    commodities.forEach((commodity, lotIndex) => {
      const stage = STAGES[lotIndex];
      const hoursOffset = hoursForDecay(commodity, stage.decayTarget);
      const stockId = `stk_seed_${String(kioskIndex + 1).padStart(2, "0")}_${lotIndex + 1}`;
      const remainingKg = 20 + ((kioskIndex * 7 + lotIndex * 13) % 46);
      const stock: StockItem = {
        id: stockId,
        vendorId: kiosk.id,
        commodityId: commodity.id,
        initialKg: remainingKg,
        remainingKg,
        arrivalClock: wibClockFromOffset(hoursOffset),
        lotNumber: `LOT-${kiosk.stallNumber}-D${lotIndex + 1}`,
        hoursOffset,
        createdAt: nowIso,
      };
      stocks.push(stock);
      if (!stage.offerTier) return;

      const evaluation = calculateDecay(
        commodity, SEED_WEATHER.temperatureC, SEED_WEATHER.humidityPercent, hoursOffset,
      );
      const salvagePricePerKg = priceForTier(commodity, stage.offerTier, evaluation.estimatedSalvagePrice);
      const discountPercentage = Math.max(0, Math.min(100,
        Math.round(100 * (1 - salvagePricePerKg / commodity.baseWholesalePricePerKg))));
      offers.push({
        id: `ofr_seed_${String(kioskIndex + 1).padStart(2, "0")}_${lotIndex + 1}`,
        stockId,
        vendorId: kiosk.id,
        commodityId: commodity.id,
        targetTier: stage.offerTier,
        quantityKg: remainingKg,
        originalPricePerKg: commodity.baseWholesalePricePerKg,
        salvagePricePerKg,
        discountPercentage,
        totalAmountIdr: Math.round(salvagePricePerKg * remainingKg),
        expiresInMinutes: stage.offerTier === "tier_3" ? 720 : 360,
        createdAt: nowIso,
        status: "active",
        paymentStatus: "unpaid",
      });
    });
  });

  const findOffer = (kioskNumber: number, tier: OfferTier) => {
    const offer = offers.find((item) => item.vendorId === KIOSKS[kioskNumber - 1].id && item.targetTier === tier);
    if (!offer) throw new Error(`Seed offer missing for kiosk ${kioskNumber} ${tier}`);
    return offer;
  };
  const actorId = (username: string) => actorIds[username] ?? localActorId(username);
  const vendorName = (vendorId: string) => KIOSKS.find((kiosk) => kiosk.id === vendorId)?.name ?? vendorId;
  const commodityName = (commodityId: string) =>
    COMMODITIES.find((commodity) => commodity.id === commodityId)?.localName ?? commodityId;

  /** Makes a claimed offer and its matching escrow row for history or courier work. */
  const claimOffer = (
    offer: RescueOffer, username: string, paymentStatus: RescueOffer["paymentStatus"], settled = false,
  ) => {
    offer.status = settled ? "settled" : "claimed";
    offer.claimedBy = accountName(username);
    offer.claimedById = actorId(username);
    offer.claimedAt = nowClock;
    offer.paymentStatus = paymentStatus;
    if (settled) offer.deliveredOn = nowIso;
    const transaction: EscrowTransaction = {
      id: `txn_seed_${offer.id}`,
      offerId: offer.id,
      buyerName: offer.claimedBy,
      vendorName: vendorName(offer.vendorId),
      commodityName: commodityName(offer.commodityId),
      amountIdr: offer.totalAmountIdr,
      status: settled ? "released" : "held_in_escrow",
      createdAt: nowClock,
      ...(settled ? { releasedAt: nowClock } : {}),
    };
    transactions.push(transaction);
    if (settled) {
      const stock = stocks.find((item) => item.id === offer.stockId);
      if (stock) stock.remainingKg = 0;
    }
  };

  const wartegUnpaid = findOffer(10, "tier_1");
  claimOffer(wartegUnpaid, "warteg1", "unpaid");

  const socialInTransit = findOffer(15, "tier_2");
  claimOffer(socialInTransit, "sosial1", "held_in_escrow");

  const socialSettled = findOffer(16, "tier_2");
  claimOffer(socialSettled, "sosial2", "released_to_vendor", true);

  const maggotSettled = findOffer(20, "tier_3");
  claimOffer(maggotSettled, "maggot1", "released_to_vendor", true);

  const maggotInTransit = findOffer(21, "tier_3");
  claimOffer(maggotInTransit, "maggot2", "held_in_escrow");

  const vendorPending = findOffer(22, "tier_2");
  vendorPending.status = "pending_vendor";

  const vendorRejected = findOffer(23, "tier_1");
  vendorRejected.status = "rejected";

  const released = transactions.filter((transaction) => transaction.status === "released");
  return {
    stocks,
    offers,
    transactions,
    vendorWalletIdr: released.reduce((total, transaction) => total + transaction.amountIdr, 0),
    biomassProcessedKg: maggotSettled.quantityKg,
    socialMealsServed: socialSettled.quantityKg * 4,
    lastUpdated: nowIso,
  };
}
