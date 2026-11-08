/**
 * ============================================================================
 * PASARIN TELEGRAM BOT REAL-TIME POLLING RUNNER
 * File: scripts/run_telegram_polling.ts
 *
 * Menghubungkan bot Telegram nyata (@agent_pasarin_bot) secara real-time
 * ke engine PASARIN tanpa memerlukan ngrok / webhook eksternal.
 *
 * Fitur yang didukung lewat chat Telegram:
 *   /start    - Pesan sambutan & panduan peran
 *   /status   - Memantau kondisi & pesanan aktif pasar
 *   /tanya    - Menanyakan kondisi pasar ke AI/analisis operasional
 *   /evaluasi - Memicu evaluasi sapu bersih stok
 *   /surplus  - Menampilkan katalog penawaran aktif
 *   /pasok    - Pedagang mencatat pasokan baru (contoh: /pasok kangkung 30)
 *
 * Cara Menjalankan:
 *   npm run bot:poll
 * ============================================================================
 */

import fs from "node:fs";
import path from "node:path";
import {
  handleTelegramCommand,
  dispatchTelegramMessage,
  answerTelegramCallbackQuery,
  type TelegramUpdate,
} from "../src/lib/telegramBotGateway";
import {
  claimOfferServer,
  confirmDeliveryServer,
  payOfferServer,
  publishMarketOffers,
} from "../src/lib/serverSimulationState";

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
  console.log("================================================================================");
  console.log("             PASARIN REAL-TIME TELEGRAM BOT POLLING GATEWAY                     ");
  console.log("================================================================================");
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

  const defaultAdminActor = {
    id: "local:admin1",
    role: "admin" as const,
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
            const text = update.message.text;
            const senderName = update.message.from?.first_name || "Pengguna";
            console.log(`[PESAN MASUK] Dari: ${senderName} (${chatId}): "${text}"`);

            const reply = await handleTelegramCommand(text, chatId, defaultAdminActor, update.update_id);
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

            const [action, offerId] = data.split(":");
            let feedback = "Aksi berhasil diproses.";

            if (action === "pay" && offerId) {
              const res = await payOfferServer(offerId, defaultAdminActor.id);
              feedback = res.message;
            } else if (action === "claim" && offerId) {
              const res = await claimOfferServer(offerId, defaultAdminActor);
              feedback = res.message;
            } else if (action === "deliver" && offerId) {
              const res = await confirmDeliveryServer(offerId);
              feedback = res.message;
            }

            await answerTelegramCallbackQuery(cb.id, feedback);
            if (chatId) {
              await dispatchTelegramMessage(chatId, `Notifikasi: ${feedback}`);
            }
            console.log(`[CALLBACK SELESAI] ${feedback}\n`);
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
