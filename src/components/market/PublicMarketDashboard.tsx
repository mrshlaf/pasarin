/**
 * Dasbor Publik Agregat Pasar Induk Kramat Jati (Public Market Dashboard).
 * Menampilkan ringkasan volume surplus pangan pasar secara agregat tanpa membocorkan privasi
 * identitas akun maupun detail transaksi per kios pedagang.
 */

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Bike, Boxes, HeartHandshake, MapPin, Recycle, RefreshCw, Send, Sparkles, Truck, UtensilsCrossed } from "lucide-react";
import { PasarinLogo } from "@/components/common/PasarinLogo";
import { RealtimeWibClock } from "@/components/common/RealtimeWibClock";
import { EmptyState, kg, marketButton, marketSecondary } from "@/components/common/MarketWorkspace";
import { useAuth } from "@/lib/authContext";
import type { readPublicMarketOverview } from "@/lib/serverSimulationState";

type Overview = Awaited<ReturnType<typeof readPublicMarketOverview>>;
type Snapshot = { data: Overview; timestamp: string };

const lanes = [
  { id: "tier_1", name: "Warteg", detail: "Bahan untuk dimasak", icon: UtensilsCrossed, color: "bg-tier-1" },
  { id: "tier_2", name: "Dapur sosial", detail: "Bahan untuk olahan dan donasi", icon: HeartHandshake, color: "bg-tier-2" },
  { id: "tier_3", name: "Sentra maggot", detail: "Bahan untuk biokonversi", icon: Recycle, color: "bg-tier-3" },
] as const;

const clock = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const number = new Intl.NumberFormat("id-ID");

/**
 * Komponen halaman beranda publik yang memvisualisasikan agregat sirkular 3-tier dan armada distribusi.
 */
