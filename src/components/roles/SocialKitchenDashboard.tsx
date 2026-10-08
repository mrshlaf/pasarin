"use client";

import { useMarketSimulation, RescueOffer } from "@/lib/simulationStore";
import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import {
  HeartHandshake,
  Clock,
  MapPin,
  Utensils,
  Gift,
} from "lucide-react";

export function SocialKitchenDashboard() {
  const { offers, claimOfferByBuyer } = useMarketSimulation();

  const tier2Offers = offers.filter(
    (o) => o.targetTier === "tier_2" && o.status === "active"
  );

  const claimedSocialOffers = offers.filter(
    (o) => o.claimantRole === "social_kitchen" || (o.status === "claimed" && o.targetTier === "tier_2")
  );

  const handleClaim = (offer: RescueOffer) => {
    claimOfferByBuyer(
      offer.id,
      "Dapur Sosial & Panti Asuhan Al-Hidayah",
      "social_kitchen"
    );
  };

  const totalKgRescued = claimedSocialOffers.reduce(
    (acc, o) => acc + o.quantityKg,
    40
  );
  const totalPortionsNutritious = totalKgRescued * 4;

  return (
    <div className="space-y-6">
      {/* Header Profile */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-[#BE123C] border border-rose-200 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Dapur Sosial & Panti Asuhan Al-Hidayah
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-[#BE123C] border border-rose-300">
                  Penyelamatan Pangan Tier 2
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Jl. Dukuh V No. 18, Kramat Jati · Kapasitas 250 Penerima Manfaat
              </p>
            </div>
          </div>

          <div className="bg-[#F0F6F6] border border-[#D1E1E2] rounded-xl p-3 shrink-0">
            <span className="text-[10px] text-[#2A5C5F] uppercase font-bold tracking-wider block">
              Dampak Terakumulasi
            </span>
            <p className="text-base font-bold text-slate-900 font-mono">
              {totalPortionsNutritious} Porsi Makanan
            </p>
            <span className="text-[11px] text-slate-600 font-medium">
              dari {totalKgRescued} kg sayur surplus
            </span>
          </div>
        </div>
      </div>

      {/* 30-Minute Priority Window Note */}
      <div className="bg-[#F0F6F6] border border-[#D1E1E2] rounded-2xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-white text-[#2A5C5F] border border-[#D1E1E2] flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-[#1E4345]">
            Jendela Reservasi Prioritas 30 Menit
          </h3>
          <p className="text-xs text-slate-700 mt-0.5 leading-relaxed font-medium">
            Mitra sosial memiliki hak klaim pertama selama 30 menit sebelum sistem secara otomatis mengalihkan komoditas ke Tier 3 (Biokonversi Maggot).
          </p>
        </div>
      </div>

      {/* Available Tier 2 Offers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium px-1">
          <span>Surplus Tersedia untuk Subsidi & Donasi Pangan</span>
          <span className="font-bold font-mono text-slate-900">{tier2Offers.length} Lot</span>
        </div>

        {tier2Offers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs font-medium">
            Tidak ada lot yang menunggu klaim Tier 2 saat ini.
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
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-[#BE123C] border border-rose-300">
                        Tier 2 Sosial
                      </span>
                      <span className="text-xs font-mono text-slate-600 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {ofr.expiresInMinutes}m tersisa
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900">
                      {comm?.localName || ofr.commodityId}
                    </h4>
                    <p className="text-xs text-slate-600 font-medium">
                      Asal: Kios {vendor?.stallNumber} · {vendor?.name}
                    </p>

                    <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Kuantitas Lot:</span>
                        <strong className="text-slate-900 font-mono font-bold">{ofr.quantityKg} kg</strong>
                      </div>
                      <div className="flex justify-between text-[#BE123C] font-bold">
                        <span>Estimasi Porsi:</span>
                        <span>{estPortions} Porsi Bergizi</span>
                      </div>
                      <div className="flex justify-between text-slate-500 line-through font-mono">
                        <span>Harga Asal:</span>
                        <span>Rp {ofr.originalPricePerKg.toLocaleString("id-ID")}/kg</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5">
                        <span>Biaya Subsidi:</span>
                        <span className="text-[#1E4345] font-mono text-sm font-black">
                          Rp {ofr.totalAmountIdr.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => handleClaim(ofr)}
                      type="button"
                      className="py-2.5 rounded-xl bg-[#BE123C] hover:bg-[#9F1239] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      Tebus Subsidi
                    </button>
                    <button
                      onClick={() => handleClaim(ofr)}
                      type="button"
                      className="py-2.5 rounded-xl border-2 border-[#2A5C5F] hover:bg-[#F0F6F6] text-[#2A5C5F] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      Klaim Donasi
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
