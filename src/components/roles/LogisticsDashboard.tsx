"use client";

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
  const [gpsDistance, setGpsDistance] = useState<number>(25);
  const [podFeedback, setPodFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleVerifyPoD = () => {
    if (!selectedOfferForPoD) return;
    const result = verifyDeliveryPoD(selectedOfferForPoD.id, gpsDistance);
    setPodFeedback(result);
    if (result.success) {
      setTimeout(() => {
        setSelectedOfferForPoD(null);
        setPodFeedback(null);
      }, 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Profile */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#1E293B] border border-slate-300 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Armada Logistik Motor Roda Tiga Viar 01
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-[#1E293B] border border-slate-300">
                  Driver: Pak Joko Santoso
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Pangkalan: Area Parkir Barat Pasar Induk · Kapasitas: 300 kg
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#F0F6F6] border border-[#D1E1E2] rounded-xl p-3 text-center min-w-28">
              <span className="text-[10px] text-[#2A5C5F] uppercase font-bold tracking-wider block">
                Antrean Kirim
              </span>
              <p className="text-base font-bold text-slate-900 font-mono">
                {dispatchableOffers.length} Lot
              </p>
            </div>

            <div className="bg-[#F0F6F6] border border-[#D1E1E2] rounded-xl p-3 text-center min-w-28">
              <span className="text-[10px] text-[#2A5C5F] uppercase font-bold tracking-wider block">
                Selesai (PoD)
              </span>
              <p className="text-base font-bold text-[#047857] font-mono">
                {settledOffers.length} Lot
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Classifications */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-900">Motor Viar Roda 3</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
              &le; 300 kg
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Pengambilan lincah di lorong pasar menuju warteg Condet & Cililitan (&le; 5 km).
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-900">Daihatsu GranMax Pikap</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
              301 - 1.000 kg
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Pengiriman gabungan multi-stop untuk katering dan dapur sosial.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-900">Truk Bak Terbuka</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
              &gt; 1.000 kg
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Distribusi tonase massal limbah organik langsung ke TPS 3R & sentra maggot.
          </p>
        </div>
      </div>

      {/* Active Delivery Queue */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Daftar Penugasan Pengantaran & Validasi PoD
        </h3>
        <p className="text-xs text-slate-600 mb-4 font-medium">
          Konfirmasi serah terima fisik di los pedagang dengan validasi geofence GPS radius &le; 50 meter
        </p>

        {dispatchableOffers.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs font-medium">
            Tidak ada penugasan tertunda saat ini.
          </div>
        ) : (
          <div className="space-y-3">
            {dispatchableOffers.map((ofr) => {
              const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
              const vendor = KIOSKS.find((k) => k.id === ofr.vendorId);

              return (
                <div
                  key={ofr.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-900">
                        {comm?.localName || ofr.commodityId} ({ofr.quantityKg} kg)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-[#075985] border border-sky-300">
                        Dana Terkunci di Escrow BI
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 space-y-0.5 font-medium">
                      <p>
                        <strong className="text-slate-900">Ambil di Kios:</strong> {vendor?.name} (Kios {vendor?.stallNumber}, Blok {vendor?.block})
                      </p>
                      <p>
                        <strong className="text-slate-900">Tujuan:</strong> {ofr.claimedBy || "Pembeli Terverifikasi"}
                      </p>
                      <p className="font-mono text-[#075985] font-bold text-[11px]">
                        Token: {ofr.podToken || "POD-HMAC-VERIFY"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedOfferForPoD(ofr);
                      setPodFeedback(null);
                    }}
                    type="button"
                    className="px-4 py-2.5 rounded-xl bg-[#0369A1] hover:bg-[#075985] text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs shrink-0"
                  >
                    <QrCode className="w-4 h-4" />
                    Validasi Serah Terima PoD
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal PoD Handover Scanner */}
      {selectedOfferForPoD && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#075985] border border-sky-300 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Validasi Serah Terima PoD
                </h4>
                <p className="text-[11px] text-slate-600 font-medium">
                  Verifikasi kunci HMAC & geofence GPS &le; 50 meter dari los
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-600">Kunci Verifikasi:</span>
                <span className="font-mono font-bold text-[#075985]">
                  {selectedOfferForPoD.podToken || "POD-HMAC-VERIFY"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Penerima:</span>
                <strong className="text-slate-900 font-bold">{selectedOfferForPoD.claimedBy}</strong>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="text-slate-600">Pencairan Escrow:</span>
                <strong className="text-[#1E4345] font-mono font-extrabold">
                  Rp {selectedOfferForPoD.totalAmountIdr.toLocaleString("id-ID")}
                </strong>
              </div>
            </div>

            {/* GPS Simulation Slider */}
            <div className="mb-5">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-800">Jarak GPS ke Los Kios:</span>
                <span
                  className={`font-mono font-bold ${
                    gpsDistance <= 50 ? "text-[#047857]" : "text-[#BE123C]"
                  }`}
                >
                  {gpsDistance} m {gpsDistance <= 50 ? "(Lolos Geofence)" : "(Terlalu Jauh)"}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={gpsDistance}
                onChange={(e) => setGpsDistance(Number(e.target.value))}
                className="w-full accent-[#0369A1]"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-medium mt-1">
                <span>5m (Di Kios)</span>
                <span>50m (Batas Maksimal)</span>
                <span>100m (Di Luar)</span>
              </div>
            </div>

            {/* Feedback message */}
            {podFeedback && (
              <div
                className={`p-3 rounded-xl text-xs mb-4 flex items-start gap-2 ${
                  podFeedback.success
                    ? "bg-emerald-50 text-[#065F46] border border-emerald-300 font-semibold"
                    : "bg-rose-50 text-[#BE123C] border border-rose-300 font-semibold"
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

            <div className="space-y-2">
              <button
                onClick={handleVerifyPoD}
                type="button"
                className="w-full py-2.5 rounded-xl bg-[#0369A1] hover:bg-[#075985] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                Verifikasi & Cairkan Dana Escrow
              </button>
              <button
                onClick={() => setSelectedOfferForPoD(null)}
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
