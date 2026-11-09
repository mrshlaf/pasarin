/**
 * Modul Gerbang Autentikasi dan Otorisasi Berbasis Peran API (PSR-2).
 * Memvalidasi sesi pengguna dari cookie sesi server, token Bearer Supabase Auth,
 * atau kredensial simulasi lokal khusus lingkungan pengembangan, serta menegakkan batasan peran (RBAC).
 */

import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { accountProfile, type AppRole } from "@/data/accounts";
import { supabase } from "@/lib/supabase";
import { errorResponse } from "@/lib/api-response";
import { readLocalTestUser } from "@/lib/localTestAuth";
import { serverAuthEnabled, readSessionUser } from "@/lib/serverAuth";

/**
 * Membandingkan string rahasia menggunakan timing-safe buffer comparison.
 * Mencegah serangan analisis waktu (timing-attack) pada validasi token rahasia webhook atau cron.
 *
 * @param value - Nilai token masukan dari permintaan HTTP.
 * @param secret - Nilai token rahasia acuan dari variabel lingkungan server.
 * @returns True jika kedua nilai identik secara byte per byte.
 */
export function matchesSecret(value: string | null | undefined, secret: string | undefined) {
  if (!value || !secret) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Menegakkan otorisasi peran (RBAC) pada rute API endpoint Next.js.
 * Memeriksa identitas pengguna secara berurutan: cookie sesi server, Bearer token Supabase,
 * atau header sesi simulasi lokal (localhost development).
 *
 * @param req - Objek NextRequest masuk.
 * @param roles - Daftar peran yang diizinkan mengakses endpoint (opsional, jika kosong hanya memverifikasi autentikasi).
 * @returns Objek hasil berisi profil pengguna valid atau respons galat 401/403/503 siap kirim.
 */
export async function requireApiRole(req: NextRequest, roles?: readonly AppRole[]) {
  if (serverAuthEnabled()) {
    const serverUser = readSessionUser(req);
    if (serverUser) {
      if (roles && !roles.includes(serverUser.role)) {
        return { response: errorResponse("Akun ini tidak memiliki akses untuk tindakan tersebut.", 403) } as const;
      }
      return { user: serverUser } as const;
    }
  }
  const token = req.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) {
    const user = readLocalTestUser(req);
    if (!user) return { response: errorResponse("Silakan masuk terlebih dahulu.", 401) } as const;
    if (roles && !roles.includes(user.role)) {
      return { response: errorResponse("Akun ini tidak memiliki akses untuk tindakan tersebut.", 403) } as const;
    }
    return { user } as const;
  }
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return { response: errorResponse("Sesi tidak valid.", 401) } as const;
    const user = accountProfile(data.user);
    if (!user || (roles && !roles.includes(user.role))) {
      return { response: errorResponse("Akun ini tidak memiliki akses untuk tindakan tersebut.", 403) } as const;
    }
    return { user } as const;
  } catch {
    return { response: errorResponse("Layanan autentikasi sedang tidak tersedia.", 503) } as const;
  }
}
