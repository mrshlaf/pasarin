// Skrip Pengujian Unit Mandiri: PSR-37 (Bank Indonesia Dynamic QRIS Escrow Payment Gateway).
// Memverifikasi:
// 1. Pembangkitan string payload QRIS Dinamis EMVCo TLV dengan checksum CRC16-CCITT (0x1021).
// 2. Validasi struktur QRIS dan pendeteksian payload cacat/manipulatif.
// 3. Mesin Transisi Status Rekening Escrow (unpaid -> held_in_escrow -> released_to_vendor).
// 4. Pelepasan dana otomatis ke dompet pedagang saat konfirmasi serah terima terpenuhi.

import {
  generateBankIndonesiaQrisPayload,
  validateQrisPayloadStructure,
  transitionEscrowPaymentStatus,
  executeEscrowSettlement,
} from "../src/lib/qrisEscrowGateway";

// Variabel pelacak total asersi uji lulus dan gagal
let passedCount = 0;
// Jumlah asersi gagal; bila lebih dari nol, skrip keluar dengan kode 1.
let failedCount = 0;

// Fungsi helper untuk mengevaluasi kebenaran kondisi asersi uji QRIS Escrow.
function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? ` -> ${detail}` : ""}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    failedCount++;
  }
}

// Runner utama pengujian gerbang pembayaran QRIS Dinamis dan Rekening Escrow PSR-37.
async function runQrisEscrowTests() {
  console.log("\nPengujian Unit Mandiri: PSR-37 (Dynamic QRIS Escrow Payment Gateway)");
  console.log("Fokus: Format EMVCo TLV, Checksum CRC16, dan Pelepasan Dana Escrow\n");

  // Uji 1: Pembangkitan Payload QRIS Dinamis Berstandar Nasional
  console.log("[Test 1] Pembangkitan Payload QRIS Dinamis Bank Indonesia (EMVCo TLV)");
  // Membangkitkan payload QRIS dinamis untuk invoice Warteg sebesar Rp 112.500
  const qrisGen = generateBankIndonesiaQrisPayload(112500, "INV-WARTEG-01", {
    merchantId: "ID1026348913PASARIN",
    merchantName: "H. Rohmat Sayur Daun",
    merchantCity: "JAKARTA TIMUR",
  });

  // Memvalidasi tag pembuka standar EMVCo TLV (Tag 00 panjang 02 format 01, Tag 01 panjang 02 point of initiation 12 = Dynamic QRIS)
  assert(
    qrisGen.qrisPayload.startsWith("000201010212"),
    "Tag pembuka QRIS sesuai standar EMVCo (00=01, 01=12 Dinamis)",
    "000201010212"
  );

  // Memvalidasi Tag 54 (Transaction Amount) memuat nominal rupiah tepat Rp 112.500 dalam format TLV (5406112500)
  assert(
    qrisGen.amountIdr === 112500 && qrisGen.qrisPayload.includes("5406112500"),
    "Tag 54 memuat nominal transaksi tepat Rp 112.500",
    "5406112500"
  );

  // Memverifikasi bahwa checksum CRC16-CCITT dihitung tepat 4 karakter heksadesimal pada Tag 63
  assert(
    qrisGen.crc16.length === 4,
    "Checksum CRC16-CCITT 4 digit heksadesimal terhitung presisi",
    `CRC16: ${qrisGen.crc16}`
  );

  // Uji 2: Validasi Struktur Payload & Deteksi Cacat Checksum
  console.log("\n[Test 2] Validasi Struktur Payload & Integritas Checksum CRC16");
  // Menguji parsing dan verifikasi checksum pada payload sah yang baru dibuat
  const validationSuccess = validateQrisPayloadStructure(qrisGen.qrisPayload);

  // Memvalidasi bahwa payload yang sah lolos verifikasi dan nominal rupiah terbaca tepat Rp 112.500
  assert(
    validationSuccess.valid === true && validationSuccess.amountIdr === 112500,
    "Validasi payload sah berhasil membaca nominal Rp 112.500",
    `Valid: ${validationSuccess.valid} | Nominal: Rp ${validationSuccess.amountIdr}`
  );

  // Manipulasi payload (nominal Rp 112.500 diganti Rp 999.999 tanpa menghitung ulang CRC) untuk menguji deteksi pemalsuan transaksi
  const tamperedPayload = qrisGen.qrisPayload.replace("5406112500", "5406999999");
  const validationTampered = validateQrisPayloadStructure(tamperedPayload);

  // Memvalidasi bahwa payload yang dimanipulasi nominalnya otomatis ditolak karena ketidakcocokan checksum CRC16
  assert(
    validationTampered.valid === false && !!validationTampered.error,
    "Integritas terjaga: Payload yang diubah nominalnya ditolak karena checksum CRC tidak cocok",
    validationTampered.error
  );

  // Uji 3: Mesin Transisi Status Escrow (Escrow State Machine)
  console.log("\n[Test 3] Mesin Transisi Status Rekening Escrow");

  // Mensimulasikan pembayaran QRIS oleh pembeli
  const payTransition = transitionEscrowPaymentStatus("unpaid", "confirm_payment");

  // Memvalidasi transisi status dari unpaid menjadi held_in_escrow (dana terkunci di rekening bersama)
  assert(
    payTransition.success === true && payTransition.newStatus === "held_in_escrow",
    "Pelunasan QRIS pembeli memindahkan status dari 'unpaid' menjadi 'held_in_escrow'",
    payTransition.newStatus
  );

  // Mensimulasikan konfirmasi serah terima sayur oleh kurir
  const settleTransition = transitionEscrowPaymentStatus("held_in_escrow", "release_to_vendor");

  // Memvalidasi transisi pelepasan dana dari held_in_escrow menjadi released_to_vendor (dana cair ke pedagang)
  assert(
    settleTransition.success === true && settleTransition.newStatus === "released_to_vendor",
    "Pelepasan dana mengubah status dari 'held_in_escrow' menjadi 'released_to_vendor'",
    settleTransition.newStatus
  );

  // Mencoba transisi ilegal: mencairkan dana yang statusnya masih unpaid
  const invalidTransition = transitionEscrowPaymentStatus("unpaid", "release_to_vendor");

  // Memvalidasi penegakan aturan keamanan finansial: dana pesanan yang belum dibayar dilarang dicairkan
  assert(
    invalidTransition.success === false,
    "Aturan Keamanan: Dana yang belum dibayar DILARANG dicairkan ke pedagang",
    invalidTransition.reason
  );

  // Uji 4: Eksekusi Pelepasan Dana Escrow setelah konfirmasi serah terima
  console.log("\n[Test 4] Eksekusi Pelepasan Dana Escrow Setelah Serah Terima");

  // Eksekusi settlement saat status belum bayar
  const failSettlement = executeEscrowSettlement(112500, "unpaid");

  // Memvalidasi kegagalan pencairan dan status tetap unpaid jika belum ada pembayaran masuk
  assert(
    failSettlement.settled === false && failSettlement.newStatus === "unpaid",
    "Pencairan ditolak jika pesanan belum dibayar",
    failSettlement.message
  );

  // Eksekusi settlement saat status dana berada di rekening penampung (held_in_escrow)
  const successSettlement = executeEscrowSettlement(112500, "held_in_escrow");

  // Memvalidasi pencairan sukses: dana Rp 112.500 resmi dikreditkan ke saldo dompet pedagang
  assert(
    successSettlement.settled === true && successSettlement.creditedAmountIdr === 112500,
    "Pencairan berhasil: Saat serah terima dikonfirmasi, dana Rp 112.500 dilepas ke dompet pedagang",
    `Status: ${successSettlement.newStatus} | Kredit: Rp ${successSettlement.creditedAmountIdr}`
  );

  // Rekapitulasi hasil uji
  console.log(`\nHasil akhir pengujian PSR-37: ${passedCount} lulus, ${failedCount} gagal\n`);

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

// Menjalankan rangkaian uji coba QRIS Escrow Gateway
runQrisEscrowTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
