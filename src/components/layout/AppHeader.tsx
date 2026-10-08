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
        {/* Brand identity with refined subtitle */}
        <div className="flex items-center gap-4">
          <PasarinLogo size="md" />
          <div className="hidden xl:block h-5 w-px bg-slate-200" />
          <span className="hidden xl:inline text-xs text-slate-500 font-medium">
            Pasar Induk Kramat Jati
          </span>
        </div>

        {/* Minimalist Live Environmental Telemetry */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Circadian Clock with Cyan Accent */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700">
            <Clock className="w-3.5 h-3.5 text-[#0284C7]" />
            <span className="font-semibold text-slate-800">{stageConfig.clockTime}</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 hidden sm:inline">{stageConfig.label}</span>
          </div>

          {/* Microclimate IoT with Pine Teal */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0F6F6] border border-[#D1E1E2] text-[#2A5C5F]">
            <Thermometer className="w-3.5 h-3.5 text-[#2A5C5F]" />
            <span className="font-bold">{stageConfig.temperatureC.toFixed(1)}°C</span>
            <span className="text-[#2A5C5F]/30">·</span>
            <span className="font-medium">{stageConfig.humidityPercent}% RH</span>
          </div>

          {/* Weather status with Sky Blue */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
              stageConfig.isRaining
                ? "bg-sky-50 border-sky-200 text-sky-800"
                : "bg-slate-50 border-slate-200/80 text-slate-600"
            }`}
          >
            <CloudRain
              className={`w-3.5 h-3.5 ${stageConfig.isRaining ? "text-[#0284C7]" : "text-slate-400"}`}
            />
            <span className="font-medium">
              {stageConfig.isRaining ? `Hujan ${stageConfig.rainMm} mm` : "Cerah Normal"}
            </span>
          </div>

          {/* Escrow Pool Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700">
            <Wallet className="w-3.5 h-3.5 text-[#2A5C5F]" />
            <span className="text-slate-400 hidden xl:inline">Escrow:</span>
            <span className="font-mono font-bold text-slate-800">
              Rp {escrowBalanceTotalIdr.toLocaleString("id-ID")}
            </span>
          </div>

          {/* Carbon Credit Pill with Fresh Sage */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200/90 text-emerald-800">
            <Leaf className="w-3.5 h-3.5 text-[#059669]" />
            <span className="font-bold font-mono">{totalCarbonSavedKg} kg CO₂e</span>
          </div>

          {/* Telegram Simulator Link with Cyan Accent */}
          <button
            onClick={onOpenTelegram}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50/70 hover:bg-sky-100 text-[#0284C7] font-semibold transition cursor-pointer border border-sky-200"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bot Telegram</span>
            {pendingNotifsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#0284C7] text-white text-[10px] font-bold flex items-center justify-center">
                {pendingNotifsCount}
              </span>
            )}
          </button>

          {/* Trigger Cron Sweep Button with Pine Teal */}
          {currentStage !== "cron_sweep" && (
            <button
              onClick={triggerCronSweepNow}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A5C5F] hover:bg-[#224C4E] text-white font-medium transition cursor-pointer shadow-xs"
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
