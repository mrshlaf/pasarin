/**
 * Endpoint Layanan Pembayaran QRIS Dinamis & Escrow Bank Indonesia (PSR-37).
 * POST: Menghasilkan string payload QRIS dinamis berstandar EMVCo TLV dengan CRC16.
 * PUT: Memproses simulasi pelunasan pembayaran ke escrow atau pelepasan dana PoD kurir.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateBankIndonesiaQrisPayload,
  validateQrisPayloadStructure,
  transitionEscrowPaymentStatus,
  executeEscrowSettlement,
  EscrowPaymentStatus,
} from "@/lib/qrisEscrowGateway";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "PASARIN Bank Indonesia Dynamic QRIS Escrow Payment Gateway",
    standard: "Bank Indonesia / ASPI / EMVCo TLV QRIS CPM/MPM",
    escrowModel: "Zero-Trust Dual Custody Escrow Pool",
    checksumAlgorithm: "CRC16-CCITT (Polynomial 0x1021)",
    currency: "IDR",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      amountIdr?: number;
      invoiceRef?: string;
      merchantName?: string;
      merchantId?: string;
    };

    if (!body || typeof body.amountIdr !== "number" || body.amountIdr <= 0) {
      return NextResponse.json(
        { ok: false, error: "Nominal tagihan pembayaran (amountIdr) wajib diisi dengan angka positif." },
        { status: 400 }
      );
    }

    const invoiceRef = body.invoiceRef || `INV-${Date.now().toString().slice(-6)}`;
    const qrisResult = generateBankIndonesiaQrisPayload(body.amountIdr, invoiceRef, {
      merchantId: body.merchantId || "ID1026348913PASARIN",
      merchantName: body.merchantName || "PASARIN Kramat Jati",
    });

    return NextResponse.json({
      ok: true,
      data: qrisResult,
      escrowStatus: "unpaid",
      message: "String payload QRIS Dinamis Bank Indonesia berhasil dibangkitkan.",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Gagal membangkitkan payload QRIS." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action?: "confirm_payment" | "release_to_vendor" | "refund";
      currentStatus?: EscrowPaymentStatus;
      amountIdr?: number;
      gpsDistanceMeters?: number;
      qrisPayload?: string;
    };

    if (!body.action) {
      return NextResponse.json({ ok: false, error: "Parameter 'action' wajib disertakan." }, { status: 400 });
    }

    // 1. Validasi opsional payload QRIS jika disertakan
    if (body.qrisPayload) {
      const qrisValidation = validateQrisPayloadStructure(body.qrisPayload);
      if (!qrisValidation.valid) {
        return NextResponse.json({ ok: false, error: `Integritas QRIS cacat: ${qrisValidation.error}` }, { status: 400 });
      }
    }

    // 2. Eksekusi transisi status atau settlement PoD
    if (body.action === "release_to_vendor") {
      const distance = typeof body.gpsDistanceMeters === "number" ? body.gpsDistanceMeters : 25;
      const amount = body.amountIdr || 50000;
      const current = body.currentStatus || "held_in_escrow";

      const settlement = executeEscrowSettlement(amount, distance, current);
      return NextResponse.json({
        ok: settlement.settled,
        newStatus: settlement.newStatus,
        creditedAmountIdr: settlement.creditedAmountIdr,
        message: settlement.message,
      });
    }

    const currentStatus = body.currentStatus || "unpaid";
    const transition = transitionEscrowPaymentStatus(currentStatus, body.action);

    return NextResponse.json({
      ok: transition.success,
      newStatus: transition.newStatus,
      message: transition.reason || `Status escrow berhasil diubah menjadi '${transition.newStatus}'.`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Gagal memproses transisi status escrow." },
      { status: 500 }
    );
  }
}
