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
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Siklus Penyelamatan Pangan
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Tahapan orkestrasi multi-agen dari inspeksi awal hingga validasi serah terima fisik
          </p>
        </div>
        <span className="text-xs font-bold text-[#075985] bg-sky-100/80 px-2.5 py-1 rounded-lg border border-sky-300 self-start sm:self-auto">
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
                  ? "bg-sky-50/70 border-[#0369A1] ring-1 ring-[#0369A1]/30 shadow-xs"
                  : isDone
                  ? "bg-emerald-50/40 border-emerald-200 text-slate-800"
                  : "bg-slate-50/60 border-slate-200 text-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      isDone
                        ? "bg-[#047857] text-white"
                        : isCurrent
                        ? "bg-[#0369A1] text-white shadow-xs"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : s.step}
                  </span>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                      isCurrent
                        ? "text-[#075985] bg-sky-100 border-sky-300 font-bold"
                        : isDone
                        ? "text-[#065F46] bg-emerald-100/70 border-emerald-200 font-semibold"
                        : "text-slate-600 bg-slate-100 border-slate-200 font-medium"
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
                      ? "text-slate-900"
                      : "text-slate-700"
                  }`}
                >
                  {s.title}
                </h3>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug font-normal">
                  {s.subtitle}
                </p>
              </div>

              {isCurrent && (
                <div className="mt-3 pt-2 border-t border-sky-200 flex items-center justify-between text-[10px] text-[#0369A1] font-bold">
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
