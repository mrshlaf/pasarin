import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { POST as login } from "../src/app/api/telegram/login/route";
import { POST as webhook } from "../src/app/api/telegram/webhook/route";
import { resetEnvCache } from "../src/lib/env";
import { telegramChatSessions } from "../src/lib/telegramSessions";

const token = "telegram-test-bot-token";
const secret = "telegram-test-webhook";
const site = "https://pasarin.example.test";
const sent: { text: string; reply_markup?: { inline_keyboard: Record<string, unknown>[][] } }[] = [];

/** Membangun payload otentikasi initData tertandatangani HMAC-SHA256 sebagaimana dikirim Telegram Mini App ke server. */
function launchData(chat: number, seconds = Math.floor(Date.now() / 1000)) {
  const user = JSON.stringify({ id: chat, first_name: "Tester" });
  const key = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", key).update("auth_date=" + seconds + "\nuser=" + user).digest("hex");
  return new URLSearchParams({ user, auth_date: String(seconds), hash }).toString();
}

/** Memanggil rute otentikasi HTTPS kredensial akun tanpa membocorkan kata sandi pada ruang obrolan Telegram. */
function signIn(chat: number, identifier: string, password = identifier, initData = launchData(chat)) {
  return login(new NextRequest("http://localhost/api/telegram/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData, identifier, password }),
  }));
}

let updateId = 0;

/** Mengirimkan pembaruan pesan privat atau callback tombol inline melalui handler webhook Telegram resmi. */
async function telegram(chat: number, input: string, callback = false, sender = chat, type = "private") {
  const from = { id: sender };
  const message = { chat: { id: chat, type }, from, text: input };
  const response = await webhook(new NextRequest(site + "/api/telegram/webhook", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Telegram-Bot-Api-Secret-Token": secret },
    body: JSON.stringify({ update_id: ++updateId,
      ...(callback ? { callback_query: { id: String(updateId), from, message, data: input } } : { message }) }),
  }));
  assert.equal(response.status, 200);
  return response.json();
}

/** Menguji alur otentikasi login, isolasi sesi chat, pergantian akun pasar, serta pencegahan aksi usang atau palsu. */
async function run() {
  Object.assign(process.env, { NODE_ENV: "development", TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secret });
  delete process.env.PASARIN_STATE_BACKEND;
  delete process.env.SUPABASE_DB_URL;
  delete process.env.PASARIN_SERVER_AUTH;
  delete process.env.NEXT_PUBLIC_PASARIN_SERVER_AUTH;
  resetEnvCache();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    assert.ok(String(input).startsWith("https://api.telegram.org/"));
    if (String(input).endsWith("/sendMessage")) sent.push(JSON.parse(String(options?.body)));
    return Response.json({ ok: true, result: { message_id: 1 } });
  };
  try {
    assert.equal((await telegram(100, "/start")).actionTaken, "accounts");
    assert.deepEqual(sent.at(-1)?.reply_markup?.inline_keyboard[0][0].web_app, { url: site + "/telegram/login" });
    assert.equal((await signIn(100, "pasar1", "wrong")).status, 401);
    assert.equal((await signIn(100, "pasar1", "pasar1", launchData(100).replace("Tester", "Forged"))).status, 401);
    assert.equal((await signIn(100, "pasar1", "pasar1", launchData(100, 100))).status, 401);

    for (const [index, [username, role]] of [
      ["pasar1", "vendor"], ["pasar2", "vendor"], ["pasar3", "vendor"], ["pasar4", "vendor"],
      ["warteg1", "warteg"], ["sosial1", "social_kitchen"], ["maggot1", "maggot"],
      ["kurir1", "logistics"], ["pengelola1", "manager"], ["admin1", "admin"],
    ].entries()) {
      const chat = 200 + index;
      assert.equal((await signIn(chat, username)).status, 200);
      const session = (await telegramChatSessions(chat)).active;
      assert.equal(session?.user.role, role);
      assert.equal(session?.user.email, username + "@pasarin.id");
      assert.equal((await telegram(chat, "/menu")).actionTaken, "welcome_existing_user");
      assert.ok(sent.at(-1)?.text.includes(session!.user.name));
    }
    assert.notEqual((await telegramChatSessions(200)).active?.user.vendorId, (await telegramChatSessions(201)).active?.user.vendorId);
    assert.equal((await telegram(200, "/menu", false, 201)).processed, false);
    assert.equal((await telegram(200, "/menu", false, 200, "group")).processed, false);

    assert.equal((await signIn(100, "pasar1")).status, 200);
    const vendor = (await telegramChatSessions(100)).active!;
    assert.equal((await signIn(100, "warteg1")).status, 200);
    const warteg = (await telegramChatSessions(100)).active!;
    assert.notEqual(vendor.key, warteg.key);
    assert.equal((await telegram(100, vendor.key + ":publish_all", true)).actionTaken, "stale_button");
    assert.equal((await telegram(100, vendor.key + ":logout", true)).actionTaken, "stale_button");
    assert.equal((await telegram(101, "account:" + vendor.key, true)).actionTaken, "accounts");
    assert.equal((await telegram(100, "account:" + vendor.key, true)).actionTaken, "welcome_existing_user");
    assert.equal((await telegram(100, "/pasok")).actionTaken, "stock_usage");
    assert.equal((await telegram(100, vendor.key + ":claim:forged", true)).actionTaken, "action_denied");
    assert.equal((await telegram(100, "/logout")).actionTaken, "accounts");
    const remaining = await telegramChatSessions(100);
    assert.equal(remaining.active, undefined);
    assert.deepEqual(remaining.accounts.map(({ key }) => key), [warteg.key]);
    assert.equal((await telegram(100, "account:" + warteg.key, true)).actionTaken, "welcome_existing_user");
    assert.equal((await telegramChatSessions(100, Date.now() + 9 * 60 * 60_000)).active, undefined);
    assert.equal((await telegram(100, "/keluar")).actionTaken, "accounts");
    assert.equal((await telegramChatSessions(100)).active, undefined);
    for (let attempt = 0; attempt < 10; attempt++) assert.equal((await signIn(300, "pasar1", "wrong")).status, 401);
    assert.equal((await signIn(300, "pasar1")).status, 429);
    console.log("Telegram login, seven roles, private chats, account switching, expired sessions and stale buttons passed.");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

void run().catch((error) => { console.error(error); process.exitCode = 1; });
