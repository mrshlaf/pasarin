/**
 * Direktori Identitas Akun dan Kredensial Pengguna Pasar (PSR-2).
 * Menyediakan pemetaan terpadu untuk autentikasi sesi lokal maupun seeding akun Supabase Auth Cloud.
 * Mencakup 30 pedagang kios, 100 mitra warteg, 3 dapur sosial, 2 sentra maggot, 5 armada kurir, pengelola, dan admin.
 */

import type { AppRole } from "@/data/accounts";
import { CIRCULAR_BUYERS } from "@/data/buyers";
import { KIOSKS } from "@/data/kiosks";

/**
 * Entitas profil akun pasar yang digunakan bersama oleh direktori login dan seeder akun cloud.
 */
export interface MarketAccount {
  username: string;
  password: string;
  role: AppRole;
  name: string;
  organization: string;
  vendorId?: string;
  buyerId?: string;
}

const vendorAccounts: MarketAccount[] = KIOSKS.map((kiosk, index) => {
  const username = `pasar${index + 1}`;
  return {
    username,
    password: username,
    role: "vendor",
    name: kiosk.ownerName,
    organization: kiosk.name,
    vendorId: kiosk.id,
  };
});

const buyerAccounts = (tier: "tier_1" | "tier_2" | "tier_3", prefix: string, role: AppRole) =>
  CIRCULAR_BUYERS.filter((buyer) => buyer.tier === tier).map((buyer, index) => {
    const username = `${prefix}${index + 1}`;
    return {
      username,
      password: username,
      role,
      name: buyer.name,
      organization: buyer.name,
      buyerId: buyer.id,
    } satisfies MarketAccount;
  });

const WARTEG_AREAS = [
  "Condet", "Kramat Jati", "Cililitan", "Cawang", "TMII", "Duren Sawit",
  "Jatinegara", "Pasar Rebo", "Ciracas", "Makasar", "Halim", "Cibubur",
  "Kalisari", "Gedong", "Kampung Melayu", "Bidara Cina", "Cipinang", "Rawamangun",
  "Pulo Gadung", "Cakung", "Klender", "Malaka Jaya", "Lubang Buaya", "Setu",
  "Bambu Apus", "Ceger", "Muncul", "Pondok Kelapa", "Duren Sawit Barat", "Pondok Kopi",
] as const;

const existingWarteg = CIRCULAR_BUYERS.filter((buyer) => buyer.tier === "tier_1");
const extraWarteg: MarketAccount[] = Array.from({ length: 100 - existingWarteg.length }, (_, index) => {
  const number = existingWarteg.length + index + 1;
  const area = WARTEG_AREAS[index % WARTEG_AREAS.length];
  const name = `Warteg ${area} ${number}`;
  return {
    username: `warteg${number}`,
    password: `warteg${number}`,
    role: "warteg",
    name,
    organization: name,
  };
});

const courierAccounts: MarketAccount[] = Array.from({ length: 5 }, (_, index) => {
  const username = `kurir${index + 1}`;
  return {
    username,
    password: username,
    role: "logistics",
    name: `Kurir ${index + 1}`,
    organization: "Logistik Pasarin",
  };
});

/**
 * Kompilasi master seluruh akun pengguna pasar:
 * 30 kios pasar, 100 warteg/UMKM, 3 dapur sosial, 2 sentra maggot, 5 kurir logistik, 1 pengelola UPB, 1 admin sistem.
 */
export const MARKET_ACCOUNTS: MarketAccount[] = [
  ...vendorAccounts,
  ...buyerAccounts("tier_1", "warteg", "warteg"),
  ...extraWarteg,
  ...buyerAccounts("tier_2", "sosial", "social_kitchen"),
  ...buyerAccounts("tier_3", "maggot", "maggot"),
  ...courierAccounts,
  { username: "pengelola1", password: "pengelola1", role: "manager", name: "Pengelola Pasar", organization: "UPB Pasar Jaya" },
  { username: "admin1", password: "admin1", role: "admin", name: "Administrator", organization: "Pasarin" },
];

export const MARKET_ACCOUNT_BY_USERNAME = new Map(MARKET_ACCOUNTS.map((account) => [account.username, account]));
export const MARKET_ACCOUNT_BY_VENDOR_ID = new Map(
  MARKET_ACCOUNTS.filter((account) => account.vendorId).map((account) => [account.vendorId as string, account]),
);

/**
 * Menghasilkan identifier aktor sesi simulasi lokal dengan awalan stabil agar klaim terisolasi per akun.
 *
 * @param username - Nama pengguna akun pasar (misal: "pasar1", "warteg1").
 * @returns String ID aktor dengan format "local:<username>".
 */
export function localActorId(username: string) {
  return `local:${username}`;
}

/**
 * Mengonversi username akun pasar menjadi alamat email standar untuk Supabase Auth Cloud.
 *
 * @param username - Nama pengguna akun pasar.
 * @returns Alamat email terformat "@pasarin.id".
 */
export function accountEmail(username: string) {
  return `${username}@pasarin.id`;
}
