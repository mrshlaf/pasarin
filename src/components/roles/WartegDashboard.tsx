"use client";

/**
 * Dasbor Peran Pembeli Warteg & Katering UMKM (WartegDashboard) (Clean Swiss Minimalist).
 * Menyediakan:
 * 1. Penjelajahan katalog lot surplus terdiskon 50% - 70% (Tier 1).
 * 2. Klaim instan penawaran surplus sebelum jendela waktu habis.
 * 3. Pembayaran simulasi QRIS Bank Indonesia terproteksi rekening escrow.
 * 4. Pemantauan status penjemputan armada logistik dan token serah terima (PoD).
 */

import { useState } from "react";
import { useMarketSimulation, RescueOffer } from "@/lib/simulationStore";
import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import { QrisCodeDisplay } from "@/components/common/QrisCodeDisplay";
import {
  ShoppingBag,
  Clock,
  QrCode,
  MapPin,
  Check,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export function WartegDashboard() {
  const {
    offers,
    stockItems,
    getEvaluationForStock,
    claimOfferByBuyer,
    payQrisForOffer,
  } = useMarketSimulation();

  const [activeTab, setActiveTab] = useState<"katalog" | "pesanan_saya">("katalog");
  const [selectedOfferForQris, setSelectedOfferForQris] = useState<RescueOffer | null>(null);

  const availableOffers = offers.filter((o) => {
    if (o.targetTier !== "tier_1" || o.status !== "active") return false;
    const linkedStock = stockItems.find((s) => s.id === o.stockId);
    if (!linkedStock) return true;
    const evaluation = getEvaluationForStock(linkedStock);
    // Invarian 1 (Zero Inedible to Food): Makanan yang sudah Tidak Layak (decayScore >= 0.85) dilarang masuk Warteg!
    return evaluation.decayScore < 0.85;
  });
  const myClaimedOffers = offers.filter(
    (o) => o.claimantRole === "warteg" || (o.status === "claimed" && o.targetTier === "tier_1") || (o.status === "settled" && o.targetTier === "tier_1")
  );

  const activeOrders = myClaimedOffers.filter((o) => o.status !== "settled");
  const completedOrders = myClaimedOffers.filter((o) => o.status === "settled");

  const handleClaim = (offer: RescueOffer) => {
    claimOfferByBuyer(offer.id, "Warteg Kharisma Bahari (1.8 km)", "warteg");
    setSelectedOfferForQris(offer);
  };

  const handlePaySuccess = () => {
    if (selectedOfferForQris) {
      payQrisForOffer(selectedOfferForQris.id);
      setSelectedOfferForQris(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Buyer Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-sky-50 text-[#075985] border border-sky-200 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Warteg Kharisma Bahari Condet
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-[#075985] border border-sky-300">
                  Mitra Tier 1
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Jl. Raya Condet No. 42 (Radius 1.8 km dari Pasar Induk Kramat Jati)
              </p>
            </div>
          </div>

          {/* Clean Segment Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-center border border-slate-200">
            <button
              onClick={() => setActiveTab("katalog")}
              type="button"
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                activeTab === "katalog"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Katalog Surplus ({availableOffers.length})
            </button>
            <button
              onClick={() => setActiveTab("pesanan_saya")}
              type="button"
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                activeTab === "pesanan_saya"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pesanan & Escrow ({myClaimedOffers.length})
            </button>
          </div>
        </div>
      </div>

      {/* 4-Card Quick Metrics Row for Warteg Buyer */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Lot Murah Tersedia</span>
            <ShoppingBag className="w-4 h-4 text-[#0369A1]" />
          </div>
          <p className="text-lg font-black font-mono text-slate-900">{availableOffers.length} Lot</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Diskon 50% - 70%</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Pesanan Aktif Anda</span>
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-black font-mono text-slate-900">{myClaimedOffers.length} Pesanan</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Siap kirim armada Viar</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Total Penghematan</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Hemat</span>
          </div>
          <p className="text-lg font-black font-mono text-[#047857]">
            Rp {myClaimedOffers.reduce((acc, o) => acc + (o.originalPricePerKg - o.salvagePricePerKg) * o.quantityKg, 65000).toLocaleString("id-ID")}
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Dibanding harga eceran subuh</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Proteksi Pembayaran</span>
            <ShieldCheck className="w-4 h-4 text-[#2A5C5F]" />
          </div>
          <p className="text-lg font-black font-mono text-slate-900">100% Escrow BI</p>
          <span className="text-[10px] text-[#075985] font-semibold mt-0.5 block">Dana aman sampai barang tiba</span>
        </div>
      </div>
      {/* Tab: Katalog Surplus */}
      {activeTab === "katalog" && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>Komoditas pangan layak konsumsi dengan potongan harga 50% - 70%</span>
            <span className="font-mono font-bold text-slate-800">{availableOffers.length} Lot Tersedia</span>
          </div>

          {availableOffers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 text-xs">
              Belum ada lot penawaran aktif di Tier 1 saat ini. Gunakan tombol &apos;Simulasi 14:30&apos; di atas untuk memicu sapuan surplus.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {availableOffers.map((ofr) => {
                const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
                const vendor = KIOSKS.find((k) => k.id === ofr.vendorId);

                return (
                  <div
                    key={ofr.id}
                    className="bg-white border border-slate-200 hover:border-sky-300 rounded-xl p-4 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-sky-100 text-[#075985] border border-sky-300">
                          Diskon {ofr.discountPercentage}%
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {ofr.expiresInMinutes}m sisa
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">
                        {comm?.localName || ofr.commodityId}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Kios {vendor?.stallNumber} · {vendor?.name}
                      </p>

                      <div className="my-2.5 py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Kuantitas Lot:</span>
                        <strong className="text-slate-900 font-mono font-bold">
                          {ofr.quantityKg} kg
                        </strong>
                      </div>

                      <div className="space-y-1 mb-3.5 text-xs">
                        <div className="flex items-center justify-between text-slate-500 font-mono">
                          <span>Harga Normal:</span>
                          <span className="line-through">
                            Rp {ofr.originalPricePerKg.toLocaleString("id-ID")}/kg
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#075985] font-bold font-mono">
                          <span>Harga Salvaging:</span>
                          <span>
                            Rp {ofr.salvagePricePerKg.toLocaleString("id-ID")}/kg
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                          <span>Total Pembayaran:</span>
                          <span className="text-[#1E4345] font-mono text-base font-extrabold">
                            Rp {ofr.totalAmountIdr.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleClaim(ofr)}
                      type="button"
                      className="w-full py-2 rounded-lg bg-[#0369A1] hover:bg-[#075985] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <span>Klaim & Bayar QRIS</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-0.5">
                Daftar Pesanan & Riwayat Pembelian Selesai (Trade History)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Dana tebusan diamankan di escrow Bank Indonesia sampai serah terima fisik kurir di los pedagang
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
              {completedOrders.length} Selesai · {activeOrders.length} Aktif
            </span>
          </div>

          {/* 1. Antrean Pesanan Aktif */}
          {activeOrders.length > 0 && (
            <div className="space-y-3 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center justify-between">
                <span>Pesanan Aktif (Tertahan di Escrow / Pengantaran)</span>
                <span>{activeOrders.length} Lot</span>
              </h4>
              {activeOrders.map((ofr) => {
                const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
                const vendor = KIOSKS.find((k) => k.id === ofr.vendorId);
                return (
                  <div
                    key={ofr.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-medium"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          {comm?.localName || ofr.commodityId} ({ofr.quantityKg} kg)
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            ofr.paymentStatus === "held_in_escrow"
                              ? "bg-sky-50 text-[#075985] border-sky-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {ofr.paymentStatus === "held_in_escrow"
                            ? "Tertahan di Escrow BI"
                            : "Menunggu Pembayaran"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Kios {vendor?.stallNumber} · {vendor?.name} · Driver: {ofr.allocatedDriver || "Pak Joko (Viar 01)"}
                      </p>
                      {ofr.podToken && (
                        <p className="text-[11px] font-mono text-slate-600 mt-1">
                          Token PoD: <strong className="text-slate-900">{ofr.podToken}</strong>
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-base font-bold font-mono text-slate-900">
                        Rp {ofr.totalAmountIdr.toLocaleString("id-ID")}
                      </p>
                      {ofr.paymentStatus === "unpaid" && (
                        <button
                          onClick={() => setSelectedOfferForQris(ofr)}
                          type="button"
                          className="mt-1.5 px-3 py-1 bg-[#2A5C5F] hover:bg-[#1E4345] text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
                        >
                          Bayar QRIS
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. Riwayat Pembelian Selesai (Trade History) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Riwayat Pembelian Selesai ({completedOrders.length} Lot)</span>
              </h4>
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 self-start sm:self-center">
                Semua dana escrow telah dicairkan ke pedagang
              </span>
            </div>

            {completedOrders.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs font-medium">
                Belum ada pesanan yang selesai serah terima. Selesaikan klaim dan verifikasi PoD untuk mencatat riwayat.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider bg-slate-50/70">
                      <th className="py-2.5 px-3">Komoditas & No. Lot</th>
                      <th className="py-2.5 px-3">Volume Diterima</th>
                      <th className="py-2.5 px-3">Asal Kios Lapak</th>
                      <th className="py-2.5 px-3">Pelepasan Escrow (QRIS BI)</th>
                      <th className="py-2.5 px-3">Validasi GPS PoD Kurir</th>
                      <th className="py-2.5 px-3">Status Pesanan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {completedOrders.map((ofr) => {
                      const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
                      const vendor = KIOSKS.find((k) => k.id === ofr.vendorId);

                      return (
                        <tr key={ofr.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">
                              {comm?.localName || ofr.commodityId}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              ID: {ofr.id} · Tier 1 Warteg
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {ofr.quantityKg} kg (100% Utuh)
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-slate-700">
                            <div className="font-semibold text-slate-900">{vendor?.name}</div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Kios {vendor?.stallNumber} (Blok {vendor?.block})
                            </span>
                          </td>

                          <td className="py-2.5 px-3 font-mono font-bold text-[#047857]">
                            <div>Rp {ofr.totalAmountIdr.toLocaleString("id-ID")}</div>
                            <span className="text-[10px] text-slate-400 font-normal">Escrow BI Dilepas</span>
                          </td>

                          <td className="py-2.5 px-3 text-slate-600">
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>GPS Radius 18m (&le; 50m)</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Driver: Pak Joko (Viar 01) · Token: {ofr.podToken || "POD-HMAC-VERIFY"}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Tuntas di Dapur Warteg
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
          {activeOrders.length === 0 && completedOrders.length === 0 && (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs">
              Belum ada pesanan aktif. Silakan pilih lot pada tab Katalog Surplus.
            </div>
          )}
        </div>
      )}

      {/* QRIS Modal Simulation */}
      {selectedOfferForQris && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-xl text-center space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pembayaran QRIS Standar Bank Indonesia
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pindai kode QR dinamis di bawah untuk mengunci pembayaran di Escrow BI
              </p>
            </div>

            {/* Autentik QRIS Component */}
            <QrisCodeDisplay
              amountIdr={selectedOfferForQris.totalAmountIdr}
              merchantName="Warteg Kharisma Bahari Condet"
            />

            <div className="space-y-2 pt-2">
              <button
                onClick={handlePaySuccess}
                type="button"
                className="w-full py-2.5 rounded-xl bg-[#2A5C5F] hover:bg-[#1E4345] text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Konfirmasi Pembayaran QRIS</span>
              </button>
              <button
                onClick={() => setSelectedOfferForQris(null)}
                type="button"
                className="w-full py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
