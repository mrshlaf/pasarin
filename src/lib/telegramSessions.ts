/**
 * Modul Pengelola Sesi Akun Pengguna Multi-Peran pada Chat Telegram (PSR-38).
 * Mengatur autentikasi Mini App via initData (HMAC-SHA256 WebAppData),
 * pembatasan laju percobaan login (Rate Limiting 10x per 15 menit),
 * persistensi multisesi akun terpisah per obrolan, serta pemilihan sesi aktif secara atomik.
 */

import { createHmac, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { accountProfile, resolveLoginEmail, type AuthUser } from "@/data/accounts";
import { databaseConfigured, getDatabasePool } from "@/lib/database";
import { matchesSecret } from "@/lib/apiAuth";
import { localTestProfile } from "@/lib/localTestAuth";
import { authenticateAccount, findActiveAccount, serverAuthEnabled, SESSION_SECONDS } from "@/lib/serverAuth";
import { getServiceRoleClient, supabaseAuthConfigured } from "@/lib/supabase";

/**
 * Rekaman sesi akun pengguna yang tersimpan dalam obrolan Telegram (PSR-38).
 */
interface AccountSession {
  key: string;
  user: AuthUser;
  expiresAt: number;
}

/**
 * Status obrolan Telegram mencakup akun aktif, multisesi tersimpan, dan kuota percobaan login (PSR-38).
 */
interface ChatState {
  active: string | null;
  accounts: AccountSession[];
  attempts?: { count: number; until: number };
}

const table = "pasarin_simulation_state";
declare global {
  var pasarinTelegramSessions: Map<number, ChatState> | undefined;
}

const local = globalThis.pasarinTelegramSessions ??= new Map<number, ChatState>();
const loginWindow = 15 * 60_000;

/**
 * Memvalidasi data peluncuran Mini App Telegram (initData) dan mengembalikan Telegram User ID yang sah.
 * Menegakkan verifikasi tanda tangan kriptografis HMAC-SHA256 dengan kunci turunan dari token bot.
 *
 * @param initData - String URL parameter dari Telegram WebApp.initData.
 * @param botToken - Token bot Telegram rahasia dari environment.
 * @param now - Stempel waktu waktu saat ini untuk verifikasi auth_date.
 * @returns ID pengguna Telegram (angka positif) jika sah, atau null jika data dipalsukan/kedaluwarsa.
 */
export function telegramLoginChat(initData: string, botToken: string, now = Date.now()) {
  const params = new URLSearchParams(initData);
  const entries = [...params.entries()];
  if (new Set(params.keys()).size !== entries.length) return null;
  const hash = params.get("hash");
  const issued = Number(params.get("auth_date")) * 1000;
  if (!hash || !Number.isSafeInteger(issued) || issued > now + 30_000 || issued < now - loginWindow) return null;
  const data = entries.filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => key + "=" + value).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  if (!matchesSecret(hash, createHmac("sha256", secret).update(data).digest("hex"))) return null;
  const rawUser = params.get("user");
  if (!rawUser) return null;
  try {
    const user = JSON.parse(rawUser);
    return Number.isSafeInteger(user?.id) && user.id > 0 ? user.id as number : null;
  } catch {
    return null;
  }
}

/**
 * Membaca rekaman sesi obrolan Telegram dari penyimpanan persisten (PostgreSQL, Supabase REST, atau memori lokal).
 *
 * @param chatId - ID unik obrolan Telegram.
 * @returns Objek berisi revisi CAS dan ChatState jika ada.
 */
async function readChat(chatId: number) {
  const id = "telegram:" + chatId;
  if (databaseConfigured()) {
    const { rows } = await getDatabasePool().query<{ revision: string; state: ChatState }>(
      "select revision::text, state from public.pasarin_simulation_state where id = $1", [id],
    );
    return rows[0] ? { revision: Number(rows[0].revision), state: rows[0].state } : null;
  }
  if (process.env.NODE_ENV === "production" || process.env.PASARIN_STATE_BACKEND === "supabase") {
    const { data, error } = await getServiceRoleClient().from(table).select("revision,state").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as { revision: number; state: ChatState } | null;
  }
  const state = local.get(chatId);
  return state ? { revision: 0, state } : null;
}

/**
 * Memperbarui state obrolan Telegram secara atomik dengan protokol penguncian revisi optimistik (CAS).
 *
 * @param chatId - ID unik obrolan Telegram.
 * @param change - Fungsi callback yang memodifikasi state sesi obrolan.
 * @returns Hasil komputasi dari fungsi callback change.
 */
async function changeChat<T>(chatId: number, change: (state: ChatState) => T): Promise<T> {
  const id = "telegram:" + chatId;
  const remote = databaseConfigured() || process.env.NODE_ENV === "production" || process.env.PASARIN_STATE_BACKEND === "supabase";
  if (!remote) {
    const state = local.get(chatId) ?? { active: null, accounts: [] };
    const result = change(state);
    local.set(chatId, state);
    return result;
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await readChat(chatId);
    const state = current?.state ?? { active: null, accounts: [] };
    const result = change(state);
    const revision = current?.revision ?? 0;
    if (databaseConfigured()) {
      const pool = getDatabasePool();
      const saved = revision
        ? await pool.query("update public.pasarin_simulation_state set revision = revision + 1, state = $2 where id = $1 and revision = $3",
          [id, state, revision])
        : await pool.query("insert into public.pasarin_simulation_state (id, revision, state) values ($1, 1, $2) on conflict do nothing", [id, state]);
      if (saved.rowCount) return result;
    } else {
      const rows = getServiceRoleClient().from(table);
      const { data, error } = revision
        ? await rows.update({ revision: revision + 1, state }).eq("id", id).eq("revision", revision).select("id")
        : await rows.upsert({ id, revision: 1, state }, { onConflict: "id", ignoreDuplicates: true }).select("id");
      if (error) throw error;
      if (data.length) return result;
    }
  }
  throw new Error("Sesi Telegram sedang berubah.");
}

