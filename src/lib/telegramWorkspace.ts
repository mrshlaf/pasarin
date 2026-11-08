import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import { APP_ROLES, isAppRole, type AuthUser } from "@/data/accounts";
import { completedDonationLots, distributionTierForDecay, isDonation, isFreeMaggotOffer, isReadyForDelivery, roundKg, type RescueOffer } from "@/types/market";
import { answerMarketQuestion } from "@/lib/marketOperations";
import { orderStatus } from "@/lib/orderStatus";
import {
  addVendorStockServer, BUYER_TIERS, claimOfferServer, confirmDeliveryServer, decideVendorOffer,
  payOfferServer, publishMarketOffers, readMarketSnapshot,
} from "@/lib/serverSimulationState";

export type TelegramActor = Pick<AuthUser, "id" | "role" | "name" | "vendorId">;
export type TelegramButton = { text: string; callback_data: string } | { text: string; web_app: { url: string } };
type Keyboard = TelegramButton[][];
type Reply = { actionTaken: string; responseText: string; replyMarkup?: { inline_keyboard: Keyboard } };

export const telegramRoleName: Record<TelegramActor["role"], string> = {
  vendor: "Pedagang", warteg: "Warteg", social_kitchen: "Dapur sosial", maggot: "Sentra maggot",
  logistics: "Kurir", manager: "Pengelola pasar", admin: "Administrator",
};

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const weight = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const pageSize = 6;

/** Formats a message and omits its keyboard when there are no actions. */
export function telegramReply(actionTaken: string, responseText: string, keyboard: Keyboard = []): Reply {
  return { actionTaken, responseText, replyMarkup: keyboard.length ? { inline_keyboard: keyboard } : undefined };
}

/** Uses the same commodity and kiosk labels as the market catalog. */
function offerLine(offer: RescueOffer) {
  const commodity = COMMODITIES.find((item) => item.id === offer.commodityId)?.localName ?? offer.commodityId;
  const kiosk = KIOSKS.find((item) => item.id === offer.vendorId);
  const pickup = kiosk ? kiosk.name + ", Lapak " + kiosk.stallNumber + ", Blok " + kiosk.block : offer.vendorId;
  const details = offer.status === "pending_vendor" ? "Perkiraan " + weight.format(offer.quantityKg) + " kg · Belum masuk katalog"
    : weight.format(offer.quantityKg) + " kg · " + (isFreeMaggotOffer(offer) ? "Gratis pakan maggot" : isDonation(offer) ? "Donasi gratis" : money.format(offer.totalAmountIdr));
  return commodity + " · " + details + "\n" +
    pickup + " · " + orderStatus(offer) + (offer.claimedBy ? " · " + offer.claimedBy : "");
}

/** Renders one page and puts every action next to a numbered row in the message. */
function paged<T>(
  command: string, title: string, empty: string, items: T[], pageArg: string | undefined,
  line: (item: T) => string, actions: (item: T, index: number) => TelegramButton[] = () => [],
) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(pages, Math.max(1, Number.parseInt(pageArg ?? "", 10) || 1));
  const start = (page - 1) * pageSize;
  const visible = items.slice(start, start + pageSize);
  const keyboard = visible.map((item, index) => actions(item, start + index + 1)).filter((row) => row.length);
  const nav = [];
  if (page > 1) nav.push({ text: "Sebelumnya", callback_data: "menu:" + command + ":" + (page - 1) });
  if (page < pages) nav.push({ text: "Berikutnya", callback_data: "menu:" + command + ":" + (page + 1) });
  if (nav.length) keyboard.push(nav);
  const list = visible.map((item, index) => (start + index + 1) + ". " + line(item));
  return { text: list.length ? [title + " (" + page + "/" + pages + ")", ...list].join("\n\n") : title + "\n" + empty, keyboard };
}

