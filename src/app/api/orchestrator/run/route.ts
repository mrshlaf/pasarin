/**
 * Rute API Pemicu Siklus Otonom Orkestrator Multi-Agen (PSR-17 / PRD §15).
 * Menyediakan endpoint HTTP POST untuk mengeksekusi alur orkestrasi lengkap sistem PASARIN:
 * pembacaan telemetri cuaca, dekomposisi inventaris 30 kios, kalkulasi susut Arrhenius,
 * gerbang kendali mutu etis, dan penugasan armada logistik.
 */

import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  executeAutonomousOrchestration,
  getLatestOrchestratorRun,
} from "@/lib/geminiOrchestrator";

export const dynamic = "force-dynamic";

/**
 * Menangani pemicuan eksekusi siklus otonom sistem multi-agen via HTTP POST.
 * Mendukung muatan body JSON opsional { executionMode, forceHeuristic }.
 *
 * @param req - Objek NextRequest pembawa muatan konfigurasi eksekusi.
 * @returns Respons JSON berisi hasil eksekusi OrchestratorRunResult status HTTP 200 OK.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Body JSON opsional: jika kosong, sistem menggunakan parameter default
    }

    const executionMode =
      body.executionMode === "manual_simulation" ? "manual_simulation" : "scheduled_autonomous_cron";
    const forceHeuristic = Boolean(body.forceHeuristic);

    const result = await executeAutonomousOrchestration({
      executionMode,
      forceHeuristic,
    });

    return successResponse(result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eksekusi alur otonom orkestrator gagal";
    console.error("[POST /api/orchestrator/run Error]:", error);
    return errorResponse(message, 500);
  }
}

/**
 * Mengambil ringkasan rekam jejak siklus otonom orkestrator terakhir via HTTP GET.
 *
 * @returns Respons JSON berisi OrchestratorRunResult terakhir atau status ketersediaan.
 */
export async function GET(): Promise<NextResponse> {
  const latestRun = getLatestOrchestratorRun();
  if (!latestRun) {
    // Jika belum pernah dijalankan, picu siklus awal untuk inisialisasi data
    const freshRun = await executeAutonomousOrchestration({
      executionMode: "scheduled_autonomous_cron",
    });
    return successResponse(freshRun, 200);
  }

  return successResponse(latestRun, 200);
}

/**
 * Menangani pemeriksaan ketersediaan ringan (health probe) endpoint orkestrator.
 *
 * @returns Respons HTTP kosong dengan status 200 OK.
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
