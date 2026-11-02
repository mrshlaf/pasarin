"use client";

/**
 * Komponen Header Aplikasi PASARIN (Clean Swiss Minimalist / Light Mode Premium).
 * Menampilkan identitas brand resmi Pasar Induk Kramat Jati,
 * indikator telemetri mikroklimat waktu nyata (suhu, kelembapan, curah hujan),
 * serta kontrol profil autentikasi dan tombol keluar (Logout).
 */

import Link from "next/link";
import { useMarketSimulation } from "@/lib/simulationStore";
import { useAuth } from "@/lib/authContext";
import { PasarinLogo } from "@/components/common/PasarinLogo";
import {
  Thermometer,
  CloudRain,
  Clock,
  LogOut,
  User,
  ShieldCheck,
} from "lucide-react";

interface AppHeaderProps {
  onOpenTelegram?: () => void;
}
export function AppHeader({ onOpenTelegram }: AppHeaderProps) {
  const {
    stageConfig,
  } = useMarketSimulation();
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-2.5 transition-all">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 max-w-[1720px] mx-auto">
        {/* Brand Identity */}
        <div className="flex items-center gap-3.5 shrink-0">
          <PasarinLogo size="md" />
          <div className="hidden lg:block h-4 w-px bg-slate-200" />
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2A5C5F]" />
            <span>UPB Kramat Jati</span>
          </div>
        </div>

        {/* Telemetry Bar (Swiss Minimalist Data Architecture) */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Circadian Market Clock */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-[#0369A1] shrink-0" />
            <span className="font-bold text-slate-900">{stageConfig.clockTime}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-sans font-medium hidden sm:inline truncate max-w-[120px]">
              {stageConfig.label}
            </span>
          </div>

          {/* Hyperlocal Weather Sensor */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#F0F6F6] border border-[#D1E1E2] text-[#1E4345] font-mono text-[11px]">
            <Thermometer className="w-3.5 h-3.5 text-[#2A5C5F] shrink-0" />
            <span className="font-bold">{stageConfig.temperatureC}°C</span>
            <span className="text-[#D1E1E2]">|</span>
            <span className="text-slate-600">{stageConfig.humidityPercent}% RH</span>
          </div>

          {/* Rain Attenuation Indicator */}
          {stageConfig.rainMm > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-300 text-[#0369A1] text-[11px] font-semibold">
              <CloudRain className="w-3.5 h-3.5 shrink-0 animate-pulse" />
              <span>Hujan {stageConfig.rainMm} mm</span>
            </div>
          ) : (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Cuaca Cerah</span>
            </div>
          )}


          {/* User Profile & Logout Action */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                  {user.role.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                type="button"
                title="Keluar dari sesi akun (Logout)"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 text-slate-700 font-semibold transition cursor-pointer text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A5C5F] hover:bg-[#1E4345] text-white font-semibold text-xs shadow-xs transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>Masuk</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
