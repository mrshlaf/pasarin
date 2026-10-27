/**
 * Endpoint Telemetri Cuaca Mikro Hiperlokal Pasar Induk Kramat Jati
 *
 * Rute: GET /api/telemetry/weather
 * Rute: HEAD /api/telemetry/weather
 *
 * @see Jira Ticket PSR-5 (Hyperlocal Climate Telemetry Agent)
 * @see PRD_FIX_PASARIN.md Bagian 12.1 (Daftar API #13) & Bagian 15.4.1
 *
 * Kriteria Penerimaan (DoD) yang Dipenuhi:
 * [x] Modul cuaca berhasil membaca suhu udara, kelembapan, dan curah hujan aktual secara stabil.
 * [x] Panggilan data dalam rentang waktu singkat dilayani langsung dari memori tanpa membebani kuota API.
 * [x] Simulasi putus koneksi membuktikan sistem tetap beroperasi normal menggunakan profil cadangan.
 */

import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getHyperlocalMarketWeather } from "@/lib/weatherAgent";
import { WeatherTelemetryData } from "@/types/api";

export const dynamic = "force-dynamic";

/**
 * Menangani permintaan GET untuk membaca kondisi cuaca mikro Pasar Kramat Jati.
 *
 * Alur Kerja:
 * 1. Mengekstrak parameter kueri URL opsional `refresh` (misal: `/api/telemetry/weather?refresh=true`)
 *    untuk memungkinkan pemaksaan pembaruan data tanpa membaca cache memori.
 * 2. Memanggil fungsi `getHyperlocalMarketWeather()` yang mengelola siklus cache 15 menit
 *    dan mitigasi kegagalan otomatis (*safe tropical fallback*).
 * 3. Membungkus data ke dalam amplop baku `ApiResponse<WeatherTelemetryData>` dengan kode HTTP 200.
 *
 * @param req - Objek NextRequest yang memuat metadata permintaan HTTP dari klien.
 * @returns NextResponse berisi JSON berstandar ApiResponse atau kode 500 jika terjadi galat fatal.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;
    const forceRefresh = searchParams.get("refresh") === "true";

    const weatherData: WeatherTelemetryData = await getHyperlocalMarketWeather(forceRefresh);

    return successResponse(weatherData, 200);
  } catch (unexpectedError) {
    const errorMessage =
      unexpectedError instanceof Error ? unexpectedError.message : "Terjadi kesalahan internal saat membaca telemetri cuaca";

    console.error("[GET /api/telemetry/weather Error]:", unexpectedError);
    return errorResponse(errorMessage, 500);
  }
}

/**
 * Menangani permintaan HEAD untuk probe ringan verifikasi ketersediaan endpoint
 * tanpa mentransfer badan respons JSON (*zero-payload probe*).
 *
 * @returns NextResponse dengan status HTTP 200 OK dan badan kosong.
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