/** Gives each role its workspace menu and shows the active account at the top. */
function workspaceMenu(user: TelegramActor) {
  const accounts: TelegramButton[] = [{ text: "Akun saya", callback_data: "accounts" }];
  switch (user.role) {
    case "vendor":
      return [
        [{ text: "Catat pasokan", callback_data: "menu:pasok" }, { text: "Inventaris", callback_data: "menu:stok" }],
        [{ text: "Penawaran", callback_data: "menu:penawaran" }, { text: "Saldo dan pembayaran", callback_data: "menu:transaksi" }],
        accounts,
      ];
    case "logistics":
      return [
        [{ text: "Antrean pengantaran", callback_data: "menu:tugas" }, { text: "Riwayat", callback_data: "menu:riwayat" }],
        [{ text: "Riwayat transaksi", callback_data: "menu:transaksi" }],
        accounts,
      ];
    case "manager":
    case "admin":
      return [
        [{ text: "Ringkasan pasar", callback_data: "menu:status" }, { text: "Tanya pasar", callback_data: "menu:tanya" }],
        [{ text: "Penawaran", callback_data: "menu:penawaran" }, { text: "Pembayaran", callback_data: "menu:transaksi" }],
        [{ text: "Pratinjau peran", callback_data: "menu:pratinjau" },
          ...(user.role === "admin" ? [{ text: "Evaluasi stok", callback_data: "menu:evaluasi" }] : [])],
        accounts,
      ];
    default:
      return [
        [{ text: "Katalog", callback_data: "menu:surplus" }, { text: "Pesanan saya", callback_data: "menu:status" }],
        [{ text: "Riwayat transaksi", callback_data: "menu:transaksi" }],
        accounts,
      ];
  }
}

