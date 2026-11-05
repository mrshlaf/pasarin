/**
 * Skrip Pengujian Unit Mandiri: PSR-25 (Vendor 1-Tap Inline Keyboard Flow).
 * Memverifikasi:
 * 1. Format pesan notifikasi surplus Markdown dengan rincian kilogram, diskon, dan estimasi rupiah modal.
 * 2. Struktur tombol inline keyboard Telegram [✅ Setuju Jual] dan [❌ Lewati].
 * 3. Penanganan callback tombol setuju jual seketika mengubah status penawaran menjadi 'active'.
 * 4. Pembaruan pesan Telegram secara langsung di tempat (editMessageText) tanpa membanjiri ruang obrolan.
 */

import {
  buildVendorSurplusOfferKeyboard,
  formatVendorSurplusOfferMessage,
  handleVendorCallbackQuery,
  editTelegramMessageText,
  answerTelegramCallbackQuery,
  getInlineOfferStatus,
  VendorOfferDetails,
} from "../src/lib/vendorInlineKeyboardFlow";

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

async function runVendorInlineFlowTests() {
  console.log("================================================================================");
  console.log("  PENGUJIAN UNIT MANDIRI: PSR-25 (VENDOR 1-TAP INLINE KEYBOARD FLOW)");
  console.log("  Fokus: Papan Ketik Interaktif Telegram, Callback Query, & Edit Pesan di Tempat");
  console.log("================================================================================\n");

  const sampleOffer: VendorOfferDetails = {
    offerId: "ofr_test_flow_01",
    stallNumber: "A-12",
    vendorName: "H. Rohmat Sayur Daun",
    commodityName: "Bayam Hijau",
    quantityKg: 35,
    originalPricePerKg: 7000,
    salvagePricePerKg: 2500,
    discountPct: 64,
    totalAmountIdr: 87500,
    targetTier: "tier_1",
  };

  // Test 1: Verifikasi Format Pesan Notifikasi Penawaran Surplus
  console.log("[Test 1] Format Pesan Notifikasi Penawaran Surplus Telegram (Markdown)");
  const formattedMsg = formatVendorSurplusOfferMessage(sampleOffer);
  assert(
    formattedMsg.includes("Kios A-12") && formattedMsg.includes("Bayam Hijau"),
    "Pesan memuat identitas lapak dan nama komoditas",
    "Identitas Valid"
  );
  assert(
    formattedMsg.includes("35 kg") && formattedMsg.includes("64%") && formattedMsg.includes("Rp 87.500"),
    "Pesan menyajikan kuantitas kilogram, diskon, dan estimasi rupiah modal",
    "Metrik Finansial Valid"
  );

  // Test 2: Verifikasi Struktur Papan Ketik Interaktif Inline Keyboard
  console.log("\n[Test 2] Struktur Papan Ketik Interaktif Inline Keyboard");
  const keyboard = buildVendorSurplusOfferKeyboard(sampleOffer.offerId);
  assert(
    keyboard.inline_keyboard.length === 1 && keyboard.inline_keyboard[0].length === 2,
    "Keyboard memuat 1 baris dengan tepat 2 tombol aksi cepat",
    "2 Tombol Aksi"
  );
  const btnApprove = keyboard.inline_keyboard[0][0];
  const btnReject = keyboard.inline_keyboard[0][1];
  assert(
    btnApprove.text.includes("Setuju Jual") && btnApprove.callback_data === `approve_offer:${sampleOffer.offerId}`,
    "Tombol persetujuan valid dengan payload callback approve_offer",
    btnApprove.callback_data
  );
  assert(
    btnReject.text.includes("Lewati") && btnReject.callback_data === `reject_offer:${sampleOffer.offerId}`,
    "Tombol penolakan valid dengan payload callback reject_offer",
    btnReject.callback_data
  );

  // Test 3: Eksekusi Callback Persetujuan 1-Ketuk (Approve Offer)
  console.log("\n[Test 3] Eksekusi Callback Persetujuan [✅ Setuju Jual]");
  const approveResult = await handleVendorCallbackQuery(
    `approve_offer:${sampleOffer.offerId}`,
    1001,
    "9001201"
  );
  assert(
    approveResult.success === true && approveResult.newStatus === "active",
    "Penekanan tombol Setuju Jual seketika mengubah status penawaran menjadi 'active'",
    `Status: ${approveResult.newStatus}`
  );
  assert(
    approveResult.broadcastToBuyers === true,
    "Persetujuan pedagang otomatis mengaktifkan penyiaran lot ke katalog pembeli",
    "Siaran Aktif"
  );
  assert(
    getInlineOfferStatus(sampleOffer.offerId) === "active",
    "Status aktif tersimpan secara terverifikasi pada registry basis data",
    "Tersimpan di Basis Data"
  );

  // Test 4: Eksekusi Callback Penolakan (Reject Offer)
  console.log("\n[Test 4] Eksekusi Callback Penolakan [❌ Lewati]");
  const rejectOfferId = "ofr_test_flow_02";
  const rejectResult = await handleVendorCallbackQuery(
    `reject_offer:${rejectOfferId}`,
    1002,
    "9001201"
  );
  assert(
    rejectResult.success === true && rejectResult.newStatus === "rejected",
    "Penekanan tombol Lewati mengubah status penawaran menjadi 'rejected'",
    `Status: ${rejectResult.newStatus}`
  );
  assert(
    rejectResult.broadcastToBuyers === false,
    "Penawaran yang dilewati tidak disiarkan ke pasar surplus",
    "Siaran Tidak Diizinkan"
  );
  assert(
    getInlineOfferStatus(rejectOfferId) === "rejected",
    "Status penolakan tersimpan di registry",
    "Tersimpan di Basis Data"
  );

  // Test 5: Verifikasi Pembaruan Pesan di Tempat (editTelegramMessageText) & Answer Callback
  console.log("\n[Test 5] Pembaruan Pesan di Tempat (editMessageText) & Notifikasi Toast");
  const editResult = await editTelegramMessageText("9001201", 1001, "Teks konfirmasi pembaruan");
  assert(
    editResult.success === true && editResult.latencyMs < 3000,
    "Pembaruan pesan di tempat (in-place update) tuntas dengan latensi rendah",
    `Latensi: ${editResult.latencyMs} ms`
  );

  const answerResult = await answerTelegramCallbackQuery("cb_query_test_123", "Penawaran aktif!");
  assert(
    answerResult.success === true,
    "Respon notifikasi toast (answerCallbackQuery) berhasil dikirimkan",
    "Callback Terjawab"
  );

  console.log("\n================================================================================");
  console.log(`HASIL AKHIR PENGUJIAN PSR-25: ${passedCount} LULUS, ${failedCount} GAGAL`);
  console.log("================================================================================\n");

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

runVendorInlineFlowTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
