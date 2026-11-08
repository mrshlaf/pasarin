import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateJsonBody } from "@/lib/api-response";
import { getEnv } from "@/lib/env";
import { isLocalTestRequest } from "@/lib/localTestAuth";
import { dispatchTelegramMessage } from "@/lib/telegramBotGateway";
import { allowTelegramLogin, authenticateTelegramAccount, startTelegramSession, telegramLoginChat } from "@/lib/telegramSessions";

const credentials = z.object({
  initData: z.string().min(1).max(8192),
  identifier: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(256),
});

/** Signs the verified Telegram user into the same Pasarin account as the website. */
export async function POST(req: NextRequest) {
  const token = getEnv().TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Login Telegram belum tersedia." }, { status: 503 });
  const input = await validateJsonBody(req, credentials);
  if (!input.success) return input.errorResponse;
  const { initData, identifier, password } = input.data;
  const chatId = telegramLoginChat(initData, token);
  if (!chatId) return NextResponse.json({ error: "Buka ulang formulir lewat tombol Masuk di Telegram." }, { status: 401 });
  try {
    if (!await allowTelegramLogin(chatId)) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." }, { status: 429 });
    }
    const user = await authenticateTelegramAccount(identifier, password, isLocalTestRequest(req));
    if (!user) return NextResponse.json({ error: "Nama pengguna atau kata sandi tidak cocok." }, { status: 401 });
    const session = await startTelegramSession(chatId, user);
    await dispatchTelegramMessage(chatId, user.name + " sudah masuk. Buka ruang kerja untuk melihat tugas Anda.", {
      replyMarkup: { inline_keyboard: [[{ text: "Buka ruang kerja", callback_data: session.key + ":menu:menu" }]] },
    });
    return NextResponse.json({ name: user.name });
  } catch {
    return NextResponse.json({ error: "Layanan akun sedang tidak tersedia. Coba lagi nanti." }, { status: 503 });
  }
}
