"use client";

import { useState } from "react";
import { MapPin, PackageCheck, Store, Truck } from "lucide-react";
import type { RescueOffer } from "@/types/market";
import { useAuth } from "@/lib/authContext";
import { useMarketSimulation } from "@/lib/simulationStore";
import { MarketDialog } from "@/components/common/MarketDialog";
import {
  EmptyState, MarketMetrics, MarketSection, StatusPill,
  commodityName, dateLabel, kg, kioskLabel, marketButton, marketSecondary, rupiah,
} from "@/components/common/MarketWorkspace";

/** Presents the paid dispatch queue and lets the courier confirm actual handover. */
export function LogisticsDashboard() {
  const { user } = useAuth();
  const { offers, confirmDelivery, busy } = useMarketSimulation();
  const queue = offers.filter((offer) => offer.status === "claimed" && offer.paymentStatus === "held_in_escrow");
  const completed = offers.filter((offer) => offer.status === "settled");
  const queueKg = queue.reduce((sum, offer) => sum + offer.quantityKg, 0);
  const heldAmount = queue.reduce((sum, offer) => sum + offer.totalAmountIdr, 0);
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
      <section className="flex items-start gap-4 rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Truck size={22} />
        </span>
        <div className="min-w-0">
          <h2 className="break-words font-serif text-2xl leading-tight tracking-tight">Pengantaran hari ini</h2>
          <p className="mt-1 text-sm text-ink-muted">Ambil dari kios, antar ke penerima.</p>
        </div>
      </section>

      <MarketMetrics items={[
        { label: "Siap diantar", value: queue.length },
        { label: "Muatan", value: kg(queueKg) },
        { label: "Dana ditahan", value: rupiah(heldAmount) },
        { label: "Selesai", value: completed.length },
      ]} />

      <MarketSection variant="plain" title="Antrean">
        {queue.length === 0 ? (
          <EmptyState icon={Truck} title="Belum ada antrean" description="Pesanan masuk setelah pembayaran." />
        ) : (
          <ul className="grid gap-3">
            {queue.map((offer) => (
              <li key={offer.id} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <StatusPill label="Siap diantar" tone="info" />
                    <h3 className="mt-2 break-words font-serif text-lg leading-tight tracking-tight">
                      {commodityName(offer.commodityId)}, {kg(offer.quantityKg)}
                    </h3>
                    <div className="mt-2.5 grid gap-0 text-[13px]">
                      <p className="flex min-w-0 items-center gap-2">
                        <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full border border-line text-brand"><Store size={11} /></span>
                        <span className="min-w-0 break-words">{kioskLabel(offer.vendorId)}</span>
                      </p>
                      <span aria-hidden className="ml-2.5 h-2.5 border-l border-dashed border-line-strong/60" />
                      <p className="flex min-w-0 items-center gap-2">
                        <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full border border-line text-brand"><MapPin size={11} /></span>
                        <span className="min-w-0 break-words font-semibold">{offer.claimedBy ?? "Penerima"}</span>
                      </p>
                    </div>
                  </div>
                  <p className="text-base font-semibold tabular-nums">{rupiah(offer.totalAmountIdr)}</p>
                </div>
                {user?.role === "logistics" && (
                  <button type="button" className={marketButton + " mt-3 w-full sm:w-auto"} disabled={busy}
                    onClick={() => { setError(""); setSelected(offer); }}>
                    Serah terima
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </MarketSection>

      <MarketSection title="Riwayat">
        {completed.length === 0 ? (
          <EmptyState icon={PackageCheck} title="Belum ada riwayat" description="Muncul setelah serah terima pertama." />
        ) : (
          <ul>{completed.map((offer) => (
            <li key={offer.id} className="grid min-w-0 gap-3 border-b border-line py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="break-words font-semibold">{commodityName(offer.commodityId)}, {kg(offer.quantityKg)}</p>
                <p className="mt-1 break-words text-[13px] leading-5 text-ink-muted">
                  {kioskLabel(offer.vendorId)} ke {offer.claimedBy ?? "Penerima"}
                  {offer.deliveredOn ? ", " + dateLabel(offer.deliveredOn) : ""}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <span className="text-sm font-semibold tabular-nums text-ink-muted">{rupiah(offer.totalAmountIdr)}</span>
                <StatusPill label="Selesai" tone="success" />
              </div>
            </li>
          ))}</ul>
        )}
      </MarketSection>

      {selected && <MarketDialog title="Konfirmasi serah terima" onClose={() => setSelected(null)}>
        <div className="grid gap-1 border-y border-line py-3.5 text-sm">
          <p className="font-semibold">{commodityName(selected.commodityId)}, {kg(selected.quantityKg)}</p>
          <p className="mt-1 leading-5 text-ink-muted">{kioskLabel(selected.vendorId)} ke {selected.claimedBy ?? "penerima"}</p>
          <p className="mt-1 font-semibold tabular-nums">{rupiah(selected.totalAmountIdr)}</p>
        </div>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={marketButton} disabled={busy} onClick={finish}>{busy ? "Menyimpan…" : "Konfirmasi"}</button>
          <button type="button" className={marketSecondary} onClick={() => setSelected(null)}>Batal</button>
        </div>
      </MarketDialog>}
    </div>
  );
}
