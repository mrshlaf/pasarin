/**
 * Skrip Pengujian Unit Mandiri: PSR-24 & PSR-25 (Telegram Gateway & Security Suite).
 * Memverifikasi:
 * 1. Otentikasi Webhook menggunakan X-Telegram-Bot-Api-Secret-Token.
 * 2. Validasi tanda tangan kriptografis HMAC-SHA256 initData Telegram Mini App.
 * 3. Penegakan isolasi chat privat (grup ditolak demi privasi harga modal).
 * 4. Pergantian akun dinamis (multi-account switching) dan pencegahan tombol usang (stale buttons).
 * 5. Proteksi brute force login via rate limiting HTTP 429.
 */

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { POST as login } from "../src/app/api/telegram/login/route";
import { POST as webhook } from "../src/app/api/telegram/webhook/route";
import { resetEnvCache } from "../src/lib/env";
import { telegramChatSessions } from "../src/lib/telegramSessions";

// Konfigurasi rahasia bot uji coba
const token = "telegram-test-bot-token";
const secret = "telegram-test-webhook";
const site = "https://pasarin.example.test";
const sent: { text: string; reply_markup?: { inline_keyboard: Record<string, unknown>[][] } }[] = [];

/**
 * Membangun payload otentikasi initData tertandatangani HMAC-SHA256 sebagaimana dikirim Telegram Mini App ke server.
 *
 * @param chat - ID chat telegram pengguna.
 * @param seconds - Waktu Unix epoch tanda tangan dibuat.
 * @returns String URLSearchParams memuat user, auth_date, dan hash HMAC.
 */
function launchData(chat: number, seconds = Math.floor(Date.now() / 1000)) {
  const user = JSON.stringify({ id: chat, first_name: "Tester" });
  const key = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", key).update("auth_date=" + seconds + "\nuser=" + user).digest("hex");
  return new URLSearchParams({ user, auth_date: String(seconds), hash }).toString();
}

/**
 * Memanggil rute otentikasi HTTPS kredensial akun tanpa membocorkan kata sandi pada ruang obrolan Telegram.
 *
 * @param chat - ID obrolan telegram.
 * @param identifier - Username atau email login.
 * @param password - Kata sandi akun.
 * @param initData - String initData yang tertandatangani sah.
 * @returns Response HTTP dari endpoint login.
 */
function signIn(chat: number, identifier: string, password = identifier, initData = launchData(chat)) {
  return login(new NextRequest("http://localhost/api/telegram/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData, identifier, password }),
  }));
}

let updateId = 0;

/**
 * Mengirimkan pembaruan pesan privat atau callback tombol inline melalui handler webhook Telegram resmi.
 *
 * @param chat - ID obrolan telegram.
 * @param input - Isi teks perintah atau callback data.
 * @param callback - Bernilai true jika berupa interaksi tombol inline.
 * @param sender - ID pengirim pesan.
 * @param type - Tipe chat obrolan (private atau group).
 * @returns Respons JSON dari webhook Telegram PASARIN.
 */
async function telegram(chat: number, input: string, callback = false, sender = chat, type = "private") {
  const from = { id: sender };
  const message = { chat: { id: chat, type }, from, text: input };
  const response = await webhook(new NextRequest(site + "/api/telegram/webhook", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Telegram-Bot-Api-Secret-Token": secret },
    body: JSON.stringify({ update_id: ++updateId,
      ...(callback ? { callback_query: { id: String(updateId), from, message, data: input } } : { message }) }),
  }));

  // Memvalidasi bahwa setiap panggilan webhook yang sah mengembalikan status HTTP 200 OK
  assert.equal(response.status, 200, "Webhook sah wajib mengembalikan HTTP 200 OK");
  return response.json();
}

/**
 * Runner utama pengujian alur kerja Telegram Bot Gateway PSR-24 & PSR-25.
 */
