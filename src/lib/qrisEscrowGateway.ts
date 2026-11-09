/**
 * Gerbang Pembayaran QRIS Dinamis Bank Indonesia & Rekening Bersama Escrow (PSR-37).
 * Mengimplementasikan:
 * 1. Generator Payload QRIS Dinamis berstandar nasional Bank Indonesia / ASPI / EMVCo TLV.
 * 2. Perhitungan Checksum CRC16-CCITT (Polinomial 0x1021) untuk integritas transaksi finansial.
 * 3. Mesin Transisi Status Rekening Escrow: unpaid -> held_in_escrow -> released_to_vendor.
 * 4. Logika Pelepasan Dana Instan (Zero-Click Settlement) ke dompet pedagang saat bukti PoD tervalidasi.
 */

/**
 * Status rekening penampung bersama (Escrow Payment Status) (PSR-37):
 * - unpaid: Belum dibayar oleh pembeli.
 * - held_in_escrow: Pembayaran QRIS terverifikasi dan ditahan di rekening penampung netral.
 * - released_to_vendor: Komoditas telah diterima utuh (PoD) dan dana diteruskan ke dompet pedagang.
 * - refunded: Transaksi dibatalkan dan dana dikembalikan ke pembeli.
 */
export type EscrowPaymentStatus =
  | "unpaid"
  | "held_in_escrow"
  | "released_to_vendor"
  | "refunded";

/**
 * Metadata kios pedagang pasar penerima pembayaran QRIS (PSR-37).
 */
export interface QrisMerchantDetails {
  merchantId: string;
  merchantName: string;
  merchantCity?: string;
  postalCode?: string;
}

/**
 * Struktur payload dan metadata QRIS Dinamis standar Bank Indonesia EMVCo (PSR-37).
 */
export interface DynamicQrisResult {
  qrisPayload: string;
  transactionReference: string;
  amountIdr: number;
  merchantName: string;
  currency: "IDR";
  crc16: string;
  generatedAt: string;
}

/**
 * Menghitung checksum CRC16-CCITT berstandar EMVCo / ASPI (Polinomial 0x1021, Nilai Awal 0xFFFF).
 *
 * @param str - String payload sebelum nilai CRC disematkan.
 * @returns 4 karakter heksadesimal representasi CRC16.
 */
