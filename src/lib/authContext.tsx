"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { accountProfile, resolveLoginEmail, type AppRole, type AuthUser } from "@/data/accounts";
import { supabase, supabaseAuthConfigured } from "@/lib/supabase";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithPassword: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isRoleAccessible: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const serverAuthEnabled = process.env.NEXT_PUBLIC_PASARIN_SERVER_AUTH === "1";
const localTestEnabled = process.env.NODE_ENV === "development" && !serverAuthEnabled;

/** Keeps the workspace tied to Supabase, the server session, or a local test session. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AuthUser | null>(null);
  const [testUser, setTestUser] = useState<AuthUser | null>(null);
  const [serverUser, setServerUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [testReady, setTestReady] = useState(!localTestEnabled);
  const [serverReady, setServerReady] = useState(!serverAuthEnabled);
  const user = serverAuthEnabled ? serverUser : account ?? testUser;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccount(session ? accountProfile(session.user) : null);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!serverAuthEnabled) return;
    const controller = new AbortController();
    fetch("/api/auth/session", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (!controller.signal.aborted) setServerUser(result?.user ?? null); })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setServerReady(true); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!localTestEnabled) return;
    const controller = new AbortController();
    fetch("/api/auth/local-test", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (!controller.signal.aborted) setTestUser(result?.user ?? null); })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setTestReady(true); });
    return () => controller.abort();
  }, []);

  /** Signs in an existing account and checks that it has a market role. */
  async function signInWithPassword(identifier: string, password: string) {
    if (serverAuthEnabled) {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier, password }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) return { success: false, error: result?.error ?? "Nama pengguna atau kata sandi tidak cocok." };
      setServerUser(result.user);
      return { success: true };
    }
    if (localTestEnabled && !identifier.includes("@")) {
      const response = await fetch("/api/auth/local-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier, password }),
      });
      if (response.ok) {
        const { user: profile } = await response.json();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { error } = await supabase.auth.signOut({ scope: "local" });
          if (error) {
            await fetch("/api/auth/local-test", { method: "DELETE" });
            throw error;
          }
        }
        setTestUser(profile);
        return { success: true };
      }
      if (response.status !== 404) {
        return { success: false, error: "Nama pengguna atau kata sandi tidak cocok." };
      }
    }
    if (!supabaseAuthConfigured) {
      return { success: false, error: "Layanan masuk belum dikonfigurasi. Hubungi pengelola Pasarin." };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: resolveLoginEmail(identifier), password });
    if (error || !data.user) return { success: false, error: "Nama pengguna, email, atau kata sandi tidak cocok." };
    const profile = accountProfile(data.user);
    if (!profile) {
      await supabase.auth.signOut({ scope: "local" });
      return { success: false, error: "Hubungi pengelola untuk mendapatkan peran Pasarin." };
    }
    setAccount(profile);
    return { success: true };
  }

  /** Ends the active browser session and clears the matching cookie. */
  async function signOut() {
    if (serverUser) {
      const response = await fetch("/api/auth/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Sesi belum bisa diakhiri.");
      setServerUser(null);
    }
    if (testUser) {
      const response = await fetch("/api/auth/local-test", { method: "DELETE" });
      if (!response.ok && response.status !== 404) throw new Error("Sesi tes belum bisa diakhiri.");
      setTestUser(null);
    }
    if (!serverAuthEnabled) {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      setAccount(null);
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: user !== null,
      isLoading: !ready || !testReady || !serverReady,
      signInWithPassword,
      signOut,
      isRoleAccessible: (role) => user?.role === role || user?.role === "admin" || user?.role === "manager",
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Accesses the current role and authentication operations. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
