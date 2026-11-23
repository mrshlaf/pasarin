// Modul Gerbang Pengiriman Pesan dan Penanganan Webhook Telegram Bot API (PSR-38).
// Mengatur kontrak data pembaruan Telegram (Update, Message, CallbackQuery),
// verifikasi rahasia token webhook (x-telegram-bot-api-secret-token),
// serta pengiriman pesan HTTP dengan mekanisme fallback ke teks polos jika parsing Markdown ditolak.

import { getEnv } from "@/lib/env";
import { matchesSecret } from "@/lib/apiAuth";

// Kontrak struktur objek Chat Telegram (PSR-24 / PSR-38).
export interface TelegramChat {
  id: number | string;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

// Kontrak struktur pesan teks masuk Telegram Bot API (PSR-24 / PSR-38).
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

// Kontrak interaksi klik tombol inline keyboard Telegram (PSR-24 / PSR-38).
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

// Kontrak payload pembaruan webhook masuk dari server Telegram Bot API (PSR-24 / PSR-38).
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

// Memvalidasi keaslian permintaan webhook masuk dari server Telegram.
// Membandingkan nilai header secret token dengan rahasia lingkungan secara timing-safe.
// Memeriksa rahasia webhook dari header Telegram; hanya permintaan dengan rahasia cocok yang diproses.
export function verifyTelegramWebhookSecret(
  secretHeader: string | null | undefined,
  expectedSecret = getEnv().TELEGRAM_WEBHOOK_SECRET,
) {
  return matchesSecret(secretHeader, expectedSecret);
}

// Mengirimkan pesan teks atau balasan interaktif ke obrolan Telegram via REST API Telegram Bot.
// Dilengkapi mekanisme pengiriman ulang (fail-safe fallback) ke teks polos jika parsing Markdown gagal.
// Mengirim pesan ke Telegram. Mode simulate dan token palsu tidak menghubungi jaringan sehingga aman untuk uji.
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

  // Pengiriman nyata via Telegram Bot API jika token terpasang
  // Hanya mengirim sungguhan bila bukan simulasi dan token ada serta bukan token palsu.
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

      // Telegram menjawab ok: kembalikan ID pesan dan waktu respons.
      if (json.ok) {
        return {
          success: true,
          messageId: json.result?.message_id,
          latencyMs,
        };
      }

      // Fallback: Jika pemformatan Markdown ditolak Telegram (400 Bad Request), kirim ulang sebagai Plain Text
      // Format Markdown ditolak Telegram: kirim ulang sebagai teks biasa, kecuali galat bukan 400 atau parse mode memang tidak dipakai.
      console.warn("[Telegram Dispatch Warning] Markdown rejected by Telegram:", json.description);
      if (!options?.parseMode || response.status !== 400) {
        // Pengiriman ulang pun gagal: kembalikan galat dari Telegram.
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
        // Mode simulasi: ID pesan palsu acak supaya pemanggil tetap menerima hasil sukses tanpa jaringan.
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

  // Pemanggilan testbench diisolasi dari bot eksternal nyata
  const latencyMs = Math.max(12, Date.now() - startTime);

  return {
    success: true,
    messageId: Math.floor(Math.random() * 89999 + 10000),
    latencyMs,
  };
}

// Mengirimkan konfirmasi penerimaan interaksi tombol inline (callback query) ke Telegram.
// Menutup indikator muat pada tombol inline dengan pesan singkat; tanpa token mengembalikan gagal tanpa galat.
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
