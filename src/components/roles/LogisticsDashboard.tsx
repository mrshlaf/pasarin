"use client";

import { useState } from "react";
import {
  Clock,
  HeartHandshake,
  Layers,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  Receipt,
  Recycle,
  Store,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { isDonation, isFreeMaggotOffer, isReadyForDelivery, type RescueOffer } from "@/types/market";
import { CIRCULAR_BUYERS } from "@/data/buyers";
import { calculateFleetAllocation } from "@/lib/fleetCargoCalculator";
import { useAuth } from "@/lib/authContext";
import { useMarketSimulation } from "@/lib/simulationStore";
import { MarketDialog } from "@/components/common/MarketDialog";
import {
  EmptyState,
  LotFacts,
  MarketMetrics,
  MarketSection,
  StatusPill,
  TierChip,
  commodityName,
  dateLabel,
  formatRemainingShelfLife,
  kg,
  kioskLabel,
  marketButton,
  marketSecondary,
  rupiah,
} from "@/components/common/MarketWorkspace";

type DispatchPhase = "all" | "tier_1" | "tier_2" | "tier_3";

const DISPATCH_PHASES = [
  {
    id: "all" as const,
    label: "Semua Tahap",
    shortLabel: "Semua",
    window: "15:00 - 21:00 WIB",
    description: "Seluruh antrean pengantaran armada pasar",
    icon: Layers,
    color: "bg-surface-muted text-ink",
    vehicle: "Armada Terpadu Pangkalan",
    driver: "Tim Logistik Pasar",
  },
  {
    id: "tier_1" as const,
    label: "Tahap 1: Warteg",
    shortLabel: "Tahap 1: Warteg",
    window: "15:00 - 17:00 WIB",
    departureClock: "Pukul 15:30 WIB",
    thresholdKg: 200,
    description: "Penyelamatan pangan segar layu untuk konsumsi makan malam warteg",
    icon: UtensilsCrossed,
    color: "bg-tier-1-soft text-tier-1-ink",
    vehicle: "Daihatsu GranMax Pikap Bak (B 9812 SAA)",
    driver: "Pak Hendra Wijaya",
  },
  {
    id: "tier_2" as const,
    label: "Tahap 2: Dapur Sosial",
    shortLabel: "Tahap 2: Dapur Sosial",
    window: "17:00 - 18:30 WIB",
    departureClock: "Pukul 17:30 WIB",
    thresholdKg: 75,
    description: "Distribusi pangan darurat ke panti asuhan & dapur umum",
    icon: HeartHandshake,
    color: "bg-tier-2-soft text-tier-2-ink",
    vehicle: "Motor Viar Roda Tiga (B 4521 TXX)",
    driver: "Pak Joko Santoso",
  },
  {
    id: "tier_3" as const,
    label: "Tahap 3: Sentra Maggot",
    shortLabel: "Tahap 3: Maggot",
    window: "18:30 - 21:00 WIB",
    departureClock: "Pukul 19:00 WIB",
    thresholdKg: 150,
    description: "Pengangkutan limbah organik afkir menuju fasilitas biokonversi TPS 3R",
    icon: Recycle,
    color: "bg-tier-3-soft text-tier-3-ink",
    vehicle: "Viar Roda Tiga TPS 3R (B 3319 BSF)",
    driver: "Bpk. Rahmat Hidayat",
  },
] as const;

/** Presents the circular phase-segmented dispatch queue and lets couriers confirm handover. */
export function LogisticsDashboard() {
  const { user } = useAuth();
  const { offers, stockItems, stockHealth, transactions, confirmDelivery, busy } = useMarketSimulation();
  const [activePhase, setActivePhase] = useState<DispatchPhase>("all");
  const [selected, setSelected] = useState<RescueOffer | null>(null);
  const [error, setError] = useState("");

  const queue = offers.filter(isReadyForDelivery);
  const completed = offers.filter((offer) => offer.status === "settled");
  const stockById = new Map(stockItems.map((item) => [item.id, item]));
  const selectedStock = selected && stockById.get(selected.stockId);

  // Filter antrean berdasarkan tahapan sirkular yang dipilih
  const filteredQueue = activePhase === "all"
    ? queue
    : queue.filter((offer) => offer.targetTier === activePhase);

  const filteredCompleted = activePhase === "all"
    ? completed
    : completed.filter((offer) => offer.targetTier === activePhase);

  // Perhitungan muatan per tahapan
  const currentQueueKg = filteredQueue.reduce((sum, offer) => sum + offer.quantityKg, 0);
  const currentCompletedKg = filteredCompleted.reduce((sum, offer) => sum + offer.quantityKg, 0);
  const currentBatchTotalKg = currentQueueKg + currentCompletedKg;
  const currentHeldAmount = filteredQueue.reduce((sum, offer) => sum + offer.totalAmountIdr, 0);

  // Informasi konfigurasi fase aktif
  const currentPhaseConfig = DISPATCH_PHASES.find((p) => p.id === activePhase) ?? DISPATCH_PHASES[0];
  const PhaseIcon = currentPhaseConfig.icon;

  // Alokasi armada cerdas untuk tahapan aktif
  const fleet = calculateFleetAllocation(currentBatchTotalKg > 0 ? currentBatchTotalKg : (currentQueueKg > 0 ? currentQueueKg : 1));
  const assignedVehicle = activePhase === "tier_1"
    ? (currentBatchTotalKg > 300 ? "Daihatsu GranMax Pikap Bak (B 9812 SAA)" : "Motor Viar Roda Tiga (B 4521 TXX)")
    : activePhase === "tier_2"
      ? "Motor Viar Roda Tiga (B 4521 TXX)"
      : activePhase === "tier_3"
        ? "Viar Roda Tiga TPS 3R (B 3319 BSF)"
        : `${fleet.vehicleSpec.displayName} (${fleet.vehicleSpec.licensePlate})`;

  const assignedDriver = activePhase === "tier_1"
    ? (currentBatchTotalKg > 300 ? "Pak Hendra Wijaya" : "Pak Joko Santoso")
    : activePhase === "tier_2"
      ? "Pak Joko Santoso"
      : activePhase === "tier_3"
        ? "Bpk. Rahmat Hidayat"
        : fleet.recommendedDriver;

  /** Menentukan badge armada untuk setiap kartu order */
  function getOfferVehicleBadge(targetTier: "tier_1" | "tier_2" | "tier_3") {
    if (targetTier === "tier_3") return "Viar TPS 3R (B 3319 BSF)";
    if (targetTier === "tier_2") return "Motor Viar Roda 3 (B 4521 TXX)";
    return currentBatchTotalKg > 300 ? "GranMax Pikap Bak (B 9812 SAA)" : "Motor Viar Roda 3 (B 4521 TXX)";
  }

  function getTierBadge(targetTier: "tier_1" | "tier_2" | "tier_3") {
    if (targetTier === "tier_1") return { label: "Tahap 1 · Warteg", style: "bg-tier-1-soft text-tier-1-ink" };
    if (targetTier === "tier_2") return { label: "Tahap 2 · Dapur Sosial", style: "bg-tier-2-soft text-tier-2-ink" };
    return { label: "Tahap 3 · Maggot", style: "bg-tier-3-soft text-tier-3-ink" };
  }

  /** Completes one order, then lets the refreshed server snapshot update every role. */
  async function finish() {
    if (!selected) return;
    const result = await confirmDelivery(selected.id);
    if (result.success) setSelected(null);
    else setError(result.message);
  }

  return (
    <div className="grid gap-4">
      {/* Banner Utama Manifes Rute Kurir */}
      <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
            <PhaseIcon size={22} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words font-serif text-2xl leading-tight tracking-tight">
                {activePhase === "all" ? "Pengantaran Hari Ini" : currentPhaseConfig.label}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
                <Truck size={12} className="text-brand" aria-hidden /> {assignedVehicle}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {currentPhaseConfig.window} · {currentPhaseConfig.description}
            </p>
            <p className="mt-0.5 text-xs font-medium text-ink-muted">
              Pengemudi: <span className="text-ink font-semibold">{assignedDriver}</span> · Muatan awal rute:{" "}
              <span className="tabular-nums font-semibold">{kg(currentBatchTotalKg)}</span> (Sisa di bak:{" "}
              <span className="tabular-nums font-semibold text-brand">{kg(currentQueueKg)}</span>)
            </p>
            {activePhase !== "all" && "thresholdKg" in currentPhaseConfig && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md border border-line bg-cream px-2.5 py-0.5 font-medium text-ink-muted">
                  <Clock size={11} className="text-brand" aria-hidden /> Jadwal Berangkat: {currentPhaseConfig.departureClock}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-line bg-cream px-2.5 py-0.5 font-medium text-ink-muted">
                  <PackageCheck size={11} className="text-brand" aria-hidden />
                  {currentQueueKg >= currentPhaseConfig.thresholdKg
                    ? `Siap Berangkat (Ambang ${kg(currentPhaseConfig.thresholdKg)} Terpenuhi)`
                    : `Menunggu Kloter (Target Ambang: ${kg(currentPhaseConfig.thresholdKg)})`}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tabs Pemilih Tahapan Sirkular */}
      <nav aria-label="Tahapan pengantaran logistik" className="flex flex-wrap items-center gap-2">
        {DISPATCH_PHASES.map((phase) => {
          const count = phase.id === "all"
            ? queue.length
            : queue.filter((offer) => offer.targetTier === phase.id).length;
          const isActive = activePhase === phase.id;
          const IconComponent = phase.icon;

          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => setActivePhase(phase.id)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold transition ${
                isActive
                  ? "bg-brand text-cream shadow-sm"
                  : "border border-line bg-surface text-ink hover:border-brand/40 hover:bg-cream"
              }`}
            >
              <IconComponent size={14} aria-hidden />
              <span>{phase.shortLabel}</span>
              <span
                className={`grid size-5 place-items-center rounded-full text-[11px] tabular-nums ${
                  isActive ? "bg-cream/20 text-cream" : "bg-cream-shade text-ink-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Metrik Terfilter Sesuai Tahap */}
      <MarketMetrics
        items={[
          { label: "Siap diantar", value: filteredQueue.length },
          { label: "Sisa di bak", value: kg(currentQueueKg) },
          { label: "Dana ditahan", value: rupiah(currentHeldAmount) },
          { label: "Selesai", value: filteredCompleted.length },
        ]}
      />

      {/* Daftar Antrean Pengantaran */}
      <MarketSection
        variant="plain"
        title={`Antrean ${activePhase === "all" ? "Semua Tahap" : currentPhaseConfig.shortLabel}`}
      >
        {filteredQueue.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={`Belum ada antrean ${currentPhaseConfig.shortLabel}`}
            description={
              activePhase === "all"
                ? "Lot gratis, donasi, dan pesanan yang sudah dibayar akan muncul di sini."
                : `Tidak ada pesanan aktif pada ${currentPhaseConfig.label} saat ini.`
            }
          />
        ) : (
          <ul className="grid gap-3">
            {filteredQueue.map((offer) => {
              const buyer = CIRCULAR_BUYERS.find(
                (b) =>
                  b.name === offer.claimedBy ||
                  b.id === offer.claimedById ||
                  (offer.claimedBy && b.name.includes(offer.claimedBy))
              );
              const tierBadge = getTierBadge(offer.targetTier);
              const cardVehicle = getOfferVehicleBadge(offer.targetTier);
              const lotNumber = stockById.get(offer.stockId)?.lotNumber;

              return (
                <li key={offer.id} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill label="Siap diantar" tone="info" />
                        <TierChip tier={offer.targetTier} />
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${tierBadge.style}`}>
                          {tierBadge.label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-line bg-cream px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                          <Truck size={11} aria-hidden /> {cardVehicle}
                        </span>
                      </div>

                      <h3 className="mt-2 break-words font-serif text-lg leading-tight tracking-tight">
                        {commodityName(offer.commodityId)}, {kg(offer.quantityKg)}
                      </h3>

                      {lotNumber && (
                        <p className="mt-1 text-[13px] text-ink-muted">{lotNumber}</p>
                      )}

                      <div className="mt-2.5 grid gap-0 text-[13px]">
                        <p className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden
                            className="grid size-5 shrink-0 place-items-center rounded-full border border-line text-brand"
                          >
                            <Store size={11} />
                          </span>
                          <span className="min-w-0 break-words">{kioskLabel(offer.vendorId)}</span>
                        </p>
                        <span aria-hidden className="ml-2.5 h-2.5 border-l border-dashed border-line-strong/60" />
                        <p className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden
                            className="grid size-5 shrink-0 place-items-center rounded-full border border-line text-brand"
                          >
                            <MapPin size={11} />
                          </span>
                          <span className="min-w-0 break-words font-semibold">{offer.claimedBy ?? "Penerima"}</span>
                        </p>
                        {buyer?.address && (
                          <p className="ml-7 mt-1 flex items-center gap-1.5 text-[12px] text-ink-muted">
                            <Navigation size={11} className="shrink-0 text-brand" aria-hidden /> {buyer.address}
                          </p>
                        )}
                        {buyer?.phone && (
                          <p className="ml-7 mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-muted">
                            <Phone size={11} className="shrink-0 text-brand" aria-hidden />{" "}
                            {buyer.ownerName ? `${buyer.ownerName} (${buyer.phone})` : buyer.phone}
                          </p>
                        )}
                      </div>

                      {stockHealth[offer.stockId] && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
                          <Clock size={13} aria-hidden className="text-brand shrink-0" />
                          <span>
                            Prioritas antar: sisa simpan{" "}
                            <strong className="font-semibold text-ink">
                              {formatRemainingShelfLife(
                                stockHealth[offer.stockId]?.hoursRemaining ?? 0,
                                stockHealth[offer.stockId]?.decayScore
                              )}
                            </strong>
                          </span>
                        </p>
                      )}
                    </div>

                    {isFreeMaggotOffer(offer) ? (
                      <StatusPill label="Gratis" tone="success" />
                    ) : isDonation(offer) ? (
                      <StatusPill label="Donasi" tone="success" />
                    ) : (
                      <p className="text-base font-semibold tabular-nums">{rupiah(offer.totalAmountIdr)}</p>
                    )}
                  </div>

                  {user?.role === "logistics" && (
                    <button
                      type="button"
                      className={marketButton + " mt-3 w-full sm:w-auto"}
                      disabled={busy}
                      onClick={() => {
                        setError("");
                        setSelected(offer);
                      }}
                    >
                      Serah terima
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </MarketSection>

      {/* Riwayat Pengantaran */}
      <MarketSection title={`Riwayat Selesai ${activePhase === "all" ? "" : `(${currentPhaseConfig.shortLabel})`}`}>
        {filteredCompleted.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="Belum ada riwayat"
            description="Riwayat pengantaran muncul setelah kurir menyelesaikan serah terima barang."
          />
        ) : (
          <ul>
            {filteredCompleted.map((offer) => (
              <li
                key={offer.id}
                className="grid min-w-0 gap-3 border-b border-line py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words font-semibold">
                      {commodityName(offer.commodityId)}, {kg(offer.quantityKg)}
                    </p>
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[10px] font-medium ${getTierBadge(offer.targetTier).style}`}>
                      {getTierBadge(offer.targetTier).label}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-[13px] leading-5 text-ink-muted">
                    {kioskLabel(offer.vendorId)} ke {offer.claimedBy ?? "Penerima"}
                    {offer.deliveredOn ? ", " + dateLabel(offer.deliveredOn) : ""}
                  </p>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-ink-muted">
                    {isFreeMaggotOffer(offer) ? "Gratis" : isDonation(offer) ? "Donasi" : rupiah(offer.totalAmountIdr)}
                  </span>
                  <StatusPill label="Selesai" tone="success" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </MarketSection>

      {/* Riwayat Transaksi & Serah Terima (Escrow Release Ledger) */}
      <MarketSection
        title="Riwayat transaksi & serah terima"
        description="Catatan pelepasan dana escrow yang telah diserahterimakan ke penerima."
      >
        {transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum ada transaksi"
            description="Transaksi yang berhasil diserahterimakan akan tercatat di sini."
          />
        ) : (
          <ul>
            {transactions.map((item) => (
              <li
                key={item.id}
                className="grid min-w-0 gap-2 border-b border-line py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="break-words font-semibold">{item.commodityName}</p>
                    <p className="font-semibold tabular-nums text-brand-ink">{rupiah(item.amountIdr)}</p>
                  </div>
                  <p className="mt-1 min-w-0 break-words text-[13px] leading-5 text-ink-muted">
                    {item.vendorName} ke {item.buyerName} ·{" "}
                    {item.releasedAt ? "Selesai " + dateLabel(item.releasedAt) : "Dibuat " + dateLabel(item.createdAt)}
                  </p>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <StatusPill
                    label={
                      item.status === "released"
                        ? "Selesai disalurkan"
                        : item.status === "refunded"
                          ? "Dikembalikan"
                          : "Dana ditahan"
                    }
                    tone={
                      item.status === "released"
                        ? "success"
                        : item.status === "refunded"
                          ? "danger"
                          : "info"
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </MarketSection>

      {/* Modal Dialog Konfirmasi Serah Terima */}
      {selected && (
        <MarketDialog title="Konfirmasi serah terima" onClose={() => setSelected(null)}>
          <div className="grid gap-1 border-y border-line py-3.5 text-sm">
            <p className="font-semibold">{commodityName(selected.commodityId)}</p>
            <LotFacts
              items={[
                ...(selectedStock ? [{ label: "Kode lot", value: selectedStock.lotNumber }] : []),
                { label: "Muatan pesanan", value: kg(selected.quantityKg) },
              ]}
            />
            <p className="mt-1 leading-5 text-ink-muted">
              {kioskLabel(selected.vendorId)} ke {selected.claimedBy ?? "penerima"}
            </p>
            <p className="mt-1 font-semibold tabular-nums">
              {isFreeMaggotOffer(selected)
                ? "Lot Maggot gratis"
                : isDonation(selected)
                  ? "Donasi tanpa pembayaran"
                  : rupiah(selected.totalAmountIdr)}
            </p>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={marketButton} disabled={busy} onClick={finish}>
              {busy ? "Menyimpan…" : "Konfirmasi"}
            </button>
            <button type="button" className={marketSecondary} onClick={() => setSelected(null)}>
              Batal
            </button>
          </div>
        </MarketDialog>
      )}
    </div>
  );
}
