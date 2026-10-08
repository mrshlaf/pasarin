"use client";

import { useMarketSimulation } from "@/lib/simulationStore";
import { COMMODITIES } from "@/data/commodities";
import {
  Recycle,
  Sprout,
  Scale,
  Sparkles,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Leaf,
  Layers,
} from "lucide-react";

export function MaggotDashboard() {
  const { offers, claimOfferByBuyer } = useMarketSimulation();

  const tier3Offers = offers.filter(
    (o) => o.targetTier === "tier_3" && o.status === "active"
  );

  const claimedTier3Offers = offers.filter(
    (o) => o.claimantRole === "maggot" || (o.status === "claimed" && o.targetTier === "tier_3")
  );

  const totalBiomassIntakeKg = claimedTier3Offers.reduce(
    (acc, o) => acc + o.quantityKg,
    180
  );

  // Rasio biokonversi Black Soldier Fly (BSF): 5 kg limbah sayur basah = 1 kg larva basah + 1.2 kg kompos kasgot
  const estLarvaHarvestKg = Number((totalBiomassIntakeKg / 5.0).toFixed(1));
  const estKasgotFertilizerKg = Number((totalBiomassIntakeKg * 0.24).toFixed(1));

  return (
    <div className="space-y-6">
      {/* Header Profile */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-xl font-bold shadow-sm shrink-0">
              <Recycle className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Sentra Budidaya Maggot BSF & TPS 3R Kramat Jati
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Daur Ulang Sirkular (Tier 3)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Area TPS 3R Belakang Pasar Induk Kramat Jati · 40 Rak Biopond Aktif
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center min-w-28">
              <span className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider block">
                Total Masuk
              </span>
              <p className="text-base font-extrabold text-emerald-950 font-mono">
                {totalBiomassIntakeKg} kg
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center min-w-28">
              <span className="text-[10px] text-amber-700 uppercase font-bold tracking-wider block">
                Panen Larva BSF
              </span>
              <p className="text-base font-extrabold text-amber-950 font-mono">
                {estLarvaHarvestKg} kg
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Biopond Conversion */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              Rasio Biokonversi Larva
            </span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">5 : 1</p>
          <p className="text-[11px] text-slate-400 mt-1">
            5 kg sayur busuk terkonversi menjadi 1 kg larva protein tinggi
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              Produksi Pupuk Kasgot
            </span>
            <Sprout className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 font-mono">
            {estKasgotFertilizerKg} kg
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Residu bahan organik menjadi pupuk organik padat kaya nitrogen
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              Kapasitas Rak Biopond
            </span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            40 / 50 Rak
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Tingkat utilisasi ruang biokonversi mencapai 80%
          </p>
        </div>
      </div>

      {/* Available Tier 3 Lots */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Daftar Muatan Limbah Organik Siap Angkut (Tier 3)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Sayuran yang telah melampaui batas aman konsumsi manusia (Decay Score &ge; 0.85) dialihkan langsung ke sentra pakan larva.
        </p>

        {tier3Offers.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
            Tidak ada lot limbah busuk massal saat ini. Sebagian besar komoditas berhasil diselamatkan di Tier 1 & Tier 2.
          </div>
        ) : (
          <div className="space-y-3">
            {tier3Offers.map((ofr) => {
              const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
              return (
                <div
                  key={ofr.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {comm?.localName || ofr.commodityId} · {ofr.quantityKg} kg
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Status: Rusak berat non-food grade · Potensi panen: {(ofr.quantityKg / 5).toFixed(1)} kg larva
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      claimOfferByBuyer(ofr.id, "Sentra Maggot BSF Kramat Jati", "maggot")
                    }
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                  >
                    Angkut ke Biopond
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
