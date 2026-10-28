/**
 * GET /api/telemetry/weather: baca telemetri cuaca mikro Kramat Jati (support ?refresh=true)
 * HEAD /api/telemetry/weather: lightweight health probe tanpa payload
 */

import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getHyperlocalMarketWeather } from "@/lib/weatherAgent";
import { WeatherTelemetryData } from "@/types/api";

export const dynamic = "force-dynamic";

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

// Health probe tanpa payload untuk monitoring ketersediaan endpoint
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
