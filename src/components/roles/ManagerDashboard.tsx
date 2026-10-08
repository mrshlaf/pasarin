"use client";

import { useState } from "react";
import { useMarketSimulation } from "@/lib/simulationStore";
import { KIOSKS, Kiosk } from "@/data/kiosks";
import {
  Building2,
  Thermometer,
  CloudRain,
  ShieldCheck,
  FileText,
  Printer,
  CheckCircle2,
  Users,
  Search,
  Filter,
} from "lucide-react";

export function ManagerDashboard() {
  const { stageConfig, totalCarbonSavedKg } = useMarketSimulation();
  const [selectedBlock, setSelectedBlock] = useState<"all" | "A" | "B" | "C">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDLHReport, setShowDLHReport] = useState(false);

  const filteredKiosks = KIOSKS.filter((k) => {
    const matchBlock = selectedBlock === "all" || k.block === selectedBlock;
    const matchSearch =
      k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.stallNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchBlock && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Profile */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-sm shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Kantor Pengelola Pasar Jaya (Kramat Jati)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Kepala Pasar: Ir. Bambang Suherman
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Unit Pengelola Pasar Induk Kramat Jati · 30 Kios Percontohan Smart Waste Redistribution
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDLHReport(true)}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-xs cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan Resmi DLH DKI
          </button>
        </div>
      </div>

      {/* IoT Microclimate Los Monitor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              Blok A (Los Sayur Daun)
            </span>
            <Thermometer className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {stageConfig.temperatureC.toFixed(1)}°C
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Kelembapan {stageConfig.humidityPercent}% RH · Sensitivitas Tinggi
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              Blok B (Los Cabai & Bumbu)
            </span>
            <Thermometer className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {(stageConfig.temperatureC - 1.2).toFixed(1)}°C
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Kelembapan {stageConfig.humidityPercent - 4}% RH · Paparan Sedang
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              Blok C (Los Umbi & Kentang)
            </span>
            <Thermometer className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {(stageConfig.temperatureC - 2.5).toFixed(1)}°C
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Area Teduh Berventilasi · Tahan Pembusukan
          </p>
        </div>
      </div>

      {/* 30 Kiosks Directory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Direktori 30 Kios Binaan Pasar Kramat Jati
            </h3>
            <p className="text-xs text-slate-500">
              Status legalitas dokumen PD Pasar Jaya dan kepatuhan pengalihan limbah organik
            </p>
          </div>

          {/* Filter block & search */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setSelectedBlock("all")}
                type="button"
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                  selectedBlock === "all" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Semua ({KIOSKS.length})
              </button>
              <button
                onClick={() => setSelectedBlock("A")}
                type="button"
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                  selectedBlock === "A" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Blok A
              </button>
              <button
                onClick={() => setSelectedBlock("B")}
                type="button"
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                  selectedBlock === "B" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Blok B
              </button>
              <button
                onClick={() => setSelectedBlock("C")}
                type="button"
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                  selectedBlock === "C" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"
                }`}
              >
                Blok C
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Kios & Los</th>
                <th className="py-2.5 px-3">Nama Usaha / Pedagang</th>
                <th className="py-2.5 px-3">Spesialisasi Komoditas</th>
                <th className="py-2.5 px-3">Kontak Pedagang</th>
                <th className="py-2.5 px-3">Verifikasi Izin</th>
                <th className="py-2.5 px-3">Reputasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredKiosks.slice(0, 10).map((k) => (
                <tr key={k.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-indigo-800">
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
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Terverifikasi
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                    {k.reputationScore}/100
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Menampilkan 10 dari 30 kios percontohan. Seluruh dokumen izin tersimpan aman di direktori sistem.
          </p>
        </div>
      </div>

      {/* Modal Laporan Resmi DLH DKI Jakarta */}
      {showDLHReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
              <h3 className="font-serif font-black text-base text-slate-900 tracking-wide uppercase">
                DINAS LINGKUNGAN HIDUP PROVINSI DKI JAKARTA
              </h3>
              <p className="text-xs text-slate-600">
                Laporan Kepatuhan Pengurangan Sampah Organik Pasar Tradisional (Perda DKI No. 4/2019)
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-700 mb-6">
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span>Unit Pelaksana Teknis:</span>
                <strong className="text-slate-900">Pasar Induk Kramat Jati</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span>Periode Evaluasi:</span>
                <strong className="text-slate-900">Bulan Oktober 2026</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span>Volume Biomassa Teralihkan:</span>
                <strong className="text-emerald-700 font-bold">
                  {(totalCarbonSavedKg / 0.48).toFixed(1)} kg Sayur Basah
                </strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span>Pencegahan Emisi Karbon (IPCC 2006):</span>
                <strong className="text-emerald-700 font-bold">
                  {totalCarbonSavedKg} kg CO₂e
                </strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span>Efisiensi Pengalihan TPA Bantar Gebang:</span>
                <strong className="text-slate-900">92.4% (Target: &ge; 90%)</strong>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => window.print()}
                type="button"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Cetak Dokumen Fisik / Simpan PDF
              </button>
              <button
                onClick={() => setShowDLHReport(false)}
                type="button"
                className="w-full py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium transition cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
