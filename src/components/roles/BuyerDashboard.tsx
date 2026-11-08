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
    line: "Lot layak masak dari kios sekitar.",
    icon: UtensilsCrossed,
    iconClass: "bg-tier-1-soft text-tier-1-ink",
    impactLabel: "Belanja",
  },
  social_kitchen: {
    title: "Bahan untuk dapur sosial",
    line: "Lot tier 2 untuk dapur umum.",
    icon: HeartHandshake,
    iconClass: "bg-tier-2-soft text-tier-2-ink",
    impactLabel: "Porsi perkiraan",
  },
  maggot: {
    title: "Bahan baku biomassa",
    line: "Lot tier 3 untuk biokonversi BSF.",
    icon: Recycle,
    iconClass: "bg-tier-3-soft text-tier-3-ink",
    impactLabel: "Larva perkiraan",
  },
} as const;

/** Shares catalog, order history and status presentation across all buyer roles. */
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
  const copy = framing[role];
  const RoleIcon = copy.icon;
  const orderedKg = orders.reduce((sum, offer) => sum + offer.quantityKg, 0);
  const spend = orders.reduce((sum, offer) => sum + offer.totalAmountIdr, 0);
  const impact = role === "social_kitchen"
    ? Math.round(orderedKg * 4)
    : role === "maggot"
      ? kg(orderedKg / 5)
      : rupiah(spend);
  const filteredListings = modeFilter === "all" ? listings : listings.filter((offer) => isDonation(offer) === (modeFilter === "donation"));
  const sortedListings = sort === "freshness"
    ? [...filteredListings].sort((a, b) => (stockHealth[a.stockId]?.decayScore ?? Infinity) - (stockHealth[b.stockId]?.decayScore ?? Infinity))
    : sort === "price" ? [...filteredListings].sort((a, b) => a.salvagePricePerKg - b.salvagePricePerKg) : filteredListings;
  const visibleListings = showAllListings ? sortedListings : sortedListings.slice(0, 8);
  const selectedOffer = selection ? listings.find((offer) => offer.id === selection.offer.id) ?? selection.offer : null;
  const stockById = new Map(stockItems.map((item) => [item.id, item]));
  const selectedStock = selectedOffer && stockById.get(selectedOffer.stockId);

  /** Reserves the selected weight and opens the invoice for the exact order returned by the server. */
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

  /** Records the simulated payment and makes the order available to couriers. */
  async function pay() {
    if (!invoice) return;
    const result = await payQrisForOffer(invoice.id);
    if (result.success) setInvoice(null);
    else setError(result.message);
  }

  return (
    <div className="grid gap-4">
      <section className="market-panel grid gap-3 min-[370px]:grid-cols-[minmax(0,1fr)_auto] min-[370px]:items-center sm:gap-4">
        <div className="flex items-start gap-4">
          <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-xl sm:size-12 ${copy.iconClass}`}>
            <RoleIcon size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="market-section-heading break-words">{copy.title}</h2>
            <p className="mt-1 text-sm text-ink-muted">{copy.line}</p>
          </div>
        </div>
        <div className="border-t border-line pt-3 min-[370px]:border-l min-[370px]:border-t-0 min-[370px]:pl-3 min-[370px]:pt-0 min-[370px]:text-right sm:pl-6">
          <p className="text-[13px] text-ink-muted">{copy.impactLabel}</p>
          <p className="mt-1 break-words font-serif text-xl leading-none tabular-nums sm:text-3xl">{impact}</p>
        </div>
      </section>

      <MarketMetrics items={[
        { label: "Lot tersedia", value: listings.length },
        { label: "Berjalan", value: orders.filter((offer) => offer.status === "claimed").length },
        { label: "Selesai", value: orders.filter((offer) => offer.status === "settled").length },
      ]} />

      <MarketSection variant="plain" title="Katalog" description="Bandingkan mutu, waktu simpan, dan harga sebelum memilih lot."
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
        {error && <p role="alert" className="mb-3 text-sm font-medium text-danger">{error}</p>}
        {role === "social_kitchen" && listings.length > 0 && (
          <div className="mb-3 flex max-w-sm items-center gap-2">
            <label htmlFor="catalog-mode" className="shrink-0 text-sm font-semibold">Penawaran</label>
            <select id="catalog-mode" className="market-input" value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}>
              <option value="all">Jual dan donasi</option>
              <option value="sale">Jual</option>
              <option value="donation">Donasi</option>
            </select>
          </div>
        )}
        {weather && listings.length > 0 && (
          <p className="mb-3 text-[13px] leading-5 text-ink-muted">
            {weather.isEstimated ? "Perkiraan kondisi pasar" : "Kondisi pasar"} · {Math.round(weather.temperatureC)}°C · Kelembapan {Math.round(weather.humidityPercent)}%
          </p>
        )}
        {filteredListings.length === 0 ? (
          <EmptyState icon={PackageCheck} title="Belum ada lot" description={modeFilter === "all"
            ? "Lot baru muncul setelah pedagang menerbitkan penawaran." : "Pilih jenis penawaran lain untuk melihat lot yang tersedia."} />
        ) : (
          <ul className="grid gap-3">
            {visibleListings.map((offer) => {
              const health = stockHealth[offer.stockId];
              const stock = stockById.get(offer.stockId);
              return (
                <li key={offer.id} className="market-panel grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.42fr)]">
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
                      { label: "Tersedia untuk diklaim", value: kg(offer.quantityKg) },
                    ]} />
                    {health ? (
                      <div className="mt-3 rounded-xl border border-line bg-canvas/80 px-3 py-3">
                        <DecayMeter score={health.decayScore} />
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2 text-[13px] leading-5 text-ink-muted">
                          <span>Dipajang <strong className="font-semibold text-ink">{formatElapsedHours(health.hoursElapsed)}</strong></span>
                          {health.decayScore < 0.85 ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock size={14} aria-hidden />
                              Sisa simpan sampai busuk <strong className="font-semibold text-ink">{formatRemainingShelfLife(health.hoursRemaining, health.decayScore)}</strong>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-medium text-danger">
                              <Clock size={14} aria-hidden />
                              Melewati batas simpan pangan (biomassa maggot)
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-ink-muted">Perkiraan model kinetika Arrhenius berdasarkan lama dipajang dan kondisi pasar.</p>
                      </div>
                    ) : <p className="mt-3 text-sm text-ink-muted">Perkiraan mutu belum tersedia.</p>}
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3 md:flex-col md:items-stretch md:justify-center md:border-l md:border-t-0 md:pl-4 md:pt-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink-muted">{isDonation(offer) ? "Dari pedagang" : isFreeMaggotOffer(offer) ? "Alokasi biomassa" : "Harga per kilogram"}</p>
                      <p className="mt-1 text-xl font-semibold leading-tight tabular-nums">{isDonation(offer) || isFreeMaggotOffer(offer) ? "Gratis (Rp0)" : rupiah(offer.salvagePricePerKg) + "/kg"}</p>
                      {!isDonation(offer) && !isFreeMaggotOffer(offer) && <p className="mt-0.5 flex flex-wrap items-baseline gap-1.5 text-[12px] tabular-nums text-ink-muted">
                        {offer.originalPricePerKg > offer.salvagePricePerKg && (
                          <s>{rupiah(offer.originalPricePerKg)}/kg</s>
                        )}
                      </p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canBuy && (
                        <button type="button" className={marketButton} disabled={busy} onClick={() => {
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

      <MarketSection title="Pesanan">
        {orders.length === 0 ? (
          <EmptyState icon={PackageCheck} title="Belum ada pesanan" description="Klaim lot dari katalog." />
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
                    onClick={() => { setError(""); setInvoice(offer); }}>Bayar</button>
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
        <form className="grid gap-4" onSubmit={reserve}>
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
                <button key={val} type="button" className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand"
                  onClick={() => setRequestedKg(String(val))}>
                  {val} kg
                </button>
              ))}
              <button type="button" className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-brand transition-colors hover:bg-brand-soft"
                onClick={() => setRequestedKg(String(Math.floor(selectedOffer.quantityKg)))}>
                Semua ({Math.floor(selectedOffer.quantityKg)} kg)
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-sm">
            <p className="font-semibold">Total {isDonation(selectedOffer) || isFreeMaggotOffer(selectedOffer) ? "Gratis (Rp0)" : rupiah(Math.round(Number(requestedKg) * selectedOffer.salvagePricePerKg))}</p>
            <button type="button" className={marketSecondary} onClick={() => setRequestedKg(String(Math.floor(selectedOffer.quantityKg)))}>Ambil semua</button>
          </div>
          {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={marketButton} disabled={busy}>{busy ? "Menyimpan…" : isFreeMaggotOffer(selectedOffer) ? "Klaim gratis" : isDonation(selectedOffer) ? "Klaim donasi" : "Konfirmasi pesanan"}</button>
            <button type="button" className={marketSecondary} disabled={busy} onClick={() => setSelection(null)}>Batal</button>
          </div>
        </form>
      </MarketDialog>}

      {invoice && <MarketDialog title="Pembayaran simulasi" onClose={() => setInvoice(null)}>
        <p className="break-words text-sm leading-5 text-ink-muted">{offerTitle(invoice)}, {kioskLabel(invoice.vendorId)}</p>
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
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={marketButton} type="button" disabled={busy} onClick={pay}>{busy ? "Mencatat…" : "Bayar"}</button>
          <button className={marketSecondary} type="button" onClick={() => setInvoice(null)}>Tutup</button>
        </div>
      </MarketDialog>}
    </div>
  );
}
