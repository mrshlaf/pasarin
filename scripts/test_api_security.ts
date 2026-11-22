// Skrip Uji Keamanan API, Autentikasi Peran, & Konsistensi Transaksi (PSR-3 & PSR-40).
// Memverifikasi:
// 1. Proteksi otentikasi Bearer token pada seluruh rute API sensitif (HTTP 401 & HTTP 403).
// 2. Penolakan input rusak atau tidak sesuai skema Zod (HTTP 400 & HTTP 422).
// 3. Kinetika peluruhan dinamis dan penimbangan fisik pedagang sebelum penerbitan lot.
// 4. Penguncian atomik klaim pembeli untuk mencegah race condition (HTTP 200 vs HTTP 409).
// 5. Siklus pembayaran QRIS Escrow dan serah terima logistik.
// 6. Paritas fitur Telegram Bot dengan web workspace.
// 7. Isolasi sesi uji lokal agar tidak bocor ke lingkungan produksi.

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

// Menyiapkan direktori penyimpanan terisolasi untuk pengujian lokal
const directory = mkdtempSync(join(tmpdir(), "pasarin-market-test-"));
// Berkas state JSON milik rute API; tes menyuntingnya langsung untuk memajukan umur stok.
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

// Mock autentikasi Supabase untuk memvalidasi token berbasis peran resmi
const verifyUser = supabase.auth.getUser;
supabase.auth.getUser = async (token) => {
  // Token uji berupa nama peran mentah (mis. "Bearer vendor"); token lain dibalas seperti JWT rusak.
  const role = APP_ROLES.find((item) => item === token);
  if (!role) return { data: { user: null }, error: new AuthApiError("Invalid test token", 401, "bad_jwt") };
  const user: User = {
    id: role, email: role + "@example.test", aud: "authenticated", created_at: new Date().toISOString(),
    app_metadata: { pasarin_role: role, ...(role === "vendor" && { pasarin_vendor_id: "vendor_kramat_01" }) },
    user_metadata: { name: role },
  };
  return { data: { user }, error: null };
};

// Membangun objek NextRequest pembawa Bearer token otorisasi atau secret token Telegram.
function request(body?: unknown, role?: AppRole, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api", {
    method: body === undefined ? "GET" : "POST",
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...(role ? { Authorization: "Bearer " + role } : {}), ...headers },
  });
}

// Membaca snapshot data ruang kerja terotorisasi, mencakup evaluasi kinetika peluruhan terkini.
async function view(role: AppRole) {
  const response = await state(request(undefined, role));
  // Memvalidasi pembacaan state ruang kerja terotorisasi menghasilkan HTTP 200 OK
  assert.equal(response.status, 200, "Pembacaan state dengan peran sah wajib HTTP 200 OK");
  return (await response.json()).data;
}

// Mensimulasikan pesan privat atau penekanan tombol callback Telegram yang terotentikasi.
async function sendTelegram(chat: number, id: number, action: string, callback = false) {
  const message = { chat: { id: chat, type: "private" }, from: { id: chat }, text: action };
  const session = callback ? (await telegramChatSessions(chat)).active : undefined;
  return telegram(request({
    update_id: id,
    ...(callback ? { callback_query: { id: String(id), from: { id: chat }, message, data: session?.key + ":" + action } } : { message }),
  }, undefined, { "X-Telegram-Bot-Api-Secret-Token": "telegram-test-secret" }));
}

