"use client";

import { useState } from "react";
import { useMarketSimulation, RescueOffer } from "@/lib/simulationStore";
import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import {
  ShoppingBag,
  Clock,
  QrCode,
  CheckCircle2,
  MapPin,
  Check,
  ArrowRight,
} from "lucide-react";

export function WartegDashboard() {
  const {
    offers,
    claimOfferByBuyer,
    payQrisForOffer,
  } = useMarketSimulation();

  const [activeTab, setActiveTab] = useState<"katalog" | "pesanan_saya">("katalog");
  const [selectedOfferForQris, setSelectedOfferForQris] = useState<RescueOffer | null>(null);

  const availableOffers = offers.filter(
    (o) => o.targetTier === "tier_1" && o.status === "active"
  );

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
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-[#0284C7] border border-sky-200 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Warteg Kharisma Bahari Condet
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-[#0284C7] border border-sky-200">
                  Pembeli Prioritas Tier 1
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Jl. Raya Condet No. 42 (Radius 1.8 km dari Pasar Induk)
              </p>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
            <button
              onClick={() => setActiveTab("katalog")}
              type="button"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "katalog"
                  ? "bg-white text-[#0284C7] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Katalog Lot Surplus ({availableOffers.length})
            </button>
            <button
              onClick={() => setActiveTab("pesanan_saya")}
              type="button"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "pesanan_saya"
                  ? "bg-white text-[#0284C7] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pesanan & Escrow ({myClaimedOffers.length})
            </button>
          </div>
        </div>
      </div>

      {/* Tab: Katalog */}
      {activeTab === "katalog" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Sayuran daun segar dengan potongan harga 50% - 70%</span>
            <span className="font-mono">{availableOffers.length} Lot Tersedia</span>
          </div>

          {availableOffers.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center text-slate-400 text-xs">
              Belum ada lot penawaran aktif di Tier 1 saat ini. Gunakan simulasi jam 14:30 WIB di atas.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableOffers.map((ofr) => {
                const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
                const vendor = KIOSKS.find((k) => k.id === ofr.vendorId);

                return (
                  <div
                    key={ofr.id}
                    className="bg-white border border-slate-200/80 hover:border-sky-300 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-[#0284C7] border border-sky-200">
                          Diskon {ofr.discountPercentage}%
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {ofr.expiresInMinutes}m tersisa
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900">
                        {comm?.localName || ofr.commodityId}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Kios {vendor?.stallNumber} · {vendor?.name}
                      </p>

                      <div className="my-3 py-2 px-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Kuantitas Lot:</span>
                        <strong className="text-slate-900 font-mono">
                          {ofr.quantityKg} kg
                        </strong>
                      </div>

                      <div className="space-y-1 mb-4 text-xs">
                        <div className="flex items-center justify-between text-slate-400 font-mono">
                          <span>Harga Eceran:</span>
                          <span className="line-through">
                            Rp {ofr.originalPricePerKg.toLocaleString("id-ID")}/kg
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#0284C7] font-semibold font-mono">
                          <span>Harga Surplus:</span>
                          <span>
                            Rp {ofr.salvagePricePerKg.toLocaleString("id-ID")}/kg
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                          <span>Total Tagihan:</span>
                          <span className="text-[#2A5C5F] font-mono text-base">
                            Rp {ofr.totalAmountIdr.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleClaim(ofr)}
                      type="button"
                      className="w-full py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                    >
                      <span>Klaim Lot Ini</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Pesanan Saya */}
      {activeTab === "pesanan_saya" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Status Pesanan & Rekening Escrow QRIS
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Dana ditahan aman di escrow sampai verifikasi serah terima fisik kurir di los pedagang
          </p>

          {myClaimedOffers.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              Belum ada pesanan aktif.
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
                              ? "bg-emerald-50 text-[#059669] border-emerald-200"
                              : ofr.paymentStatus === "held_in_escrow"
                              ? "bg-sky-50 text-[#0284C7] border-sky-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {ofr.paymentStatus === "released_to_vendor"
                            ? "Selesai (Cair)"
                            : ofr.paymentStatus === "held_in_escrow"
                            ? "Dana di Escrow BI"
                            : "Menunggu Pembayaran"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Kios {vendor?.stallNumber} · {vendor?.name} · Driver: {ofr.allocatedDriver || "Menunggu armada"}
                      </p>
                      {ofr.podToken && (
                        <p className="text-[11px] font-mono text-[#0284C7] font-semibold mt-1">
                          Token PoD: {ofr.podToken}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Total:</span>
                        <span className="text-sm font-bold text-slate-900 font-mono">
                          Rp {ofr.totalAmountIdr.toLocaleString("id-ID")}
                        </span>
                      </div>

                      {ofr.paymentStatus === "unpaid" ? (
                        <button
                          onClick={() => setSelectedOfferForQris(ofr)}
                          type="button"
                          className="px-3.5 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                        >
                          <QrCode className="w-4 h-4" />
                          Bayar QRIS
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-[#059669] font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4" />
                          Terverifikasi
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

      {/* Modal QRIS Dinamis BI */}
      {selectedOfferForQris && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center mx-auto mb-3 border border-sky-200">
              <QrCode className="w-5 h-5" />
            </div>

            <h4 className="text-base font-bold text-slate-900">
              Pembayaran QRIS Escrow
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              NMID: ID102026PASARIN01 · Standar Bank Indonesia
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 mx-auto w-44 h-44 flex flex-col items-center justify-center">
              <div className="w-32 h-32 bg-white p-2 rounded-xl border border-slate-300 flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-sm flex items-center justify-center text-white text-[10px] font-mono text-center p-2">
                  [QRIS BI PASARIN DYNAMIC QR]
                </div>
              </div>
            </div>

            <div className="text-xs space-y-1 text-slate-600 mb-5">
              <div className="flex justify-between">
                <span>Lot:</span>
                <strong className="text-slate-900">{selectedOfferForQris.quantityKg} kg</strong>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1 text-sm font-bold">
                <span>Total:</span>
                <span className="text-[#2A5C5F] font-mono">
                  Rp {selectedOfferForQris.totalAmountIdr.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handlePaySuccess}
                type="button"
                className="w-full py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Check className="w-4 h-4" />
                Simulasikan Pembayaran Berhasil
              </button>
              <button
                onClick={() => setSelectedOfferForQris(null)}
                type="button"
                className="w-full py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
