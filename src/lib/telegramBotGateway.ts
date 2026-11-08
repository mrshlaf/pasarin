import { getEnv } from "@/lib/env";
import { KIOSKS } from "@/data/kiosks";
import { COMMODITIES } from "@/data/commodities";
import { orderStatus as telegramOrderStatus } from "@/lib/orderStatus";
import { accountProfile, isAppRole, type AuthUser } from "@/data/accounts";
import { getServiceRoleClient } from "@/lib/supabase";
import { matchesSecret } from "@/lib/apiAuth";
import { answerMarketQuestion } from "@/lib/marketOperations";
import {
  addVendorStockServer, getActiveCourierTasks, readMarketSnapshot,
  getSurplusOffersForRole, publishMarketOffers,
} from "@/lib/serverSimulationState";

export interface TelegramChat {
  id: number | string;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

type TelegramActor = Pick<AuthUser, "id" | "role" | "name" | "vendorId">;

/** Rejects Telegram requests when the configured webhook secret is absent or different. */
export function verifyTelegramWebhookSecret(
  secretHeader: string | null | undefined,
  expectedSecret = getEnv().TELEGRAM_WEBHOOK_SECRET,
) {
  return matchesSecret(secretHeader, expectedSecret);
}

/** Resolves the server-managed chat mapping without exposing the configured identities. */
export function configuredTelegramActor(chatId: number): TelegramActor | null {
  try {
    const accounts: unknown = JSON.parse(process.env.TELEGRAM_CHAT_ACCOUNTS ?? "{}");
    if (!accounts || typeof accounts !== "object" || !Object.hasOwn(accounts, String(chatId))) return null;
    const account = (accounts as Record<string, Partial<TelegramActor>>)[chatId];
    if (!account || !isAppRole(account.role) || typeof account.id !== "string" || typeof account.name !== "string") return null;
    return account as TelegramActor;
  } catch {
    return null;
  }
}

/** Checks the linked account's current Supabase permissions for deployed bot actions. */
export async function resolveTelegramActor(chatId: number): Promise<TelegramActor | null> {
  const account = configuredTelegramActor(chatId);
  if (!account || (process.env.NODE_ENV !== "production" && process.env.PASARIN_STATE_BACKEND !== "supabase")) return account;
  const { data, error } = await getServiceRoleClient().auth.admin.getUserById(account.id);
  return error || !data.user ? null : accountProfile(data.user);
}

/** Dispatches role-scoped commands using the same market operations as the website. */
export async function handleTelegramCommand(text: string, chatId: number | string, actor?: TelegramActor, updateId?: number) {
  const [rawCommand, ...args] = text.trim().split(/\s+/);
  const command = rawCommand.toLowerCase().split("@")[0];
  const user = actor;

  const reply = (actionTaken: string, responseText: string, replyMarkup?: unknown) =>
    ({ actionTaken, responseText, replyMarkup });
  const roleCommands: Record<TelegramActor["role"], string> = {
    vendor: "/pasok KOMODITAS KG, /stok, /terbitkan ID_STOK",
    warteg: "/surplus, /status", social_kitchen: "/surplus, /status", maggot: "/surplus, /status",
    logistics: "/tugas, /status", manager: "/tanya PERTANYAAN, /status", admin: "/tanya PERTANYAAN, /evaluasi, /status",
  };
  const help = user ? "Perintah Anda: " + roleCommands[user.role] + ". Gunakan /help untuk melihat lagi." : "Gunakan /start.";

  if (command === "/start") {
    return reply(user ? "welcome_existing_user" : "welcome_new_user", user
      ? "Halo " + user.name + ". " + help
      : "Halo! Minta pengelola mengaitkan chat ini untuk mengakses simulasi. " + help);
  }
  if (command === "/help") return reply("help_displayed", help);
  if (!user) return reply("auth_required", "Chat ini belum terdaftar. Hubungi pengelola. Jangan kirim kata sandi.");
  if (command === "/status" && user.role !== "logistics") {
    const state = await readMarketSnapshot(user);
    const kiosk = KIOSKS.find((item) => item.id === user.vendorId);
    const orders = state.offers.filter((offer) => offer.isMine).slice(0, 20);
    const status = orders.map((offer) =>
      offer.id + " · " + telegramOrderStatus(offer));
    const payable = orders.filter((offer) => offer.status === "claimed" && offer.paymentStatus === "unpaid");
    return reply("status_reported", [user.name + " · " + user.role, kiosk ? "Kios " + kiosk.stallNumber : "", ...status].filter(Boolean).join("\n"),
      { inline_keyboard: payable.map((offer) => [{ text: "Konfirmasi pembayaran simulasi", callback_data: "pay:" + offer.id }]) });
  }
  if (command === "/pasok" && user.role === "vendor" && user.vendorId) {
    if (args.length !== 2) return reply("stock_usage", "Gunakan /pasok KOMODITAS KG, misalnya /pasok kangkung 25.");
    const result = await addVendorStockServer(args[0].toLowerCase(), Number(args[1].replace(",", ".")), user.vendorId,
      updateId === undefined ? undefined : "tg-" + chatId + "-" + updateId);
    return reply(result.success ? "stock_added" : "stock_rejected", result.message);
  }
  if (command === "/terbitkan" && user.role === "vendor" && user.vendorId) {
    if (args.length !== 1) return reply("publish_usage", "Gunakan /terbitkan ID_STOK, atau pilih tombol pada /stok.");
    const result = await publishMarketOffers(user.vendorId, args[0]);
    return reply(result.success ? "offer_published" : "offer_rejected", result.message);
  }
  if (command === "/tanya" && (user.role === "admin" || user.role === "manager")) {
    const question = args.join(" ").slice(0, 1000);
    if (!question) return reply("query_usage", "Gunakan /tanya PERTANYAAN.");
    const answer = await answerMarketQuestion(question);
    return reply("market_answer", answer.summary + "\nSumber: " + (answer.source === "gemini" ? "Gemini · data pasar" : "Data pasar"));
  }
  if (command === "/evaluasi" && user.role === "admin") {
    const result = await publishMarketOffers();
    return reply(result.success ? "market_evaluated" : "evaluation_failed", result.message);
  }
  if (command === "/surplus" || command === "/tugas" || command === "/stok" || (command === "/status" && user.role === "logistics")) {
    if (user.role === "logistics") {
      const tasks = (await getActiveCourierTasks()).slice(0, 20);
      const lines = tasks.map((task) => task.id + " · " + task.commodityId + " · " + task.quantityKg + " kg");
      return reply("logistics_tasks_displayed", lines.length
        ? ["Tugas pengantaran", ...lines].join("\n") : "Belum ada tugas pengantaran.", {
        inline_keyboard: tasks.slice(0, 10).map((task) => [{ text: "Serah terima " + task.commodityId, callback_data: "deliver:" + task.id }]),
      });
    }
    if (user.role === "warteg" || user.role === "social_kitchen" || user.role === "maggot") {
      const offers = (await getSurplusOffersForRole(user.role)).slice(0, 20);
      const lines = offers.map((offer) =>
        (COMMODITIES.find((item) => item.id === offer.commodityId)?.localName ?? offer.commodityId) +
        " · " + offer.quantityKg + " kg · Rp " + offer.totalAmountIdr.toLocaleString("id-ID"));
      return reply("surplus_catalog_viewed", lines.length ? ["Katalog Surplus", ...lines].join("\n") : "Katalog Surplus masih kosong.", {
        inline_keyboard: offers.map((offer) => [
          { text: "Klaim " + offer.commodityId, callback_data: "claim:" + offer.id },
          ...(user.role === "social_kitchen" ? [{ text: "Klaim donasi", callback_data: "donate:" + offer.id }] : []),
        ]),
      });
    }
    const state = await readMarketSnapshot(user);
    const stocks = state.stocks.filter((stock) => stock.vendorId === user.vendorId);
    const pending = state.offers.filter((offer) =>
      user.role === "vendor" && offer.vendorId === user.vendorId && offer.status === "pending_vendor"
    );
    const inventory = stocks.slice(0, 30).map((stock) => {
      const health = state.stockHealth[stock.id];
      const decay = health ? " · Skor susut " + (health.decayScore * 100).toFixed(2) + "%" : "";
      const linked = state.offers.find((offer) => offer.stockId === stock.id && offer.status !== "rejected" && offer.status !== "settled");
      return stock.commodityId + " · " + stock.remainingKg + " kg" + decay + (linked ? " · " + telegramOrderStatus(linked) : "");
    });
    const available = stocks.filter((stock) => stock.remainingKg > 0 && !state.offers.some((offer) =>
      offer.stockId === stock.id && offer.status !== "rejected" && offer.status !== "settled"));
    return reply("surplus_catalog_viewed", ["Katalog Surplus · Stok kios", ...inventory, pending.length + " usulan menunggu persetujuan."].join("\n"), {
      inline_keyboard: [
        ...available.slice(0, 10).map((stock) => [{ text: "Terbitkan " + stock.commodityId, callback_data: "publish:" + stock.id }]),
        ...pending.slice(0, 10).map((offer) => [
          { text: "Setujui " + offer.commodityId, callback_data: "approve_offer:" + offer.id },
          { text: "Tolak", callback_data: "reject_offer:" + offer.id },
        ]),
        ...state.offers.filter((offer) => offer.status === "active").slice(0, 10).map((offer) => [
          { text: "Tarik " + offer.commodityId, callback_data: "reject_offer:" + offer.id },
        ]),
      ],
    });
  }
  return reply("help_displayed", help);
}

export async function dispatchTelegramMessage(
  chatId: number | string,
  text: string,
  options?: {
    parseMode?: "HTML" | "Markdown";
    replyMarkup?: unknown;
    simulate?: boolean;
  }
): Promise<{ success: boolean; messageId?: number; latencyMs: number; error?: string }> {
  const startTime = Date.now();
  const env = getEnv();

  // 1. Pengiriman nyata via Telegram Bot API jika token terpasang
  if (!options?.simulate && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_TOKEN !== "dummy_telegram_token") {
    try {
      const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(5000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: options?.parseMode,
          reply_markup: options?.replyMarkup,
        }),
      });

