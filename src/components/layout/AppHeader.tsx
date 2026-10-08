"use client";

import { useMarketSimulation } from "@/lib/simulationStore";
import {
  Thermometer,
  CloudRain,
  ShieldAlert,
  Sprout,
  Wallet,
  Clock,
  Radio,
  Send,
} from "lucide-react";

interface AppHeaderProps {
  onOpenTelegram: () => void;
}

export function AppHeader({ onOpenTelegram }: AppHeaderProps) {
  const {
    stageConfig,
    escrowBalanceTotalIdr,
    totalCarbonSavedKg,
    notifications,
    triggerCronSweepNow,
    currentStage,
  } = useMarketSimulation();

  const pendingNotifsCount = notifications.filter((n) => n.actionRequired).length;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-6 py-2.5 shadow-xs">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Brand & Market Location */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-sm font-black text-xl tracking-wider">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                PASARIN
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                <Radio className="w-2.5 h-2.5 animate-pulse text-orange-600" />
                Live Agentic System
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Pasar Induk Kramat Jati · Jakarta Timur
            </p>
          </div>
        </div>

        {/* Real-time Environment Telemetry Banner */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Circadian Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
            <Clock className="w-3.5 h-3.5 text-orange-600" />
            <span className="font-semibold">{stageConfig.clockTime}</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 hidden sm:inline">{stageConfig.label}</span>
          </div>

          {/* Temperature & Humidity IoT Telemetry */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
            <Thermometer className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-bold">{stageConfig.temperatureC.toFixed(1)}°C</span>
            <span className="text-amber-500">·</span>
            <span>{stageConfig.humidityPercent}% RH</span>
          </div>

          {/* Rainfall & Muddy Status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
              stageConfig.isRaining
                ? "bg-blue-50 border-blue-200 text-blue-900 animate-pulse"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            <CloudRain
              className={`w-3.5 h-3.5 ${stageConfig.isRaining ? "text-blue-600" : "text-slate-400"}`}
            />
            <span className="font-medium">
              {stageConfig.isRaining
                ? `Hujan ${stageConfig.rainMm}mm (Becek)`
                : "Kering / Normal"}
            </span>
          </div>

          {/* Escrow Pool Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-500 hidden xl:inline">Escrow:</span>
            <span className="font-bold">
              Rp {escrowBalanceTotalIdr.toLocaleString("id-ID")}
            </span>
          </div>

          {/* Carbon Credit Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800">
            <Sprout className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-bold">{totalCarbonSavedKg} kg CO₂e</span>
          </div>

          {/* Telegram Simulator Trigger Button */}
          <button
            onClick={onOpenTelegram}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 transition cursor-pointer font-medium"
            title="Buka Simulator Bot Telegram @pasarin_bot"
          >
            <Send className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">Bot Telegram</span>
            {pendingNotifsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingNotifsCount}
              </span>
            )}
          </button>

          {/* Trigger Cron Sweep Button */}
          {currentStage !== "cron_sweep" && (
            <button
              onClick={triggerCronSweepNow}
              type="button"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium transition shadow-xs cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Jalankan Cron 14:30</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
