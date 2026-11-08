"use client";

import { useState } from "react";
import type { RescueOffer } from "@/types/market";
import type { BuyerRole } from "@/lib/serverSimulationState";
import { useAuth } from "@/lib/authContext";
import { useMarketSimulation } from "@/lib/simulationStore";
import { MarketDialog } from "@/components/common/MarketDialog";
import { kioskLabel, marketButton, marketSecondary, MarketMetrics, MarketRow, MarketSection, offerTitle, orderStatus, rupiah } from "@/components/common/MarketWorkspace";

const tier = { warteg: "tier_1", social_kitchen: "tier_2", maggot: "tier_3" } as const;

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

  /** Reserves the lot before opening payment, so competing buyers see it disappear. */
  async function reserve(offer: RescueOffer, donated = false) {
    const result = await claimOfferByBuyer(offer.id, donated);
    if (result.success && role === "warteg") {
      setError("");
      setInvoice(offer);
    }
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
      <MarketMetrics items={[["Lot tersedia", listings.length], ["Pesanan berjalan", orders.filter((offer) => offer.status === "claimed").length], ["Selesai", orders.filter((offer) => offer.status === "settled").length]]} />
      <MarketSection title="Katalog pasar" description={role === "maggot" ? "Lot untuk pengolahan biomassa." : "Penawaran pangan dari kios yang bisa diklaim."}>
        {listings.length === 0 ? <p className="text-sm text-[#465c54]">Belum ada penawaran yang bisa diklaim.</p> :
          <ul>{listings.map((offer) => <MarketRow key={offer.id} title={offerTitle(offer)} detail={kioskLabel(offer.vendorId) + " · " + rupiah(offer.totalAmountIdr)}>
            {canBuy && <button type="button" className={marketButton} disabled={busy} onClick={() => reserve(offer)}>{role === "warteg" ? "Klaim dan bayar simulasi" : "Klaim lot"}</button>}
            {canBuy && role === "social_kitchen" && <button type="button" className={marketSecondary} disabled={busy} onClick={() => reserve(offer, true)}>Klaim donasi</button>}
          </MarketRow>)}</ul>}
      </MarketSection>
      <MarketSection title={canBuy ? "Pesanan saya" : "Pesanan peran ini"}>
        {orders.length === 0 ? <p className="text-sm text-[#465c54]">Belum ada pesanan tercatat.</p> :
          <ul>{orders.map((offer) => <MarketRow key={offer.id} title={offerTitle(offer)} detail={kioskLabel(offer.vendorId) + " · " + rupiah(offer.totalAmountIdr)} status={orderStatus(offer)}>
            {canBuy && offer.paymentStatus === "unpaid" && <button type="button" className={marketButton} disabled={busy}
              onClick={() => { setError(""); setInvoice(offer); }}>Bayar simulasi</button>}
          </MarketRow>)}</ul>}
      </MarketSection>
      {invoice && <MarketDialog title="Pembayaran simulasi" onClose={() => setInvoice(null)}>
        <p className="text-sm text-[#465c54]">{offerTitle(invoice)} · {rupiah(invoice.totalAmountIdr)}</p>
        <p className="mt-2 text-sm text-[#465c54]">Konfirmasi pembayaran untuk memasukkan pesanan ke antrean kurir.</p>
        {error && <p role="alert" className="mt-3 text-sm text-[#8e2d23]">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={marketButton} type="button" disabled={busy} onClick={pay}>{busy ? "Mencatat…" : "Konfirmasi pembayaran"}</button>
          <button className={marketSecondary} type="button" onClick={() => setInvoice(null)}>Tutup</button>
        </div>
      </MarketDialog>}
    </div>
  );
}
