import type { AppRole } from "@/data/accounts";
import { CIRCULAR_BUYERS } from "@/data/buyers";
import { KIOSKS } from "@/data/kiosks";

/** One reproducible demo identity shared by local login and cloud seeding. */
export interface DemoAccount {
  username: string;
  password: string;
  role: AppRole;
  name: string;
  organization: string;
  vendorId?: string;
  buyerId?: string;
}

const vendorAccounts: DemoAccount[] = KIOSKS.map((kiosk, index) => {
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
    } satisfies DemoAccount;
  });

const courierAccounts: DemoAccount[] = Array.from({ length: 5 }, (_, index) => {
  const username = `kurir${index + 1}`;
  return {
    username,
    password: username,
    role: "logistics",
    name: `Kurir ${index + 1}`,
    organization: "Logistik Pasarin",
  };
});

/** The full demo population: 30 kiosks, 5 warteg, 3 social kitchens, 2 maggot sites, 5 couriers. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  ...vendorAccounts,
  ...buyerAccounts("tier_1", "warteg", "warteg"),
  ...buyerAccounts("tier_2", "sosial", "social_kitchen"),
  ...buyerAccounts("tier_3", "maggot", "maggot"),
  ...courierAccounts,
  { username: "pengelola1", password: "pengelola1", role: "manager", name: "Pengelola Pasar", organization: "UPB Pasar Jaya" },
  { username: "admin1", password: "admin1", role: "admin", name: "Administrator", organization: "Pasarin" },
];

export const DEMO_ACCOUNT_BY_USERNAME = new Map(DEMO_ACCOUNTS.map((account) => [account.username, account]));
export const DEMO_ACCOUNT_BY_VENDOR_ID = new Map(
  DEMO_ACCOUNTS.filter((account) => account.vendorId).map((account) => [account.vendorId as string, account]),
);

/** Local test identities use a stable prefix so claims remain distinct per account. */
export function demoActorId(username: string) {
  return `demo:${username}`;
}
