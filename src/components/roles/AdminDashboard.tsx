"use client";

import { useState } from "react";
import { useMarketSimulation } from "@/lib/simulationStore";
import {
  Cpu,
  Terminal,
  ShieldAlert,
  Wallet,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";

interface FreeTierQuota {
  service: string;
  component: string;
  quotaLimit: string;
  currentUsage: string;
  usagePercent: number;
}

const QUOTAS: FreeTierQuota[] = [
  {
    service: "Vercel Cloud",
    component: "Next.js 16 Host & API Route",
    quotaLimit: "100 GB / bln",
    currentUsage: "4.2 GB",
    usagePercent: 4.2,
  },
  {
    service: "Supabase Database",
    component: "PostgreSQL Storage & Pool",
    quotaLimit: "500 MB / 50k req",
    currentUsage: "38.5 MB (7.8%)",
    usagePercent: 7.8,
  },
  {
    service: "Google AI Studio",
    component: "Gemini 2.0 Flash ReAct LLM",
    quotaLimit: "15 RPM / 1.500 RPD",
    currentUsage: "128 RPD (8.5%)",
    usagePercent: 8.5,
  },
  {
    service: "OpenWeatherMap",
    component: "Telemetri Cuaca Kramat Jati",
    quotaLimit: "1.000 Call / hari",
    currentUsage: "96 Call (9.6%)",
    usagePercent: 9.6,
  },
  {
    service: "Telegram Bot API",
    component: "Notifikasi Kios @pasarin_bot",
    quotaLimit: "30 Pesan / detik",
    currentUsage: "Peak: 4 msg/s",
    usagePercent: 13.3,
  },
];

const MULTI_AGENTS = [
  { name: "OrchestratorAgent", role: "ReAct Multi-Agent Coordinator", status: "Active Loop (15m)" },
  { name: "BiologicalKineticsAgent", role: "Arrhenius-Q10 Respiration Modeler", status: "Active (30 commodities)" },
  { name: "QualityGateAgent", role: "Moral Hazard & Tier Classifier", status: "Active Gatekeeper" },
  { name: "DynamicPricingAgent", role: "Inverse Surge Pricing Engine", status: "Active Floor Protection" },
  { name: "MatchmakingAgent", role: "Spatial Proximity (<=5km)", status: "Active Matcher" },
  { name: "FleetDispatchAgent", role: "Multi-Stop TSP Route Optimizer", status: "Active 3 Vehicles" },
  { name: "EscrowGatewayAgent", role: "QRIS BI Dynamic Payment & Ledger", status: "Active Zero-Trust" },
  { name: "CarbonAccountingAgent", role: "IPCC 2006 Methane Abatement", status: "Active 0.48 kg CO2e/kg" },
];

export function AdminDashboard() {
  const { stageConfig, transactions } = useMarketSimulation();
  const [selectedAgent, setSelectedAgent] = useState(MULTI_AGENTS[0].name);

  // QualityGate Moral Hazard Playground state
  const [testDecayScore, setTestDecayScore] = useState<number>(0.25);
  const [testClaimedTier, setTestClaimedTier] = useState<string>("tier_3");

  // Evaluate Quality Gate response
  const isHumanConsumable = testDecayScore < 0.85;
  const isMoralHazardBlocked = isHumanConsumable && testClaimedTier === "tier_3";

  return (
    <div className="space-y-6">
      {/* Header Profile */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F0F6F6] text-[#2A5C5F] border border-[#D1E1E2] flex items-center justify-center shrink-0">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Pengawasan Sistem Multi-Agen & Kuota Cloud
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F0F6F6] text-[#1E4345] border border-[#D1E1E2]">
                  17 Spesialis Agen Aktif
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                Arsitektur Efisiensi Serverless (100% Free-Tier Architecture Compliant)
              </p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 shrink-0 text-center min-w-32">
            <span className="text-[10px] text-[#065F46] uppercase font-bold tracking-wider block">
              Status Server
            </span>
            <p className="text-sm font-bold text-[#065F46] flex items-center justify-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#047857] animate-ping" />
              100% Operasional
            </p>
          </div>
        </div>
      </div>

      {/* Free-Tier Quota Monitor */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Monitor Batas Kuota Layanan Cloud (Free-Tier Efficiency)
        </h3>
        <p className="text-xs text-slate-600 mb-4 font-medium">
          Pemakaian kuota terdistribusi yang diproteksi caching & bounded worker
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUOTAS.map((q, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">{q.service}</span>
                  <span className="text-[10px] font-bold text-[#075985] bg-sky-100 px-2 py-0.2 rounded-full border border-sky-300">
                    {q.usagePercent}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mb-2 font-medium">{q.component}</p>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-[#2A5C5F] rounded-full"
                    style={{ width: `${q.usagePercent}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-700 pt-1 border-t border-slate-200 font-mono font-medium">
                <span>{q.currentUsage}</span>
                <span>Batas: {q.quotaLimit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quality Gate Playground & Invariant Security Simulator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-4 h-4 text-[#075985]" />
          <h3 className="text-sm font-bold text-slate-900">
            Simulator Pertahanan Moral Hazard (Quality Gate Playground)
          </h3>
        </div>
        <p className="text-xs text-slate-600 mb-4 font-medium">
          Pengujian invariant gate: mencegah komoditas yang masih layak konsumsi manusia dialihkan secara manipulatif ke sentra pakan larva maggot (Tier 3)
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-700 font-bold mb-1">
              Simulasi Skor Pembusukan (Decay Score):
            </label>
            <input
              type="range"
              min="0.10"
              max="0.95"
              step="0.05"
              value={testDecayScore}
              onChange={(e) => setTestDecayScore(parseFloat(e.target.value))}
              className="w-full accent-[#0369A1]"
            />
            <div className="flex justify-between text-[11px] font-mono mt-1 text-slate-600">
              <span>0.10 (Segar)</span>
              <span className="font-bold text-slate-900">{testDecayScore.toFixed(2)}</span>
              <span>0.95 (Busuk)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-700 font-bold mb-1">
              Pengajuan Kategori Redistribusi:
            </label>
            <select
              value={testClaimedTier}
              onChange={(e) => setTestClaimedTier(e.target.value)}
              className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-900"
            >
              <option value="tier_1">Tier 1: Komersial Warteg (Diskon 50-70%)</option>
              <option value="tier_2">Tier 2: Dapur Sosial (Subisidi / Donasi)</option>
              <option value="tier_3">Tier 3: Sentra Maggot BSF (Pakan Larva)</option>
            </select>
          </div>

          <div className="flex flex-col justify-center">
            <span className="text-[11px] text-slate-500 font-bold mb-1 uppercase tracking-wider">
              Keputusan Quality Gate:
            </span>
            {isMoralHazardBlocked ? (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-[#BE123C] text-xs font-bold flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>BLOCKED: Moral hazard terdeteksi! Sayur masih layak pangan manusia.</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-[#065F46] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>PASSED: Alokasi memenuhi syarat biological threshold.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Escrow Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#2A5C5F]" />
            <h3 className="text-sm font-bold text-slate-900">
              Buku Besar Escrow & Log Audit Transaksi (Escrow Ledger)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono font-medium">
            {transactions.length} Entri Tercatat
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">ID Transaksi</th>
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Pembeli</th>
                <th className="py-2.5 px-3">Kios Pedagang</th>
                <th className="py-2.5 px-3">Lot Komoditas</th>
                <th className="py-2.5 px-3">Nominal (IDR)</th>
                <th className="py-2.5 px-3">Status Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition font-medium">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                    {tx.id}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono">
                    {tx.createdAt}
                  </td>
                  <td className="py-2.5 px-3 text-slate-900 font-bold">
                    {tx.buyerName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {tx.vendorName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {tx.commodityName}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#1E4345]">
                    Rp {tx.amountIdr.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        tx.status === "released"
                          ? "bg-emerald-50 text-[#065F46] border-emerald-300"
                          : "bg-sky-50 text-[#075985] border-sky-300"
                      }`}
                    >
                      {tx.status === "released" ? "Cair ke Pedagang" : "Tertahan di Escrow"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Agent ReAct CoT Inspector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Inspektor Penalaran Multi-Agen (Chain-of-Thought Trace)
        </h3>
        <p className="text-xs text-slate-600 mb-4 font-medium">
          Pelacakan alur observasi, pemikiran, dan aksi otonom ReAct per spesialis agen
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-1 lg:border-r lg:border-slate-100 lg:pr-3">
            {MULTI_AGENTS.map((ag, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedAgent(ag.name)}
                type="button"
                className={`w-full text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                  selectedAgent === ag.name
                    ? "bg-[#F0F6F6] border-[#D1E1E2] text-[#1E4345] font-bold shadow-2xs"
                    : "bg-white border-transparent hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="font-mono text-xs font-semibold">{ag.name}</div>
                <div className="text-[11px] text-slate-500 font-medium">{ag.role}</div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 bg-[#0F171A] text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#38BDF8]" />
                Trace Log: {selectedAgent}
              </span>
              <span className="text-emerald-400 font-bold">[ONLINE]</span>
            </div>

            <div className="space-y-2 leading-relaxed text-[11px]">
              <p className="text-[#38BDF8]">
                [OBSERVE] Jam Sirkadian: {stageConfig.clockTime} · Suhu Los: {stageConfig.temperatureC}°C · RH: {stageConfig.humidityPercent}%
              </p>
              <p className="text-slate-300">
                [THINK] Kinetika Arrhenius mendeteksi laju respirasi komoditas daun meningkat pada los Blok A.
              </p>
              <p className="text-amber-300">
                [ACTION] QualityGate memverifikasi Decay Score: 0.58. Klasifikasi: 'Tier 1 Warteg'. Menerbitkan tiket penawaran surplus terdiskon.
              </p>
              <p className="text-emerald-400">
                [DISPATCH] Mengirimkan pesan penawaran ke los Kios A-12 via Telegram gateway.
              </p>
              <p className="text-slate-400">
                [METRIC] Estimasi pengalihan TPA: 35 kg sayur · Pencegahan emisi: 16.8 kg CO₂e.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
