/**
 * Endpoint Uji Coba Simulasi 24-Jam Metabolisme Pasar (PSR-31).
 * GET & POST: Menjalankan skenario hulu-ke-hilir 5 tahapan sirkadian pasar tradisional.
 */

import { NextResponse } from "next/server";
import { run24HourMarketMetabolismTrial } from "@/lib/marketMetabolismSimulator";

/**
 * Menjalankan uji coba simulasi metabolisme pasar 24 jam melintasi 5 fase sirkadian.
 *
 * @returns Respons JSON laporan simulasi lengkap dan metrik reduksi emisi gas metana IPCC 2006.
 */
export async function GET() {
  try {
    const trialReport = await run24HourMarketMetabolismTrial();
    return NextResponse.json({
      success: true,
      data: trialReport,
      message: "Uji coba simulasi 24 jam metabolisme pasar sukses dieksekusi 100%.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Gagal mengeksekusi simulasi metabolisme pasar.",
      },
      { status: 500 }
    );
  }
}

/**
 * Memicu eksekusi simulasi metabolisme pasar 24 jam via HTTP POST.
 *
 * @returns Respons JSON laporan hasil simulasi.
 */
export async function POST() {
  return GET();
}
