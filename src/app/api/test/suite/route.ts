/**
 * Rute API Pengujian Otomatis Unit Sesi Kelas (PSR-39 / In-Class Unit Testbench API).
 * Menyediakan endpoint HTTP GET untuk memicu eksekusi 12 suite pengujian unit
 * dan mengembalikan rekapitulasi status kelulusan (DoD) dalam bentuk JSON terstruktur.
 */

import { NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { runMasterInClassTestSuite } from "@/lib/inClassTestbench";

export const dynamic = "force-dynamic";

/**
 * Menjalankan rangkaian uji otomatis 12 suite dan mengembalikan metrik hasil pengujian.
 *
 * @returns Respons JSON berisi jumlah total kasus uji, jumlah lulus, dan status 100% kelulusan.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const report = await runMasterInClassTestSuite({ silent: true });
    return successResponse(report, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menjalankan test suite";
    console.error("[GET /api/test/suite Error]:", error);
    return errorResponse(message, 500);
  }
}

/**
 * Menangani pemeriksaan ketersediaan ringan (health probe).
 *
 * @returns Respons HTTP kosong dengan status 200 OK.
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
