"use client";

/**
 * Dasbor Peran Sentra Budidaya Maggot BSF & TPS 3R (MaggotDashboard) (Clean Swiss Minimalist).
 * Mengelola biokonversi limbah pangan afkir Tier 3 (decayScore >= 0.85):
 * 1. Rasio biokonversi larva BSF (5 : 1 untuk protein hewani).
 * 2. Produksi pupuk organik padat kasgot (24% dari biomassa intake).
 * 3. Kapasitas penampungan 40 rak biopond aktif area belakang Pasar Kramat Jati.
 */

import { useMarketSimulation } from "@/lib/simulationStore";
import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import {
  Recycle,
  Scale,
  Leaf,
  Layers,
  MapPin,
  Check,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
export function MaggotDashboard() {
  const { offers, stockItems, getEvaluationForStock, claimOfferByBuyer } = useMarketSimulation();

  const tier3Offers = offers.filter((o) => {
    if (o.status !== "active") return false;
    if (o.targetTier === "tier_3") return true;
    const linkedStock = stockItems.find((s) => s.id === o.stockId);
    if (linkedStock) {
      const evaluation = getEvaluationForStock(linkedStock);
      if (evaluation.decayScore >= 0.85) return true;
    }
    return false;
  });
  const claimedTier3Offers = offers.filter(
    (o) => o.claimantRole === "maggot" || (o.targetTier === "tier_3" && (o.status === "claimed" || o.status === "settled"))
  );

  const settledMaggotLots = claimedTier3Offers.filter((o) => o.status === "settled");

  const totalBiomassIntakeKg = claimedTier3Offers.reduce(
    (acc, o) => acc + o.quantityKg,
    180
  );
  const estLarvaHarvestKg = Number((totalBiomassIntakeKg / 5.0).toFixed(1));
  const estKasgotFertilizerKg = Number((totalBiomassIntakeKg * 0.24).toFixed(1));

  return (
    <div className="space-y-5">
      {/* Header Profile */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-[#047857] border border-emerald-200 flex items-center justify-center shrink-0">
              <Recycle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Sentra Budidaya Maggot BSF & TPS 3R
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-[#065F46] border border-emerald-300">
                  Tier 3 Biokonversi
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                TPS 3R Area Belakang Pasar Induk Kramat Jati · 40 Rak Biopond Aktif
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="bg-[#F0F6F6] border border-[#D1E1E2] rounded-lg p-2.5 text-center min-w-24">
              <span className="text-[10px] text-[#2A5C5F] uppercase font-bold tracking-wider block">
                Total Masuk
              </span>
              <p className="text-sm font-bold text-slate-900 font-mono">
                {totalBiomassIntakeKg} kg
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center min-w-24">
              <span className="text-[10px] text-[#065F46] uppercase font-bold tracking-wider block">
                Larva Protein
              </span>
              <p className="text-sm font-bold text-[#047857] font-mono">
                {estLarvaHarvestKg} kg
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Biopond 4-Card Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-600">
              Rasio Biokonversi
            </span>
            <Scale className="w-4 h-4 text-[#047857]" />
          </div>
          <p className="text-xl font-bold text-slate-900 font-mono">5 : 1</p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
            5 kg afkir &rarr; 1 kg larva protein
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-600">
              Pupuk Kasgot
            </span>
            <Leaf className="w-4 h-4 text-[#047857]" />
          </div>
          <p className="text-xl font-bold text-[#047857] font-mono">
            {estKasgotFertilizerKg} kg
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
            Pupuk organik padat bernutrisi
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-600">
              Kapasitas Biopond
            </span>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 font-mono">
            40 / 50 Rak
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
            80% ruang biokonversi terisi
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-600">
              Total Sampah Terolah
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              TPS 3R
            </span>
          </div>
          <p className="text-xl font-bold text-emerald-700 font-mono">
            {totalBiomassIntakeKg} kg
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
            Dikelola menjadi pakan larva biokonversi
          </p>
        </div>
      </div>

      {/* Available Tier 3 Lots */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-0.5">
          Muatan Biomassa Organik Non-Konsumsi (Tier 3)
        </h3>
        <p className="text-xs text-slate-500 mb-3.5 font-medium">
          Sayuran yang telah melampaui batas aman konsumsi pangan (Decay Score &ge; 0.85) dialihkan ke biopond pakan larva
        </p>

        {tier3Offers.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs font-medium">
            Tidak ada limbah busuk massal saat ini. Sebagian besar komoditas berhasil diselamatkan di Tier 1 & 2 untuk konsumsi manusia.
          </div>
        ) : (
          <div className="space-y-2.5">
            {tier3Offers.map((ofr) => {
              const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
              return (
                <div
                  key={ofr.id}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {comm?.localName || ofr.commodityId} · {ofr.quantityKg} kg
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Potensi panen: {(ofr.quantityKg / 5).toFixed(1)} kg larva protein pakan
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      claimOfferByBuyer(ofr.id, "Sentra Maggot BSF Kramat Jati", "maggot")
                    }
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-[#047857] hover:bg-[#065F46] text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Angkut ke Biopond</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Riwayat Biokonversi & Pakan Maggot Selesai (Tracking History) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Riwayat Biokonversi & Pakan Maggot Selesai ({settledMaggotLots.length} Lot)</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Pelacakan transparan seluruh muatan limbah organik pasar yang telah terurai di bak biopond larva BSF
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-50 text-[#047857] px-2.5 py-1 rounded-md border border-emerald-200 self-start sm:self-center">
            {settledMaggotLots.reduce((acc, o) => acc + o.quantityKg, 0)} kg Terolah di TPS 3R
          </span>
        </div>

        {settledMaggotLots.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs font-medium">
            Belum ada muatan limbah afkir yang selesai diantar ke biopond hari ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider bg-slate-50/70">
                  <th className="py-2.5 px-3">Komoditas Afkir & No. Lot</th>
                  <th className="py-2.5 px-3">Volume Biomassa</th>
                  <th className="py-2.5 px-3">Asal Kios Los</th>
                  <th className="py-2.5 px-3">Hasil Biokonversi</th>
                  <th className="py-2.5 px-3">Validasi Pengangkutan</th>
                  <th className="py-2.5 px-3">Status Pengolahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {settledMaggotLots.map((ofr) => {
                  const comm = COMMODITIES.find((c) => c.id === ofr.commodityId);
                  const vendor = KIOSKS.find((k) => k.id === ofr.vendorId);
                  const larvaKg = (ofr.quantityKg / 5.0).toFixed(1);
                  const kasgotKg = (ofr.quantityKg * 0.24).toFixed(1);

                  return (
                    <tr key={ofr.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">
                          {comm?.localName || ofr.commodityId}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          ID: {ofr.id} · Non-Food Grade
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                          {ofr.quantityKg} kg Biomassa
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-slate-700">
                        <div className="font-semibold text-slate-900">{vendor?.name}</div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Kios {vendor?.stallNumber} (Blok {vendor?.block})
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-[#047857]">
                          +{larvaKg} kg Larva Protein
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          +{kasgotKg} kg Pupuk Kasgot
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Armada TPS 3R</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          Token: {ofr.podToken || "POD-HMAC-VERIFY"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Terurai di Biopond
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