/** Routes chat input to the same stock, offer, payment and dispatch operations as the web. */
export async function handleTelegramCommand(text: string, chatId: number | string, user?: TelegramActor, updateId?: number) {
  const [rawCommand, ...args] = text.trim().split(/\s+/);
  const command = rawCommand.toLowerCase().split("@")[0];
  if (!user) return telegramReply(command === "/start" ? "welcome_new_user" : "auth_required", "Masuk dengan akun Pasarin untuk membuka ruang kerja.");
  const account = user.name + " · " + telegramRoleName[user.role];
  if (["/start", "/menu", "/help"].includes(command)) {
    return telegramReply("welcome_existing_user", account + "\nPilih tugas di bawah.", workspaceMenu(user));
  }
  const vendor = user.role === "vendor" ? user.vendorId : undefined;
  const supervisor = user.role === "manager" || user.role === "admin";
  const buyer = user.role === "warteg" || user.role === "social_kitchen" || user.role === "maggot";

  if (command === "/pasok" && vendor) {
    const quantity = Number(args.at(-1)?.replace(",", "."));
    const label = args.slice(0, -1).join(" ").toLowerCase();
    if (!label) return telegramReply("stock_usage", "Ketik /pasok NAMA KOMODITAS KG. Contoh /pasok kangkung 25.",
      [[{ text: "Daftar komoditas", callback_data: "menu:komoditas" }]]);
    const commodity = COMMODITIES.find((item) => item.id === label || item.localName.toLowerCase() === label);
    if (!commodity || !Number.isFinite(quantity) || quantity <= 0) {
      return telegramReply("stock_rejected", "Periksa komoditas dan berat. Lihat /komoditas untuk daftar bahan.");
    }
    const result = await addVendorStockServer(commodity.id, quantity, vendor, updateId === undefined ? undefined : "tg-" + chatId + "-" + updateId);
    return telegramReply(result.success ? "stock_added" : "stock_rejected", result.message, [[{ text: "Lihat inventaris", callback_data: "menu:stok" }]]);
  }
  if (command === "/komoditas" && vendor) {
    return telegramReply("commodity_list", COMMODITIES.map((item) => item.localName + " (" + item.id + ")").join("\n"));
  }
  if ((command === "/terbitkan" || command === "/setujui") && vendor) {
    const [id, amount, choice] = args;
    if (!id || !amount || args.length > 3 || (choice && choice !== "jual" && choice !== "donasi")) {
      return telegramReply("publish_usage", "Ketik " + command + " ID KG_SISA. Tambahkan jual atau donasi untuk dapur sosial.");
    }
    const confirmation = { confirmedKg: Number(amount.replace(",", ".")),
      mode: choice === "jual" ? "sale" as const : choice === "donasi" ? "donation" as const : undefined };
    const result = command === "/terbitkan"
      ? await publishMarketOffers(vendor, id, confirmation)
      : await decideVendorOffer(id, vendor, true, confirmation);
    return telegramReply(result.success ? "offer_published" : "offer_rejected", result.message);
  }
  if (command === "/klaim" && (user.role === "warteg" || user.role === "social_kitchen" || user.role === "maggot")) {
    const [id, amount] = args;
    if (!id || !amount || args.length !== 2) return telegramReply("claim_usage", "Pilih lot dari /surplus, lalu ketik /klaim ID KG.");
    const result = await claimOfferServer(id, { ...user, role: user.role }, Number(amount.replace(",", ".")),
      updateId === undefined ? undefined : "tg-" + chatId + "-" + updateId);
    return telegramReply(result.success ? "order_reserved" : "claim_rejected", result.message,
      result.success && result.offer?.paymentStatus === "unpaid"
        ? [[{ text: "Lihat tagihan", callback_data: "invoice:" + result.offer.id }]] : []);
  }
  if (command === "/tanya" && supervisor) {
    const question = args.join(" ").slice(0, 1000);
    if (!question) return telegramReply("query_usage", "Ketik /tanya diikuti pertanyaan. Contoh /tanya berapa pesanan siap diantar?");
    const answer = await answerMarketQuestion(question);
    return telegramReply("market_answer", answer.summary.slice(0, 3900) + "\nSumber " + (answer.source === "gemini" ? "Gemini dan data pasar" : "data pasar"));
  }
  if (command === "/evaluasi" && user.role === "admin") {
    const result = await publishMarketOffers();
    return telegramReply(result.success ? "market_evaluated" : "evaluation_failed", result.message);
  }
  if (command === "/pratinjau" && supervisor) {
    const [preview, page] = args;
    if (!isAppRole(preview)) {
      return telegramReply("preview_roles", "Pilih ruang kerja yang ingin dilihat. Pratinjau hanya untuk membaca.",
        APP_ROLES.map((role) => [{ text: telegramRoleName[role], callback_data: "menu:pratinjau:" + role }]));
    }
    const state = await readMarketSnapshot(user);
    const offers = preview === "logistics"
      ? state.offers.filter((item) => item.paymentStatus !== "unpaid")
      : preview === "warteg" || preview === "social_kitchen" || preview === "maggot"
        ? state.offers.filter((item) => item.targetTier === BUYER_TIERS[preview])
        : state.offers;
    const view = paged("pratinjau:" + preview, "Pratinjau " + telegramRoleName[preview], "Belum ada penawaran.", offers, page, offerLine);
    return telegramReply("preview_workspace", view.text, view.keyboard);
  }

  if (command === "/stok" && vendor) {
    const state = await readMarketSnapshot(user);
    const lotOffer = new Map(state.offers.filter((offer) => offer.status === "active" || offer.status === "pending_vendor")
      .map((offer) => [offer.stockId, offer]));
    const freeKg = (stock: typeof state.stocks[number]) => roundKg(stock.remainingKg - state.offers
      .filter((offer) => offer.stockId === stock.id && offer.status === "claimed").reduce((sum, offer) => sum + offer.quantityKg, 0));
    const view = paged("stok", "Inventaris", "Belum ada pasokan.", state.stocks, args[0], (stock) => {
      const health = state.stockHealth[stock.id];
      const offer = lotOffer.get(stock.id);
      const commodity = COMMODITIES.find((item) => item.id === stock.commodityId)?.localName ?? stock.commodityId;
      const remainder = stock.verifiedAt ? weight.format(Math.max(0, freeKg(stock))) + " kg belum dipesan"
        : "Belum ditimbang · Perkiraan sisa " + weight.format(state.estimatedUnsoldKg[stock.id] ?? 0) + " kg";
      return commodity + " · Stok awal " + weight.format(stock.initialKg) + " kg · " + remainder +
        (health ? " · Skor susut " + Math.round(health.decayScore * 100) + "/100" : "") +
        (offer ? " · " + (offer.status === "active" && !stock.verifiedAt ? "Perlu timbang" : orderStatus(offer)) : "");
    }, (stock, index) => {
      const linked = lotOffer.get(stock.id);
      if (freeKg(stock) <= 0 || (linked?.status === "active" && stock.verifiedAt)) return [];
      return [{ text: "Timbang lot " + index, callback_data: linked ? "approve_offer:" + linked.id : "publish:" + stock.id }];
    });
    const stockKg = state.stocks.reduce((total, stock) => total + (stock.verifiedAt ? stock.remainingKg : 0), 0);
    const reserved = state.offers.filter((offer) => offer.status === "claimed").reduce((total, offer) => total + offer.quantityKg, 0);
    const summary = "Sisa fisik terkonfirmasi " + weight.format(stockKg) + " kg · Dipesan " + weight.format(reserved) + " kg";
    const kiosk = KIOSKS.find((item) => item.id === vendor);
    const reputation = kiosk ? "\nReputasi " + Math.min(100, kiosk.reputationScore + completedDonationLots(state.offers, vendor)) + "/100" : "";
    return telegramReply("stock_list", summary + reputation + "\n\n" + view.text, [...view.keyboard,
      [{ text: "Catat pasokan", callback_data: "menu:pasok" }]]);
  }
  if (command === "/penawaran" && (vendor || supervisor)) {
    const state = await readMarketSnapshot(user);
    const offers = state.offers.map((offer) => {
      const estimate = state.estimatedUnsoldKg[offer.stockId];
      return offer.status === "active" && estimate !== undefined
        ? { ...offer, status: "pending_vendor" as const, quantityKg: estimate }
        : offer;
    });
    const view = paged("penawaran", "Penawaran pasar", "Belum ada penawaran.", offers, args[0], offerLine, (offer, index) => {
      if (!vendor) return [];
      if (offer.status === "pending_vendor") return [
        { text: "Timbang & setujui " + index, callback_data: "approve_offer:" + offer.id },
        { text: "Tolak " + index, callback_data: "reject_offer:" + offer.id },
      ];
      return offer.status === "active" ? [{ text: "Tarik " + index, callback_data: "reject_offer:" + offer.id }] : [];
    });
    return telegramReply("offers_list", view.text, view.keyboard);
  }
  if (command === "/transaksi") {
    const state = await readMarketSnapshot(user);
    const view = paged("transaksi", "Riwayat transaksi & pembayaran", "Belum ada transaksi.", state.transactions, args[0], (item) =>
      item.commodityName + " · " + money.format(item.amountIdr) + "\n" + item.buyerName + " → " + item.vendorName + " · " +
      (item.status === "released" ? "Selesai" : item.status === "refunded" ? "Dikembalikan" : "Ditahan"));
    return telegramReply("payments_list", (vendor ? "Saldo " + money.format(state.vendorWalletIdr) + "\n\n" : "") + view.text, view.keyboard);
  }
  if (command === "/surplus" && buyer) {
    const state = await readMarketSnapshot(user);
    const view = paged("surplus", "Katalog surplus", "Belum ada lot yang bisa diklaim.", state.offers.filter((offer) => offer.status === "active"),
      args[0], offerLine, (offer, index) => [
        { text: (isFreeMaggotOffer(offer) ? "Ambil gratis " : isDonation(offer) ? "Ambil donasi " : "Pilih jumlah ") + index, callback_data: "claim:" + offer.id },
      ]);
    return telegramReply("surplus_catalog_viewed", view.text, view.keyboard);
  }
  if ((command === "/tugas" || command === "/riwayat" || command === "/status") && user.role === "logistics") {
    const history = command === "/riwayat";
    const state = await readMarketSnapshot(user);
    const ready = state.offers.filter((offer) => isReadyForDelivery(offer));
    const completed = state.offers.filter((offer) => offer.status === "settled");
    const view = paged(history ? "riwayat" : "tugas", history ? "Riwayat pengantaran" : "Antrean pengantaran", "Belum ada pengantaran.",
      history ? completed : ready, args[0], offerLine,
      (offer, index) => history ? [] : [{ text: "Serah terima " + index, callback_data: "handover:" + offer.id }]);
    const load = ready.reduce((total, offer) => total + offer.quantityKg, 0);
    const held = ready.reduce((total, offer) => total + offer.totalAmountIdr, 0);
    const summary = ready.length + " siap diantar · " + weight.format(load) + " kg\n" + money.format(held) + " ditahan · " + completed.length + " selesai";
    return telegramReply("logistics_tasks_displayed", summary + "\n\n" + view.text, view.keyboard);
  }
  if (command === "/status") {
    const state = await readMarketSnapshot(user);
    if (buyer) {
      const orders = state.offers.filter((offer) => offer.isMine);
      const view = paged("status", "Pesanan saya", "Belum ada pesanan.", orders,
        args[0], offerLine, (offer, index) => offer.status === "claimed" && offer.paymentStatus === "unpaid"
          ? [{ text: "Bayar " + index, callback_data: "invoice:" + offer.id }] : []);
      const orderedKg = orders.reduce((total, offer) => total + offer.quantityKg, 0);
      const impact = user.role === "social_kitchen"
        ? "Perkiraan " + Math.round(orderedKg * 4) + " porsi"
        : user.role === "maggot"
          ? "Perkiraan " + weight.format(orderedKg / 5) + " kg larva"
          : "Total pesanan " + money.format(orders.reduce((total, offer) => total + offer.totalAmountIdr, 0));
      return telegramReply("status_reported", impact + "\n\n" + view.text, view.keyboard);
    }
    const risky = state.stocks.filter((item) => item.remainingKg > 0 && (state.stockHealth[item.id]?.decayScore ?? 0) >= 0.35).length;
    return telegramReply("status_reported", [
      account, "Kios aktif " + new Set(state.stocks.map((item) => item.vendorId)).size,
      "Lot perlu ditinjau " + risky,
      "Penawaran aktif " + state.offers.filter((offer) => offer.status === "active").length,
      "Siap diantar " + state.offers.filter((offer) => isReadyForDelivery(offer)).length,
      "Selesai " + state.offers.filter((offer) => offer.status === "settled").length,
    ].join("\n"), workspaceMenu(user));
  }
  return telegramReply("help_displayed", "Pilih tugas yang tersedia untuk " + telegramRoleName[user.role] + ".", workspaceMenu(user));
}

