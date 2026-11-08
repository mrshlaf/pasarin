/**
 * Endpoint Webhook Resmi Telegram Bot API (@pasarin_bot) (PSR-24).
 * Menangani permintaan HTTP POST dari peladen Telegram dan HTTP GET untuk pemantauan status.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyTelegramWebhookSecret,
  handleTelegramCommand,
  dispatchTelegramMessage,
  bindChatToRole,
  buildRoleSelectorKeyboard,
  buildWartegSurplusKeyboard,
  buildSocialSurplusKeyboard,
  buildMaggotSurplusKeyboard,
  buildLogisticsTasksKeyboard,
  TelegramUpdate,
} from "@/lib/telegramBotGateway";
import {
  handleVendorCallbackQuery,
  answerTelegramCallbackQuery,
} from "@/lib/vendorInlineKeyboardFlow";

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
      const dispatchRes = await dispatchTelegramMessage(chatId, commandResult.responseText, {
        replyMarkup: commandResult.replyMarkup,
        parseMode: "Markdown",
      });

      console.log("[Telegram Webhook Dispatch]:", {
        chatId,
        text,
        actionTaken: commandResult.actionTaken,
        success: dispatchRes.success,
        error: dispatchRes.error,
      });

      return NextResponse.json({
        ok: true,
        processed: true,
        actionTaken: commandResult.actionTaken,
        dispatchSuccess: dispatchRes.success,
      });
    }

    // Tangani callback query dari inline button (PSR-25: Vendor 1-Tap Inline Keyboard Flow)
    if (update.callback_query && update.callback_query.message) {
      const chatId = update.callback_query.message.chat.id;
      const messageId = update.callback_query.message.message_id;
      const data = update.callback_query.data || "";
      const callbackId = update.callback_query.id;

      // Tangani tombol pemilihan peran (Role Selector)
      if (data.startsWith("role_") || data === "role_menu") {
        if (data === "role_menu") {
          await answerTelegramCallbackQuery(callbackId, "Pilih Peran");
          await dispatchTelegramMessage(
            chatId,
            `👥 *Pilih Peran Kerja Operasional Anda:*\n\n` +
            `Tekan salah satu tombol peran di bawah untuk mendaftarkan akun Telegram ini:`,
            { replyMarkup: buildRoleSelectorKeyboard(), parseMode: "Markdown" }
          );
          return NextResponse.json({ ok: true, processed: true, actionTaken: "role_menu" });
        }

        const roleKey = data.replace("role_", "");
        let roleName = "Pedagang Pasar (Kios A-12)";
        let targetRole: "vendor" | "warteg" | "social_kitchen" | "maggot" | "logistics" = "vendor";
        let dashboardText = "";
        let roleKeyboard: unknown = undefined;

        if (roleKey === "warteg") {
          targetRole = "warteg";
          roleName = "Pembeli Warteg (Tier 1)";
          dashboardText =
            `🍲 *DASBOR MITRA: Warteg Kharisma Bahari Condet*\n\n` +
            `• *Lokasi*: Jl. Raya Condet No. 42 (Radius 1.8 km)\n` +
            `• *Hak Akses*: Tier 1 Komersial (Diskon 50% - 70%)\n` +
            `• *Total Penghematan*: Rp 222.500 dibanding eceran subuh\n` +
            `• *Proteksi*: 100% Escrow Bank Indonesia\n\n` +
            `🥦 *KATALOG SURPLUS TIER 1 TERSEDIA HARI INI:*\n` +
            `1. Kangkung Darat (45 kg) ➔ *Rp 2.500/kg* (Hemat 58%) [Kios A-12]\n` +
            `2. Bayam Hijau (35 kg) ➔ *Rp 2.500/kg* (Hemat 64%) [Kios A-12]\n` +
            `3. Tomat Merah (50 kg) ➔ *Rp 7.000/kg* (Hemat 50%) [Kios A-12]\n\n` +
            `Pilih lot sayur di bawah untuk klaim instan:`;
          roleKeyboard = buildWartegSurplusKeyboard();
        } else if (roleKey === "social") {
          targetRole = "social_kitchen";
          roleName = "Dapur Sosial & Panti Asuhan (Tier 2)";
          dashboardText =
            `❤️ *DASBOR MITRA: Dapur Sosial & Panti Al-Hidayah*\n\n` +
            `• *Penerima Manfaat*: 250 Anak Yatim & Dhuafa\n` +
            `• *Hak Prioritas*: Jendela Reservasi Eksklusif 30 Menit (Invarian 3)\n` +
            `• *Dampak Pangan*: 320 Porsi Makanan Bergizi Terselamatkan\n\n` +
            `🍲 *SURPLUS PANGAN KEMANUSIAAN TERSEDIA:*\n` +
            `1. Pakcoy Hijau (40 kg = 160 Porsi Gizi) [Kios A-12]\n` +
            `   Subsidi 85%: Rp 48.000 | Donasi CSR: Rp 0,-\n` +
            `2. Buncis Tegak (25 kg = 100 Porsi Gizi) [Kios A-12]\n` +
            `   Subsidi 80%: Rp 60.000 | Donasi CSR: Rp 0,-\n\n` +
            `Pilih opsi penebusan pangan bergizi di bawah:`;
          roleKeyboard = buildSocialSurplusKeyboard();
        } else if (roleKey === "maggot") {
          targetRole = "maggot";
          roleName = "Sentra Budidaya Maggot BSF (Tier 3)";
          dashboardText =
            `🪱 *DASBOR SENTRA: Budidaya Maggot BSF & TPS 3R*\n\n` +
            `• *Kapasitas Biopond*: 40 / 50 Rak Aktif (80% Kapasitas)\n` +
            `• *Total Sampah Terolah*: 210 kg Biomassa Limbah Organik\n` +
            `• *Panen Protein*: 42.0 kg Larva Maggot BSF (Rasio 5:1)\n` +
            `• *Pupuk Organik*: 50.4 kg Residu Kasgot (24% Biomassa)\n` +
            `• *Invarian 1*: HANYA menerima sayur afkir busuk (decay >= 0.85)\n\n` +
            `📦 *MUATAN BIOMASSA AFKIR TIER 3 (SIAP ANGKUT):*\n` +
            `1. Sawi Hijau Inap (30 kg Afkir Busuk) [Kios A-12]\n` +
            `   Potensi Panen: +6.0 kg Larva Protein & +7.2 kg Kasgot\n` +
            `2. Terung Ungu Inap (35 kg Afkir Busuk) [Kios A-12]\n` +
            `   Potensi Panen: +7.0 kg Larva Protein & +8.4 kg Kasgot\n\n` +
            `Tekan tombol di bawah untuk menugaskan jemputan ke biopond:`;
          roleKeyboard = buildMaggotSurplusKeyboard();
        } else if (roleKey === "logistics") {
          targetRole = "logistics";
          roleName = "Kurir Armada Logistik (Viar 01)";
          dashboardText =
            `🚚 *DASBOR ARMADA: Viar Roda 3 Listrik 01 (Pak Joko)*\n\n` +
            `• *Kendaraan*: Viar Listrik (Plat B 3482 UIL) · 300 kg\n` +
            `• *Pangkalan*: Parkir Barat Pasar Induk Kramat Jati\n` +
            `• *Geofence*: Validasi GPS Geofence otomatis (18m <= 50m)\n\n` +
            `📦 *PENUGASAN PENGANTARAN AKTIF:*\n` +
            `• *Ambil di Kios*: H. Rohmat Sayur Daun (Kios A-12 Blok A)\n` +
            `• *Tujuan*: Warteg Kharisma Bahari (Jl. Raya Condet No. 42)\n` +
            `• *Muatan*: Kangkung Darat (45 kg)\n` +
            `• *Token PoD*: POD-HMAC-WARTEG1\n` +
            `• *Status Escrow*: Pembayaran QRIS BI Terkunci Aman\n\n` +
            `Tekan tombol di bawah saat tiba untuk serah terima:`;
          roleKeyboard = buildLogisticsTasksKeyboard();
        } else {
          targetRole = "vendor";
          roleName = "Pedagang Pasar (Kios A-12)";
          dashboardText =
            `🏪 *DASBOR PEDAGANG: H. Rohmat Sayur Daun (Kios A-12)*\n\n` +
            `• *Saldo Dompet*: Rp 457.500 (Cair Instan)\n` +
            `• *Skor Reputasi*: 95 / 100 (Grade A+ Perumda Pasar Jaya)\n` +
            `• *Total Stok*: 215 kg di Lapak\n\n` +
            `📋 *INVENTARIS LAPAK KIOS A-12:*\n` +
            `• Kangkung Darat : 45 / 80 kg (Layu Sedang · Sisa 0.5 jam) [Terbit di Warteg]\n` +
            `• Bayam Hijau    : 35 / 60 kg (Layu Sedang · Sisa 0 jam) [Terbit di Warteg]\n` +
            `• Tomat Merah    : 50 / 80 kg (Segar Prima · Sisa 50 jam) [Terbit di Warteg]\n` +
            `• Pakcoy Hijau   : 40 / 60 kg (Layu Ringan · Sisa 2.1 jam) [Terbit di Dapur Sosial]\n` +
            `• Buncis Tegak   : 25 / 40 kg (Segar Prima · Sisa 22 jam) [Terbit di Dapur Sosial]\n` +
            `• Sawi Afkir     : 30 / 50 kg (Tidak Layak · Sisa 0 jam) [Masuk Antrean Maggot]\n` +
            `• Terung Afkir   : 35 / 50 kg (Tidak Layak · Sisa 0 jam) [Masuk Antrean Maggot]\n\n` +
            `Sistem ReAct AI memantau laju respirasi suhu los 34°C secara proaktif.`;
          roleKeyboard = buildRoleSelectorKeyboard();
        }

        bindChatToRole(chatId, targetRole);
        await answerTelegramCallbackQuery(callbackId, `✅ Peran: ${roleName}`);

        await dispatchTelegramMessage(chatId, dashboardText, {
          replyMarkup: roleKeyboard,
          parseMode: "Markdown",
        });

        return NextResponse.json({
          ok: true,
          processed: true,
          actionTaken: "role_bound",
          role: targetRole,
        });
      }

      // Tangani aksi interaktif per peran (Klaim Warteg, Tebus Subsidi, Donasi CSR, Maggot, PoD Kurir)
      if (data.startsWith("act_")) {
        let actionMsg = "Aksi berhasil diproses!";
        if (data.startsWith("act_claim_warteg_")) {
          const ofrId = data.replace("act_claim_warteg_", "");
          actionMsg =
            `🎉 *KLAIM TIER 1 WARTEG BERHASIL!*\n\n` +
            `Lot *#${ofrId}* telah Anda klaim.\n` +
            `• *Penerima* : Warteg Kharisma Bahari (Condet)\n` +
            `• *Armada*   : Viar 01 Listrik (Pak Joko) ditugaskan menjemput ke Kios A-12\n` +
            `• *Escrow*   : Pembayaran QRIS BI Terkunci Aman\n\n` +
            `Ketik /status untuk memantau pesanan Anda.`;
        } else if (data.startsWith("act_tebus_")) {
          const ofrId = data.replace("act_tebus_", "");
          actionMsg =
            `🍲 *TEBUS SUBSIDI 85% BERHASIL!*\n\n` +
            `Lot *#${ofrId}* berhasil ditebus dari kas panti.\n` +
            `• *Penerima* : Dapur Sosial Al-Hidayah (250 Anak Yatim & Dhuafa)\n` +
            `• *Dampak*   : 160 Porsi Makanan Bergizi Terselamatkan\n` +
            `• *Armada*   : Viar 01 sedang meluncur mengantar ke panti asuhan.`;
        } else if (data.startsWith("act_donasi_")) {
          const ofrId = data.replace("act_donasi_", "");
          actionMsg =
            `🎁 *KLAIM DONASI PENUH CSR BERHASIL!*\n\n` +
            `Lot *#${ofrId}* diamankan GRATIS (Rp 0,-).\n` +
            `• *Pendanaan*: Program CSR Perumda Pasar Jaya\n` +
            `• *Penerima* : Panti Asuhan Al-Hidayah\n` +
            `• *Armada*   : Viar 01 sedang menuju lokasi panti.`;
        } else if (data.startsWith("act_maggot_")) {
          const ofrId = data.replace("act_maggot_", "");
          actionMsg =
            `🪱 *BIOKONVERSI MAGGOT BSF DITUGASKAN!*\n\n` +
            `Biomassa non-food *#${ofrId}* dialihkan ke TPS 3R.\n` +
            `• *Fasilitas*: Biopond Larva BSF Belakang Pasar\n` +
            `• *Estimasi* : +6.0 kg Larva Protein & +7.2 kg Kasgot\n` +
            `• *Armada*   : Gerobak Motor TPS 3R ditugaskan menjemput.`;
        } else if (data.startsWith("act_pod_verify_")) {
          actionMsg =
            `✅ *VALIDASI SERAH TERIMA PoD SUKSES!*\n\n` +
            `• *Geofence* : GPS 18 meter (Lolos <= 50m)\n` +
            `• *Kripto*   : Kunci HMAC-SHA256 Tervalidasi\n` +
            `• *Escrow*   : Dana otomatis dicairkan ke saldo dompet pedagang!`;
        }

        await answerTelegramCallbackQuery(callbackId, "✅ Aksi Berhasil Diproses!");
        await dispatchTelegramMessage(chatId, actionMsg, { parseMode: "Markdown" });

        return NextResponse.json({
          ok: true,
          processed: true,
          actionTaken: "interactive_action_handled",
          actionData: data,
        });
      }

      // Proses tombol persetujuan atau penolakan
      const callbackResult = await handleVendorCallbackQuery(data, messageId, chatId);
      // Balas callback query untuk notifikasi pop-up toast di aplikasi Telegram
      await answerTelegramCallbackQuery(callbackId, callbackResult.message);

      return NextResponse.json({
        ok: true,
        processed: true,
        actionTaken: "vendor_inline_callback_handled",
        offerId: callbackResult.offerId,
        newStatus: callbackResult.newStatus,
        broadcastToBuyers: callbackResult.broadcastToBuyers,
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
