/**
 * Endpoint Webhook Resmi Telegram Bot API (@pasarin_bot) (PSR-24).
 * Menangani permintaan HTTP POST dari peladen Telegram dan HTTP GET untuk pemantauan status.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyTelegramWebhookSecret,
  handleTelegramCommand,
  dispatchTelegramMessage,
  TelegramUpdate,
} from "@/lib/telegramBotGateway";

/**
 * GET /api/telegram/webhook
 * Memeriksa status kesehatan webhook dan metadata bot Telegram.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "PASARIN Telegram Bot API Gateway",
    botUsername: "@pasarin_bot",
    webhookStatus: "active",
    secretProtection: "enabled",
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/telegram/webhook
 * Menerima pembaruan percakapan (update payload) dari Telegram Bot API.
 */
export async function POST(req: NextRequest) {
  // 1. Validasi Token Rahasia Tajuk Webhook (X-Telegram-Bot-Api-Secret-Token)
  const secretHeader =
    req.headers.get("x-telegram-bot-api-secret-token") ||
    req.headers.get("X-Telegram-Bot-Api-Secret-Token");

  if (!verifyTelegramWebhookSecret(secretHeader)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Akses Ditolak: Token rahasia webhook tidak valid atau tidak disertakan.",
      },
      { status: 401 }
    );
  }

  // 2. Parse Body Payload Pembaruan Telegram
  try {
    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Format payload tidak valid." },
        { status: 400 }
      );
    }

    const update = body as TelegramUpdate;

    // Tangani pembaruan pesan teks dari pengguna
    if (update.message && update.message.text && update.message.chat) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const username = update.message.from?.username;

      // Eksekusi penangan perintah bot
      const commandResult = await handleTelegramCommand(text, chatId, username);

      // Kirimkan balasan ke pengguna
      await dispatchTelegramMessage(chatId, commandResult.responseText, {
        replyMarkup: commandResult.replyMarkup,
        parseMode: "Markdown",
      });

      return NextResponse.json({
        ok: true,
        processed: true,
        actionTaken: commandResult.actionTaken,
      });
    }

    // Tangani callback query dari inline button (jika ada)
    if (update.callback_query && update.callback_query.message) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;

      return NextResponse.json({
        ok: true,
        processed: true,
        actionTaken: "callback_query_acknowledged",
        data,
      });
    }

    return NextResponse.json({ ok: true, processed: false, reason: "No actionable message found" });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Terjadi kesalahan pemrosesan webhook.",
      },
      { status: 500 }
    );
  }
}
