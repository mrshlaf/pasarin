/**
 * Dasbor Ruang Kerja Pedagang Kios Pasar Induk Kramat Jati (PSR-2).
 * Memfasilitasi pencatatan pasokan subuh, pemantauan kinetika peluruhan biologis stok kios,
 * penimbangan fisik sisa dagangan sore hari, serta konfirmasi penerbitan penawaran penyelamatan pangan.
 */

"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, BadgeCheck, Boxes, Clock, CloudSun, Droplets, PackagePlus, Receipt, Store, Wallet } from "lucide-react";
import { COMMODITIES } from "@/data/commodities";
import { useAuth } from "@/lib/authContext";
import { useMarketSimulation } from "@/lib/simulationStore";
import { completedDonationLots, distributionTierForDecay, isDonation, roundKg, type DistributionMode } from "@/types/market";
import { MarketDialog } from "@/components/common/MarketDialog";
import {
  DecayMeter, EmptyState, LotFacts, MarketMetrics, MarketSection, StatusPill, TierChip,
  commodityName, dateLabel, formatElapsedHours, formatRemainingShelfLife, kg, kioskInfo, kioskLabel, marketButton, marketSecondary, offerTitle, orderStatus, rupiah,
} from "@/components/common/MarketWorkspace";

/**
 * Komponen antarmuka dasbor operasional pedagang kios.
 * Mengelola siklus pasokan masuk, pembacaan kinetika susut, dan konfirmasi timbangan fisik penawaran.
 */
