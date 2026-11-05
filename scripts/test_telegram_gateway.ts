/**
 * Skrip Pengujian Unit Mandiri: PSR-24 (Live Telegram Bot API Gateway & Webhook).
 * Memverifikasi:
 * 1. Validasi tajuk token rahasia webhook (X-Telegram-Bot-Api-Secret-Token).
 * 2. Penangan perintah Telegram (/start, /kios, /status, /surplus, /help).
 * 3. Pengaitan identitas chat_id Telegram ke data profil 30 kios pedagang di basis data.
 * 4. Pengiriman pesan peringatan surplus kilat dengan batas latensi di bawah 3 detik (< 3.000 ms).
 */

import {
  verifyTelegramWebhookSecret,
  handleTelegramCommand,
  bindChatToKiosk,
  getBindingByChatId,
  dispatchTelegramMessage,
  dispatchSurplusAlertToMitra,
} from "../src/lib/telegramBotGateway";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? ` -> ${detail}` : ""}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    failedCount++;
  }
}

async function runTelegramGatewayTests() {
  console.log("================================================================================");
  console.log("  PENGUJIAN UNIT MANDIRI: PSR-24 (TELEGRAM BOT API GATEWAY & WEBHOOK)");
  console.log("  Fokus: Validasi Webhook Secret, Command Dispatcher, & Latensi < 3 Detik");
  console.log("================================================================================\n");

  // Test 1: Verifikasi Validasi Token Rahasia Webhook
  console.log("[Test 1] Validasi Keamanan Token Rahasia Webhook (Secret Token)");
  const validSecret = "pasarin-telegram-webhook-secret-2026";
  assert(
    verifyTelegramWebhookSecret(validSecret) === true,
    "Token rahasia yang sah diterima oleh gateway webhook",
    validSecret
  );
  assert(
    verifyTelegramWebhookSecret("token_palsu_tidak_sah") === false,
    "Token rahasia palsu ditolak secara aman oleh gateway",
    "Akses Ditolak 401"
  );
  assert(
    verifyTelegramWebhookSecret(null) === false,
    "Permintaan webhook tanpa token rahasia ditolak",
    "Null Header Ditolak"
  );

  // Test 2: Pengaitan Identitas Chat Telegram ke Kios Pedagang
  console.log("\n[Test 2] Pengaitan Chat ID ke Profil Kios Pedagang (bindChatToKiosk)");
  const testChatId = "987654321";
  const bindSuccess = bindChatToKiosk(testChatId, "A-12");
  assert(
    bindSuccess.success === true && bindSuccess.binding?.stallNumber === "A-12",
    "Chat ID berhasil ditautkan ke Kios A-12 (H. Rohmat Sayur Daun)",
    bindSuccess.binding?.vendorName
  );

  const bindingCheck = getBindingByChatId(testChatId);
  assert(
    bindingCheck?.vendorId === "vendor_kramat_01",
    "Data relasi tersimpan dan terbaca kembali dari registry asosiasi",
    `vendorId: ${bindingCheck?.vendorId}`
  );

  const bindFail = bindChatToKiosk("999999", "Z-99_INVALID");
  assert(bindFail.success === false, "Kios yang tidak ada di direktori ditolak penautannya", bindFail.message);

  // Test 3: Penangan Perintah Teks Bot Telegram (handleTelegramCommand)
  console.log("\n[Test 3] Penangan Perintah Dasar Telegram Bot (handleTelegramCommand)");
  const startCmd = await handleTelegramCommand("/start", testChatId);
  assert(
    startCmd.actionTaken === "welcome_existing_user" && startCmd.responseText.includes("Halo"),
    "Perintah /start mengenali pedagang yang sudah tertaut dan menyapa ramah",
    startCmd.actionTaken
  );

  const statusCmd = await handleTelegramCommand("/status", testChatId);
  assert(
    statusCmd.actionTaken === "status_reported" && statusCmd.responseText.includes("Kios A-12"),
    "Perintah /status menampilkan laporan operasional kios terkait",
    "Status Terlaporkan"
  );

  const surplusCmd = await handleTelegramCommand("/surplus", testChatId);
  assert(
    surplusCmd.actionTaken === "surplus_catalog_viewed" && surplusCmd.responseText.includes("Katalog Surplus"),
    "Perintah /surplus menampilkan ringkasan komoditas terdiskon aktif",
    "Katalog Ditampilkan"
  );

  const helpCmd = await handleTelegramCommand("/help", testChatId);
  assert(
    helpCmd.actionTaken === "help_displayed" && helpCmd.responseText.includes("/start"),
    "Perintah /help menampilkan panduan daftar perintah bot",
    "Panduan Aktif"
  );

  // Test 4: Pengiriman Pesan Peringatan Surplus Kilat (< 3.000 ms)
  console.log("\n[Test 4] Pengiriman Sinyal Peringatan Surplus ke Mitra (< 3.000 ms)");
  const alertSample = {
    id: "ofr_test_tg_01",
    commodityName: "Kangkung Darat",
    quantityKg: 45,
    discountPct: 58,
    salvagePricePerKg: 2500,
    totalAmountIdr: 112500,
  };

  const alertResult = await dispatchSurplusAlertToMitra(alertSample, testChatId);
  assert(
    alertResult.success === true,
    "Notifikasi peringatan surplus terdiskon berhasil disiarkan",
    "Pengiriman Berhasil"
  );
  assert(
    alertResult.latencyMs < 3000,
    "Kriteria Penerimaan Terpenuhi: Pesan terkirim dalam waktu di bawah 3 detik (< 3.000 ms)",
    `Latensi: ${alertResult.latencyMs} ms`
  );

  console.log("\n================================================================================");
  console.log(`HASIL AKHIR PENGUJIAN PSR-24: ${passedCount} LULUS, ${failedCount} GAGAL`);
  console.log("================================================================================\n");

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

runTelegramGatewayTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
