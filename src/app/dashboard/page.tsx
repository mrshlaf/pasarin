/**
 * Halaman Ruang Kerja Dasbor Peran Pengguna (Role Workspace Dashboard) (PSR-2).
 * Menyediakan kerangka navigasi terpadu untuk merender komponen dasbor sesuai peran pengguna aktif
 * (Pedagang, Warteg, Dapur Sosial, Sentra Maggot, Kurir, Pengelola Pasar, dan Administrator).
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useMarketSimulation } from "@/lib/simulationStore";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar, ROLE_LABELS } from "@/components/layout/AppSidebar";
import { VendorDashboard } from "@/components/roles/VendorDashboard";
import { LogisticsDashboard } from "@/components/roles/LogisticsDashboard";

import { BuyerDashboard } from "@/components/roles/BuyerDashboard";
import { OversightDashboard } from "@/components/roles/OversightDashboard";


const workspaceDescriptions = {
  vendor: "Pantau mutu stok, timbang sisa dagangan, dan terbitkan penawaran.",
  warteg: "Temukan bahan layak masak dan kelola pesanan dari kios pasar.",
  social_kitchen: "Kelola bahan untuk dapur sosial, dari reservasi sampai diterima.",
  maggot: "Salurkan bahan biomassa pasar ke proses biokonversi.",
  logistics: "Atur antrean pengantaran dan konfirmasi serah terima barang.",
  manager: "Pantau pasokan, distribusi, dan transaksi lintas peran pasar.",
  admin: "Tinjau seluruh alur pasar dan evaluasi penawaran yang perlu ditindaklanjuti.",
};
/**
 * Komponen konten dasbor yang merender tampilan ruang kerja sesuai peran terotorisasi.
 */
function DashboardContent() {
  const { user } = useAuth();
  const { role, busy, stateReady, syncError, isSyncing, feedback, clearFeedback, refreshMarket } = useMarketSimulation();

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-3" href="#market-content">Lewati ke ruang kerja</a>
      <AppHeader />
      <div className="market-shell pb-8">
        <div className="workspace-masthead">
          <div className="min-w-0">
            <p className="market-eyebrow mb-2">Pasar Induk Kramat Jati / Ruang kerja</p>
            <h1 className="workspace-heading break-words">{ROLE_LABELS[role]}</h1>
            <p className="mt-2 max-w-prose text-sm leading-6 text-ink-muted">{workspaceDescriptions[role]}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 break-words text-sm font-medium text-ink-soft">{user?.organization || user?.name}</p>
            <button type="button" onClick={refreshMarket} disabled={busy || isSyncing} aria-busy={isSyncing}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm font-semibold text-brand hover:bg-brand-soft disabled:opacity-60">
              <RefreshCw size={15} aria-hidden /> {isSyncing ? "Memuat ulang…" : "Muat ulang"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <AppSidebar />
          <main id="market-content" className="min-w-0 flex-1 scroll-mt-20" aria-busy={busy || isSyncing} tabIndex={-1}>
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
                <span className="min-w-0 break-words">{feedback.message}</span>
                <button type="button" className="min-h-11 min-w-11 shrink-0 font-semibold underline underline-offset-2" onClick={clearFeedback}>Tutup</button>
              </div>
            )}
            {stateReady && syncError && (
              <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                <p className="min-w-0 flex-1">{syncError} Data terakhir tetap ditampilkan.</p>
                <button type="button" onClick={refreshMarket} disabled={busy || isSyncing}
                  className="min-h-11 shrink-0 font-semibold underline underline-offset-2 disabled:opacity-60">
                  {isSyncing ? "Mencoba kembali…" : "Coba lagi"}
                </button>
              </div>
            )}
            {!stateReady ? (
              <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink-muted">
                {syncError ? (
                  <>
                    <p role="alert" className="text-danger">{syncError}</p>
                    <button type="button" onClick={refreshMarket} disabled={busy || isSyncing}
                      className="mt-2 min-h-11 font-semibold text-brand underline underline-offset-2 disabled:opacity-60">
                      {isSyncing ? "Memuat data pasar…" : "Coba muat data lagi"}
                    </button>
                  </>
                ) : <p role="status">Memuat data pasar…</p>}
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

        <footer className="mt-10 flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-xs text-ink-muted">
          <span className="font-semibold tracking-wide">PASARIN</span>
          <span>Pasokan, penawaran, dan distribusi dalam satu ruang kerja.</span>
        </footer>
      </div>
    </div>
  );
}

/**
 * Halaman utama ruang kerja privat yang mengarahkan pengunjung tanpa sesi kembali ke halaman publik.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/");
  }, [isLoading, isAuthenticated, router]);

  return isAuthenticated ? <DashboardContent /> : (
    <main className="grid min-h-dvh place-items-center bg-canvas px-5 text-sm text-ink-muted">
      <p role="status">{isLoading ? "Memeriksa sesi…" : "Membuka dasbor publik…"}</p>
    </main>
  );
}