// Menjalankan pengujian terpadu alur pencatatan stok, kinetika peluruhan, reservasi, pembayaran QRIS, dan serah terima.
async function run() {
  // 1. Uji Penolakan Permintaan Tanpa Token Otorisasi (HTTP 401 Unauthorized)
  // Memvalidasi endpoint state menolak akses anonim tanpa header Authorization
  assert.equal((await state(request())).status, 401, "Akses tanpa auth wajib ditolak HTTP 401");
  // Memvalidasi ringkasan pasar publik awal menampilkan 0 lot tersedia
  assert.equal((await (await overview()).json()).data.availableLots, 0, "Overview awal wajib 0 lot tersedia");
  // Memvalidasi pembaruan paksa cuaca memerlukan autentikasi
  assert.equal((await forecast(new NextRequest("http://localhost/api/telemetry/weather?refresh=true"))).status, 401, "Pembaruan cuaca tanpa auth wajib HTTP 401");
  // Memvalidasi pencatatan mutu tanpa auth ditolak HTTP 401
  assert.equal((await recordQuality(request({}))).status, 401, "Pencatatan mutu tanpa auth wajib ditolak");

  // 2. Uji Inspeksi Publik Gerbang Mutu
  const publicQuality = await inspectQuality(new NextRequest("http://localhost/api/quality-gate/validate?commodityId=kangkung&requestedTier=tier_3&hoursOnDisplay=0"));
  const inspection = (await publicQuality.json()).data;
  // Memvalidasi kangkung segar pajang 0 jam dilarang masuk tier_3 maggot
  assert.equal(inspection.gateStatus, "blocked", "Sayuran segar 0 jam wajib diblokir ke tier_3");
  assert.equal(inspection.auditEventId, undefined, "Pemeriksaan publik tidak mencatat event audit");
  assert.equal(inspection.reputationPenaltyApplied, 0, "Pemeriksaan publik tanpa vendor tidak menjatuhkan penalti");

  // 3. Uji Penolakan Token Fiktif, Webhook Tanpa Secret, & Cron Liar
  // Memvalidasi token peran fiktif ditolak HTTP 401
  assert.equal((await state(request(undefined, undefined, { Authorization: "Bearer invented" }))).status, 401, "Token fiktif wajib ditolak HTTP 401");
  // Memvalidasi webhook telegram tanpa secret token ditolak HTTP 401
  assert.equal((await telegram(request({}))).status, 401, "Webhook Telegram tanpa secret token wajib HTTP 401");
  // Memvalidasi pemanggilan cron tanpa secret token ditolak HTTP 401
  assert.equal((await sweep(request(undefined, undefined, { "x-vercel-cron": "1" }))).status, 401, "Pemicuan cron tanpa secret wajib HTTP 401");
  // Memvalidasi payload JSON rusak ditolak HTTP 400 Bad Request
  assert.equal((await update(request("{", "admin"))).status, 400, "Payload JSON rusak wajib ditolak HTTP 400");
  // Memvalidasi peran warteg dilarang mencatat stok kios (HTTP 403 Forbidden)
  assert.equal((await update(request({ action: "stock", commodityId: "kangkung", quantityKg: 20 }, "warteg"))).status, 403, "Warteg dilarang mencatat stok kios");
  // Memvalidasi inventaris kios vendor masih kosong sebelum pencatatan
  assert.equal((await view("vendor")).stocks.length, 0, "Inventaris vendor awal wajib kosong");

  // 4. Uji Pencatatan Stok Kios & Peluruhan Arrhenius Seiring Waktu
  // Memvalidasi pencatatan stok 20 kg kangkung oleh vendor berhasil HTTP 200 OK
  assert.equal((await update(request({ action: "stock", commodityId: "kangkung", quantityKg: 20 }, "vendor"))).status, 200, "Pencatatan stok vendor wajib sukses");
  const initial = await view("vendor");
  const stock = initial.stocks[0];
  // Memvalidasi skor pembusukan kangkung yang baru dicatat masih sangat segar (< 0.01)
  assert.ok(initial.stockHealth[stock.id].decayScore < 0.01, "Skor pembusukan awal wajib sangat segar");

  // Mensimulasikan pemaparan waktu 1 jam pada file state
  const recorded = JSON.parse(readFileSync(stateFile, "utf8")) as ServerState;
  recorded.stocks[0].createdAt = new Date(Date.now() - 3600000).toISOString();
  writeFileSync(stateFile, JSON.stringify(recorded));
  const after = await view("vendor");
  // Memvalidasi bahwa skor peluruhan meningkat setelah pemaparan waktu 1 jam
  assert.ok(after.stockHealth[stock.id].decayScore > initial.stockHealth[stock.id].decayScore, "Skor peluruhan wajib bertambah seiring waktu");

  // 5. Uji Penimbangan Fisik Pedagang Sebelum Publikasi Penawaran
  // Memvalidasi publikasi tanpa penimbangan fisik ditolak HTTP 422 Unprocessable
  assert.equal((await update(request({ action: "publish", stockId: stock.id }, "vendor"))).status, 422, "Publikasi tanpa konfirmasi timbang wajib HTTP 422");
  // Memvalidasi klaim sisa timbangan melebihi stok awal (21 kg > 20 kg) ditolak HTTP 422
  assert.equal((await update(request({ action: "publish", stockId: stock.id, confirmation: { confirmedKg: 21 } }, "vendor"))).status, 422, "Timbangan melebihi stok awal wajib ditolak");

  // Memvalidasi konfirmasi timbang sisa 18 kg fisik berhasil dipublikasikan
  const publish = await update(request({ action: "publish", stockId: stock.id, confirmation: { confirmedKg: 18 } }, "vendor"));
  assert.equal(publish.status, 200, "Konfirmasi timbangan 18 kg wajib sukses HTTP 200");
  const weighed = await view("vendor");
  assert.equal(weighed.stocks[0].initialKg, 20, "Stok awal tetap tercatat 20 kg");
  assert.equal(weighed.stocks[0].remainingKg, 18, "Stok sisa fisik terverifikasi 18 kg");
  assert.ok(weighed.stocks[0].verifiedAt, "Stempel waktu verifikasi fisik wajib tercatat");

  // 6. Uji Katalog Pembeli, Isolasi Peran, dan Penguncian Atomik Konkuren
  const offerId = weighed.offers[0].id;
  // Memvalidasi penawaran yang sudah terbit terlihat di katalog warteg
  assert.equal((await (await catalog(request(undefined, "warteg"))).json()).data[0].id, offerId, "Penawaran wajib muncul di katalog warteg");
  // Memvalidasi sentra maggot dilarang mengklaim penawaran komersial Tier 1 (HTTP 403)
  assert.equal((await claim(request({ offerId }, "maggot"))).status, 403, "Maggot dilarang klaim penawaran Tier 1");

  // Mensimulasikan perebutan klaim serentak oleh dua warteg (Race Condition)
  const claims = await Promise.all([claim(request({ offerId }, "warteg")), claim(request({ offerId }, "warteg"))]);
  // Memvalidasi penguncian atomik: satu klaim sukses HTTP 200, klaim kedua ditolak HTTP 409 Conflict
  assert.deepEqual(claims.map((response) => response.status).sort(), [200, 409], "Penguncian atomik wajib mencegah double-claim");
  // Memvalidasi status penawaran berubah menjadi claimed
  assert.equal((await view("vendor")).offers[0].status, "claimed", "Status penawaran wajib claimed");
  // Memvalidasi penawaran belum masuk antrean kurir sebelum dibayar
  assert.equal((await view("logistics")).offers.length, 0, "Kurir belum melihat penawaran sebelum dibayar");
  // Memvalidasi kurir dilarang mengantar sebelum pembayaran lunas
  assert.equal((await update(request({ action: "delivery", offerId }, "logistics"))).status, 409, "Pengantaran sebelum lunas wajib ditolak HTTP 409");
  // Memvalidasi pembayaran oleh warteg berhasil HTTP 200
  assert.equal((await update(request({ action: "payment", offerId }, "warteg"))).status, 200, "Pembayaran warteg wajib sukses HTTP 200");

  // 7. Uji Escrow Settlement & Serah Terima Pengantaran Logistik
  // Memvalidasi status dana penawaran berada di rekening bersama (held_in_escrow)
  assert.equal((await view("logistics")).offers[0].paymentStatus, "held_in_escrow", "Status pembayaran wajib held_in_escrow");
  // Memvalidasi warteg dilarang mengonfirmasi pengantaran kurir (HTTP 403)
  assert.equal((await update(request({ action: "delivery", offerId }, "warteg"))).status, 403, "Warteg dilarang konfirmasi pengantaran");
  // Memvalidasi kurir resmi berhasil mengonfirmasi serah terima sayur (HTTP 200)
  assert.equal((await update(request({ action: "delivery", offerId }, "logistics"))).status, 200, "Konfirmasi pengantaran kurir wajib sukses");
  // Memvalidasi idempotensi: pengulangan klik konfirmasi serah terima tetap aman (HTTP 200)
  assert.equal((await update(request({ action: "delivery", offerId }, "logistics"))).status, 200, "Idempotensi konfirmasi kurir wajib aman");

  const closed = await view("vendor");
  // Memvalidasi stok fisik berkurang menjadi 0 kg setelah diserahterimakan
  assert.equal(closed.stocks[0].remainingKg, 0, "Sisa stok fisik wajib 0 kg");
  // Memvalidasi transaksi tercatat pada buku besar audit finansial
  assert.equal(closed.transactions.length, 1, "Transaksi wajib tercatat di riwayat");
  // Memvalidasi saldo dompet pedagang bertambah sesuai nilai transaksi penjualan
  assert.equal(closed.vendorWalletIdr, closed.transactions[0].amountIdr, "Saldo pedagang wajib bertambah sesuai transaksi");
  // Memvalidasi status penawaran di warteg menjadi settled
  assert.equal((await view("warteg")).offers[0].status, "settled", "Status penawaran warteg wajib settled");

  const publicState = (await (await overview()).json()).data;
  // Memvalidasi rekapitulasi metrik publik pengantaran selesai bertambah menjadi 1
  assert.equal(publicState.completedDeliveries, 1, "Metrik publik pengantaran selesai wajib 1");
  assert.equal(publicState.distributedKg, closed.offers[0].quantityKg, "Volume terdistribusi wajib cocok");
  assert.deepEqual(Object.keys(publicState).sort(), ["availableKg", "availableLots", "completedDeliveries", "distributedKg", "forecast", "lanes", "topCommodities"]);

  // 8. Uji Paritas Bot Telegram dengan Web Dashboard
  for (const [chat, role] of [[11, "vendor"], [22, "warteg"], [33, "logistics"], [44, "manager"], [55, "social_kitchen"], [66, "maggot"]] as const) {
    await startTelegramSession(chat, {
      id: role, name: role, role, email: role + "@example.test", organization: "",
      ...(role === "vendor" ? { vendorId: "vendor_kramat_01" } : {}),
    });
  }
  // Memvalidasi pedagang mencatat pasokan via bot Telegram (/pasok bayam 12)
  assert.equal((await sendTelegram(11, 101, "/pasok bayam 12")).status, 200, "Perintah /pasok telegram wajib HTTP 200");
  // Update ID yang sama dikirim ulang untuk memastikan webhook mengabaikan update duplikat dari Telegram.
  await sendTelegram(11, 101, "/pasok bayam 12");
  const telegramStock = (await view("vendor")).stocks[0];
  assert.equal((await view("vendor")).stocks.length, 2, "Stok pedagang bertambah via Telegram");
  // Memvalidasi penerbitan penawaran via Telegram (/terbitkan <id> 10)
  assert.equal((await (await sendTelegram(11, 102, "/terbitkan " + telegramStock.id + " 10")).json()).actionTaken, "offer_published", "Penerbitan via bot wajib offer_published");
  const botOffer = (await view("warteg")).offers.find((offer: RescueOffer) => offer.status === "active").id;

  // Memvalidasi klaim sebagian 4 kg oleh warteg via Telegram (/klaim <id> 4)
  assert.equal((await (await sendTelegram(22, 103, "/klaim " + botOffer + " 4")).json()).actionTaken, "order_reserved", "Klaim sebagian Telegram wajib order_reserved");
  // Klaim duplikat dengan update ID sama tidak boleh membuat pesanan kedua.
  await sendTelegram(22, 103, "/klaim " + botOffer + " 4");
  const partial = await view("warteg");
  const botOrder = partial.offers.find((offer: RescueOffer) => offer.listingId === botOffer);
  assert.equal(partial.offers.filter((offer: RescueOffer) => offer.listingId === botOffer).length, 1);
  assert.equal(botOrder.quantityKg, 4, "Kuantitas pesanan klaim sebagian wajib 4 kg");
  assert.equal(partial.offers.find((offer: RescueOffer) => offer.id === botOffer).quantityKg, 6, "Sisa penawaran di katalog wajib 6 kg");

  // Memvalidasi pelunasan pembayaran pesanan Telegram
  await sendTelegram(22, 104, "pay:" + botOrder.id, true);
  assert.ok((await view("logistics")).offers.some((offer: RescueOffer) => offer.id === botOrder.id && offer.status === "claimed"), "Pesanan terbayar wajib masuk antrean kurir");
  // Memvalidasi serah terima kurir via Telegram
  await sendTelegram(33, 105, "deliver:" + botOrder.id, true);
  assert.equal((await view("warteg")).offers.find((offer: RescueOffer) => offer.id === botOrder.id).status, "settled", "Status pesanan wajib settled");
  assert.equal((await view("vendor")).stocks.find((item: { id: string }) => item.id === telegramStock.id).remainingKg, 6, "Sisa stok fisik di lapak wajib 6 kg");

  // 9. Uji Kueri Manajerial & Laporan DLH
  const summary = await (await ask(request({ query: "Berapa pengantaran hari ini?", forceHeuristic: true }, "manager"))).json();
  // Memvalidasi metrik total pengantaran hari ini tercatat tepat 2 pengantaran
  assert.equal(summary.data.metrics.deliveriesToday, 2, "Total pengantaran hari ini wajib 2");
  assert.equal((await (await sendTelegram(44, 106, "/dlh")).json()).actionTaken, "dlh_reported", "Perintah /dlh wajib menampilkan laporan DLH");
  assert.equal((await (await sendTelegram(44, 106, "/tanya berapa pengantaran hari ini")).json()).actionTaken, "help_displayed", "Perintah /tanya wajib menampilkan bantuan");
  assert.equal((await (await sendTelegram(44, 107, "menu:pratinjau:warteg:2", true)).json()).actionTaken, "preview_workspace", "Pratinjau peran oleh manajer wajib diizinkan");
  assert.equal((await (await sendTelegram(11, 108, "/pratinjau warteg")).json()).actionTaken, "help_displayed", "Pedagang dilarang mengintip workspace warteg");

  // 10. Uji Penyaluran Donasi Sosial & Biokonversi Maggot
  for (const [role, min, max, mode] of [
    ["social_kitchen", 0.65, 0.85, "donation"],
    ["social_kitchen", 0.65, 0.85, "sale"],
    ["maggot", 0.85, 1.01, "free"],
  ] as const) {
    assert.equal((await update(request({ action: "stock", commodityId: "kangkung", quantityKg: 8 }, "vendor"))).status, 200, "Pencatatan lot uji wajib sukses");
    const saved = JSON.parse(readFileSync(stateFile, "utf8")) as ServerState;
    const lot = saved.stocks[0];
    // Mundurkan umur lot per jam sampai skor peluruhan masuk rentang tier target (cuaca dikunci 32 C, 75%).
    for (let hours = 1; hours < 150; hours++) {
      lot.createdAt = new Date(Date.now() - hours * 3600000).toISOString();
      const score = evaluateMarketStock(lot, { temperatureC: 32, humidityPercent: 75 })?.decayScore ?? 0;
      if (score >= min && score < max) break;
    }
    writeFileSync(stateFile, JSON.stringify(saved));
    if (mode === "donation") {
      assert.equal((await review(request({}, "admin"))).status, 200, "Evaluasi stok oleh admin wajib sukses");
      const proposal = (await view("vendor")).offers.find((item: RescueOffer) => item.stockId === lot.id);
      assert.equal(proposal.status, "pending_vendor", "Status usulan awal wajib pending_vendor");
      const approval = { action: "vendor_decision", offerId: proposal.id, approved: true };
      assert.equal((await update(request({ ...approval, confirmation: { confirmedKg: 6 } }, "vendor"))).status, 422, "Persetujuan tanpa mode donasi/jual wajib HTTP 422");
      assert.equal((await update(request({ ...approval, confirmation: { confirmedKg: 6, mode } }, "vendor"))).status, 200, "Persetujuan pedagang wajib sukses HTTP 200");
    } else {
      assert.equal((await update(request({ action: "publish", stockId: lot.id, confirmation: { confirmedKg: 6, mode: mode === "free" ? undefined : mode } }, "vendor"))).status, 200);
    }
    const eligible = (await view(role)).offers.find((item: RescueOffer) => item.stockId === lot.id);
    assert.ok(eligible, "Penawaran wajib muncul bagi mitra yang berhak");
    assert.equal(eligible.distributionMode, mode, "Mode distribusi wajib sesuai");
    assert.equal((await claim(request({ offerId: eligible.id, quantityKg: 2, donated: true }, role))).status, 422, "Parameter donated ilegal wajib ditolak");

    const placement = { offerId: eligible.id, quantityKg: 2, requestId: "partial-" + eligible.id };
    const reserved = await claim(request(placement, role));
    assert.equal(reserved.status, 200, "Klaim sebagian oleh mitra sosial/maggot wajib sukses");
    const order = (await reserved.json()).data.offer as RescueOffer;
    assert.equal(order.quantityKg, 2, "Kuantitas pesanan wajib tepat 2 kg");
    assert.equal(order.totalAmountIdr, mode === "sale" ? order.salvagePricePerKg * 2 : 0, "Nominal rupiah donasi wajib Rp 0");
    const retry = await claim(request(placement, role));
    assert.equal((await retry.json()).data.offer.id, order.id, "Idempotensi klaim dengan requestId sama wajib mengembalikan pesanan identik");
    assert.equal((await view(role)).offers.find((item: RescueOffer) => item.id === eligible.id).quantityKg, 4, "Sisa kuantitas katalog wajib berkurang menjadi 4 kg");

    if (mode === "sale") {
      assert.equal((await update(request({ action: "delivery", offerId: order.id }, "logistics"))).status, 409, "Pengantaran sebelum dibayar wajib ditolak");
      assert.equal((await update(request({ action: "payment", offerId: order.id }, role))).status, 200, "Pembayaran wajib sukses");
    }
    assert.equal((await update(request({ action: "delivery", offerId: order.id }, "logistics"))).status, 200, "Konfirmasi serah terima kurir wajib sukses");
    assert.equal((await view(role)).offers.find((item: RescueOffer) => item.id === order.id).status, "settled", "Status pesanan wajib settled");

    if (mode === "donation") {
      const another = (await (await claim(request({ offerId: eligible.id, quantityKg: 1 }, role))).json()).data.offer as RescueOffer;
      assert.equal((await update(request({ action: "delivery", offerId: another.id }, "logistics"))).status, 200, "Pengantaran donasi wajib sukses");
      // Memvalidasi poin reputasi pedagang bertambah 1 per lot donasi yang selesai
      assert.equal(completedDonationLots((await view("vendor")).offers, lot.vendorId), 1, "Poin donasi pedagang wajib bertambah");
    }
  }

  // Memvalidasi manajer pasar dilarang memicu evaluasi stok otonom (hanya admin yang berhak)
  assert.equal((await review(request({}, "manager"))).status, 403, "Manajer dilarang memicu evaluasi stok");
  assert.equal((await review(request({}, "admin"))).status, 200, "Admin berhak memicu evaluasi stok");
  for (const role of APP_ROLES) await view(role);
  // Memvalidasi pemicuan sapuan otonom sore 14:30 WIB dengan secret key yang sah
  assert.equal((await sweep(request(undefined, undefined, { Authorization: "Bearer cron-test-secret" }))).status, 200, "Sapuan otonom 14:30 dengan secret wajib sukses");
  console.log("Seven roles, live decay, concurrent claim, payment, handover, Telegram parity and orchestration passed.");

  // 11. Uji Privasi Usulan Sapuan Sore Sebelum Verifikasi Fisik
  assert.equal((await update(request({ action: "stock", commodityId: "kangkung", quantityKg: 200 }, "vendor"))).status, 200, "Pencatatan stok 200 kg wajib sukses");
  const savedLarge = JSON.parse(readFileSync(stateFile, "utf8")) as ServerState;
  const largeLot = savedLarge.stocks[0];
  // Umur lot dimundurkan sampai skor 0,65-0,85 agar sapuan sore mengusulkannya ke jalur Tier 2.
  for (let hours = 1; hours < 150; hours++) {
    largeLot.createdAt = new Date(Date.now() - hours * 3600000).toISOString();
    const score = evaluateMarketStock(largeLot, { temperatureC: 32, humidityPercent: 75 })?.decayScore ?? 0;
    if (score >= 0.65 && score < 0.85) break;
  }
  writeFileSync(stateFile, JSON.stringify(savedLarge));
  assert.equal((await sweep(request(undefined, undefined, { Authorization: "Bearer cron-test-secret" }))).status, 200, "Sapuan otonom sore wajib sukses");
  const afterSweep = await view("vendor");
  const proposal = afterSweep.offers.find((item: RescueOffer) => item.stockId === largeLot.id);
  // Memvalidasi status usulan berada pada pending_vendor (menunggu persetujuan pedagang)
  assert.equal(proposal.status, "pending_vendor", "Status usulan sapuan wajib pending_vendor");
  assert.ok(proposal.quantityKg > 0 && proposal.quantityKg < 200, "Estimasi surplus berkurang dari stok awal");
  assert.equal(afterSweep.stocks[0].remainingKg, 200, "Stok fisik lapak belum berkurang sebelum ditimbang");
  assert.equal(afterSweep.stocks[0].verifiedAt, undefined, "Belum terverifikasi timbang fisik");
  assert.equal(afterSweep.estimatedUnsoldKg[largeLot.id], proposal.quantityKg, "Estimasi sisa tercatat presisi");

  // Memvalidasi idempotensi sapuan: pemicuan ulang tidak menggandakan usulan
  assert.equal((await sweep(request(undefined, undefined, { Authorization: "Bearer cron-test-secret" }))).status, 200, "Pemicuan ulang sapuan sore wajib sukses");
  const repeated = (await view("vendor")).offers.filter((item: RescueOffer) => item.stockId === largeLot.id && item.status === "pending_vendor");
  assert.deepEqual(repeated.map((item: RescueOffer) => item.id), [proposal.id], "Usulan sapuan tidak boleh digandakan");

  // Memvalidasi privasi: penawaran belum diverifikasi TIDAK terlihat oleh warteg, dapur sosial, atau maggot
  for (const role of ["warteg", "social_kitchen", "maggot"] as const) {
    const buyer = await view(role);
    assert.ok(!buyer.offers.some((item: RescueOffer) => item.stockId === largeLot.id), `Penawaran pending dilarang terlihat oleh ${role}`);
    assert.ok(!buyer.stocks.some((item: { id: string }) => item.id === largeLot.id), `Stok mentah dilarang terlihat oleh ${role}`);
  }

  const publicBefore = (await (await overview()).json()).data.lanes.tier_2.kg;
  const approval = { action: "vendor_decision", offerId: proposal.id, approved: true };
  // Memvalidasi penolakan jika kuantitas konfirmasi pedagang tidak konsisten
  assert.equal((await update(request({ ...approval, confirmation: { confirmedKg: 57, offeredKg: 58, mode: "sale" } }, "vendor"))).status, 422, "Kuantitas tidak konsisten wajib HTTP 422");
  // Memvalidasi konfirmasi pedagang menimbang sisa fisik 57 kg sukses HTTP 200
  assert.equal((await update(request({ ...approval, confirmation: { confirmedKg: 57, mode: "sale" } }, "vendor"))).status, 200, "Konfirmasi timbang 57 kg wajib sukses HTTP 200");

  const afterApproval = await view("vendor");
  assert.equal(afterApproval.stocks[0].remainingKg, 57, "Sisa stok fisik di lapak terkoreksi menjadi 57 kg");
  const listing = (await view("social_kitchen")).offers.find((item: RescueOffer) => item.id === proposal.id);
  assert.equal(listing.quantityKg, 57, "Katalog dapur sosial menerima kuantitas tepat 57 kg");
  assert.equal(listing.status, "active", "Status penawaran resmi aktif");
  assert.equal((await (await overview()).json()).data.lanes.tier_2.kg - publicBefore, 57, "Rekap publik Tier 2 bertambah 57 kg");
  console.log("Cron estimate stays private until seller weighs stock and confirms publication quantity.");
}

