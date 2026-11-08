import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import type { AppRole, AuthUser } from "@/data/accounts";

export const LOCAL_TEST_COOKIE = "pasarin_local_test";
export const LOCAL_TEST_SESSION_SECONDS = 8 * 60 * 60;

const accounts = new Map<string, AppRole>([
  ["admin1", "admin"],
  ["pasar1", "vendor"],
  ["warteg1", "warteg"],
  ["sosial1", "social_kitchen"],
  ["maggot1", "maggot"],
  ["kurir1", "logistics"],
  ["pengelola1", "manager"],
]);

declare global {
  var pasarinLocalTestSigningKey: Buffer | undefined;
}

/** Restricts known test credentials to loopback development and local market storage. */
export function isLocalTestRequest(req: NextRequest) {
  if (process.env.NODE_ENV !== "development" || process.env.PASARIN_STATE_BACKEND === "supabase") return false;
  const host = req.headers.get("host") ?? req.nextUrl.host;
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)) return false;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded && !forwarded.split(",").every((address) => /^(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/.test(address.trim()))) return false;
  const origin = req.headers.get("origin");
  return !origin || origin === `${req.nextUrl.protocol}//${host}`;
}

/** Returns a role-bound identity from the server-side test account list. */
export function localTestProfile(username: string): AuthUser | null {
  const role = accounts.get(username);
  if (!role) return null;
  return {
    id: `demo:${username}`,
    email: `${username}@pasarin.id`,
    name: username,
    organization: "Akun tes lokal",
    role,
    vendorId: role === "vendor" ? "vendor_kramat_01" : undefined,
  };
}

/** Shares one ephemeral signing key across development route bundles. */
function signLocalTestSession(payload: string) {
  globalThis.pasarinLocalTestSigningKey ??= randomBytes(32);
  return createHmac("sha256", globalThis.pasarinLocalTestSigningKey).update(payload).digest();
}

/** Issues an expiring session that cannot be edited to switch roles. */
export function makeLocalTestSession(username: string) {
  const payload = `${username}.${Date.now() + LOCAL_TEST_SESSION_SECONDS * 1000}`;
  return `${payload}.${signLocalTestSession(payload).toString("base64url")}`;
}

/** Validates the signed test session before using its role on any API. */
export function readLocalTestUser(req: NextRequest): AuthUser | null {
  if (!isLocalTestRequest(req)) return null;
  const cookie = req.cookies.get(LOCAL_TEST_COOKIE)?.value;
  const match = cookie?.match(/^([a-z0-9]+)\.(\d+)\.([A-Za-z0-9_-]{43})$/);
  if (!match) return null;
  const [, username, expires, mac] = match;
  if (Number(expires) <= Date.now()) return null;
  const signature = Buffer.from(mac, "base64url");
  const expected = signLocalTestSession(`${username}.${expires}`);
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
  return localTestProfile(username);
}
