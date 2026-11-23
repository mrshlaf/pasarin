// Dasbor pengawas operasional: penawaran, buku besar pembayaran, evaluasi stok,
// dan laporan uji skenario metabolisme pasar yang terpisah dari data operasional.

"use client";

// Impor: state React, ikon, klien API, konteks sesi dan pasar, tipe laporan simulasi, serta komponen bersama.
import { useState } from "react";
import { Boxes, Clock, FileCheck, Receipt, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { apiFetch } from "@/lib/apiFetch";
import { useMarketSimulation } from "@/lib/simulationStore";
import type { MetabolismTrialReport } from "@/lib/marketMetabolismSimulator";
import { MarketDialog } from "@/components/common/MarketDialog";
import { DecayExplainer } from "@/components/common/DecayExplainer";
import { isDonation, isFreeMaggotOffer, isReadyForDelivery } from "@/types/market";
import {
  EmptyState, LedgerRow, LotFacts, MarketMetrics, MarketSection, StatusPill, TierChip,
  commodityName, dateLabel, formatRemainingShelfLife, kg, kioskLabel, marketButton, marketSecondary, orderStatus, rupiah,
} from "@/components/common/MarketWorkspace";

// Respons /api/simulation/metabolism-trial; `data` hanya ada saat simulasi berhasil.
type MetabolismTrialResponse = {
  success: boolean;
  data?: MetabolismTrialReport;
  error?: string;
};

// Komponen antarmuka pengawas yang menampilkan inventaris langsung, buku besar transaksi, dan audit trail operasional.
export function OversightDashboard() {
  // Akun yang masuk; dipakai untuk membatasi tombol evaluasi stok hanya untuk admin.
  const { user } = useAuth();
  const { offers, stockItems, stockHealth, estimatedUnsoldKg, transactions, busy, triggerCronSweepNow } = useMarketSimulation();
  // State dialog laporan simulasi 24 jam: galat, status buka, status memuat, dan hasil laporan.
  const [dlhError, setDlhError] = useState("");
  // Hasil sapuan manual terakhir untuk ditampilkan di bawah tombol.
  const [sweepResult, setSweepResult] = useState<{ success: boolean; message: string } | null>(null);
  // Daftar penawaran dipotong 12 baris sampai pengguna menekan Tampilkan semua.
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [dlhModalOpen, setDlhModalOpen] = useState(false);
  const [dlhLoading, setDlhLoading] = useState(false);
  const [dlhReport, setDlhReport] = useState<MetabolismTrialReport | null>(null);

  // Membuka dialog dan menjalankan ulang simulasi 24 jam di server; laporan lama dikosongkan dulu agar tidak tertukar.
  async function openDlhReport() {
    setDlhModalOpen(true);
    setDlhLoading(true);
    setDlhError("");
    setDlhReport(null);
    // Panggilan ke API dibungkus agar galat jaringan tampil sebagai pesan, bukan layar kosong.
    // Mengambil laporan simulasi 24 jam (hanya pengelola dan admin yang diizinkan server); galat ditampilkan sebagai pesan.
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

  // Memicu sapuan orkestrator (/api/orchestrator/run) tanpa menunggu jadwal cron; tombolnya hanya tampil untuk admin.
  async function runStockEvaluation() {
    setSweepResult(null);
    setSweepResult(await triggerCronSweepNow());
  }

  // Pesanan lunas yang siap diantar kurir.
  const ready = offers.filter(isReadyForDelivery);
  // Lot berisiko: masih bersisa dan skor susutnya sudah keluar dari zona "Segar" (>= 0,35).
  const risk = stockItems.filter((item) => item.remainingKg > 0 && (stockHealth[item.id]?.decayScore ?? 0) >= 0.35);
  // Pesanan yang sudah selesai diserahterimakan.
  const settled = offers.filter((offer) => offer.status === "settled");
  // Indeks stok per ID agar pencarian lot per penawaran tidak berulang.
  const stockById = new Map(stockItems.map((item) => [item.id, item]));
  // Penawaran aktif dihitung hanya bila lotnya sudah ditimbang pedagang; sisanya tampil sebagai "Perlu timbang".
  const activeOffers = offers.filter((offer) => offer.status === "active" && stockById.get(offer.stockId)?.verifiedAt).length;
  // Urutkan dari yang butuh tindakan (perlu timbang) ke yang sudah final (selesai, ditolak).
  const offerRank = { pending_vendor: 0, active: 1, claimed: 2, settled: 3, rejected: 4 } as const;
  const sortedOffers = [...offers].sort((a, b) => offerRank[a.status] - offerRank[b.status]);
  // Hanya 12 baris pertama kecuali pengguna membuka semuanya.
  const visibleOffers = showAllOffers ? sortedOffers : sortedOffers.slice(0, 12);

  return (
    <div className="grid min-w-0 gap-6">
      {/* Kartu pembuka: judul, tombol tindakan, dan hasil sapuan manual. */}
      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <h2 className="font-serif text-2xl leading-tight tracking-tight sm:text-3xl">Tinjau alur pasar</h2>
            <p className="mt-2 max-w-prose text-sm leading-6 text-ink-muted">Pantau penawaran yang perlu ditimbang, muatan siap antar, dan status pembayaran dari catatan pasar.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            {/* Evaluasi stok manual hanya untuk admin; manajer hanya memantau. */}
            {/* Tombol evaluasi stok hanya untuk admin; pengelola hanya memantau. */}
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
        {/* Pesan hasil sapuan: hijau bila berhasil, merah bila gagal. */}
        {sweepResult && (
          <p role={sweepResult.success ? "status" : "alert"} className={`mt-4 rounded-xl p-3 text-sm leading-6 ${sweepResult.success ? "bg-brand-soft text-brand-ink" : "bg-danger-soft text-danger"}`}>
            {sweepResult.message}
          </p>
        )}
        <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-ink-muted">Laporan 24 jam menjalankan skenario model terpisah. Hasilnya bukan audit kepatuhan DLH atau bukti pengalihan limbah operasional hari ini.</p>
      </section>

      {/* Empat angka ringkas: kios bersetok, lot berisiko, siap diantar, selesai. */}
      <MarketMetrics items={[
        { label: "Kios dengan stok tercatat", value: new Set(stockItems.map((item) => item.vendorId)).size },
        { label: "Lot berisiko menurut model", value: risk.length, tone: risk.length > 0 ? "warning" : "brand" },
        { label: "Siap diantar", value: ready.length },
        { label: "Serah terima selesai", value: settled.length },
      ]} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:items-start">
        <div className="col-start-1 row-start-1 grid min-w-0 gap-4">
          {/* Daftar penawaran dari semua kios, urut dari yang butuh tindakan. */}
          <MarketSection title="Pantauan Penawaran Pasar"
            description="Yuk pantau aliran penawaran surplus dari kios pedagang menuju mitra warteg, dapur sosial, dan sentra maggot!"
            action={<span className="text-sm font-semibold tabular-nums text-ink-muted">{activeOffers} aktif · {stockItems.length} lot</span>}>
            {offers.length === 0 ? (
              <EmptyState icon={Boxes} title="Belum ada penawaran aktif" description="Penawaran baru dari kios pedagang akan segera muncul di sini." />
            ) : (
              <ul>{visibleOffers.map((offer) => {
                // Penawaran perlu timbang bila menunggu vendor atau lotnya belum ditimbang.
                // Penawaran dianggap menunggu bila masih diusulkan, atau aktif tetapi stoknya belum ditimbang pedagang.
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
                      {/* Estimasi mutu dan sisa simpan dari model peluruhan. */}
                      {stockHealth[offer.stockId] && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted">
                          <Clock size={12} aria-hidden className="text-brand shrink-0" />
                          <span>Estimasi mutu: {stockHealth[offer.stockId]?.tierLabel || stockHealth[offer.stockId]?.condition} · Estimasi sisa simpan: <strong className="font-semibold text-ink">{formatRemainingShelfLife(stockHealth[offer.stockId]?.hoursRemaining ?? 0, stockHealth[offer.stockId]?.decayScore)}</strong></span>
                        </p>
                      )}
                      {/* Penjelasan skor susut lot ini untuk pengawas. */}
                      {/* Penjelasan skor untuk lot penawaran bila lot itu punya evaluasi mutu. */}
                      {stockHealth[offer.stockId] && <DecayExplainer stockId={offer.stockId} />}
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
          {/* Buku besar pembayaran per transaksi. */}
          {/* Buku besar transaksi: status dana per transaksi (ditahan, dicairkan, dikembalikan). */}
          <MarketSection title="Buku Besar Transaksi & Escrow" description="Pantau status dana per transaksi, pengamanan dana di rekening penampung (escrow), hingga pencairan ke pedagang.">
            {transactions.length === 0 ? (
              <EmptyState icon={Receipt} title="Belum ada pembayaran" description="Transaksi simulasi akan tercatat di sini." />
            ) : (
              <ul>{transactions.map((item) => (
                <LedgerRow key={item.id} title={item.commodityName} amount={rupiah(item.amountIdr)}
                detail={<>{item.buyerName} ke {item.vendorName} · {item.releasedAt ? "Dicairkan " + dateLabel(item.releasedAt) : "Dibuat " + dateLabel(item.createdAt)}</>}
                status={<StatusPill label={item.status === "released" ? "Dana disalurkan" : item.status === "refunded" ? "Dikembalikan" : "Dana ditahan"} tone={item.status === "released" ? "success" : item.status === "refunded" ? "danger" : "info"} />} />
              ))}</ul>
            )}
          </MarketSection>
        </div>
      </div>

      {/* Dialog hasil simulasi 24 jam; isinya uji model, bukan data pasar sungguhan. */}
      {dlhModalOpen && (
        <MarketDialog title="Hasil simulasi metabolisme 24 jam" onClose={() => setDlhModalOpen(false)}>
          <div className="grid gap-5" aria-busy={dlhLoading}>
            <p className="rounded-xl bg-canvas p-3 text-sm leading-6 text-ink-muted">Uji skenario model, bukan data langsung pasar atau sertifikasi kepatuhan DLH. Ambang 90% adalah pembanding yang digunakan simulator.</p>
            {/* Indikator saat simulasi berjalan. */}
            {dlhLoading && <p role="status" className="py-5 text-center text-sm font-medium">Menjalankan skenario 24 jam dan menyusun hasil tiap fase…</p>}
            {/* Pesan galat disertai tombol coba lagi. */}
            {dlhError && (
              <div className="rounded-xl border border-danger/30 bg-danger-soft p-4">
                <p role="alert" className="text-sm leading-6 text-danger">{dlhError}</p>
                <button type="button" className={marketSecondary + " mt-3"} onClick={openDlhReport}>Coba muat laporan lagi</button>
              </div>
            )}
            {/* Laporan: angka pengalihan, ringkasan, pemeriksaan aturan, lalu catatan tiap fase. */}
            {/* Laporan simulasi 24 jam: hasil uji skenario model, bukan data langsung pasar. */}
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

                {/* Ringkasan angka skenario. */}
                <dl className="grid gap-4 border-y border-line py-4 sm:grid-cols-2">
                  {/* Angka kunci skenario: pasokan, surplus, dan seterusnya, ditampilkan sebagai daftar definisi. */}
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
                  {/* Hasil uji tiga aturan (invarian) dalam skenario beserta ringkasan escrow. */}
                  {/* Pemeriksaan aturan dalam skenario, misalnya gerbang mutu dan jendela prioritas. */}
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
                    {/* Catatan tiap fase simulasi sepanjang 24 jam. */}
                    {/* Catatan tiap fase simulasi beserta status selesai. */}
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