// Menguji pemanggilan Google Gemini SDK dengan upstream mock yang memvalidasi integritas payload pasar.
async function checkGemini() {
  const fetchBefore = globalThis.fetch;
  process.env.GEMINI_API_KEY = "fixture-gemini-key";
  resetEnvCache();
  let called = false;
  // Mock fetch khusus endpoint Google Generative Language API
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const configuredGeminiBase = process.env.GOOGLE_GEMINI_BASE_URL;
    const configuredOrigin = configuredGeminiBase ? new URL(configuredGeminiBase).origin : undefined;
    if (!url.includes("generativelanguage.googleapis.com") && new URL(url).origin !== configuredOrigin) return fetchBefore(input, init);
    called = true;
    const body = typeof init?.body === "string" ? init.body : input instanceof Request ? await input.text() : "";
    // Memvalidasi payload kueri memuat konteks deliveriesToday
    assert.match(body, /deliveriesToday/, "Body kueri LLM wajib memuat parameter deliveriesToday");
    return Response.json({ candidates: [{ content: { role: "model", parts: [{ text: "Empat pengantaran selesai hari ini." }] }, finishReason: "STOP" }] });
  };

  try {
    const response = await ask(request({ query: "Berapa pengantaran hari ini?" }, "manager"));
    const result = await response.json();
    // Memvalidasi respons HTTP 200 OK dari endpoint AI query
    assert.equal(response.status, 200, "Kueri AI manajerial wajib sukses HTTP 200 OK");
    assert.equal(called, true, "Upstream Gemini wajib terpanggil");
    assert.equal(result.data.source, "gemini", "Sumber inferensi wajib dari model gemini");
    assert.equal(result.data.metrics.deliveriesToday, 6, "Metrik pengantaran terhitung tepat 6");
    console.log("Gemini SDK request and response passed with an isolated upstream.");
  } finally {
    globalThis.fetch = fetchBefore;
    delete process.env.GEMINI_API_KEY;
    resetEnvCache();
  }
}

