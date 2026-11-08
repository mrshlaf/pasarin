import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AuthApiError, type User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { GET as state, POST as update } from "../src/app/api/simulation/state/route";
import { GET as catalog, POST as claim } from "../src/app/api/offers/claim/route";
import { GET as sweep } from "../src/app/api/cron/afternoon-sweep/route";
import { POST as telegram } from "../src/app/api/telegram/webhook/route";
import { POST as ask } from "../src/app/api/orchestrator/query/route";
import { POST as localLogin } from "../src/app/api/auth/local-test/route";
import { POST as review } from "../src/app/api/orchestrator/run/route";
import { resetEnvCache } from "../src/lib/env";
import { supabase } from "../src/lib/supabase";
import { APP_ROLES, type AppRole } from "../src/data/accounts";
import { evaluateMarketStock, type ServerState } from "../src/lib/serverSimulationState";
import type { RescueOffer } from "../src/types/market";

const directory = mkdtempSync(join(tmpdir(), "pasarin-market-test-"));
const stateFile = join(directory, "state.json");
Object.assign(process.env, {
  NODE_ENV: "test",
  PASARIN_STATE_FILE: stateFile,
  CRON_SECRET: "cron-test-secret",
  TELEGRAM_WEBHOOK_SECRET: "telegram-test-secret",
  TELEGRAM_CHAT_ACCOUNTS: JSON.stringify({
    11: { id: "vendor", role: "vendor", name: "Pedagang", vendorId: "vendor_kramat_01" },
    22: { id: "warteg", role: "warteg", name: "Warteg" },
    33: { id: "logistics", role: "logistics", name: "Kurir" },
    44: { id: "manager", role: "manager", name: "Pengelola" },
  }),
});
delete process.env.PASARIN_STATE_BACKEND;
delete process.env.TELEGRAM_BOT_TOKEN;
delete process.env.OPENWEATHER_API_KEY;
resetEnvCache();

const verifyUser = supabase.auth.getUser;
supabase.auth.getUser = async (token) => {
  const role = APP_ROLES.find((item) => item === token);
  if (!role) return { data: { user: null }, error: new AuthApiError("Invalid test token", 401, "bad_jwt") };
  const user: User = {
    id: role, email: role + "@example.test", aud: "authenticated", created_at: new Date().toISOString(),
    app_metadata: { pasarin_role: role, ...(role === "vendor" && { pasarin_vendor_id: "vendor_kramat_01" }) },
    user_metadata: { name: role },
  };
  return { data: { user }, error: null };
};

/** Constructs requests with the same bearer token or Telegram secret used by the route handlers. */
function request(body?: unknown, role?: AppRole, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api", {
    method: body === undefined ? "GET" : "POST",
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...(role ? { Authorization: "Bearer " + role } : {}), ...headers },
  });
}

/** Reads the authorized workspace snapshot, including current decay. */
async function view(role: AppRole) {
  const response = await state(request(undefined, role));
  assert.equal(response.status, 200);
  return (await response.json()).data;
}

/** Simulates an authenticated private Telegram message or button press. */
function sendTelegram(chat: number, id: number, action: string, callback = false) {
  const message = { chat: { id: chat, type: "private" }, from: { id: chat }, text: action };
  return telegram(request({
    update_id: id,
    ...(callback ? { callback_query: { id: String(id), from: { id: chat }, message, data: action } } : { message }),
  }, undefined, { "X-Telegram-Bot-Api-Secret-Token": "telegram-test-secret" }));
}

