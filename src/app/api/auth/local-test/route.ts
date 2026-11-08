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

/** Restores the current localhost test session after a refresh. */
export async function GET(req: NextRequest) {
  if (!isLocalTestRequest(req)) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ user: readLocalTestUser(req) });
}

/** Signs in a known test username on localhost only. */
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

/** Removes the test session from this browser. */
export async function DELETE(req: NextRequest) {
  if (!isLocalTestRequest(req)) return new NextResponse(null, { status: 404 });
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(LOCAL_TEST_COOKIE);
  return response;
}
