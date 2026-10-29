/**
 * Rute API Telemetri Cuaca Mikro Kramat Jati (PSR-5).
 * Menyediakan endpoint HTTP GET untuk membaca suhu, kelembapan, dan curah hujan aktual
 * dari stasiun mikro Pasar Induk Kramat Jati, serta HEAD probe untuk monitoring ketersediaan.
 */

import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getHyperlocalMarketWeather } from "@/lib/weatherAgent";
import { WeatherTelemetryData } from "@/types/api";

export const dynamic = "force-dynamic";

/**
 * Menangani permintaan GET untuk membaca data telemetri cuaca mikro pasar terkini.
 * Mendukung parameter kueri `refresh=true` untuk memotong in-memory cache dan membaca API hulu secara langsung.
 *
 * @param req - Objek permintaan NextRequest pembawa parameter kueri.
 * @returns Respons JSON berisi data telemetri cuaca (status 200) atau pesan kegagalan (status 500).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";
    const weatherData: WeatherTelemetryData = await getHyperlocalMarketWeather(forceRefresh);

    return successResponse(weatherData, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membaca telemetri cuaca";
    console.error("[GET /api/telemetry/weather Error]:", error);
    return errorResponse(message, 500);
  }
}

/**
 * Menangani pemeriksaan ketersediaan ringan (health probe) tanpa mengirim muatan body.
 * Digunakan oleh sistem pemantau uptime dan reverse proxy.
 *
 * @returns Respons HTTP kosong dengan kode status 200 OK.
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