async function run() {
  Object.assign(process.env, { NODE_ENV: "development", TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secret });
  delete process.env.PASARIN_STATE_BACKEND;
  delete process.env.SUPABASE_DB_URL;
  delete process.env.PASARIN_SERVER_AUTH;
  delete process.env.NEXT_PUBLIC_PASARIN_SERVER_AUTH;
  resetEnvCache();

  const originalFetch = globalThis.fetch;
  // Mock panggilan jaringan ke Telegram Bot API
  globalThis.fetch = async (input, options) => {
    // Memverifikasi seluruh permintaan keluar diarahkan ke endpoint resmi Telegram Bot API
    assert.ok(String(input).startsWith("https://api.telegram.org/"), "Endpoint tujuan wajib api.telegram.org");
    if (String(input).endsWith("/sendMessage")) sent.push(JSON.parse(String(options?.body)));
    return Response.json({ ok: true, result: { message_id: 1 } });
  };

  try {
    // 1. Uji Perintah /start untuk pengguna baru yang belum login
    // Memvalidasi perintah /start menampilkan antarmuka pemilihan akun login
    assert.equal((await telegram(100, "/start")).actionTaken, "accounts", "Perintah /start wajib membuka layar accounts");
    // Memverifikasi adanya tombol inline Web App login terenkripsi
    assert.deepEqual(sent.at(-1)?.reply_markup?.inline_keyboard[0][0].web_app, { url: site + "/telegram/login" }, "Tombol Web App login wajib tersemat");

    // 2. Uji Penolakan Kredensial Tidak Sah & Tanda Tangan Palsu
    // Memvalidasi penolakan kata sandi salah dengan kode status HTTP 401 Unauthorized
    assert.equal((await signIn(100, "pasar1", "wrong")).status, 401, "Kata sandi salah wajib ditolak HTTP 401");
    // Memvalidasi penolakan data initData yang diubah namanya (tampered/forged)
    assert.equal((await signIn(100, "pasar1", "pasar1", launchData(100).replace("Tester", "Forged"))).status, 401, "Tanda tangan dipalsukan wajib ditolak HTTP 401");
    // Memvalidasi penolakan stempel waktu kedaluwarsa (auth_date lama)
    assert.equal((await signIn(100, "pasar1", "pasar1", launchData(100, 100))).status, 401, "Stempel waktu kedaluwarsa wajib ditolak HTTP 401");

    // 3. Uji Login dan Isolasi Sesi 10 Akun Perwakilan Seluruh Peran
    for (const [index, [username, role]] of [
      ["pasar1", "vendor"], ["pasar2", "vendor"], ["pasar3", "vendor"], ["pasar4", "vendor"],
      ["warteg1", "warteg"], ["sosial1", "social_kitchen"], ["maggot1", "maggot"],
      ["kurir1", "logistics"], ["pengelola1", "manager"], ["admin1", "admin"],
    ].entries()) {
      const chat = 200 + index;
      // Memvalidasi keberhasilan login untuk setiap akun peran resmi
      assert.equal((await signIn(chat, username)).status, 200, `Login akun ${username} wajib sukses HTTP 200`);
      const session = (await telegramChatSessions(chat)).active;
      // Memvalidasi bahwa peran sesi cocok persis dengan yang didaftarkan
      assert.equal(session?.user.role, role, `Peran pengguna aktif ${username} wajib cocok`);
      // Memvalidasi bahwa format email otomatis terhubung ke domain @pasarin.id
      assert.equal(session?.user.email, username + "@pasarin.id", `Email akun wajib menggunakan domain @pasarin.id`);
      // Memvalidasi respons perintah /menu menyambut pengguna aktif
      assert.equal((await telegram(chat, "/menu")).actionTaken, "welcome_existing_user", "Menu pengguna aktif wajib menampilkan welcome_existing_user");
      // Memverifikasi teks pesan menyapa nama pengguna yang bersangkutan
      assert.ok(sent.at(-1)?.text.includes(session!.user.name), "Pesan menu wajib mencantumkan nama pengguna");
    }

    // 3b. Pertanyaan biasa (tanpa "/") dijawab asisten sesuai akun aktif, termasuk aturan privasinya
    assert.equal((await telegram(200, "berapa keuntunganku")).actionTaken, "assistant_answered", "Pertanyaan bebas pedagang wajib dijawab asisten");
    assert.match(sent.at(-1)!.text, /Saldo dompet/, "Jawaban pendapatan wajib memakai saldo dompet akun sendiri");
    assert.equal((await telegram(204, "sayur apa yg paling murah")).actionTaken, "assistant_answered", "Pertanyaan bebas warteg wajib dijawab asisten");
    assert.match(sent.at(-1)!.text, /Termurah|Belum ada penawaran/, "Jawaban harga wajib berasal dari katalog akun");
    await telegram(204, "berapa pendapatan kios A-05");
    assert.match(sent.at(-1)!.text, /bersifat pribadi/, "Data pendapatan kios lain wajib ditolak di Telegram");
    // Pengguna yang belum masuk mendapat jawaban publik beserta tombol masuk
    assert.equal((await telegram(400, "apa itu pasarin")).actionTaken, "accounts", "Pertanyaan pengguna belum masuk wajib disertai menu masuk");
    assert.match(sent.at(-1)!.text, /menyalurkan sisa sayur/, "Pengguna belum masuk wajib mendapat penjelasan publik");
    assert.ok(sent.at(-1)!.reply_markup?.inline_keyboard.flat().some((button) => "web_app" in button), "Jawaban publik wajib menyertakan tombol masuk");

    // 4. Uji Isolasi Kios & Pencegahan Akses Lintas Chat / Grup
    // Memvalidasi bahwa kios yang berbeda memiliki vendorId yang unik dan terisolasi
    assert.notEqual((await telegramChatSessions(200)).active?.user.vendorId, (await telegramChatSessions(201)).active?.user.vendorId, "ID vendor antar pedagang wajib berbeda");
    // Memvalidasi penolakan interaksi jika pengirim pesan tidak cocok dengan pemilik chat
    assert.equal((await telegram(200, "/menu", false, 201)).processed, false, "Pesan dari user lain wajib diabaikan");
    // Memvalidasi penolakan interaksi di grup (Telegram bot hanya melayani private chat demi kerahasiaan harga modal)
    assert.equal((await telegram(200, "/menu", false, 200, "group")).processed, false, "Perintah di dalam obrolan grup wajib ditolak");

    // 5. Uji Multi-Akun & Tombol Usang (Stale Buttons)
    // Login akun pertama (pasar1) pada chat 100
    assert.equal((await signIn(100, "pasar1")).status, 200, "Login akun pasar1 di chat 100 wajib sukses");
    const vendor = (await telegramChatSessions(100)).active!;
    // Login akun kedua (warteg1) pada chat yang sama
    assert.equal((await signIn(100, "warteg1")).status, 200, "Login akun warteg1 di chat 100 wajib sukses");
    const warteg = (await telegramChatSessions(100)).active!;
    // Memvalidasi bahwa setiap sesi memiliki kunci unik (session key) yang berbeda
    assert.notEqual(vendor.key, warteg.key, "Kunci sesi vendor dan warteg wajib berbeda");

    // Memvalidasi tombol inline dari sesi pedagang yang sudah digantikan otomatis berstatus tombol usang (stale_button)
    assert.equal((await telegram(100, vendor.key + ":publish_all", true)).actionTaken, "stale_button", "Tombol dari sesi non-aktif wajib ditandai stale_button");
    assert.equal((await telegram(100, vendor.key + ":logout", true)).actionTaken, "stale_button", "Tombol logout usang wajib ditolak");

    // Memvalidasi penolakan pergantian akun dari chat lain
    assert.equal((await telegram(101, "account:" + vendor.key, true)).actionTaken, "accounts", "Peralihan akun antar-chat berbeda wajib ditolak");
    // Memvalidasi keberhasilan pergantian kembali ke akun vendor pada chat yang sama
    assert.equal((await telegram(100, "account:" + vendor.key, true)).actionTaken, "welcome_existing_user", "Pergantian akun pada chat yang sama wajib diizinkan");

    // Memvalidasi respon alur /pasok untuk pedagang pasar
    assert.equal((await telegram(100, "/pasok")).actionTaken, "stock_usage", "Perintah /pasok wajib merespons panduan penimbangan stok");
    // Memvalidasi penolakan aksi ilegal pedagang mengklaim lot penawaran
    assert.equal((await telegram(100, vendor.key + ":claim:forged", true)).actionTaken, "action_denied", "Klaim ilegal oleh pedagang wajib ditolak action_denied");

    // 6. Uji Logout dan Penutupan Sesi
    // Memvalidasi eksekusi logout sesi aktif
    assert.equal((await telegram(100, "/logout")).actionTaken, "accounts", "Perintah /logout wajib mengembalikan ke menu accounts");
    const remaining = await telegramChatSessions(100);
    // Memvalidasi sesi aktif kosong setelah logout
    assert.equal(remaining.active, undefined, "Sesi aktif wajib kosong pasca-logout");
    // Memverifikasi sesi warteg tetap tersimpan dalam daftar akun
    assert.deepEqual(remaining.accounts.map(({ key }) => key), [warteg.key], "Sesi akun warteg wajib tetap tersimpan");

    // Mengaktifkan kembali akun warteg
    assert.equal((await telegram(100, "account:" + warteg.key, true)).actionTaken, "welcome_existing_user", "Re-aktivasi akun warteg wajib sukses");
    // Memvalidasi bahwa sesi kedaluwarsa setelah 8 jam tidak lagi aktif
    assert.equal((await telegramChatSessions(100, Date.now() + 9 * 60 * 60_000)).active, undefined, "Sesi di atas batas waktu 8 jam wajib kedaluwarsa");
    // Memvalidasi perintah /keluar untuk menghapus seluruh sesi obrolan
    assert.equal((await telegram(100, "/keluar")).actionTaken, "accounts", "Perintah /keluar wajib menutup obrolan");
    assert.equal((await telegramChatSessions(100)).active, undefined, "Sesi chat wajib bersih total");

    // 7. Uji Proteksi Brute Force Login (Rate Limiting HTTP 429)
    // Memvalidasi penolakan percobaan kata sandi salah berulang kali hingga 10 kali
    for (let attempt = 0; attempt < 10; attempt++) {
      assert.equal((await signIn(300, "pasar1", "wrong")).status, 401, "Percobaan salah wajib ditolak HTTP 401");
    }
    // Memvalidasi bahwa sistem mengunci percobaan berulang dengan kode status HTTP 429 Too Many Requests
    assert.equal((await signIn(300, "pasar1")).status, 429, "Sistem wajib mengunci akses brute-force dengan HTTP 429");

    console.log("Telegram login, seven roles, private chats, account switching, expired sessions and stale buttons passed.");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Menjalankan skrip uji Telegram Gateway
void run().catch((error) => { console.error(error); process.exitCode = 1; });
