"use client";

import { useMarketSimulation, TimeOfDayStage } from "@/lib/simulationStore";
import { Clock, Sun, CloudRain, ShieldCheck, Truck, Sparkles } from "lucide-react";

export function MarketClockController() {
  const { currentStage, setStage, stageConfig } = useMarketSimulation();

  const stages: {
    id: TimeOfDayStage;
    time: string;
    label: string;
    icon: typeof Sun;
    activeBg: string;
    iconColor: string;
  }[] = [
    {
      id: "subuh",
      time: "04:30 WIB",
      label: "Penerimaan Pasokan",
      icon: Sparkles,
      activeBg: "bg-[#2A5C5F] text-white border-[#224C4E]",
      iconColor: "text-[#2A5C5F]",
    },
    {
      id: "terik",
      time: "12:00 WIB",
      label: "Puncak Suhu Los",
      icon: Sun,
      activeBg: "bg-amber-600 text-white border-amber-700",
      iconColor: "text-amber-500",
    },
    {
      id: "cron_sweep",
      time: "14:30 WIB",
      label: "Evaluasi Mutu Harian",
      icon: ShieldCheck,
      activeBg: "bg-[#2A5C5F] text-white border-[#224C4E]",
      iconColor: "text-[#0284C7]",
    },
    {
      id: "hujan_sore",
      time: "15:30 WIB",
      label: "Hujan Sore",
      icon: CloudRain,
      activeBg: "bg-[#0284C7] text-white border-sky-700",
      iconColor: "text-[#0284C7]",
    },
    {
      id: "handover",
      time: "17:30 WIB",
      label: "Distribusi Armada",
      icon: Truck,
      activeBg: "bg-slate-700 text-white border-slate-800",
      iconColor: "text-slate-600",
    },
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F0F6F6] text-[#2A5C5F] flex items-center justify-center border border-[#D1E1E2]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Simulasi Waktu & Cuaca Pasar
            </h2>
            <p className="text-xs text-slate-500">
              Perubahan mikroklimat tropis dan respon kinetika respirasi komoditas
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span className="text-slate-400">Kondisi:</span>
          <span className="font-medium text-slate-700">{stageConfig.description}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
        {stages.map((stg) => {
          const Icon = stg.icon;
          const isActive = currentStage === stg.id;

          return (
            <button
              key={stg.id}
              onClick={() => setStage(stg.id)}
              type="button"
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                isActive
                  ? `${stg.activeBg} shadow-xs ring-1 ring-black/5`
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 text-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-mono font-bold ${
                    isActive ? "text-white/90" : "text-slate-500"
                  }`}
                >
                  {stg.time}
                </span>
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? "text-white" : stg.iconColor
                  }`}
                />
              </div>

              <div>
                <p
                  className={`text-xs font-bold leading-tight ${
                    isActive ? "text-white" : "text-slate-800"
                  }`}
                >
                  {stg.label}
                </p>
                {isActive && (
                  <span className="inline-block mt-1 text-[10px] bg-white/20 px-1.5 py-0.2 rounded text-white font-medium">
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
