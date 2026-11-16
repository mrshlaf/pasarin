import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AuthApiError, type User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { APP_ROLES, type AppRole } from "../src/data/accounts";
import type { ServerState } from "../src/lib/serverSimulationState";
import type { RescueOffer } from "../src/types/market";

async function run() {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  const directory = mkdtempSync(join(process.cwd(), ".chatbot-test-"));
  const stateFile = join(directory, "state.json");
  Object.assign(process.env, { NODE_ENV: "test", PASARIN_STATE_FILE: stateFile });
  for (const key of ["SUPABASE_DB_URL", "PASARIN_STATE_BACKEND", "OPENWEATHER_API_KEY", "GEMINI_API_KEY", "PASARIN_SERVER_AUTH_SECRET"]) delete process.env[key];
  const { resetEnvCache } = await import("../src/lib/env");
  const { resetWeatherMemoryCache } = await import("../src/lib/weatherAgent");
  resetEnvCache();
  resetWeatherMemoryCache();
  const { supabase } = await import("../src/lib/supabase");
  const originalGetUser = supabase.auth.getUser;
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw new Error("Network disabled in chatbot test"); };
  supabase.auth.getUser = async (token) => {
    const role = APP_ROLES.find((item) => item === token);
    if (!role) return { data: { user: null }, error: new AuthApiError("Invalid test token", 401, "bad_jwt") };
    const user: User = {
      id: role, email: `${role}@example.test`, aud: "authenticated", created_at: new Date().toISOString(),
      app_metadata: { pasarin_role: role, pasarin_vendor_id: "vendor-own" }, user_metadata: { name: role },
    };
    return { data: { user }, error: null };
  };
  const now = new Date().toISOString();
  const offer = (id: string, tier: RescueOffer["targetTier"], buyer: string): RescueOffer => ({
    id, stockId: "own-stock", vendorId: "vendor-own", commodityId: "bayam", targetTier: tier,
    quantityKg: 2, originalPricePerKg: 10000, salvagePricePerKg: 4000, discountPercentage: 60,
    totalAmountIdr: 8000, expiresInMinutes: 60, status: "claimed", paymentStatus: "held_in_escrow",
    claimedById: buyer, createdAt: now,
  });
  const fixture: ServerState = {
    stocks: [
      { id: "own-stock", vendorId: "vendor-own", commodityId: "bayam", initialKg: 12, remainingKg: 12, arrivalClock: "04:00", lotNumber: "OWN", createdAt: now, verifiedAt: now },
      { id: "private-stock", vendorId: "vendor-private", commodityId: "kangkung", initialKg: 9876, remainingKg: 9876, arrivalClock: "04:00", lotNumber: "SECRET", createdAt: now, verifiedAt: now },
    ],
    offers: [offer("w", "tier_1", "warteg"), offer("s", "tier_2", "social_kitchen"), offer("m", "tier_3", "maggot"),
      { ...offer("private", "tier_1", "private-buyer"), vendorId: "vendor-private", stockId: "private-stock", commodityId: "kangkung", status: "settled", paymentStatus: "released_to_vendor", deliveredOn: now }],
    transactions: [], vendorWalletIdr: 999999, biomassProcessedKg: 9876, socialMealsServed: 9876, lastUpdated: now,
  };
  writeFileSync(stateFile, JSON.stringify(fixture));
  const before = readFileSync(stateFile, "utf8");
  const request = (body?: unknown, role?: AppRole, raw = false) => new NextRequest("http://localhost/api/orchestrator/query", {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(role ? { Authorization: `Bearer ${role}` } : {}) },
    body: body === undefined ? undefined : raw ? String(body) : JSON.stringify(body),
  });
  try {
    const { GET, POST } = await import("../src/app/api/orchestrator/query/route");
    assert.equal((await POST(request({ query: "Halo" }))).status, 401);
    assert.equal((await GET(request())).status, 401);
    for (const body of [{ query: "" }, { query: " " }, { query: "x".repeat(1001) }, { query: 123 }, { query: "Halo", forceHeuristic: "true" }]) {
      assert.equal((await POST(request(body, "vendor"))).status, 422);
    }
    assert.equal((await POST(request("{", "vendor", true))).status, 400);
    for (const role of APP_ROLES) {
      assert.equal((await GET(request(undefined, role))).status, role === "manager" || role === "admin" ? 200 : 403);
      const response = await POST(request({ query: "Bagaimana ringkasan pasar?", forceHeuristic: true }, role));
      assert.equal(response.status, 200, role);
      const result = (await response.json()).data;
      assert.equal(result.source, "data_pasar");
      assert.ok(result.summary.length > 0);
      assert.ok(!result.summary.includes("hanya membaca"), "Avoid repeating a read-only warning in every answer");
      assert.equal(result.model, undefined);
      if (role === "manager" || role === "admin") assert.equal(result.metrics.deliveriesToday, 1);
      else {
        assert.ok(!result.summary.includes("Data yang dapat diakses akun Anda"));
        assert.ok(!JSON.stringify(result).includes("9876"), `${role} must not expose hidden market totals`);
        assert.equal(result.metrics.ready, role === "vendor" || role === "logistics" ? 3 : 1);
      }
    }
    const ask = async (query: string, role: AppRole = "vendor", forceHeuristic = true) => {
      const response = await POST(request({ query, forceHeuristic }, role));
      assert.equal(response.status, 200);
      return (await response.json()).data;
    };
    assert.match((await ask("Berapa stok bayam?")).summary, /12 kg/);
    assert.match((await ask("Berapa stok kangkung?")).summary, /0 kg/);
    assert.match((await ask("apa aja komoditas yagn ada di toko aku")).summary, /Bayam Hijau/);
    assert.match((await ask("ada apa aja di toko saya")).summary, /Bayam Hijau/);
    assert.match((await ask("apakah ada bayam di toko saya?")).summary, /Ada komoditas Bayam Hijau di kios Anda/);
    assert.match((await ask("apakah ada kangkung di toko saya?")).summary, /Tidak ada stok Kangkung Darat/);
    assert.match((await ask("ada sayur apa aja", "warteg")).summary, /Belum ada komoditas penawaran aktif/);
    assert.match((await ask("Berapa pesanan siap diantar?", "warteg")).summary, /1 pesanan siap/);
    assert.match((await ask("Berapa transaksi settled?", "warteg")).summary, /0 pesanan berstatus settled/);
    assert.match((await ask("Berapa penawaran murah?", "warteg")).summary, /Belum ada harga/);
    assert.match((await ask("Hapus semua stok")).summary, /tidak menjalankan perubahan/);
    assert.match((await ask("Siapa presiden? ")).summary, /pertanyaan operasional pasar/);
    assert.match((await ask("hi", "vendor", false)).summary, /Halo!/);
    assert.match((await ask("Buat hello world C++", "vendor", false)).summary, /pertanyaan operasional pasar/);
    assert.match((await ask("Berapa kurir tersedia?", "logistics", false)).summary, /bukan jumlah kurir/);
    assert.doesNotMatch((await ask("Berapa pesanan siap diantar?", "warteg")).summary, /1 kg/);
    assert.match((await ask("Berapa pengantaran hari ini?", "manager")).summary, /1 pesanan selesai diantar hari ini/);
    const guideCases = [
      ["Bagaimana diskon dihitung?", /harga awal/],
      ["Apa yang perlu ditimbang?", /Timbang sisa fisik/],
      ["Bagaimana kendaraan dipilih?", /300 kg.*1.000 kg.*4.000 kg/],
      ["Bagaimana konfirmasi serah terima?", /barang diterima/],
      ["Bagaimana prioritas dapur sosial?", /Tier 2/],
      ["Bahan apa yang boleh diklaim?", /Warteg untuk Tier 1/],
      ["Bagaimana cara membayar?", /pembayaran simulasi/],
    ] as const;
    for (const [query, expected] of guideCases) assert.match((await ask(query)).summary, expected);
    assert.match((await ask("Bagaimana cuaca?")).summary, /estimasi/);
    await ask("Berapa stok bayam?", "vendor", false);
    assert.equal(networkCalls, 0, "Missing key and deterministic mode must not use the network");
    process.env.GEMINI_API_KEY = "chatbot-test-key-not-real";
    resetEnvCache();
    await ask("hi", "vendor", false);
    await ask("Buat hello world C++", "vendor", false);
    await ask("Berapa kurir tersedia?", "logistics", false);
    assert.equal(networkCalls, 0, "Greetings, unrelated programming, and unrecorded courier counts bypass the model");
    const failed = await ask("Ringkasan kondisi pasar", "vendor", false);
    assert.equal(failed.source, "data_pasar");
    assert.match(failed.summary, /3 siap diantar/);
    assert.equal(failed.model, undefined);
    assert.ok(networkCalls > 0, "Configured model failure must fall back to scoped data");
    globalThis.fetch = async (_input, init) => {
      const body = typeof init?.body === "string" ? init.body : "";
      assert.match(body, /groundedAnswer/);
      assert.match(body, /jumlah pesanan, bukan kurir/);
      return Response.json({ candidates: [{ content: { role: "model", parts: [{ text: "Ada 3 pesanan siap diantar." }] }, finishReason: "STOP" }] });
    };
    const modelAnswer = await ask("Ringkasan kondisi pasar", "vendor", false);
    assert.equal(modelAnswer.source, "gemini");
    assert.equal(modelAnswer.summary, "Ada 3 pesanan siap diantar.");
    assert.ok(modelAnswer.model);
    assert.equal(readFileSync(stateFile, "utf8"), before, "Questions must not mutate market state");
    console.log("PASS: chatbot authorization, validation, all roles, scoped answers, no-key mode, model failure, and read-only state");
  } finally {
    supabase.auth.getUser = originalGetUser;
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    resetEnvCache();
    resetWeatherMemoryCache();
    rmSync(directory, { recursive: true, force: true });
  }
}

run().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
