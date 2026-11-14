/**
 * Dasbor pengawas operasional: penawaran, buku besar pembayaran, evaluasi stok,
 * dan laporan uji skenario metabolisme pasar yang terpisah dari data operasional.
 */

"use client";

import { useState } from "react";
import { Boxes, Clock, FileCheck, Receipt, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { apiFetch } from "@/lib/apiFetch";
import { useMarketSimulation } from "@/lib/simulationStore";
import type { MetabolismTrialReport } from "@/lib/marketMetabolismSimulator";
import { MarketDialog } from "@/components/common/MarketDialog";
import { isDonation, isFreeMaggotOffer, isReadyForDelivery } from "@/types/market";
import {
  EmptyState, LotFacts, MarketMetrics, MarketSection, StatusPill, TierChip,
  commodityName, dateLabel, formatRemainingShelfLife, kg, kioskLabel, marketButton, marketSecondary, orderStatus, rupiah,
} from "@/components/common/MarketWorkspace";

type MetabolismTrialResponse = {
  success: boolean;
  data?: MetabolismTrialReport;
  error?: string;
};

/**
 * Komponen antarmuka pengawas yang menampilkan inventaris langsung, buku besar transaksi, dan audit trail operasional.
 */
export function OversightDashboard() {
  const { user } = useAuth();
  const { offers, stockItems, stockHealth, estimatedUnsoldKg, transactions, busy, triggerCronSweepNow } = useMarketSimulation();
  const [dlhError, setDlhError] = useState("");
  const [sweepResult, setSweepResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [dlhModalOpen, setDlhModalOpen] = useState(false);
  const [dlhLoading, setDlhLoading] = useState(false);
  const [dlhReport, setDlhReport] = useState<MetabolismTrialReport | null>(null);

  async function openDlhReport() {
    setDlhModalOpen(true);
    setDlhLoading(true);
    setDlhError("");
    setDlhReport(null);
    try {
      const res = await apiFetch("/api/simulation/metabolism-trial");
      const json: MetabolismTrialResponse = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "Laporan simulasi tidak dapat dimuat. Coba jalankan kembali.");
      }
      setDlhReport(json.data);
    } catch (cause) {
      setDlhError(cause instanceof Error ? cause.message : "Koneksi terputus saat memuat laporan. Coba jalankan kembali.");
    } finally {
      setDlhLoading(false);
    }
  }

  async function runStockEvaluation() {
    setSweepResult(null);
    setSweepResult(await triggerCronSweepNow());
  }

  const ready = offers.filter(isReadyForDelivery);
  const risk = stockItems.filter((item) => item.remainingKg > 0 && (stockHealth[item.id]?.decayScore ?? 0) >= 0.35);
  const settled = offers.filter((offer) => offer.status === "settled");
  const stockById = new Map(stockItems.map((item) => [item.id, item]));
  const activeOffers = offers.filter((offer) => offer.status === "active" && stockById.get(offer.stockId)?.verifiedAt).length;
  const offerRank = { pending_vendor: 0, active: 1, claimed: 2, settled: 3, rejected: 4 } as const;
  const sortedOffers = [...offers].sort((a, b) => offerRank[a.status] - offerRank[b.status]);
  const visibleOffers = showAllOffers ? sortedOffers : sortedOffers.slice(0, 12);

  return (
    <div className="grid min-w-0 gap-6">
      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <h2 className="font-serif text-2xl leading-tight tracking-tight sm:text-3xl">Tinjau alur pasar</h2>
            <p className="mt-2 max-w-prose text-sm leading-6 text-ink-muted">Pantau penawaran yang perlu ditimbang, muatan siap antar, dan status pembayaran dari catatan pasar.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            {user?.role === "admin" && (
              <button className={marketButton + " justify-center"} type="button" disabled={busy} onClick={runStockEvaluation}>
                <RefreshCw size={16} aria-hidden /> {busy ? "Memproses evaluasi…" : "Evaluasi stok sekarang"}
              </button>
            )}
            <button className={marketSecondary + " justify-center"} type="button" disabled={dlhLoading} onClick={openDlhReport}>
              <FileCheck size={16} aria-hidden /> {dlhLoading ? "Memuat uji skenario…" : "Laporan simulasi 24 jam"}
            </button>
          </div>
        </div>
        {sweepResult && (
          <p role={sweepResult.success ? "status" : "alert"} className={`mt-4 rounded-xl p-3 text-sm leading-6 ${sweepResult.success ? "bg-brand-soft text-brand-ink" : "bg-danger-soft text-danger"}`}>
            {sweepResult.message}
          </p>
        )}
        <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-ink-muted">Laporan 24 jam menjalankan skenario model terpisah. Hasilnya bukan audit kepatuhan DLH atau bukti pengalihan limbah operasional hari ini.</p>
      </section>

      <MarketMetrics items={[
        { label: "Kios dengan stok tercatat", value: new Set(stockItems.map((item) => item.vendorId)).size },
        { label: "Lot berisiko menurut model", value: risk.length, tone: risk.length > 0 ? "warning" : "brand" },
        { label: "Siap diantar", value: ready.length },
        { label: "Serah terima selesai", value: settled.length },
      ]} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:items-start">
        <div className="col-start-1 row-start-1 grid min-w-0 gap-4">
          <MarketSection title="Pantauan penawaran"
            description="Urutan dimulai dari persetujuan pedagang. Perkiraan sisa dan mutu berasal dari model; hasil timbang tetap menjadi catatan fisik lot."
            action={<span className="text-sm font-semibold tabular-nums text-ink-muted">{activeOffers} aktif · {stockItems.length} lot</span>}>
            {offers.length === 0 ? (
              <EmptyState icon={Boxes} title="Belum ada penawaran" description="Lot muncul dari pasokan pedagang." />
            ) : (
              <ul>{visibleOffers.map((offer) => {
                const stock = stockById.get(offer.stockId);
                const pending = offer.status === "pending_vendor" || (offer.status === "active" && !stock?.verifiedAt);
                return (
                  <li key={offer.id} className="grid min-w-0 gap-3 border-b border-line py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words font-semibold">{commodityName(offer.commodityId)}</p>
                        <TierChip tier={offer.targetTier} />
                      </div>
                      <p className="mt-1 break-words text-[13px] leading-5 text-ink-muted">
                        {kioskLabel(offer.vendorId)}{stock?.lotNumber ? " · " + stock.lotNumber : ""}
                      </p>
                      <LotFacts items={[
                        ...(stock ? [{ label: "Stok awal lot", value: kg(stock.initialKg) }] : []),
                        { label: pending ? "Perkiraan sisa" : offer.status === "active" ? "Kuota penawaran" : "Berat tercatat",
                          value: kg(pending ? estimatedUnsoldKg[offer.stockId] ?? offer.quantityKg : offer.quantityKg) },
                        ...(!pending ? [{ label: "Nilai", value: isFreeMaggotOffer(offer) ? "Gratis" : isDonation(offer) ? "Donasi" : rupiah(offer.totalAmountIdr) }] : []),
                      ]} />
                      {stockHealth[offer.stockId] && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted">
                          <Clock size={12} aria-hidden className="text-brand shrink-0" />
                          <span>Estimasi mutu: {stockHealth[offer.stockId]?.tierLabel || stockHealth[offer.stockId]?.condition} · Estimasi sisa simpan: <strong className="font-semibold text-ink">{formatRemainingShelfLife(stockHealth[offer.stockId]?.hoursRemaining ?? 0, stockHealth[offer.stockId]?.decayScore)}</strong></span>
                        </p>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <StatusPill label={pending ? "Perlu timbang" : orderStatus(offer)} />
                    </div>
                  </li>
                );
              })}</ul>
            )}
            {sortedOffers.length > visibleOffers.length && (
              <button type="button" className={marketSecondary + " mt-3 w-full justify-center"}
                onClick={() => setShowAllOffers(true)}>
                Tampilkan semua ({sortedOffers.length})
              </button>
            )}
          </MarketSection>
        </div>

        <div className="col-start-1 row-start-2 min-w-0 xl:sticky xl:top-20 xl:col-start-2 xl:row-start-1 xl:self-start">
          <MarketSection title="Buku besar pembayaran" description="Status dana per transaksi, termasuk penahanan sebelum barang diterima.">
            {transactions.length === 0 ? (
              <EmptyState icon={Receipt} title="Belum ada pembayaran" description="Transaksi simulasi akan tercatat di sini." />
            ) : (
              <ul>{transactions.map((item) => (
                <li key={item.id} className="grid min-w-0 gap-2 border-b border-line py-3.5 last:border-b-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="break-words font-semibold">{item.commodityName}</p>
                    <p className="font-semibold tabular-nums">{rupiah(item.amountIdr)}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 break-words text-[13px] leading-5 text-ink-muted">
                      {item.buyerName} ke {item.vendorName} · {item.releasedAt ? "Dicairkan " + dateLabel(item.releasedAt) : "Dibuat " + dateLabel(item.createdAt)}
                    </p>
                    <StatusPill label={item.status === "released" ? "Dana disalurkan" : item.status === "refunded" ? "Dikembalikan" : "Dana ditahan"} tone={item.status === "released" ? "success" : item.status === "refunded" ? "danger" : "info"} />
                  </div>
                </li>
              ))}</ul>
            )}
          </MarketSection>
        </div>
      </div>

      {dlhModalOpen && (
        <MarketDialog title="Hasil simulasi metabolisme 24 jam" onClose={() => setDlhModalOpen(false)}>
          <div className="grid gap-5" aria-busy={dlhLoading}>
            <p className="rounded-xl bg-canvas p-3 text-sm leading-6 text-ink-muted">Uji skenario model, bukan data langsung pasar atau sertifikasi kepatuhan DLH. Ambang 90% adalah pembanding yang digunakan simulator.</p>
            {dlhLoading && <p role="status" className="py-5 text-center text-sm font-medium">Menjalankan skenario 24 jam dan menyusun hasil tiap fase…</p>}
            {dlhError && (
              <div className="rounded-xl border border-danger/30 bg-danger-soft p-4">
                <p role="alert" className="text-sm leading-6 text-danger">{dlhError}</p>
                <button type="button" className={marketSecondary + " mt-3"} onClick={openDlhReport}>Coba muat laporan lagi</button>
              </div>
            )}
            {dlhReport && (
              <>
                <div className="rounded-xl border border-line bg-brand-soft p-4">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 shrink-0 text-brand-ink" size={20} aria-hidden />
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-ink">{dlhReport.meetsDlhThreshold ? "Model mencapai ambang pengalihan 90%" : "Model belum mencapai ambang pengalihan 90%"}</p>
                      <p className="mt-2 font-serif text-3xl tabular-nums text-brand-ink">{dlhReport.wasteDiversionEfficiencyPct.toLocaleString("id-ID")}%</p>
                      <p className="mt-1 text-xs leading-5 text-ink-muted">Rasio biomassa terselamatkan terhadap proyeksi surplus dalam skenario.</p>
                    </div>
                  </div>
                </div>

                <dl className="grid gap-4 border-y border-line py-4 sm:grid-cols-2">
                  {[
                    { label: "Pasokan skenario", value: kg(dlhReport.totalMarketIntakeKg) },
                    { label: "Proyeksi surplus", value: kg(dlhReport.totalProjectedSurplusKg) },
                    { label: "Biomassa terselamatkan", value: kg(dlhReport.totalRescuedKg) },
                    { label: "Estimasi CO₂e terhindar", value: kg(dlhReport.environmentalImpact.carbonOffsetCo2eKg) },
                  ].map((metric) => (
                    <div key={metric.label} className="min-w-0">
                      <dt className="text-xs leading-5 text-ink-muted">{metric.label}</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums">{metric.value}</dd>
                    </div>
                  ))}
                </dl>

                <section>
                  <h3 className="font-semibold">Pemeriksaan aturan dalam skenario</h3>
                  <ul className="mt-3 grid gap-3 text-sm">
                    {[
                      { label: "Pangan layak makan tidak dialihkan ke pakan", passed: dlhReport.invariantsAudit.invariant1ZeroEdibleToFeed },
                      { label: "Urutan harga dan batas bawah harga", passed: dlhReport.invariantsAudit.invariant2StrictPriceOrdering },
                      { label: "Jendela reservasi dapur sosial 30 menit", passed: dlhReport.invariantsAudit.invariant3ThirtyMinuteWindow },
                    ].map((audit) => (
                      <li key={audit.label} className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                        <span className="min-w-0 flex-1">{audit.label}</span>
                        <StatusPill label={audit.passed ? "Lulus uji" : "Tidak lulus"} tone={audit.passed ? "success" : "danger"} />
                      </li>
                    ))}
                  </ul>
                  <LotFacts items={[
                    { label: "Escrow diproses dalam model", value: rupiah(dlhReport.financialSettlement.totalEscrowProcessedIdr) },
                    { label: "Saldo pedagang dikreditkan", value: rupiah(dlhReport.financialSettlement.totalVendorWalletCreditedIdr) },
                    { label: "Sengketa skenario", value: String(dlhReport.financialSettlement.disputesCount) },
                  ]} />
                </section>

                <section>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">Catatan fase simulasi</h3>
                    <StatusPill label={dlhReport.allPhasesCompleted ? `${dlhReport.phasesCount} fase selesai` : "Fase belum lengkap"} tone={dlhReport.allPhasesCompleted ? "success" : "warning"} />
                  </div>
                  {dlhReport.phaseLogs.length === 0 ? (
                    <p className="mt-3 text-sm text-ink-muted">Simulator tidak mengembalikan catatan fase untuk percobaan ini.</p>
                  ) : (
                    <ol className="mt-3 grid gap-4">
                      {dlhReport.phaseLogs.map((phase, index) => (
                        <li key={`${phase.phase}-${index}`} className="min-w-0 border-b border-line pb-4 last:border-b-0">
                          <p className="text-xs font-semibold tabular-nums text-brand-ink">{phase.timeClock}</p>
                          <h4 className="mt-1 text-sm font-semibold">{phase.phase}</h4>
                          <p className="mt-1 text-sm leading-6 text-ink-muted">{phase.actionSummary}</p>
                          <p className="mt-2 text-xs tabular-nums text-ink-muted">{phase.temperatureC}°C · Kelembapan {phase.humidityPercent}% · {phase.status === "COMPLETED" ? "Selesai" : phase.status === "ACTIVE" ? "Aktif" : "Menunggu"}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
                <p className="break-words border-t border-line pt-3 text-xs leading-5 text-ink-muted">Percobaan {dlhReport.trialId} · Dijalankan {dateLabel(dlhReport.executedAt)}</p>
              </>
            )}
            <button type="button" className={marketSecondary + " w-full justify-center"} onClick={() => setDlhModalOpen(false)}>Tutup laporan</button>
          </div>
        </MarketDialog>
      )}
    </div>
  );
}
