/**
 * Rute API Otentikasi Sesi Pengujian Lokal Khusus Pengembangan (Local Test Auth).
 * Memfasilitasi login cepat pada lingkungan loopback pengembangan (localhost)
 * tanpa memerlukan kuota panggilan API ke Supabase Auth Cloud.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, validateJsonBody } from "@/lib/api-response";
import {
  isLocalTestRequest, localTestProfile, makeLocalTestSession, readLocalTestUser,
  LOCAL_TEST_COOKIE, LOCAL_TEST_SESSION_SECONDS,
} from "@/lib/localTestAuth";

const credentials = z.object({
  username: z.string().trim().toLowerCase().min(1).max(100),
  password: z.string().max(256),
});

/**
 * Memulihkan data profil pengguna sesi pengujian lokal dari cookie peramban.
 *
 * @param req - Objek NextRequest masuk.
 * @returns Respons JSON berisi profil AuthUser atau status 404.
 */
export async function GET(req: NextRequest) {
  if (!isLocalTestRequest(req)) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ user: readLocalTestUser(req) });
}

/**
 * Mengautentikasi username pengujian lokal dan menerbitkan cookie sesi pengujian tertandatangani.
 *
 * @param req - Objek NextRequest masuk.
 * @returns Respons JSON berisi profil pengguna dan set-cookie sesi.
 */
export async function POST(req: NextRequest) {
  if (!isLocalTestRequest(req)) return new NextResponse(null, { status: 404 });
  const input = await validateJsonBody(req, credentials);
  if (!input.success) return input.errorResponse;
  const { username, password } = input.data;
  const user = localTestProfile(username);
  if (!user) return new NextResponse(null, { status: 404 });
  if (password !== username) return errorResponse("Nama pengguna atau kata sandi tidak cocok.", 401);

  const response = NextResponse.json({ user });
  response.cookies.set(LOCAL_TEST_COOKIE, makeLocalTestSession(username), {
    httpOnly: true,
    sameSite: "strict",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: LOCAL_TEST_SESSION_SECONDS,
  });
  return response;
}

/**
 * Menghapus cookie sesi pengujian lokal dari peramban peramban klien.
 *
 * @param req - Objek NextRequest masuk.
 * @returns Respons HTTP 204 No Content.
 */
export async function DELETE(req: NextRequest) {
  if (!isLocalTestRequest(req)) return new NextResponse(null, { status: 404 });
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(LOCAL_TEST_COOKIE);
  return response;
}
