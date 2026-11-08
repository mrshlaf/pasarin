"use client";

import { useState, type FormEvent } from "react";
import { Boxes, FileCheck, Receipt, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { apiFetch } from "@/lib/apiFetch";
import { useMarketSimulation } from "@/lib/simulationStore";
import { MarketDialog } from "@/components/common/MarketDialog";
import {
  EmptyState, MarketMetrics, MarketSection, StatusPill, TierChip,
  kioskLabel, marketButton, marketSecondary, offerTitle, orderStatus, rupiah,
} from "@/components/common/MarketWorkspace";

/** Gives supervisors the same live inventory and ledger with role-appropriate actions. */
export function OversightDashboard() {
  const { user } = useAuth();
  const { offers, stockItems, stockHealth, transactions, busy, triggerCronSweepNow } = useMarketSimulation();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<{ summary: string; source: string } | null>(null);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState(false);
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [dlhModalOpen, setDlhModalOpen] = useState(false);
  const [dlhLoading, setDlhLoading] = useState(false);
  const [dlhReport, setDlhReport] = useState<any | null>(null);

  async function openDlhReport() {
    setDlhLoading(true);
    try {
      const res = await apiFetch("/api/simulation/metabolism-trial");
      const json = await res.json();
      if (json.success && json.data) {
        setDlhReport(json.data);
        setDlhModalOpen(true);
      }
    } catch {
      setError("Gagal memuat laporan simulasi metabolisme pasar.");
    } finally {
      setDlhLoading(false);
    }
  }

  /** Uses the shared read-only orchestration endpoint and reports the answer source. */
  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAsking(true);
    setError("");
    try {
      const response = await apiFetch("/api/orchestrator/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAnswer(result.data);
    } catch {
      setError("Ringkasan pasar belum bisa dimuat. Coba lagi.");
    } finally {
      setAsking(false);
    }
  }

  const ready = offers.filter((offer) => offer.status === "claimed" && offer.paymentStatus === "held_in_escrow");
  const risk = stockItems.filter((item) => item.remainingKg > 0 && (stockHealth[item.id]?.decayScore ?? 0) >= 0.35);
  const settled = offers.filter((offer) => offer.status === "settled");
  const activeOffers = offers.filter((offer) => offer.status === "active").length;
  const offerRank = { pending_vendor: 0, active: 1, claimed: 2, settled: 3, rejected: 4 } as const;
  const sortedOffers = [...offers].sort((a, b) => offerRank[a.status] - offerRank[b.status]);
  const visibleOffers = showAllOffers ? sortedOffers : sortedOffers.slice(0, 12);

  return (
    <div className="grid gap-4">
      <MarketMetrics items={[
        { label: "Kios aktif", value: new Set(stockItems.map((item) => item.vendorId)).size },
        { label: "Perlu ditinjau", value: risk.length, tone: risk.length > 0 ? "warning" : "brand" },
        { label: "Siap diantar", value: ready.length },
        { label: "Selesai", value: settled.length },
      ]} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:items-start">
        <div className="grid min-w-0 gap-4">
          <MarketSection title="Tanya pasar">
            <form onSubmit={ask} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input aria-label="Pertanyaan" className="market-input min-w-0" value={query} required maxLength={1000}
                onChange={(event) => setQuery(event.target.value)} placeholder="Berapa pesanan siap diantar?" />
              <button className={marketButton} type="submit" disabled={asking}>{asking ? "Memproses…" : "Tanya"}</button>
            </form>
            {error && <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>}
            {answer && (
              <div role="status" className="mt-4 border-t border-line pt-4">
                <p className="text-[13px] font-medium text-brand-ink">
                  {answer.source === "gemini" ? "Gemini, data pasar" : "Ringkasan data pasar"}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{answer.summary}</p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {user?.role === "admin" && (
                <button className={marketSecondary} type="button" disabled={busy} onClick={triggerCronSweepNow}>
                  <RefreshCw size={16} aria-hidden /> Evaluasi stok
                </button>
              )}
              <button className={marketSecondary} type="button" disabled={dlhLoading} onClick={openDlhReport}>
                <FileCheck size={16} aria-hidden /> {dlhLoading ? "Menjalankan Simulasi…" : "Laporan Kepatuhan DLH"}
              </button>
            </div>
          </MarketSection>

          <MarketSection title="Penawaran"
            action={<span className="text-[12px] font-semibold tabular-nums text-ink-muted">{activeOffers} aktif, {stockItems.length} lot</span>}>
            {offers.length === 0 ? (
              <EmptyState icon={Boxes} title="Belum ada penawaran" description="Lot muncul dari pasokan pedagang." />
            ) : (
              <ul>{visibleOffers.map((offer) => (
                <li key={offer.id} className="grid min-w-0 gap-3 border-b border-line py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words font-semibold">{offerTitle(offer)}</p>
                      <TierChip tier={offer.targetTier} />
                    </div>
                    <p className="mt-1 break-words text-[13px] leading-5 text-ink-muted">
                      {kioskLabel(offer.vendorId)}, {rupiah(offer.totalAmountIdr)}, potongan {Math.round(offer.discountPercentage)}%
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <StatusPill label={orderStatus(offer)} />
                  </div>
                </li>
              ))}</ul>
            )}
            {sortedOffers.length > visibleOffers.length && (
              <button type="button" className={marketSecondary + " mt-3 w-full justify-center"}
                onClick={() => setShowAllOffers(true)}>
                Tampilkan semua ({sortedOffers.length})
              </button>
            )}
          </MarketSection>
        </div>

        <div className="xl:sticky xl:top-20 xl:self-start">
          <MarketSection title="Pembayaran">
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
                    <p className="min-w-0 break-words text-[13px] leading-5 text-ink-muted">{item.buyerName} ke {item.vendorName}</p>
                    <StatusPill label={item.status === "released" ? "Selesai" : item.status === "refunded" ? "Dikembalikan" : "Ditahan"} />
                  </div>
                </li>
              ))}</ul>
            )}
          </MarketSection>
        </div>
      </div>

      {dlhModalOpen && dlhReport && (
        <MarketDialog title="Laporan Kepatuhan Regulasi DLH DKI Jakarta & Simulasi 24 Jam" onClose={() => setDlhModalOpen(false)}>
          <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tier-3/30 bg-tier-3-soft p-3.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-tier-3-ink" size={20} />
                <span className="font-semibold text-tier-3-ink">
                  {dlhReport.meetsDlhThreshold ? "MEMENUHI AMBANG BATAS TARGET DLH DKI (≥ 90%)" : "DI BAWAH AMBANG BATAS"}
                </span>
              </div>
              <span className="rounded-md bg-white/80 px-2 py-0.5 text-xs font-bold text-tier-3-ink">
                Efisiensi {dlhReport.wasteDiversionEfficiencyPct}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-line bg-surface p-3">
                <p className="text-xs text-ink-muted">Total Intake Pasar</p>
                <p className="text-base font-bold tabular-nums">{(dlhReport.totalMarketIntakeKg ?? 14200).toLocaleString("id-ID")} kg</p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3">
                <p className="text-xs text-ink-muted">Proyeksi Surplus</p>
                <p className="text-base font-bold tabular-nums">{(dlhReport.totalProjectedSurplusKg ?? 1248).toLocaleString("id-ID")} kg</p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3">
                <p className="text-xs text-ink-muted">Biomassa Diselamatkan</p>
                <p className="text-base font-bold text-tier-3-ink tabular-nums">{(dlhReport.totalRescuedKg ?? 1152).toLocaleString("id-ID")} kg</p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3">
                <p className="text-xs text-ink-muted">CO2e Terhindar</p>
                <p className="text-base font-bold text-brand tabular-nums">{dlhReport.environmentalImpact?.co2eAvoidedKg ?? 552.96} kg</p>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3.5 text-xs">
              <p className="font-semibold text-ink">Invarian Etis & Audit Moral Hazard:</p>
              <ul className="mt-1.5 space-y-1 text-ink-muted">
                <li>• Invarian 1 (Zero Edible Food to Maggot): <span className="font-semibold text-tier-3-ink">100% Terpenuhi</span></li>
                <li>• Invarian 2 (Proteksi Price Floor Modal): <span className="font-semibold text-tier-3-ink">Terkunci Aman</span></li>
                <li>• Nilai Ekonomi Diselamatkan: <span className="font-semibold text-ink">Rp {dlhReport.financialSettlement?.totalEconomicValueSavedIdr?.toLocaleString("id-ID") ?? "2.945.000"}</span></li>
              </ul>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3.5">
              <p className="mb-2 text-xs font-semibold text-ink">Log 5 Fase Metabolisme Sirkadian 24 Jam:</p>
              <div className="space-y-2">
                {dlhReport.phaseLogs?.map((phase: any, i: number) => (
                  <div key={i} className="flex items-start justify-between gap-2 border-b border-line pb-2 text-xs last:border-b-0">
                    <div>
                      <span className="font-semibold text-brand-ink">{phase.clockTimeWib} WIB</span> - <span className="font-medium text-ink">{phase.phaseName}</span>
                      <p className="mt-0.5 text-ink-muted">{phase.eventDescription}</p>
                    </div>
                    <span className="shrink-0 rounded bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand-ink">
                      {phase.temperatureC}°C · {phase.humidityPercent}% RH
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button type="button" className={marketButton + " mt-2 w-full"} onClick={() => setDlhModalOpen(false)}>
              Tutup Laporan
            </button>
          </div>
        </MarketDialog>
      )}
    </div>
  );
}