/** Enforces role and order ownership again when the user presses an action button. */
export async function handleTelegramAction(action: string, id: string | undefined, user: TelegramActor) {
  const role = user.role;
  const vendor = role === "vendor" ? user.vendorId : undefined;
  const buyer = role === "warteg" || role === "social_kitchen" || role === "maggot";
  if (action === "publish_all" && vendor) return telegramReply("publish_usage", "Timbang setiap lot dari /stok sebelum diterbitkan.");
  if (id && vendor && (action === "publish" || action === "approve_offer")) {
    const state = await readMarketSnapshot(user);
    const proposal = action === "approve_offer" ? state.offers.find((offer) => offer.id === id &&
      (offer.status === "pending_vendor" || offer.status === "active")) : undefined;
    const stock = state.stocks.find((item) => item.id === (action === "publish" ? id : proposal?.stockId));
    if (!stock) return telegramReply("offer_rejected", "Lot atau usulan sudah tidak tersedia.");
    if (proposal?.status === "active" && stock.verifiedAt) return telegramReply("offer_rejected", "Tarik penawaran aktif sebelum menimbang ulang.");
    const command = action === "publish" ? "/terbitkan" : "/setujui";
    const social = distributionTierForDecay(state.stockHealth[stock.id]?.decayScore ?? 0) === "tier_2";
    const example = command + " " + id + " KG_SISA";
    const predictedKg = state.estimatedUnsoldKg[stock.id] ?? (proposal?.status === "pending_vendor" ? proposal.quantityKg : undefined);
    const estimate = predictedKg === undefined ? "" : "Perkiraan sisa " + weight.format(predictedKg) + " kg. Belum masuk katalog.\n\n";
    return telegramReply("publish_usage", estimate + "Isi sisa fisik setelah penjualan di pasar, di luar pesanan PASARIN. Seluruh hasil timbang diterbitkan. Isi 0 jika habis.\n\n" +
      example + (social ? " jual\n" + example + " donasi" : ""));
  }
  if (id && vendor && action === "reject_offer") return telegramReply(action, (await decideVendorOffer(id, vendor, false)).message);
  if (id && buyer && (action === "claim" || action === "donate")) {
    const state = await readMarketSnapshot(user);
    const offer = state.offers.find((item) => item.id === id && item.status === "active");
    return offer ? telegramReply("claim_usage", offerLine(offer) + "\n\nGanti KG dengan jumlah yang diinginkan.\n/klaim " + id + " KG")
      : telegramReply("claim_rejected", "Penawaran sudah tidak tersedia.");
  }
  if (id && action === "invoice" && buyer) {
    const state = await readMarketSnapshot(user);
    const offer = state.offers.find((item) => item.id === id && item.isMine && item.status === "claimed" && item.paymentStatus === "unpaid");
    return offer ? telegramReply(action, "Pembayaran simulasi\n\n" + offerLine(offer),
      [[{ text: "Konfirmasi pembayaran", callback_data: "pay:" + id }]])
      : telegramReply(action, "Tagihan ini sudah diproses atau tidak tersedia untuk akun Anda.");
  }
  if (id && action === "pay" && buyer) return telegramReply(action, (await payOfferServer(id, user.id)).message);
  if (id && action === "handover" && role === "logistics") {
    const state = await readMarketSnapshot(user);
    const offer = state.offers.find((item) => item.id === id && isReadyForDelivery(item));
    return offer ? telegramReply(action, "Konfirmasi serah terima\n\n" + offerLine(offer),
      [[{ text: "Barang sudah diterima", callback_data: "deliver:" + id }]])
      : telegramReply(action, "Pengantaran ini sudah diproses atau belum siap diserahterimakan.");
  }
  if (id && action === "deliver" && role === "logistics") return telegramReply(action, (await confirmDeliveryServer(id)).message);
  return telegramReply("action_denied", "Aksi ini tidak tersedia untuk akun Anda.");
}
