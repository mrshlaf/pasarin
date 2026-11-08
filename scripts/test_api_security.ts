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
import { GET as overview } from "../src/app/api/market/overview/route";
import { GET as forecast } from "../src/app/api/telemetry/weather/route";
import { GET as inspectQuality, POST as recordQuality } from "../src/app/api/quality-gate/validate/route";
import { resetEnvCache } from "../src/lib/env";
import { supabase } from "../src/lib/supabase";
import { APP_ROLES, type AppRole } from "../src/data/accounts";
import { evaluateMarketStock, type ServerState } from "../src/lib/serverSimulationState";
import { startTelegramSession, telegramChatSessions } from "../src/lib/telegramSessions";
import type { RescueOffer } from "../src/types/market";
import { completedDonationLots } from "../src/types/market";

const directory = mkdtempSync(join(tmpdir(), "pasarin-market-test-"));
const stateFile = join(directory, "state.json");
Object.assign(process.env, {
  NODE_ENV: "test",
  PASARIN_STATE_FILE: stateFile,
  CRON_SECRET: "cron-test-secret",
  TELEGRAM_WEBHOOK_SECRET: "telegram-test-secret",
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
async function sendTelegram(chat: number, id: number, action: string, callback = false) {
  const message = { chat: { id: chat, type: "private" }, from: { id: chat }, text: action };
  const session = callback ? (await telegramChatSessions(chat)).active : undefined;
  return telegram(request({
    update_id: id,
    ...(callback ? { callback_query: { id: String(id), from: { id: chat }, message, data: session?.key + ":" + action } } : { message }),
  }, undefined, { "X-Telegram-Bot-Api-Secret-Token": "telegram-test-secret" }));
}

/** Exercises fresh intake, time-dependent decay, reservation, payment, handover and shared bot state. */
async function run() {
  assert.equal((await state(request())).status, 401);
  assert.equal((await (await overview()).json()).data.availableLots, 0);
  assert.equal((await forecast(new NextRequest("http://localhost/api/telemetry/weather?refresh=true"))).status, 401);
  assert.equal((await recordQuality(request({}))).status, 401);
  const publicQuality = await inspectQuality(new NextRequest("http://localhost/api/quality-gate/validate?commodityId=kangkung&requestedTier=tier_3&hoursOnDisplay=0"));
  const inspection = (await publicQuality.json()).data;
  assert.equal(inspection.gateStatus, "blocked");
  assert.equal(inspection.auditEventId, undefined);
  assert.equal(inspection.reputationPenaltyApplied, 0);
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

  assert.equal((await update(request({ action: "publish", stockId: stock.id }, "vendor"))).status, 422);
  assert.equal((await update(request({ action: "publish", stockId: stock.id, confirmation: { confirmedKg: 21 } }, "vendor"))).status, 422);
  const publish = await update(request({ action: "publish", stockId: stock.id, confirmation: { confirmedKg: 18 } }, "vendor"));
  assert.equal(publish.status, 200);
  const weighed = await view("vendor");
  assert.equal(weighed.stocks[0].initialKg, 20);
  assert.equal(weighed.stocks[0].remainingKg, 18);
  assert.ok(weighed.stocks[0].verifiedAt);
  const offerId = weighed.offers[0].id;
  assert.equal((await (await catalog(request(undefined, "warteg"))).json()).data[0].id, offerId);
  assert.equal((await claim(request({ offerId }, "maggot"))).status, 403);
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
  const publicState = (await (await overview()).json()).data;
  assert.equal(publicState.completedDeliveries, 1);
  assert.equal(publicState.distributedKg, closed.offers[0].quantityKg);
  assert.deepEqual(Object.keys(publicState).sort(), ["availableKg", "availableLots", "completedDeliveries", "distributedKg", "forecast", "lanes", "topCommodities"]);

  for (const [chat, role] of [[11, "vendor"], [22, "warteg"], [33, "logistics"], [44, "manager"], [55, "social_kitchen"], [66, "maggot"]] as const) {
    await startTelegramSession(chat, {
      id: role, name: role, role, email: role + "@example.test", organization: "",
      ...(role === "vendor" ? { vendorId: "vendor_kramat_01" } : {}),
    });
  }
  assert.equal((await sendTelegram(11, 101, "/pasok bayam 12")).status, 200);
  await sendTelegram(11, 101, "/pasok bayam 12");
  const telegramStock = (await view("vendor")).stocks[0];
  assert.equal((await view("vendor")).stocks.length, 2);
  assert.equal((await (await sendTelegram(11, 102, "/terbitkan " + telegramStock.id + " 10")).json()).actionTaken, "offer_published");
  const botOffer = (await view("warteg")).offers.find((offer: RescueOffer) => offer.status === "active").id;
  assert.equal((await (await sendTelegram(22, 103, "/klaim " + botOffer + " 4")).json()).actionTaken, "order_reserved");
  await sendTelegram(22, 103, "/klaim " + botOffer + " 4");
  const partial = await view("warteg");
  const botOrder = partial.offers.find((offer: RescueOffer) => offer.listingId === botOffer);
  assert.equal(partial.offers.filter((offer: RescueOffer) => offer.listingId === botOffer).length, 1);
  assert.equal(botOrder.quantityKg, 4);
  assert.equal(partial.offers.find((offer: RescueOffer) => offer.id === botOffer).quantityKg, 6);
  await sendTelegram(22, 104, "pay:" + botOrder.id, true);
  assert.ok((await view("logistics")).offers.some((offer: RescueOffer) => offer.id === botOrder.id && offer.status === "claimed"));
  await sendTelegram(33, 105, "deliver:" + botOrder.id, true);
  assert.equal((await view("warteg")).offers.find((offer: RescueOffer) => offer.id === botOrder.id).status, "settled");
  assert.equal((await view("vendor")).stocks.find((item: { id: string }) => item.id === telegramStock.id).remainingKg, 6);
  const summary = await (await ask(request({ query: "Berapa pengantaran hari ini?", forceHeuristic: true }, "manager"))).json();
  assert.equal(summary.data.metrics.deliveriesToday, 2);
  assert.equal((await (await sendTelegram(44, 106, "/tanya berapa pengantaran hari ini")).json()).actionTaken, "market_answer");
  assert.equal((await (await sendTelegram(44, 107, "menu:pratinjau:warteg:2", true)).json()).actionTaken, "preview_workspace");
  assert.equal((await (await sendTelegram(11, 108, "/pratinjau warteg")).json()).actionTaken, "help_displayed");
  for (const [role, min, max, mode] of [
    ["social_kitchen", 0.65, 0.85, "donation"],
    ["social_kitchen", 0.65, 0.85, "sale"],
    ["maggot", 0.85, 1.01, "free"],
  ] as const) {
    assert.equal((await update(request({ action: "stock", commodityId: "kangkung", quantityKg: 8 }, "vendor"))).status, 200);
    const saved = JSON.parse(readFileSync(stateFile, "utf8")) as ServerState;
    const lot = saved.stocks[0];
    for (let hours = 1; hours < 150; hours++) {
      lot.createdAt = new Date(Date.now() - hours * 3600000).toISOString();
      const score = evaluateMarketStock(lot, { temperatureC: 32, humidityPercent: 75 })?.decayScore ?? 0;
      if (score >= min && score < max) break;
    }
    writeFileSync(stateFile, JSON.stringify(saved));
    if (mode === "donation") {
      assert.equal((await review(request({}, "admin"))).status, 200);
      const proposal = (await view("vendor")).offers.find((item: RescueOffer) => item.stockId === lot.id);
      assert.equal(proposal.status, "pending_vendor");
      const approval = { action: "vendor_decision", offerId: proposal.id, approved: true };
      assert.equal((await update(request({ ...approval, confirmation: { confirmedKg: 6 } }, "vendor"))).status, 422);
      assert.equal((await update(request({ ...approval, confirmation: { confirmedKg: 6, mode } }, "vendor"))).status, 200);
    } else {
      assert.equal((await update(request({ action: "publish", stockId: lot.id, confirmation: { confirmedKg: 6, mode: mode === "free" ? undefined : mode } }, "vendor"))).status, 200);
    }
    const eligible = (await view(role)).offers.find((item: RescueOffer) => item.stockId === lot.id);
    assert.ok(eligible);
    assert.equal(eligible.distributionMode, mode);
    assert.equal((await claim(request({ offerId: eligible.id, quantityKg: 2, donated: true }, role))).status, 422);
    const placement = { offerId: eligible.id, quantityKg: 2, requestId: "partial-" + eligible.id };
    const reserved = await claim(request(placement, role));
    assert.equal(reserved.status, 200);
    const order = (await reserved.json()).data.offer as RescueOffer;
    assert.equal(order.quantityKg, 2);
    assert.equal(order.totalAmountIdr, mode === "sale" ? order.salvagePricePerKg * 2 : 0);
    const retry = await claim(request(placement, role));
    assert.equal((await retry.json()).data.offer.id, order.id);
    assert.equal((await view(role)).offers.find((item: RescueOffer) => item.id === eligible.id).quantityKg, 4);
    if (mode === "sale") {
      assert.equal((await update(request({ action: "delivery", offerId: order.id }, "logistics"))).status, 409);
      assert.equal((await update(request({ action: "payment", offerId: order.id }, role))).status, 200);
    }
    assert.equal((await update(request({ action: "delivery", offerId: order.id }, "logistics"))).status, 200);
    assert.equal((await view(role)).offers.find((item: RescueOffer) => item.id === order.id).status, "settled");
    if (mode === "donation") {
      const another = (await (await claim(request({ offerId: eligible.id, quantityKg: 1 }, role))).json()).data.offer as RescueOffer;
      assert.equal((await update(request({ action: "delivery", offerId: another.id }, "logistics"))).status, 200);
      assert.equal(completedDonationLots((await view("vendor")).offers, lot.vendorId), 1);
    }
  }
  assert.equal((await review(request({}, "manager"))).status, 403);
  assert.equal((await review(request({}, "admin"))).status, 200);
  for (const role of APP_ROLES) await view(role);
  assert.equal((await sweep(request(undefined, undefined, { Authorization: "Bearer cron-test-secret" }))).status, 200);
  console.log("Seven roles, live decay, concurrent claim, payment, handover, Telegram parity and orchestration passed.");

  assert.equal((await update(request({ action: "stock", commodityId: "kangkung", quantityKg: 200 }, "vendor"))).status, 200);
  const saved = JSON.parse(readFileSync(stateFile, "utf8")) as ServerState;
  const largeLot = saved.stocks[0];
  for (let hours = 1; hours < 150; hours++) {
    largeLot.createdAt = new Date(Date.now() - hours * 3600000).toISOString();
    const score = evaluateMarketStock(largeLot, { temperatureC: 32, humidityPercent: 75 })?.decayScore ?? 0;
    if (score >= 0.65 && score < 0.85) break;
  }
  writeFileSync(stateFile, JSON.stringify(saved));
  assert.equal((await sweep(request(undefined, undefined, { Authorization: "Bearer cron-test-secret" }))).status, 200);
  const afterSweep = await view("vendor");
  const proposal = afterSweep.offers.find((item: RescueOffer) => item.stockId === largeLot.id);
  assert.equal(proposal.status, "pending_vendor");
  assert.ok(proposal.quantityKg > 0 && proposal.quantityKg < 200);
  assert.equal(afterSweep.stocks[0].remainingKg, 200);
  assert.equal(afterSweep.stocks[0].verifiedAt, undefined);
  assert.equal(afterSweep.estimatedUnsoldKg[largeLot.id], proposal.quantityKg);
  assert.equal((await sweep(request(undefined, undefined, { Authorization: "Bearer cron-test-secret" }))).status, 200);
  const repeated = (await view("vendor")).offers.filter((item: RescueOffer) => item.stockId === largeLot.id && item.status === "pending_vendor");
  assert.deepEqual(repeated.map((item: RescueOffer) => item.id), [proposal.id]);
  for (const role of ["warteg", "social_kitchen", "maggot"] as const) {
    const buyer = await view(role);
    assert.ok(!buyer.offers.some((item: RescueOffer) => item.stockId === largeLot.id));
    assert.ok(!buyer.stocks.some((item: { id: string }) => item.id === largeLot.id));
  }
  const publicBefore = (await (await overview()).json()).data.lanes.tier_2.kg;
  const legacyState = JSON.parse(readFileSync(stateFile, "utf8")) as ServerState;
  const legacyListing = legacyState.offers.find((item) => item.id === proposal.id);
  assert.ok(legacyListing);
  Object.assign(legacyListing, { status: "active", quantityKg: 200 });
  writeFileSync(stateFile, JSON.stringify(legacyState));
  assert.ok(!(await view("social_kitchen")).offers.some((item: RescueOffer) => item.id === proposal.id));
  assert.equal((await claim(request({ offerId: proposal.id, quantityKg: 1 }, "social_kitchen"))).status, 422);
  assert.equal((await (await overview()).json()).data.lanes.tier_2.kg, publicBefore);
  const approval = { action: "vendor_decision", offerId: proposal.id, approved: true };
  assert.equal((await update(request({ ...approval, confirmation: { confirmedKg: 57, offeredKg: 58, mode: "sale" } }, "vendor"))).status, 422);
  assert.equal((await update(request({ ...approval, confirmation: { confirmedKg: 57, mode: "sale" } }, "vendor"))).status, 200);
  const afterApproval = await view("vendor");
  assert.equal(afterApproval.stocks[0].remainingKg, 57);
  const listing = (await view("social_kitchen")).offers.find((item: RescueOffer) => item.id === proposal.id);
  assert.equal(listing.quantityKg, 57);
  assert.equal(listing.status, "active");
  assert.equal((await (await overview()).json()).data.lanes.tier_2.kg - publicBefore, 57);
  console.log("Cron estimate stays private until seller weighs stock and confirms publication quantity.");
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
    assert.equal(result.data.metrics.deliveriesToday, 6);
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
  const databaseUrl = process.env.SUPABASE_DB_URL;
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

    process.env.SUPABASE_DB_URL = "postgresql://127.0.0.1:1/pasarin";
    assert.equal((await login("pasar1")).status, 404);
    assert.equal((await state(request(undefined, undefined, { Cookie: cookie }))).status, 401);
    delete process.env.SUPABASE_DB_URL;

    Object.assign(process.env, { NODE_ENV: "production" });
    assert.equal((await login("pasar1")).status, 404);
    assert.equal((await state(request(undefined, undefined, { Cookie: cookie }))).status, 401);
    console.log("Local test sign-in, role enforcement, database isolation and production isolation passed.");
  } finally {
    Object.assign(process.env, { NODE_ENV: environment });
    if (databaseUrl === undefined) delete process.env.SUPABASE_DB_URL;
    else process.env.SUPABASE_DB_URL = databaseUrl;
  }
}

void run().then(checkGemini).then(checkLocalTestSessions).catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  supabase.auth.getUser = verifyUser;
  rmSync(directory, { recursive: true, force: true });
});
