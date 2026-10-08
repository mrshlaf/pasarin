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
} from "lucide-react";

interface RoleNavConfig {
  id: AppRole;
  label: string;
  subLabel: string;
  icon: typeof Store;
  activeColor: string;
  badgeCount?: (ctx: SimulationContextType) => number;
}

const ROLES: RoleNavConfig[] = [
  {
    id: "vendor",
    label: "Pedagang Lapak",
    subLabel: "30 Kios Pasar Kramat Jati",
    icon: Store,
    activeColor: "bg-[#2A5C5F] text-white",
    badgeCount: (ctx) =>
      ctx.offers.filter(
        (o) => o.vendorId === ctx.selectedVendorId && o.status === "pending_vendor"
      ).length,
  },
  {
    id: "warteg",
    label: "Pembeli Warteg",
    subLabel: "Surplus Terdiskon 50 - 70%",
    icon: ShoppingBag,
    activeColor: "bg-[#0284C7] text-white",
    badgeCount: (ctx) =>
      ctx.offers.filter((o) => o.targetTier === "tier_1" && o.status === "active")
        .length,
  },
  {
    id: "social_kitchen",
    label: "Dapur Sosial & Panti",
    subLabel: "Pangan Kemanusiaan Tier 2",
    icon: HeartHandshake,
    activeColor: "bg-[#E11D48] text-white",
    badgeCount: (ctx) =>
      ctx.offers.filter((o) => o.targetTier === "tier_2" && o.status === "active")
        .length,
  },
  {
    id: "maggot",
    label: "Sentra Maggot BSF",
    subLabel: "Biokonversi & Kompos Tier 3",
    icon: Recycle,
    activeColor: "bg-[#059669] text-white",
    badgeCount: (ctx) =>
      ctx.offers.filter((o) => o.targetTier === "tier_3" && o.status === "active")
        .length,
  },
  {
    id: "logistics",
    label: "Kurir Logistik",
    subLabel: "Armada & Handover PoD",
    icon: Truck,
    activeColor: "bg-[#475569] text-white",
    badgeCount: (ctx) =>
      ctx.offers.filter(
        (o) => o.status === "claimed" && o.paymentStatus === "held_in_escrow"
      ).length,
  },
  {
    id: "manager",
    label: "Pengelola Pasar",
    subLabel: "Perumda Pasar Jaya & DLH",
    icon: Building2,
    activeColor: "bg-[#334155] text-white",
  },
  {
    id: "admin",
    label: "Administrator Sistem",
    subLabel: "Orkestrator & Infrastruktur",
    icon: Cpu,
    activeColor: "bg-[#0F171A] text-white",
  },
];

export function AppSidebar() {
  const sim = useMarketSimulation();

  return (
    <aside className="w-full lg:w-72 bg-white border-r border-slate-200/80 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-100">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
          Peran Pengguna
        </h2>
        <div className="space-y-1">
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
                    ? "bg-[#F0F6F6] border-[#D1E1E2] text-slate-900 shadow-2xs"
                    : "bg-white border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition ${
                      isActive
                        ? r.activeColor
                        : "bg-slate-50 text-slate-600 border-slate-200/80"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p
                      className={`text-xs font-bold truncate ${
                        isActive ? "text-[#2A5C5F]" : "text-slate-800"
                      }`}
                    >
                      {r.label}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {r.subLabel}
                    </p>
                  </div>
                </div>

                {count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                      isActive
                        ? "bg-[#2A5C5F] text-white"
                        : "bg-slate-100 text-[#2A5C5F] border border-slate-200"
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

      {/* Academic Credential Footer */}
      <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/40">
        <div className="rounded-xl bg-white border border-slate-200/80 p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 mb-1">
            <span>PASARIN Framework</span>
            <span className="font-mono text-[#0284C7]">v3.0</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Multi-Agent System & Arrhenius-Q10 Kinetika Biologis.
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
            Departemen Teknik Elektro · FTUI 2026
          </div>
        </div>
      </div>
    </aside>
  );
}
