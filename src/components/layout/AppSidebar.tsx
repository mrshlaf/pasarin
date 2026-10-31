"use client";

import { useEffect } from "react";
import { useMarketSimulation, AppRole, SimulationContextType } from "@/lib/simulationStore";
import { useAuth } from "@/lib/authContext";
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
    activeColor: "bg-[#0369A1] text-white",
    badgeCount: (ctx) =>
      ctx.offers.filter((o) => o.targetTier === "tier_1" && o.status === "active")
        .length,
  },
  {
    id: "social_kitchen",
    label: "Dapur Sosial & Panti",
    subLabel: "Pangan Kemanusiaan Tier 2",
    icon: HeartHandshake,
    activeColor: "bg-[#BE123C] text-white",
    badgeCount: (ctx) =>
      ctx.offers.filter((o) => o.targetTier === "tier_2" && o.status === "active")
        .length,
  },
  {
    id: "maggot",
    label: "Sentra Maggot BSF",
    subLabel: "Biokonversi & Kompos Tier 3",
    icon: Recycle,
    activeColor: "bg-[#047857] text-white",
    badgeCount: (ctx) =>
      ctx.offers.filter((o) => o.targetTier === "tier_3" && o.status === "active")
        .length,
  },
  {
    id: "logistics",
    label: "Kurir Logistik",
    subLabel: "Armada & Handover PoD",
    icon: Truck,
    activeColor: "bg-[#334155] text-white",
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
    activeColor: "bg-[#1E293B] text-white",
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
  const { user, isRoleAccessible } = useAuth();

  // Kunci otomatis peran simulasi sesuai peran akun pengguna yang sedang login (Role Isolation)
  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "manager" && sim.role !== user.role) {
      sim.setRole(user.role);
    }
  }, [user, sim]);

  // Hanya tampilkan peran yang berhak diakses (peran yang tidak berhak otomatis dihilangkan)
  const accessibleRoles = ROLES.filter((r) => isRoleAccessible(r.id));

  // Jika pengguna hanya berwenang pada 1 peran, bilah pemilih peran tidak perlu ditampilkan (Role Isolation)
  if (accessibleRoles.length <= 1) {
    return null;
  }

  return (
    <aside className="w-full lg:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2 px-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Peran Pengguna
          </h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            {accessibleRoles.length} Peran
          </span>
        </div>

        <div className="space-y-1">
          {accessibleRoles.map((r) => {
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
                    ? "bg-[#F0F6F6] border-[#D1E1E2] text-slate-900 shadow-2xs ring-1 ring-[#2A5C5F]/20"
                    : "bg-white border-transparent hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition ${
                      isActive
                        ? r.activeColor
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p
                      className={`text-xs font-bold truncate ${
                        isActive ? "text-[#1E4345]" : "text-slate-900"
                      }`}
                    >
                      {r.label}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate font-medium">
                      {r.subLabel}
                    </p>
                  </div>
                </div>

                {count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                      isActive
                        ? "bg-[#2A5C5F] text-white"
                        : "bg-slate-100 text-[#1E4345] border border-slate-300"
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
      <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/60">
        <div className="rounded-xl bg-white border border-slate-200 p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-900 mb-1">
            <span>PASARIN Framework</span>
            <span className="font-mono text-[#0369A1]">v3.0</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
            Multi-Agent System & Arrhenius-Q10 Kinetika Biologis.
          </p>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
            Departemen Teknik Elektro · FTUI 2026
          </div>
        </div>
      </div>
    </aside>
  );
}
