"use client";

/**
 * Dasbor Peran Pedagang Lapak Pasar Induk Kramat Jati (VendorDashboard) (Clean Swiss Minimalist).
 * Mengelola:
 * 1. Manajemen inventaris komoditas los basah & pencatatan pasokan masuk.
 * 2. Pemantauan kinetika peluruhan biologis Arrhenius-Q10 & sisa jam simpan aman.
 * 3. Persetujuan 1-ketuk penawaran surplus terdiskon (Tier 1 Warteg / Tier 2 Sosial).
 * 4. Dompet saldo pencairan rekening escrow QRIS.
 */

import { useState } from "react";
import { useMarketSimulation, StockItem } from "@/lib/simulationStore";
import { KIOSKS } from "@/data/kiosks";
import { COMMODITIES } from "@/data/commodities";
import {
  Store,
  Wallet,
  ShieldCheck,
  Plus,
  Check,
  CheckCircle2,
  X,
  Clock,
  Sparkles,
  Package,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";

export function VendorDashboard() {
  const {
    selectedVendorId,
    setSelectedVendorId,
    stockItems,
    addStockItem,
    createInstantSurplusOffer,
    offers,
    vendorWalletBalanceIdr,
    getEvaluationForStock,
    approveOfferByVendor,
    rejectOfferByVendor,
    stageConfig,
  } = useMarketSimulation();

  const currentVendor =
    KIOSKS.find((k) => k.id === selectedVendorId) || KIOSKS[0];

  const vendorStocks = stockItems.filter(
    (s) => s.vendorId === selectedVendorId
  );

  const activeStocks = vendorStocks.filter((s) => s.remainingKg > 0);
  const completedStocks = vendorStocks.filter((s) => s.remainingKg === 0);
  const [stockViewTab, setStockViewTab] = useState<"aktif" | "riwayat">("aktif");

  const vendorOffers = offers.filter(
    (o) => o.vendorId === selectedVendorId
  );

  const pendingOffers = vendorOffers.filter(
    (o) => o.status === "pending_vendor"
  );

  const [showAddStock, setShowAddStock] = useState(false);
  const [selectedCommodityId, setSelectedCommodityId] = useState(
    COMMODITIES[0].id
  );
  const [inputKg, setInputKg] = useState("50");

  const totalStockKg = vendorStocks.reduce((acc, s) => acc + s.remainingKg, 0);
  const totalPendingSalvageValueIdr = pendingOffers.reduce((acc, o) => acc + o.totalAmountIdr, 0);

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    const kg = parseFloat(inputKg) || 30;
    const newStock: StockItem = {
      id: `stk_custom_${Date.now()}`,
      vendorId: selectedVendorId,
      commodityId: selectedCommodityId,
      initialKg: kg,
      remainingKg: kg,
      arrivalClock: stageConfig.clockTime,
      lotNumber: `LOT-${currentVendor.stallNumber}-${Math.floor(
        Math.random() * 90 + 10
      )}`,
      createdAt: new Date().toISOString(),
    };
    addStockItem(newStock);
    setShowAddStock(false);
  };

  return (
    <div className="space-y-4">
      {/* Vendor Profile & Wallet Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F0F6F6] text-[#2A5C5F] border border-[#D1E1E2] flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {currentVendor.name}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-[#065F46] border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-[#047857]" />
                  Izin Resmi Perumda
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  Lapak {currentVendor.stallNumber} (Blok {currentVendor.block})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {currentVendor.ownerName} · {currentVendor.phone} · {currentVendor.addressDetails}
              </p>
            </div>
          </div>

          {/* Stall Switcher & Escrow Wallet */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="w-full sm:w-auto">
              <label
                htmlFor="kiosk-select"
                className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1"
              >
                Ganti Kios
              </label>
              <select
                id="kiosk-select"
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full sm:w-52 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#2A5C5F]"
              >
                {KIOSKS.map((k) => (
                  <option key={k.id} value={k.id}>
                    [{k.stallNumber}] {k.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[#F0F6F6] border border-[#D1E1E2] rounded-lg p-2.5 shrink-0 min-w-40">
              <div className="flex items-center justify-between text-xs text-[#2A5C5F] font-semibold mb-0.5">
                <span className="flex items-center gap-1 text-[10px]">
                  <Wallet className="w-3.5 h-3.5" />
                  Saldo Dompet
                </span>
                <span className="text-[9px] bg-white px-1.5 py-0.2 rounded font-bold text-[#047857] border border-emerald-200">
                  Cair
                </span>
              </div>
              <p className="text-base font-bold text-slate-900 font-mono">
                Rp {vendorWalletBalanceIdr.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Card Quick Metrics Row (Sangat Jelas & Mudah Dimengerti) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Total Stok di Lapak</span>
            <Package className="w-4 h-4 text-[#2A5C5F]" />
          </div>
          <p className="text-lg font-black font-mono text-slate-900">{totalStockKg} kg</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{vendorStocks.length} komoditas terdata</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Perlu Persetujuan</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-lg font-black font-mono text-amber-700">{pendingOffers.length} Lot</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {pendingOffers.length > 0 ? "Segera konfirmasi diskon" : "Semua penawaran beres"}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Nilai Kas Terselamatkan</span>
            <TrendingDown className="w-4 h-4 text-[#047857]" />
          </div>
          <p className="text-lg font-black font-mono text-[#047857]">
            Rp {totalPendingSalvageValueIdr.toLocaleString("id-ID")}
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Modal kembali dari surplus</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Skor Reputasi Kios</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-black font-mono text-slate-900">{currentVendor.reputationScore} / 100</p>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
            {currentVendor.tier2ContributionCount}x donasi Dapur Sosial
          </span>
        </div>
      </div>

      {/* Pending Approval Section */}
      {pendingOffers.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Persetujuan Penjualan Surplus ({pendingOffers.length} Lot Menunggu Konfirmasi Anda)
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              Sapuan Sore
            </span>
          </div>
          <p className="text-xs text-slate-700 mb-3.5 font-medium leading-relaxed">
            Suhu los terik memicu penurunan mutu sayuran. Setujui harga terdiskon agar otomatis ditawarkan ke Warteg & Dapur Sosial sebelum layu total:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingOffers.map((ofr) => {
              const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
              return (
                <div
                  key={ofr.id}
                  className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900">
                        {comm?.localName || ofr.commodityId}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-sky-100 text-[#075985] border border-sky-300">
                        Diskon {ofr.discountPercentage}%
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-700 mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Berat Komoditas:</span>
                        <strong className="text-slate-900 font-mono">{ofr.quantityKg} kg</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Harga Eceran Pagi:</span>
                        <span className="line-through text-slate-400 font-mono">
                          Rp {ofr.originalPricePerKg.toLocaleString("id-ID")}/kg
                        </span>
                      </div>
                      <div className="flex justify-between text-[#075985] font-bold">
                        <span>Harga Salvaging Diskon:</span>
                        <span className="font-mono">Rp {ofr.salvagePricePerKg.toLocaleString("id-ID")}/kg</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-bold border-t border-slate-100 pt-1">
                        <span>Uang yang Anda Dapatkan:</span>
                        <span className="text-[#047857] font-mono text-sm font-black">
                          Rp {ofr.totalAmountIdr.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => approveOfferByVendor(ofr.id)}
                      type="button"
                      className="flex-1 py-1.5 rounded-lg bg-[#2A5C5F] hover:bg-[#1E4345] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Setuju Jual
                    </button>
                    <button
                      onClick={() => rejectOfferByVendor(ofr.id)}
                      type="button"
                      className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Lewati
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Stock Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900">
              Inventaris Lapak & Riwayat Penjualan
            </h3>
            {/* Segment Tabs: Stok Aktif vs Riwayat Selesai */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
              <button
                onClick={() => setStockViewTab("aktif")}
                type="button"
                className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  stockViewTab === "aktif"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package className="w-3.5 h-3.5 text-pine" />
                <span>Stok Aktif di Lapak ({activeStocks.length})</span>
              </button>

              <button
                onClick={() => setStockViewTab("riwayat")}
                type="button"
                className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  stockViewTab === "riwayat"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Riwayat Penjualan Selesai ({completedStocks.length} Lot)</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowAddStock(!showAddStock)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A5C5F] hover:bg-[#1E4345] text-white text-xs font-semibold transition cursor-pointer shrink-0 shadow-xs self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            Catat Pasokan Masuk
          </button>
        </div>

        {/* Form Tambah Stok */}
        {showAddStock && (
          <form
            onSubmit={handleAddStock}
            className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-4"
          >
            <h4 className="text-xs font-bold uppercase text-slate-700 mb-2">
              Bongkar Pasokan Subuh Baru
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-semibold">
                  Pilih Sayuran / Buah
                </label>
                <select
                  value={selectedCommodityId}
                  onChange={(e) => setSelectedCommodityId(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-900 outline-none"
                >
                  {COMMODITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.localName} ({c.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-semibold">
                  Berat Pasokan (kg)
                </label>
                <input
                  type="number"
                  value={inputKg}
                  onChange={(e) => setInputKg(e.target.value)}
                  min="5"
                  max="500"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-900 outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-[#2A5C5F] hover:bg-[#1E4345] text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
                >
                  Simpan ke Lapak
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 1: Stok Aktif di Lapak */}
        {stockViewTab === "aktif" && (
          <div>
            {activeStocks.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs font-medium">
                Seluruh stok lapak telah habis terjual / terselamatkan! Buka tab &apos;Riwayat Penjualan Selesai&apos; untuk melihat detail transaksi.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider bg-slate-50/70">
                      <th className="py-2.5 px-3">Komoditas & Lot</th>
                      <th className="py-2.5 px-3">Jam Masuk</th>
                      <th className="py-2.5 px-3">Sisa Stok</th>
                      <th className="py-2.5 px-3">Kondisi Fisik</th>
                      <th className="py-2.5 px-3">Sisa Waktu Aman</th>
                      <th className="py-2.5 px-3">Rekomendasi Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {activeStocks.map((stk) => {
                  const comm = COMMODITIES.find((c) => c.id === stk.commodityId);
                  const evalResult = getEvaluationForStock(stk);
                  const decayPercent = Math.round(evalResult.decayScore * 100);

                  let badgeBadge = "bg-emerald-50 text-[#065F46] border-emerald-200";
                  let decayColor = "bg-[#047857]";
                  if (evalResult.decayScore >= 0.85) {
                    badgeBadge = "bg-rose-50 text-[#BE123C] border-rose-200";
                    decayColor = "bg-[#BE123C]";
                  } else if (evalResult.decayScore >= 0.65) {
                    badgeBadge = "bg-amber-50 text-[#B45309] border-amber-200";
                    decayColor = "bg-[#B45309]";
                  } else if (evalResult.decayScore >= 0.35) {
                    badgeBadge = "bg-sky-50 text-[#075985] border-sky-200";
                    decayColor = "bg-[#0369A1]";
                  }

                  return (
                    <tr key={stk.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">
                          {comm?.localName || stk.commodityId}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {stk.lotNumber}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 font-mono">
                        {stk.arrivalClock}
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                        {stk.remainingKg === 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Habis Terjual (0 / {stk.initialKg} kg)
                          </span>
                        ) : (
                          <span>{stk.remainingKg} / {stk.initialKg} kg</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {stk.remainingKg === 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-50 text-[#065F46] border-emerald-200">
                            Terselamatkan
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${badgeBadge}`}
                          >
                            {evalResult.condition.replace("_", " ")}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 min-w-32">
                        {stk.remainingKg === 0 ? (
                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Terdistribusi Aman
                              </span>
                              <span className="font-mono text-[10px] text-emerald-700 font-bold">
                                100%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-600 w-full" />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {evalResult.hoursRemaining} jam
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                {evalResult.decayScore.toFixed(2)}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${decayColor} transition-all duration-300`}
                                style={{ width: `${decayPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 text-xs font-medium">
                        {stk.remainingKg === 0 ? (
                          <span className="text-emerald-700 font-semibold">
                            ✓ Sukses Terdistribusi (Dana Masuk Dompet)
                          </span>
                        ) : (() => {
                          const linkedOffer = offers.find((o) => o.stockId === stk.id);
                          const isOfferActiveOrSettled =
                            linkedOffer &&
                            (linkedOffer.status === "active" ||
                              linkedOffer.status === "claimed" ||
                              linkedOffer.status === "settled");

                          // Penegakan Invarian 1 (Zero Inedible to Food):
                          // Jika mutu sayur telah jatuh ke 'Tidak Layak' (decayScore >= 0.85):
                          // DILARANG KERAS berstatus "Sudah Terbit di Warteg" atau "Sudah Terbit di Dapur Sosial"!
                          // Harus dialihkan ke Sentra Maggot BSF!
                          if (evalResult.decayScore >= 0.85) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                                <Check className="w-3 h-3 text-amber-600" />
                                {linkedOffer?.targetTier === "tier_3"
                                  ? "Sudah Masuk Antrean Maggot"
                                  : "Dialihkan ke Maggot (Mutu Turun)"}
                              </span>
                            );
                          }

                          if (isOfferActiveOrSettled) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                {linkedOffer.targetTier === "tier_1"
                                  ? "Sudah Terbit di Warteg"
                                  : linkedOffer.targetTier === "tier_2"
                                  ? "Sudah Terbit di Dapur Sosial"
                                  : "Sudah Masuk Antrean Maggot"}
                              </span>
                            );
                          }

                          if (evalResult.decayScore >= 0.35) {
                            return (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-slate-700">{evalResult.tierLabel}</span>
                                <button
                                  onClick={() => createInstantSurplusOffer(stk.id)}
                                  type="button"
                                  className="px-2.5 py-1 bg-pine hover:bg-pine-dark text-white rounded-md text-[11px] font-bold shadow-2xs transition-colors duration-150 cursor-pointer shrink-0"
                                >
                                  {evalResult.recommendedTier === "tier_1"
                                    ? "Tawarkan ke Warteg"
                                    : evalResult.recommendedTier === "tier_2"
                                    ? "Salurkan ke Sosial"
                                    : "Alihkan ke Maggot"}
                                </button>
                              </div>
                            );
                          }

                          return evalResult.tierLabel;
                        })()}
                      </td>
                    </tr>
                  );
                })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Riwayat Penjualan Selesai (Trade History) */}
        {stockViewTab === "riwayat" && (
          <div className="overflow-x-auto">
            {completedStocks.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs font-medium">
                Belum ada transaksi penjualan yang selesai hari ini.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider bg-slate-50/70">
                    <th className="py-2.5 px-3">Komoditas & No. Lot</th>
                    <th className="py-2.5 px-3">Volume Terselamatkan</th>
                    <th className="py-2.5 px-3">Penyaluran / Pembeli</th>
                    <th className="py-2.5 px-3">Pelepasan Escrow (QRIS BI)</th>
                    <th className="py-2.5 px-3">Validasi Serah Terima (PoD)</th>
                    <th className="py-2.5 px-3">Status Saldo Dompet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {completedStocks.map((stk) => {
                    const comm = COMMODITIES.find((c) => c.id === stk.commodityId);
                    const linkedOffer = offers.find((o) => o.stockId === stk.id);
                    const amountIdr = linkedOffer?.totalAmountIdr || (comm ? Math.round(comm.baseWholesalePricePerKg * stk.initialKg * 0.45) : 112500);
                    const buyerName = linkedOffer?.claimedBy || "Warteg Kharisma Bahari (Tier 1)";

                    return (
                      <tr key={stk.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">
                            {comm?.localName || stk.commodityId}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {stk.lotNumber} · Masuk: {stk.arrivalClock}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {stk.initialKg} kg Terselamatkan (100%)
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-slate-700">
                          <div className="font-semibold text-slate-900">{buyerName}</div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Redistribusi Pangan Tier 1
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-mono font-bold text-[#047857]">
                          <div>Rp {amountIdr.toLocaleString("id-ID")}</div>
                          <span className="text-[10px] text-slate-400 font-normal">Escrow BI Terverifikasi</span>
                        </td>

                        <td className="py-2.5 px-3 text-slate-600">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>PoD Tervalidasi (Token Sah)</span>
                          </div>
                          <span className="text-[10px] text-slate-400">Driver: Pak Joko (Viar 01)</span>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Dana Cair ke Dompet
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
