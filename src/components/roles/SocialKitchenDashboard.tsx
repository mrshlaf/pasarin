"use client";

import { useMarketSimulation, RescueOffer } from "@/lib/simulationStore";
import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import {
  HeartHandshake,
  Clock,
  Sparkles,
  Utensils,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Gift,
  ArrowRight,
} from "lucide-react";

export function SocialKitchenDashboard() {
  const { offers, claimOfferByBuyer } = useMarketSimulation();

  // Tier 2 offers
  const tier2Offers = offers.filter(
    (o) => o.targetTier === "tier_2" && o.status === "active"
  );

  const claimedSocialOffers = offers.filter(
    (o) => o.claimantRole === "social_kitchen" || (o.status === "claimed" && o.targetTier === "tier_2")
  );

  const handleClaim = (offer: RescueOffer, isFreeDonation: boolean) => {
    claimOfferByBuyer(
      offer.id,
      "Dapur Sosial & Panti Asuhan Al-Hidayah Kramat Jati",
      "social_kitchen"
    );
  };

  // Hitung total porsi makanan terselamatkan (1 kg sayur = ~4 porsi makan)
  const totalKgRescued = claimedSocialOffers.reduce(
    (acc, o) => acc + o.quantityKg,
    40
  );
  const totalPortionsNutritious = totalKgRescued * 4;

  return (
    <div className="space-y-6">
      {/* Header Profile */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center text-xl font-bold shadow-sm shrink-0">
              <HeartHandshake className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Dapur Sosial & Panti Asuhan Al-Hidayah
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                  Mitra Sosial Terakreditasi (Tier 2)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Jl. Dukuh V No. 18, Kramat Jati · Kapasitas: 250 Anak Yatim & Lansia
              </p>
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 shrink-0">
            <span className="text-[10px] text-rose-700 uppercase font-bold tracking-wider block">
              Dampak Sosial Terakumulasi
            </span>
            <p className="text-lg font-extrabold text-rose-950 font-mono">
              {totalPortionsNutritious} Porsi Makanan
            </p>
            <span className="text-[11px] text-rose-600">
              dari {totalKgRescued} kg sayur surplus
            </span>
          </div>
        </div>
      </div>

      {/* 30-Minute Priority Alert */}
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 lg:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-950">
              Jendela Reservasi Prioritas 30 Menit Dapur Sosial
            </h3>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Sesuai UC-06 pada PRD, Dapur Sosial memiliki hak tebus prioritas selama 30 menit sebelum sistem
              secara otomatis melakukan <em>Auto-Cascade</em> menurunkan status komoditas ke Tier 3 (Pakan Maggot BSF).
            </p>
          </div>
        </div>
      </div>

      {/* Available Tier 2 Offers */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>Surplus Tersedia untuk Penebusan Subsidi / Donasi</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {tier2Offers.length} Lot
          </span>
        </h3>

        {tier2Offers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
            Tidak ada lot yang menunggu klaim Tier 2 saat ini. Semua surplus telah diselamatkan atau belum mencapai ambang kelayuan sosial (Decay 0.65 - 0.85).
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tier2Offers.map((ofr) => {
              const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
              const vendor = KIOSKS.find((k) => k.id === ofr.vendorId);
              const estPortions = ofr.quantityKg * 4;

              return (
                <div
                  key={ofr.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Tier 2 Kemanusiaan
                      </span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Sisa Prioritas: {ofr.expiresInMinutes}m
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900">
                      {comm?.localName || ofr.commodityId}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Asal: Kios {vendor?.stallNumber} · {vendor?.name} (Blok {vendor?.block})
                    </p>

                    <div className="my-3 p-3 rounded-xl bg-slate-50 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Kuantitas Lot:</span>
                        <strong className="text-slate-900">{ofr.quantityKg} kg</strong>
                      </div>
                      <div className="flex justify-between text-rose-700 font-semibold">
                        <span>Potensi Porsi Gizi:</span>
                        <span>{estPortions} Porsi Makanan</span>
                      </div>
                      <div className="flex justify-between text-slate-400 line-through">
                        <span>Harga Grosir Asal:</span>
                        <span>Rp {ofr.originalPricePerKg.toLocaleString("id-ID")}/kg</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5">
                        <span>Biaya Tebus Murah (Subsidi):</span>
                        <span className="text-emerald-700 font-mono text-sm">
                          Rp {ofr.totalAmountIdr.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => handleClaim(ofr, false)}
                      type="button"
                      className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      Tebus Murah Subsidi
                    </button>
                    <button
                      onClick={() => handleClaim(ofr, true)}
                      type="button"
                      className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      Klaim Donasi Pangan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
