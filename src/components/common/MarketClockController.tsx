"use client";

/**
 * Komponen Pengendali Sirkadian Jam & Mikroklimat Pasar (MarketClockController) (Clean Swiss Minimalist).
 * Memungkinkan penguji atau dosen beralih di antara 5 fase waktu pasar tradisional:
 * 1. Subuh (04:30 WIB) - Pasokan bongkar, suhu 25°C, segar prima.
 * 2. Terik Siang (12:00 WIB) - Suhu 34°C, respirasi seluler meningkat pesat.
 * 3. Evaluasi Mutu Harian (14:30 WIB) - Titik kritis cron sweep surplus pasar.
 * 4. Hujan Sore (15:30 WIB) - Curah hujan lebat, redaman pengunjung retail 48%.
 * 5. Distribusi Armada (17:30 WIB) - Pengangkutan logistik & serah terima fisik PoD.
 */

import { useMarketSimulation, TimeOfDayStage } from "@/lib/simulationStore";
import { Clock, Sun, CloudRain, ShieldCheck, Truck, Sparkles } from "lucide-react";

export function MarketClockController() {
  const { currentStage, setStage, stageConfig } = useMarketSimulation();

  const stages: {
    id: TimeOfDayStage;
    time: string;
    label: string;
    icon: typeof Sun;
    activeBorder: string;
    activeBadge: string;
  }[] = [
    {
      id: "subuh",
      time: "04:30 WIB",
      label: "Penerimaan Pasokan",
      icon: Sparkles,
      activeBorder: "border-[#2A5C5F] bg-[#F0F6F6]",
      activeBadge: "bg-[#2A5C5F] text-white",
    },
    {
      id: "terik",
      time: "12:00 WIB",
      label: "Puncak Suhu Los",
      icon: Sun,
      activeBorder: "border-amber-500 bg-amber-50/60",
      activeBadge: "bg-amber-600 text-white",
    },
    {
      id: "cron_sweep",
      time: "14:30 WIB",
      label: "Evaluasi Mutu Harian",
      icon: ShieldCheck,
      activeBorder: "border-[#2A5C5F] bg-[#F0F6F6]",
      activeBadge: "bg-[#2A5C5F] text-white",
    },
    {
      id: "hujan_sore",
      time: "15:30 WIB",
      label: "Hujan Sore (Redaman 48%)",
      icon: CloudRain,
      activeBorder: "border-sky-500 bg-sky-50/60",
      activeBadge: "bg-[#0369A1] text-white",
    },
    {
      id: "handover",
      time: "17:30 WIB",
      label: "Distribusi Armada",
      icon: Truck,
      activeBorder: "border-slate-600 bg-slate-100",
      activeBadge: "bg-slate-700 text-white",
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#F0F6F6] text-[#2A5C5F] flex items-center justify-center border border-[#D1E1E2]">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pengendali Sirkadian Pasar
            </h2>
            <p className="text-sm font-bold text-slate-900">
              Simulasi Dinamika Waktu, Suhu, & Kinetika Respirasi
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span className="font-bold text-slate-700">Dampak:</span>
          <span>{stageConfig.description}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
        {stages.map((stg) => {
          const Icon = stg.icon;
          const isActive = currentStage === stg.id;

          return (
            <button
              key={stg.id}
              onClick={() => setStage(stg.id)}
              type="button"
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                isActive
                  ? `${stg.activeBorder} ring-1 ring-black/5 shadow-xs`
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-mono font-bold ${isActive ? "text-slate-900" : "text-slate-500"}`}>
                  {stg.time}
                </span>
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#2A5C5F]" : "text-slate-400"}`} />
              </div>

              <div>
                <p className={`text-xs font-bold leading-tight ${isActive ? "text-slate-900" : "text-slate-700"}`}>
                  {stg.label}
                </p>
                {isActive && (
                  <span className={`inline-block mt-1 text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${stg.activeBadge}`}>
                    Fase Aktif
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
