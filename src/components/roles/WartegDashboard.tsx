"use client";

import { useState } from "react";
import { useMarketSimulation, RescueOffer } from "@/lib/simulationStore";
import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import {
  ShoppingBag,
  Clock,
  Sparkles,
  QrCode,
  CheckCircle2,
  MapPin,
  TrendingDown,
  ShieldCheck,
  Check,
  ArrowRight,
  Filter,
} from "lucide-react";

export function WartegDashboard() {
  const {
    offers,
    claimOfferByBuyer,
    payQrisForOffer,
  } = useMarketSimulation();

  const [activeTab, setActiveTab] = useState<"katalog" | "pesanan_saya">("katalog");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedOfferForQris, setSelectedOfferForQris] = useState<RescueOffer | null>(null);

  // Active Tier 1 offers available to claim
  const availableOffers = offers.filter(
    (o) => o.targetTier === "tier_1" && o.status === "active"
  );

  // My claimed offers
  const myClaimedOffers = offers.filter(
    (o) => o.claimantRole === "warteg" || (o.status === "claimed" && o.targetTier === "tier_1")
  );

  const handleClaim = (offer: RescueOffer) => {
    claimOfferByBuyer(offer.id, "Warteg Bahari Condet (1.8 km)", "warteg");
    setSelectedOfferForQris(offer);
  };

  const handlePaySuccess = () => {
    if (selectedOfferForQris) {
      payQrisForOffer(selectedOfferForQris.id);
      setSelectedOfferForQris(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Buyer Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl font-bold shadow-sm shrink-0">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Warteg Kharisma Bahari Condet
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  Pembeli Tier 1
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Jl. Raya Condet No. 42 (Radius 1.8 km dari Pasar Induk Kramat Jati)
              </p>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
            <button
              onClick={() => setActiveTab("katalog")}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "katalog"
                  ? "bg-white text-orange-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Katalog Flash Sale ({availableOffers.length})
            </button>
            <button
              onClick={() => setActiveTab("pesanan_saya")}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "pesanan_saya"
                  ? "bg-white text-orange-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pesanan & Escrow ({myClaimedOffers.length})
            </button>
          </div>
        </div>
      </div>

      {/* Tab: Katalog Flash Sale */}
      {activeTab === "katalog" && (
        <div className="space-y-4">
          {/* Discount Headline Banner */}
          <div className="bg-linear-to-r from-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-amber-200" />
                <h3 className="font-extrabold text-base tracking-wide">
                  PENYELAMATAN SURPLUS SAYUR SEGAR (DISKON 50% - 70%)
                </h3>
              </div>
              <p className="text-xs text-orange-100 max-w-xl leading-relaxed">
                Lot sayuran segar hasil evaluasi Autonomous Cron 14:30 WIB. Masih sangat layak konsumsi
                untuk kebutuhan olahan menu warteg dan katering hari ini.
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-xs px-3.5 py-2 rounded-xl text-center shrink-0">
              <span className="text-[10px] uppercase font-semibold text-orange-100 tracking-wider block">
                Hemat Pengeluaran
              </span>
              <span className="text-xl font-black font-mono">50 - 70%</span>
            </div>
          </div>

          {/* Catalog Grid */}
          {availableOffers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
              <p className="text-sm font-semibold">
                Saat ini belum ada tiket penawaran aktif di Tier 1.
              </p>
              <p className="text-xs mt-1">
                Pindah jam ke <strong>14:30 WIB (Cron Sweep)</strong> pada pengendali sirkadian di atas untuk memicu penawaran baru.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableOffers.map((ofr) => {
                const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
                const vendor = KIOSKS.find((k) => k.id === ofr.vendorId);

                return (
                  <div
                    key={ofr.id}
                    className="bg-white border border-slate-200 hover:border-orange-300 rounded-2xl p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Badge & Expiry */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-red-600 text-white shadow-2xs">
                          HEMAT {ofr.discountPercentage}%
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {ofr.expiresInMinutes} menit lagi
                        </span>
                      </div>

                      {/* Commodity Name & Stall Origin */}
                      <h4 className="text-base font-bold text-slate-900">
                        {comm?.localName || ofr.commodityId}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Kios {vendor?.stallNumber} · {vendor?.name} (Blok {vendor?.block})
                      </p>

                      {/* Quantity Lot */}
                      <div className="my-3 py-2 px-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Kuantitas Lot:</span>
                        <strong className="text-slate-900 font-bold font-mono">
                          {ofr.quantityKg} kg
                        </strong>
                      </div>

                      {/* Pricing Comparison */}
                      <div className="space-y-1 mb-4">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Harga Normal Eceran:</span>
                          <span className="line-through">
                            Rp {ofr.originalPricePerKg.toLocaleString("id-ID")}/kg
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-orange-600 font-bold">
                          <span>Harga Surplus PASARIN:</span>
                          <span className="text-sm">
                            Rp {ofr.salvagePricePerKg.toLocaleString("id-ID")}/kg
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-100">
                          <span>Total Tagihan:</span>
                          <span className="text-emerald-700 font-mono text-base">
                            Rp {ofr.totalAmountIdr.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Claim Button */}
                    <button
                      onClick={() => handleClaim(ofr)}
                      type="button"
                      className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                    >
                      <span>Klaim Lot Ini (Amankan Harga)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Pesanan Saya & Status Escrow */}
      {activeTab === "pesanan_saya" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Status Pembelian & Pengamanan Dana Escrow QRIS
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Dana ditahan aman di Escrow Bank Indonesia sampai Anda/kurir mengonfirmasi serah terima fisik di los pedagang.
          </p>

          {myClaimedOffers.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              Belum ada lot yang Anda klaim. Buka tab Katalog Flash Sale untuk mulai mengklaim.
            </div>
          ) : (
            <div className="space-y-3">
              {myClaimedOffers.map((ofr) => {
                const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
                const vendor = KIOSKS.find((k) => k.id === ofr.vendorId);

                return (
                  <div
                    key={ofr.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-900">
                          {comm?.localName || ofr.commodityId} ({ofr.quantityKg} kg)
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            ofr.paymentStatus === "released_to_vendor"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : ofr.paymentStatus === "held_in_escrow"
                              ? "bg-sky-100 text-sky-800 border-sky-200"
                              : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {ofr.paymentStatus === "released_to_vendor"
                            ? "Selesai (Dana Cair)"
                            : ofr.paymentStatus === "held_in_escrow"
                            ? "Dana Diamankan di Escrow BI"
                            : "Menunggu Pembayaran QRIS"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Kios {vendor?.stallNumber} · {vendor?.name} · Driver:{" "}
                        <strong>{ofr.allocatedDriver || "Menunggu penugasan"}</strong>
                      </p>
                      {ofr.podToken && (
                        <p className="text-[11px] font-mono text-purple-700 font-semibold mt-1">
                          Token PoD: {ofr.podToken}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Total Biaya:</span>
                        <span className="text-base font-extrabold text-slate-900 font-mono">
                          Rp {ofr.totalAmountIdr.toLocaleString("id-ID")}
                        </span>
                      </div>

                      {ofr.paymentStatus === "unpaid" ? (
                        <button
                          onClick={() => setSelectedOfferForQris(ofr)}
                          type="button"
                          className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                          Bayar QRIS BI
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Escrow Terbayar
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal QRIS Dinamis Bank Indonesia */}
      {selectedOfferForQris && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6" />
            </div>

            <h4 className="text-base font-extrabold text-slate-900">
              Pembayaran QRIS Dinamis BI
            </h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Standar National Merchant Identifier (NMID) Escrow PASARIN
            </p>

            {/* QR Code Graphic Box */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 mb-4 mx-auto w-48 h-48 flex flex-col items-center justify-center relative">
              <div className="w-36 h-36 bg-white p-2 rounded-xl border border-slate-300 flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-sm flex items-center justify-center text-white text-[11px] font-mono text-center p-2 leading-tight">
                  [QRIS BI PASARIN DYNAMIC QR]
                </div>
              </div>
            </div>

            <div className="text-xs space-y-1 text-slate-600 mb-5">
              <div className="flex justify-between">
                <span>Lot Penyelamatan:</span>
                <strong className="text-slate-900">
                  {selectedOfferForQris.quantityKg} kg
                </strong>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1 text-sm font-bold">
                <span>Total Nominal:</span>
                <span className="text-emerald-700 font-mono">
                  Rp {selectedOfferForQris.totalAmountIdr.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handlePaySuccess}
                type="button"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Simulasikan Pembayaran Berhasil
              </button>
              <button
                onClick={() => setSelectedOfferForQris(null)}
                type="button"
                className="w-full py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium transition cursor-pointer"
              >
                Tutup / Batalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
