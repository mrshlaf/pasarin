"use client";

import { useState } from "react";
import { useMarketSimulation, StockItem } from "@/lib/simulationStore";
import { KIOSKS } from "@/data/kiosks";
import { COMMODITIES } from "@/data/commodities";
import {
  Store,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  PlusCircle,
  Check,
  X,
  FileText,
  ShieldCheck,
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

  // Form state untuk ingest stok baru
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
      {/* Vendor Profile & Shopee Seller Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center text-xl font-bold shadow-sm shrink-0">
              <Store className="w-7 h-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {currentVendor.name}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Izin PD Pasar Jaya: Terverifikasi
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                  Kios {currentVendor.stallNumber} (Blok {currentVendor.block})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {currentVendor.ownerName} · {currentVendor.phone} · {currentVendor.aisle}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                <span>
                  Skor Reputasi:{" "}
                  <strong className="text-emerald-600 font-bold">
                    {currentVendor.reputationScore}/100
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Kontribusi Donasi Tier 2:{" "}
                  <strong>{currentVendor.tier2ContributionCount}x Lot</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Stall Selector & Wallet Balance */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            {/* Kiosk Dropdown Switcher */}
            <div className="w-full sm:w-auto">
              <label
                htmlFor="kiosk-select"
                className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1"
              >
                Ganti Kios Aktif (30 Kios)
              </label>
              <select
                id="kiosk-select"
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full sm:w-56 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              >
                {KIOSKS.map((k) => (
                  <option key={k.id} value={k.id}>
                    [{k.stallNumber}] {k.name} (Blok {k.block})
                  </option>
                ))}
              </select>
            </div>

            {/* Escrow Wallet Card */}
            <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3 shrink-0 min-w-44">
              <div className="flex items-center justify-between text-xs text-orange-800 font-medium mb-1">
                <span className="flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-orange-600" />
                  Saldo Dompet
                </span>
                <span className="text-[10px] bg-orange-200/80 px-1.5 py-0.2 rounded font-semibold text-orange-900">
                  Escrow Cair
                </span>
              </div>
              <p className="text-base font-extrabold text-orange-950 font-mono">
                Rp {vendorWalletBalanceIdr.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending 1-Tap Approval Banner if any */}
      {pendingOffers.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 lg:p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
            <h3 className="text-sm font-bold text-amber-900">
              Konfirmasi Penjualan 1-Ketuk Telegram (@pasarin_bot) Butuh Persetujuan Anda!
            </h3>
          </div>
          <p className="text-xs text-amber-800 mb-4">
            Agen Otonom mendeteksi percepatan respirasi seluler komoditas Anda akibat suhu los {stageConfig.temperatureC}°C.
            Pilih <strong>Setuju Jual</strong> untuk menyiarkan tiket terdiskon ke pembeli warteg sebelum rusak total.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingOffers.map((ofr) => {
              const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
              return (
                <div
                  key={ofr.id}
                  className="bg-white border border-amber-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900">
                        {comm?.localName || ofr.commodityId}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                        Diskon {ofr.discountPercentage}%
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-600 mb-3">
                      <div className="flex justify-between">
                        <span>Jumlah Surplus:</span>
                        <strong className="text-slate-900">{ofr.quantityKg} kg</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Harga Normal:</span>
                        <span className="line-through text-slate-400">
                          Rp {ofr.originalPricePerKg.toLocaleString("id-ID")}/kg
                        </span>
                      </div>
                      <div className="flex justify-between text-orange-700 font-bold">
                        <span>Harga Penyelamatan:</span>
                        <span>Rp {ofr.salvagePricePerKg.toLocaleString("id-ID")}/kg</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-bold border-t border-slate-100 pt-1">
                        <span>Total Pendapatan Terlindungi:</span>
                        <span className="text-emerald-700 font-mono text-sm">
                          Rp {ofr.totalAmountIdr.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => approveOfferByVendor(ofr.id)}
                      type="button"
                      className="flex-1 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Setuju Jual (1-Ketuk)
                    </button>
                    <button
                      onClick={() => rejectOfferByVendor(ofr.id)}
                      type="button"
                      className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 font-medium text-xs flex items-center justify-center gap-1 transition cursor-pointer"
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

      {/* Stock Matrix Table & Ingest Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Inventaris Aktif Los Pedagang (Stock Matrix)</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                {vendorStocks.length} Komoditas
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Evaluasi kondisi fisik waktu nyata berbasis telemetri mikroklimat Arrhenius-Q10
            </p>
          </div>

          <button
            onClick={() => setShowAddStock(!showAddStock)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition cursor-pointer shrink-0 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            Ingest Pasokan Subuh Baru
          </button>
        </div>

        {/* Modal Form Tambah Stok */}
        {showAddStock && (
          <form
            onSubmit={handleAddStock}
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4"
          >
            <h4 className="text-xs font-bold uppercase text-slate-700 mb-3">
              Catat Bongkar Muatan Subuh Baru
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">
                  Pilih Komoditas
                </label>
                <select
                  value={selectedCommodityId}
                  onChange={(e) => setSelectedCommodityId(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium"
                >
                  {COMMODITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.localName} ({c.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">
                  Kuantitas (kg)
                </label>
                <input
                  type="number"
                  value={inputKg}
                  onChange={(e) => setInputKg(e.target.value)}
                  min="5"
                  max="500"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
                >
                  Simpan ke Los Kios
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Table of stocks */}
        {vendorStocks.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
            Belum ada inventaris tercatat untuk kios ini. Klik tombol ingest untuk menambah pasokan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Lot & Komoditas</th>
                  <th className="py-2.5 px-3">Jam Tiba</th>
                  <th className="py-2.5 px-3">Stok (kg)</th>
                  <th className="py-2.5 px-3">Decay Score (Arrhenius)</th>
                  <th className="py-2.5 px-3">Status Mutu Biologis</th>
                  <th className="py-2.5 px-3">Rekomendasi Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorStocks.map((stk) => {
                  const comm = COMMODITIES.find((c) => c.id === stk.commodityId);
                  const evalResult = getEvaluationForStock(stk);
                  const decayPercent = Math.round(evalResult.decayScore * 100);

                  let decayColor = "bg-emerald-500";
                  let badgeBadge = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  if (evalResult.decayScore >= 0.85) {
                    decayColor = "bg-red-500";
                    badgeBadge = "bg-red-100 text-red-800 border-red-200";
                  } else if (evalResult.decayScore >= 0.65) {
                    decayColor = "bg-rose-500";
                    badgeBadge = "bg-rose-100 text-rose-800 border-rose-200";
                  } else if (evalResult.decayScore >= 0.35) {
                    decayColor = "bg-amber-500";
                    badgeBadge = "bg-amber-100 text-amber-800 border-amber-200";
                  }

                  return (
                    <tr key={stk.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">
                          {comm?.localName || stk.commodityId}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {stk.lotNumber}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {stk.arrivalClock}
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {stk.remainingKg} / {stk.initialKg} kg
                      </td>

                      <td className="py-3 px-3 min-w-36">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-mono font-bold text-slate-700">
                            {evalResult.decayScore.toFixed(3)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Sisa: {evalResult.hoursRemaining} jam
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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

                      <td className="py-3 px-3">
                        <span className="text-[11px] font-medium text-slate-700">
                          {evalResult.tierLabel}
                        </span>
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