/**
 * Menegakkan pembatasan laju (rate limiting) percobaan masuk: maksimal 10 kali per 15 menit per chat.
 *
 * @param chatId - ID obrolan Telegram.
 * @param now - Stempel waktu waktu saat ini.
 * @returns True jika percobaan diizinkan, false jika kuota terlampaui.
 */
export function allowTelegramLogin(chatId: number, now = Date.now()) {
  return changeChat(chatId, (state) => {
    if (!state.attempts || state.attempts.until <= now) state.attempts = { count: 0, until: now + loginWindow };
    if (state.attempts.count >= 10) return false;
    state.attempts.count++;
    return true;
  });
}

/**
 * Memverifikasi kredensial akun pasar yang diajukan melalui Telegram terhadap otoritas autentikasi aktif.
 *
 * @param identifier - Username akun pasar atau email.
 * @param password - Kata sandi dalam teks polos.
 * @param allowLocalTest - Apakah akun uji coba lokal diizinkan.
 * @returns Profil AuthUser jika kredensial cocok, atau null.
 */
export async function authenticateTelegramAccount(identifier: string, password: string, allowLocalTest: boolean) {
  if (serverAuthEnabled()) return authenticateAccount(identifier, password);
  if (allowLocalTest) {
    const username = identifier.toLowerCase();
    const demo = localTestProfile(username);
    if (demo) return password === username ? demo : null;
  }
  if (!supabaseAuthConfigured) throw new Error("Layanan akun belum dikonfigurasi.");
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email: resolveLoginEmail(identifier), password });
  if (error && error.status !== 400 && error.status !== 401) throw error;
  return data.user ? accountProfile(data.user) : null;
}

/**
 * Menyegarkan dan memvalidasi ulang peran pengguna dari basis data sebelum menjalankan aksi operasional di Telegram.
 *
 * @param user - Profil akun tersimpan dalam sesi.
 * @returns Profil AuthUser terbaru jika akun masih sah, atau null jika akun telah diblokir/dihapus.
 */
export async function currentTelegramAccount(user: AuthUser) {
  if (databaseConfigured() && serverAuthEnabled()) return findActiveAccount(user.id);
  if (process.env.NODE_ENV !== "production" && process.env.PASARIN_STATE_BACKEND !== "supabase" && !databaseConfigured()) return user;
  const { data, error } = await getServiceRoleClient().auth.admin.getUserById(user.id);
  if (error && error.status !== 404) throw error;
  if (!data.user || (data.user.banned_until && Date.parse(data.user.banned_until) > Date.now())) return null;
  return accountProfile(data.user);
}

/**
 * Mengaktifkan sesi akun terotentikasi dalam obrolan Telegram dengan mempertahankan hingga 8 multisesi tersimpan.
 *
 * @param chatId - ID unik obrolan Telegram.
 * @param user - Profil akun pasar yang diautentikasi.
 * @param now - Stempel waktu saat ini.
 * @returns Objek sesi aktif AccountSession.
 */
export function startTelegramSession(chatId: number, user: AuthUser, now = Date.now()) {
  const session = { user, key: randomBytes(6).toString("base64url"), expiresAt: now + SESSION_SECONDS * 1000 };
  return changeChat(chatId, (state) => {
    state.accounts = [session, ...state.accounts.filter((item) => item.user.id !== user.id && item.expiresAt > now)].slice(0, 8);
    state.active = session.key;
    return session;
  });
}

/**
 * Mengambil daftar sesi akun yang masih berlaku dalam obrolan Telegram dan sesi yang sedang aktif saat ini.
 *
 * @param chatId - ID obrolan Telegram.
 * @param now - Stempel waktu saat ini.
 * @returns Objek berisi array akun tersimpan dan akun aktif.
 */
export async function telegramChatSessions(chatId: number, now = Date.now()) {
  const chat = await readChat(chatId);
  const accounts = chat?.state.accounts.filter((item) => item.expiresAt > now) ?? [];
  return { accounts, active: accounts.find((item) => item.key === chat?.state.active) };
}

/**
 * Mengalihkan akun aktif obrolan Telegram ke salah satu akun tersimpan menggunakan session key.
 *
 * @param chatId - ID obrolan Telegram.
 * @param key - Session key dari akun tersimpan.
 * @param now - Stempel waktu saat ini.
 * @returns Objek sesi yang berhasil diaktifkan.
 */
export function selectTelegramSession(chatId: number, key: string, now = Date.now()) {
  return changeChat(chatId, (state) => {
    const session = state.accounts.find((item) => item.key === key && item.expiresAt > now);
    if (session) state.active = session.key;
    return session;
  });
}

/**
 * Mencabut sesi akun aktif di obrolan Telegram tanpa memengaruhi sesi web peramban pengguna.
 *
 * @param chatId - ID obrolan Telegram.
 * @param key - Session key yang akan diakhiri.
 */
export function endTelegramSession(chatId: number, key: string) {
  return changeChat(chatId, (state) => {
    if (state.active !== key) return;
    state.accounts = state.accounts.filter((item) => item.key !== key);
    state.active = null;
  });
}