export function PublicMarketDashboard() {
  const { isAuthenticated } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let request: AbortController | undefined;
    let disposed = false;
    async function sync() {
      if (request) return;
      const controller = new AbortController();
      request = controller;
      const timeout = window.setTimeout(() => controller.abort(), 12_000);
      try {
        const response = await fetch("/api/market/overview", { signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error("Ringkasan pasar belum tersedia.");
        if (!disposed) {
          setSnapshot({ data: result.data, timestamp: result.timestamp });
          setUnavailable(false);
        }
      } catch {
        if (!disposed) setUnavailable(true);
      } finally {
        window.clearTimeout(timeout);
        request = undefined;
        if (!disposed) setRefreshing(false);
      }
    }
    void sync();
    const timer = window.setInterval(() => { if (!document.hidden) void sync(); }, 60_000);
    return () => { disposed = true; request?.abort(); window.clearInterval(timer); };
  }, [refresh]);

  const data = snapshot?.data;
  const workspace = isAuthenticated ? "/dashboard" : "/login";
  const metrics = [
    { label: "Lot tersedia", value: data && number.format(data.availableLots) },
    { label: "Volume tersedia", value: data && kg(data.availableKg) },
    { label: "Sudah disalurkan", value: data && kg(data.distributedKg) },
    { label: "Pengantaran selesai", value: data && number.format(data.completedDeliveries) },
  ];

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3" href="#ringkasan">Lewati ke ringkasan pasar</a>
      <header className="border-b border-line bg-surface">
        <div className="market-shell flex min-h-[4.25rem] items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-5">
            <Link href="/" aria-label="Dasbor publik Pasarin"><PasarinLogo size="sm" showSubtitle={false} /></Link>
            <div className="hidden sm:flex items-center rounded-lg border border-line bg-canvas/80 px-2.5 py-1 text-xs text-ink-soft">
              <RealtimeWibClock />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="sm:hidden flex items-center rounded-lg border border-line bg-canvas/80 px-2 py-1 text-[11px] text-ink-soft">
              <RealtimeWibClock showSeconds={false} showDate={false} />
            </div>
            <Link href={workspace} className={marketButton + " shrink-0"}>
              {isAuthenticated ? "Ruang kerja" : "Masuk"} <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main id="ringkasan" className="market-shell py-5 sm:py-8" tabIndex={-1}>
        <div className="grid gap-4 lg:grid-cols-[1.12fr_1fr] lg:gap-5">
          <section className="relative isolate flex min-w-0 flex-col justify-between overflow-hidden rounded-3xl bg-brand-deep p-5 text-cream sm:p-8 lg:p-10">
            <Image src="/brand/pasarin_icon_white.png" alt="" width={360} height={304}
              className="pointer-events-none absolute -right-16 -bottom-24 -z-10 w-72 opacity-10 sm:w-96" />
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-sage-soft"><MapPin size={15} aria-hidden /> Pasar Induk Kramat Jati</p>
              <h1 className="mt-5 max-w-[16ch] font-serif text-[clamp(2.35rem,5vw,4.75rem)] leading-[1.03] tracking-tight">Surplus pasar, sampai ke tujuan.</h1>
              <p className="mt-4 max-w-[42ch] text-sm leading-6 text-sage-soft sm:text-base sm:leading-7">Pantau pasokan yang tersedia dan hasil penyalurannya ke warteg, dapur sosial, serta sentra maggot.</p>
            </div>
            <a href="#jalur" className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-rail px-3.5 text-sm font-semibold text-cream transition-colors hover:bg-white/10 focus-visible:outline-cream">
              Lihat jalur distribusi <ArrowDown size={16} aria-hidden />
            </a>
          </section>

          <section aria-labelledby="market-totals" className="market-panel flex min-w-0 flex-col justify-between" aria-busy={refreshing || (!snapshot && !unavailable)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="market-eyebrow">Dasbor publik</p>
                <h2 id="market-totals" className="mt-1 font-serif text-[clamp(1.65rem,3vw,2.3rem)] leading-tight tracking-tight">Ringkasan pasar</h2>
              </div>
              <button type="button" className={marketSecondary + " w-11 px-0"} aria-label="Muat ulang ringkasan" disabled={refreshing}
                onClick={() => { setRefreshing(true); setRefresh((value) => value + 1); }}>
                <RefreshCw size={16} aria-hidden />
              </button>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
              {metrics.map(({ label, value }) => (
                <div key={label} className="min-w-0 bg-canvas/85 px-3 py-4 sm:p-4">
                  <dt className="text-[13px] font-medium leading-5 text-ink-muted">{label}</dt>
                  <dd className="mt-1.5 break-words font-serif text-[clamp(1.4rem,3vw,2.3rem)] leading-tight tabular-nums tracking-tight">{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[13px] leading-5 text-ink-muted" role="status">
              {unavailable ? (snapshot ? "Menampilkan ringkasan terakhir. Pembaruan sedang terganggu." : "Ringkasan sedang tidak tersedia. Coba muat ulang.")
                : snapshot ? <>Diperbarui <time dateTime={snapshot.timestamp}>{clock.format(new Date(snapshot.timestamp))} WIB</time></>
                  : "Memuat ringkasan pasar…"}
            </p>
          </section>
        </div>

        {/* Proyeksi Harian: Warteg, Dapur Sosial, & Armada Pengantar */}
        {data?.forecast && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.12fr_1fr] lg:gap-5">
              {/* Kartu 1: Penyaluran Warteg & Dapur Sosial */}
              <section className="market-panel flex min-w-0 flex-col justify-between" aria-labelledby="forecast-recipients-title">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                    <div>
                      <p className="market-eyebrow">Penyaluran Hari Ini</p>
                      <h2 id="forecast-recipients-title" className="market-section-heading">Warteg & Dapur Sosial</h2>
                    </div>
                    <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">Estimasi Siap Salur</span>
                  </div>

                  <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                    {/* Warteg Card */}
                    <div className="rounded-2xl border border-line bg-canvas/70 p-4 transition-colors hover:border-brand/30">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                          <span className="grid size-6 place-items-center rounded-md bg-tier-1-soft text-tier-1"><UtensilsCrossed size={13} /></span>
                          Warteg & UMKM
                        </span>
                        <span className="text-[11px] font-medium text-ink-muted">{data.forecast.recipients.warteg.lots} lot aktif</span>
                      </div>
                      <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="font-serif text-3xl font-bold tracking-tight text-ink tabular-nums">{kg(data.forecast.recipients.warteg.kg)}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-brand">~{number.format(data.forecast.recipients.warteg.estimatedMeals)} porsi makan</p>
                      <p className="mt-2 text-[11px] text-ink-muted">{data.forecast.recipients.warteg.partnerCount} mitra warteg (radius &lt; 2.5 km)</p>
                    </div>

                    {/* Dapur Sosial Card */}
                    <div className="rounded-2xl border border-line bg-canvas/70 p-4 transition-colors hover:border-brand/30">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                          <span className="grid size-6 place-items-center rounded-md bg-tier-2-soft text-tier-2"><HeartHandshake size={13} /></span>
                          Dapur Sosial & Panti
                        </span>
                        <span className="text-[11px] font-medium text-ink-muted">{data.forecast.recipients.socialKitchen.lots} lot aktif</span>
                      </div>
                      <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="font-serif text-3xl font-bold tracking-tight text-ink tabular-nums">{kg(data.forecast.recipients.socialKitchen.kg)}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-tier-2-ink">~{number.format(data.forecast.recipients.socialKitchen.estimatedBeneficiaries)} porsi santunan</p>
                      <p className="mt-2 text-[11px] text-ink-muted">{data.forecast.recipients.socialKitchen.partnerCount} panti mitra · Reservasi 30 menit</p>
                    </div>
                  </div>
                </div>

                {/* Sentra Maggot Strip */}
                {data.forecast.recipients.maggot.kg > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-surface/90 px-3.5 py-2 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-2 font-medium text-ink">
                      <Recycle size={14} className="text-tier-3 shrink-0" />
                      <span>Sentra Maggot BSF: <strong className="text-ink">{kg(data.forecast.recipients.maggot.kg)}</strong> ({data.forecast.recipients.maggot.lots} lot)</span>
                    </span>
                    <span className="font-semibold text-tier-3-ink">Rp0 Bebas Biaya</span>
                  </div>
                )}
              </section>

              {/* Kartu 2: Kurir & Armada Pengantar */}
              <section className="market-panel min-w-0" aria-labelledby="forecast-fleet-title">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                  <div>
                    <p className="market-eyebrow">Kesiapan Distribusi</p>
                    <h2 id="forecast-fleet-title" className="market-section-heading">Kurir & Armada Pengantar</h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-deep px-2.5 py-0.5 text-xs font-semibold text-cream">
                    <Truck size={13} /> {data.forecast.fleet.totalCouriers} Kurir Siap Jalan
                  </span>
                </div>

                <div className="mt-2.5 divide-y divide-line">
                  {data.forecast.fleet.vehicles.map((v) => (
                    <div key={v.type} className="flex items-start gap-3 py-3 text-xs first:pt-1 last:pb-1">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-canvas text-brand">
                        {v.type === "viar_trike" ? <Bike size={16} /> : <Truck size={16} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <strong className="text-[13px] font-semibold text-ink">{v.units}x {v.name}</strong>
                          <span className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[11px] text-ink-soft">{v.licensePlate}</span>
                        </div>
                        <p className="mt-0.5 text-ink-soft">
                          Pengemudi: <strong className="text-ink">{v.driverName}</strong> · Muat {v.capacityKg} kg ({v.fuelType})
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-ink-muted">Tujuan: {v.targetLane}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Kartu 3: Catatan Operasional AI */}
            {data.forecast.aiAnalysis && (
              <section className="rounded-2xl border border-brand/20 bg-gradient-to-r from-brand-soft/40 via-surface to-brand-soft/20 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2.5">
                  <div className="flex items-center gap-2 text-brand">
                    <Sparkles size={15} className="text-brand shrink-0" />
                    <h3 className="text-xs font-semibold tracking-wide uppercase text-ink">Catatan Operasional Pasar</h3>
                  </div>
                  <span className="rounded-full border border-brand/25 bg-surface px-2.5 py-0.5 font-mono text-[11px] font-medium text-brand">
                    {data.forecast.aiAnalysis.model}
                  </span>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
                  {data.forecast.aiAnalysis.summary}
                </p>
                <div className="mt-2.5 rounded-lg border-l-2 border-brand bg-canvas/80 px-3 py-2 text-xs leading-relaxed text-ink">
                  <span className="font-semibold text-brand">Rekomendasi: </span>
                  <span>{data.forecast.aiAnalysis.recommendation}</span>
                </div>
              </section>
            )}
          </div>
        )}

        <div id="jalur" className="mt-4 grid scroll-mt-6 gap-4 lg:grid-cols-[1.12fr_1fr] lg:gap-5">
          <section aria-labelledby="lane-title" className="market-panel min-w-0">
            <h2 id="lane-title" className="market-section-heading">Jalur distribusi</h2>
            <p className="mt-1 text-sm leading-6 text-ink-muted">Volume penawaran aktif untuk setiap tujuan.</p>
            <ul className="mt-3 divide-y divide-line">
              {lanes.map(({ id, name, detail, icon: Icon, color }) => {
                const lane = data?.lanes[id];
                const share = data?.availableKg && lane ? lane.kg / data.availableKg * 100 : 0;
                return (
                  <li key={id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 py-3.5">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={19} aria-hidden /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <h3 className="font-semibold">{name}</h3>
                        <p className="text-sm font-semibold tabular-nums">{lane ? kg(lane.kg) : "—"}</p>
                      </div>
                      <p className="text-[13px] leading-5 text-ink-muted">{detail}{lane ? " · " + number.format(lane.lots) + " lot" : ""}</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track" aria-hidden>
                        <div className={"h-full rounded-full " + color} style={{ width: share + "%" }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="commodity-title" className="market-panel min-w-0">
            <h2 id="commodity-title" className="market-section-heading">Komoditas tersedia</h2>
            <p className="mt-1 text-sm leading-6 text-ink-muted">Hingga lima komoditas dengan volume tertinggi.</p>
            {data && data.topCommodities.length > 0 ? (
              <ol className="mt-3 divide-y divide-line">
                {data.topCommodities.map(({ name, kg: amount }, index) => (
                  <li key={name} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-2 py-3 text-sm">
                    <span aria-hidden className="text-xs tabular-nums text-ink-muted">{String(index + 1).padStart(2, "0")}</span>
                    <span className="break-words font-semibold">{name}</span>
                    <span className="text-right tabular-nums text-ink-soft">{kg(amount)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-4">
                <EmptyState icon={Boxes} title={data ? "Belum ada penawaran aktif" : unavailable ? "Data belum tersedia" : "Memuat komoditas"} />
              </div>
            )}
          </section>
        </div>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-3 text-[13px] text-ink-muted">
          <p>PASARIN</p>
          <a href="https://t.me/agent_pasarin_bot" className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:underline" target="_blank" rel="noopener noreferrer">
            <Send size={15} aria-hidden /> Buka bot Telegram
          </a>
        </footer>
      </main>
    </div>
  );
}
