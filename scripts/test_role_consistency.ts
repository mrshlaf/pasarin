// Uji Konsistensi Lintas Peran dan Asisten Chatbot.
// Memastikan angka yang dijawab asisten sama dengan angka yang dihitung dashboard tiap peran,
// tombol saran asisten selalu terjawab, dan alur jual-bayar-antar menjaga invarian buku besar
// (status pembayaran pesanan selaras dengan catatan escrow) dari sudut pandang setiap peran.

// Impor: assert ketat, utilitas berkas sementara, dan jalur untuk state uji terpisah.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AuthApiError, type User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { MARKET_ACCOUNT_BY_USERNAME, localActorId } from "../src/data/marketAccounts";
import { KIOSKS } from "../src/data/kiosks";
import type { ServerState } from "../src/lib/serverSimulationState";
import { isDonation, isReadyForDelivery, type RescueOffer, type StockItem } from "../src/types/market";

// Respons GET state per peran: state yang sudah disaring ditambah skor peluruhan per lot (null bila tidak dihitung).
type Snapshot = ServerState & { stockHealth: Record<string, { decayScore: number } | null> };

// Saran yang ditampilkan tombol asisten (src/components/common/MarketChatbot.tsx).
const SUGGESTIONS: Record<string, string[]> = {
  pasar1: ["Ringkas stok kios saya", "Apa yang perlu ditimbang?", "Bagaimana diskon dihitung?"],
  warteg1: ["Apa penawaran yang tersedia?", "Bagaimana status pesanan saya?", "Bagaimana cara membayar?"],
  sosial1: ["Apa donasi yang tersedia?", "Bagaimana status pesanan saya?", "Bagaimana prioritas dapur sosial?"],
  maggot1: ["Apa biomassa yang tersedia?", "Bagaimana status pesanan saya?", "Bahan apa yang boleh diklaim?"],
  kurir1: ["Apa yang siap diantar?", "Bagaimana kendaraan dipilih?", "Bagaimana konfirmasi serah terima?"],
  pengelola1: ["Ringkas operasional pasar", "Berapa stok yang berisiko?", "Apa yang siap diantar?"],
  admin1: ["Ringkas operasional pasar", "Berapa pesanan belum dibayar?", "Apa yang perlu dievaluasi?"],
};

// Mengambil semua angka dari jawaban untuk dibandingkan dengan angka dashboard.
const numbers = (text: string) => (text.match(/\d+(?:[.,]\d+)?/g) ?? []).map((value) => Number(value.replace(",", ".")));

// Invarian buku besar yang harus berlaku untuk state server lengkap.
function assertLedgerInvariants(state: ServerState, label: string) {
  const kioskIds = new Set(KIOSKS.map((kiosk) => kiosk.id));
  const stockById = new Map(state.stocks.map((stock) => [stock.id, stock]));
  for (const stock of state.stocks) assert.ok(kioskIds.has(stock.vendorId), `${label}: stok ${stock.id} milik kios tak dikenal ${stock.vendorId}`);
  for (const offer of state.offers) {
    const stock = stockById.get(offer.stockId);
    assert.ok(stock, `${label}: penawaran ${offer.id} tanpa stok`);
    assert.equal(offer.vendorId, stock.vendorId, `${label}: kios penawaran ${offer.id} beda dengan stoknya`);
    const txs = state.transactions.filter((item) => item.offerId === offer.id);
    const held = txs.filter((item) => item.status === "held_in_escrow").length;
    const released = txs.filter((item) => item.status === "released").length;
    if (offer.paymentStatus === "unpaid" || offer.paymentStatus === "not_required") {
      assert.equal(held + released, 0, `${label}: ${offer.id} berstatus ${offer.paymentStatus} tapi punya catatan escrow`);
    }
    if (offer.paymentStatus === "held_in_escrow") assert.equal(held, 1, `${label}: ${offer.id} harus punya tepat 1 dana tertahan`);
    if (offer.paymentStatus === "released_to_vendor") assert.equal(released, 1, `${label}: ${offer.id} harus punya tepat 1 dana cair`);
    if (offer.paymentStatus === "not_required") assert.equal(offer.targetTier, "tier_3", `${label}: hanya lot Maggot yang gratis`);
    if (offer.targetTier === "tier_3" && (offer.status === "active" || offer.status === "pending_vendor")) {
      assert.equal(offer.paymentStatus, "unpaid", `${label}: lot Maggot ${offer.id} belum diklaim tidak boleh masuk antrean kurir`);
    }
    if (offer.status === "claimed" || offer.status === "settled") assert.ok(offer.claimedById, `${label}: ${offer.id} tanpa pemilik`);
  }
  const releasedTotal = state.transactions.filter((item) => item.status === "released").reduce((sum, item) => sum + item.amountIdr, 0);
  assert.equal(state.vendorWalletIdr, releasedTotal, `${label}: saldo pedagang harus sama dengan total dana cair`);
}

