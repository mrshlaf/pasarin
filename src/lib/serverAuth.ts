// Modul Autentikasi Sesi Server dan Manajemen Kredensial Basis Data Supabase (PSR-2).
// Menangani pembuatan token sesi bertanda tangan kriptografis HMAC-SHA256 (HttpOnly cookies),
// verifikasi keabsahan tanda tangan secara timing-safe, autentikasi langsung ke tabel `auth.users`,
// serta penyemaian (seeding) akun pasar massal ke skema Supabase Auth.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { isAppRole, resolveLoginEmail, type AuthUser } from "@/data/accounts";
import { MARKET_ACCOUNTS, accountEmail } from "@/data/marketAccounts";
import { getDatabasePool } from "@/lib/database";

// Nama cookie sesi server terotentikasi HttpOnly (PSR-2).
export const SESSION_COOKIE = "pasarin_session";

// Masa aktif sesi server dalam detik (8 jam durasi operasional harian pasar) (PSR-2).
export const SESSION_SECONDS = 8 * 60 * 60;

// Konfigurasi atribut keamanan cookie sesi server (HttpOnly, SameSite Lax, Secure) (PSR-2).
// Pengaturan cookie sesi: httpOnly agar tidak terbaca JavaScript, sameSite lax, dan secure hanya di produksi.
export const sessionCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_SECONDS,
};

// Memeriksa apakah mode autentikasi berbasis sesi server sedang diaktifkan.
export function serverAuthEnabled() {
  return process.env.PASARIN_SERVER_AUTH === "1" || process.env.NEXT_PUBLIC_PASARIN_SERVER_AUTH === "1";
}

// Mengambil nilai kunci rahasia untuk menandatangani token sesi server.
function sessionSecret() {
  const secret = process.env.PASARIN_SESSION_SECRET;
  if (secret) return secret;
  // Fallback: turunkan kunci terpisah dari seed secret agar nilai mentahnya tidak dipakai untuk dua keperluan.
  const seed = process.env.PASARIN_SEED_SECRET;
  if (!seed) throw new Error("PASARIN_SESSION_SECRET belum diatur.");
  return createHmac("sha256", seed).update("pasarin-session-signing-v1").digest("base64url");
}

// Menandatangani muatan sesi menggunakan HMAC-SHA256 untuk perlindungan integritas cookie.
function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