/** Exercises fresh intake, time-dependent decay, reservation, payment, handover and shared bot state. */
async function run() {
  assert.equal((await state(request())).status, 401);
  assert.equal((await state(request(undefined, undefined, { Authorization: "Bearer invented" }))).status, 401);
  assert.equal((await telegram(request({}))).status, 401);
  assert.equal((await sweep(request(undefined, undefined, { "x-vercel-cron": "1" }))).status, 401);
  assert.equal((await update(request("{", "admin"))).status, 400);
  assert.equal((await update(request({ action: "stock", commodityId: "kangkung", quantityKg: 20 }, "warteg"))).status, 403);
  assert.equal((await view("vendor")).stocks.length, 0);

  assert.equal((await update(request({ action: "stock", commodityId: "kangkung", quantityKg: 20 }, "vendor"))).status, 200);
  const initial = await view("vendor");
  const stock = initial.stocks[0];
  assert.ok(initial.stockHealth[stock.id].decayScore < 0.01);
  const recorded = JSON.parse(readFileSync(stateFile, "utf8")) as ServerState;
  recorded.stocks[0].createdAt = new Date(Date.now() - 3600000).toISOString();
  writeFileSync(stateFile, JSON.stringify(recorded));
  const after = await view("vendor");
  assert.ok(after.stockHealth[stock.id].decayScore > initial.stockHealth[stock.id].decayScore);

  const publish = await update(request({ action: "publish", stockId: stock.id }, "vendor"));
  assert.equal(publish.status, 200);
  const offerId = (await view("vendor")).offers[0].id;
  assert.equal((await (await catalog(request(undefined, "warteg"))).json()).data[0].id, offerId);
  assert.equal((await claim(request({ offerId, role: "warteg" }, "maggot"))).status, 403);
  const claims = await Promise.all([claim(request({ offerId }, "warteg")), claim(request({ offerId }, "warteg"))]);
  assert.deepEqual(claims.map((response) => response.status).sort(), [200, 409]);
  assert.equal((await view("vendor")).offers[0].status, "claimed");
  assert.equal((await view("logistics")).offers.length, 0);
  assert.equal((await update(request({ action: "delivery", offerId }, "logistics"))).status, 409);
  assert.equal((await update(request({ action: "payment", offerId }, "warteg"))).status, 200);
  assert.equal((await view("logistics")).offers[0].paymentStatus, "held_in_escrow");
  assert.equal((await update(request({ action: "delivery", offerId }, "warteg"))).status, 403);
  assert.equal((await update(request({ action: "delivery", offerId }, "logistics"))).status, 200);
  assert.equal((await update(request({ action: "delivery", offerId }, "logistics"))).status, 200);
  const closed = await view("vendor");
  assert.equal(closed.stocks[0].remainingKg, 0);
  assert.equal(closed.transactions.length, 1);
  assert.equal(closed.vendorWalletIdr, closed.transactions[0].amountIdr);
  assert.equal((await view("warteg")).offers[0].status, "settled");

  assert.equal((await sendTelegram(11, 101, "/pasok bayam 12")).status, 200);
  await sendTelegram(11, 101, "/pasok bayam 12");
  const telegramStock = (await view("vendor")).stocks[0];
  assert.equal((await view("vendor")).stocks.length, 2);
  await sendTelegram(11, 102, "publish:" + telegramStock.id, true);
  const botOffer = (await view("warteg")).offers.find((offer: RescueOffer) => offer.status === "active").id;
  await sendTelegram(22, 103, "claim:" + botOffer, true);
  await sendTelegram(22, 104, "pay:" + botOffer, true);
  assert.ok((await view("logistics")).offers.some((offer: RescueOffer) => offer.id === botOffer && offer.status === "claimed"));
  await sendTelegram(33, 105, "deliver:" + botOffer, true);
  assert.equal((await view("warteg")).offers.find((offer: RescueOffer) => offer.id === botOffer).status, "settled");
  assert.equal((await view("vendor")).stocks.find((item: { id: string }) => item.id === telegramStock.id).remainingKg, 0);
  const summary = await (await ask(request({ query: "Berapa pengantaran hari ini?", forceHeuristic: true }, "manager"))).json();
  assert.equal(summary.data.metrics.deliveriesToday, 2);
  assert.equal((await (await sendTelegram(44, 106, "/tanya berapa pengantaran hari ini")).json()).actionTaken, "market_answer");
  for (const [role, min, max] of [["social_kitchen", 0.65, 0.85], ["maggot", 0.85, 1.01]] as const) {
    assert.equal((await update(request({ action: "stock", commodityId: "kangkung", quantityKg: 8 }, "vendor"))).status, 200);
    const saved = JSON.parse(readFileSync(stateFile, "utf8")) as ServerState;
    const lot = saved.stocks[0];
    for (let hours = 1; hours < 150; hours++) {
      lot.createdAt = new Date(Date.now() - hours * 3600000).toISOString();
      const score = evaluateMarketStock(lot, { temperatureC: 32, humidityPercent: 75 })?.decayScore ?? 0;
      if (score >= min && score < max) break;
    }
    writeFileSync(stateFile, JSON.stringify(saved));
    assert.equal((await update(request({ action: "publish", stockId: lot.id }, "vendor"))).status, 200);
    const eligible = (await view(role)).offers.find((item: RescueOffer) => item.stockId === lot.id);
    assert.ok(eligible);
    assert.equal((await claim(request({ offerId: eligible.id, donated: role === "social_kitchen" }, role))).status, 200);
    assert.equal((await update(request({ action: "delivery", offerId: eligible.id }, "logistics"))).status, 200);
    assert.equal((await view(role)).offers[0].status, "settled");
  }
  assert.equal((await review(request({}, "manager"))).status, 403);
  assert.equal((await review(request({}, "admin"))).status, 200);
  for (const role of APP_ROLES) await view(role);
  assert.equal((await sweep(request(undefined, undefined, { Authorization: "Bearer cron-test-secret" }))).status, 200);
  console.log("Seven roles, live decay, concurrent claim, payment, handover, Telegram parity and orchestration passed.");
}

