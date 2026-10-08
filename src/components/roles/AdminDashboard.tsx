"use client";

import { useState } from "react";
import { useMarketSimulation } from "@/lib/simulationStore";
import {
  Cpu,
  Activity,
  ShieldCheck,
  Server,
  Zap,
  Terminal,
  Database,
  Cloud,
  Send,
  Layers,
  CheckCircle2,
} from "lucide-react";

interface FreeTierQuota {
  service: string;
  component: string;
  quotaLimit: string;
  currentUsage: string;
  usagePercent: number;
  status: "safe" | "warning" | "exceeded";
}

const QUOTAS: FreeTierQuota[] = [
  {
    service: "Vercel Cloud",
    component: "Next.js 16 Host & API Route",
    quotaLimit: "100 GB / bln",
    currentUsage: "4.2 GB",
    usagePercent: 4.2,
    status: "safe",
  },
  {
    service: "Supabase Database",
    component: "PostgreSQL Storage & Pool",
    quotaLimit: "500 MB / 50k req",
    currentUsage: "38.5 MB (7.8%)",
    usagePercent: 7.8,
    status: "safe",
  },
  {
    service: "Google AI Studio",
    component: "Gemini 2.0 Flash ReAct LLM",
    quotaLimit: "15 RPM / 1.500 RPD",
    currentUsage: "128 RPD (8.5%)",
    usagePercent: 8.5,
    status: "safe",
  },
  {
    service: "OpenWeatherMap",
    component: "Telemetri Mikroklimat Kramat Jati",
    quotaLimit: "1.000 Call / hari",
    currentUsage: "96 Call (9.6%)",
    usagePercent: 9.6,
    status: "safe",
  },
  {
    service: "Telegram Bot API",
    component: "Notifikasi Kios @pasarin_bot",
    quotaLimit: "30 Pesan / detik",
    currentUsage: "Peak: 4 msg/s",
    usagePercent: 13.3,
    status: "safe",
  },
];

const MULTI_AGENTS = [
  { name: "OrchestratorAgent", role: "ReAct Multi-Agent Coordinator", status: "Active Loop (15m interval)" },
  { name: "BiologicalKineticsAgent", role: "Arrhenius-Q10 Respiration Modeler", status: "Active (30 commodities)" },
  { name: "QualityGateAgent", role: "Moral Hazard & Tier Classifier", status: "Guarding Human vs Maggot" },
  { name: "DynamicPricingAgent", role: "Inverse Surge DDQN Engine", status: "Calculated Price Floors" },
  { name: "MatchmakingAgent", role: "Spatial Proximity (<=5km)", status: "Active Broadcast" },
  { name: "FleetDispatchAgent", role: "Multi-Stop TSP Route Optimizer", status: "Tracking 3 Vehicles" },
  { name: "EscrowGatewayAgent", role: "QRIS BI Dynamic Payment & Ledger", status: "Zero-Trust Settlement" },
  { name: "CarbonAccountingAgent", role: "IPCC 2006 Methane Abatement", status: "Logging 0.48 kg CO2e/kg" },
];

export function AdminDashboard() {
  const { stageConfig, totalCarbonSavedKg, totalMethanePreventedKg } = useMarketSimulation();
  const [selectedAgent, setSelectedAgent] = useState(MULTI_AGENTS[0].name);

  return (
    <div className="space-y-6">
      {/* Header Profile */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-xl font-bold shadow-sm shrink-0">
              <Cpu className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Pusat Pengawasan Multi-Agen & Kuota Sistem
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  17 Spesialis Agen Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Arsitektur Serverless Nol Biaya Operasional (100% Free-Tier Architecture Compliant)
              </p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shrink-0 text-center min-w-36">
            <span className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider block">
              Status Server
            </span>
            <p className="text-base font-extrabold text-emerald-950 flex items-center justify-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              100% Sehat
            </p>
          </div>
        </div>
      </div>

      {/* Free-Tier Quota Monitor */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Monitor Batas Kuota Layanan Cloud (Free-Tier Efficiency)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Batas pemakaian API gratisan yang diproteksi caching & bounded worker agar terhindar dari pemblokiran
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUOTAS.map((q, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">{q.service}</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full">
                    Aman ({q.usagePercent}%)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">{q.component}</p>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${q.usagePercent}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-mono">
                <span>Terpakai: {q.currentUsage}</span>
                <span>Batas: {q.quotaLimit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Agent ReAct CoT Inspector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Inspektor Penalaran Multi-Agen (Chain-of-Thought Explorer)
            </h3>
            <p className="text-xs text-slate-500">
              Pelacakan alur observasi, pemikiran, dan penentuan aksi ReAct otonom
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Agent list */}
          <div className="space-y-1.5 lg:border-r lg:border-slate-100 lg:pr-3">
            {MULTI_AGENTS.map((ag, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedAgent(ag.name)}
                type="button"
                className={`w-full text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                  selectedAgent === ag.name
                    ? "bg-purple-50 border-purple-300 text-purple-950 font-bold"
                    : "bg-white border-transparent hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="font-mono">{ag.name}</div>
                <div className="text-[11px] text-slate-400 font-normal">{ag.role}</div>
              </button>
            ))}
          </div>

          {/* CoT Output Console */}
          <div className="lg:col-span-2 bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                Live Trace: {selectedAgent}
              </span>
              <span className="text-emerald-400">[ONLINE]</span>
            </div>

            <div className="space-y-2 leading-relaxed text-[11px]">
              <p className="text-purple-400">
                [OBSERVE] Jam Sirkadian: {stageConfig.clockTime} | Suhu Los: {stageConfig.temperatureC}°C | RH: {stageConfig.humidityPercent}%
              </p>
              <p className="text-slate-300">
                [THINK] Kinetika Arrhenius mendeteksi laju respirasi komoditas leafy_vegetable naik 2.6x lipat pada los Blok A.
              </p>
              <p className="text-amber-400">
                [ACTION] QualityGate memverifikasi Decay Score: 0.58. Klasifikasi: 'Tier 1 Warteg'. Menerbitkan tiket penawaran surplus terdiskon 60%.
              </p>
              <p className="text-emerald-400">
                [DISPATCH] Mengirimkan pesan 1-ketuk inline keyboard via TelegramBotGateway ke Kios A-12 (H. Rohmat).
              </p>
              <p className="text-slate-500">
                [METRIC] Estimasi pengalihan TPA: 35 kg sayur | Pencegahan emisi: 16.8 kg CO₂e.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
