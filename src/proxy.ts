// Proxy header keamanan HTTP.
// Menerapkan header keamanan HTTP ketat (nosniff, DENY framing, strict-origin referrer)
// serta mematikan cache untuk seluruh rute `/api`.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Memproses setiap permintaan masuk pada level Edge runtime Next.js.
// Menginjeksi identitas layanan, header proteksi peramban, dan kebijakan pembagian sumber daya lintas domain (CORS).
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Header keamanan standar
  // Cegah peramban menebak tipe konten.
  response.headers.set("X-Content-Type-Options", "nosniff");
  // Halaman login Telegram boleh dibuka di dalam frame web.telegram.org (Mini App); halaman lain dilarang di-frame.
  if (request.nextUrl.pathname === "/telegram/login") {
    response.headers.set("Content-Security-Policy", "frame-ancestors https://web.telegram.org");
  } else {
    response.headers.set("X-Frame-Options", "DENY");
  }
  // Kirim referrer lengkap hanya ke situs yang sama.
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Penanda layanan untuk diagnostik.
  response.headers.set("X-Service-Identity", "PASARIN-Engine-v0.1.0");

  // Respons API tidak boleh di-cache agar data pasar selalu terbaru.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

// Konfigurasi pencocokan rute middleware.
// Mengabaikan berkas statis publik (gambar, favicon, aset _next/static).
export const config = {
  // Semua rute kecuali aset statis dan gambar.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
