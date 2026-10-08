"use client";

import { useMarketSimulation } from "@/lib/simulationStore";
import { PasarinLogo } from "@/components/common/PasarinLogo";
import {
  Thermometer,
  CloudRain,
  Clock,
  Wallet,
  Send,
  Leaf,
  Layers,
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
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 px-5 lg:px-8 py-3 shadow-2xs">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 max-w-[1720px] mx-auto">
        {/* Brand identity */}
        <div className="flex items-center gap-4 shrink-0">
          <PasarinLogo size="md" />
          <div className="hidden xl:block h-5 w-px bg-slate-200" />
          <span className="hidden xl:inline text-xs text-slate-600 font-medium">
            Pasar Induk Kramat Jati
          </span>
        </div>

        {/* High-Contrast WCAG-Compliant Live Telemetry */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Circadian Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
            <Clock className="w-3.5 h-3.5 text-[#0369A1]" />
            <span className="font-semibold text-slate-900">{stageConfig.clockTime}</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600 hidden sm:inline">{stageConfig.label}</span>
          </div>

          {/* Microclimate IoT */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0F6F6] border border-[#D1E1E2] text-[#2A5C5F]">
            <Thermometer className="w-3.5 h-3.5 text-[#2A5C5F]" />
            <span className="font-bold text-[#1E4345]">{stageConfig.temperatureC.toFixed(1)}°C</span>
            <span className="text-slate-400">·</span>
            <span className="font-semibold text-[#2A5C5F]">{stageConfig.humidityPercent}% RH</span>
          </div>

          {/* Weather status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
              stageConfig.isRaining
                ? "bg-sky-50 border-sky-300 text-[#075985]"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <CloudRain
              className={`w-3.5 h-3.5 ${stageConfig.isRaining ? "text-[#0369A1]" : "text-slate-500"}`}
            />
            <span className="font-semibold">
              {stageConfig.isRaining ? `Hujan ${stageConfig.rainMm} mm` : "Cerah Normal"}
            </span>
          </div>

          {/* Escrow Pool Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
            <Wallet className="w-3.5 h-3.5 text-[#2A5C5F]" />
            <span className="text-slate-500 hidden xl:inline">Escrow:</span>
            <span className="font-mono font-bold text-slate-900">
              Rp {escrowBalanceTotalIdr.toLocaleString("id-ID")}
            </span>
          </div>

          {/* Carbon Credit Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-[#065F46]">
            <Leaf className="w-3.5 h-3.5 text-[#047857]" />
            <span className="font-bold font-mono">{totalCarbonSavedKg} kg CO₂e</span>
          </div>

          {/* Telegram Simulator Link */}
          <button
            onClick={onOpenTelegram}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0369A1] font-semibold transition cursor-pointer border border-sky-300 shadow-2xs"
          >
            <Send className="w-3.5 h-3.5 text-[#0369A1]" />
            <span className="hidden sm:inline">Bot Telegram</span>
            {pendingNotifsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#0369A1] text-white text-[10px] font-bold flex items-center justify-center">
                {pendingNotifsCount}
              </span>
            )}
          </button>

          {/* Trigger Cron Sweep Button */}
          {currentStage !== "cron_sweep" && (
            <button
              onClick={triggerCronSweepNow}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A5C5F] hover:bg-[#1E4345] text-white font-medium transition cursor-pointer shadow-xs"
            >
              <Layers className="w-3.5 h-3.5 text-sky-200" />
              <span>Simulasi 14:30</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
