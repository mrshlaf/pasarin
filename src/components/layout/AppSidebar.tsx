"use client";

import { useMarketSimulation, AppRole, SimulationContextType } from "@/lib/simulationStore";
import {
  Store,
  ShoppingBag,
  HeartHandshake,
  Recycle,
  Truck,
  Building2,
  Cpu,
  CheckCircle2,
} from "lucide-react";

interface RoleNavConfig {
  id: AppRole;
  label: string;
  subLabel: string;
  icon: typeof Store;
  badgeCount?: (ctx: SimulationContextType) => number;
  color: string;
}

const ROLES: RoleNavConfig[] = [
  {
    id: "vendor",
    label: "Pedagang Lapak",
    subLabel: "Shopee Seller Center Kios",
    icon: Store,
    color: "text-orange-600 bg-orange-50 border-orange-200",
    badgeCount: (ctx) =>
      ctx.offers.filter(
        (o) => o.vendorId === ctx.selectedVendorId && o.status === "pending_vendor"
      ).length,
  },
  {
    id: "warteg",
    label: "Pembeli Warteg",
    subLabel: "Shopee Buyer App (Diskon 50-70%)",
    icon: ShoppingBag,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    badgeCount: (ctx) =>
      ctx.offers.filter((o) => o.targetTier === "tier_1" && o.status === "active")
        .length,
  },
  {
    id: "social_kitchen",
    label: "Dapur Sosial & Panti",
    subLabel: "Pangan Kemanusiaan (Tier 2)",
    icon: HeartHandshake,
    color: "text-rose-600 bg-rose-50 border-rose-200",
    badgeCount: (ctx) =>
      ctx.offers.filter((o) => o.targetTier === "tier_2" && o.status === "active")
        .length,
  },
  {
    id: "maggot",
    label: "Sentra Maggot BSF",
    subLabel: "Biopond & Kompos (Tier 3)",
    icon: Recycle,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    badgeCount: (ctx) =>
      ctx.offers.filter((o) => o.targetTier === "tier_3" && o.status === "active")
        .length,
  },
  {
    id: "logistics",
    label: "Kurir Logistik",
    subLabel: "Fleet Driver & PoD Geofence",
    icon: Truck,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    badgeCount: (ctx) =>
      ctx.offers.filter((o) => o.status === "claimed" && o.paymentStatus === "held_in_escrow")
        .length,
  },
  {
    id: "manager",
    label: "Pengelola Pasar",
    subLabel: "Perumda Pasar Jaya & DLH",
    icon: Building2,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
  {
    id: "admin",
    label: "Administrator Sistem",
    subLabel: "Multi-Agent ReAct & Free Tier",
    icon: Cpu,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
];

export function AppSidebar() {
  const sim = useMarketSimulation();

  return (
    <aside className="w-full lg:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* Role Selection Section */}
      <div className="p-4 border-b border-slate-100">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
          7 Peran Mandiri (Role Dashboard)
        </h2>
        <div className="space-y-1.5">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const isActive = sim.role === r.id;
            const count = r.badgeCount ? r.badgeCount(sim) : 0;

            return (
              <button
                key={r.id}
                onClick={() => sim.setRole(r.id)}
                type="button"
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  isActive
                    ? "bg-orange-500/10 border-orange-500/30 text-slate-900 shadow-xs ring-1 ring-orange-500/20"
                    : "bg-white border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                      isActive ? "bg-orange-500 text-white border-orange-600" : r.color
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isActive ? "text-orange-700" : "text-slate-800"
                      }`}
                    >
                      {r.label}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate font-normal">
                      {r.subLabel}
                    </p>
                  </div>
                </div>

                {count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                      isActive
                        ? "bg-orange-600 text-white"
                        : "bg-orange-100 text-orange-700 border border-orange-200"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Summary / Status */}
      <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/50">
        <div className="rounded-xl bg-white border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-800">
              PRD v3.0 Master Compliant
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Sistem Multi-Agen Proaktif Kramat Jati dengan model kinetika Arrhenius-Q10 & Escrow QRIS BI.
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>RPL FTUI 2026</span>
            <span className="font-mono">v3.0 Definitive</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
