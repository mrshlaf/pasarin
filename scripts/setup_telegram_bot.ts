/**
 * Mendaftarkan daftar perintah, deskripsi, dan tombol menu bot Telegram PASARIN.
 * Tanpa ini, mengetik "/" di Telegram tidak menampilkan saran perintah apa pun.
 * Aman dijalankan berulang kali; token dibaca dari TELEGRAM_BOT_TOKEN atau .env.local dan tidak pernah dicetak.
 *
 * Pemakaian: npm run bot:setup
 */

import fs from "node:fs";
import path from "node:path";

// Membaca TELEGRAM_BOT_TOKEN dari lingkungan, lalu dari .env.local bila belum ada.
function botToken() {
  if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN.trim();
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return undefined;
  const line = fs.readFileSync(envPath, "utf-8").split(/\r?\n/).find((item) => item.startsWith("TELEGRAM_BOT_TOKEN="));
  return line?.slice("TELEGRAM_BOT_TOKEN=".length).trim().replace(/^["']|["']$/g, "") || undefined;
}

// Perintah yang ditangani src/lib/telegramWorkspace.ts dan rute webhook. Perintah di luar peran akun dibalas menu peran.
const COMMANDS = [
  { command: "menu", description: "Buka menu sesuai peran akun" },
  { command: "akun", description: "Pilih akun atau masuk dengan akun lain" },
  { command: "status", description: "Ringkasan pasar atau pesanan saya" },
  { command: "stok", description: "Inventaris kios (pedagang)" },
  { command: "pasok", description: "Catat pasokan masuk, contoh /pasok kangkung 25" },
  { command: "penawaran", description: "Penawaran pasar (pedagang dan pengelola)" },
  { command: "surplus", description: "Katalog yang bisa diklaim (warteg, dapur sosial, maggot)" },
  { command: "tugas", description: "Antrean pengantaran (kurir)" },
  { command: "transaksi", description: "Riwayat pembayaran dan saldo" },
  { command: "cuaca", description: "Cuaca los pasar" },
  { command: "bantuan", description: "Cara memakai bot" },
  { command: "keluar", description: "Keluar dari akun aktif" },
];

// Teks panjang yang tampil di layar awal bot sebelum pengguna menekan Start.
const DESCRIPTION = "Asisten PASARIN untuk Pasar Induk Kramat Jati. Masuk dengan akun mitra untuk mengelola stok, pesanan, dan pengantaran, " +
  "atau ketik pertanyaan biasa seperti \"sayur apa yang paling murah?\".";
// Teks singkat untuk halaman profil bot dan pratinjau saat tautan bot dibagikan.
const SHORT_DESCRIPTION = "Penyaluran sisa sayur dan buah Pasar Induk Kramat Jati.";

// Memasang daftar perintah untuk chat privat dan default, deskripsi, serta tombol menu bot.
async function main() {
  const token = botToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN tidak ditemukan di lingkungan atau .env.local.");
  // Memanggil satu metode Bot API; melempar galat bila Telegram membalas `ok: false`.
  const call = async (method: string, body: Record<string, unknown>) => {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
    });
    const json = await response.json() as { ok: boolean; description?: string };
    if (!json.ok) throw new Error(`${method} gagal: ${json.description ?? response.status}`);
    console.log(`OK ${method}`);
  };
  // Bot hanya melayani chat privat, jadi daftar perintah dipasang untuk chat privat dan cakupan default.
  await call("setMyCommands", { commands: COMMANDS, scope: { type: "all_private_chats" } });
  await call("setMyCommands", { commands: COMMANDS });
  await call("setMyDescription", { description: DESCRIPTION });
  await call("setMyShortDescription", { short_description: SHORT_DESCRIPTION });
  await call("setChatMenuButton", { menu_button: { type: "commands" } });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
