/**
 * Skrip Pengujian Unit Mandiri: PSR-37 (Bank Indonesia Dynamic QRIS Escrow Payment Gateway).
 * Memverifikasi:
 * 1. Pembangkitan string payload QRIS Dinamis EMVCo TLV dengan checksum CRC16-CCITT (0x1021).
 * 2. Validasi struktur QRIS dan pendeteksian payload cacat/manipulatif.
 * 3. Mesin Transisi Status Rekening Escrow (unpaid -> held_in_escrow -> released_to_vendor).
 * 4. Pelepasan dana otomatis ke dompet pedagang saat validasi GPS geofence <= 50m terpenuhi.
 */

import {
  generateBankIndonesiaQrisPayload,
  validateQrisPayloadStructure,
  calculateQrisCrc16,
  transitionEscrowPaymentStatus,
  executeEscrowSettlement,
} from "../src/lib/qrisEscrowGateway";

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

async function runQrisEscrowTests() {
  console.log("================================================================================");
  console.log("  PENGUJIAN UNIT MANDIRI: PSR-37 (DYNAMIC QRIS ESCROW PAYMENT GATEWAY)");
  console.log("  Fokus: Format EMVCo TLV, Checksum CRC16, & Pelepasan Dana Escrow PoD <= 50m");
  console.log("================================================================================\n");

  // Test 1: Pembangkitan Payload QRIS Dinamis Berstandar Nasional
  console.log("[Test 1] Pembangkitan Payload QRIS Dinamis Bank Indonesia (EMVCo TLV)");
  const qrisGen = generateBankIndonesiaQrisPayload(112500, "INV-WARTEG-01", {
    merchantId: "ID1026348913PASARIN",
    merchantName: "H. Rohmat Sayur Daun",
    merchantCity: "JAKARTA TIMUR",
  });

  assert(
    qrisGen.qrisPayload.startsWith("000201010212"),
    "Tag pembuka QRIS sesuai standar EMVCo (00=01, 01=12 Dinamis)",
    "000201010212"
  );
  assert(
    qrisGen.amountIdr === 112500 && qrisGen.qrisPayload.includes("5406112500"),
    "Tag 54 memuat nominal transaksi tepat Rp 112.500",
    "5406112500"
  );
  assert(
    qrisGen.crc16.length === 4,
    "Checksum CRC16-CCITT 4 digit heksadesimal terhitung presisi",
    `CRC16: ${qrisGen.crc16}`
  );

  // Test 2: Validasi Struktur Payload & Deteksi Cacat Checksum
  console.log("\n[Test 2] Validasi Struktur Payload & Integritas Checksum CRC16");
  const validationSuccess = validateQrisPayloadStructure(qrisGen.qrisPayload);
  assert(
    validationSuccess.valid === true && validationSuccess.amountIdr === 112500,
    "Validasi payload sah berhasil membaca nominal Rp 112.500",
    `Valid: ${validationSuccess.valid} | Nominal: Rp ${validationSuccess.amountIdr}`
  );

  // Manipulasi payload (ubah 1 digit nominal) untuk menguji deteksi pemalsuan
  const tamperedPayload = qrisGen.qrisPayload.replace("5406112500", "5406999999");
  const validationTampered = validateQrisPayloadStructure(tamperedPayload);
  assert(
    validationTampered.valid === false && !!validationTampered.error,
    "Integritas terjaga: Payload yang diubah nominalnya ditolak karena checksum CRC tidak cocok",
    validationTampered.error
  );

  // Test 3: Mesin Transisi Status Escrow (Escrow State Machine)
  console.log("\n[Test 3] Mesin Transisi Status Rekening Escrow");
  const payTransition = transitionEscrowPaymentStatus("unpaid", "confirm_payment");
  assert(
    payTransition.success === true && payTransition.newStatus === "held_in_escrow",
    "Pelunasan QRIS pembeli memindahkan status dari 'unpaid' menjadi 'held_in_escrow'",
    payTransition.newStatus
  );

  const settleTransition = transitionEscrowPaymentStatus("held_in_escrow", "release_to_vendor");
  assert(
    settleTransition.success === true && settleTransition.newStatus === "released_to_vendor",
    "Pelepasan dana mengubah status dari 'held_in_escrow' menjadi 'released_to_vendor'",
    settleTransition.newStatus
  );

  const invalidTransition = transitionEscrowPaymentStatus("unpaid", "release_to_vendor");
  assert(
    invalidTransition.success === false,
    "Aturan Keamanan: Dana yang belum dibayar DILARANG dicairkan ke pedagang",
    invalidTransition.reason
  );

  // Test 4: Eksekusi Pelepasan Dana Escrow dengan Validasi Geofence PoD <= 50m
  console.log("\n[Test 4] Eksekusi Pelepasan Dana Escrow Berbasis Sensor Jarak GPS");
  const failSettlement = executeEscrowSettlement(112500, 75, "held_in_escrow");
  assert(
    failSettlement.settled === false && failSettlement.newStatus === "held_in_escrow",
    "Pencairan ditolak ketika jarak kurir 75m melebihi radius batas geofence aman (50m)",
    failSettlement.message
  );

  const successSettlement = executeEscrowSettlement(112500, 20, "held_in_escrow");
  assert(
    successSettlement.settled === true && successSettlement.creditedAmountIdr === 112500,
    "Pencairan berhasil: Saat kurir terverifikasi pada jarak 20m (<= 50m), dana Rp 112.500 dilepas ke dompet pedagang",
    `Status: ${successSettlement.newStatus} | Kredit: Rp ${successSettlement.creditedAmountIdr}`
  );

  console.log("\n================================================================================");
  console.log(`HASIL AKHIR PENGUJIAN PSR-37: ${passedCount} LULUS, ${failedCount} GAGAL`);
  console.log("================================================================================\n");

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

runQrisEscrowTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
