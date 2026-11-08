import assert from "node:assert/strict";
import { configuredTelegramActor, handleTelegramCommand, verifyTelegramWebhookSecret } from "../src/lib/telegramBotGateway";

const secret = "test-secret";
assert.equal(verifyTelegramWebhookSecret(secret, secret), true);
assert.equal(verifyTelegramWebhookSecret("other", secret), false);
assert.equal(verifyTelegramWebhookSecret(null, secret), false);

process.env.TELEGRAM_CHAT_ACCOUNTS = JSON.stringify({
  123: { id: "vendor-fixture", role: "vendor", name: "Kios pengujian", vendorId: "vendor_kramat_01" },
  456: { id: "unknown-role", role: "other", name: "Invalid role" },
});

/** Exercises command parsing and trusted identity mapping without external messaging. */
async function run() {
  const vendor = configuredTelegramActor(123);
  assert.ok(vendor);
  assert.equal(configuredTelegramActor(456), null);
  assert.equal(configuredTelegramActor(789), null);
  const welcome = await handleTelegramCommand("/start@pasarin_bot", 123, vendor);
  assert.equal(welcome.actionTaken, "welcome_existing_user");
  assert.equal((await handleTelegramCommand("/pasok", 123, vendor)).actionTaken, "stock_usage");
  assert.equal((await handleTelegramCommand("/tanya jumlah stok", 789)).actionTaken, "auth_required");
  console.log("Telegram webhook token, role mapping and command validation passed.");
}

void run().catch((error) => { console.error(error); process.exitCode = 1; });
