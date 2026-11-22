// Rute API Telemetri Cuaca Mikro Kramat Jati (PSR-5).
// Menyediakan endpoint HTTP GET untuk membaca suhu, kelembapan, dan curah hujan aktual
// dari stasiun mikro Pasar Induk Kramat Jati, serta HEAD probe untuk monitoring ketersediaan.

import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getHyperlocalMarketWeather } from "@/lib/weatherAgent";
import { requireApiRole } from "@/lib/apiAuth";
import { WeatherTelemetryData } from "@/types/api";

// Data cuaca berubah sepanjang hari, jadi rute tidak boleh dirender statis saat build.
export const dynamic = "force-dynamic";

// Menangani permintaan GET untuk membaca data telemetri cuaca mikro pasar terkini.
// Mendukung parameter kueri `refresh=true` untuk memotong in-memory cache dan membaca API hulu secara langsung.
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";
    // Memotong cache berarti memanggil API cuaca hulu dan memakan kuotanya, jadi hanya admin yang boleh.
    if (forceRefresh) {
      const auth = await requireApiRole(req, ["admin"]);
      if (auth.response) return auth.response;
    }
    const weatherData: WeatherTelemetryData = await getHyperlocalMarketWeather(forceRefresh);

    return successResponse(weatherData, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membaca telemetri cuaca";
    console.error("[GET /api/telemetry/weather Error]:", error);
    return errorResponse(message, 500);
  }
}

// Menangani pemeriksaan ketersediaan ringan (health probe) tanpa mengirim muatan body.
// Digunakan oleh sistem pemantau uptime dan reverse proxy.
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
