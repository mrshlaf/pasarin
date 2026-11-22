// Rute API Webhook Telegram Bot Gateway (PSR-38).
// Menerima pembaruan masuk dari server Telegram, memvalidasi secret token webhook,
// menyinkronkan sesi aktif akun pasar pada chat privat, dan mengeksekusi perintah maupun tombol aksi.

import { NextRequest, NextResponse } from "next/server";
import {
  answerTelegramCallbackQuery, dispatchTelegramMessage, verifyTelegramWebhookSecret, type TelegramUpdate,
} from "@/lib/telegramBotGateway";
import {
  handleTelegramAction, handleTelegramCommand, telegramReply, telegramRoleName, type TelegramButton,
} from "@/lib/telegramWorkspace";
import { currentTelegramAccount, endTelegramSession, selectTelegramSession, telegramChatSessions } from "@/lib/telegramSessions";
import { getEnv } from "@/lib/env";
import { answerPublicQuestion } from "@/lib/publicChatbot";
import { allowRequest } from "@/lib/rateLimit";

// Membangun menu pemilihan akun privat dan tombol peluncur Mini App berbasis HTTPS.
function accountMenu(req: NextRequest, sessions: Awaited<ReturnType<typeof telegramChatSessions>>, title: string) {
  const url = new URL("/telegram/login", req.nextUrl.origin);
  const keyboard: TelegramButton[][] = sessions.accounts.map((session) => [{
    text: (session.key === sessions.active?.key ? "Aktif · " : "") + session.user.name + " · " + telegramRoleName[session.user.role],
    callback_data: "account:" + session.key,
  }]);
  // Telegram hanya menerima tombol web_app dengan URL HTTPS, jadi di localhost tombol login disembunyikan.
  if (url.protocol === "https:") keyboard.push([{ text: "Masuk dengan akun Pasarin", web_app: { url: url.href } }]);
  if (sessions.active) keyboard.push([{ text: "Keluar dari akun aktif", callback_data: "logout" }]);
  return telegramReply("accounts", title + (url.protocol === "https:" ? "" : "\nTombol login memerlukan deployment HTTPS."), keyboard);
}

// Mengikat tombol inline ke session key aktif dan memastikan muatan callback_data berada di bawah batas 64 byte Telegram.
function bindKeyboard(reply: ReturnType<typeof telegramReply>, key?: string) {
  return reply.replyMarkup && {
    inline_keyboard: reply.replyMarkup.inline_keyboard.map((row) => row.flatMap((button) => {
      // Tombol pemilihan akun berlaku lintas sesi, jadi tidak diberi prefiks session key.
      if (!("callback_data" in button) || button.callback_data === "accounts"
        || button.callback_data.startsWith("account:")) return [button];
      const callback_data = key + ":" + button.callback_data;
      return key && Buffer.byteLength(callback_data) <= 64 ? [{ ...button, callback_data }] : [];
    })).filter((row) => row.length),
  };
}

// Memeriksa kesiapan konfigurasi webhook bot Telegram tanpa mengirim pesan jaringan.
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "PASARIN Telegram Gateway",
    configured: Boolean(getEnv().TELEGRAM_WEBHOOK_SECRET && getEnv().TELEGRAM_BOT_TOKEN),
  });
}

