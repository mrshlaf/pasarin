// Endpoint Uji Coba Simulasi 24-Jam Metabolisme Pasar (PSR-31).
// GET & POST: Menjalankan skenario hulu-ke-hilir 5 tahapan sirkadian pasar tradisional.

import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/apiAuth";
import { run24HourMarketMetabolismTrial } from "@/lib/marketMetabolismSimulator";

// Menjalankan uji coba simulasi metabolisme pasar 24 jam melintasi 5 fase sirkadian.
// Hanya pengelola dan admin yang boleh menjalankannya; simulasi memakai orkestrator dan tidak layak dibuka untuk umum.
export async function GET(req: NextRequest) {
  const auth = await requireApiRole(req, ["manager", "admin"]);
  if (auth.response) return auth.response;
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

// Memicu eksekusi simulasi metabolisme pasar 24 jam via HTTP POST.
// Sama persis dengan GET; disediakan untuk klien yang memicu simulasi sebagai aksi.
export async function POST(req: NextRequest) {
  return GET(req);
}
