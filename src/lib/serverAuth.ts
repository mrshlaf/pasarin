import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { isAppRole, type AuthUser } from "@/data/accounts";
import { MARKET_ACCOUNTS, accountEmail } from "@/data/marketAccounts";
import { getDatabasePool } from "@/lib/database";

export const SESSION_COOKIE = "pasarin_session";
export const SESSION_SECONDS = 8 * 60 * 60;

export const sessionCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_SECONDS,
};

/** Server auth is opt-in so Supabase Auth can take over without a schema change. */
export function serverAuthEnabled() {
  return process.env.PASARIN_SERVER_AUTH === "1" || process.env.NEXT_PUBLIC_PASARIN_SERVER_AUTH === "1";
}

function sessionSecret() {
  const secret = process.env.PASARIN_SESSION_SECRET || process.env.PASARIN_SEED_SECRET;
  if (!secret) throw new Error("PASARIN_SESSION_SECRET belum diatur.");
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

/** Creates an HttpOnly session token for a Supabase Auth user. */
export function createSessionToken(user: AuthUser) {
  const payload = Buffer.from(JSON.stringify({
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Verifies the signature and expiration before trusting any session field. */
function verifySessionToken(token: string): AuthUser | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  try {
    const expected = Buffer.from(sign(payload));
    const provided = Buffer.from(signature);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as Partial<AuthUser> & { exp?: number };
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof data.id !== "string" || typeof data.email !== "string" || typeof data.name !== "string" ||
      typeof data.organization !== "string" || !isAppRole(data.role)) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      organization: data.organization,
      role: data.role,
      ...(typeof data.vendorId === "string" ? { vendorId: data.vendorId } : {}),
    };
  } catch {
    return null;
  }
}

/** Reads the signed server session from the request cookie. */
export function readSessionUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

interface AccountRow {
  id: string;
  email: string;
  raw_app_meta_data: Record<string, unknown> | null;
  raw_user_meta_data: Record<string, unknown> | null;
}

function profileFromRow(row: AccountRow): AuthUser | null {
  const app = row.raw_app_meta_data ?? {};
  const meta = row.raw_user_meta_data ?? {};
  const role = app.pasarin_role;
  if (!isAppRole(role)) return null;
  const vendorId = app.pasarin_vendor_id;
  return {
    id: row.id,
    email: row.email,
    name: typeof meta.name === "string" ? meta.name : row.email,
    organization: typeof meta.organization === "string" ? meta.organization : "Pasarin",
    role,
    ...(typeof vendorId === "string" ? { vendorId } : {}),
  };
}

/** Checks a username and bcrypt hash against Supabase Auth's own user table. */
export async function authenticateAccount(username: string, password: string): Promise<AuthUser | null> {
  const result = await getDatabasePool().query<AccountRow>(
    `select id, email, raw_app_meta_data, raw_user_meta_data
     from auth.users
     where email = $1
       and deleted_at is null
       and (banned_until is null or banned_until < now())
       and encrypted_password is not null
       and encrypted_password = extensions.crypt($2, encrypted_password)
     limit 1`,
    [accountEmail(username.trim().toLowerCase()), password],
  );
  const row = result.rows[0];
  return row ? profileFromRow(row) : null;
}

/** Creates or refreshes every market account inside Supabase Auth. */
export async function seedAccounts() {
  const client = await getDatabasePool().connect();
  const actorIds: Record<string, string> = {};
  try {
    await client.query("begin");
    for (const account of MARKET_ACCOUNTS) {
      const email = accountEmail(account.username);
      const appMetadata = JSON.stringify({
        provider: "email",
        providers: ["email"],
        pasarin_role: account.role,
        pasarin_username: account.username,
        ...(account.vendorId ? { pasarin_vendor_id: account.vendorId } : {}),
      });
      const userMetadata = JSON.stringify({ name: account.name, organization: account.organization });
      const existing = await client.query<{ id: string }>(
        "select id from auth.users where email = $1 and deleted_at is null limit 1",
        [email],
      );
      let userId = existing.rows[0]?.id;
      if (userId) {
        await client.query(
          `update auth.users set
             encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')),
             email_confirmed_at = now(),
             raw_app_meta_data = $3::jsonb,
             raw_user_meta_data = $4::jsonb,
             updated_at = now(),
             banned_until = null
           where id = $1`,
          [userId, account.password, appMetadata, userMetadata],
        );
      } else {
        const inserted = await client.query<{ id: string }>(
          `insert into auth.users
             (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
              raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
           values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid,
             'authenticated', 'authenticated', $1,
             extensions.crypt($2, extensions.gen_salt('bf')), now(),
             $3::jsonb, $4::jsonb, now(), now())
           returning id`,
          [email, account.password, appMetadata, userMetadata],
        );
        userId = inserted.rows[0].id;
      }
      await client.query(
        `insert into auth.identities
           (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
         values ($1, $2, $3::jsonb, 'email', now(), now(), now())
         on conflict (provider_id, provider) do update set
           user_id = excluded.user_id,
           identity_data = excluded.identity_data,
           updated_at = now()`,
        [email, userId, JSON.stringify({ sub: userId, email, email_verified: true, phone_verified: false })],
      );
      actorIds[account.username] = userId;
    }
    await client.query("commit");
    return actorIds;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Counts the market identities currently stored in Supabase Auth. */
export async function countMarketAccounts() {
  const result = await getDatabasePool().query<{ count: number }>(
    "select count(*)::int as count from auth.users where raw_app_meta_data ? 'pasarin_role' and deleted_at is null",
  );
  return result.rows[0]?.count ?? 0;
}
