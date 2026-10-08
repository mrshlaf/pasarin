"use client";

import { useMarketSimulation } from "@/lib/simulationStore";
import { CheckCircle2, ArrowRight, Bot, Cpu, ShieldCheck, Zap } from "lucide-react";

interface WorkflowStep {
  step: number;
  title: string;
  subtitle: string;
  agentLabel: string;
  agentIcon: typeof Bot;
  badgeColor: string;
}

const STEPS: WorkflowStep[] = [
  {
    step: 1,
    title: "1. Ingest Pasokan & Telemetri",
    subtitle: "Pencatatan los & laju respirasi Arrhenius-Q10",
    agentLabel: "Biological Kinetics Agent",
    agentIcon: Cpu,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    step: 2,
    title: "2. Autonomous Sweep 14:30",
    subtitle: "Evaluasi kelayuan & Inverse Surge Pricing",
    agentLabel: "Dynamic Pricing & QG Agent",
    agentIcon: Zap,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    step: 3,
    title: "3. Klaim Pembeli & Escrow",
    subtitle: "Siaran Telegram & Pengamanan Dana QRIS",
    agentLabel: "Matchmaking & Escrow Agent",
    agentIcon: Bot,
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    step: 4,
    title: "4. Handover PoD & Pencairan",
    subtitle: "Validasi GPS <=50m & Karbon IPCC 2006",
    agentLabel: "Logistics & Carbon Agent",
    agentIcon: ShieldCheck,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
];

export function RoleWorkflowStepper() {
  const { currentStage } = useMarketSimulation();

  // Tentukan langkah aktif berdasarkan stage sirkadian pasar
  let activeStep = 1;
  if (currentStage === "terik") activeStep = 1;
  else if (currentStage === "cron_sweep") activeStep = 2;
  else if (currentStage === "hujan_sore") activeStep = 3;
  else if (currentStage === "handover") activeStep = 4;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 lg:p-5 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
            Alur Kerja Otonom Penyelamatan Surplus (Workflow Stepper)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sistem mengorkestrasi 17 agen spesialis secara transparan di balik layar
          </p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Fase Operasional: Langkah {activeStep} dari 4
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {STEPS.map((s) => {
          const isDone = s.step < activeStep;
          const isCurrent = s.step === activeStep;
          const StepIcon = s.agentIcon;

          return (
            <div
              key={s.step}
              className={`p-3.5 rounded-xl border transition relative flex flex-col justify-between ${
                isCurrent
                  ? "bg-orange-50/50 border-orange-300 ring-2 ring-orange-400/20 shadow-xs"
                  : isDone
                  ? "bg-slate-50/80 border-slate-200 text-slate-700"
                  : "bg-white border-slate-200/80 text-slate-400 opacity-75"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                        ? "bg-orange-600 text-white shadow-xs"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.step}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.badgeColor}`}
                  >
                    <StepIcon className="w-2.5 h-2.5" />
                    {s.agentLabel}
                  </span>
                </div>

                <h3
                  className={`text-xs font-bold ${
                    isCurrent
                      ? "text-orange-950 font-extrabold"
                      : isDone
                      ? "text-slate-800"
                      : "text-slate-500"
                  }`}
                >
                  {s.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {s.subtitle}
                </p>
              </div>

              {isCurrent && (
                <div className="mt-3 pt-2 border-t border-orange-200/60 flex items-center justify-between text-[10px] text-orange-800 font-semibold">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
                    Sedang Diproses Otomatis
                  </span>
                  <ArrowRight className="w-3 h-3 text-orange-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
