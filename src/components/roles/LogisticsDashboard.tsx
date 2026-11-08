"use client";

import { useState } from "react";
import type { RescueOffer } from "@/types/market";
import { useAuth } from "@/lib/authContext";
import { useMarketSimulation } from "@/lib/simulationStore";
import { MarketDialog } from "@/components/common/MarketDialog";
import { kioskLabel, marketButton, marketSecondary, MarketMetrics, MarketRow, MarketSection, offerTitle, orderStatus } from "@/components/common/MarketWorkspace";

/** Presents the paid dispatch queue and lets the courier confirm actual handover. */
export function LogisticsDashboard() {
  const { user } = useAuth();
  const { offers, confirmDelivery, busy } = useMarketSimulation();
  const queue = offers.filter((offer) => offer.status === "claimed" && offer.paymentStatus === "held_in_escrow");
  const completed = offers.filter((offer) => offer.status === "settled");
  const [selected, setSelected] = useState<RescueOffer | null>(null);
  const [error, setError] = useState("");

  /** Completes one order, then lets the refreshed server snapshot update every role. */
  async function finish() {
    if (!selected) return;
    const result = await confirmDelivery(selected.id);
    if (result.success) setSelected(null);
    else setError(result.message);
  }

  return (
    <div className="grid gap-4">
      <MarketMetrics items={[["Siap diantar", queue.length], ["Selesai", completed.length]]} />
      <MarketSection title="Antrean pengantaran" description="Pesanan masuk setelah pembayaran dicatat.">
        {queue.length === 0 ? <p className="text-sm text-[#465c54]">Belum ada pesanan siap diantar.</p> :
          <ul>{queue.map((offer) => <MarketRow key={offer.id} title={offerTitle(offer)} detail={kioskLabel(offer.vendorId) + " → " + (offer.claimedBy ?? "Penerima")} status={orderStatus(offer)}>
            {user?.role === "logistics" && <button type="button" className={marketButton} disabled={busy}
              onClick={() => { setError(""); setSelected(offer); }}>Serah terima</button>}
          </MarketRow>)}</ul>}
      </MarketSection>
      <MarketSection title="Riwayat pengantaran">
        {completed.length === 0 ? <p className="text-sm text-[#465c54]">Belum ada pengantaran selesai.</p> :
          <ul>{completed.map((offer) => <MarketRow key={offer.id} title={offerTitle(offer)} detail={offer.claimedBy ?? "Penerima"} status={orderStatus(offer)} />)}</ul>}
      </MarketSection>
      {selected && <MarketDialog title="Konfirmasi serah terima" onClose={() => setSelected(null)}>
        <p className="text-sm leading-6 text-[#465c54]">Konfirmasi setelah {offerTitle(selected)} diterima oleh {selected.claimedBy ?? "penerima"}.</p>
        {error && <p role="alert" className="mt-3 text-sm text-[#8e2d23]">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={marketButton} disabled={busy} onClick={finish}>{busy ? "Menyimpan…" : "Konfirmasi serah terima"}</button>
          <button type="button" className={marketSecondary} onClick={() => setSelected(null)}>Batal</button>
        </div>
      </MarketDialog>}
    </div>
  );
}
