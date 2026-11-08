"use client";

import { useState } from "react";
import { Clock, HeartHandshake, PackageCheck, Recycle, UtensilsCrossed } from "lucide-react";
import type { RescueOffer } from "@/types/market";
import type { BuyerRole } from "@/lib/serverSimulationState";
import { useAuth } from "@/lib/authContext";
import { useMarketSimulation } from "@/lib/simulationStore";
import { MarketDialog } from "@/components/common/MarketDialog";
import {
  EmptyState, MarketMetrics, MarketSection, StatusPill,
  commodityName, kg, kioskLabel, marketButton, marketSecondary, offerTitle, orderStatus, rupiah,
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
  const { offers, busy, claimOfferByBuyer, payQrisForOffer } = useMarketSimulation();
  const canBuy = user?.role === role;
  const listings = offers.filter((offer) => offer.targetTier === tier[role] && offer.status === "active");
  const orders = offers.filter((offer) => offer.targetTier === tier[role] &&
    (!canBuy || offer.isMine) && (offer.status === "claimed" || offer.status === "settled"));
  const [invoice, setInvoice] = useState<RescueOffer | null>(null);
  const [error, setError] = useState("");
  const [showAllListings, setShowAllListings] = useState(false);
  const copy = framing[role];
  const RoleIcon = copy.icon;
  const orderedKg = orders.reduce((sum, offer) => sum + offer.quantityKg, 0);
  const spend = orders.reduce((sum, offer) => sum + offer.totalAmountIdr, 0);
  const impact = role === "social_kitchen"
    ? Math.round(orderedKg * 4)
    : role === "maggot"
      ? kg(orderedKg / 5)
      : rupiah(spend);
  const visibleListings = showAllListings ? listings : listings.slice(0, 8);

  /** Reserves the lot before opening payment, so competing buyers see it disappear. */
  async function reserve(offer: RescueOffer, donated = false) {
    const result = await claimOfferByBuyer(offer.id, donated);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setError("");
    if (role === "warteg") setInvoice(offer);
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
      <section className="grid gap-4 rounded-3xl border border-line bg-surface p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
        <div className="flex items-start gap-4">
          <span aria-hidden className={`grid size-12 shrink-0 place-items-center rounded-2xl ${copy.iconClass}`}>
            <RoleIcon size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="break-words font-serif text-2xl leading-tight tracking-tight">{copy.title}</h2>
            <p className="mt-1 text-sm text-ink-muted">{copy.line}</p>
          </div>
        </div>
        <div className="border-t border-line pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
          <p className="text-[13px] text-ink-muted">{copy.impactLabel}</p>
          <p className="mt-1 break-words font-serif text-3xl leading-none tabular-nums">{impact}</p>
        </div>
      </section>

      <MarketMetrics items={[
        { label: "Lot tersedia", value: listings.length },
        { label: "Berjalan", value: orders.filter((offer) => offer.status === "claimed").length },
        { label: "Selesai", value: orders.filter((offer) => offer.status === "settled").length },
      ]} />

      <MarketSection variant="plain" title="Katalog">
        {error && <p role="alert" className="mb-3 text-sm font-medium text-danger">{error}</p>}
        {listings.length === 0 ? (
          <EmptyState icon={PackageCheck} title="Belum ada lot" description="Lot baru muncul setelah pedagang menerbitkan penawaran." />
        ) : (
          <ul className="grid gap-3">
            {visibleListings.map((offer) => (
              <li key={offer.id} className="grid min-w-0 gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="break-words text-[12px] leading-4 text-ink-muted">{kioskLabel(offer.vendorId)}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <h3 className="break-words font-serif text-xl leading-tight tracking-tight">{commodityName(offer.commodityId)}</h3>
                    <span className="rounded-md bg-brand px-2 py-1 text-[12px] font-semibold tabular-nums text-cream">
                      −{Math.round(offer.discountPercentage)}%
                    </span>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
                    <span>{kg(offer.quantityKg)}</span>
                    <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden /> {offer.expiresInMinutes} menit</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold leading-tight tabular-nums">{rupiah(offer.totalAmountIdr)}</p>
                    <p className="mt-0.5 flex flex-wrap items-baseline gap-1.5 text-[12px] tabular-nums text-ink-muted">
                      <span>{rupiah(offer.salvagePricePerKg)}/kg</span>
                      {offer.originalPricePerKg > offer.salvagePricePerKg && (
                        <s>{rupiah(offer.originalPricePerKg)}/kg</s>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canBuy && (
                      <button type="button" className={marketButton} disabled={busy} onClick={() => reserve(offer)}>
                        Klaim
                      </button>
                    )}
                    {canBuy && role === "social_kitchen" && (
                      <button type="button" className={marketSecondary} disabled={busy} onClick={() => reserve(offer, true)}>Donasi</button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {listings.length > visibleListings.length && (
          <button type="button" className={marketSecondary + " mt-3 w-full justify-center"}
            onClick={() => setShowAllListings(true)}>
            Tampilkan semua ({listings.length})
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
                  {kioskLabel(offer.vendorId)}, {rupiah(offer.totalAmountIdr)}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
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
