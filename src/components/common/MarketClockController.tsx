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
      activeBg: "bg-[#2A5C5F] text-white border-[#1E4345]",
      iconColor: "text-[#2A5C5F]",
    },
    {
      id: "terik",
      time: "12:00 WIB",
      label: "Puncak Suhu Los",
      icon: Sun,
      activeBg: "bg-[#B45309] text-white border-[#92400E]",
      iconColor: "text-[#B45309]",
    },
    {
      id: "cron_sweep",
      time: "14:30 WIB",
      label: "Evaluasi Mutu Harian",
      icon: ShieldCheck,
      activeBg: "bg-[#2A5C5F] text-white border-[#1E4345]",
      iconColor: "text-[#0369A1]",
    },
    {
      id: "hujan_sore",
      time: "15:30 WIB",
      label: "Hujan Sore",
      icon: CloudRain,
      activeBg: "bg-[#0369A1] text-white border-[#075985]",
      iconColor: "text-[#0369A1]",
    },
    {
      id: "handover",
      time: "17:30 WIB",
      label: "Distribusi Armada",
      icon: Truck,
      activeBg: "bg-[#334155] text-white border-[#1E293B]",
      iconColor: "text-slate-600",
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F0F6F6] text-[#2A5C5F] flex items-center justify-center border border-[#D1E1E2]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Simulasi Waktu & Cuaca Pasar
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Perubahan mikroklimat tropis dan respon kinetika respirasi komoditas
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium">
          <span className="text-slate-500">Kondisi:</span>
          <span className="text-slate-800">{stageConfig.description}</span>
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
                  ? `${stg.activeBg} shadow-xs ring-1 ring-black/10`
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-mono font-bold ${
                    isActive ? "text-white" : "text-slate-600"
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
                    isActive ? "text-white" : "text-slate-900"
                  }`}
                >
                  {stg.label}
                </p>
                {isActive && (
                  <span className="inline-block mt-1 text-[10px] bg-white/25 px-1.5 py-0.2 rounded text-white font-bold">
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
