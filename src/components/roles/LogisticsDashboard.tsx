"use client";

import { useState } from "react";
import { useMarketSimulation, RescueOffer } from "@/lib/simulationStore";
import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import {
  Truck,
  Navigation,
  QrCode,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Check,
  Zap,
} from "lucide-react";

export function LogisticsDashboard() {
  const { offers, verifyDeliveryPoD } = useMarketSimulation();

  // Offers that are claimed and need delivery
  const dispatchableOffers = offers.filter(
    (o) => o.status === "claimed" && o.paymentStatus === "held_in_escrow"
  );

  const settledOffers = offers.filter((o) => o.status === "settled");

  // State untuk modal PoD Handover
  const [selectedOfferForPoD, setSelectedOfferForPoD] = useState<RescueOffer | null>(null);
  const [gpsDistance, setGpsDistance] = useState<number>(25); // meter
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
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-sm shrink-0">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Armada Logistik Motor Roda Tiga Viar 01
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  Driver: Pak Joko Santoso
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Pangkalan: Parkiran Barat Pasar Induk Kramat Jati · Kapasitas: 300 kg
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center min-w-28">
              <span className="text-[10px] text-blue-700 uppercase font-bold tracking-wider block">
                Antrean Kirim
              </span>
              <p className="text-base font-extrabold text-blue-950 font-mono">
                {dispatchableOffers.length} Lot
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center min-w-28">
              <span className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider block">
                Terkirim (PoD)
              </span>
              <p className="text-base font-extrabold text-emerald-950 font-mono">
                {settledOffers.length} Lot
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Classification & TSP Navigation Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Motor Viar Roda 3</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              &le; 300 kg
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Penjemputan cepat lorong sempit pasar Kramat Jati menuju warteg Condet & Cililitan (&le; 5 km).
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Daihatsu GranMax Pikap</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              301 - 1.000 kg
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Pengiriman gabungan multi-stop TSP untuk konsorsium katering & dapur sosial.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Truk Bak Terbuka</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              &gt; 1.000 kg
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Angkutan biomassa massal Tier 3 langsung ke TPS 3R dan sentra maggot BSF.
          </p>
        </div>
      </div>

      {/* Active Delivery Queue & PoD Verification */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Daftar Penugasan Pengantaran & Serah Terima Fisik (PoD)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Pindai token PoD atau konfirmasi serah terima di kios pedagang dengan geofencing GPS radius &le; 50 meter.
        </p>

        {dispatchableOffers.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
            Tidak ada penugasan tertunda saat ini. Semua pesanan telah selesai diserahterimakan.
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
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                        Dana Terkunci di Escrow BI
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p>
                        <strong>Ambil di Kios:</strong> {vendor?.name} (Kios {vendor?.stallNumber}, Blok {vendor?.block})
                      </p>
                      <p>
                        <strong>Antar ke:</strong> {ofr.claimedBy || "Pembeli Terverifikasi"}
                      </p>
                      <p className="font-mono text-purple-700 font-semibold text-[11px]">
                        Token Verifikasi: {ofr.podToken || "POD-HMAC-VERIFY"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedOfferForPoD(ofr);
                      setPodFeedback(null);
                    }}
                    type="button"
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer shrink-0"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Validasi Serah Terima PoD (HMAC & Geofence)
                </h4>
                <p className="text-[11px] text-slate-500">
                  UC-09: Validasi token kriptografi & koordinat GPS &le; 50 meter
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Token Kunci:</span>
                <span className="font-mono font-bold text-purple-700">
                  {selectedOfferForPoD.podToken || "POD-HMAC-VERIFY"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Penerima Manfaat:</span>
                <strong className="text-slate-900">{selectedOfferForPoD.claimedBy}</strong>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="text-slate-500">Pencairan Dana Escrow:</span>
                <strong className="text-emerald-700 font-mono">
                  Rp {selectedOfferForPoD.totalAmountIdr.toLocaleString("id-ID")}
                </strong>
              </div>
            </div>

            {/* GPS Simulation Slider */}
            <div className="mb-5">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Simulasi Jarak GPS ke Los Kios:</span>
                <span
                  className={`font-mono font-bold ${
                    gpsDistance <= 50 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {gpsDistance} meter {gpsDistance <= 50 ? "(Lolos Geofence)" : "(Terlalu Jauh!)"}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                value={gpsDistance}
                onChange={(e) => setGpsDistance(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>5m (Di Depan Los)</span>
                <span>50m (Batas Maksimal)</span>
                <span>120m (Di Luar Pasar)</span>
              </div>
            </div>

            {/* Feedback message */}
            {podFeedback && (
              <div
                className={`p-3 rounded-xl text-xs mb-4 flex items-start gap-2 ${
                  podFeedback.success
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {podFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{podFeedback.message}</span>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleVerifyPoD}
                type="button"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Verifikasi & Cairkan Dana Escrow
              </button>
              <button
                onClick={() => setSelectedOfferForPoD(null)}
                type="button"
                className="w-full py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium transition cursor-pointer"
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
