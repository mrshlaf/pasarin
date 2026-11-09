/**
 * Endpoint Layanan Pembayaran QRIS Dinamis & Escrow Bank Indonesia (PSR-37).
 * POST: Menghasilkan string payload QRIS dinamis berstandar EMVCo TLV dengan CRC16.
 * PUT: Memproses simulasi pelunasan pembayaran ke escrow atau pelepasan dana PoD kurir.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/apiAuth";
import {
  generateBankIndonesiaQrisPayload,
  validateQrisPayloadStructure,
  transitionEscrowPaymentStatus,
  executeEscrowSettlement,
  EscrowPaymentStatus,
} from "@/lib/qrisEscrowGateway";

/**
 * Memeriksa status operasional modul gateway escrow QRIS dinamis.
 *
 * @returns Respons JSON spesifikasi gateway dan standar kepatuhan Bank Indonesia.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "PASARIN QRIS Escrow Simulator",
    standard: "Bank Indonesia / ASPI / EMVCo TLV QRIS CPM/MPM",
    escrowModel: "Zero-Trust Dual Custody Escrow Pool",
    checksumAlgorithm: "CRC16-CCITT (Polynomial 0x1021)",
    currency: "IDR",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Membangkitkan string payload QRIS Dinamis standar EMVCo TLV ber-CRC16.
 *
 * @param req - Objek NextRequest masuk berisi detail nominal tagihan dan referensi faktur.
 * @returns Respons JSON string payload QRIS dan status awal escrow 'unpaid'.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(req, ["warteg", "admin"]);
  if (auth.response) return auth.response;
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

/**
 * Memproses simulasi pelunasan pembayaran ke rekening escrow atau pelepasan dana akhir ke rekening pedagang (settlement PoD).
 *
 * @param req - Objek NextRequest masuk berisi tipe aksi dan status transisi escrow.
 * @returns Respons JSON status transisi mutasi escrow baru.
 */
export async function PUT(req: NextRequest) {
  const auth = await requireApiRole(req, ["admin"]);
  if (auth.response) return auth.response;
  try {
    const body = (await req.json()) as {
      action?: "confirm_payment" | "release_to_vendor" | "refund";
      currentStatus?: EscrowPaymentStatus;
      amountIdr?: number;
      qrisPayload?: string;
    };

    if (!body?.action) {
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
      if (typeof body.amountIdr !== "number" || !body.currentStatus) {
        return NextResponse.json({ ok: false, error: "Nominal dan status awal wajib disertakan." }, { status: 400 });
      }
      const settlement = executeEscrowSettlement(body.amountIdr, body.currentStatus);
      return NextResponse.json({
        ok: settlement.settled,
        newStatus: settlement.newStatus,
        creditedAmountIdr: settlement.creditedAmountIdr,
        message: settlement.message,
      }, { status: settlement.settled ? 200 : 422 });
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
