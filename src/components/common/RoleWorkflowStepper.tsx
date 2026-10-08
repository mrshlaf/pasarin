"use client";

import { useMarketSimulation } from "@/lib/simulationStore";
import { Check, ArrowRight } from "lucide-react";

interface WorkflowStep {
  step: number;
  title: string;
  subtitle: string;
  agentLabel: string;
}

const STEPS: WorkflowStep[] = [
  {
    step: 1,
    title: "1. Pencatatan Stok",
    subtitle: "Kinetika respirasi mikroklimat los",
    agentLabel: "Biological Kinetics",
  },
  {
    step: 2,
    title: "2. Evaluasi Mutu Harian",
    subtitle: "Perhitungan harga terdiskon aman",
    agentLabel: "Dynamic Pricing",
  },
  {
    step: 3,
    title: "3. Klaim & Escrow",
    subtitle: "Pengamanan pembayaran QRIS BI",
    agentLabel: "Matchmaking & Escrow",
  },
  {
    step: 4,
    title: "4. Serah Terima PoD",
    subtitle: "Verifikasi lokasi kurir 50m & emisi",
    agentLabel: "Logistics & Audit",
  },
];

export function RoleWorkflowStepper() {
  const { currentStage } = useMarketSimulation();

  let activeStep = 1;
  if (currentStage === "terik") activeStep = 1;
  else if (currentStage === "cron_sweep") activeStep = 2;
  else if (currentStage === "hujan_sore") activeStep = 3;
  else if (currentStage === "handover") activeStep = 4;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Siklus Penyelamatan Pangan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tahapan orkestrasi multi-agen dari inspeksi awal hingga validasi serah terima fisik
          </p>
        </div>
        <span className="text-xs font-semibold text-[#0284C7] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 self-start sm:self-auto">
          Tahap {activeStep} dari 4 Aktif
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {STEPS.map((s) => {
          const isDone = s.step < activeStep;
          const isCurrent = s.step === activeStep;

          return (
            <div
              key={s.step}
              className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                isCurrent
                  ? "bg-sky-50/50 border-[#0284C7]/40 ring-1 ring-[#0284C7]/20 shadow-xs"
                  : isDone
                  ? "bg-slate-50/70 border-slate-200/80 text-slate-700"
                  : "bg-white border-slate-200/60 text-slate-400 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      isDone
                        ? "bg-[#059669] text-white"
                        : isCurrent
                        ? "bg-[#0284C7] text-white shadow-xs"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : s.step}
                  </span>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                      isCurrent
                        ? "text-[#0284C7] bg-sky-100 font-semibold"
                        : isDone
                        ? "text-[#059669] bg-emerald-50"
                        : "text-slate-500 bg-slate-100"
                    }`}
                  >
                    {s.agentLabel}
                  </span>
                </div>

                <h3
                  className={`text-xs font-bold ${
                    isCurrent
                      ? "text-slate-900 font-extrabold"
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
                <div className="mt-3 pt-2 border-t border-sky-200 flex items-center justify-between text-[10px] text-[#0284C7] font-semibold">
                  <span>Proses Berjalan</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
