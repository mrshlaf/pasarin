import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { accountProfile, type AppRole } from "@/data/accounts";
import { supabase } from "@/lib/supabase";
import { errorResponse } from "@/lib/api-response";
import { readLocalTestUser } from "@/lib/localTestAuth";
import { serverAuthEnabled, readSessionUser } from "@/lib/serverAuth";

/** Compares server-provided secrets without exposing the expected value. */
export function matchesSecret(value: string | null | undefined, secret: string | undefined) {
  if (!value || !secret) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Enforces the verified role from Supabase, the server session, or a localhost-only test session. */
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
