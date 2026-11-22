/**
 * Batas privasi Asisten PASARIN.
 * Data etalase (komoditas, harga, kios penjual, berat tersedia) boleh dibagikan ke semua akun.
 * Data pribadi pihak lain (pendapatan, saldo, pesanan, pembeli, belanja, kontak, kredensial) hanya untuk pemiliknya,
 * kecuali pengelola/admin yang memang mengawasi keuangan pasar.
 */

import type { AuthUser } from "@/data/accounts";

/**
 * Identitas minimal yang dibutuhkan asisten. Sesi Telegram tidak selalu membawa email,
 * jadi email opsional; tanpa email, penyebutan username sendiri dianggap pihak lain (lebih ketat).
 */
export type ChatUser = Pick<AuthUser, "id" | "role" | "name" | "vendorId"> & { email?: string };
import { KIOSKS } from "@/data/kiosks";
import { MARKET_ACCOUNTS } from "@/data/marketAccounts";

const TITLES = /^(?:h\.|hj\.|haji|pak|bu|ibu|mbak|cak|bang|kang|mang)\s+/;
/** Meloloskan karakter khusus regex dari nama kios atau akun. */
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const KIOSK_PATTERNS = KIOSKS.map((kiosk) => {
  const [block, number] = kiosk.stallNumber.toLowerCase().split("-");
  const owner = kiosk.ownerName.toLowerCase().replace(TITLES, "");
  const shortName = kiosk.name.toLowerCase().replace(TITLES, "");
  // Panggilan sehari-hari: nama depan pemilik atau nama kios ("Pak Asep", "Bu Siti").
  const names = [kiosk.name.toLowerCase(), shortName, owner, owner.split(" ")[0], shortName.split(" ")[0]].filter((name) => name.length >= 4);
  return {
    id: kiosk.id,
    pattern: new RegExp(`(?<![a-z0-9])(?:${block}\\s*-?\\s*${Number(number)}|${block}\\s*-?\\s*${number}|${[...new Set(names)].map(escape).join("|")})(?![a-z0-9])`),
  };
});

const ACCOUNT_PATTERNS = MARKET_ACCOUNTS.filter((account) => account.role !== "vendor").map((account) => ({
  username: account.username,
  name: account.name,
  pattern: new RegExp(`(?<![a-z0-9])(?:${escape(account.name.toLowerCase())})(?![a-z0-9])`),
}));

const USERNAME = /(?<![a-z])(pasar|warteg|sosial|maggot|kurir|pengelola|admin)\s?(\d{1,3})(?![0-9])/g;
const GENERIC_OTHER = /\b(?:toko|kios|lapak|pedagang|penjual|pembeli|warteg|dapur|akun|user|orang|pengguna|pelanggan|kurir|maggot|tetangga) (?:lain|sebelah|tetangga|yang lain)\b|\b(?:punya|milik) (?:orang|dia|mereka|yang lain|pedagang lain)\b|\borang lain\b|\bkompetitor\b|\bpesaing\b|\bsemua (?:pedagang|toko|kios|lapak|pembeli|warteg|dapur|akun|user|pengguna)\b|\brata(?:-rata| rata)? (?:pedagang|kios|toko|pembeli)\b/;

/** Topik keuangan dan transaksi yang bersifat pribadi. */
const MONEY = /\b(?:pendapatan|penghasilan|keuntungan|untung|laba|rugi|omzet|omset|saldo|dompet|uang|dana|penjualan|belanja|pengeluaran|tagihan|utang|hutang|gaji|transaksi|escrow|cair)\b/;
/** Topik pesanan dan pelanggan yang bersifat pribadi bagi penjual dan pembeli. */
const ORDERS = /\b(?:pesanan|pesan|memesan|order|pembeli|pelanggan|terjual|laku|dibeli|beli apa|membeli|klaim|diklaim|reputasi)\b|\byang (?:beli|membeli|pesan|memesan|klaim|ambil)\b|\bsiapa\b.*\b(?:beli|membeli|pesan|memesan|klaim|ambil)\b/;
const CONTACT = /\b(?:nomor (?:hp|handphone|telepon|telp|wa|whatsapp|kontak|rekening|ktp|induk)|no hp|hp|handphone|telepon|telp|whatsapp|wa|kontak|email|surel|rekening|ktp|nik|alamat rumah|instagram)\b/;
const CREDENTIAL = /\b(?:password|kata sandi|sandi|pin|otp|token|kredensial|username)\b|\bcara (?:masuk|login) (?:ke )?akun (?:orang|lain|pasar|warteg|sosial|maggot|kurir|admin|pengelola)/;

/** Kios yang disebut dalam pertanyaan (kode lapak, nama kios, atau nama pemilik). */
export function mentionedKioskIds(raw: string) {
  return KIOSK_PATTERNS.filter((item) => item.pattern.test(raw)).map((item) => item.id);
}

