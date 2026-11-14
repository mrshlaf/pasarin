/**
 * Dasbor Ruang Kerja Armada Logistik dan Kurir Pengantaran Pasar (PSR-27).
 * Mengelola manifes antrean pengantaran muatan tersegregasi berdasarkan 3 tahapan sirkular,
 * kalkulasi penugasan jenis kendaraan (Viar Roda Tiga vs GranMax Pikap vs Isuzu Truk),
 * serta konfirmasi serah terima muatan (Proof-of-Delivery) untuk pelepasan instan dana rekening escrow.
 */

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
    color: "bg-canvas text-ink",
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

/**
 * Komponen dasbor operasional kurir pengantar.
 * Menampilkan antrean muatan berdasarkan tahapan sirkular dan memfasilitasi konfirmasi serah terima barang.
 */
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

  /**
   * Menyelesaikan serah terima pengantaran lot pesanan dan memperbarui status pesanan di seluruh dasbor peran.
   */
  async function finish() {
    if (!selected) return;
    const result = await confirmDelivery(selected.id);
    if (result.success) setSelected(null);
    else setError(result.message);
  }

  return (
    <div className="grid min-w-0 gap-6">
      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <PhaseIcon size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-2xl leading-tight tracking-tight sm:text-3xl">
              {activePhase === "all" ? "Manifes pengantaran" : currentPhaseConfig.label}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{currentPhaseConfig.description}</p>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0">
            <dt className="text-xs font-medium text-ink-muted">Jendela rencana</dt>
            <dd className="mt-1 text-sm font-semibold">{currentPhaseConfig.window}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-medium text-ink-muted">Rekomendasi armada</dt>
            <dd className="mt-1 break-words text-sm font-semibold">{assignedVehicle}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-medium text-ink-muted">Pengemudi dalam konfigurasi</dt>
            <dd className="mt-1 text-sm font-semibold">{assignedDriver}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-medium text-ink-muted">Muatan tercatat di tahap ini</dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums">{kg(currentBatchTotalKg)} <span className="font-normal text-ink-muted">termasuk selesai</span></dd>
          </div>
        </dl>
        {activePhase !== "all" && "thresholdKg" in currentPhaseConfig && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-canvas p-3 text-sm">
            <span className="flex items-center gap-2"><Clock size={16} aria-hidden /> Rencana berangkat {currentPhaseConfig.departureClock}</span>
            <StatusPill
              label={currentQueueKg >= currentPhaseConfig.thresholdKg ? "Ambang muatan terpenuhi" : "Menunggu muatan kloter"}
              tone={currentQueueKg >= currentPhaseConfig.thresholdKg ? "success" : "warning"}
            />
            <span className="tabular-nums text-ink-muted">{kg(currentQueueKg)} / {kg(currentPhaseConfig.thresholdKg)}</span>
          </div>
        )}
        <p className="mt-4 text-xs leading-5 text-ink-muted">Jadwal, kendaraan, dan pengemudi adalah rencana dari konfigurasi simulasi, bukan pelacakan armada langsung. Status pengantaran mengikuti konfirmasi serah terima.</p>
      </section>

      {/* Tabs Pemilih Tahapan Sirkular */}
      <nav aria-label="Tahapan pengantaran logistik" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
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
              aria-pressed={isActive}
              className={`flex min-h-14 min-w-0 items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                isActive
                  ? "border-brand bg-brand text-cream"
                  : "border-line-strong bg-surface text-ink hover:bg-canvas"
              }`}
            >
              <IconComponent size={16} className="shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">{phase.shortLabel}</span>
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-md text-xs tabular-nums ${
                  isActive ? "bg-cream text-brand-ink" : "bg-canvas text-ink-muted"
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
          { label: "Muatan menunggu antar", value: kg(currentQueueKg) },
          { label: "Dana ditahan", value: rupiah(currentHeldAmount) },
          { label: "Selesai", value: filteredCompleted.length },
        ]}
      />

      {/* Daftar Antrean Pengantaran */}
      <MarketSection
        variant="plain"
        title={`Antrean ${activePhase === "all" ? "Semua Tahap" : currentPhaseConfig.shortLabel}`}
        description="Yuk periksa titik jemput kios, lokasi tujuan mitra, dan pastikan serah terima muatan berjalan lancar!"
      >
        {filteredQueue.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={`Belum ada antrean ${currentPhaseConfig.shortLabel}`}
            description={
              activePhase === "all"
                ? "Bagus! Semua pesanan sudah terantar. Pesanan baru yang dibayar atau siap didonasikan akan langsung tampil di sini."
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
              const cardVehicle = getOfferVehicleBadge(offer.targetTier);
              const lotNumber = stockById.get(offer.stockId)?.lotNumber;

              return (
                <li key={offer.id} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill label="Siap diantar" tone="info" />
                        <TierChip tier={offer.targetTier} />
                        <span className="inline-flex items-center gap-1.5 text-xs leading-5 text-ink-muted">
                          <Truck size={14} className="shrink-0" aria-hidden /> Rencana: {cardVehicle}
                        </span>
                      </div>

                      <h3 className="mt-3 break-words font-serif text-xl leading-tight tracking-tight sm:text-2xl">
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
                          <p className="ml-7 mt-1 text-sm text-ink-muted">
                            <a href={`tel:${buyer.phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-11 items-center gap-2 rounded-md underline decoration-line-strong underline-offset-4 hover:text-brand-ink">
                              <Phone size={14} className="shrink-0" aria-hidden />
                              {buyer.ownerName ? `${buyer.ownerName} (${buyer.phone})` : buyer.phone}
                            </a>
                          </p>
                        )}
                      </div>

                      {stockHealth[offer.stockId] && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
                          <Clock size={13} aria-hidden className="text-brand shrink-0" />
                          <span>
                            Estimasi sisa simpan: {" "}
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
        description="Buku besar pembayaran: dana ditahan, disalurkan setelah serah terima, atau dikembalikan. Catatan ini mencakup semua tahap."
      >
        {transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Belum ada transaksi"
            description="Pembayaran akan tercatat di sini beserta status penahanan dan pelepasan dananya."
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
          <p className="mt-3 text-sm leading-6 text-ink-muted">Konfirmasi hanya setelah penerima menerima barang. Untuk pesanan berbayar, tindakan ini juga melepas dana yang ditahan.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={marketButton} disabled={busy} onClick={finish}>
              {busy ? "Menyimpan…" : "Konfirmasi barang diterima"}
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
