"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { useMarketSimulation } from "@/lib/simulationStore";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar, ROLE_LABELS } from "@/components/layout/AppSidebar";
import { VendorDashboard } from "@/components/roles/VendorDashboard";
import { LogisticsDashboard } from "@/components/roles/LogisticsDashboard";

import { BuyerDashboard } from "@/components/roles/BuyerDashboard";
import { OversightDashboard } from "@/components/roles/OversightDashboard";

/** Renders the same workspace shell for each authorized role. */
function DashboardContent() {
  const { user } = useAuth();
  const { role, busy, stateReady, feedback, clearFeedback, refreshMarket } = useMarketSimulation();

  return (
    <div className="min-h-dvh bg-[#f5f3eb] text-[#182d2a]">
      <a className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3" href="#market-content">Lewati ke ruang kerja</a>
      <AppHeader />
      <div className="mx-auto max-w-[1440px] px-4 pb-8 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5 pt-6 sm:pb-7 sm:pt-9">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#465c54]">Pasar Induk Kramat Jati</p>
            <h1 className="font-serif text-4xl leading-none tracking-tight sm:text-5xl">{ROLE_LABELS[role]}</h1>
          </div>
          <p className="text-sm font-semibold text-[#36594f]">{user?.organization || user?.name}</p>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <AppSidebar />
          <main id="market-content" className="min-w-0 flex-1" aria-busy={busy} tabIndex={-1}>
            {user?.role !== role && (
              <p className="mb-4 rounded-lg border border-[#d5ded2] bg-[#fffef8] p-3 text-sm text-[#465c54]">
                Pratinjau {ROLE_LABELS[role]}. Masuk dengan akun peran tersebut untuk menjalankan transaksi.
              </p>
            )}
            {feedback && (
              <div role={feedback.success ? "status" : "alert"}
                className={`mb-4 flex items-center justify-between gap-3 rounded-lg border p-3 text-sm ${feedback.success
                  ? "border-[#a9c4ad] bg-[#edf5e9] text-[#244b3e]" : "border-[#e4a79a] bg-[#fff0eb] text-[#8e2d23]"}`}>
                <span>{feedback.message}</span>
                {stateReady && <button type="button" className="min-h-9 font-semibold underline underline-offset-2" onClick={clearFeedback}>Tutup</button>}
              </div>
            )}
            {!stateReady ? (
              <div className="rounded-xl border border-[#d5ded2] bg-[#fffef8] p-5 text-sm text-[#465c54]">
                {feedback
                  ? <button type="button" onClick={refreshMarket} className="min-h-11 font-semibold underline underline-offset-2">Muat ulang data</button>
                  : <p role="status">Memuat data pasar…</p>}
              </div>
            ) : (
              <div className="market-role-content">
                {role === "vendor" && <VendorDashboard />}
                {(role === "warteg" || role === "social_kitchen" || role === "maggot") && <BuyerDashboard key={role} role={role} />}
                {role === "logistics" && <LogisticsDashboard />}
                {(role === "manager" || role === "admin") && <OversightDashboard />}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/** Redirects unauthenticated visitors to the sign-in screen. */
export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  return isAuthenticated ? <DashboardContent /> : (
    <main className="grid min-h-dvh place-items-center bg-[#f5f3eb] px-5 text-sm text-[#465c54]">
      <p role="status">{isLoading ? "Memeriksa sesi…" : "Membuka halaman masuk…"}</p>
    </main>
  );
}