// Membuat token sesi bertanda tangan kriptografis HMAC-SHA256 untuk disimpan dalam HttpOnly cookie.
export function createSessionToken(user: AuthUser) {
  // Muatan sesi berisi profil akun dan waktu kedaluwarsa (detik epoch), lalu dikodekan base64url.
  // Muatan sesi: data pengguna ditambah waktu kedaluwarsa (detik epoch), dikodekan base64url; tanda tangan HMAC ditambahkan oleh pemanggil.
  const payload = Buffer.from(JSON.stringify({
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

// Memvalidasi integritas tanda tangan dan masa berlaku token sesi server sebelum mempercayai data muatan.
function verifySessionToken(token: string): AuthUser | null {
  // Format token: muatan.tanda_tangan.
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  try {
    // Tanda tangan dihitung ulang dan dibandingkan timing-safe agar tidak bocor lewat selisih waktu.
    const expected = Buffer.from(sign(payload));
    const provided = Buffer.from(signature);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as Partial<AuthUser> & { exp?: number };
    // Token kedaluwarsa ditolak.
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    // Semua field wajib dicek tipenya karena muatan berasal dari cookie.
    // Validasi bentuk sesi: id, email, nama, organisasi harus teks dan peran harus peran aplikasi; selain itu sesi ditolak.
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

// Mengekstrak dan memverifikasi profil pengguna dari cookie sesi permintaan HTTP masuk.
export function readSessionUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

// Representasi baris entri tabel `auth.users` PostgreSQL Supabase (PSR-2).
interface AccountRow {
  id: string;
  email: string;
  // Metadata yang hanya bisa ditulis server: peran dan ID kios.
  raw_app_meta_data: Record<string, unknown> | null;
  // Metadata tampilan: nama dan organisasi.
  raw_user_meta_data: Record<string, unknown> | null;
}

// Mengonversi baris akun pengguna tabel `auth.users` PostgreSQL menjadi objek profil AuthUser.
function profileFromRow(row: AccountRow): AuthUser | null {
  // Peran dan ID kios disimpan di app_metadata yang hanya bisa diubah server; nama dan organisasi di user_metadata.
  const app = row.raw_app_meta_data ?? {};
  const meta = row.raw_user_meta_data ?? {};
  const role = app.pasarin_role;
  // Akun tanpa peran PASARIN yang valid tidak dianggap pengguna aplikasi.
  // Peran dibaca dari metadata aplikasi; peran tak dikenal berarti akun tidak boleh masuk.
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

// Mengautentikasi pengguna langsung ke tabel `auth.users` Supabase PostgreSQL menggunakan ekstensi pgcrypto.
export async function authenticateAccount(username: string, password: string): Promise<AuthUser | null> {
  // Kata sandi dicocokkan di database dengan pgcrypto; akun terhapus atau diblokir tidak lolos.
  // Mencari akun lokal berdasarkan email di tabel auth.users.
  const result = await getDatabasePool().query<AccountRow>(
    `select id, email, raw_app_meta_data, raw_user_meta_data
     from auth.users
     where email = $1
       and deleted_at is null
       and (banned_until is null or banned_until < now())
       and encrypted_password is not null
       and encrypted_password = extensions.crypt($2, encrypted_password)
     limit 1`,
    [resolveLoginEmail(username), password],
  );
  const row = result.rows[0];
  return row ? profileFromRow(row) : null;
}

// Mengambil dan memvalidasi ulang profil pengguna yang masih aktif berdasarkan ID akun di basis data.
// Mencari akun aktif (belum dihapus) berdasarkan ID.
export async function findActiveAccount(id: string): Promise<AuthUser | null> {
  const { rows } = await getDatabasePool().query<AccountRow>(
    `select id, email, raw_app_meta_data, raw_user_meta_data
     from auth.users
     where id = $1 and deleted_at is null and (banned_until is null or banned_until < now())`,
    [id],
  );
  return rows[0] ? profileFromRow(rows[0]) : null;
}

// Menyemai (seed) atau menyinkronkan seluruh akun pasar ke dalam tabel auth.users Supabase.
// Menginjeksi metadata peran aplikasi (app_metadata) dan enkripsi kata sandi via pgcrypto Blowfish.
export async function seedAccounts() {
  // Satu koneksi khusus dengan transaksi agar seed akun semua-atau-tidak-sama-sekali.
  // Penyemaian akun dilakukan dalam satu transaksi: semua akun contoh berhasil atau tidak ada yang berubah.
  const client = await getDatabasePool().connect();
  const actorIds: Record<string, string> = {};
  try {
    await client.query("begin");
    for (const account of MARKET_ACCOUNTS) {
      const email = accountEmail(account.username);
      // Metadata peran yang dibaca profileFromRow saat login.
      // Metadata aplikasi akun contoh: penyedia email, peran PASARIN, dan kios untuk pedagang.
      const appMetadata = JSON.stringify({
        provider: "email",
        providers: ["email"],
        pasarin_role: account.role,
        pasarin_username: account.username,
        ...(account.vendorId ? { pasarin_vendor_id: account.vendorId } : {}),
      });
      const userMetadata = JSON.stringify({ name: account.name, organization: account.organization });
      // Akun yang sudah ada diperbarui (kata sandi disetel ulang), yang belum ada dibuat baru.
      // Cek akun sudah ada (belum dihapus) agar penyemaian bisa diulang tanpa duplikat.
      const existing = await client.query<{ id: string }>(
        "select id from auth.users where email = $1 and deleted_at is null limit 1",
        [email],
      );
      let userId = existing.rows[0]?.id;
      if (userId) {
        // Identitas email dibuat untuk akun baru agar bisa masuk lewat Supabase Auth.
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
      // Identitas email diperlukan Supabase Auth agar akun bisa login; upsert supaya aman dijalankan ulang.
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
      // Simpan ID akun per username untuk dipakai seed data pasar.
      actorIds[account.username] = userId;
    }
    await client.query("commit");
    return actorIds;
  } catch (error) {
    // Batalkan seluruh transaksi bila ada akun yang gagal.
    // Gagal di tengah jalan: batalkan seluruh transaksi lalu lempar ulang galatnya; koneksi selalu dikembalikan ke pool.
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

// Menghitung jumlah akun pengguna pasar yang saat ini tersimpan aktif di skema Supabase Auth.
// Menghitung akun PASARIN yang aktif di basis data.
export async function countMarketAccounts() {
  const result = await getDatabasePool().query<{ count: number }>(
    "select count(*)::int as count from auth.users where raw_app_meta_data ? 'pasarin_role' and deleted_at is null",
  );
  return result.rows[0]?.count ?? 0;
}
