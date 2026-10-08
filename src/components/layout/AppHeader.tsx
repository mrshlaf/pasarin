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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-5 lg:px-8 py-3 transition">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 max-w-[1720px] mx-auto">
        {/* Official Pasarin Brand Identity */}
        <div className="flex items-center gap-4">
          <PasarinLogo size="md" />
          <div className="hidden xl:block h-5 w-px bg-slate-200" />
          <span className="hidden xl:inline text-xs text-slate-500 font-medium">
            Pasar Induk Kramat Jati
          </span>
        </div>

        {/* Minimalist Live Environmental Telemetry */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Circadian Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700">
            <Clock className="w-3.5 h-3.5 text-[#2A5C5F]" />
            <span className="font-semibold">{stageConfig.clockTime}</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 hidden sm:inline">{stageConfig.label}</span>
          </div>

          {/* Microclimate IoT */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0F6F6] border border-[#D1E1E2] text-[#2A5C5F]">
            <Thermometer className="w-3.5 h-3.5" />
            <span className="font-semibold">{stageConfig.temperatureC.toFixed(1)}°C</span>
            <span className="text-[#2A5C5F]/40">·</span>
            <span>{stageConfig.humidityPercent}% RH</span>
          </div>

          {/* Rainfall status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
              stageConfig.isRaining
                ? "bg-sky-50 border-sky-200 text-sky-800"
                : "bg-slate-50 border-slate-200/80 text-slate-600"
            }`}
          >
            <CloudRain
              className={`w-3.5 h-3.5 ${stageConfig.isRaining ? "text-sky-600" : "text-slate-400"}`}
            />
            <span className="font-medium">
              {stageConfig.isRaining ? `Hujan ${stageConfig.rainMm} mm` : "Cerah Normal"}
            </span>
          </div>

          {/* Escrow Pool Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700">
            <Wallet className="w-3.5 h-3.5 text-[#2A5C5F]" />
            <span className="text-slate-400 hidden xl:inline">Escrow:</span>
            <span className="font-semibold">
              Rp {escrowBalanceTotalIdr.toLocaleString("id-ID")}
            </span>
          </div>

          {/* Carbon Credit Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-800">
            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold">{totalCarbonSavedKg} kg CO₂e</span>
          </div>

          {/* Telegram Simulator Link */}
          <button
            onClick={onOpenTelegram}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A5C5F]/10 hover:bg-[#2A5C5F]/15 text-[#2A5C5F] font-semibold transition cursor-pointer border border-[#2A5C5F]/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bot Telegram</span>
            {pendingNotifsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#2A5C5F] text-white text-[10px] font-bold flex items-center justify-center">
                {pendingNotifsCount}
              </span>
            )}
          </button>

          {/* Trigger Cron Button */}
          {currentStage !== "cron_sweep" && (
            <button
              onClick={triggerCronSweepNow}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A5C5F] hover:bg-[#224C4E] text-white font-medium transition cursor-pointer shadow-xs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Simulasi 14:30</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
