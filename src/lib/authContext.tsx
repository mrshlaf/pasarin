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
import {
  AuthUser,
  DEMO_ACCOUNTS,
  DUMMY_ACCOUNTS,
  inferRoleFromEmail,
} from "@/data/accounts";

export type { AuthUser };
export { DEMO_ACCOUNTS, DUMMY_ACCOUNTS, inferRoleFromEmail };

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
 * Komponen penyedia state autentikasi (AuthProvider) untuk ekosistem aplikasi Next.js.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inisialisasi sesi login dari Supabase Auth dan penyimpanan lokal browser
  useEffect(() => {
    let isMounted = true;

    async function initializeAuthSession() {
      // 1. Cek sesi lokal (LocalStorage) terlebih dahulu untuk respon instan
      if (typeof window !== "undefined") {
        try {
          const storedUserRaw = localStorage.getItem(LOCAL_STORAGE_AUTH_KEY);
          if (storedUserRaw && isMounted) {
            const parsedUser = JSON.parse(storedUserRaw) as AuthUser;
            setUser(parsedUser);
            setIsLoading(false);
            return;
          }
        } catch {}
      }

      // 2. Cek sesi Supabase Auth dengan batas waktu aman 500ms agar tidak menggantung jika offline
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 500)
        );

        const { data: sessionData } = (await Promise.race([sessionPromise, timeoutPromise])) as {
          data: { session: { user?: { id: string; email?: string; user_metadata?: { role?: string; name?: string; organization?: string } } } | null };
        };

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

    if (matchingDummy) {
      const isPasswordValid =
        cleanPass.toLowerCase() === matchingDummy.username.toLowerCase() ||
        cleanPass.toLowerCase() === cleanId ||
        cleanPass === "123456";

      if (!isPasswordValid) {
        return {
          success: false,
          error: "Kata sandi yang Anda masukkan salah. Silakan coba lagi.",
        };
      }

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
      // Endpoint Supabase offline / error
    }

    // 3. TOLAK AKSES jika username tidak ditemukan atau kata sandi tidak cocok
    return {
      success: false,
      error: "Username atau kata sandi tidak valid. Pastikan akun terdaftar.",
    };
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
