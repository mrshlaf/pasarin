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

/** Restores the signed server session after a refresh. */
export async function GET(req: NextRequest) {
  if (!serverAuthEnabled()) return NextResponse.json({ user: null }, { status: 404 });
  return NextResponse.json({ user: readSessionUser(req) });
}

/** Validates a Supabase Auth account against Postgres and starts a session. */
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

/** Clears the server session cookie. */
export async function DELETE() {
  const response = NextResponse.json({ user: null });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookie, maxAge: 0 });
  return response;
}