export function calculateQrisCrc16(str: string): string {
  let crc = 0xffff;
  const strlen = str.length;

  for (let c = 0; c < strlen; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  const hex = (crc & 0xffff).toString(16).toUpperCase();
  return hex.padStart(4, "0");
}

/**
 * Format string bantuan untuk menyusun Tag-Length-Value (TLV) standar EMVCo QRIS.
 *
 * @param tag - Kode tag 2 karakter (misal: "00", "54").
 * @param value - Nilai konten string yang diasosiasikan dengan tag.
 * @returns String terformat "<tag><panjang 2-digit><nilai>".
 */
function formatTlv(tag: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${tag}${len}${value}`;
}

/**
 * Membangun payload QRIS Dinamis berstandar nasional Bank Indonesia (QRIS CPM/MPM).
 *
 * @param amountIdr - Nominal tagihan pesanan dalam mata uang Rupiah.
 * @param invoiceRef - Nomor referensi penawaran atau invoice transaksi.
 * @param merchant - Informasi data kios pedagang pasar penerima dana.
 * @returns Objek payload QRIS siap pindai oleh aplikasi mobile banking / e-wallet.
 */
export function generateBankIndonesiaQrisPayload(
  amountIdr: number,
  invoiceRef: string,
  merchant: QrisMerchantDetails = {
    merchantId: "ID1026348913PASARIN",
    merchantName: "PASARIN Kramat Jati",
  }
): DynamicQrisResult {
  const cleanAmount = Math.max(100, Math.round(amountIdr));
  const safeMerchantName = merchant.merchantName.substring(0, 25);
  const cleanRef = invoiceRef.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 20);

  // 1. Tag 00: Format Indicator (01)
  let payload = formatTlv("00", "01");

  // 2. Tag 01: Point of Initiation Method (12 = Dinamis untuk setiap transaksi spesifik)
  payload += formatTlv("01", "12");

  // 3. Tag 26: Merchant Account Information (NMID & National Reverse Domain)
  const merchantInfoValue =
    formatTlv("00", "ID.PASARIN.WWW") +
    formatTlv("01", merchant.merchantId) +
    formatTlv("02", cleanRef);
  payload += formatTlv("26", merchantInfoValue);

  // 4. Tag 51: Merchant Category Code (5499: Miscellaneous Food Stores)
  payload += formatTlv("51", "5499");

  // 5. Tag 52: Transaction Currency (360: IDR Rupiah)
  payload += formatTlv("52", "360");

  // 6. Tag 54: Transaction Amount (Nominal tepat dalam Rupiah)
  payload += formatTlv("54", String(cleanAmount));

  // 7. Tag 58: Country Code (ID)
  payload += formatTlv("58", "ID");

  // 8. Tag 59: Merchant Name
  payload += formatTlv("59", safeMerchantName);

  // 9. Tag 60: Merchant City
  payload += formatTlv("60", merchant.merchantCity || "JAKARTA TIMUR");

  // 10. Tag 62: Additional Data Field Template (Invoice Reference)
  const additionalData = formatTlv("01", cleanRef) + formatTlv("07", "PASARIN-ESCROW");
  payload += formatTlv("62", additionalData);

  // 11. Tag 63: Checksum CRC16
  const payloadToCrc = payload + "6304";
  const crcValue = calculateQrisCrc16(payloadToCrc);
  const fullQrisPayload = payloadToCrc + crcValue;

  return {
    qrisPayload: fullQrisPayload,
    transactionReference: cleanRef,
    amountIdr: cleanAmount,
    merchantName: safeMerchantName,
    currency: "IDR",
    crc16: crcValue,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Memvalidasi keabsahan struktur string payload QRIS Bank Indonesia dan checksum integritasnya.
 *
 * @param payload - String lengkap QRIS yang hendak diverifikasi.
 * @returns Status keabsahan, nominal pembayaran terdeteksi, dan nama merchant.
 */
export function validateQrisPayloadStructure(payload: string): {
  valid: boolean;
  amountIdr?: number;
  merchantName?: string;
  error?: string;
} {
  if (!payload || payload.length < 30) {
    return { valid: false, error: "Panjang string payload QRIS tidak mencukupi standar minimum." };
  }

  // Verifikasi keabsahan checksum CRC16 di 4 karakter terakhir
  const payloadWithoutCrc = payload.substring(0, payload.length - 4);
  const declaredCrc = payload.substring(payload.length - 4).toUpperCase();
  const computedCrc = calculateQrisCrc16(payloadWithoutCrc);

  if (declaredCrc !== computedCrc) {
    return {
      valid: false,
      error: `Checksum integritas QRIS tidak cocok (Dideklarasikan: ${declaredCrc}, Terhitung: ${computedCrc}).`,
    };
  }
  // Ekstrak data TLV (Tag-Length-Value) secara berurutan
  let extractedAmount = 0;
  let extractedMerchant = "Merchant";

  let offset = 0;
  while (offset < payload.length - 4) {
    const tag = payload.substring(offset, offset + 2);
    const len = parseInt(payload.substring(offset + 2, offset + 4), 10);
    if (isNaN(len)) break;
    const value = payload.substring(offset + 4, offset + 4 + len);
    offset = offset + 4 + len;

    if (tag === "54") {
      extractedAmount = Number(value);
    } else if (tag === "59") {
      extractedMerchant = value;
    }
  }
  return {
    valid: true,
    amountIdr: extractedAmount,
    merchantName: extractedMerchant,
  };
}

/**
 * Mesin Transisi Status Rekening Penampung (Escrow State Machine) (PSR-37).
 * Menjamin aliran status finansial terkontrol: unpaid -> held_in_escrow -> released_to_vendor.
 *
 * @param currentStatus - Status pembayaran saat ini.
 * @param action - Aksi mutasi status yang diminta ("confirm_payment" | "release_to_vendor" | "refund").
 * @returns Status transisi sukses/gagal beserta status baru dan alasan jika ditolak.
 */
export function transitionEscrowPaymentStatus(
  currentStatus: EscrowPaymentStatus,
  action: "confirm_payment" | "release_to_vendor" | "refund"
): { success: boolean; newStatus: EscrowPaymentStatus; reason?: string } {
  if (action === "confirm_payment") {
    if (currentStatus === "unpaid") {
      return { success: true, newStatus: "held_in_escrow" };
    }
    return { success: false, newStatus: currentStatus, reason: "Hanya pesanan berstatus 'unpaid' yang dapat dibayar ke escrow." };
  }

  if (action === "release_to_vendor") {
    if (currentStatus === "held_in_escrow") {
      return { success: true, newStatus: "released_to_vendor" };
    }
    return { success: false, newStatus: currentStatus, reason: "Hanya dana tertahan di 'held_in_escrow' yang dapat dicairkan ke pedagang." };
  }

  if (action === "refund") {
    if (currentStatus === "held_in_escrow") {
      return { success: true, newStatus: "refunded" };
    }
    return { success: false, newStatus: currentStatus, reason: "Hanya dana di escrow yang dapat dikembalikan ke pembeli." };
  }

  return { success: false, newStatus: currentStatus, reason: "Aksi transisi tidak dikenali." };
}

/**
 * Menghitung pelepasan dana simulasi (Escrow Settlement) untuk pesanan yang telah dibayar (PSR-37).
 * Menyalurkan nominal pembayaran dari rekening penampung ke saldo dompet pedagang.
 *
 * @param amountIdr - Nominal transaksi yang dicairkan dalam Rupiah.
 * @param currentStatus - Status pembayaran saat ini (default: "held_in_escrow").
 * @returns Hasil mutasi settlement saldo dan pesan konfirmasi.
 */
export function executeEscrowSettlement(
  amountIdr: number,
  currentStatus: EscrowPaymentStatus = "held_in_escrow"
): {
  settled: boolean;
  creditedAmountIdr: number;
  newStatus: EscrowPaymentStatus;
  message: string;
} {
  if (!Number.isFinite(amountIdr) || amountIdr < 0) {
    return {
      settled: false,
      newStatus: currentStatus,
      creditedAmountIdr: 0,
      message: "Nominal transaksi tidak valid.",
    };
  }
  const transition = transitionEscrowPaymentStatus(currentStatus, "release_to_vendor");
  if (!transition.success) {
    return {
      settled: false,
      creditedAmountIdr: 0,
      newStatus: currentStatus,
      message: transition.reason || "Pencairan dana gagal.",
    };
  }

  return {
    settled: true,
    creditedAmountIdr: amountIdr,
    newStatus: transition.newStatus,
    message: `Pencairan Sukses! Dana Rp ${amountIdr.toLocaleString("id-ID")} berhasil dilepas dari rekening escrow ke dompet pedagang.`,
  };
}
