"use client";

import { useState, type FormEvent } from "react";
import { COMMODITIES } from "@/data/commodities";
import { useAuth } from "@/lib/authContext";
import { useMarketSimulation } from "@/lib/simulationStore";
import { kioskLabel, marketButton, marketSecondary, MarketMetrics, MarketRow, MarketSection, offerTitle, orderStatus, rupiah } from "@/components/common/MarketWorkspace";

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
  const inventory = stockItems.filter((item) => !selectedKiosk || item.vendorId === selectedKiosk);
  const kioskOffers = offers.filter((offer) => !selectedKiosk || offer.vendorId === selectedKiosk);
  const currentOffers = kioskOffers.filter((offer) => offer.status !== "settled" && offer.status !== "rejected");
  const reserved = currentOffers.filter((offer) => offer.status === "claimed").reduce((sum, offer) => sum + offer.quantityKg, 0);

  /** Records the arrival on the server and keeps the form populated if it fails. */
  async function recordArrival(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await addStockItem({ commodityId: commodity, initialKg: Number(weight) });
    if (result.success) setWeight("");
  }

  return (
    <div className="grid gap-4">
      <MarketMetrics items={[
        ["Stok fisik", inventory.reduce((sum, item) => sum + item.remainingKg, 0) + " kg"],
        ["Dipesan", reserved + " kg"],
        ["Penawaran tersedia", currentOffers.filter((offer) => offer.status === "active").length],
        ["Saldo penjualan simulasi", rupiah(vendorWalletBalanceIdr)],
      ]} />
      {canManage && (
        <MarketSection title="Catat pasokan masuk" description={kioskLabel(user.vendorId ?? "")}>
          <form onSubmit={recordArrival} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
            <label className="grid gap-1.5 text-sm font-semibold">Komoditas
              <select className="market-input" value={commodity} onChange={(event) => setCommodity(event.target.value)}>
                {COMMODITIES.map((item) => <option key={item.id} value={item.id}>{item.localName}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">Berat (kg)
              <input className="market-input" type="number" inputMode="decimal" required min="0.01" max="10000" step="0.01" value={weight} onChange={(event) => setWeight(event.target.value)} />
            </label>
            <button type="submit" className={marketButton} disabled={busy}>Simpan pasokan</button>
          </form>
        </MarketSection>
      )}
      {user?.role === "vendor" && !user.vendorId && <p role="status">Minta pengelola menautkan akun Anda ke kios.</p>}
      <MarketSection title="Inventaris kios" description={weather
        ? `Skor susut diperbarui dari waktu masuk. ${weather.isEstimated ? "Estimasi cuaca" : "Data cuaca"} ${weather.temperatureC} °C, kelembapan ${weather.humidityPercent}%.`
        : "Skor susut dihitung sejak pasokan masuk."}>
        {user?.role !== "vendor" && <label className="mb-3 grid max-w-sm gap-1 text-sm">Saring kios
          <select className="market-input" value={previewKiosk} onChange={(event) => setPreviewKiosk(event.target.value)}>
            <option value="">Semua kios</option>
            {[...new Set(stockItems.map((stock) => stock.vendorId))].map((id) => <option key={id} value={id}>{kioskLabel(id)}</option>)}
          </select>
        </label>}
        {inventory.length === 0 ? <p className="text-sm text-[#465c54]">Belum ada pasokan tercatat.</p> :
          <ul>{inventory.map((item) => {
            const health = stockHealth[item.id];
            const linked = currentOffers.find((offer) => offer.stockId === item.id);
            const name = COMMODITIES.find((entry) => entry.id === item.commodityId)?.localName ?? item.commodityId;
            const decay = health ? "Skor susut " + (health.decayScore * 100).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + "%" : "Skor susut belum tersedia";
            const changed = linked?.status === "active" && health && (linked.targetTier === "tier_3" ? health.decayScore < 0.85 : health.decayScore >= 0.85);
            return <MarketRow key={item.id} title={name + " · " + item.remainingKg + " kg"}
              detail={item.lotNumber + " · Masuk " + item.arrivalClock + " · " + decay}
              status={changed ? "Mutu berubah" : linked ? orderStatus(linked) : item.remainingKg === 0 ? "Stok habis" : "Di kios"}>
              {canManage && !linked && item.remainingKg > 0 && <button type="button" className={marketButton} disabled={busy} onClick={() => createInstantSurplusOffer(item.id)}>Terbitkan penawaran</button>}
            </MarketRow>;
          })}</ul>}
      </MarketSection>
      <MarketSection title="Penawaran dan penjualan">
        {kioskOffers.length === 0 ? <p className="text-sm text-[#465c54]">Belum ada penawaran.</p> :
          <ul>{kioskOffers.map((offer) => <MarketRow key={offer.id} title={offerTitle(offer)} detail={rupiah(offer.totalAmountIdr) + (offer.claimedBy ? " · " + offer.claimedBy : "")} status={orderStatus(offer)}>
            {canManage && offer.status === "pending_vendor" && <button className={marketButton} type="button" disabled={busy} onClick={() => approveOfferByVendor(offer.id)}>Setujui</button>}
            {canManage && (offer.status === "pending_vendor" || offer.status === "active") &&
              <button className={marketSecondary} type="button" disabled={busy} onClick={() => rejectOfferByVendor(offer.id)}>{offer.status === "active" ? "Tarik penawaran" : "Tolak"}</button>}
          </MarketRow>)}</ul>}
      </MarketSection>
    </div>
  );
}
