import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api-response";
import { matchesSecret, requireApiRole } from "@/lib/apiAuth";
import { DEMO_ACCOUNTS, demoActorId } from "@/data/demoAccounts";
import { getServiceRoleClient } from "@/lib/supabase";
import { getServerSimulationState, seedMarketStateServer } from "@/lib/serverSimulationState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ reset: z.boolean().optional() }).optional();

function seedSecret(req: NextRequest) {
  return req.headers.get("x-pasarin-seed-secret") ??
    req.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
}

/** Protects the one-time account and market seed route. */
async function authorizeSeed(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    const auth = await requireApiRole(req, ["admin"]);
    return auth.response ? { response: auth.response } as const : { actorIds: Object.fromEntries(
      DEMO_ACCOUNTS.map((account) => [account.username, demoActorId(account.username)]),
    ) } as const;
  }
  if (!matchesSecret(seedSecret(req), process.env.PASARIN_SEED_SECRET)) {
    return { response: errorResponse("Seed hanya dapat dijalankan dengan kunci server.", 401) } as const;
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { response: errorResponse("SUPABASE_SERVICE_ROLE_KEY belum diatur di Vercel.", 503) } as const;
  }
  return { actorIds: null } as const;
}

/** Reports whether the Supabase state table and the demo accounts are ready. */
export async function GET(req: NextRequest) {
  const auth = await authorizeSeed(req);
  if (auth.response) return auth.response;
  if (process.env.NODE_ENV !== "production") {
    return successResponse({ backend: "local-file", accounts: DEMO_ACCOUNTS.length, marketTableReady: true });
  }
  try {
    const client = getServiceRoleClient();
    const [table, users] = await Promise.all([
      client.from("pasarin_simulation_state").select("id").eq("id", "market").maybeSingle(),
      client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    return successResponse({
      backend: "supabase",
      accounts: users.data?.users.length ?? 0,
      demoAccounts: DEMO_ACCOUNTS.length,
      marketTableReady: !table.error,
      marketTableError: table.error?.message ?? null,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Status seed tidak dapat dibaca.", 503);
  }
}

/** Creates or refreshes all 47 Supabase demo accounts, then seeds the market atomically. */
export async function POST(req: NextRequest) {
  const auth = await authorizeSeed(req);
  if (auth.response) return auth.response;
  const input = await bodySchema.safeParseAsync(await req.json().catch(() => ({})));
  if (!input.success) return errorResponse("Format permintaan seed tidak valid.", 400);
  try {
    let actorIds = auth.actorIds;
    if (!actorIds) {
      const client = getServiceRoleClient();
      const { data: list, error: listError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw listError;
      const existing = new Map(list.users.map((user) => [user.email?.toLowerCase(), user]));
      actorIds = {};
      for (const account of DEMO_ACCOUNTS) {
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

    const seeded = await seedMarketStateServer(actorIds);
    if (!seeded.success) return errorResponse(seeded.message, seeded.status);
    const state = await getServerSimulationState();
    return successResponse({
      message: seeded.message,
      accounts: DEMO_ACCOUNTS.length,
      stocks: state.stocks.length,
      offers: state.offers.length,
      transactions: state.transactions.length,
    });
  } catch (error) {
    console.error("Cannot seed Pasarin", error);
    return errorResponse(error instanceof Error ? error.message : "Seed pasar gagal.", 503);
  }
}
