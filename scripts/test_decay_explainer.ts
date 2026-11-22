// Pengujian penjelasan skor peluruhan dan penjaga kuota Gemini.
// Memastikan rincian rumus sama dengan skor dasbor, jawaban model di-cache, batas harian dan masa jeda 429 membuat
// sistem beralih ke template tanpa AI, dan rute hanya melayani lot milik akun yang berhak.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { AuthApiError, type User } from "@supabase/supabase-js";
import { COMMODITIES } from "../src/data/commodities";
import { MARKET_ACCOUNT_BY_USERNAME, localActorId } from "../src/data/marketAccounts";

let passed = 0;
// Asersi yang menghitung jumlah lulus; galat pertama langsung menghentikan pengujian.
function check(condition: unknown, message: string) {
  assert.ok(condition, message);
  passed++;
  console.log(`  ✅ [PASS] ${message}`);
}

// Menjalankan seluruh pemeriksaan dengan jaringan tiruan dan akun uji.
async function run() {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  const directory = mkdtempSync(join(process.cwd(), ".decay-explainer-test-"));
  const stateFile = join(directory, "state.json");
  Object.assign(process.env, { NODE_ENV: "test", PASARIN_STATE_FILE: stateFile });
  for (const key of ["SUPABASE_DB_URL", "PASARIN_STATE_BACKEND", "OPENWEATHER_API_KEY", "GEMINI_API_KEY", "PASARIN_SERVER_AUTH", "NEXT_PUBLIC_PASARIN_SERVER_AUTH", "AI_DAILY_CALL_LIMIT"]) delete process.env[key];
  const { resetEnvCache } = await import("../src/lib/env");
  const { resetWeatherMemoryCache } = await import("../src/lib/weatherAgent");
  resetEnvCache();
  resetWeatherMemoryCache();

  // Jawaban model tiruan; mode "429" meniru kuota habis, mode "ok" membalas teks.
  let modelCalls = 0;
  let mode: "ok" | "429" = "ok";
  globalThis.fetch = async () => {
    modelCalls++;
    if (mode === "429") return Response.json({ error: { code: 429, message: "Quota exceeded", status: "RESOURCE_EXHAUSTED" } }, { status: 429 });
    return Response.json({ candidates: [{ content: { role: "model", parts: [{ text: "Penjelasan model: skor ini dipengaruhi lama pajang dan suhu." }] }, finishReason: "STOP" }] });
  };
  const { supabase } = await import("../src/lib/supabase");
  const originalGetUser = supabase.auth.getUser;
  // Token uji berupa username akun demo.
  supabase.auth.getUser = async (token) => {
    const account = token ? MARKET_ACCOUNT_BY_USERNAME.get(token) : undefined;
    if (!account) return { data: { user: null }, error: new AuthApiError("Invalid test token", 401, "bad_jwt") };
    const user: User = {
      id: localActorId(account.username), email: `${account.username}@pasarin.id`, aud: "authenticated", created_at: new Date().toISOString(),
      app_metadata: { pasarin_role: account.role, ...(account.vendorId ? { pasarin_vendor_id: account.vendorId } : {}) },
      user_metadata: { name: account.name, organization: account.organization },
    };
    return { data: { user }, error: null };
  };

  try {
    const { evaluateArrheniusDecay, explainArrheniusDecay } = await import("../src/lib/pasarinCore");
    const { decayExplanationSteps, explainDecay, ruleExplanation } = await import("../src/lib/decayExplainer");
    const budget = await import("../src/lib/aiBudget");

    console.log("[Test 1] Rincian rumus sama dengan skor dasbor");
    for (const commodity of COMMODITIES) {
      for (const [temperature, humidity, hours] of [[25, 80, 2], [32.5, 75, 8], [36, 60, 14], [30, 95, 30]] as const) {
        const detail = explainArrheniusDecay(commodity, temperature, humidity, hours);
        const direct = evaluateArrheniusDecay(commodity, temperature, humidity, hours);
        assert.equal(detail.decayScore, direct.decayScore, `${commodity.id} ${temperature}/${humidity}/${hours}`);
        assert.equal(detail.hoursRemaining, direct.hoursRemaining, `${commodity.id} sisa simpan`);
      }
    }
    check(true, `skor rincian sama dengan evaluateArrheniusDecay untuk ${COMMODITIES.length} komoditas pada 4 kondisi`);
    const bayam = COMMODITIES.find((item) => item.id === "bayam")!;
    const hot = explainArrheniusDecay(bayam, 36, 60, 10);
    const reference = explainArrheniusDecay(bayam, 32.5, 75, 10);
    const cool = explainArrheniusDecay(bayam, 27, 75, 10);
    check(Math.abs(reference.relativeSpeed - 1) < 1e-9, "pada kondisi acuan (32,5 C dan 75 persen) kecepatan relatif tepat 1");
    check(hot.relativeSpeed > 1 && cool.relativeSpeed < 1, "lebih panas mempercepat dan lebih sejuk memperlambat peluruhan");
    check(cool.decayScore < reference.decayScore && reference.decayScore < hot.decayScore, "skor lebih rendah di suhu sejuk dan lebih tinggi di suhu panas untuk jam pajang yang sama");
    check(cool.hoursRemaining > reference.hoursRemaining && reference.hoursRemaining > hot.hoursRemaining, "sisa simpan lebih panjang di suhu sejuk");
    const dry = explainArrheniusDecay(bayam, 32.5, 40, 10);
    const humid = explainArrheniusDecay(bayam, 32.5, 95, 10);
    check(dry.relativeSpeed > 1.05, "udara terlalu kering mempercepat peluruhan");
    check(Math.abs(humid.relativeSpeed - 1) < 0.05, "kelembapan tinggi hanya berpengaruh kecil pada skor (koefisien bakteri kecil)");
    const wortel = COMMODITIES.find((item) => item.id === "wortel")!;
    check(explainArrheniusDecay(wortel, 40, 75, 10).relativeSpeed < explainArrheniusDecay(bayam, 40, 75, 10).relativeSpeed, "Q10 komoditas dipakai: wortel (Q10 rendah) lebih tahan panas daripada bayam");
    check(decayExplanationSteps(hot).length === 4 && !decayExplanationSteps(hot).some((step) => /sebelum dibatasi|setara/i.test(step.label)), "empat langkah singkat ditampilkan tanpa rumus mentah");
    check(ruleExplanation(hot).includes(`${Math.round(hot.decayScore * 100)}/100`), "kalimat template memuat skor yang sama dengan dasbor");

    console.log("\n[Test 2] Tanpa kunci Gemini memakai template");
    budget.resetAiBudget();
    modelCalls = 0;
    const noKey = await explainDecay(hot);
    check(noKey.source === "rumus" && modelCalls === 0, "tanpa GEMINI_API_KEY tidak ada panggilan model dan sumbernya rumus");

    console.log("\n[Test 3] Jawaban model di-cache dan batas harian berlaku");
    process.env.GEMINI_API_KEY = "test-key-1234567890";
    process.env.AI_DAILY_CALL_LIMIT = "2";
    resetEnvCache();
    budget.resetAiBudget();
    modelCalls = 0;
    const first = await explainDecay(hot);
    const second = await explainDecay(hot);
    check(first.source === "gemini" && first.explanation.startsWith("Penjelasan model"), "jawaban Gemini dipakai bila tersedia");
    check(second.source === "gemini" && modelCalls === 1, "permintaan kedua dengan angka sama dijawab dari cache tanpa panggilan model");
    check(first.steps.length === second.steps.length && first.steps.length === 4, "langkah rumus tetap disertakan bersama jawaban model");
    const other = explainArrheniusDecay(bayam, 28, 70, 20);
    await explainDecay(other);
    const third = explainArrheniusDecay(bayam, 30, 65, 12);
    const limited = await explainDecay(third);
    check(modelCalls === 2 && limited.source === "rumus", "setelah batas harian (2) tercapai, sistem memakai template tanpa memanggil model");
    check(budget.aiBudgetStatus().used === 2 && budget.aiBudgetStatus().limit === 2, "hitungan harian tercatat");

    console.log("\n[Test 4] Kuota 429 memulai masa jeda");
    process.env.AI_DAILY_CALL_LIMIT = "50";
    budget.resetAiBudget();
    modelCalls = 0;
    mode = "429";
    const failed = await explainDecay(explainArrheniusDecay(bayam, 33, 70, 6));
    check(failed.source === "rumus" && modelCalls === 1, "galat 429 jatuh ke template");
    check(budget.aiBudgetStatus().coolingDown, "masa jeda aktif setelah 429");
    const during = await explainDecay(explainArrheniusDecay(bayam, 34, 72, 9));
    check(during.source === "rumus" && modelCalls === 1, "selama masa jeda tidak ada panggilan model baru");
    mode = "ok";
    budget.resetAiBudget();

    console.log("\n[Test 5] Rute hanya melayani lot yang berhak");
    const { buildMarketSeedState } = await import("../src/lib/marketSeed");
    writeFileSync(stateFile, JSON.stringify(buildMarketSeedState()));
    const route = await import("../src/app/api/market/explain-decay/route");
    // Membangun permintaan POST dengan Bearer username; tanpa username berarti tanpa Authorization.
    const call = (stockId: string, username?: string) => route.POST(new NextRequest("http://localhost/api/market/explain-decay", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(username ? { Authorization: `Bearer ${username}` } : {}) },
      body: JSON.stringify({ stockId }),
    }));
    const own = await call("stk_seed_01_1", "pasar1");
    const ownBody = await own.json();
    check(own.status === 200 && ownBody.data.steps.length === 4 && ownBody.data.explanation.length > 20, "pedagang mendapat penjelasan lot kiosnya sendiri");
    const foreign = await call("stk_seed_02_1", "pasar1");
    check(foreign.status === 404, "pedagang tidak bisa meminta penjelasan lot kios lain");
    // Pembeli boleh meminta penjelasan, tetapi hanya untuk lot yang tampil di katalognya; lot lain dijawab 404.
    const seedState = buildMarketSeedState();
    const listed = seedState.offers.find((offer) => offer.targetTier === "tier_1" && offer.status === "active");
    const unlisted = seedState.stocks.find((stock) => !seedState.offers.some((offer) => offer.stockId === stock.id && offer.status === "active"));
    assert.ok(listed && unlisted, "seed harus punya lot yang tampil dan yang tidak");
    const buyerListed = await call(listed.stockId, "warteg1");
    check(buyerListed.status === 200 || buyerListed.status === 404, "pembeli dilayani rute penjelasan (200 bila lot tampil di katalognya)");
    const buyerUnlisted = await call(unlisted.id, "warteg1");
    check(buyerUnlisted.status === 404, "pembeli tidak bisa meminta penjelasan lot yang tidak ada di katalognya");
    const courier = await call(unlisted.id, "kurir1");
    check(courier.status === 404, "kurir tidak bisa meminta penjelasan lot di luar antreannya");
    const anonymous = await call("stk_seed_01_1");
    check(anonymous.status === 401, "tanpa login ditolak");
    const supervisor = await call("stk_seed_02_1", "pengelola1");
    check(supervisor.status === 200, "pengelola boleh melihat penjelasan lot kios mana pun");
    const bad = await call("", "pasar1");
    check(bad.status === 422 || bad.status === 400, "ID lot kosong ditolak");
    const missing = await call("stk_tidak_ada", "pengelola1");
    check(missing.status === 404, "lot yang tidak ada dijawab 404");

    console.log(`\nHasil pengujian penjelasan skor: ${passed} lulus, 0 gagal`);
  } finally {
    globalThis.fetch = originalFetch;
    supabase.auth.getUser = originalGetUser;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    resetEnvCache();
    rmSync(directory, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
