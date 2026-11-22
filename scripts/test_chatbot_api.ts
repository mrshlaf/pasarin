// Uji API Asisten Dashboard.
// Memeriksa otorisasi, validasi input, cakupan data per peran, mode tanpa kunci model, kegagalan model,
// jalur pertanyaan bebas ke model, dan bahwa pertanyaan tidak pernah mengubah state pasar.

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AuthApiError, type User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { APP_ROLES, type AppRole } from "../src/data/accounts";
import type { ServerState } from "../src/lib/serverSimulationState";
import type { RescueOffer } from "../src/types/market";

// Menyiapkan state uji terpisah dan akun tiruan per peran, lalu menjalankan seluruh pemeriksaan.
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
  // Jaringan dimatikan dan dihitung: mode tanpa kunci dan jawaban deterministik tidak boleh memanggil fetch sama sekali.
  globalThis.fetch = async () => { networkCalls++; throw new Error("Network disabled in chatbot test"); };
  // Token uji berupa nama peran; semua akun tiruan menunjuk kios "vendor-own" sehingga vendor hanya melihat data kios itu.
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
  // Membuat pesanan 2 kg milik vendor-own yang sudah diklaim `buyer` dan dananya tertahan di escrow.
  const offer = (id: string, tier: RescueOffer["targetTier"], buyer: string): RescueOffer => ({
    id, stockId: "own-stock", vendorId: "vendor-own", commodityId: "bayam", targetTier: tier,
    quantityKg: 2, originalPricePerKg: 10000, salvagePricePerKg: 4000, discountPercentage: 60,
    totalAmountIdr: 8000, expiresInMinutes: 60, status: "claimed", paymentStatus: "held_in_escrow",
    claimedById: buyer, createdAt: now,
  });
  // State uji; data vendor-private (SECRET, 9876, 999999, private-buyer) menjadi penanda kebocoran yang tidak boleh muncul.
  const fixture: ServerState = {
    stocks: [
      { id: "own-stock", vendorId: "vendor-own", commodityId: "bayam", initialKg: 12, remainingKg: 12, arrivalClock: "04:00", lotNumber: "OWN", createdAt: now, verifiedAt: now },
      { id: "private-stock", vendorId: "vendor-private", commodityId: "kangkung", initialKg: 9876, remainingKg: 9876, arrivalClock: "04:00", lotNumber: "SECRET", createdAt: now, verifiedAt: now },
    ],
    offers: [offer("w", "tier_1", "warteg"), offer("s", "tier_2", "social_kitchen"), offer("m", "tier_3", "maggot"),
      { ...offer("private", "tier_1", "private-buyer"), vendorId: "vendor-private", stockId: "private-stock", commodityId: "kangkung", status: "settled", paymentStatus: "released_to_vendor", deliveredOn: now }],
    transactions: [
      { id: "w-held", offerId: "w", buyerName: "warteg", vendorName: "vendor-own", commodityName: "Bayam", amountIdr: 8000, status: "held_in_escrow", createdAt: now },
      { id: "s-held", offerId: "s", buyerName: "social_kitchen", vendorName: "vendor-own", commodityName: "Bayam", amountIdr: 8000, status: "held_in_escrow", createdAt: now },
      { id: "private-released", offerId: "private", buyerName: "private-buyer", vendorName: "vendor-private", commodityName: "Kangkung", amountIdr: 999999, status: "released", createdAt: now },
    ], vendorWalletIdr: 999999, biomassProcessedKg: 9876, socialMealsServed: 9876, lastUpdated: now,
  };
  writeFileSync(stateFile, JSON.stringify(fixture));
  // Isi state sebelum pertanyaan; dibandingkan di akhir untuk membuktikan asisten tidak mengubah apa pun.
  const before = readFileSync(stateFile, "utf8");
  // Membangun permintaan ke rute asisten; `raw` mengirim body apa adanya untuk menguji JSON rusak.
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
    // Mengajukan pertanyaan sebagai peran tertentu dan mengembalikan `data` dari respons 200.
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

    // Saran pertanyaan lanjutan: ada, maksimal 3, tidak mengulang pertanyaan, dan berbeda menurut peran.
    const withSuggestions = await ask("Berapa stok yang berisiko?", "manager");
    assert.ok(Array.isArray(withSuggestions.suggestions) && withSuggestions.suggestions.length === 3, "manager mendapat 3 saran lanjutan");
    assert.ok(!withSuggestions.suggestions.some((item: string) => /^berapa stok yang berisiko\??$/i.test(item)), "saran tidak mengulang pertanyaan yang baru diajukan");
    assert.ok((await ask("Apa penawaran yang tersedia?", "warteg")).suggestions.every((item: string) => !/kios mana/i.test(item)), "saran pembeli tidak memuat pertanyaan khusus pengelola");
    // Overview laporan hanya untuk pengelola dan admin.
    for (const role of ["manager", "admin"] as const) {
      const overview = await ask("Laporan apa saja yang tersedia?", role);
      assert.match(overview.summary, /Laporan di dashboard/, role + " mendapat daftar laporan");
      assert.match(overview.summary, /Ringkasan pasar hari ini/, role + " mendapat ringkasan angka");
      assert.match(overview.summary, /Buku Besar Transaksi dan Escrow/, role + " melihat laporan buku besar");
    }
    assert.ok(!/Laporan di dashboard/.test((await ask("Laporan apa saja yang tersedia?", "vendor")).summary), "pedagang tidak mendapat daftar laporan pengelola");
    assert.ok(!/Laporan di dashboard/.test((await ask("Laporan apa saja yang tersedia?", "warteg")).summary), "pembeli tidak mendapat daftar laporan pengelola");
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
    // Kunci tiruan dipasang sementara fetch masih melempar galat: pertanyaan yang perlu model harus jatuh ke jawaban data tersaring.
    process.env.GEMINI_API_KEY = "chatbot-test-key-not-real";
    resetEnvCache();
    await ask("hi", "vendor", false);
    await ask("Buat hello world C++", "vendor", false);
    await ask("Berapa kurir tersedia?", "logistics", false);
    const destination = await ask("cek sayutrku bisa dijual dimana", "vendor", false);
    assert.equal(destination.source, "data_pasar");
    assert.match(destination.summary, /Warteg & UMKM.*Bayam Hijau \(6 kg terkonfirmasi\)/);
    assert.doesNotMatch(destination.summary, /Kangkung|9876/);
    assert.match((await ask("Kangkung saya bisa dijual ke mana?")).summary, /Belum ada stok Kangkung Darat/);
    assert.match((await ask("Bayam bisa dibeli di mana?", "warteg")).summary, /Belum ada penawaran aktif Bayam Hijau/);
    const earnings = await ask("berapa keuntunganku", "vendor", false);
    assert.equal(earnings.source, "data_pasar");
    assert.match(earnings.summary, /Saldo dompet Anda Rp0.*Rp16\.000 masih ditahan.*keuntungan bersih belum bisa dihitung/);
    assert.doesNotMatch(earnings.summary, /999\.999/);
    assert.match((await ask("Berapa pengeluaran saya?", "warteg", false)).summary, /Total pembayaran pesanan Anda Rp8\.000/);
    assert.match((await ask("Berapa dana yang sudah cair?", "admin", false)).summary, /sudah cair ke pedagang Rp999\.999/);
    const fallback = await ask("hmm gimana ya", "vendor", false);
    assert.equal(fallback.source, "data_pasar");
    assert.match(fallback.summary, /Sayur saya bisa dijual ke mana\?/);
    assert.match((await ask("hmm gimana ya", "logistics", false)).summary, /Apa yang siap diantar\?/);
    assert.equal(networkCalls, 0, "Deterministic answers and too-vague questions (clarification) bypass the model");
    const failed = await ask("Ringkasan kondisi pasar", "vendor", false);
    assert.equal(failed.source, "data_pasar");
    assert.match(failed.summary, /3 siap diantar/);
    assert.equal(failed.model, undefined);
    assert.ok(networkCalls > 0, "Configured model failure must fall back to scoped data");
    // Model tiruan yang sukses; badan permintaan wajib memuat jawaban berbasis data dan aturan "pesanan, bukan kurir".
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
    // Pertanyaan bebas dijawab model dari data akun yang sudah disaring; data kios lain tidak ikut terkirim.
    const sentBodies: string[] = [];
    globalThis.fetch = async (_input, init) => {
      sentBodies.push(typeof init?.body === "string" ? init.body : "");
      return Response.json({ candidates: [{ content: { role: "model", parts: [{ text: "Bayam Hijau di kios Anda tersisa 12 kg." }] }, finishReason: "STOP" }] });
    };
    const openAnswer = await ask("jelaskan bedanya tier 1 dan tier 2 untuk saya", "vendor", false);
    assert.equal(openAnswer.source, "gemini");
    assert.equal(openAnswer.summary, "Bayam Hijau di kios Anda tersisa 12 kg.");
    const openBody = sentBodies.at(-1) ?? "";
    assert.match(openBody, /OWN/, "Open questions send the account's own lots to the model");
    assert.match(openBody, /hanya membaca data/, "Open questions include the platform rules");
    assert.doesNotMatch(openBody, /SECRET|9876|999999|private-buyer/, "Open questions never send other vendors' data or market totals");
    const buyerOpen = await ask("menu masakan apa yang cocok dari kiriman minggu lalu?", "warteg", false);
    assert.equal(buyerOpen.source, "gemini");
    assert.doesNotMatch(sentBodies.at(-1) ?? "", /SECRET|9876|private-buyer/, "Buyer context excludes other accounts' orders");
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