// Membandingkan jawaban asisten dengan rumus dashboard di setiap tahap alur jual-bayar-antar.
async function run() {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  const directory = mkdtempSync(join(process.cwd(), ".consistency-test-"));
  const stateFile = join(directory, "state.json");
  Object.assign(process.env, { NODE_ENV: "test", PASARIN_STATE_FILE: stateFile });
  for (const key of ["SUPABASE_DB_URL", "PASARIN_STATE_BACKEND", "OPENWEATHER_API_KEY", "GEMINI_API_KEY", "PASARIN_SERVER_AUTH", "NEXT_PUBLIC_PASARIN_SERVER_AUTH"]) delete process.env[key];
  const { resetEnvCache } = await import("../src/lib/env");
  const { resetWeatherMemoryCache } = await import("../src/lib/weatherAgent");
  resetEnvCache();
  resetWeatherMemoryCache();
  // Jaringan dimatikan agar cuaca dan model tidak ikut memengaruhi angka; semua jawaban harus berasal dari data lokal.
  globalThis.fetch = async () => { throw new Error("Network disabled in consistency test"); };

  // Token Bearer = username akun pasar; ID pengguna = ID aktor lokal seperti pada seed.
  const { supabase } = await import("../src/lib/supabase");
  const originalGetUser = supabase.auth.getUser;
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

  let passed = 0;
  // Asersi yang menghitung jumlah lulus; galat pertama langsung menghentikan run.
  const check = (condition: unknown, message: string) => {
    assert.ok(condition, message);
    passed++;
    console.log(`  ✅ [PASS] ${message}`);
  };

  // Modul dimuat dinamis setelah state uji disiapkan agar membaca berkas uji, bukan data nyata.
  try {
    const { buildMarketSeedState } = await import("../src/lib/marketSeed");
    const { getServerSimulationState } = await import("../src/lib/serverSimulationState");
    const stateRoute = await import("../src/app/api/simulation/state/route");
    const claimRoute = await import("../src/app/api/offers/claim/route");
    const chatRoute = await import("../src/app/api/orchestrator/query/route");
    writeFileSync(stateFile, JSON.stringify(buildMarketSeedState()));

    // Membangun permintaan dengan Bearer username; tanpa body menjadi GET, dengan body menjadi POST.
    const request = (url: string, username: string, body?: unknown) => new NextRequest(`http://localhost${url}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${username}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    // Membaca state seperti yang dilihat dashboard akun tersebut.
    const snapshot = async (username: string): Promise<Snapshot> => {
      const response = await stateRoute.GET(request("/api/simulation/state", username));
      assert.equal(response.status, 200, `snapshot ${username}`);
      return (await response.json()).data;
    };
    // Menjalankan aksi state (stok, publish, bayar, antar) sebagai akun tersebut; gagal bila status bukan 200.
    const mutate = async (username: string, body: unknown) => {
      const response = await stateRoute.POST(request("/api/simulation/state", username, body));
      const json = await response.json();
      assert.equal(response.status, 200, `${username} ${JSON.stringify(body)}: ${json.error ?? ""}`);
      return json.data;
    };
    // Bertanya ke asisten tanpa model (forceHeuristic) dan mengembalikan teks ringkasannya.
    const ask = async (username: string, query: string): Promise<string> => {
      const response = await chatRoute.POST(request("/api/orchestrator/query", username, { query, forceHeuristic: true }));
      const json = await response.json();
      assert.equal(response.status, 200, `chatbot ${username}: ${query}`);
      return json.data.summary as string;
    };

    // Rumus dashboard (BuyerDashboard, VendorDashboard, LogisticsDashboard, OversightDashboard).
    const buyerTier = { warteg1: "tier_1", sosial1: "tier_2", maggot1: "tier_3" } as const;
    // Katalog aktif dan pesanan milik pembeli sesuai tier akunnya, seperti dihitung BuyerDashboard.
    const buyerView = (view: Snapshot, username: keyof typeof buyerTier) => {
      const listings = view.offers.filter((offer) => offer.targetTier === buyerTier[username] && offer.status === "active");
      const orders = view.offers.filter((offer) => offer.targetTier === buyerTier[username] && offer.isMine &&
        (offer.status === "claimed" || offer.status === "settled"));
      return { listings, orders };
    };
    // Urutan [total, belum dibayar, siap antar, selesai] harus sama dengan urutan angka di jawaban status pesanan.
    const ordersSummary = (orders: RescueOffer[]) => [orders.length,
      orders.filter((offer) => offer.status === "claimed" && offer.paymentStatus === "unpaid").length,
      orders.filter(isReadyForDelivery).length, orders.filter((offer) => offer.status === "settled").length];
    // Penawaran aktif yang stoknya sudah ditimbang; penawaran dari stok belum terverifikasi tidak dihitung dashboard.
    const verifiedActive = (view: Snapshot) => {
      const weighed = new Set(view.stocks.filter((stock) => stock.verifiedAt).map((stock) => stock.id));
      return view.offers.filter((offer) => offer.status === "active" && weighed.has(offer.stockId));
    };
    // Lot bersisa dengan skor peluruhan minimal 0,35 (batas segar), sama dengan kartu stok berisiko di dashboard.
    const risky = (view: Snapshot) => view.stocks.filter((stock: StockItem) => stock.remainingKg > 0 && (view.stockHealth[stock.id]?.decayScore ?? 0) >= 0.35);

    // Memeriksa invarian buku besar lalu mencocokkan angka asisten dengan dashboard semua peran pada tahap `label`.
    const compareAll = async (label: string) => {
      console.log(`\n[${label}] Asisten vs dashboard untuk setiap peran`);
      assertLedgerInvariants(await getServerSimulationState(), label);
      check(true, `${label}: invarian buku besar (escrow ⇔ status bayar, saldo, kepemilikan) terpenuhi`);

      // Setiap pertanyaan saran per peran harus dijawab dan jawabannya diperiksa konsistensi dengan snapshot peran itu.
      for (const [username, prompts] of Object.entries(SUGGESTIONS)) {
        for (const prompt of prompts) {
          const answer = await ask(username, prompt);
          check(!/belum cukup untuk menjawab/.test(answer), `${label}: ${username} "${prompt}" terjawab`);
        }
      }
      for (const username of ["warteg1", "sosial1", "maggot1"] as const) {
        const view = await snapshot(username);
        const { listings, orders } = buyerView(view, username);
        check(view.offers.every((offer) => offer.isMine || offer.status === "active"), `${label}: ${username} tidak melihat pesanan akun lain`);
        const status = numbers(await ask(username, "Bagaimana status pesanan saya?"));
        const expected = ordersSummary(orders);
        check(orders.length === 0 ? status.length === 0 : expected.every((value, index) => status[index] === value),
          `${label}: ${username} status pesanan asisten = dashboard [${expected.join(", ")}]`);
        const catalog = numbers(await ask(username, username === "sosial1" ? "Apa penawaran yang tersedia?" : SUGGESTIONS[username][0]));
        check(catalog[0] === listings.length, `${label}: ${username} jumlah penawaran asisten (${catalog[0]}) = katalog dashboard (${listings.length})`);
      }
      const donationListings = buyerView(await snapshot("sosial1"), "sosial1").listings.filter((offer) => isDonation(offer));
      check(numbers(await ask("sosial1", "Apa donasi yang tersedia?"))[0] === donationListings.length,
        `${label}: sosial1 jumlah donasi asisten = katalog filter Donasi (${donationListings.length})`);

      // Pedagang: angka jawaban "perlu ditimbang" harus sama dengan jumlah lot yang belum ditimbang di snapshot.
      const vendor = await snapshot("pasar1");
      const needsWeighing = vendor.stocks.filter((stock) => stock.remainingKg > 0 && !stock.verifiedAt).length;
      check(numbers(await ask("pasar1", "Apa yang perlu ditimbang?"))[0] === needsWeighing,
        `${label}: pasar1 lot perlu timbang asisten = kartu "Perlu timbang" (${needsWeighing})`);
      check(numbers(await ask("pasar1", "Apa penawaran yang tersedia?"))[0] === verifiedActive(vendor).length,
        `${label}: pasar1 penawaran aktif asisten = dashboard (${verifiedActive(vendor).length})`);
      const earnings = await ask("pasar1", "berapa keuntunganku");
      const heldIdr = vendor.transactions.filter((item) => item.status === "held_in_escrow").reduce((sum, item) => sum + item.amountIdr, 0);
      check(earnings.includes(`Saldo dompet Anda Rp${vendor.vendorWalletIdr.toLocaleString("id-ID")}`) &&
        earnings.includes(`Rp${heldIdr.toLocaleString("id-ID")} masih ditahan di escrow`),
        `${label}: saldo dompet dan dana tertahan di asisten sesuai snapshot pedagang`);
      // Pendapatan harian: dana cair dari pesanan yang selesai diantar hari ini (tanggal WIB), dihitung ulang dari snapshot pedagang.
      const dayFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" });
      const todayKey = dayFormat.format(new Date());
      const settledToday = new Set(vendor.offers
        .filter((offer) => offer.status === "settled" && offer.deliveredOn && dayFormat.format(Date.parse(offer.deliveredOn)) === todayKey)
        .map((offer) => offer.id));
      const todayIdr = vendor.transactions.filter((item) => item.status === "released" && settledToday.has(item.offerId))
        .reduce((sum, item) => sum + item.amountIdr, 0);
      check(earnings.includes(`Pendapatan hari ini Rp${todayIdr.toLocaleString("id-ID")} dari ${settledToday.size === 0 ? 0 : vendor.transactions.filter((item) => item.status === "released" && settledToday.has(item.offerId)).length} pesanan`) &&
        earnings.includes("akumulasi seluruh dana yang sudah cair"),
        `${label}: pendapatan hari ini (Rp${todayIdr.toLocaleString("id-ID")}) terpisah dari saldo akumulasi`);

      // Kurir: angka jawaban antrean harus sama dengan jumlah pesanan siap antar di snapshot.
      const courier = await snapshot("kurir1");
      const queue = courier.offers.filter(isReadyForDelivery).length;
      check(numbers(await ask("kurir1", "Apa yang siap diantar?"))[0] === queue, `${label}: kurir1 antrean asisten = antrean dashboard (${queue})`);
      check(courier.offers.every((offer) => offer.paymentStatus !== "unpaid"), `${label}: kurir tidak menerima lot yang belum diklaim/dibayar`);

      // Pengelola dan admin: angka siap antar di jawaban harus sama dengan data pasar penuh.
      for (const username of ["pengelola1", "admin1"]) {
        const view = await snapshot(username);
        const ready = view.offers.filter(isReadyForDelivery).length;
        check(numbers(await ask(username, "Apa yang siap diantar?"))[0] === ready, `${label}: ${username} siap diantar asisten = dashboard (${ready})`);
        check(numbers(await ask(username, "Berapa stok yang berisiko?"))[0] === risky(view).length, `${label}: ${username} lot berisiko asisten = dashboard (${risky(view).length})`);
        const summary = numbers(await ask(username, "Ringkas operasional pasar"));
        check(summary[2] === verifiedActive(view).length, `${label}: ${username} penawaran aktif di ringkasan = dashboard (${verifiedActive(view).length})`);
        const unpaid = view.offers.filter((offer) => offer.status === "claimed" && offer.paymentStatus === "unpaid").length;
        check(numbers(await ask(username, "Berapa pesanan belum dibayar?"))[0] === unpaid, `${label}: ${username} pesanan belum dibayar asisten = dashboard (${unpaid})`);
      }
      check(queue === (await snapshot("admin1")).offers.filter(isReadyForDelivery).length, `${label}: antrean kurir = "Siap diantar" pengelola`);
    };

    await compareAll("Seed awal");

    // Variasi pertanyaan nyata (bahasa santai, salah ketik, akhiran -ku) harus dijawab dari data, bukan jatuh ke fallback.
    console.log("\n[Variasi] Pertanyaan bebas per peran");
    const PARAPHRASES: Record<string, Array<[string, RegExp]>> = {
      pasar1: [
        ["cek sayutrku bisa dijual dimana", /Tujuan penyaluran stok/], ["berapa keuntunganku", /Saldo dompet Anda Rp/],
        ["brp untung gw hari ini?", /Saldo dompet Anda/], ["daganganku cocoknya buat siapa", /Tujuan penyaluran/],
        ["lot mana yg paling cepet busuk", /paling perlu didahulukan/], ["sayur gw mau busuk ga", /paling perlu didahulukan/],
        ["harga jual bayam saya berapa", /Harga lot|Belum ada stok/], ["siapa yang beli sayur saya", /pesanan|Belum ada pesanan/],
        ["kapan duit gw cair", /cair ke saldo dompet/], ["ngapain ya sekarang", /sebaiknya Anda lakukan|Tidak ada tindakan/],
        ["kenapa penawaranku ga muncul", /Timbang & konfirmasi/], ["kamu bisa apa", /Asisten PASARIN untuk ruang kerja Pedagang/],
        ["makasih ya", /Sama-sama/], ["berapa dampak kios saya", /diserahterimakan|Belum ada pesanan/],
      ],
      warteg1: [
        ["sayur apa yg paling murah", /Termurah lebih dulu|Belum ada penawaran/], ["harga kangkung brp/kg", /penawaran aktif|Belum ada penawaran/],
        ["pesenanku udh sampe mana", /Pesanan Anda|Belum ada pesanan/], ["brp total belanja gw", /Total pembayaran pesanan Anda/],
        ["berapa penghematan saya", /Penghematan sekitar|Belum ada pesanan/], ["bayam bisa dibeli dmn", /penawaran aktif|Belum ada penawaran/],
        ["apakah sayurnya aman dimakan", /bukan hasil pemeriksaan fisik/], ["kenapa katalog kosong", /hanya menampilkan penawaran/],
      ],
      sosial1: [["apa saran buat saya", /sebaiknya Anda lakukan|Tidak ada tindakan/], ["kapan pesanan saya diantar", /Pesanan Anda|Belum ada pesanan/]],
      maggot1: [["berapa biaya saya", /gratis/], ["yang paling segar mana", /paling segar|Belum ada penawaran/]],
      kurir1: [["ke mana aja tujuan antar", /siap diantar|Belum ada pesanan siap/], ["total muatan brp kg", /Rekomendasi kendaraan|Belum ada pesanan siap/],
        ["berapa pendapatan saya", /pendapatan kurir belum tercatat/]],
      pengelola1: [["kios mana paling banyak stok berisiko", /Kios dengan stok/], ["komoditas apa yang paling berisiko", /Komoditas dengan stok berisiko/],
        ["berapa pangan yang sudah tersalurkan", /selesai diserahterimakan/], ["harga termurah di pasar", /Termurah lebih dulu/]],
      admin1: [["apa yang harus saya lakukan", /menunggu timbang/], ["total dana cair brp", /sudah cair ke pedagang/]],
    };
    const misses: string[] = [];
    for (const [username, cases] of Object.entries(PARAPHRASES)) {
      for (const [prompt, expected] of cases) {
        const answer = await ask(username, prompt);
        if (/belum memahami/.test(answer) || !expected.test(answer)) misses.push(`${username} "${prompt}" -> ${answer.slice(0, 160)}`);
      }
    }
    if (misses.length) console.error(misses.join("\n"));
    check(misses.length === 0, `${Object.values(PARAPHRASES).flat().length} variasi pertanyaan dijawab dari data`);
    const vendorView = await snapshot("pasar1");
    const ownKiosk = MARKET_ACCOUNT_BY_USERNAME.get("pasar1")!.vendorId!;
    const routeAnswer = await ask("pasar1", "cek sayutrku bisa dijual dimana");
    check(vendorView.stocks.every((stock) => stock.vendorId === ownKiosk) && !KIOSKS.filter((kiosk) => kiosk.id !== ownKiosk).some((kiosk) => routeAnswer.includes(kiosk.name)),
      "Jawaban pedagang hanya memuat stok kiosnya sendiri");
    check(/belum memahami/.test(await ask("pasar1", "xyz qwerty")), "Pertanyaan tak bermakna tanpa model menampilkan contoh pertanyaan");

    // Alur lengkap: pedagang mencatat & menimbang -> Warteg klaim & bayar -> kurir antar.
    console.log("\n[Alur] Pedagang -> Warteg -> Kurir");
    await mutate("pasar1", { action: "stock", commodityId: "kangkung", quantityKg: 40 });
    const fresh = (await snapshot("pasar1")).stocks.find((stock) => stock.commodityId === "kangkung" && !stock.verifiedAt && stock.initialKg === 40);
    assert.ok(fresh, "stok baru tercatat");
    await mutate("pasar1", { action: "publish", stockId: fresh.id, confirmation: { confirmedKg: 30 } });
    const listing = (await snapshot("warteg1")).offers.find((offer) => offer.stockId === fresh.id && offer.status === "active");
    check(listing, "Penawaran hasil timbang pedagang muncul di katalog Warteg");
    const claim = await claimRoute.POST(request("/api/offers/claim", "warteg1", { offerId: listing!.id, quantityKg: 10, requestId: "consistency-1" }));
    check(claim.status === 200, "Warteg mengklaim 10 kg dari lot tersebut");
    const order = (await snapshot("warteg1")).offers.find((offer) => offer.isMine && offer.stockId === fresh.id)!;
    check(!(await snapshot("kurir1")).offers.some((offer) => offer.id === order.id), "Pesanan belum dibayar belum masuk antrean kurir");
    await compareAll("Setelah klaim");
    await mutate("warteg1", { action: "payment", offerId: order.id });
    check((await snapshot("kurir1")).offers.some((offer) => offer.id === order.id && isReadyForDelivery(offer)), "Setelah dibayar pesanan masuk antrean kurir");
    check((await snapshot("pasar1")).transactions.some((item) => item.offerId === order.id && item.status === "held_in_escrow"), "Pedagang melihat dana tertahan di escrow");
    await compareAll("Setelah bayar");
    await mutate("kurir1", { action: "delivery", offerId: order.id });
    check((await snapshot("warteg1")).offers.find((offer) => offer.id === order.id)?.status === "settled", "Warteg melihat pesanan selesai");
    check((await snapshot("pasar1")).transactions.some((item) => item.offerId === order.id && item.status === "released"), "Pedagang melihat dana cair");

    // Lot Maggot gratis: klaim langsung siap antar tanpa catatan escrow.
    const maggotLot = buyerView(await snapshot("maggot1"), "maggot1").listings[0];
    if (maggotLot) {
      const maggotClaim = await claimRoute.POST(request("/api/offers/claim", "maggot1", { offerId: maggotLot.id, requestId: "consistency-2" }));
      check(maggotClaim.status === 200, "Maggot mengklaim lot biomassa gratis");
      await mutate("kurir1", { action: "delivery", offerId: maggotLot.id });
    }
    await compareAll("Setelah serah terima");
    console.log(`\nHasil akhir uji konsistensi lintas peran: ${passed} lulus, 0 gagal`);
  } finally {
    supabase.auth.getUser = originalGetUser;
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    rmSync(directory, { recursive: true, force: true });
  }
}

// Galat apa pun mengakhiri proses dengan kode 1 setelah pesan gagal dicetak.
run().catch((error) => {
  console.error("\n❌ [FAIL]", error instanceof Error ? error.message : error);
  process.exit(1);
});
