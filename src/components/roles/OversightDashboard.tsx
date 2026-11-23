// Dasbor pengawas operasional: ringkasan penjualan harian, penawaran, buku besar pembayaran, dan evaluasi stok.

"use client";

// Impor: state React, ikon, konteks sesi dan pasar, serta komponen bersama.
import { useState } from "react";
import { Boxes, CalendarDays, Clock, FileBarChart, Receipt, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useMarketSimulation } from "@/lib/simulationStore";
import { MarketDialog } from "@/components/common/MarketDialog";
import { DecayExplainer } from "@/components/common/DecayExplainer";
import { isDonation, isFreeMaggotOffer, isReadyForDelivery } from "@/types/market";
import {
  EmptyState, LedgerRow, LotFacts, MarketMetrics, MarketSection, StatusPill, TierChip,
  commodityName, dateLabel, formatRemainingShelfLife, kg, kioskLabel, marketButton, marketSecondary, orderStatus, rupiah,
} from "@/components/common/MarketWorkspace";

// Komponen antarmuka pengawas yang menampilkan inventaris langsung, buku besar transaksi, dan audit trail operasional.
export function OversightDashboard() {
  // Akun yang masuk; dipakai untuk membatasi tombol evaluasi stok hanya untuk admin.
  const { user } = useAuth();
  const { offers, stockItems, stockHealth, estimatedUnsoldKg, transactions, busy, triggerCronSweepNow } = useMarketSimulation();
  // Dialog laporan penjualan: dibuka lewat tombol Laporan penjualan.
  const [reportOpen, setReportOpen] = useState(false);
  // Hasil sapuan manual terakhir untuk ditampilkan di bawah tombol.
  const [sweepResult, setSweepResult] = useState<{ success: boolean; message: string } | null>(null);
  // Daftar penawaran dipotong 12 baris sampai pengguna menekan Tampilkan semua.
  const [showAllOffers, setShowAllOffers] = useState(false);

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

  // Laporan harian: pesanan selesai dikelompokkan per hari kalender Jakarta dari tanggal serah terimanya.
  // Penjualan hanya menghitung lot berbayar; donasi dan lot maggot gratis dihitung sebagai berat saja.
  const jakartaDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" });
  const todayKey = jakartaDay.format(new Date());
  const dailyMap = new Map<string, { orders: number; kg: number; salesIdr: number; freeKg: number }>();
  for (const offer of settled) {
    if (!offer.deliveredOn || Number.isNaN(Date.parse(offer.deliveredOn))) continue;
    const key = jakartaDay.format(Date.parse(offer.deliveredOn));
    const row = dailyMap.get(key) ?? { orders: 0, kg: 0, salesIdr: 0, freeKg: 0 };
    const free = isDonation(offer) || isFreeMaggotOffer(offer);
    row.orders += 1;
    row.kg += offer.quantityKg;
    if (free) row.freeKg += offer.quantityKg; else row.salesIdr += offer.totalAmountIdr;
    dailyMap.set(key, row);
  }
  // Rincian hari ini per komoditas (berat dan penjualan) dan per tujuan penyaluran (berat).
  const todayOrders = settled.filter((offer) => offer.deliveredOn && !Number.isNaN(Date.parse(offer.deliveredOn)) && jakartaDay.format(Date.parse(offer.deliveredOn)) === todayKey);
  const byCommodity = new Map<string, { kg: number; salesIdr: number }>();
  const byTier = { tier_1: 0, tier_2: 0, tier_3: 0 };
  for (const offer of todayOrders) {
    const row = byCommodity.get(offer.commodityId) ?? { kg: 0, salesIdr: 0 };
    row.kg += offer.quantityKg;
    if (!(isDonation(offer) || isFreeMaggotOffer(offer))) row.salesIdr += offer.totalAmountIdr;
    byCommodity.set(offer.commodityId, row);
    byTier[offer.targetTier] += offer.quantityKg;
  }
  const topCommodities = [...byCommodity.entries()].sort((a, b) => b[1].kg - a[1].kg).slice(0, 5);
  // Dana yang sudah dibayar pembeli tetapi masih ditahan sampai serah terima.
  const heldIdr = transactions.filter((item) => item.status === "held_in_escrow").reduce((sum, item) => sum + item.amountIdr, 0);
  // Tujuh hari terbaru, hari terbaru di atas.
  const dailyRows = [...dailyMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
  const today = dailyMap.get(todayKey) ?? { orders: 0, kg: 0, salesIdr: 0, freeKg: 0 };
  const dayLabel = (key: string) => new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta" }).format(new Date(key + "T12:00:00+07:00"));

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
            <button className={marketSecondary + " justify-center"} type="button" onClick={() => setReportOpen(true)}>
              <FileBarChart size={16} aria-hidden /> Laporan penjualan
            </button>
          </div>
        </div>
        {/* Pesan hasil sapuan: hijau bila berhasil, merah bila gagal. */}
        {sweepResult && (
          <p role={sweepResult.success ? "status" : "alert"} className={`mt-4 rounded-xl p-3 text-sm leading-6 ${sweepResult.success ? "bg-brand-soft text-brand-ink" : "bg-danger-soft text-danger"}`}>
            {sweepResult.message}
          </p>
        )}
        <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-ink-muted">Penjualan harian dihitung dari pesanan yang sudah diserahterimakan. Donasi dan lot gratis dicatat sebagai berat, bukan rupiah.</p>
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


      {/* Dialog laporan penjualan: ringkasan hari ini, rincian, dan riwayat harian dari pesanan yang sudah diserahterimakan. */}
      {reportOpen && (
        <MarketDialog title="Laporan penjualan hari ini" onClose={() => setReportOpen(false)}>
          <div className="grid gap-5">
            <p className="rounded-xl bg-canvas p-3 text-sm leading-6 text-ink-muted">Dihitung dari pesanan yang diserahterimakan hari ini (zona waktu Jakarta). Donasi dan lot gratis dicatat sebagai berat, bukan rupiah. Dana ditahan menunggu serah terima.</p>
            {/* Angka kunci hari ini. */}
            <MarketMetrics items={[
              { label: "Penjualan hari ini", value: rupiah(today.salesIdr), tone: today.salesIdr > 0 ? "brand" : undefined },
              { label: "Pesanan selesai", value: today.orders },
              { label: "Berat tersalur", value: kg(today.kg) },
              { label: "Dana masih ditahan", value: rupiah(heldIdr) },
            ]} />
            {todayOrders.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Belum ada penjualan hari ini" description="Angka muncul setelah ada pesanan yang diserahterimakan hari ini." />
            ) : (
              <>
                {/* Lima komoditas dengan berat terbanyak hari ini. */}
                <section>
                  <h3 className="font-semibold">Komoditas teratas</h3>
                  <ul>{topCommodities.map(([id, row]) => (
                    <LedgerRow key={id} title={commodityName(id)} amount={rupiah(row.salesIdr)} detail={kg(row.kg)} status={<StatusPill label="Terjual" tone="success" />} />
                  ))}</ul>
                </section>
                {/* Berat yang disalurkan ke tiap tujuan. */}
                <section>
                  <h3 className="font-semibold">Penyaluran per tujuan</h3>
                  <LotFacts items={[
                    { label: "Warteg dan UMKM", value: kg(byTier.tier_1) },
                    { label: "Dapur sosial dan panti", value: kg(byTier.tier_2) },
                    { label: "Sentra maggot", value: kg(byTier.tier_3) },
                  ]} />
                </section>
              </>
            )}
            {/* Penjualan beberapa hari terakhir sebagai pembanding. */}
            {dailyRows.length > 0 && (
              <section>
                <h3 className="font-semibold">Riwayat penjualan harian</h3>
                <ul>{dailyRows.map(([key, row]) => (
                  <LedgerRow key={key} title={dayLabel(key) + (key === todayKey ? " (hari ini)" : "")} amount={rupiah(row.salesIdr)}
                    detail={<>{row.orders} pesanan · {kg(row.kg)}{row.freeKg > 0 ? " · " + kg(row.freeKg) + " donasi atau gratis" : ""}</>}
                    status={<StatusPill label="Penjualan" tone="success" />} />
                ))}</ul>
              </section>
            )}
            <button type="button" className={marketSecondary + " w-full justify-center"} onClick={() => setReportOpen(false)}>Tutup laporan</button>
          </div>
        </MarketDialog>
      )}
    </div>
  );
}
