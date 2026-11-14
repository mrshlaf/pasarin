/**
 * Dasbor Ruang Kerja Mitra Pembeli Sirkular 3-Tier (PSR-22).
 * Melayani 3 kelompok mitra dengan karakteristik operasional terpisah:
 * - Warteg & Kuliner UMKM (Tier 1): Pembelian komersial pangan terjangkau.
 * - Dapur Sosial & Panti Asuhan (Tier 2): Klaim donasi pangan bergizi gratis / tebusan nominal.
 * - Fasilitas Budidaya Maggot BSF (Tier 3): Penerimaan biomassa organik afkir untuk biokonversi pakan.
 */

"use client";

import { useState, type FormEvent } from "react";
import { Clock, HeartHandshake, PackageCheck, Receipt, Recycle, UtensilsCrossed } from "lucide-react";
import { isDonation, isFreeMaggotOffer, type RescueOffer } from "@/types/market";
import type { BuyerRole } from "@/lib/serverSimulationState";
import { useAuth } from "@/lib/authContext";
import { useMarketSimulation } from "@/lib/simulationStore";
import { MarketDialog } from "@/components/common/MarketDialog";
import {
  DecayMeter, EmptyState, LotFacts, MarketMetrics, MarketSection, StatusPill,
  commodityName, dateLabel, formatElapsedHours, formatRemainingShelfLife, kg, kioskLabel, marketButton, marketSecondary, offerTitle, orderStatus, rupiah,
} from "@/components/common/MarketWorkspace";

const tier = { warteg: "tier_1", social_kitchen: "tier_2", maggot: "tier_3" } as const;

const framing = {
  warteg: {
    title: "Pasokan hari ini",
    line: "Pilih bahan layak masak, tentukan jumlah, lalu bayar melalui simulasi QRIS.",
    icon: UtensilsCrossed,
    impactLabel: "Total nilai pesanan",
    impactNote: "Termasuk pesanan berjalan dan selesai.",
    catalogDescription: "Bandingkan harga per kilogram dan sisa simpan untuk kebutuhan masak.",
  },
  social_kitchen: {
    title: "Bahan untuk dapur sosial",
    line: "Pilih donasi atau bahan berbayar sesuai kebutuhan dapur sosial.",
    icon: HeartHandshake,
    impactLabel: "Perkiraan porsi dari pesanan",
    impactNote: "Estimasi 4 porsi per kg, termasuk pesanan berjalan.",
    catalogDescription: "Donasi dapat diklaim tanpa pembayaran. Lot jual dilanjutkan ke simulasi QRIS.",
  },
  maggot: {
    title: "Bahan baku biomassa",
    line: "Klaim biomassa afkir gratis untuk biokonversi BSF, bukan untuk konsumsi pangan.",
    icon: Recycle,
    impactLabel: "Perkiraan larva dari pesanan",
    impactNote: "Estimasi 1 kg larva per 5 kg biomassa pesanan.",
    catalogDescription: "Lot tier 3 merupakan biomassa non-pangan. Tentukan berat yang dapat diterima fasilitas.",
  },
} as const;

/**
 * Komponen antarmuka dasbor pembeli yang membagikan katalog penawaran, riwayat pesanan, dan status pengantaran.
 */
