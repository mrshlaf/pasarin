"use client";

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
  X,
} from "lucide-react";

export function VendorDashboard() {
  const {
    selectedVendorId,
    setSelectedVendorId,
    stockItems,
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
    };
    stockItems.push(newStock);
    setShowAddStock(false);
  };

  return (
    <div className="space-y-6">
      {/* Vendor Profile Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F0F6F6] text-[#2A5C5F] border border-[#D1E1E2] flex items-center justify-center shrink-0">
              <Store className="w-6 h-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {currentVendor.name}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#065F46] border border-emerald-300">
                  <ShieldCheck className="w-3 h-3 text-[#047857]" />
                  Izin PD Pasar Jaya
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                  Kios {currentVendor.stallNumber} (Blok {currentVendor.block})
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                {currentVendor.ownerName} · {currentVendor.phone} · {currentVendor.aisle}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-700">
                <span>
                  Skor Kepatuhan:{" "}
                  <strong className="text-[#047857] font-bold">
                    {currentVendor.reputationScore}/100
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Kontribusi Sosial Tier 2:{" "}
                  <strong className="text-slate-900">{currentVendor.tier2ContributionCount} Lot</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Stall Switcher & Escrow Wallet */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="w-full sm:w-auto">
              <label
                htmlFor="kiosk-select"
                className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1"
              >
                Pilih Kios Pedagang
              </label>
              <select
                id="kiosk-select"
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full sm:w-56 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#2A5C5F]"
              >
                {KIOSKS.map((k) => (
                  <option key={k.id} value={k.id}>
                    [{k.stallNumber}] {k.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[#F0F6F6] border border-[#D1E1E2] rounded-xl p-3 shrink-0 min-w-40">
              <div className="flex items-center justify-between text-xs text-[#2A5C5F] font-semibold mb-1">
                <span className="flex items-center gap-1 text-[11px]">
                  <Wallet className="w-3.5 h-3.5" />
                  Saldo Dompet
                </span>
                <span className="text-[10px] bg-white px-1.5 py-0.2 rounded font-bold text-[#047857] border border-emerald-200">
                  Escrow Cair
                </span>
              </div>
              <p className="text-base font-bold text-slate-900 font-mono">
                Rp {vendorWalletBalanceIdr.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approval Banner */}
      {pendingOffers.length > 0 && (
        <div className="bg-sky-50/70 border border-sky-300 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[#075985]">
              Persetujuan Penjualan Surplus
            </h3>
            <span className="text-xs font-mono font-bold text-[#075985]">
              {pendingOffers.length} Menunggu Keputusan
            </span>
          </div>
          <p className="text-xs text-slate-700 mb-4 font-medium">
            Laju respirasi komoditas los meningkat. Setujui harga terdiskon untuk segera dialokasikan ke warteg:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingOffers.map((ofr) => {
              const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
              return (
                <div
                  key={ofr.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900">
                        {comm?.localName || ofr.commodityId}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-[#075985] border border-sky-300">
                        Diskon {ofr.discountPercentage}%
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-700 mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Kuantitas Surplus:</span>
                        <strong className="text-slate-900 font-mono">{ofr.quantityKg} kg</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Harga Eceran:</span>
                        <span className="line-through text-slate-500 font-mono">
                          Rp {ofr.originalPricePerKg.toLocaleString("id-ID")}/kg
                        </span>
                      </div>
                      <div className="flex justify-between text-[#075985] font-bold">
                        <span>Harga Penyelamatan:</span>
                        <span className="font-mono">Rp {ofr.salvagePricePerKg.toLocaleString("id-ID")}/kg</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-bold border-t border-slate-100 pt-1">
                        <span>Nilai Terlindungi:</span>
                        <span className="text-[#047857] font-mono text-sm font-black">
                          Rp {ofr.totalAmountIdr.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => approveOfferByVendor(ofr.id)}
                      type="button"
                      className="flex-1 py-2 rounded-lg bg-[#0369A1] hover:bg-[#075985] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      Setuju Jual
                    </button>
                    <button
                      onClick={() => rejectOfferByVendor(ofr.id)}
                      type="button"
                      className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
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
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Katalog Stok Los</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                {vendorStocks.length} Komoditas
              </span>
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              Evaluasi mutu fisik waktu nyata berbasis kinetika termal Arrhenius-Q10
            </p>
          </div>

          <button
            onClick={() => setShowAddStock(!showAddStock)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2A5C5F] hover:bg-[#1E4345] text-white text-xs font-semibold transition cursor-pointer shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Catat Pasokan Masuk
          </button>
        </div>

        {/* Modal Form Tambah Stok */}
        {showAddStock && (
          <form
            onSubmit={handleAddStock}
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4"
          >
            <h4 className="text-xs font-bold uppercase text-slate-800 mb-3">
              Catat Bongkar Muatan Baru
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-slate-700 mb-1 font-semibold">
                  Komoditas
                </label>
                <select
                  value={selectedCommodityId}
                  onChange={(e) => setSelectedCommodityId(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-900"
                >
                  {COMMODITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.localName} ({c.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-700 mb-1 font-semibold">
                  Kuantitas (kg)
                </label>
                <input
                  type="number"
                  value={inputKg}
                  onChange={(e) => setInputKg(e.target.value)}
                  min="5"
                  max="500"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-900"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-[#2A5C5F] hover:bg-[#1E4345] text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
                >
                  Simpan ke Los
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Table of stocks */}
        {vendorStocks.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
            Belum ada inventaris tercatat untuk kios ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider bg-slate-50">
                  <th className="py-2.5 px-3">Komoditas</th>
                  <th className="py-2.5 px-3">Jam Masuk</th>
                  <th className="py-2.5 px-3">Stok (kg)</th>
                  <th className="py-2.5 px-3">Decay Score</th>
                  <th className="py-2.5 px-3">Mutu Biologis</th>
                  <th className="py-2.5 px-3">Rekomendasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorStocks.map((stk) => {
                  const comm = COMMODITIES.find((c) => c.id === stk.commodityId);
                  const evalResult = getEvaluationForStock(stk);
                  const decayPercent = Math.round(evalResult.decayScore * 100);

                  // Nuanced colors with AAA contrast
                  let decayColor = "bg-[#047857]";
                  let badgeBadge = "bg-emerald-50 text-[#065F46] border-emerald-300";
                  if (evalResult.decayScore >= 0.85) {
                    decayColor = "bg-[#BE123C]";
                    badgeBadge = "bg-rose-50 text-[#BE123C] border-rose-300";
                  } else if (evalResult.decayScore >= 0.65) {
                    decayColor = "bg-[#B45309]";
                    badgeBadge = "bg-amber-50 text-[#B45309] border-amber-300";
                  } else if (evalResult.decayScore >= 0.35) {
                    decayColor = "bg-[#0369A1]";
                    badgeBadge = "bg-sky-50 text-[#075985] border-sky-300";
                  }

                  return (
                    <tr key={stk.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">
                          {comm?.localName || stk.commodityId}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 font-medium">
                          {stk.lotNumber}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-700 font-mono font-medium">
                        {stk.arrivalClock}
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-900 font-mono">
                        {stk.remainingKg} / {stk.initialKg} kg
                      </td>

                      <td className="py-3 px-3 min-w-36">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-mono font-bold text-slate-800">
                            {evalResult.decayScore.toFixed(3)}
                          </span>
                          <span className="text-[10px] text-slate-600 font-medium">
                            {evalResult.hoursRemaining} jam aman
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${decayColor} transition-all duration-500`}
                            style={{ width: `${decayPercent}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${badgeBadge}`}
                        >
                          {evalResult.condition.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-700 text-[11px] font-medium">
                        {evalResult.tierLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
