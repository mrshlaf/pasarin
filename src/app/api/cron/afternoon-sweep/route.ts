/**
 * Rute Penjadwal Otonom Sapuan Surplus Pasar 14.30 WIB (PSR-4).
 * Memicu pemindaian 30 kios pedagang los basah Kramat Jati pada titik kritis pergantian ritme pasar.
 * Dilindungi oleh validasi Bearer secret token.
 */

import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getEnv } from "@/lib/env";
import { recordAuditLog } from "@/lib/audit";
import { AfternoonSweepResult } from "@/types/api";
import { getServerSimulationState, publishMarketOffers } from "@/lib/serverSimulationState";
import { matchesSecret } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

/**
 * Memvalidasi keabsahan token otorisasi permintaan cron.
 * Rasionale Keamanan: Rute pemicu sapuan sore mengeksekusi kalkulasi massal dan audit log.
 * Akses wajib membawa Bearer token rahasia (CRON_SECRET_KEY) untuk mencegah penyerang luar memicu audit palsu secara berulang.
 *
 * @param req - Objek NextRequest pembawa header otorisasi.
 * @returns True jika permintaan memiliki kredensial valid, false jika tidak sah.
 */
function isAuthorizedCronRequest(req: NextRequest): boolean {
  const token = req.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  return matchesSecret(token, getEnv().CRON_SECRET_KEY);
}

/**
 * Mengeksekusi siklus sapuan inventaris sore hari (Afternoon Sweep) pukul 14.30 WIB.
 * Memindai katalog kios terdaftar di Pasar Kramat Jati, mengagregasi volume surplus terdeteksi,
 * mendistribusikannya ke 3-Tier sirkular, dan mencatat transaksi ke audit trail.
 *
 * @returns Ringkasan hasil sapuan AfternoonSweepResult beserta verifikasi audit trail.
 */
async function executeAfternoonSweep(): Promise<AfternoonSweepResult> {
  const startTime = Date.now();
  const triggeredAt = new Date().toISOString();

  const published = await publishMarketOffers();
  if (!published.success) throw new Error(published.message);
  const { offers, stocks } = await getServerSimulationState();
  const pending = offers.filter((offer) => offer.status === "pending_vendor");
  const totalForTier = (tier: "tier_1" | "tier_2" | "tier_3") =>
    pending.filter((offer) => offer.targetTier === tier).reduce((sum, offer) => sum + offer.quantityKg, 0);
  const kiosksScanned = new Set(stocks.map((stock) => stock.vendorId)).size;
  const tier1WartegKg = totalForTier("tier_1");
  const tier2SocialKg = totalForTier("tier_2");
  const tier3MaggotKg = totalForTier("tier_3");
  const surplusDetectedKg = tier1WartegKg + tier2SocialKg + tier3MaggotKg;
  const estimatedCapitalRecoveredIdr = pending.reduce((sum, offer) => sum + offer.totalAmountIdr, 0);
  const discountAveragePercent = pending.length
    ? pending.reduce((sum, offer) => sum + offer.discountPercentage, 0) / pending.length : 0;

  const durationMs = Date.now() - startTime;

  // Catat audit log transaksi
  const auditResult = await recordAuditLog({
    subsystem: "autonomous_cron_sweeper",
    action_type: "AFTERNOON_MARKET_SWEEP_EXECUTION",
    payload: {
      schedule: "14:30_WIB_DAILY",
      kiosksScanned,
      surplusDetectedKg,
      tier1WartegKg,
      tier2SocialKg,
      tier3MaggotKg,
      estimatedCapitalRecoveredIdr,
    },
    durationMs,
  });

  return {
    eventId: auditResult.eventId,
    subsystem: "autonomous_cron_sweeper",
    actionType: "AFTERNOON_MARKET_SWEEP_EXECUTION",
    schedule: "14:30_WIB_DAILY",
    triggeredAt,
    result: "SUCCESS",
    executionDurationMs: durationMs,
    kiosksScanned,
    surplusDetectedKg,
    allocations: {
      tier1WartegKg,
      tier2SocialKg,
      tier3MaggotKg,
    },
    financials: {
      estimatedCapitalRecoveredIdr,
      discountAveragePercent,
    },
    auditTrail: {
      logged: auditResult.success,
      storage: auditResult.storage,
    },
  };
}

/**
 * Menangani pemicuan sapuan berkala via HTTP GET (standar Vercel Cron dan external cron trigger).
 *
 * @param req - Objek NextRequest pembawa header otorisasi Bearer token.
 * @returns Respons JSON berisi AfternoonSweepResult jika terotorisasi, atau HTTP 401 jika ditolak.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(req)) {
    return errorResponse("Akses ditolak: Token otentikasi cron tidak valid", 401);
  }

  try {
    const sweepResult = await executeAfternoonSweep();
    return successResponse(sweepResult, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eksekusi afternoon sweep gagal";
    console.error("[Afternoon Sweep Cron Error]:", error);
    return errorResponse(message, 500);
  }
}

/**
 * Menangani pemicuan sapuan manual via HTTP POST dari dashboard administrator sistem.
 *
 * @param req - Objek NextRequest pembawa header otorisasi Bearer token.
 * @returns Respons JSON berisi AfternoonSweepResult jika terotorisasi, atau HTTP 401 jika ditolak.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(req)) {
    return errorResponse("Akses ditolak: Token otentikasi cron tidak valid", 401);
  }

  try {
    const sweepResult = await executeAfternoonSweep();
    return successResponse(sweepResult, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eksekusi afternoon sweep gagal";
    console.error("[Afternoon Sweep Cron Error]:", error);
    return errorResponse(message, 500);
  }
}
