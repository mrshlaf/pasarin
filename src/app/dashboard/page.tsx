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
import { useMarketSimulation, type AppRole } from "@/lib/simulationStore";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar, ROLE_LABELS } from "@/components/layout/AppSidebar";
import { MarketHeroBackground } from "@/components/common/MarketEditorialImage";
import { VendorDashboard } from "@/components/roles/VendorDashboard";
import { LogisticsDashboard } from "@/components/roles/LogisticsDashboard";

import { BuyerDashboard } from "@/components/roles/BuyerDashboard";
import { OversightDashboard } from "@/components/roles/OversightDashboard";


const friendlyRoleCopy: Record<AppRole, { greeting: string; description: string }> = {
  vendor: {
    greeting: "Hai, Pedagang! Selamat datang!",
    description: "Yuk, pantau mutu stok kiosmu hari ini, konfirmasi hasil timbang sisa dagangan, dan tawarkan harga terbaik untuk diselamatkan!",
  },
  warteg: {
    greeting: "Hai, Rekan Warteg! Selamat datang!",
    description: "Yuk, temukan pasokan sayuran segar layak masak dengan harga hemat untuk sajian menu lezat usahamu hari ini!",
  },
  social_kitchen: {
    greeting: "Hai, Tim Dapur Sosial! Selamat datang!",
    description: "Semangat berbagi! Yuk, klaim donasi pangan bergizi dan siapkan porsi makanan hangat terbaik untuk saudara kita.",
  },
  maggot: {
    greeting: "Hai, Sentra Maggot! Selamat datang!",
    description: "Yuk, olah biomassa organik pasar menjadi biokonversi bernilai tinggi dan bantu lingkungan bebas dari tumpukan sampah!",
  },
  logistics: {
    greeting: "Hai, Tim Kurir! Selamat datang!",
    description: "Siap meluncur? Cek antrean penjemputan di los kios pasar dan antarkan paket bahan pangan ke mitra tepat waktu!",
  },
  manager: {
    greeting: "Hai, Pengelola Pasar! Selamat datang!",
    description: "Pantau kelancaran sirkulasi pangan, ketercapaian target redistribusi surplus, dan transparansi transaksi pasar hari ini.",
  },
  admin: {
    greeting: "Hai, Administrator! Selamat datang!",
    description: "Kelola ekosistem pasar, jalankan evaluasi mutu stok los, dan pastikan seluruh aliran redistribusi surplus berjalan optimal!",
  },
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
        <section aria-labelledby="workspace-role-title" className="relative isolate my-4 flex min-h-[250px] flex-col justify-center overflow-hidden rounded-3xl bg-brand-deep p-6 text-cream shadow-md sm:min-h-[290px] sm:p-10 lg:min-h-[320px] lg:p-12">
          <MarketHeroBackground context={role} />
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="min-w-0 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-soft">Pasar Induk Kramat Jati · Ruang Kerja {ROLE_LABELS[role]}</p>
              <h1 id="workspace-role-title" className="mt-2 font-serif text-3xl font-bold tracking-tight text-cream sm:text-4xl lg:text-[2.85rem] leading-[1.12]">{friendlyRoleCopy[role].greeting}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sage-soft/95 sm:text-base">{friendlyRoleCopy[role].description}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex min-h-11 items-center rounded-xl border border-white/20 bg-black/20 px-3.5 py-1.5 text-xs font-medium text-cream backdrop-blur-md">
                  {user?.organization || user?.name}
                </span>
                <button
                  type="button"
                  onClick={refreshMarket}
                  disabled={busy || isSyncing}
                  aria-busy={isSyncing}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-xs font-semibold text-cream backdrop-blur-md transition-all hover:border-white/40 hover:bg-white/20 focus-visible:outline-cream disabled:opacity-60"
                >
                  <RefreshCw size={14} aria-hidden /> {isSyncing ? "Memuat ulang…" : "Segarkan data"}
                </button>
              </div>
            </div>
          </div>
        </section>

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
