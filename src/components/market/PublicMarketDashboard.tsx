"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Boxes, HeartHandshake, MapPin, Recycle, RefreshCw, Send, Truck, UtensilsCrossed } from "lucide-react";
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

const clock = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const number = new Intl.NumberFormat("id-ID");

export function PublicMarketDashboard() {
  const { isAuthenticated } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    let request: AbortController | undefined;
    let disposed = false;
    async function sync() {
      if (request) return;
      const controller = new AbortController();
      request = controller;
      setRefreshing(true);
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

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-surface focus:p-3" href="#ringkasan">Lewati ke ringkasan pasar</a>
      <header className="border-b border-line bg-surface">
        <div className="market-shell flex min-h-[4.5rem] items-center justify-between gap-3">
          <Link href="/" className="inline-flex min-h-11 items-center rounded-lg" aria-label="Dasbor publik Pasarin"><PasarinLogo size="sm" showSubtitle={false} /></Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden min-[360px]:block text-xs text-ink-soft"><RealtimeWibClock showSeconds={false} showDate={false} /></div>
            <Link href={workspace} className={marketButton + " shrink-0"}>{isAuthenticated ? "Ruang kerja" : "Masuk"}<ArrowRight size={16} aria-hidden /></Link>
          </div>
        </div>
      </header>

      <main id="ringkasan" className="market-shell py-5 sm:py-8" tabIndex={-1}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-ink-soft"><MapPin size={16} aria-hidden />Pasar Induk Kramat Jati</p>
          <button type="button" className={marketSecondary} disabled={refreshing} onClick={() => { setRefreshing(true); setRefresh((value) => value + 1); }}>
            <RefreshCw size={16} aria-hidden />{refreshing ? "Memuat ringkasan…" : "Perbarui ringkasan"}
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr] lg:gap-5" aria-busy={refreshing}>
          <section className="relative isolate flex min-w-0 flex-col justify-between overflow-hidden rounded-3xl bg-brand-deep p-5 text-cream sm:p-8 lg:p-10" aria-labelledby="market-title">
            <Image src="/brand/pasarin_icon_white.png" alt="" width={360} height={304} className="pointer-events-none absolute -right-16 -bottom-24 -z-10 w-72 opacity-10 sm:w-96" />
            <div>
              <h1 id="market-title" className="max-w-[18ch] font-serif text-[clamp(2rem,4.5vw,3.75rem)] leading-[1.08] tracking-tight">Pasokan tersedia, penyaluran tercatat.</h1>
              <p className="mt-4 max-w-[44ch] text-sm leading-6 text-sage-soft">Ringkasan penawaran dalam aplikasi Pasarin, bukan keseluruhan pasokan pasar.</p>
            </div>
            <dl className="mt-8 border-t border-rail pt-5">
              <dt className="text-sm text-sage-soft">Volume yang dapat diklaim</dt>
              <dd className="mt-1 break-words font-serif text-[clamp(2.75rem,7vw,5rem)] leading-tight tracking-tight tabular-nums">{data ? kg(data.availableKg) : "Belum tersedia"}</dd>
              <dd className="mt-2 text-sm text-sage-soft">{data ? `${number.format(data.availableLots)} lot penawaran aktif` : "Menunggu ringkasan pasar"}</dd>
            </dl>
            <a href="#jalur" className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-rail px-3.5 text-sm font-semibold text-cream transition-colors hover:bg-white/10 focus-visible:outline-cream">Lihat pembagian pasokan<ArrowDown size={16} aria-hidden /></a>
          </section>

          <section aria-labelledby="distribution-totals" className="market-panel flex min-w-0 flex-col justify-between">
            <div>
              <h2 id="distribution-totals" className="market-section-heading">Hasil penyaluran</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">Akumulasi penawaran yang sudah selesai diserahterimakan di aplikasi.</p>
              <dl className="mt-6 divide-y divide-line">
                <div className="pb-5"><dt className="text-sm text-ink-muted">Volume tersalurkan</dt><dd className="mt-1 break-words font-serif text-[clamp(2rem,4vw,3.25rem)] leading-tight tracking-tight tabular-nums">{data ? kg(data.distributedKg) : "Belum tersedia"}</dd></div>
                <div className="pt-5"><dt className="text-sm text-ink-muted">Pengantaran selesai</dt><dd className="mt-1 font-serif text-3xl leading-tight tabular-nums">{data ? number.format(data.completedDeliveries) : "Belum tersedia"}</dd></div>
              </dl>
            </div>
            <div className="mt-6 rounded-xl border border-line bg-canvas p-3.5 text-sm leading-6 text-ink-soft" role="status" aria-live="polite">
              {unavailable ? (snapshot ? <>Pembaruan gagal. Angka masih berasal dari <time dateTime={snapshot.timestamp}>{clock.format(new Date(snapshot.timestamp))} WIB</time>. Pilih Perbarui ringkasan untuk mencoba lagi.</> : "Ringkasan gagal dimuat. Periksa koneksi, lalu pilih Perbarui ringkasan.") : snapshot ? <>{refreshing ? "Memperbarui data. " : "Pembaruan terakhir: "}<time dateTime={snapshot.timestamp}>{clock.format(new Date(snapshot.timestamp))} WIB</time>. Ringkasan diperiksa ulang setiap menit saat halaman aktif.</> : "Memuat penawaran aktif dan hasil penyaluran…"}
            </div>
          </section>
        </div>

        <div id="jalur" className="mt-5 grid scroll-mt-6 gap-4 lg:grid-cols-[1.3fr_1fr] lg:gap-5">
          <section aria-labelledby="lane-title" className="market-panel min-w-0">
            <h2 id="lane-title" className="market-section-heading">Pasokan menurut tujuan</h2>
            <p className="mt-1 text-sm leading-6 text-ink-muted">Pembagian volume yang masih dapat diklaim.</p>
            {data ? <>
              {data.availableLots === 0 && <p className="mt-4 rounded-xl bg-canvas p-3 text-sm leading-6 text-ink-soft">Belum ada penawaran yang dapat diklaim. Perbarui ringkasan untuk memeriksa pasokan berikutnya.</p>}
              <ul className="mt-3 divide-y divide-line">
                {lanes.map(({ id, name, detail, icon: Icon, color }) => {
                  const lane = data.lanes[id];
                  const share = data.availableKg > 0 ? Math.min(100, lane.kg / data.availableKg * 100) : 0;
                  return <li key={id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 py-4">
                    <span className="grid size-10 place-items-center rounded-xl bg-canvas text-brand"><Icon size={19} aria-hidden /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h3 className="font-semibold">{name}</h3><p className="text-base font-semibold tabular-nums">{kg(lane.kg)}</p></div>
                      <p className="mt-1 text-[13px] leading-5 text-ink-muted">{detail} · {number.format(lane.lots)} lot</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-track" aria-hidden><div className={"h-full rounded-full " + color} style={{ width: share + "%" }} /></div>
                    </div>
                  </li>;
                })}
              </ul>
            </> : <div className="mt-4"><EmptyState icon={Boxes} title={unavailable ? "Pembagian pasokan belum tersedia" : "Memuat pembagian pasokan"} /></div>}
          </section>

          <section aria-labelledby="commodity-title" className="market-panel min-w-0">
            <h2 id="commodity-title" className="market-section-heading">Komoditas tersedia</h2>
            <p className="mt-1 text-sm leading-6 text-ink-muted">Hingga lima komoditas dengan volume tertinggi.</p>
            {data && data.topCommodities.length > 0 ? <ol className="mt-4 divide-y divide-line">
              {data.topCommodities.map(({ name, kg: amount }, index) => <li key={name} className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-baseline gap-x-2 gap-y-1 py-4 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto]">
                <span aria-hidden className="text-xs tabular-nums text-ink-muted">{String(index + 1).padStart(2, "0")}</span><span className="break-words font-semibold">{name}</span><span className="col-start-2 text-sm tabular-nums text-ink-soft sm:col-start-auto sm:text-right">{kg(amount)}</span>
              </li>)}
            </ol> : <div className="mt-4"><EmptyState icon={Boxes} title={data ? "Belum ada penawaran aktif" : unavailable ? "Komoditas belum tersedia" : "Memuat komoditas"} /></div>}
          </section>
        </div>

        {data?.forecast && <section aria-labelledby="distribution-estimate-title" className="mt-5 overflow-hidden rounded-3xl border border-line bg-surface">
          <header className="px-5 pt-6 sm:px-7 sm:pt-7">
            <h2 id="distribution-estimate-title" className="font-serif text-3xl leading-tight tracking-tight sm:text-4xl">Dari pasokan ke potensi manfaat</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">Perkiraan porsi dan kebutuhan angkut dari penawaran yang tersedia, bukan realisasi penyaluran.</p>
          </header>
          <div className="grid gap-6 p-5 sm:gap-7 sm:p-7 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
            <section aria-labelledby="portion-estimate" className="min-w-0 rounded-2xl bg-brand-soft p-5 sm:p-6">
              <h3 id="portion-estimate" className="text-sm font-semibold text-brand">Potensi porsi olahan</h3>
              <dl className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-4">
                <div>
                  <dt className="text-sm text-ink-soft">Warteg</dt>
                  <dd className="mt-2 font-serif text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-tight tabular-nums text-brand-deep">{number.format(data.forecast.recipients.warteg.estimatedMeals)}<span className="mt-2 block font-sans text-sm font-medium tracking-normal text-ink-soft">porsi olahan</span></dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-soft">Dapur sosial</dt>
                  <dd className="mt-2 font-serif text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-tight tabular-nums text-brand-deep">{number.format(data.forecast.recipients.socialKitchen.estimatedBeneficiaries)}<span className="mt-2 block font-sans text-sm font-medium tracking-normal text-ink-soft">porsi olahan</span></dd>
                </div>
              </dl>
              <p className="mt-6 border-t border-line pt-4 text-sm leading-6 text-ink-soft">Dihitung dengan asumsi 1 kg bahan menjadi 4 porsi.</p>
            </section>
            <section aria-labelledby="fleet-estimate" className="min-w-0">
              <h3 id="fleet-estimate" className="flex items-center gap-2 text-sm font-semibold text-ink"><Truck size={18} aria-hidden />Perkiraan kebutuhan angkut</h3>
              <ul className="mt-3 divide-y divide-line">
                {data.forecast.fleet.vehicles.map((vehicle) => <li key={vehicle.type} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-4 py-4">
                  <p className="font-serif text-4xl leading-none tabular-nums text-brand">{number.format(vehicle.units)}<span className="mt-1 block font-sans text-xs font-medium text-ink-muted">unit</span></p>
                  <div className="min-w-0"><h4 className="text-sm font-semibold leading-6">{vehicle.name}</h4><p className="mt-0.5 text-sm leading-6 text-ink-muted">{kg(vehicle.capacityKg)} / unit · {vehicle.targetLane}</p></div>
                </li>)}
              </ul>
            </section>
          </div>
          <p className="border-t border-line bg-canvas px-5 py-4 text-[13px] leading-6 text-ink-muted sm:px-7">Estimasi kendaraan memakai alokasi minimum, termasuk saat pasokan kosong. Bukan konfirmasi armada atau penugasan kurir.</p>
        </section>}

        <footer className="mt-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-3 text-[13px] text-ink-muted">
          <p>Pasarin · Ringkasan publik tanpa detail akun</p><a href="https://t.me/agent_pasarin_bot" className="inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-brand hover:underline" target="_blank" rel="noopener noreferrer"><Send size={15} aria-hidden />Buka bot Telegram</a>
        </footer>
      </main>
    </div>
  );
}
