// @ts-nocheck
/**
 * Eksekutor Polling Real-Time Bot Telegram PASARIN.
 * Menghubungkan bot Telegram nyata (@agent_pasarin_bot) secara langsung
 * ke engine PASARIN tanpa memerlukan tunnel ngrok atau webhook publik eksternal.
 *
 * Mendukung interaksi percakapan dan tombol aksi peran pedagang, pembeli, dan kurir:
 * - /start    : Pesan sambutan dan panduan peran pasar.
 * - /status   : Pemantauan kondisi dan pesanan aktif pasar.
 * - /dlh      : Laporan kepatuhan DLH DKI Jakarta & simulasi 24 jam.
 * - /cuaca    : Telemetri mikro los pasar Kramat Jati.
 * - /evaluasi : Pemicu evaluasi berkala mutu stok pedagang.
 * - /surplus  : Katalog penawaran penyelamatan pangan aktif.
 * - /pasok    : Pencatatan pasokan baru oleh pedagang kios.
 */

import fs from "node:fs";
import path from "node:path";
import {
  dispatchTelegramMessage,
  answerTelegramCallbackQuery,
  type TelegramUpdate,
} from "../src/lib/telegramBotGateway";
import { handleTelegramCommand, handleTelegramAction } from "../src/lib/telegramWorkspace";
import { telegramChatSessions, startTelegramSession, currentTelegramAccount } from "../src/lib/telegramSessions";
import { localTestProfile } from "../src/lib/localTestAuth";

// Muat .env.local
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    }
  }
} catch {}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("GALAT: TELEGRAM_BOT_TOKEN tidak ditemukan di .env.local!");
  process.exit(1);
}

const API_BASE = `https://api.telegram.org/bot${token}`;

let offset = 0;
let running = true;

async function apiCall(method: string, body?: any) {
  const res = await fetch(`${API_BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function startPolling() {
  console.log("\nPASARIN Real-Time Telegram Bot Polling Gateway");
  console.log("Menghubungkan ke Telegram Bot API...");

  // 1. Verifikasi Identitas Bot
  const me = await apiCall("getMe");
  if (!me.ok) {
    console.error("Gagal menghubungkan ke bot:", me.description);
    process.exit(1);
  }
  console.log(`[PASS] Terhubung sebagai: @${me.result.username} (${me.result.first_name})`);
  console.log(`[LINK] Buka bot di Telegram: https://t.me/${me.result.username}`);

  // 2. Bersihkan Webhook jika ada agar getUpdates diizinkan
  await apiCall("deleteWebhook", { drop_pending_updates: false });
  console.log("[INFO] Mode Long-Polling Aktif. Menunggu pesan masuk dari Telegram...\n");

  const defaultAdminActor: any = {
    id: "local:admin1",
    role: "admin",
    name: "Pengelola Pasar (Telegram)",
  };

  while (running) {
    try {
      const updatesRes = await apiCall("getUpdates", {
        offset,
        timeout: 15,
        allowed_updates: ["message", "callback_query"],
      });

      if (updatesRes.ok && Array.isArray(updatesRes.result)) {
        for (const update of updatesRes.result as TelegramUpdate[]) {
          offset = update.update_id + 1;

          // Tangani Pesan Teks
          if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text.trim();
            const senderName = update.message.from?.first_name || "Pengguna";
            console.log(`[PESAN MASUK] Dari: ${senderName} (${chatId}): "${text}"`);

            const sessions = await telegramChatSessions(chatId);
            let activeUser = sessions.active ? await currentTelegramAccount(sessions.active.user) : undefined;

            // Fasilitas login lokal via teks untuk kemudahan polling developer
            if (text.startsWith("/masuk ") || text.startsWith("/login ")) {
              const [, identifier] = text.split(/\s+/);
              const profile = localTestProfile(identifier?.toLowerCase() || "");
              if (profile) {
                await startTelegramSession(chatId, profile);
                console.log(`[LOGIN LOKAL] Berhasil login sebagai: ${profile.name} (${profile.role})`);
                await dispatchTelegramMessage(chatId, `Berhasil masuk sebagai ${profile.name} (${profile.role}). Silakan ketik /menu untuk membuka ruang kerja.`);
                continue;
              }
            }

            const userToUse = activeUser || defaultAdminActor;
            const reply = await handleTelegramCommand(text, chatId, userToUse, update.update_id);
            console.log(`[BALASAN BOT] Aksi: ${reply.actionTaken}`);

            const sent = await dispatchTelegramMessage(chatId, reply.responseText, {
              replyMarkup: reply.replyMarkup,
            });

            if (sent.success) {
              console.log(`[TERKIRIM] Berhasil dikirim ke Telegram (${sent.latencyMs}ms)\n`);
            } else {
              console.warn(`[GAGAL] Tidak dapat mengirim balasan: ${sent.error}\n`);
            }
          }

          // Tangani Tombol Interaktif (Inline Keyboard Callback)
          if (update.callback_query && update.callback_query.data) {
            const cb = update.callback_query;
            const data = cb.data;
            const chatId = cb.message?.chat.id || 0;
            console.log(`[CALLBACK KLIK] Dari: ${cb.from.first_name}: "${data}"`);

            const sessions = await telegramChatSessions(chatId);
            const activeUser = sessions.active ? await currentTelegramAccount(sessions.active.user) : defaultAdminActor;

            let parts = (data || "").split(":");
            if (sessions.active && parts[0] === sessions.active.key) {
              parts = parts.slice(1);
            }
            const [action, id, ...args] = parts;

            let reply;
            if (action === "menu" && id) {
              reply = await handleTelegramCommand(["/" + id, ...args].join(" "), chatId, activeUser);
            } else {
              reply = await handleTelegramAction(action, id, activeUser, args);
            }

            await answerTelegramCallbackQuery(cb.id, reply.actionTaken === "stale_button" ? "Sesi usang" : "");
            if (reply.responseText) {
              await dispatchTelegramMessage(chatId, reply.responseText, {
                replyMarkup: reply.replyMarkup,
              });
            }
            console.log(`[CALLBACK SELESAI] Aksi: ${reply.actionTaken}\n`);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("[ERROR POLLING]:", err.message);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

process.on("SIGINT", () => {
  console.log("\nMenghentikan polling bot...");
  running = false;
  process.exit(0);
});

startPolling();