      const json = await response.json();
      const latencyMs = Date.now() - startTime;

      if (json.ok) {
        return {
          success: true,
          messageId: json.result?.message_id,
          latencyMs,
        };
      }

      // Fallback: Jika pemformatan Markdown ditolak Telegram (400 Bad Request), kirim ulang sebagai Plain Text
      console.warn("[Telegram Dispatch Warning] Markdown rejected by Telegram:", json.description);
      if (!options?.parseMode || response.status !== 400) {
        return { success: false, latencyMs, error: "Telegram menolak pesan." };
      }
      const fallbackRes = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(5000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.replace(/[*_`]/g, ""),
          reply_markup: options?.replyMarkup,
        }),
      });
      const fallbackJson = await fallbackRes.json();
      if (fallbackJson.ok) {
        return {
          success: true,
          messageId: fallbackJson.result?.message_id,
          latencyMs: Date.now() - startTime,
        };
      }

      return {
        success: false,
        latencyMs: Date.now() - startTime,
        error: fallbackJson.description || json.description || "Galat Telegram Bot API",
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        latencyMs,
        error: err instanceof Error ? err.message : "Gagal menghubungi server Telegram",
      };
    }
  }

  if (!options?.simulate) return { success: false, latencyMs: Date.now() - startTime, error: "Token bot belum diatur." };

  // Testbench calls are isolated from the external bot.
  const latencyMs = Math.max(12, Date.now() - startTime);

  return {
    success: true,
    messageId: Math.floor(Math.random() * 89999 + 10000),
    latencyMs,
  };
}

/** Acknowledges a button press after the shared operation returns. */
export async function answerTelegramCallbackQuery(callbackQueryId: string, message: string) {
  const token = getEnv().TELEGRAM_BOT_TOKEN;
  if (!token) return { success: false };
  try {
    const response = await fetch("https://api.telegram.org/bot" + token + "/answerCallbackQuery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: message.slice(0, 200) }),
    });
    return { success: response.ok };
  } catch {
    return { success: false };
  }
}