// Menerima pembaruan webhook privat dari Telegram dan memprosesnya menggunakan akun aktif yang terverifikasi.
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
  const chatId = message?.chat?.id;
  // Hanya chat privat yang diproses, dan pengirim harus pemilik chat agar sesi akun tidak bocor ke grup.
  if (message?.chat?.type !== "private" || typeof chatId !== "number" || !Number.isSafeInteger(chatId) || chatId < 1 || sender?.id !== chatId) {
    return NextResponse.json({ ok: true, processed: false });
  }
  const text = typeof message.text === "string" ? message.text.trim() : "";
  const data = typeof callback?.data === "string" && Buffer.byteLength(callback.data) <= 64 ? callback.data : "";
  if (callback ? !data || typeof callback.id !== "string" : !text) return NextResponse.json({ ok: true, processed: false });
  // Buang akhiran @namabot agar /menu@PasarinBot dikenali sama dengan /menu.
  const command = callback ? "" : text.split(/\s+/, 1)[0].toLowerCase().split("@")[0];

  try {
    const sessions = await telegramChatSessions(chatId);
    let active = sessions.active;
    let reply;
    if (data.startsWith("account:")) {
      const selected = await selectTelegramSession(chatId, data.slice("account:".length));
      active = selected ?? active;
      reply = selected ? await handleTelegramCommand("/menu", chatId, selected.user)
        : accountMenu(req, sessions, "Sesi akun ini sudah habis. Masuk kembali.");
    } else if ((active && data === active.key + ":logout") || command === "/keluar" || command === "/logout") {
      if (active) await endTelegramSession(chatId, active.key);
      active = undefined;
      reply = accountMenu(req, await telegramChatSessions(chatId), "Anda keluar dari akun aktif.");
    } else if (!active && !data && !command.startsWith("/")) {
      // Belum masuk: pertanyaan biasa dijawab dari etalase publik, disertai tombol masuk.
      const answer = allowRequest("telegram-public:" + chatId, 12, 5 * 60 * 1000)
        ? (await answerPublicQuestion(text.slice(0, 500))).summary
        : "Terlalu banyak pertanyaan dalam waktu singkat. Coba lagi beberapa menit lagi.";
      reply = accountMenu(req, sessions, answer.slice(0, 3500) + "\n\nMasuk dengan akun Pasarin untuk melihat stok, pesanan, dan saldo Anda.");
    } else if (data === "accounts" || ["/akun", "/login", "/masuk"].includes(command) || !active) {
      reply = accountMenu(req, sessions, active
        ? active.user.name + " · " + telegramRoleName[active.user.role] + "\nPilih akun atau masuk dengan akun lain."
        : "Masuk dengan akun Pasarin untuk membuka ruang kerja. Gunakan formulir di bawah.");
    // Tombol dari sesi lama ditolak agar aksi tidak dijalankan atas nama akun yang sudah berganti.
    } else if (data && !data.startsWith(active.key + ":")) {
      reply = telegramReply("stale_button", "Tombol ini milik sesi lain. Buka /menu dari akun aktif.");
    } else {
      const user = await currentTelegramAccount(active.user);
      // Peran atau kios yang berubah sejak login memaksa keluar, supaya hak akses lama tidak terbawa.
      if (!user || user.role !== active.user.role || user.vendorId !== active.user.vendorId) {
        await endTelegramSession(chatId, active.key);
        active = undefined;
        reply = accountMenu(req, await telegramChatSessions(chatId), "Akses akun berubah. Masuk kembali.");
      } else if (data) {
        // Format callback: <sessionKey>:<aksi>:<id>[:argumen...].
        const [, action, id, ...args] = data.split(":");
        reply = action === "menu" && id
          ? await handleTelegramCommand(["/" + id, ...args].join(" "), chatId, user)
          : await handleTelegramAction(action, id, user, args);
      } else {
        reply = await handleTelegramCommand(text, chatId, user, update.update_id);
      }
    }
    const [sent] = await Promise.all([
      dispatchTelegramMessage(chatId, reply.responseText, { replyMarkup: bindKeyboard(reply, active?.key) }),
      callback ? answerTelegramCallbackQuery(callback.id, reply.actionTaken === "stale_button" ? "Buka /menu dari akun aktif." : "") : undefined,
    ]);
    return NextResponse.json({ ok: true, processed: true, actionTaken: reply.actionTaken, dispatchSuccess: sent.success });
  } catch {
    return NextResponse.json({ ok: false, error: "Layanan Pasarin sementara tidak tersedia." }, { status: 503 });
  }
}
