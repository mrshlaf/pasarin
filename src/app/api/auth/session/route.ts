/**
 * Rute API Sesi Server Kredensial Pasar (PSR-2).
 * Mengatur pemulihan sesi dari cookie bertanda tangan HMAC, autentikasi langsung ke basis data PostgreSQL,
 * serta penghapusan cookie sesi saat pengguna keluar.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateJsonBody } from "@/lib/api-response";
import {
  SESSION_COOKIE, authenticateAccount, createSessionToken, serverAuthEnabled,
  sessionCookie, readSessionUser,
} from "@/lib/serverAuth";
import { databaseConfigured } from "@/lib/database";

const credentials = z.object({
  username: z.string().trim().toLowerCase().min(1).max(100),
  password: z.string().max(256),
});

/**
 * Memulihkan data profil pengguna dari token sesi server yang tersimpan di HttpOnly cookie peramban.
 *
 * @param req - Objek NextRequest masuk.
 * @returns Respons JSON berisi profil AuthUser atau null.
 */
export async function GET(req: NextRequest) {
  if (!serverAuthEnabled()) return NextResponse.json({ user: null }, { status: 404 });
  return NextResponse.json({ user: readSessionUser(req) });
}

/**
 * Memvalidasi kredensial pengguna terhadap tabel auth.users PostgreSQL dan menerbitkan cookie sesi baru.
 *
 * @param req - Objek NextRequest masuk.
 * @returns Respons JSON berisi profil AuthUser dan set-cookie sesi.
 */
export async function POST(req: NextRequest) {
  if (!serverAuthEnabled()) return NextResponse.json({ error: "Mode sesi server tidak aktif." }, { status: 404 });
  if (!databaseConfigured()) return NextResponse.json({ error: "Basis data akun belum dikonfigurasi." }, { status: 503 });
  const input = await validateJsonBody(req, credentials);
  if (!input.success) return input.errorResponse;
  try {
    const user = await authenticateAccount(input.data.username, input.data.password);
    if (!user) return NextResponse.json({ error: "Nama pengguna atau kata sandi tidak cocok." }, { status: 401 });
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookie);
    return response;
  } catch (error) {
    console.error("Cannot authenticate market account", error);
    return NextResponse.json({ error: "Layanan akun sedang tidak tersedia." }, { status: 503 });
  }
}

/**
 * Mengakhiri sesi server dan menghapus HttpOnly cookie sesi dari peramban klien.
 *
 * @returns Respons JSON konfirmasi sesi diakhiri.
 */
export async function DELETE() {
  const response = NextResponse.json({ user: null });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookie, maxAge: 0 });
  return response;
}
