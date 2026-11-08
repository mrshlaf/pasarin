"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
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
    <div className="min-h-dvh bg-canvas text-ink">
      <a className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3" href="#market-content">Lewati ke ruang kerja</a>
      <AppHeader />
      <div className="mx-auto max-w-[1440px] px-4 pb-8 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line pb-4 pt-6 sm:pb-5">
          <div className="min-w-0">
            <h1 className="break-words font-serif text-3xl leading-tight tracking-tight sm:text-4xl">{ROLE_LABELS[role]}</h1>
            <p className="mt-1 text-sm text-ink-muted">Pasar Induk Kramat Jati</p>
          </div>
          <p className="min-w-0 break-words text-sm font-semibold text-ink-soft sm:text-right">{user?.organization || user?.name}</p>
        </div>

        <div className="flex flex-col gap-4 pt-4 lg:flex-row lg:gap-6">
          <AppSidebar />
          <main id="market-content" className="min-w-0 flex-1" aria-busy={busy} tabIndex={-1}>
            {user?.role !== role && (
              <p className="mb-4 flex items-start gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] leading-5 text-ink-muted">
                <Eye size={15} aria-hidden className="mt-0.5 shrink-0 text-brand" />
                <span>Pratinjau. Masuk sebagai {ROLE_LABELS[role]} untuk bertransaksi.</span>
              </p>
            )}
            {feedback && (
              <div role={feedback.success ? "status" : "alert"}
                className={`mb-4 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm ${feedback.success
                  ? "border-tier-3/30 bg-tier-3-soft text-tier-3-ink" : "border-danger/30 bg-danger-soft text-danger"}`}>
                <span>{feedback.message}</span>
                {stateReady && <button type="button" className="min-h-9 shrink-0 font-semibold underline underline-offset-2" onClick={clearFeedback}>Tutup</button>}
              </div>
            )}
            {!stateReady ? (
              <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink-muted">
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

        <footer className="mt-8 border-t border-line pt-4 text-[12px] text-ink-muted">
          Prototipe akademik, Universitas Indonesia.
        </footer>
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
    <main className="grid min-h-dvh place-items-center bg-canvas px-5 text-sm text-ink-muted">
      <p role="status">{isLoading ? "Memeriksa sesi…" : "Membuka halaman masuk…"}</p>
    </main>
  );
}
