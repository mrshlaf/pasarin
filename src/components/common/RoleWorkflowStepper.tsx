"use client";

/**
 * Komponen Penuntun Alur Kerja Siklus Penyelamatan Pangan (RoleWorkflowStepper) (Clean Swiss Minimalist).
 * Menggambarkan 4 fase orkestrasi berantai dari kedatangan stok hingga serah terima fisik kurir.
 */

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
    title: "1. Pencatatan Stok Subuh",
    subtitle: "Kinetika respirasi mikroklimat los",
    agentLabel: "Biological Kinetics",
  },
  {
    step: 2,
    title: "2. Evaluasi Mutu & Diskon",
    subtitle: "Penetapan harga salvaging aman modal",
    agentLabel: "Dynamic Pricing",
  },
  {
    step: 3,
    title: "3. Klaim & Rekening Escrow",
    subtitle: "Pengamanan pembayaran QRIS BI",
    agentLabel: "Matchmaking & Escrow",
  },
  {
    step: 4,
    title: "4. Serah Terima Fisik PoD",
    subtitle: "Verifikasi kurir 50m & audit emisi",
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
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Siklus Alur Penyelamatan Pangan
          </h2>
          <p className="text-sm font-bold text-slate-900 mt-0.5">
            Orkestrasi Otonom Multi-Agen (Subuh s/d Serah Terima Sore)
          </p>
        </div>
        <span className="text-[11px] font-bold font-mono text-[#2A5C5F] bg-[#F0F6F6] px-2.5 py-1 rounded-lg border border-[#D1E1E2] self-start sm:self-auto">
          Tahap {activeStep} / 4 Aktif
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
        {STEPS.map((s) => {
          const isDone = s.step < activeStep;
          const isCurrent = s.step === activeStep;

          return (
            <div
              key={s.step}
              className={`p-3 rounded-lg border transition flex flex-col justify-between ${
                isCurrent
                  ? "bg-[#F0F6F6] border-[#2A5C5F] ring-1 ring-[#2A5C5F]/20"
                  : isDone
                  ? "bg-slate-50/70 border-slate-200 text-slate-800"
                  : "bg-white border-slate-200 text-slate-500"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-mono transition ${
                      isDone
                        ? "bg-[#047857] text-white"
                        : isCurrent
                        ? "bg-[#2A5C5F] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isDone ? <Check className="w-3 h-3" /> : s.step}
                  </span>

                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                      isCurrent
                        ? "text-[#1E4345] bg-white border-[#D1E1E2] font-bold"
                        : isDone
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200 font-medium"
                        : "text-slate-500 bg-slate-50 border-slate-200 font-normal"
                    }`}
                  >
                    {s.agentLabel}
                  </span>
                </div>

                <h3
                  className={`text-xs font-bold leading-tight ${
                    isCurrent
                      ? "text-slate-900"
                      : isDone
                      ? "text-slate-800"
                      : "text-slate-600"
                  }`}
                >
                  {s.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug font-normal">
                  {s.subtitle}
                </p>
              </div>

              {isCurrent && (
                <div className="mt-2.5 pt-1.5 border-t border-[#D1E1E2] flex items-center justify-between text-[10px] text-[#2A5C5F] font-bold">
                  <span>Sedang Berjalan</span>
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
