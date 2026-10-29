/**
 * Middleware Global Edge Server (PSR-3).
 * Menerapkan header keamanan HTTP ketat (nosniff, DENY framing, strict-origin referrer)
 * serta mengonfigurasi header CORS dan penanganan preflight OPTIONS untuk seluruh rute `/api`.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Memproses setiap permintaan masuk pada level Edge runtime Next.js.
 * Menginjeksi identitas layanan, header proteksi peramban, dan kebijakan pembagian sumber daya lintas domain (CORS).
 *
 * @param request - Objek NextRequest masuk dari klien.
 * @returns Respons NextResponse termodifikasi dengan header keamanan dan CORS.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Header keamanan standar
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Service-Identity", "PASARIN-Engine-v0.1.0");

  // CORS headers untuk route /api
  if (request.nextUrl.pathname.startsWith("/api")) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
  }

  return response;
}

/**
 * Konfigurasi pencocokan rute middleware.
 * Mengabaikan berkas statis publik (gambar, favicon, aset _next/static).
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