/** Exercises the actual Gemini SDK call with a fake upstream that inspects the market payload. */
async function checkGemini() {
  const fetchBefore = globalThis.fetch;
  process.env.GEMINI_API_KEY = "fixture-gemini-key";
  resetEnvCache();
  let called = false;
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.includes("generativelanguage.googleapis.com")) return fetchBefore(input, init);
    called = true;
    const body = typeof init?.body === "string" ? init.body : input instanceof Request ? await input.text() : "";
    assert.match(body, /deliveriesToday/);
    return Response.json({ candidates: [{ content: { role: "model", parts: [{ text: "Empat pengantaran selesai hari ini." }] }, finishReason: "STOP" }] });
  };
  try {
    const response = await ask(request({ query: "Berapa pengantaran hari ini?" }, "manager"));
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(called, true);
    assert.equal(result.data.source, "gemini");
    assert.equal(result.data.metrics.deliveriesToday, 4);
    console.log("Gemini SDK request and response passed with an isolated upstream.");
  } finally {
    globalThis.fetch = fetchBefore;
    delete process.env.GEMINI_API_KEY;
    resetEnvCache();
  }
}

/** Verifies local credentials and prevents a test session from escaping development. */
async function checkLocalTestSessions() {
  const environment = process.env.NODE_ENV;
  const login = (password: string, headers?: Record<string, string>) =>
    localLogin(request({ username: "pasar1", password }, undefined, headers));

  try {
    Object.assign(process.env, { NODE_ENV: "development" });
    assert.equal((await login("wrong")).status, 401);
    assert.equal((await login("pasar1", { Origin: "http://external.example" })).status, 404);
    assert.equal((await login("pasar1", { "X-Forwarded-For": "192.0.2.10" })).status, 404);
    const response = await login("pasar1");
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.role, "vendor");
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    assert.equal((await state(request(undefined, undefined, { Cookie: cookie }))).status, 200);
    assert.equal((await state(request(undefined, undefined, { Cookie: cookie.replace("pasar1.", "admin1.") }))).status, 401);
    assert.equal((await review(request({}, undefined, { Cookie: cookie }))).status, 403);

    Object.assign(process.env, { NODE_ENV: "production" });
    assert.equal((await login("pasar1")).status, 404);
    assert.equal((await state(request(undefined, undefined, { Cookie: cookie }))).status, 401);
    console.log("Local test sign-in, role enforcement and production isolation passed.");
  } finally {
    Object.assign(process.env, { NODE_ENV: environment });
  }
}

void run().then(checkGemini).then(checkLocalTestSessions).catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  supabase.auth.getUser = verifyUser;
  rmSync(directory, { recursive: true, force: true });
});
