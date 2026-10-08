"use client";

import { useState } from "react";
import { useMarketSimulation } from "@/lib/simulationStore";
import { KIOSKS } from "@/data/kiosks";
import {
  Building2,
  Thermometer,
  ShieldCheck,
  Printer,
} from "lucide-react";

export function ManagerDashboard() {
  const { stageConfig, totalCarbonSavedKg } = useMarketSimulation();
  const [selectedBlock, setSelectedBlock] = useState<"all" | "A" | "B" | "C">("all");
  const [showDLHReport, setShowDLHReport] = useState(false);

  const filteredKiosks = KIOSKS.filter((k) => {
    return selectedBlock === "all" || k.block === selectedBlock;
  });

  return (
    <div className="space-y-6">
      {/* Header Profile */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F0F6F6] text-[#2A5C5F] border border-[#D1E1E2] flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Kantor Pengelola Pasar Jaya (Kramat Jati)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0F6F6] text-[#2A5C5F] border border-[#D1E1E2]">
                  Kepala Unit: Ir. Bambang Suherman
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Perumda Pasar Jaya · 30 Kios Binaan Smart Waste Redistribution
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDLHReport(true)}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-[#2A5C5F] hover:bg-[#224C4E] text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-2xs shrink-0"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan DLH DKI
          </button>
        </div>
      </div>

      {/* IoT Microclimate Los Monitor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              Blok A (Sayuran Daun)
            </span>
            <Thermometer className="w-4 h-4 text-[#2A5C5F]" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">
            {stageConfig.temperatureC.toFixed(1)}°C
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            RH {stageConfig.humidityPercent}% · Laju respirasi tinggi
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              Blok B (Bumbu & Buah)
            </span>
            <Thermometer className="w-4 h-4 text-[#2A5C5F]" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">
            {(stageConfig.temperatureC - 1.2).toFixed(1)}°C
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            RH {stageConfig.humidityPercent - 4}% · Kondisi moderat
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              Blok C (Umbi & Tahan Lama)
            </span>
            <Thermometer className="w-4 h-4 text-[#2A5C5F]" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">
            {(stageConfig.temperatureC - 2.5).toFixed(1)}°C
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Ventilasi teduh · Ketahanan prima
          </p>
        </div>
      </div>

      {/* 30 Kiosks Directory Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Direktori 30 Kios Binaan
            </h3>
            <p className="text-xs text-slate-500">
              Status legalitas dokumen PD Pasar Jaya dan evaluasi kepatuhan
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setSelectedBlock("all")}
              type="button"
              className={`px-3 py-1 rounded-lg cursor-pointer transition ${
                selectedBlock === "all" ? "bg-white text-[#2A5C5F] shadow-2xs" : "text-slate-600"
              }`}
            >
              Semua ({KIOSKS.length})
            </button>
            <button
              onClick={() => setSelectedBlock("A")}
              type="button"
              className={`px-3 py-1 rounded-lg cursor-pointer transition ${
                selectedBlock === "A" ? "bg-white text-[#2A5C5F] shadow-2xs" : "text-slate-600"
              }`}
            >
              Blok A
            </button>
            <button
              onClick={() => setSelectedBlock("B")}
              type="button"
              className={`px-3 py-1 rounded-lg cursor-pointer transition ${
                selectedBlock === "B" ? "bg-white text-[#2A5C5F] shadow-2xs" : "text-slate-600"
              }`}
            >
              Blok B
            </button>
            <button
              onClick={() => setSelectedBlock("C")}
              type="button"
              className={`px-3 py-1 rounded-lg cursor-pointer transition ${
                selectedBlock === "C" ? "bg-white text-[#2A5C5F] shadow-2xs" : "text-slate-600"
              }`}
            >
              Blok C
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Kios</th>
                <th className="py-2.5 px-3">Nama Usaha</th>
                <th className="py-2.5 px-3">Spesialisasi</th>
                <th className="py-2.5 px-3">Kontak</th>
                <th className="py-2.5 px-3">Izin Pasar</th>
                <th className="py-2.5 px-3">Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredKiosks.slice(0, 10).map((k) => (
                <tr key={k.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                      {k.stallNumber}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{k.name}</div>
                    <div className="text-[11px] text-slate-400">{k.ownerName}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {k.specialization.map((s, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                    {k.phone}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Terverifikasi
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-[#2A5C5F]">
                    {k.reputationScore}/100
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Menampilkan 10 dari 30 kios percontohan.
          </p>
        </div>
      </div>

      {/* Modal Laporan Resmi DLH DKI Jakarta */}
      {showDLHReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
              <h3 className="font-serif font-black text-sm text-slate-900 tracking-wide uppercase">
                DINAS LINGKUNGAN HIDUP PROVINSI DKI JAKARTA
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Laporan Kepatuhan Pengurangan Sampah Organik Pasar Tradisional
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-700 mb-6">
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span>Unit Pengelola:</span>
                <strong className="text-slate-900">Pasar Induk Kramat Jati</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span>Periode Evaluasi:</span>
                <strong className="text-slate-900">Oktober 2026</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span>Volume Biomassa Teralihkan:</span>
                <strong className="text-[#2A5C5F] font-bold">
                  {(totalCarbonSavedKg / 0.48).toFixed(1)} kg Sayur Basah
                </strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span>Pencegahan Emisi Metana (IPCC 2006):</span>
                <strong className="text-[#2A5C5F] font-bold">
                  {totalCarbonSavedKg} kg CO₂e
                </strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span>Efisiensi Pengalihan TPA:</span>
                <strong className="text-slate-900">92.4% (Target: &ge; 90%)</strong>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => window.print()}
                type="button"
                className="w-full py-2.5 rounded-xl bg-[#2A5C5F] hover:bg-[#224C4E] text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
              >
                <Printer className="w-4 h-4" />
                Cetak Dokumen
              </button>
              <button
                onClick={() => setShowDLHReport(false)}
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
