import { NextRequest, NextResponse } from "next/server";
import {
  answerTelegramCallbackQuery, resolveTelegramActor, dispatchTelegramMessage, handleTelegramCommand,
  verifyTelegramWebhookSecret, type TelegramUpdate,
} from "@/lib/telegramBotGateway";
import { claimOfferServer, confirmDeliveryServer, decideVendorOffer, payOfferServer, publishMarketOffers } from "@/lib/serverSimulationState";
import { getEnv } from "@/lib/env";

/** Reports configuration readiness without sending a Telegram message. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "PASARIN Telegram Gateway",
    configured: Boolean(getEnv().TELEGRAM_WEBHOOK_SECRET && getEnv().TELEGRAM_BOT_TOKEN),
  });
}

/** Verifies Telegram and dispatches only private, configured role actions. */
export async function POST(req: NextRequest) {
  if (!verifyTelegramWebhookSecret(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ ok: false, error: "Webhook tidak terotorisasi." }, { status: 401 });
  }

  const update = await req.json().catch(() => null) as TelegramUpdate | null;
  if (!update || !Number.isSafeInteger(update.update_id)) {
    return NextResponse.json({ ok: false, error: "Format update tidak valid." }, { status: 400 });
  }

  const callback = update.callback_query;
  const message = callback?.message ?? update.message;
  const sender = callback?.from ?? update.message?.from;
  if (message?.chat?.type !== "private" || typeof message.chat.id !== "number" || sender?.id !== message.chat.id) {
    return NextResponse.json({ ok: true, processed: false });
  }

  const chatId = message.chat.id;
  try {
    const actor = await resolveTelegramActor(chatId);
    if (!actor) {
      if (callback?.id) await answerTelegramCallbackQuery(callback.id, "Chat ini belum terdaftar.");
      else if (typeof message.text === "string" && message.text === "/start") {
        await dispatchTelegramMessage(chatId, "Hubungi pengelola Pasarin untuk mendaftarkan chat ini. Jangan kirim kata sandi.");
      }
      return NextResponse.json({ ok: true, processed: false });
    }
    if (!callback && typeof message.text === "string") {
      const reply = await handleTelegramCommand(message.text, chatId, actor, update.update_id);
      const sent = await dispatchTelegramMessage(chatId, reply.responseText, { replyMarkup: reply.replyMarkup });
      return NextResponse.json({ ok: true, processed: true, actionTaken: reply.actionTaken, dispatchSuccess: sent.success });
    }

    if (callback && typeof callback.data === "string" && typeof callback.id === "string") {
      const [action, offerId] = callback.data.split(":");
      const { role } = actor;
      let feedback = "Aksi tidak tersedia untuk akun ini.";
      if (offerId && action === "claim" && (role === "warteg" || role === "social_kitchen" || role === "maggot")) {
        const result = await claimOfferServer(offerId, { ...actor, role });
        feedback = result.message;
        if (result.success && role === "warteg") {
          await dispatchTelegramMessage(chatId, "Lot berhasil diklaim. Konfirmasi pembayaran simulasi untuk meneruskan ke kurir.", {
            replyMarkup: { inline_keyboard: [[{ text: "Konfirmasi pembayaran", callback_data: "pay:" + offerId }]] },
          });
        }
      } else if (offerId && action === "donate" && role === "social_kitchen") {
        feedback = (await claimOfferServer(offerId, { ...actor, role }, true)).message;
      } else if (offerId && action === "pay" && role === "warteg") {
        feedback = (await payOfferServer(offerId, actor.id)).message;
      } else if (offerId && action === "deliver" && role === "logistics") {
        feedback = (await confirmDeliveryServer(offerId)).message;
      } else if (offerId && action === "publish" && role === "vendor" && actor.vendorId) {
        feedback = (await publishMarketOffers(actor.vendorId, offerId)).message;
      } else if (offerId && (action === "approve_offer" || action === "reject_offer") && role === "vendor" && actor.vendorId) {
        feedback = (await decideVendorOffer(offerId, actor.vendorId, action === "approve_offer")).message;
      }
      await answerTelegramCallbackQuery(callback.id, feedback);
      return NextResponse.json({ ok: true, processed: true });
    }
    return NextResponse.json({ ok: true, processed: false });
  } catch {
    return NextResponse.json({ ok: false, error: "Penyimpanan simulasi tidak tersedia." }, { status: 503 });
  }
}
