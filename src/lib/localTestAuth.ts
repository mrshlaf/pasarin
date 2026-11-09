/**
 * Modul Autentikasi Pengujian Lokal Khusus Pengembangan (Localhost Development Auth).
 * Memfasilitasi peralihan akun cepat antar-peran (pedagang, warteg, panti, maggot, kurir) saat pengujian lokal
 * tanpa membebani kuota API Supabase Auth, dengan isolasi ketat hanya pada alamat loopback (localhost).
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import type { AuthUser } from "@/data/accounts";
import { MARKET_ACCOUNT_BY_USERNAME, localActorId } from "@/data/marketAccounts";
import { databaseConfigured } from "@/lib/database";

/**
 * Nama cookie sesi pengujian lokal loopback (PSR-40).
 */
export const LOCAL_TEST_COOKIE = "pasarin_local_test";

/**
 * Durasi masa berlaku sesi pengujian lokal dalam detik (8 jam operasional pasar) (PSR-40).
 */
export const LOCAL_TEST_SESSION_SECONDS = 8 * 60 * 60;

declare global {
  var pasarinLocalTestSigningKey: Buffer | undefined;
}

/**
 * Memastikan permintaan berasal secara sah dari lingkungan pengembangan lokal (loopback interface localhost).
 * Memblokir penggunaan mode pengujian ini pada lingkungan produksi cloud untuk mencegah celah keamanan impersonasi peran.
 *
 * @param req - Objek NextRequest masuk.
 * @returns Boolean bernilai true hanya jika permintaan berasal dari host loopback pengembangan.
 */
export function isLocalTestRequest(req: NextRequest) {
  if (process.env.NODE_ENV !== "development" || databaseConfigured() || process.env.PASARIN_STATE_BACKEND === "supabase") return false;
  const host = req.headers.get("host") ?? req.nextUrl.host;
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)) return false;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded && !forwarded.split(",").every((address) => /^(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/.test(address.trim()))) return false;
  const origin = req.headers.get("origin");
  return !origin || origin === `${req.nextUrl.protocol}//${host}`;
}

/**
 * Mengambil profil identitas pengguna pengujian lokal dari master direktori akun pasar.
 *
 * @param username - Nama pengguna akun pasar (misal: "pasar1", "warteg1").
 * @returns Profil AuthUser lengkap atau null jika username tidak terdaftar.
 */
export function localTestProfile(username: string): AuthUser | null {
  const account = MARKET_ACCOUNT_BY_USERNAME.get(username);
  if (!account) return null;
  return {
    id: localActorId(account.username),
    email: `${account.username}@pasarin.id`,
    name: account.name,
    organization: account.organization,
    role: account.role,
    vendorId: account.vendorId,
  };
}

/**
 * Menghasilkan atau menggunakan kunci rahasia efemeral bersama untuk menandatangani token sesi pengujian lokal.
 *
 * @param payload - String muatan yang akan ditandatangani.
 * @returns Buffer tanda tangan kriptografis HMAC-SHA256.
 */
function signLocalTestSession(payload: string) {
  globalThis.pasarinLocalTestSigningKey ??= randomBytes(32);
  return createHmac("sha256", globalThis.pasarinLocalTestSigningKey).update(payload).digest();
}

/**
 * Menerbitkan token sesi pengujian lokal bertanda tangan kriptografis yang tahan manipulasi peran (tamper-proof).
 *
 * @param username - Nama pengguna akun pasar.
 * @returns String token sesi pengujian terformat "<username>.<expires>.<signature>".
 */
export function makeLocalTestSession(username: string) {
  const payload = `${username}.${Date.now() + LOCAL_TEST_SESSION_SECONDS * 1000}`;
  return `${payload}.${signLocalTestSession(payload).toString("base64url")}`;
}

/**
 * Membaca dan memvalidasi token sesi pengujian lokal dari cookie permintaan HTTP masuk secara timing-safe.
 *
 * @param req - Objek NextRequest masuk.
 * @returns Profil pengguna AuthUser jika tanda tangan valid dan belum kedaluwarsa, atau null.
 */
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
