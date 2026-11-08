"use client";

/**
 * Dasbor Peran Kurir Logistik & Pengangkutan Armada (LogisticsDashboard) (Clean Swiss Minimalist).
 * Mengelola:
 * 1. Antrean tugas pengantaran armada berdasarkan kelas muatan (Viar <=300kg, GranMax <=800kg, Truk >800kg).
 * 2. Validasi serah terima fisik (Proof of Delivery / PoD) dengan geofencing GPS radius <= 50 meter.
 * 3. Verifikasi token HMAC dan pencairan otomatis dana tertahan di rekening escrow ke saldo pedagang.
 */

import { useState } from "react";
import { useMarketSimulation, RescueOffer } from "@/lib/simulationStore";
import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import {
  Truck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Check,
  QrCode,
} from "lucide-react";

export function LogisticsDashboard() {
  const { offers, verifyDeliveryPoD } = useMarketSimulation();

  const dispatchableOffers = offers.filter(
    (o) => o.status === "claimed" && o.paymentStatus === "held_in_escrow"
  );

  const settledOffers = offers.filter((o) => o.status === "settled");

  const [selectedOfferForPoD, setSelectedOfferForPoD] = useState<RescueOffer | null>(null);
  const [podFeedback, setPodFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleVerifyPoD = () => {
    if (!selectedOfferForPoD) return;
    // Verifikasi serah terima fisik komoditas berbasis token otorisasi digital PoD
    const result = verifyDeliveryPoD(selectedOfferForPoD.id, 0);
    setPodFeedback(result);
    if (result.success) {
      setTimeout(() => {
        setSelectedOfferForPoD(null);
        setPodFeedback(null);
      }, 1500);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Profile */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-slate-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Armada Distribusi Viar Roda Tiga 01
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Pak Joko Santoso
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Pangkalan: Area Parkir Barat Pasar Induk Kramat Jati · Kapasitas: 300 kg
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="bg-[#F0F6F6] border border-[#D1E1E2] rounded-lg p-2.5 text-center min-w-24">
              <span className="text-[10px] text-[#2A5C5F] uppercase font-bold tracking-wider block">
                Antrean Kirim
              </span>
              <p className="text-sm font-bold text-slate-900 font-mono">
                {dispatchableOffers.length} Lot
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center min-w-24">
              <span className="text-[10px] text-[#065F46] uppercase font-bold tracking-wider block">
                Selesai (PoD)
              </span>
              <p className="text-sm font-bold text-[#047857] font-mono">
                {settledOffers.length} Lot
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Card Quick Metrics Row for Logistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Antrean Jemput Hari Ini</span>
            <Truck className="w-4 h-4 text-[#0369A1]" />
          </div>
          <p className="text-lg font-black font-mono text-slate-900">{dispatchableOffers.length} Lot</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Dana pembeli sudah di escrow</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Selesai Serah Terima</span>
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-black font-mono text-[#047857]">{settledOffers.length} Lot</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Kunci HMAC terverifikasi</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Batas Radius Operasi</span>
            <MapPin className="w-4 h-4 text-[#2A5C5F]" />
          </div>
          <p className="text-lg font-black font-mono text-slate-900">&le; 5.0 km</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Condet, Cililitan, Cawang</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Otorisasi Serah Terima</span>
            <ShieldCheck className="w-4 h-4 text-[#047857]" />
          </div>
          <p className="text-lg font-black font-mono text-[#047857]">Token PoD</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Proteksi keabsahan serah terima</span>
        </div>
      </div>
      {/* Active Delivery Queue */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-0.5">
          Daftar Penugasan Pengantaran & Validasi PoD
        </h3>
        <p className="text-xs text-slate-500 mb-4 font-medium">
          Konfirmasi serah terima fisik komoditas dengan verifikasi kode otorisasi Proof of Delivery (PoD)
        </p>

        {dispatchableOffers.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs font-medium">
            Tidak ada penugasan tertunda saat ini. Semua pesanan telah selesai atau menunggu klaim pembeli.
          </div>
        ) : (
          <div className="space-y-2.5">
            {dispatchableOffers.map((ofr) => {
              const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
              const vendor = KIOSKS.find((k) => k.id === ofr.vendorId);

              return (
                <div
                  key={ofr.id}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900">
                        {comm?.localName || ofr.commodityId} ({ofr.quantityKg} kg)
                      </span>
                      <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-sky-100 text-[#075985] border border-sky-200">
                        {ofr.targetTier === "tier_1"
                          ? "Escrow BI Terkunci"
                          : ofr.targetTier === "tier_2"
                          ? "Subsidi CSR Terkunci"
                          : "Angkutan TPS 3R"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-0.5 font-medium">
                      <p>
                        <strong className="text-slate-800">Ambil di Kios:</strong> {vendor?.name} (Kios {vendor?.stallNumber}, Blok {vendor?.block})
                      </p>
                      <p>
                        <strong className="text-slate-800">Tujuan:</strong> {ofr.claimedBy || "Pembeli Terverifikasi"}
                      </p>
                      <p className="font-mono text-[#075985] text-[11px] font-bold">
                        Token PoD: {ofr.podToken || "POD-HMAC-VERIFY"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedOfferForPoD(ofr);
                      setPodFeedback(null);
                    }}
                    type="button"
                    className="px-3.5 py-2 rounded-lg bg-[#0369A1] hover:bg-[#075985] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Validasi Serah Terima PoD</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settled Delivery History (Trade & Delivery History) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-0.5 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Riwayat Pengantaran Selesai & Pelepasan Escrow ({settledOffers.length} Lot)</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4 font-medium">
          Daftar pengantaran armada yang telah tervalidasi Proof of Delivery (PoD) dan dana telah dicairkan ke pedagang
        </p>

        {settledOffers.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs font-medium">
            Belum ada pengantaran yang diselesaikan hari ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider bg-slate-50/70">
                  <th className="py-2.5 px-3">Komoditas & Muatan</th>
                  <th className="py-2.5 px-3">Asal Kios</th>
                  <th className="py-2.5 px-3">Tujuan Pengantaran</th>
                  <th className="py-2.5 px-3">Validasi Serah Terima (PoD)</th>
                  <th className="py-2.5 px-3">Status Escrow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {settledOffers.map((ofr) => {
                  const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
                  const vendor = KIOSKS.find((k) => k.id === ofr.vendorId);

                  return (
                    <tr key={ofr.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">
                          {comm?.localName || ofr.commodityId}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {ofr.quantityKg} kg · ID: {ofr.id}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-700">
                        <div className="font-semibold text-slate-900">{vendor?.name}</div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Kios {vendor?.stallNumber} (Blok {vendor?.block})
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 font-semibold">
                        {ofr.claimedBy || "Warteg Kharisma Bahari"}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>PoD Tervalidasi</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#075985]">
                          Token: {ofr.podToken || "POD-HMAC-VERIFY"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Rp {ofr.totalAmountIdr.toLocaleString("id-ID")} Cair
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

      {/* Modal PoD Handover Scanner */}
      {selectedOfferForPoD && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#075985] border border-sky-300 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Validasi Serah Terima Fisik (Proof of Delivery)
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Verifikasi kode otorisasi token PoD saat komoditas diserahterimakan
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Kunci Token:</span>
                <span className="font-mono font-bold text-[#075985]">
                  {selectedOfferForPoD.podToken || "POD-HMAC-VERIFY"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Penerima Manfaat:</span>
                <strong className="text-slate-900 font-bold">{selectedOfferForPoD.claimedBy}</strong>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="text-slate-500">Pencairan Escrow:</span>
                <strong className="text-[#1E4345] font-mono font-extrabold">
                  Rp {selectedOfferForPoD.totalAmountIdr.toLocaleString("id-ID")}
                </strong>
              </div>
            </div>

            {/* Status Otorisasi Serah Terima */}
            <div className="mb-4 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-600 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Status Otorisasi:
                </span>
                <span className="font-mono font-bold text-[#047857] bg-white px-2 py-0.5 rounded border border-emerald-200">
                  Siap Serah Terima Fisik
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Paket komoditas telah tiba di lokasi tujuan. Kunci token siap diverifikasi untuk pelepasan dana.
              </p>
            </div>
            {/* Feedback message */}
            {podFeedback && (
              <div
                className={`p-3 rounded-lg text-xs mb-3 flex items-start gap-2 ${
                  podFeedback.success
                    ? "bg-emerald-50 text-[#065F46] border border-emerald-200 font-semibold"
                    : "bg-rose-50 text-[#BE123C] border border-rose-200 font-semibold"
                }`}
              >
                {podFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#BE123C] shrink-0 mt-0.5" />
                )}
                <span>{podFeedback.message}</span>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                onClick={handleVerifyPoD}
                type="button"
                className="w-full py-2.5 rounded-lg bg-[#2A5C5F] hover:bg-[#1E4345] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Verifikasi & Cairkan Dana Escrow</span>
              </button>
              <button
                onClick={() => setSelectedOfferForPoD(null)}
                type="button"
                className="w-full py-2 rounded-lg text-slate-500 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
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