export function VendorDashboard() {
  const { user } = useAuth();
  const { stockItems, stockHealth, estimatedUnsoldKg, weather, offers, transactions, vendorWalletBalanceIdr, busy,
    addStockItem, createInstantSurplusOffer, approveOfferByVendor, rejectOfferByVendor } = useMarketSimulation();
  const [commodity, setCommodity] = useState(COMMODITIES[0].id);
  const [weight, setWeight] = useState("");
  const [previewKiosk, setPreviewKiosk] = useState("");
  const [selection, setSelection] = useState<{ stockId: string; proposalId?: string } | null>(null);
  const [confirmedKg, setConfirmedKg] = useState("");
  const [mode, setMode] = useState<DistributionMode | "">("");
  const [confirmationError, setConfirmationError] = useState("");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [arrivalFeedback, setArrivalFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const canManage = user?.role === "vendor" && Boolean(user.vendorId);
  const selectedKiosk = user?.role === "vendor" ? user.vendorId : previewKiosk;
  const kiosk = selectedKiosk ? kioskInfo(selectedKiosk) : undefined;
  const inventory = stockItems.filter((item) => !selectedKiosk || item.vendorId === selectedKiosk);
  const kioskOffers = offers.filter((offer) => !selectedKiosk || offer.vendorId === selectedKiosk);
  const currentOffers = kioskOffers.filter((offer) => offer.status !== "settled" && offer.status !== "rejected");
  const reserved = currentOffers.filter((offer) => offer.status === "claimed").reduce((sum, offer) => sum + offer.quantityKg, 0);
  const verifiedStockIds = new Set(inventory.filter((stock) => stock.verifiedAt).map((stock) => stock.id));
  const activeCount = currentOffers.filter((offer) => offer.status === "active" && verifiedStockIds.has(offer.stockId)).length;
  const sortedInventory = [...inventory].sort((a, b) =>
    Number(b.remainingKg > 0) - Number(a.remainingKg > 0) ||
    (stockHealth[b.id]?.decayScore ?? 0) - (stockHealth[a.id]?.decayScore ?? 0));
  const offerRank = { pending_vendor: 0, active: 1, claimed: 2, settled: 3, rejected: 4 } as const;
  const sortedOffers = [...kioskOffers].sort((a, b) => offerRank[a.status] - offerRank[b.status]);
  const selectedStock = selection && inventory.find((item) => item.id === selection.stockId);
  const selectedProposal = selection?.proposalId && kioskOffers.find((offer) => offer.id === selection.proposalId);
  const selectedEstimate = selectedStock ? estimatedUnsoldKg[selectedStock.id] ??
    (selectedProposal && selectedProposal.status === "pending_vendor" ? selectedProposal.quantityKg : undefined) : undefined;
  const selectedHealth = selectedStock ? stockHealth[selectedStock.id] : undefined;
  const selectedTier = distributionTierForDecay(selectedHealth?.decayScore ?? 0);
  const maxConfirmedKg = selectedStock ? Math.max(0, roundKg(selectedStock.initialKg - kioskOffers
    .filter((offer) => offer.stockId === selectedStock.id && (offer.status === "claimed" || offer.status === "settled"))
    .reduce((sum, offer) => sum + offer.quantityKg, 0))) : 0;
  const donationLots = kiosk ? completedDonationLots(kioskOffers, kiosk.id) : 0;
  const needsWeighing = inventory.filter((item) => item.remainingKg > 0 && !item.verifiedAt);
  const inventoryMatches = sortedInventory.filter((item) => {
    const matchesQuery = `${commodityName(item.commodityId)} ${item.lotNumber} ${kioskLabel(item.vendorId)}`
      .toLocaleLowerCase("id-ID").includes(inventoryQuery.trim().toLocaleLowerCase("id-ID"));
    return matchesQuery && (inventoryFilter === "all" || (inventoryFilter === "unverified" ? !item.verifiedAt && item.remainingKg > 0 : item.remainingKg > 0));
  });

  /**
   * Mencatat kedatangan pasokan fisik baru ke server dan mereset formulir timbangan jika berhasil.
   */
  async function recordArrival(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setArrivalFeedback(null);
    const result = await addStockItem({ commodityId: commodity, initialKg: Number(weight) });
    setArrivalFeedback({ success: result.success, message: result.message });
    if (result.success) setWeight("");
  }

  /**
   * Membuka dialog penimbangan fisik untuk lot stok yang dipilih oleh pedagang.
   */
  function openConfirmation(stockId: string, proposalId?: string) {
    setConfirmedKg("");
    setMode("");
    setConfirmationError("");
    setSelection({ stockId, proposalId });
  }

  /**
   * Menerbitkan lot penawaran ke pasar sesuai bobot aktual dan pilihan saluran distribusi pedagang.
   */
  async function confirmStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection) return;
    setConfirmationError("");
    const confirmation = {
      confirmedKg: Number(confirmedKg),
      mode: selectedTier === "tier_2" ? mode || undefined : undefined,
    };
    const result = selection.proposalId
      ? await approveOfferByVendor(selection.proposalId, confirmation)
      : await createInstantSurplusOffer(selection.stockId, confirmation);
    if (result.success) setSelection(null);
    else setConfirmationError(result.message);
  }

  return (
    <div className="grid min-w-0 gap-6">
      <section className="market-panel grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl leading-tight tracking-tight sm:text-3xl">{needsWeighing.length > 0 ? "Sisa dagangan menunggu timbangan" : "Pantau stok, siapkan penawaran"}</h2>
          <p className="mt-2 max-w-prose text-sm leading-6 text-ink-muted">
            {needsWeighing.length > 0 ? `${needsWeighing.length} lot belum memiliki sisa fisik terkonfirmasi. Timbang setelah penjualan di pasar agar penawaran dapat masuk katalog.` : "Catat pasokan masuk, lalu konfirmasi sisa fisik untuk penyaluran sesuai mutu terkini."}
          </p>
          {kiosk && <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2 font-semibold"><Store size={16} aria-hidden className="shrink-0 text-brand" />{kiosk.name}</span>
            <span className="text-ink-muted">Lapak {kiosk.stallNumber} · Blok {kiosk.block}</span>
            <StatusPill label={kiosk.verificationStatus === "verified" ? "Terverifikasi" : "Menunggu verifikasi"}
              tone={kiosk.verificationStatus === "verified" ? "success" : "warning"} />
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-ink">
              <BadgeCheck size={14} aria-hidden /> Reputasi {Math.min(100, kiosk.reputationScore + donationLots)}/100
            </span>
          </div>}
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="text-[13px] text-ink-muted">Perlu timbang</p>
            <p className="mt-1 font-serif text-4xl leading-none tabular-nums">{needsWeighing.length}<span className="ml-1.5 font-sans text-sm text-ink-muted">lot</span></p>
          </div>
          {canManage && needsWeighing[0] && <button type="button" className={marketButton} disabled={busy}
            onClick={() => {
              const stock = needsWeighing[0];
              const proposal = sortedOffers.find((offer) => offer.stockId === stock.id && (offer.status === "pending_vendor" || offer.status === "active"));
              openConfirmation(stock.id, proposal?.id);
            }}>Timbang lot berikutnya</button>}
        </div>
      </section>

      <MarketMetrics items={[
        { label: "Sisa fisik terkonfirmasi", value: kg(inventory.reduce((sum, item) => sum + (item.verifiedAt ? item.remainingKg : 0), 0)) },
        { label: "Dalam pesanan", value: kg(reserved) },
        { label: "Penawaran terbit", value: activeCount },
        { label: "Saldo dompet", value: rupiah(vendorWalletBalanceIdr) },
      ]} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
        <MarketSection
          variant="plain"
          title="Stok & mutu lot"
          action={user?.role !== "vendor" ? (
            <select aria-label="Saring kios" className="market-input w-full font-normal sm:w-56" value={previewKiosk}
              onChange={(event) => setPreviewKiosk(event.target.value)}>
              <option value="">Semua kios</option>
              {[...new Set(stockItems.map((stock) => stock.vendorId))].map((id) => <option key={id} value={id}>{kioskLabel(id)}</option>)}
            </select>
          ) : undefined}
          description={canManage ? "Lot dengan skor susut tertinggi tampil lebih dulu. Perkiraan sisa bukan pengganti hasil timbang fisik." : "Pantau sisa stok dan mutu setiap lot. Pratinjau ini tidak dapat mengubah inventaris."}
        >
          <div className="mb-4 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,0.6fr)]">
            <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-ink-muted">Cari inventaris
              <input type="search" className="market-input" placeholder="Komoditas, kode lot, atau kios" value={inventoryQuery} onChange={(event) => setInventoryQuery(event.target.value)} />
            </label>
            <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-ink-muted">Tampilkan
              <select className="market-input" value={inventoryFilter} onChange={(event) => setInventoryFilter(event.target.value)}>
                <option value="all">Semua lot</option>
                <option value="unverified">Belum ditimbang</option>
                <option value="remaining">Masih tersisa</option>
              </select>
            </label>
          </div>
          <p className="mb-3 text-xs text-ink-muted" aria-live="polite">{inventoryMatches.length} dari {inventory.length} lot</p>
          {inventoryMatches.length === 0 ? (
            <EmptyState icon={Boxes} title={inventory.length === 0 ? "Belum ada pasokan" : "Tidak ada lot yang cocok"}
              description={inventory.length === 0 ? "Catat komoditas dan berat pasokan masuk untuk memulai inventaris." : "Ubah kata pencarian atau pilih Semua lot untuk melihat inventaris lainnya."} />
          ) : (
            <ul className="grid gap-3">
              {inventoryMatches.map((item) => {
                const health = stockHealth[item.id];
                const linked = sortedOffers.find((offer) => offer.stockId === item.id && (offer.status === "active" || offer.status === "pending_vendor"));
                const reservedKg = roundKg(currentOffers
                  .filter((offer) => offer.stockId === item.id && offer.status === "claimed")
                  .reduce((sum, offer) => sum + offer.quantityKg, 0));
                const remainingForSale = roundKg(item.remainingKg - reservedKg);
                const changed = linked?.status === "active" && health && linked.targetTier !== distributionTierForDecay(health.decayScore);
                return (
                  <li key={item.id} className={`rounded-2xl border border-line p-4 sm:p-5 ${item.remainingKg === 0 ? "bg-canvas/40" : "bg-surface"}`}>
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h3 className="break-words font-serif text-xl leading-tight tracking-tight">{commodityName(item.commodityId)}</h3>
                          <span className="rounded border border-line px-1.5 py-0.5 text-[12px] font-semibold tabular-nums text-ink-muted">{item.lotNumber}</span>
                          {changed && <StatusPill label="Mutu berubah" tone="warning" />}
                        </div>
                        <LotFacts items={[
                          { label: "Stok awal", value: kg(item.initialKg) },
                          { label: "Dipesan", value: kg(reservedKg) },
                          ...(item.verifiedAt ? [
                            { label: "Sisa fisik", value: kg(item.remainingKg) },
                            { label: "Belum dipesan", value: kg(Math.max(0, remainingForSale)) },
                          ] : [
                            { label: "Sisa fisik", value: "Belum ditimbang" },
                            ...(estimatedUnsoldKg[item.id] !== undefined ? [{ label: "Perkiraan sisa", value: kg(estimatedUnsoldKg[item.id]) }] : []),
                          ]),
                          ...(linked?.status === "active" && item.verifiedAt ? [{ label: "Kuota penawaran", value: kg(linked.quantityKg) }] : []),
                        ]} />
                        {health && item.remainingKg > 0 && (
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
                                <span className="inline-flex items-center gap-1.5 font-semibold text-danger">
                                  <AlertTriangle size={14} aria-hidden />
                                  Melewati batas konsumsi pangan (fase pakan maggot)
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-ink-muted">
                              {health.condition === "segar_prima" && "Kondisi segar prima untuk pasar retail."}
                              {health.condition === "layu_ringan" && "Kondisi layu ringan (Tier 1: Warteg & UMKM). Diskon dinamis 50%–70%."}
                              {health.condition === "layu_sedang" && "Kondisi layu sedang (Tier 2: Dapur Sosial). Tentukan jual subsidi atau donasi."}
                              {health.condition === "tidak_layak" && "Kondisi afkir non-pangan (Tier 3: Sentra Maggot BSF gratis)."}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                        {linked ? (
                          <>
                            <StatusPill label={linked.status === "active" && !item.verifiedAt ? "Perlu timbang" : orderStatus(linked)} />
                            <TierChip tier={linked.targetTier} />
                          </>
                        ) : (
                          <span className="text-[13px] text-ink-muted">{item.remainingKg === 0 ? "Stok habis" : "Belum ditawarkan"}</span>
                        )}
                        {canManage && remainingForSale > 0 && (!linked || linked.status === "pending_vendor" || !item.verifiedAt) && (
                          <button type="button" className={marketButton} disabled={busy} onClick={() => openConfirmation(item.id, linked?.id)}>
                            Timbang & konfirmasi
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

        <div className="grid min-w-0 gap-4 xl:sticky xl:top-20 xl:self-start">
          {canManage && (
            <MarketSection title="Pasokan masuk" description="Catat berat saat komoditas tiba di kios. Sisa fisik ditimbang terpisah setelah penjualan.">
              <form onSubmit={recordArrival} className="grid gap-4" aria-busy={busy}>
                <label className="grid gap-1.5 text-sm font-semibold">Komoditas
                  <select className="market-input" value={commodity} onChange={(event) => setCommodity(event.target.value)}>
                    {COMMODITIES.map((item) => <option key={item.id} value={item.id}>{item.localName}</option>)}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-semibold">Berat stok awal
                  <span className="relative block">
                    <input className="market-input pr-12" type="number" inputMode="numeric" required min="1" max="10000" step="1"
                      value={weight} onChange={(event) => setWeight(event.target.value)} />
                    <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-normal text-ink-muted">kg</span>
                  </span>
                </label>
                <button type="submit" className={marketButton + " w-full justify-center"} disabled={busy}>
                  <PackagePlus size={16} aria-hidden /> {busy ? "Menyimpan…" : "Catat pasokan masuk"}
                </button>
                {arrivalFeedback && <p role={arrivalFeedback.success ? "status" : "alert"} className={`text-sm leading-5 ${arrivalFeedback.success ? "text-brand-ink" : "text-danger"}`}>{arrivalFeedback.message}</p>}
              </form>
            </MarketSection>
          )}

          <aside className="rounded-2xl bg-brand-deep p-5 text-cream">
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
              <p className="mt-3 text-sm leading-6 text-sage-soft">Data cuaca belum tersedia. Perkiraan mutu akan mengikuti pembaruan kondisi pasar.</p>
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

      <MarketSection title="Penawaran & persetujuan" description="Usulan sistem belum masuk katalog. Konfirmasi hasil timbang untuk menerbitkannya, atau tolak bila tidak sesuai."
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
                  <p className="break-words font-semibold">{offer.status === "pending_vendor" || (offer.status === "active" && !verifiedStockIds.has(offer.stockId))
                    ? commodityName(offer.commodityId) : offerTitle(offer)}</p>
                  <TierChip tier={offer.targetTier} />
                </div>
                <p className="mt-1 break-words text-[13px] leading-5 text-ink-muted">
                  {offer.status === "pending_vendor" || (offer.status === "active" && !verifiedStockIds.has(offer.stockId))
                    ? "Perkiraan sisa " + kg(estimatedUnsoldKg[offer.stockId] ?? offer.quantityKg) + " · Belum masuk katalog"
                    : isDonation(offer) ? "Donasi · Gratis" : rupiah(offer.salvagePricePerKg) + "/kg · Total " + rupiah(offer.totalAmountIdr)}
                  {offer.claimedBy ? ", " + offer.claimedBy : ""}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <StatusPill label={offer.status === "active" && !verifiedStockIds.has(offer.stockId) ? "Perlu timbang" : orderStatus(offer)} />
                {canManage && (offer.status === "pending_vendor" || (offer.status === "active" && !verifiedStockIds.has(offer.stockId))) && (
                  <button className={marketButton} type="button" disabled={busy} onClick={() => openConfirmation(offer.stockId, offer.id)}>Timbang & setujui</button>
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

      <MarketSection title="Pembayaran & pencairan" description="Dana escrow dicairkan ke dompet setelah serah terima selesai. Donasi dan biomassa gratis tidak memerlukan pembayaran.">
        {transactions.length === 0 ? (
          <EmptyState icon={Receipt} title="Belum ada transaksi" description="Transaksi pembayaran dan pelepasan dana escrow akan tercatat di sini." />
        ) : (
          <ul>{transactions.map((item) => (
            <li key={item.id} className="grid min-w-0 gap-2 border-b border-line py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="break-words font-semibold">{item.commodityName}</p>
                  <p className="font-semibold tabular-nums text-brand-ink">{rupiah(item.amountIdr)}</p>
                </div>
                <p className="mt-1 min-w-0 break-words text-[13px] leading-5 text-ink-muted">
                  Pembeli: {item.buyerName} · {item.releasedAt ? "Dicairkan " + dateLabel(item.releasedAt) : "Dibuat " + dateLabel(item.createdAt)}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <StatusPill label={item.status === "released" ? "Selesai dicairkan" : item.status === "refunded" ? "Dikembalikan" : "Ditahan di escrow"}
                  tone={item.status === "released" ? "success" : item.status === "refunded" ? "danger" : "info"} />
              </div>
            </li>
          ))}</ul>
        )}
      </MarketSection>

      {selectedStock && <MarketDialog title="Konfirmasi sisa fisik" onClose={() => { if (!busy) setSelection(null); }}>
        <form className="grid gap-4" onSubmit={confirmStock} aria-busy={busy}>
          <p className="text-sm leading-6 text-ink-muted">{commodityName(selectedStock.commodityId)} · {selectedStock.lotNumber}</p>
          {selectedEstimate !== undefined && (
            <div className="rounded-lg border border-line bg-canvas p-3 text-sm">
              <p>Stok awal <strong>{kg(selectedStock.initialKg)}</strong> · Perkiraan sisa <strong>{kg(selectedEstimate)}</strong></p>
              <p className="mt-1 text-ink-muted">Timbang sisa yang benar-benar ada sebelum penawaran masuk katalog.</p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas p-3 text-sm">
            <span>Jalur berdasarkan mutu terkini</span><TierChip tier={selectedTier} />
          </div>
          {selectedHealth && (
            <div className="rounded-lg border border-line bg-canvas p-3 text-xs leading-5 text-ink-muted">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span>Kondisi mutu Arrhenius:</span>
                <strong className="text-ink">{selectedHealth.tierLabel || selectedHealth.condition} (Skor {(selectedHealth.decayScore * 100).toFixed(0)}/100)</strong>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Dipajang: <strong className="text-ink">{formatElapsedHours(selectedHealth.hoursElapsed)}</strong></span>
                <span>Sisa simpan sampai busuk: <strong className="text-ink">{formatRemainingShelfLife(selectedHealth.hoursRemaining, selectedHealth.decayScore)}</strong></span>
              </div>
            </div>
          )}
          <div>
            <label htmlFor="confirmed-weight" className="mb-1.5 block text-sm font-semibold">Sisa fisik setelah penjualan di pasar (kg)</label>
            <input id="confirmed-weight" className="market-input" type="number" inputMode="numeric" min="0" step="1" max={Math.floor(maxConfirmedKg)}
              required value={confirmedKg} onChange={(event) => setConfirmedKg(event.target.value)} />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {[1, 2, 3, 4, 5, 10, 20].filter((n) => n <= maxConfirmedKg).map((val) => (
                <button key={val} type="button" className="min-h-11 min-w-11 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand"
                  onClick={() => setConfirmedKg(String(val))}>
                  {val} kg
                </button>
              ))}
              {selectedEstimate !== undefined && selectedEstimate > 0 && selectedEstimate <= maxConfirmedKg && (
                <button key="estimate" type="button" className="min-h-11 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
                  onClick={() => setConfirmedKg(String(Math.round(selectedEstimate)))}>
                  Perkiraan ({Math.round(selectedEstimate)} kg)
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs leading-5 text-ink-muted">Timbang sisa fisik bulat (1, 2, 3, dst.) di luar pesanan PASARIN. Maksimal {kg(maxConfirmedKg)}. Masukkan 0 jika sudah habis.</p>
          </div>
          {selectedTier === "tier_2" && (
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold">Cara penyaluran ke dapur sosial</legend>
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm">
                <input type="radio" name="distribution-mode" value="sale" checked={mode === "sale"} onChange={() => setMode("sale")} required={Number(confirmedKg) > 0} /> Jual dengan harga penawaran
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm">
                <input type="radio" name="distribution-mode" value="donation" checked={mode === "donation"} onChange={() => setMode("donation")} required={Number(confirmedKg) > 0} /> Donasikan tanpa biaya
              </label>
              <p className="text-xs leading-5 text-ink-muted">Reputasi bertambah 1 poin setelah donasi lot ini diserahterimakan, maksimal 100.</p>
            </fieldset>
          )}
          {confirmationError && <p role="alert" className="text-sm font-medium text-danger">{confirmationError}</p>}
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <button type="submit" className={marketButton + " justify-center"} disabled={busy}>{busy ? "Menyimpan…" : confirmedKg !== "" && Number(confirmedKg) === 0 ? "Catat stok habis" : "Konfirmasi & terbitkan"}</button>
            <button type="button" className={marketSecondary + " justify-center"} disabled={busy} onClick={() => setSelection(null)}>Batal</button>
          </div>
        </form>
      </MarketDialog>}
    </div>
  );
}
