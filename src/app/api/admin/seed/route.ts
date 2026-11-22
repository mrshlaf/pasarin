// Rute API Penyemaian Awal Data Pengguna dan Status Pasar (Database & Market Seeder) (PSR-2 / PSR-4).
// Memfasilitasi inisialisasi satu kali atau penyetelan ulang (reset) data 142 akun pasar ke Supabase Auth
// serta pembentukan snapshot state pasar awal secara atomik.

import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api-response";
import { matchesSecret, requireApiRole } from "@/lib/apiAuth";
import { MARKET_ACCOUNTS, localActorId } from "@/data/marketAccounts";
import { getServiceRoleClient } from "@/lib/supabase";
import { getDatabasePool, databaseConfigured } from "@/lib/database";
import { countMarketAccounts, seedAccounts } from "@/lib/serverAuth";
import { getServerSimulationState, seedMarketStateServer } from "@/lib/serverSimulationState";

// Wajib Node.js karena rute ini memakai pool Postgres dan Supabase admin API.
export const runtime = "nodejs";
// Status seed dibaca langsung dari basis data, jadi respons tidak boleh di-cache saat build.
export const dynamic = "force-dynamic";

// Body opsional; bendera `reset` diterima agar klien lama tetap valid.
const bodySchema = z.object({ reset: z.boolean().optional() }).optional();

// Mengambil rahasia seed dari header `x-pasarin-seed-secret`, atau dari Bearer token sebagai cadangan.
function seedSecret(req: NextRequest) {
  return req.headers.get("x-pasarin-seed-secret") ??
    req.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
}

// Memvalidasi otorisasi administratif untuk rute penyemaian (seeding) massal.
// Di luar produksi cukup sesi admin; di produksi wajib kunci PASARIN_SEED_SECRET (401) dan kredensial basis data (503).
async function authorizeSeed(req: NextRequest) {
  // Di luar produksi cukup sesi admin; ID aktor lokal diturunkan dari username.
  if (process.env.NODE_ENV !== "production") {
    const auth = await requireApiRole(req, ["admin"]);
    if ("response" in auth) return { response: auth.response } as const;
    return { actorIds: Object.fromEntries(
      MARKET_ACCOUNTS.map((account) => [account.username, localActorId(account.username)]),
    ) } as const;
  }
  // Di produksi hanya pemegang kunci server yang boleh menyemai; dibandingkan timing-safe.
  if (!matchesSecret(seedSecret(req), process.env.PASARIN_SEED_SECRET)) {
    return { response: errorResponse("Seed hanya dapat dijalankan dengan kunci server.", 401) } as const;
  }
  if (!databaseConfigured() && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { response: errorResponse("SUPABASE_DB_URL atau SUPABASE_SERVICE_ROLE_KEY belum diatur di Vercel.", 503) } as const;
  }
  return { actorIds: null } as const;
}

// Memeriksa kesiapan tabel state simulasi dan menghitung jumlah akun pasar yang telah disemai.
export async function GET(req: NextRequest) {
  const auth = await authorizeSeed(req);
  if (auth.response) return auth.response;

  // Jalur Postgres: periksa tabel state dan hitung akun yang sudah ada.
  if (databaseConfigured()) {
    // Kegagalan membaca tabel tidak menggagalkan respons; galatnya dilaporkan di marketTableError.
    try {
      const pool = getDatabasePool();
      let marketTableReady = false;
      let marketTableError: string | null = null;
      // Jalur Supabase REST: baca baris state dan daftar pengguna lewat API admin (maksimal 1.000).
      try {
        await pool.query("select id from public.pasarin_simulation_state where id = $1", ["market"]);
        marketTableReady = true;
      } catch (error) {
        marketTableError = error instanceof Error ? error.message : "Tabel state belum siap.";
      }
      const accounts = await countMarketAccounts().catch(() => 0);
      return successResponse({
        backend: "postgres", accounts: accounts, expectedMarketAccounts: MARKET_ACCOUNTS.length,
        marketTableReady, marketTableError,
      });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Status seed tidak dapat dibaca.", 503);
    }
  }

  // Pengembangan tanpa basis data memakai berkas lokal, jadi akun dianggap selalu lengkap.
  if (process.env.NODE_ENV !== "production") {
    return successResponse({ backend: "local-file", accounts: MARKET_ACCOUNTS.length, marketTableReady: true });
  }
  try {
    const client = getServiceRoleClient();
    const [table, users] = await Promise.all([
      client.from("pasarin_simulation_state").select("id").eq("id", "market").maybeSingle(),
      client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    return successResponse({
      backend: "supabase", accounts: users.data?.users.length ?? 0, expectedAccounts: MARKET_ACCOUNTS.length,
      marketTableReady: !table.error, marketTableError: table.error?.message ?? null,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Status seed tidak dapat dibaca.", 503);
  }
}

// Membuat atau memperbarui 142 akun pasar ke Supabase Auth lalu menyemai snapshot state pasar secara atomik.
export async function POST(req: NextRequest) {
  const auth = await authorizeSeed(req);
  if (auth.response) return auth.response;
  // Body kosong atau bukan JSON diperlakukan sebagai objek kosong.
  const input = await bodySchema.safeParseAsync(await req.json().catch(() => ({})));
  if (!input.success) return errorResponse("Format permintaan seed tidak valid.", 400);
  try {
    // actorIds memetakan username ke ID akun, dipakai seed state agar klaim terkait akun yang benar.
    let actorIds = auth.actorIds;
    if (databaseConfigured()) {
      actorIds = await seedAccounts();
    } else if (!actorIds) {
      // Tanpa SUPABASE_DB_URL, akun dibuat lewat Supabase Auth admin; akun yang sudah ada diperbarui, bukan diduplikasi.
      const client = getServiceRoleClient();
      const { data: list, error: listError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw listError;
      // Indeks akun yang sudah ada menurut email supaya dibuat atau diperbarui, bukan diduplikasi.
      const existing = new Map(list.users.map((user) => [user.email?.toLowerCase(), user]));
      actorIds = {};
      for (const account of MARKET_ACCOUNTS) {
        const email = `${account.username}@pasarin.id`;
        const metadata = {
          password: account.password,
          email_confirm: true,
          app_metadata: {
            pasarin_role: account.role,
            pasarin_username: account.username,
            ...(account.vendorId ? { pasarin_vendor_id: account.vendorId } : {}),
          },
          user_metadata: { name: account.name, organization: account.organization },
        };
        const current = existing.get(email);
        const result = current
          ? await client.auth.admin.updateUserById(current.id, metadata)
          : await client.auth.admin.createUser({ email, ...metadata });
        if (result.error || !result.data.user) {
          throw new Error(`Akun ${account.username} gagal dibuat: ${result.error?.message ?? "tanpa user"}`);
        }
        actorIds[account.username] = result.data.user.id;
      }
    }

    // Seed state dijalankan setelah semua akun siap; hasilnya satu revisi atomik.
    if (!actorIds) throw new Error("Daftar akun pasar belum tersedia.");
    const seeded = await seedMarketStateServer(actorIds);
    if (!seeded.success) return errorResponse(seeded.message, seeded.status);
    const state = await getServerSimulationState();
    return successResponse({
      message: seeded.message,
      accounts: MARKET_ACCOUNTS.length,
      stocks: state.stocks.length,
      offers: state.offers.length,
      transactions: state.transactions.length,
    });
  } catch (error) {
    console.error("Cannot seed Pasarin", error);
    return errorResponse(error instanceof Error ? error.message : "Seed pasar gagal.", 503);
  }
}