/**
 * Batas privasi untuk pengunjung landing page yang belum masuk:
 * semua data akun (keuangan, pesanan, pembeli, kontak, kredensial) ditolak, termasuk "milik saya".
 */
export function publicPrivacyRefusal(text: string) {
  if (CREDENTIAL.test(text)) return "Maaf, saya tidak bisa memberikan kata sandi, PIN, atau data login akun mana pun.";
  if (CONTACT.test(text)) return "Maaf, nomor telepon, email, rekening, dan identitas pribadi tidak dibagikan lewat asisten.";
  if (MONEY.test(text) || ORDERS.test(text)) {
    return "Data pendapatan, saldo, pesanan, dan pembeli bersifat pribadi. Masuk ke akun PASARIN Anda untuk melihat data milik Anda sendiri. " +
      "Di sini saya bisa membantu info etalase publik: komoditas, harga, berat tersedia, dan kios penjual.";
  }
  return null;
}

/** Hasil pemeriksaan privasi: boleh dijawab, ditolak, atau ringkasan keuangan kios untuk pengelola. */
export type PrivacyCheck =
  | { kind: "allow"; otherKioskIds: string[]; accountNames: string[] }
  | { kind: "refuse"; message: string }
  | { kind: "kiosk-finance"; kioskId: string };

/**
 * Menentukan apakah pertanyaan boleh dijawab.
 * @param raw - Pertanyaan asli (huruf kecil) untuk mengenali nama kios dan akun.
 * @param text - Pertanyaan ternormalisasi untuk mengenali topik.
 */
export function checkPrivacy(user: ChatUser, raw: string, text: string): PrivacyCheck {
  const oversight = user.role === "manager" || user.role === "admin";
  const mentionedKiosks = KIOSK_PATTERNS.filter((item) => item.pattern.test(raw)).map((item) => item.id);
  const otherKioskIds = mentionedKiosks.filter((id) => id !== user.vendorId);
  const ownUsername = user.email?.split("@")[0]?.toLowerCase();
  const mentionedUsernames = [...raw.matchAll(USERNAME)].map((match) => `${match[1]}${match[2]}`).filter((username) => username !== ownUsername);
  const accountNames = [...new Set([
    ...ACCOUNT_PATTERNS.filter((item) => item.pattern.test(raw) && item.name !== user.name).map((item) => item.name),
    ...ACCOUNT_PATTERNS.filter((item) => mentionedUsernames.includes(item.username)).map((item) => item.name),
  ])];
  const otherAccount = accountNames.length > 0 || mentionedUsernames.length > 0;
  // "di pasar ini" tanpa "saya" berarti menanyakan seluruh pasar, termasuk transaksi pihak lain.
  const marketWide = /\b(?:di|seluruh|se|satu) pasar(?: ini)?\b/.test(text) && !/\bsaya\b/.test(text);
  const otherParty = otherKioskIds.length > 0 || otherAccount || GENERIC_OTHER.test(text) || marketWide;

  if (CREDENTIAL.test(text)) {
    return { kind: "refuse", message: "Maaf, saya tidak bisa memberikan kata sandi, PIN, atau data login akun mana pun. Jika lupa kata sandi, hubungi admin PASARIN." };
  }
  if (CONTACT.test(text)) {
    return { kind: "refuse", message: "Maaf, nomor telepon, email, rekening, dan identitas pribadi tidak dibagikan lewat asisten. Untuk berhubungan dengan pedagang atau pembeli, gunakan alur pesanan di dashboard." };
  }
  if (!otherParty) return { kind: "allow", otherKioskIds, accountNames };
  const money = MONEY.test(text);
  const orders = ORDERS.test(text);
  if (oversight) {
    if (money && otherKioskIds.length === 1) return { kind: "kiosk-finance", kioskId: otherKioskIds[0] };
    return { kind: "allow", otherKioskIds, accountNames };
  }
  // Kurir perlu tahu pesanan siapa yang diantar, tetapi tidak keuangan pihak lain.
  const privateTopic = user.role === "logistics" ? money : money || orders;
  // Pesanan milik sendiri yang dibeli dari kios lain tetap boleh, misalnya "pesanan saya dari kios A-05".
  const ownOrderAtOtherKiosk = /\bsaya\b/.test(text) && !otherAccount && !GENERIC_OTHER.test(text) && orders && !money;
  if (privateTopic && !ownOrderAtOtherKiosk) {
    return {
      kind: "refuse",
      message: "Maaf, data pendapatan, saldo, pesanan, dan pembeli milik pihak lain bersifat pribadi, jadi tidak bisa saya tampilkan. " +
        "Saya bisa menunjukkan data akun Anda sendiri, atau info katalog publik seperti harga, berat tersedia, dan kios penjual.",
    };
  }
  return { kind: "allow", otherKioskIds, accountNames };
}
