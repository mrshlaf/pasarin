"use client";

import { useMarketSimulation, TIME_STAGES, TimeOfDayStage } from "@/lib/simulationStore";
import { Clock, Sun, CloudRain, ShieldAlert, Truck, Sparkles } from "lucide-react";

export function MarketClockController() {
  const { currentStage, setStage, stageConfig } = useMarketSimulation();

  const stages: {
    id: TimeOfDayStage;
    time: string;
    label: string;
    icon: typeof Sun;
    color: string;
  }[] = [
    {
      id: "subuh",
      time: "04:30 WIB",
      label: "Subuh (Bongkar)",
      icon: Sparkles,
      color: "hover:border-teal-300 hover:bg-teal-50",
    },
    {
      id: "terik",
      time: "12:00 WIB",
      label: "Terik Tengah Hari",
      icon: Sun,
      color: "hover:border-amber-300 hover:bg-amber-50",
    },
    {
      id: "cron_sweep",
      time: "14:30 WIB",
      label: "Cron Sweep",
      icon: ShieldAlert,
      color: "hover:border-orange-300 hover:bg-orange-50",
    },
    {
      id: "hujan_sore",
      time: "15:30 WIB",
      label: "Hujan Badai Sore",
      icon: CloudRain,
      color: "hover:border-blue-300 hover:bg-blue-50",
    },
    {
      id: "handover",
      time: "17:30 WIB",
      label: "Handover Kurir",
      icon: Truck,
      color: "hover:border-purple-300 hover:bg-purple-50",
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 lg:p-5 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 text-orange-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Pengendali Siklus Sirkadian 24-Jam Pasar Kramat Jati
            </h2>
            <p className="text-xs text-slate-500">
              Uji respon kinetika biologis dan alur pasar pada berbagai jendela waktu operasional
            </p>
          </div>
        </div>

        <div className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span className="text-slate-400">Efek Kondisi:</span>
          <span className="font-semibold text-slate-800">{stageConfig.description}</span>
        </div>
      </div>

      {/* Button Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
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
                  ? "bg-orange-600 border-orange-700 text-white shadow-sm ring-2 ring-orange-500/30"
                  : `bg-slate-50/70 border-slate-200 text-slate-700 ${stg.color}`
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-mono font-bold ${
                    isActive ? "text-orange-100" : "text-slate-600"
                  }`}
                >
                  {stg.time}
                </span>
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-white" : "text-slate-400"
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
                  <span className="inline-block mt-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-medium">
                    Aktif
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
