/**
 * Master Data Akun Pengguna & Preset Kredensial PASARIN (PSR-40).
 * Memuat akun preset 7 peran operasional dan akun dummy gampang diingat
 * untuk keperluan demonstrasi pengujian kelas RPL FTUI.
 */

import { AppRole } from "@/lib/simulationStore";

/**
 * Profil entitas pengguna yang terautentikasi dalam ekosistem PASARIN.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: AppRole;
  name: string;
  organization: string;
}

/**
 * Daftar akun preset 7 peran operasional untuk keperluan demonstrasi dan evaluasi kelas.
 */
export const DEMO_ACCOUNTS: Record<AppRole, { email: string; name: string; organization: string; role: AppRole }> = {
  vendor: {
    email: "pedagang@pasarin.id",
    name: "H. Rohmat",
    organization: "Kios Sayur Daun Blok A Los 12",
    role: "vendor",
  },
  warteg: {
    email: "warteg@pasarin.id",
    name: "Warteg Kharisma Bahari",
    organization: "Mitra Konsumsi Pangan Mikro Kramat Jati",
    role: "warteg",
  },
  social_kitchen: {
    email: "dapursosial@pasarin.id",
    name: "Dapur Peduli Umat",
    organization: "Panti Asuhan & Dapur Sosial Kramat Jati",
    role: "social_kitchen",
  },
  maggot: {
    email: "maggot@pasarin.id",
    name: "Sentra Maggot Kramat BSF",
    organization: "Fasilitas Biokonversi TPS 3R Kramat Jati",
    role: "maggot",
  },
  logistics: {
    email: "kurir@pasarin.id",
    name: "Pak Joko (Armada Viar 01)",
    organization: "Koperasi Armada Distribusi Pasar Induk",
    role: "logistics",
  },
  manager: {
    email: "pengelola@pasarin.id",
    name: "Ir. Bambang S.",
    organization: "Unit Pelaksana Teknis Pasar Induk Kramat Jati (Perumda Pasar Jaya)",
    role: "manager",
  },
  admin: {
    email: "admin@pasarin.id",
    name: "Marshal Aufa D.",
    organization: "Tim Rekayasa Perangkat Lunak FTUI",
    role: "admin",
  },
};

/**
 * Akun dummy ringkas di mana username dan password sama persis (misal: pasar1 / pasar1),
 * dengan nama profil pedagang dan aktor pasar tetap sesuai data riil.
 */
export const DUMMY_ACCOUNTS: Record<string, { username: string; email: string; name: string; organization: string; role: AppRole }> = {
  pasar1: {
    username: "pasar1",
    email: "pedagang@pasarin.id",
    name: "H. Rohmat",
    organization: "Kios Sayur Daun Blok A Los 12",
    role: "vendor",
  },
  warteg1: {
    username: "warteg1",
    email: "warteg@pasarin.id",
    name: "Warteg Kharisma Bahari",
    organization: "Mitra Konsumsi Pangan Mikro Kramat Jati",
    role: "warteg",
  },
  sosial1: {
    username: "sosial1",
    email: "dapursosial@pasarin.id",
    name: "Dapur Peduli Umat",
    organization: "Panti Asuhan & Dapur Sosial Kramat Jati",
    role: "social_kitchen",
  },
  maggot1: {
    username: "maggot1",
    email: "maggot@pasarin.id",
    name: "Sentra Maggot Kramat BSF",
    organization: "Fasilitas Biokonversi TPS 3R Kramat Jati",
    role: "maggot",
  },
  kurir1: {
    username: "kurir1",
    email: "kurir@pasarin.id",
    name: "Pak Joko (Armada Viar 01)",
    organization: "Koperasi Armada Distribusi Pasar Induk",
    role: "logistics",
  },
  pengelola1: {
    username: "pengelola1",
    email: "pengelola@pasarin.id",
    name: "Ir. Bambang S.",
    organization: "Unit Pelaksana Teknis Pasar Induk Kramat Jati (Perumda Pasar Jaya)",
    role: "manager",
  },
  admin1: {
    username: "admin1",
    email: "admin@pasarin.id",
    name: "Marshal Aufa D.",
    organization: "Tim Rekayasa Perangkat Lunak FTUI",
    role: "admin",
  },
};

/**
 * Mengidentifikasi peran pengguna berdasarkan alamat email atau metadata akun.
 *
 * @param identifier - Alamat email atau username pengguna.
 * @param fallbackRole - Peran fallback jika tidak cocok (default: vendor).
 * @returns Peran pengguna terverifikasi.
 */
export function inferRoleFromEmail(identifier: string, fallbackRole: AppRole = "vendor"): AppRole {
  const normalized = identifier.toLowerCase().trim();
  if (DUMMY_ACCOUNTS[normalized]) {
    return DUMMY_ACCOUNTS[normalized].role;
  }
  if (normalized === "pasar" || normalized === "pedagang") return "vendor";
  if (normalized === "warteg") return "warteg";
  if (normalized === "sosial" || normalized === "dapur" || normalized === "panti") return "social_kitchen";
  if (normalized === "maggot" || normalized === "bsf") return "maggot";
  if (normalized === "kurir" || normalized === "logistik") return "logistics";
  if (normalized === "pengelola" || normalized === "manager") return "manager";
  if (normalized === "admin") return "admin";

  for (const roleKey of Object.keys(DEMO_ACCOUNTS) as AppRole[]) {
    if (DEMO_ACCOUNTS[roleKey].email.toLowerCase() === normalized) {
      return roleKey;
    }
  }
  if (normalized.includes("warteg")) return "warteg";
  if (normalized.includes("sosial") || normalized.includes("dapur") || normalized.includes("panti")) return "social_kitchen";
  if (normalized.includes("maggot") || normalized.includes("bsf")) return "maggot";
  if (normalized.includes("kurir") || normalized.includes("logistik")) return "logistics";
  if (normalized.includes("manager") || normalized.includes("pengelola")) return "manager";
  if (normalized.includes("admin")) return "admin";
  return fallbackRole;
}
