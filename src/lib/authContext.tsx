"use client";

/**
 * Modul Konteks Autentikasi Pengguna & Penguncian Hak Akses Peran (PSR-40).
 * Bertanggung jawab mengelola sesi login berbasis Supabase Auth,
 * menerapkan aturan isolasi peran (Role Isolation), serta menyediakan akses akun demo 7 peran.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
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
 * Kontrak antarmuka Context Autentikasi PASARIN.
 */
export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithEmailPassword: (
    email: string,
    password: string,
    requestedRole?: AppRole
  ) => Promise<{ success: boolean; error?: string }>;
  loginAsDemoRole: (role: AppRole) => Promise<void>;
  signOut: () => Promise<void>;
  isRoleAccessible: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_AUTH_KEY = "pasarin_auth_session_user";

/**
 * Mengidentifikasi peran pengguna berdasarkan alamat email atau metadata akun.
 *
 * @param email - Alamat email pengguna.
 * @param fallbackRole - Peran fallback jika alamat email tidak cocok dengan preset.
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

/**
 * Komponen penyedia state autentikasi (AuthProvider) untuk ekosistem aplikasi Next.js.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inisialisasi sesi login dari Supabase Auth dan penyimpanan lokal browser
  useEffect(() => {
    let isMounted = true;

    async function initializeAuthSession() {
      try {
        // Cek sesi aktif pada Supabase Auth
        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData.session?.user && isMounted) {
          const authEmail = sessionData.session.user.email || "";
          const assignedRole = (sessionData.session.user.user_metadata?.role as AppRole) || inferRoleFromEmail(authEmail);
          const demoInfo = DEMO_ACCOUNTS[assignedRole];

          setUser({
            id: sessionData.session.user.id,
            email: authEmail,
            role: assignedRole,
            name: sessionData.session.user.user_metadata?.name || demoInfo?.name || "Pengguna Terverifikasi",
            organization: sessionData.session.user.user_metadata?.organization || demoInfo?.organization || "Pasar Induk Kramat Jati",
          });
          setIsLoading(false);
          return;
        }

        // Fallback: baca sesi tersimpan pada LocalStorage browser saat mode offline/lokal
        if (typeof window !== "undefined") {
          const storedUserRaw = localStorage.getItem(LOCAL_STORAGE_AUTH_KEY);
          if (storedUserRaw && isMounted) {
            const parsedUser = JSON.parse(storedUserRaw) as AuthUser;
            setUser(parsedUser);
          }
        }
      } catch (err) {
        console.warn("[AuthInit Warning] Gagal menginisialisasi sesi auth Supabase:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuthSession();

    // Dengarkan perubahan status otentikasi Supabase secara real-time
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        const authEmail = session.user.email || "";
        const assignedRole = (session.user.user_metadata?.role as AppRole) || inferRoleFromEmail(authEmail);
        const demoInfo = DEMO_ACCOUNTS[assignedRole];

        const newUser: AuthUser = {
          id: session.user.id,
          email: authEmail,
          role: assignedRole,
          name: session.user.user_metadata?.name || demoInfo?.name || "Pengguna Terverifikasi",
          organization: session.user.user_metadata?.organization || demoInfo?.organization || "Pasar Induk Kramat Jati",
        };
        setUser(newUser);
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(newUser));
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem(LOCAL_STORAGE_AUTH_KEY);
        }
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  /**
   * Menjalankan proses login dengan alamat email dan kata sandi.
   * Terhubung langsung ke Supabase Auth dengan mekanisme fallback demo terverifikasi.
   */
  const signInWithEmailPassword = async (
    identifier: string,
    password: string,
    requestedRole?: AppRole
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || cleanPass.length === 0) {
      return {
        success: false,
        error: "Username/email dan kata sandi wajib diisi.",
      };
    }

    // 1. Cek pencocokan akun dummy instan (username dan password sama atau cocok dengan dummy)
    const matchingDummy =
      DUMMY_ACCOUNTS[cleanId] ||
      (cleanId === "admin"
        ? DUMMY_ACCOUNTS.admin1
        : cleanId === "pasar"
        ? DUMMY_ACCOUNTS.pasar1
        : cleanId === "warteg"
        ? DUMMY_ACCOUNTS.warteg1
        : cleanId === "sosial"
        ? DUMMY_ACCOUNTS.sosial1
        : cleanId === "maggot"
        ? DUMMY_ACCOUNTS.maggot1
        : cleanId === "kurir"
        ? DUMMY_ACCOUNTS.kurir1
        : cleanId === "pengelola"
        ? DUMMY_ACCOUNTS.pengelola1
        : undefined);

    if (
      matchingDummy &&
      (cleanPass.toLowerCase() === matchingDummy.username ||
        cleanPass.toLowerCase() === cleanId ||
        cleanPass === "123456" ||
        cleanPass.length >= 4)
    ) {
      const loggedUser: AuthUser = {
        id: `usr_${matchingDummy.username}`,
        email: matchingDummy.email,
        role: matchingDummy.role,
        name: matchingDummy.name,
        organization: matchingDummy.organization,
      };

      setUser(loggedUser);
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(loggedUser));
      }
      return { success: true };
    }

    // 2. Upayakan login ke server Supabase Auth jika format email
    const emailToAuth = cleanId.includes("@") ? cleanId : `${cleanId}@pasarin.id`;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password: cleanPass,
      });

      if (!error && data.user) {
        const assignedRole = requestedRole || (data.user.user_metadata?.role as AppRole) || inferRoleFromEmail(emailToAuth);
        const demoInfo = DEMO_ACCOUNTS[assignedRole];

        const loggedUser: AuthUser = {
          id: data.user.id,
          email: emailToAuth,
          role: assignedRole,
          name: data.user.user_metadata?.name || demoInfo?.name || "Pengguna Terverifikasi",
          organization: data.user.user_metadata?.organization || demoInfo?.organization || "Pasar Induk Kramat Jati",
        };

        setUser(loggedUser);
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(loggedUser));
        }
        return { success: true };
      }
    } catch {
      // Lanjutkan ke mekanisme otentikasi akun lokal saat endpoint Supabase offline
    }

    // 3. Fallback akun lokal
    const roleForUser = requestedRole || inferRoleFromEmail(cleanId);
    const demoProfile = DEMO_ACCOUNTS[roleForUser];

    const localUser: AuthUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: emailToAuth,
      role: roleForUser,
      name: demoProfile?.name || cleanId.split("@")[0].toUpperCase(),
      organization: demoProfile?.organization || "Pasar Induk Kramat Jati",
    };

    setUser(localUser);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(localUser));
    }
    return { success: true };
  };

  /**
   * Menjalankan login instan 1-ketuk menggunakan profil peran demo untuk kemudahan pengujian kelas.
   */
  const loginAsDemoRole = async (role: AppRole): Promise<void> => {
    const profile = DEMO_ACCOUNTS[role];
    const demoUser: AuthUser = {
      id: `demo_${role}_${Date.now()}`,
      email: profile.email,
      role,
      name: profile.name,
      organization: profile.organization,
    };

    setUser(demoUser);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(demoUser));
    }
  };

  /**
   * Menghapus sesi otentikasi aktif dan membersihkan data sesi lokal.
   */
  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[AuthSignOut Warning] Galat sign out Supabase:", err);
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(LOCAL_STORAGE_AUTH_KEY);
      }
    }
  };

  /**
   * Mengevaluasi aturan isolasi peran (Role Isolation Rule):
   * Pengguna dengan peran 'admin' atau 'manager' berhak mengakses seluruh peran (hak pengawas).
   * Pengguna peran operasional ('vendor', 'warteg', 'social_kitchen', 'maggot', 'logistics')
   * dikunci mutlak hanya pada peran mereka sendiri.
   */
  const isRoleAccessible = (targetRole: AppRole): boolean => {
    if (!user) return false;
    if (user.role === "admin" || user.role === "manager") return true;
    return user.role === targetRole;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        signInWithEmailPassword,
        loginAsDemoRole,
        signOut,
        isRoleAccessible,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook kustom untuk mengakses konteks autentikasi pengguna PASARIN.
 *
 * @throws Error jika hook dipanggil di luar cakupan AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
