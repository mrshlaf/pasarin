"use client";

/**
 * Dasbor Peran Pengelola Pasar (ManagerDashboard) (Clean Swiss Minimalist).
 * Mengelola:
 * 1. Pengawasan kepatuhan operasional 30 kios pasar binaan (Blok A, B, C).
 * 2. Pemantauan telemetri mikroklimat IoT los pedagang waktu nyata.
 * 3. Ekspor & cetak laporan kepatuhan reduksi sampah organik untuk Dinas Lingkungan Hidup (DLH) DKI Jakarta.
 */

import { useState } from "react";
import { useMarketSimulation } from "@/lib/simulationStore";
import { KIOSKS } from "@/data/kiosks";
import {
  Building2,
  Thermometer,
  ShieldCheck,
  Printer,
  FileText,
  Store,
  Leaf,
} from "lucide-react";

export function ManagerDashboard() {
  const { stageConfig, totalCarbonSavedKg } = useMarketSimulation();
  const [selectedBlock, setSelectedBlock] = useState<"all" | "A" | "B" | "C">("all");
  const [showDLHReport, setShowDLHReport] = useState(false);

  const filteredKiosks = KIOSKS.filter((k) => {
    return selectedBlock === "all" || k.block === selectedBlock;
  });

  return (
    <div className="space-y-5">
      {/* Header Profile */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-[#F0F6F6] text-[#2A5C5F] border border-[#D1E1E2] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Kantor Pengelola Pasar Jaya (Kramat Jati)
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#F0F6F6] text-[#1E4345] border border-[#D1E1E2]">
                  Kepala Unit: Ir. Bambang S.
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Perumda Pasar Jaya · Pengawasan 30 Kios Binaan Smart Waste Redistribution
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDLHReport(true)}
            type="button"
            className="px-3.5 py-2 rounded-lg bg-[#2A5C5F] hover:bg-[#1E4345] text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan DLH DKI</span>
          </button>
        </div>
      </div>
      {/* 4-Card Quick Metrics Row for Market Manager */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Kios Binaan Aktif</span>
            <Store className="w-4 h-4 text-[#2A5C5F]" />
          </div>
          <p className="text-lg font-black font-mono text-slate-900">30 Kios</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Blok A, Blok B, Blok C</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Pengurangan Sampah</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-black font-mono text-[#047857]">92.4%</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Target DLH DKI: &ge; 90%</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Biomassa Teralihkan</span>
            <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">Surplus</span>
          </div>
          <p className="text-lg font-black font-mono text-slate-900">
            {(totalCarbonSavedKg / 0.48).toFixed(1)} kg
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Dialihkan dari Bantar Gebang</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Tingkat Penyelamatan</span>
            <Leaf className="w-4 h-4 text-[#047857]" />
          </div>
          <p className="text-lg font-black font-mono text-[#047857]">94.2%</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Efisiensi redistribusi 3-Tier</span>
        </div>
      </div>
      {/* 30 Kiosks Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Direktori 30 Kios Binaan Pasar Kramat Jati
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Status izin usaha Perumda Pasar Jaya dan riwayat evaluasi kepatuhan
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-bold border border-slate-200">
            <button
              onClick={() => setSelectedBlock("all")}
              type="button"
              className={`px-2.5 py-1 rounded cursor-pointer transition ${
                selectedBlock === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua ({KIOSKS.length})
            </button>
            <button
              onClick={() => setSelectedBlock("A")}
              type="button"
              className={`px-2.5 py-1 rounded cursor-pointer transition ${
                selectedBlock === "A" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Blok A
            </button>
            <button
              onClick={() => setSelectedBlock("B")}
              type="button"
              className={`px-2.5 py-1 rounded cursor-pointer transition ${
                selectedBlock === "B" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Blok B
            </button>
            <button
              onClick={() => setSelectedBlock("C")}
              type="button"
              className={`px-2.5 py-1 rounded cursor-pointer transition ${
                selectedBlock === "C" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Blok C
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider bg-slate-50/70">
                <th className="py-2.5 px-3">Lapak</th>
                <th className="py-2.5 px-3">Nama Usaha Kios</th>
                <th className="py-2.5 px-3">Komoditas Unggulan</th>
                <th className="py-2.5 px-3">Nomor Kontak</th>
                <th className="py-2.5 px-3">Status Izin</th>
                <th className="py-2.5 px-3">Skor Reputasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredKiosks.slice(0, 10).map((k) => (
                <tr key={k.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">
                      {k.stallNumber}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900">{k.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{k.ownerName}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {k.specialization.map((s, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px] border border-slate-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                    {k.phone}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#065F46] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-[#047857]" />
                      Terverifikasi
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#1E4345]">
                    {k.reputationScore}/100
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-400 mt-3 text-center font-normal">
            Menampilkan 10 kios binaan percontohan teratas.
          </p>
        </div>
      </div>

      {/* Modal Laporan Resmi DLH DKI Jakarta */}
      {showDLHReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
              <div className="w-8 h-8 rounded-lg bg-[#F0F6F6] text-[#2A5C5F] flex items-center justify-center mx-auto mb-2 border border-[#D1E1E2]">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-black text-sm text-slate-900 tracking-wide uppercase">
                DINAS LINGKUNGAN HIDUP PROVINSI DKI JAKARTA
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Laporan Kepatuhan Pengurangan Sampah Organik Pasar Tradisional (Perda DKI No. 4/2019)
              </p>
            </div>

            <div className="space-y-2.5 text-xs text-slate-800 mb-6 font-medium">
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Unit Pengelola Pasar:</span>
                <strong className="text-slate-900">UPB Pasar Induk Kramat Jati</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Periode Evaluasi:</span>
                <strong className="text-slate-900 font-mono">Oktober - November 2026</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Volume Biomassa Teralihkan:</span>
                <strong className="text-[#047857] font-bold font-mono">
                  {(totalCarbonSavedKg / 0.48).toFixed(1)} kg Sayur Basah
                </strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Status Kepatuhan DLH:</span>
                <strong className="text-[#047857] font-bold font-mono">
                  Sesuai Target Perda 4/2019
                </strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500">Efisiensi Pengalihan TPA:</span>
                <strong className="text-slate-900 font-mono">92.4% (Target Standar: &ge; 90%)</strong>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => window.print()}
                type="button"
                className="w-full py-2.5 rounded-lg bg-[#2A5C5F] hover:bg-[#1E4345] text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Dokumen Laporan</span>
              </button>
              <button
                onClick={() => setShowDLHReport(false)}
                type="button"
                className="w-full py-2 rounded-lg text-slate-500 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
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