export function BuyerDashboard({ role }: { role: BuyerRole }) {
  const { user } = useAuth();
  const { offers, stockItems, stockHealth, transactions, weather, busy, claimOfferByBuyer, payQrisForOffer } = useMarketSimulation();
  const canBuy = user?.role === role;
  const listings = offers.filter((offer) => offer.targetTier === tier[role] && offer.status === "active");
  const orders = offers.filter((offer) => offer.targetTier === tier[role] &&
    (!canBuy || offer.isMine) && (offer.status === "claimed" || offer.status === "settled"));
  const [invoice, setInvoice] = useState<RescueOffer | null>(null);
  const [selection, setSelection] = useState<{ offer: RescueOffer; requestId: string } | null>(null);
  const [requestedKg, setRequestedKg] = useState("");
  const [error, setError] = useState("");
  const [showAllListings, setShowAllListings] = useState(false);
  const [sort, setSort] = useState("recent");
  const [modeFilter, setModeFilter] = useState("all");
  const [catalogQuery, setCatalogQuery] = useState("");
  const copy = framing[role];
  const RoleIcon = copy.icon;
  const orderedKg = orders.reduce((sum, offer) => sum + offer.quantityKg, 0);
  const spend = orders.reduce((sum, offer) => sum + offer.totalAmountIdr, 0);
  const impact = role === "social_kitchen"
    ? Math.round(orderedKg * 4)
    : role === "maggot"
      ? kg(orderedKg / 5)
      : rupiah(spend);
  const unpaidOrders = orders.filter((offer) => offer.paymentStatus === "unpaid");
  const availableKg = listings.reduce((sum, offer) => sum + offer.quantityKg, 0);
  const stockById = new Map(stockItems.map((item) => [item.id, item]));
  const catalogSearch = catalogQuery.trim().toLocaleLowerCase("id-ID");
  const filteredListings = listings.filter((offer) =>
    (modeFilter === "all" || isDonation(offer) === (modeFilter === "donation")) &&
    `${commodityName(offer.commodityId)} ${kioskLabel(offer.vendorId)} ${stockById.get(offer.stockId)?.lotNumber ?? ""}`
      .toLocaleLowerCase("id-ID").includes(catalogSearch));
  const sortedListings = sort === "freshness"
    ? [...filteredListings].sort((a, b) => (stockHealth[a.stockId]?.decayScore ?? Infinity) - (stockHealth[b.stockId]?.decayScore ?? Infinity))
    : sort === "price" ? [...filteredListings].sort((a, b) => a.salvagePricePerKg - b.salvagePricePerKg) : filteredListings;
  const visibleListings = showAllListings ? sortedListings : sortedListings.slice(0, 8);
  const selectedOffer = selection ? listings.find((offer) => offer.id === selection.offer.id) ?? selection.offer : null;
  const selectedStock = selectedOffer && stockById.get(selectedOffer.stockId);

  /**
   * Mereservasi kuantitas bobot yang dipilih dan membuka tiket tagihan pembayaran jika penawaran berbayar.
   */
  async function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection) return;
    const result = await claimOfferByBuyer(selection.offer.id, Number(requestedKg), selection.requestId);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setError("");
    setSelection(null);
    if (result.offer?.paymentStatus === "unpaid") setInvoice(result.offer);
  }

  /**
   * Memproses simulasi pembayaran QRIS rekening bersama (Escrow) dan mengalihkan pesanan ke antrean kurir.
   */
  async function pay() {
    if (!invoice) return;
    const result = await payQrisForOffer(invoice.id);
    if (result.success) setInvoice(null);
    else setError(result.message);
  }

  return (
    <div className="grid min-w-0 gap-6">
      <section className="market-panel grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.45fr)] lg:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-ink"><RoleIcon size={18} aria-hidden />{role === "warteg" ? "Tier 1 · Warteg & UMKM" : role === "social_kitchen" ? "Tier 2 · Dapur sosial" : "Tier 3 · Biokonversi BSF"}</div>
          <h2 className="font-serif text-2xl leading-tight tracking-tight sm:text-3xl">{copy.title}</h2>
          <p className="mt-2 max-w-prose text-sm leading-6 text-ink-muted">{copy.line}</p>
          <p className="mt-4 text-sm text-ink-soft"><strong className="font-semibold">{kg(availableKg)}</strong> tersedia dalam <strong className="font-semibold">{listings.length} lot</strong> pada jalur ini.</p>
        </div>
        <div className="min-w-0 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="text-[13px] text-ink-muted">{copy.impactLabel}</p>
          <p className="mt-2 break-words font-serif text-3xl leading-tight tabular-nums sm:text-4xl">{impact}</p>
          <p className="mt-2 text-xs leading-5 text-ink-muted">{copy.impactNote}</p>
        </div>
      </section>

      {unpaidOrders.length > 0 && <section className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-warning">{unpaidOrders.length} pesanan menunggu pembayaran</h2>
          <p className="mt-1 text-sm leading-5 text-ink-muted">Selesaikan simulasi QRIS agar pesanan dapat masuk antrean pengantaran.</p>
        </div>
        {canBuy && <button type="button" className={marketButton} disabled={busy} onClick={() => { setError(""); setInvoice(unpaidOrders[0]); }}>Bayar pesanan berikutnya</button>}
      </section>}

      <MarketMetrics items={[
        { label: "Lot tersedia", value: listings.length },
        { label: "Pesanan berjalan", value: orders.filter((offer) => offer.status === "claimed").length },
        { label: "Serah terima selesai", value: orders.filter((offer) => offer.status === "settled").length },
      ]} />

      <MarketSection variant="plain" title={role === "maggot" ? "Katalog biomassa" : "Katalog bahan"} description={copy.catalogDescription}
        action={listings.length > 1 && (
          <div className="flex w-full items-center gap-2 sm:block sm:w-48">
            <label htmlFor="catalog-sort" className="shrink-0 text-xs font-semibold text-ink-muted sm:mb-1 sm:block">Urutkan</label>
            <select id="catalog-sort" className="market-input" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="recent">Urutan katalog</option>
              <option value="freshness">Paling segar</option>
              <option value="price">Harga/kg terendah</option>
            </select>
          </div>
        )}>
        {error && !selection && !invoice && <p role="alert" className="mb-3 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm font-medium text-danger">{error}</p>}
        <div className={`mb-4 grid min-w-0 gap-3 ${role === "social_kitchen" ? "sm:grid-cols-[minmax(0,1fr)_minmax(11rem,0.5fr)]" : ""}`}>
          <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-ink-muted">Cari katalog
            <input type="search" className="market-input" placeholder="Komoditas, kios, atau kode lot" value={catalogQuery}
              onChange={(event) => { setCatalogQuery(event.target.value); setShowAllListings(false); }} />
          </label>
          {role === "social_kitchen" && <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-ink-muted">Jenis penawaran
            <select className="market-input" value={modeFilter} onChange={(event) => { setModeFilter(event.target.value); setShowAllListings(false); }}>
              <option value="all">Jual dan donasi</option>
              <option value="sale">Jual</option>
              <option value="donation">Donasi</option>
            </select>
          </label>}
        </div>
        <p className="mb-3 text-xs text-ink-muted" aria-live="polite">{filteredListings.length} dari {listings.length} lot sesuai pilihan</p>
        {weather && listings.length > 0 && (
          <p className="mb-3 text-[13px] leading-5 text-ink-muted">
            {weather.isEstimated ? "Perkiraan kondisi pasar" : "Kondisi pasar"} · {Math.round(weather.temperatureC)}°C · Kelembapan {Math.round(weather.humidityPercent)}%
          </p>
        )}
        {filteredListings.length === 0 ? (
          <EmptyState icon={PackageCheck} title={listings.length === 0 ? "Belum ada lot pada jalur ini" : "Tidak ada lot yang cocok"}
            description={listings.length === 0 ? "Lot akan tampil setelah pedagang menimbang sisa fisik dan menerbitkan penawaran untuk jalur ini." : "Ubah kata pencarian atau jenis penawaran untuk melihat lot lain."} />
        ) : (
          <ul className="grid gap-3">
            {visibleListings.map((offer) => {
              const health = stockHealth[offer.stockId];
              const stock = stockById.get(offer.stockId);
              return (
                <li key={offer.id} className="market-panel grid min-w-0 gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(11rem,0.4fr)]">
                  <div className="min-w-0">
                    <p className="market-eyebrow break-words">{kioskLabel(offer.vendorId)}{stock?.lotNumber ? " · " + stock.lotNumber : ""}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <h3 className="break-words font-serif text-2xl leading-tight tracking-tight">{commodityName(offer.commodityId)}</h3>
                      {isFreeMaggotOffer(offer) ? <StatusPill label="Gratis · Pakan Maggot" tone="success" /> : isDonation(offer) ? <StatusPill label="Donasi" tone="success" /> : (
                        <span className="rounded-md bg-brand px-2 py-1 text-[12px] font-semibold tabular-nums text-cream">
                          {role === "social_kitchen" ? "Jual · " : ""}−{Math.round(offer.discountPercentage)}%
                        </span>
                      )}
                    </div>
                    <LotFacts items={[
                      ...(stock ? [{ label: "Stok awal lot", value: kg(stock.initialKg) }] : []),
                      { label: role === "maggot" ? "Biomassa tersedia" : "Tersedia untuk diklaim", value: kg(offer.quantityKg) },
                    ]} />
                    {health ? (
                      <div className="mt-3 rounded-xl border border-line bg-canvas/80 px-3 py-3">
                        <DecayMeter score={health.decayScore} />
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2 text-[13px] leading-5 text-ink-muted">
                          <span>Dipajang <strong className="font-semibold text-ink">{formatElapsedHours(health.hoursElapsed)}</strong></span>
                          {health.decayScore < 0.85 ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock size={14} aria-hidden />
                              Sisa simpan <strong className="font-semibold text-ink">{formatRemainingShelfLife(health.hoursRemaining, health.decayScore)}</strong>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-medium text-danger">
                              <Clock size={14} aria-hidden />
                              Melewati batas simpan pangan (biomassa maggot)
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-ink-muted">Estimasi Arrhenius dari lama dipajang dan kondisi pasar, bukan hasil pemeriksaan fisik.</p>
                      </div>
                    ) : <p className="mt-3 text-sm text-ink-muted">Perkiraan mutu belum tersedia.</p>}
                  </div>

                  <div className="flex min-w-0 flex-wrap items-end justify-between gap-3 border-t border-line pt-4 min-[1100px]:flex-col min-[1100px]:items-stretch min-[1100px]:justify-center min-[1100px]:border-l min-[1100px]:border-t-0 min-[1100px]:pl-5 min-[1100px]:pt-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink-muted">{isDonation(offer) ? "Dari pedagang" : isFreeMaggotOffer(offer) ? "Alokasi biomassa" : "Harga per kilogram"}</p>
                      <p className="mt-1 text-xl font-semibold leading-tight tabular-nums">{isDonation(offer) || isFreeMaggotOffer(offer) ? "Gratis (Rp0)" : rupiah(offer.salvagePricePerKg) + "/kg"}</p>
                      {!isDonation(offer) && !isFreeMaggotOffer(offer) && <p className="mt-0.5 flex flex-wrap items-baseline gap-1.5 text-[12px] tabular-nums text-ink-muted">
                        {offer.originalPricePerKg > offer.salvagePricePerKg && (
                          <s>{rupiah(offer.originalPricePerKg)}/kg</s>
                        )}
                      </p>}
                    </div>
                    <div className="flex min-w-0 flex-wrap gap-2">
                      {canBuy && (
                        <button type="button" className={marketButton + " justify-center min-[1100px]:w-full"} disabled={busy} onClick={() => {
                          setError("");
                          setRequestedKg("");
                          setSelection({ offer, requestId: crypto.randomUUID() });
                        }}>
                          {isFreeMaggotOffer(offer) ? "Ambil gratis" : isDonation(offer) ? "Ambil donasi" : "Pilih jumlah"}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {filteredListings.length > visibleListings.length && (
          <button type="button" className={marketSecondary + " mt-3 w-full justify-center"}
            onClick={() => setShowAllListings(true)}>
            Tampilkan semua ({filteredListings.length})
          </button>
        )}
      </MarketSection>

      <MarketSection title="Pesanan & pengantaran" description="Pantau pembayaran, antrean pengantaran, dan serah terima setiap lot.">
        {orders.length === 0 ? (
          <EmptyState icon={PackageCheck} title="Belum ada pesanan" description={role === "maggot" ? "Pilih lot biomassa dan jumlah yang dapat diterima fasilitas dari katalog." : "Pilih lot dan tentukan jumlah dari katalog untuk membuat pesanan."} />
        ) : (
          <ul>{orders.map((offer) => (
            <li key={offer.id} className="grid min-w-0 gap-3 border-b border-line py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="break-words font-semibold">{offerTitle(offer)}</p>
                <p className="mt-1 break-words text-[13px] leading-5 text-ink-muted">
                  {kioskLabel(offer.vendorId)}, {isFreeMaggotOffer(offer) ? "Gratis (Pakan Maggot)" : isDonation(offer) ? "Gratis (Donasi)" : rupiah(offer.totalAmountIdr)}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {isFreeMaggotOffer(offer) ? <StatusPill label="Gratis" tone="success" /> : isDonation(offer) && <StatusPill label="Donasi" tone="success" />}
                <StatusPill label={orderStatus(offer)} />
                {canBuy && offer.paymentStatus === "unpaid" && (
                  <button type="button" className={marketButton} disabled={busy}
                    onClick={() => { setError(""); setInvoice(offer); }}>Bayar QRIS</button>
                )}
              </div>
            </li>
          ))}</ul>
        )}
      </MarketSection>

      <MarketSection title="Riwayat transaksi & pembayaran" description="Catatan pembayaran escrow dan pencairan pesanan.">
        {transactions.length === 0 ? (
          <EmptyState icon={Receipt} title="Belum ada transaksi" description="Transaksi pembayaran pesanan Anda akan tercatat di sini." />
        ) : (
          <ul>{transactions.map((item) => (
            <li key={item.id} className="grid min-w-0 gap-2 border-b border-line py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="break-words font-semibold">{item.commodityName}</p>
                  <p className="font-semibold tabular-nums text-brand-ink">{rupiah(item.amountIdr)}</p>
                </div>
                <p className="mt-1 min-w-0 break-words text-[13px] leading-5 text-ink-muted">
                  Kios tujuan: {item.vendorName} · {item.releasedAt ? "Selesai " + dateLabel(item.releasedAt) : "Dibuat " + dateLabel(item.createdAt)}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <StatusPill label={item.status === "released" ? "Selesai" : item.status === "refunded" ? "Dikembalikan" : "Ditahan di escrow"}
                  tone={item.status === "released" ? "success" : item.status === "refunded" ? "danger" : "info"} />
              </div>
            </li>
          ))}</ul>
        )}
      </MarketSection>

      {selectedOffer && <MarketDialog title={isFreeMaggotOffer(selectedOffer) ? "Pilih jumlah biomassa gratis" : isDonation(selectedOffer) ? "Pilih jumlah donasi" : "Pilih jumlah pesanan"} onClose={() => { if (!busy) setSelection(null); }}>
        <form className="grid gap-4" onSubmit={reserve} aria-busy={busy}>
          <div>
            <p className="text-sm leading-6 text-ink-muted">{commodityName(selectedOffer.commodityId)} · {kioskLabel(selectedOffer.vendorId)}</p>
            <LotFacts items={[
              ...(selectedStock ? [
                { label: "Kode lot", value: selectedStock.lotNumber },
                { label: "Stok awal lot", value: kg(selectedStock.initialKg) },
              ] : []),
              { label: "Tersedia untuk diklaim", value: kg(selectedOffer.quantityKg) },
            ]} />
            {stockHealth[selectedOffer.stockId] && (
              <div className="mt-2.5 rounded-lg border border-line bg-canvas/80 p-2.5 text-xs text-ink-muted">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span>Mutu Arrhenius saat ini:</span>
                  <strong className="text-ink">{stockHealth[selectedOffer.stockId]?.tierLabel || stockHealth[selectedOffer.stockId]?.condition}</strong>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>Dipajang: <strong className="text-ink">{formatElapsedHours(stockHealth[selectedOffer.stockId]?.hoursElapsed ?? 0)}</strong></span>
                  <span>Sisa sampai busuk: <strong className="text-ink">{formatRemainingShelfLife(stockHealth[selectedOffer.stockId]?.hoursRemaining ?? 0, stockHealth[selectedOffer.stockId]?.decayScore)}</strong></span>
                </div>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="claim-weight" className="mb-1.5 block text-sm font-semibold">Jumlah yang diambil (kg)</label>
            <input id="claim-weight" className="market-input" inputMode="numeric" type="number" min="1" step="1" max={Math.floor(selectedOffer.quantityKg)}
              required value={requestedKg} onChange={(event) => setRequestedKg(event.target.value)} />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {[1, 2, 3, 4, 5, 10, 20].filter((n) => n <= selectedOffer.quantityKg).map((val) => (
                <button key={val} type="button" className="min-h-11 min-w-11 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand"
                  onClick={() => setRequestedKg(String(val))}>
                  {val} kg
                </button>
              ))}
              <button type="button" className="min-h-11 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
                onClick={() => setRequestedKg(String(Math.floor(selectedOffer.quantityKg)))}>
                Semua ({Math.floor(selectedOffer.quantityKg)} kg)
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-muted">Masukkan kilogram bulat, maksimal {kg(Math.floor(selectedOffer.quantityKg))}. {isFreeMaggotOffer(selectedOffer) ? "Biomassa ini tidak untuk konsumsi pangan." : isDonation(selectedOffer) ? "Donasi tidak memerlukan pembayaran." : "Setelah konfirmasi, lanjutkan ke simulasi pembayaran QRIS."}</p>
          </div>
          <div className="rounded-xl border border-line bg-canvas p-4">
            <p className="text-xs text-ink-muted">{isDonation(selectedOffer) || isFreeMaggotOffer(selectedOffer) ? "Biaya klaim" : "Total sesuai jumlah pilihan"}</p>
            <p className="mt-1 break-words text-2xl font-semibold tabular-nums">{isDonation(selectedOffer) || isFreeMaggotOffer(selectedOffer) ? "Gratis (Rp0)" : rupiah(Math.round(Number(requestedKg) * selectedOffer.salvagePricePerKg))}</p>
          </div>
          {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <button type="submit" className={marketButton + " justify-center"} disabled={busy}>{busy ? "Menyimpan…" : isFreeMaggotOffer(selectedOffer) ? "Klaim biomassa gratis" : isDonation(selectedOffer) ? "Klaim donasi" : "Konfirmasi & lanjut bayar"}</button>
            <button type="button" className={marketSecondary + " justify-center"} disabled={busy} onClick={() => setSelection(null)}>Batal</button>
          </div>
        </form>
      </MarketDialog>}

      {invoice && <MarketDialog title="Pembayaran simulasi QRIS" onClose={() => { if (!busy) setInvoice(null); }}>
        <p className="break-words text-sm leading-5 text-ink-muted">{offerTitle(invoice)}, {kioskLabel(invoice.vendorId)}</p>
        <p className="mt-3 rounded-lg border border-line bg-canvas p-3 text-sm leading-6 text-ink-muted">Ini simulasi pembayaran, bukan pemindahan uang sungguhan. Dana pesanan dicatat di escrow hingga serah terima selesai.</p>
        <dl className="mt-3 grid gap-1.5 border-y border-line py-3.5 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Harga acuan</dt>
            <dd className="tabular-nums text-ink-muted"><s>{rupiah(invoice.originalPricePerKg * invoice.quantityKg)}</s></dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Potongan {Math.round(invoice.discountPercentage)}%</dt>
            <dd className="tabular-nums text-tier-3-ink">−{rupiah(invoice.originalPricePerKg * invoice.quantityKg - invoice.totalAmountIdr)}</dd>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-line pt-2.5 font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{rupiah(invoice.totalAmountIdr)}</dd>
          </div>
        </dl>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
          <button className={marketButton + " justify-center"} type="button" disabled={busy} onClick={pay}>{busy ? "Mencatat pembayaran…" : "Bayar " + rupiah(invoice.totalAmountIdr)}</button>
          <button className={marketSecondary + " justify-center"} type="button" disabled={busy} onClick={() => setInvoice(null)}>Bayar nanti</button>
        </div>
      </MarketDialog>}
    </div>
  );
}