// Memverifikasi kredensial uji lokal dan memastikan sesi pengujian tidak dapat diakses di luar lingkungan pengembangan.
async function checkLocalTestSessions() {
  const environment = process.env.NODE_ENV;
  const databaseUrl = process.env.SUPABASE_DB_URL;
  // Login lokal sebagai pasar1 dengan kata sandi dan header opsional untuk menguji penolakan origin/proxy.
  const login = (password: string, headers?: Record<string, string>) =>
    localLogin(request({ username: "pasar1", password }, undefined, headers));

  try {
    Object.assign(process.env, { NODE_ENV: "development" });
    // Memvalidasi kata sandi salah ditolak HTTP 401
    assert.equal((await login("wrong")).status, 401, "Kata sandi salah lokal wajib ditolak HTTP 401");
    // Memvalidasi penolakan akses dari domain origin eksternal (HTTP 404)
    assert.equal((await login("pasar1", { Origin: "http://external.example" })).status, 404, "Origin luar wajib ditolak HTTP 404");
    // Memvalidasi penolakan akses dari IP proxy luar (HTTP 404)
    assert.equal((await login("pasar1", { "X-Forwarded-For": "192.0.2.10" })).status, 404, "Akses proxy luar wajib ditolak HTTP 404");

    const response = await login("pasar1");
    // Memvalidasi login lokal berhasil di lingkungan development
    assert.equal(response.status, 200, "Login lokal development wajib sukses HTTP 200");
    assert.equal((await response.json()).user.role, "vendor", "Peran akun pasar1 wajib vendor");
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie, "Set-Cookie sesi uji lokal wajib terpasang");

    // Memvalidasi cookie otentikasi dapat membaca state ruang kerja
    assert.equal((await state(request(undefined, undefined, { Cookie: cookie }))).status, 200, "Akses dengan cookie sah wajib HTTP 200");
    // Memvalidasi penolakan cookie yang dimanipulasi (tampered cookie)
    assert.equal((await state(request(undefined, undefined, { Cookie: cookie.replace("pasar1.", "admin1.") }))).status, 401, "Cookie dimanipulasi wajib ditolak HTTP 401");
    // Memvalidasi akun vendor dilarang mengakses evaluasi admin via cookie (HTTP 403)
    assert.equal((await review(request({}, undefined, { Cookie: cookie }))).status, 403, "Vendor dilarang evaluasi admin");

    // Uji isolasi saat database Supabase aktif
    process.env.SUPABASE_DB_URL = "postgresql://127.0.0.1:1/pasarin";
    assert.equal((await login("pasar1")).status, 404, "Login lokal dilarang saat koneksi Supabase terkonfigurasi");
    assert.equal((await state(request(undefined, undefined, { Cookie: cookie }))).status, 401, "Cookie lokal tidak berlaku saat database aktif");
    delete process.env.SUPABASE_DB_URL;

    // Uji isolasi saat di lingkungan produksi (NODE_ENV = production)
    Object.assign(process.env, { NODE_ENV: "production" });
    assert.equal((await login("pasar1")).status, 404, "Login lokal dilarang keras pada mode production");
    assert.equal((await state(request(undefined, undefined, { Cookie: cookie }))).status, 401, "Sesi uji lokal wajib ditolak pada mode production");
    console.log("Local test sign-in, role enforcement, database isolation and production isolation passed.");
  } finally {
    Object.assign(process.env, { NODE_ENV: environment });
    if (databaseUrl === undefined) delete process.env.SUPABASE_DB_URL;
    else process.env.SUPABASE_DB_URL = databaseUrl;
  }
}

// Menjalankan seluruh pengujian integrasi keamanan API sekuensial
void run().then(checkGemini).then(checkLocalTestSessions).catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  supabase.auth.getUser = verifyUser;
  rmSync(directory, { recursive: true, force: true });
});
