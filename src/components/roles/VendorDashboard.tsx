"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, BadgeCheck, Boxes, CloudSun, Droplets, PackagePlus, Store, Wallet } from "lucide-react";
import { COMMODITIES } from "@/data/commodities";
import { useAuth } from "@/lib/authContext";
import { useMarketSimulation } from "@/lib/simulationStore";
import {
  DecayMeter, EmptyState, MarketMetrics, MarketSection, StatusPill, TierChip,
  commodityName, kg, kioskInfo, kioskLabel, marketButton, marketSecondary, offerTitle, orderStatus, rupiah,
} from "@/components/common/MarketWorkspace";

/** Shows actual arrivals, their current decay and the order that reserves each lot. */
export function VendorDashboard() {
  const { user } = useAuth();
  const { stockItems, stockHealth, weather, offers, vendorWalletBalanceIdr, busy,
    addStockItem, createInstantSurplusOffer, approveOfferByVendor, rejectOfferByVendor } = useMarketSimulation();
  const [commodity, setCommodity] = useState(COMMODITIES[0].id);
  const [weight, setWeight] = useState("");
  const [previewKiosk, setPreviewKiosk] = useState("");
  const canManage = user?.role === "vendor" && Boolean(user.vendorId);
  const selectedKiosk = user?.role === "vendor" ? user.vendorId : previewKiosk;
  const kiosk = selectedKiosk ? kioskInfo(selectedKiosk) : undefined;
  const inventory = stockItems.filter((item) => !selectedKiosk || item.vendorId === selectedKiosk);
  const kioskOffers = offers.filter((offer) => !selectedKiosk || offer.vendorId === selectedKiosk);
  const currentOffers = kioskOffers.filter((offer) => offer.status !== "settled" && offer.status !== "rejected");
  const reserved = currentOffers.filter((offer) => offer.status === "claimed").reduce((sum, offer) => sum + offer.quantityKg, 0);
  const unoffered = inventory.filter((item) => item.remainingKg > 0 && !currentOffers.some((offer) => offer.stockId === item.id));
  const activeCount = currentOffers.filter((offer) => offer.status === "active").length;
  const sortedInventory = [...inventory].sort((a, b) =>
    Number(b.remainingKg > 0) - Number(a.remainingKg > 0) ||
    (stockHealth[b.id]?.decayScore ?? 0) - (stockHealth[a.id]?.decayScore ?? 0));
  const offerRank = { pending_vendor: 0, active: 1, claimed: 2, settled: 3, rejected: 4 } as const;
  const sortedOffers = [...kioskOffers].sort((a, b) => offerRank[a.status] - offerRank[b.status]);

  /** Records the arrival on the server and keeps the form populated if it fails. */
  async function recordArrival(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await addStockItem({ commodityId: commodity, initialKg: Number(weight) });
    if (result.success) setWeight("");
  }

  /** Offers every remaining lot in one pass, stopping if the server rejects one. */
  async function offerAll() {
    for (const item of unoffered) {
      const result = await createInstantSurplusOffer(item.id);
      if (!result.success) break;
    }
  }

  return (
    <div className="grid gap-4">
      {kiosk && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <Store size={18} />
            </span>
            <div className="min-w-0">
              <p className="break-words text-base font-semibold leading-tight">{kiosk.name}</p>
              <p className="mt-0.5 break-words text-[13px] text-ink-muted">Lapak {kiosk.stallNumber}, Blok {kiosk.block}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label={kiosk.verificationStatus === "verified" ? "Terverifikasi" : "Menunggu verifikasi"}
              tone={kiosk.verificationStatus === "verified" ? "success" : "warning"} />
            <span className="inline-flex items-center gap-1.5 rounded-md border border-brand/20 bg-brand-soft px-2 py-1 text-[12px] font-semibold text-brand-ink">
              <BadgeCheck size={14} aria-hidden /> Reputasi {kiosk.reputationScore}
            </span>
          </div>
        </section>
      )}

      <MarketMetrics items={[
        { label: "Stok fisik", value: kg(inventory.reduce((sum, item) => sum + item.remainingKg, 0)) },
        { label: "Dipesan", value: kg(reserved) },
        { label: "Penawaran aktif", value: currentOffers.filter((offer) => offer.status === "active").length },
        { label: "Saldo", value: rupiah(vendorWalletBalanceIdr) },
      ]} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
        <MarketSection
          variant="plain"
          title="Inventaris"
          action={user?.role !== "vendor" ? (
            <select aria-label="Saring kios" className="market-input w-full font-normal sm:w-56" value={previewKiosk}
              onChange={(event) => setPreviewKiosk(event.target.value)}>
              <option value="">Semua kios</option>
              {[...new Set(stockItems.map((stock) => stock.vendorId))].map((id) => <option key={id} value={id}>{kioskLabel(id)}</option>)}
            </select>
          ) : unoffered.length > 0 ? (
            <button type="button" className={marketSecondary} disabled={busy} onClick={offerAll}>
              Tawarkan semua ({unoffered.length})
            </button>
          ) : undefined}
        >
          {sortedInventory.length === 0 ? (
            <EmptyState icon={Boxes} title="Belum ada pasokan" description="Catat pasokan untuk memulai." />
          ) : (
            <ul className="grid gap-3">
              {sortedInventory.map((item) => {
                const health = stockHealth[item.id];
                const linked = currentOffers.find((offer) => offer.stockId === item.id);
                const changed = linked?.status === "active" && health && (linked.targetTier === "tier_3" ? health.decayScore < 0.85 : health.decayScore >= 0.85);
                return (
                  <li key={item.id} className={`rounded-2xl border border-line p-4 ${item.remainingKg === 0 ? "bg-canvas/40" : "bg-surface"}`}>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h3 className="break-words text-base font-semibold leading-tight">{commodityName(item.commodityId)}</h3>
                          <span className="rounded border border-line px-1.5 py-0.5 text-[12px] font-semibold tabular-nums text-ink-muted">{item.lotNumber}</span>
                          {changed && <StatusPill label="Mutu berubah" tone="warning" />}
                        </div>
                        <p className="mt-1 text-[13px] text-ink-muted">Sisa {kg(item.remainingKg)}</p>
                        {health && item.remainingKg > 0 && <div className="mt-3"><DecayMeter score={health.decayScore} /></div>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                        {linked ? (
                          <>
                            <StatusPill label={orderStatus(linked)} />
                            <TierChip tier={linked.targetTier} />
                          </>
                        ) : (
                          <span className="text-[13px] text-ink-muted">{item.remainingKg === 0 ? "Stok habis" : "Belum ditawarkan"}</span>
                        )}
                        {canManage && !linked && item.remainingKg > 0 && (
                          <button type="button" className={marketButton} disabled={busy} onClick={() => createInstantSurplusOffer(item.id)}>
                            Tawarkan
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </MarketSection>

        <div className="grid gap-4 xl:sticky xl:top-20 xl:self-start">
          {canManage && (
            <MarketSection title="Catat pasokan" description={kioskLabel(user.vendorId ?? "")}>
              <form onSubmit={recordArrival} className="grid gap-4">
                <label className="grid gap-1.5 text-sm font-semibold">Komoditas
                  <select className="market-input" value={commodity} onChange={(event) => setCommodity(event.target.value)}>
                    {COMMODITIES.map((item) => <option key={item.id} value={item.id}>{item.localName}</option>)}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-semibold">Berat
                  <span className="relative block">
                    <input className="market-input pr-12" type="number" inputMode="decimal" required min="0.01" max="10000" step="0.01"
                      value={weight} onChange={(event) => setWeight(event.target.value)} />
                    <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-normal text-ink-muted">kg</span>
                  </span>
                </label>
                <button type="submit" className={marketButton + " w-full"} disabled={busy}>
                  <PackagePlus size={16} aria-hidden /> Simpan pasokan
                </button>
              </form>
            </MarketSection>
          )}

          <aside className="rounded-3xl bg-brand-deep p-5 text-cream">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[13px] text-sage"><CloudSun size={14} aria-hidden /> Cuaca los</p>
              {weather?.isEstimated && <span className="text-[12px] text-sage-soft">Estimasi</span>}
            </div>
            {weather ? (
              <>
                <p className="mt-3 font-serif text-5xl leading-none tracking-tight">
                  {weather.temperatureC}<span className="ml-1 align-top font-sans text-lg font-semibold">°C</span>
                </p>
                <p className="mt-3 flex items-center gap-2 border-t border-rail pt-3 text-sm text-sage-soft">
                  <Droplets size={15} aria-hidden /> Kelembapan {weather.humidityPercent}%
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-sage-soft">Data belum tersedia.</p>
            )}
          </aside>

          {user?.role === "vendor" && !user.vendorId && (
            <p role="status" className="flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning-soft p-3 text-[13px] leading-5 text-warning">
              <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0" />
              Akun belum tertaut ke kios. Hubungi pengelola.
            </p>
          )}
        </div>
      </div>

      <MarketSection title="Penawaran"
        action={<div className="flex items-center gap-3 text-[13px] font-semibold tabular-nums">
          <span className="text-ink-muted">{activeCount} aktif</span>
          <span className="inline-flex items-center gap-1.5 text-brand-ink"><Wallet size={14} aria-hidden /> {rupiah(vendorWalletBalanceIdr)}</span>
        </div>}>
        {kioskOffers.length === 0 ? (
          <EmptyState icon={Store} title="Belum ada penawaran" description="Terbitkan lot dari inventaris." />
        ) : (
          <ul>{sortedOffers.map((offer) => (
            <li key={offer.id} className="grid min-w-0 gap-3 border-b border-line py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words font-semibold">{offerTitle(offer)}</p>
                  <TierChip tier={offer.targetTier} />
                </div>
                <p className="mt-1 break-words text-[13px] leading-5 text-ink-muted">
                  {rupiah(offer.salvagePricePerKg)}/kg, total {rupiah(offer.totalAmountIdr)}
                  {offer.claimedBy ? ", " + offer.claimedBy : ""}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <StatusPill label={orderStatus(offer)} />
                {canManage && offer.status === "pending_vendor" && (
                  <button className={marketButton} type="button" disabled={busy} onClick={() => approveOfferByVendor(offer.id)}>Setujui</button>
                )}
                {canManage && (offer.status === "pending_vendor" || offer.status === "active") && (
                  <button className={marketSecondary} type="button" disabled={busy} onClick={() => rejectOfferByVendor(offer.id)}>
                    {offer.status === "active" ? "Tarik" : "Tolak"}
                  </button>
                )}
              </div>
            </li>
          ))}</ul>
        )}
      </MarketSection>
    </div>
  );
}
