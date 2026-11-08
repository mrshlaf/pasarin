import type { AppRole } from "@/data/accounts";
import { CIRCULAR_BUYERS } from "@/data/buyers";
import { KIOSKS } from "@/data/kiosks";

/** One market identity shared by the login directory and the cloud account seeder. */
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

/** 30 kiosks, 100 warteg, 3 social kitchens, 2 maggot sites, 5 couriers, 1 manager, 1 admin. */
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

/** Local development identities use a stable prefix so claims remain distinct per account. */
export function localActorId(username: string) {
  return `local:${username}`;
}

/** Supabase Auth uses one email-shaped identifier for every market account. */
export function accountEmail(username: string) {
  return `${username}@pasarin.id`;
}
