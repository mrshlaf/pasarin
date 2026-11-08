"use client";

import { Building2, HeartHandshake, Recycle, ShieldCheck, Store, Truck, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useMarketSimulation, type AppRole } from "@/lib/simulationStore";
import { isReadyForDelivery } from "@/types/market";

export const ROLE_LABELS: Record<AppRole, string> = {
  vendor: "Pedagang",
  warteg: "Warteg",
  social_kitchen: "Dapur sosial",
  maggot: "Sentra maggot",
  logistics: "Kurir",
  manager: "Pengelola pasar",
  admin: "Administrator",
};

const ROLE_ICONS: Record<AppRole, LucideIcon> = {
  vendor: Store,
  warteg: UtensilsCrossed,
  social_kitchen: HeartHandshake,
  maggot: Recycle,
  logistics: Truck,
  manager: Building2,
  admin: ShieldCheck,
};

const PREVIEW_TIERS: Partial<Record<AppRole, "tier_1" | "tier_2" | "tier_3">> = {
  warteg: "tier_1",
  social_kitchen: "tier_2",
  maggot: "tier_3",
};

/** Lets supervisors preview authorized workspaces without changing their authenticated role. */
export function AppSidebar() {
  const { role, setRole, offers, stockItems } = useMarketSimulation();
  const { user, isRoleAccessible } = useAuth();
  if (user?.role !== "admin" && user?.role !== "manager") return null;
  const roles = (Object.keys(ROLE_LABELS) as AppRole[]).filter(isRoleAccessible);

  /** Gives each preview workspace a live count of the work waiting inside it. */
  function pendingCount(item: AppRole) {
    if (item === "vendor") return new Set(stockItems.filter((stock) => stock.remainingKg > 0).map((stock) => stock.vendorId)).size;
    if (item === "logistics") return offers.filter((offer) => isReadyForDelivery(offer)).length;
    const tier = PREVIEW_TIERS[item];
    return tier ? offers.filter((offer) => offer.targetTier === tier && offer.status === "active").length : 0;
  }

  return (
    <nav aria-label="Ruang kerja" className="w-full shrink-0 rounded-2xl border border-line bg-surface p-3 lg:sticky lg:top-20 lg:w-56 lg:self-start">
      <label htmlFor="workspace-role" className="block pb-2 text-[13px] font-medium text-ink-muted lg:hidden">Ruang kerja</label>
      <select id="workspace-role" value={role} onChange={(event) => setRole(event.target.value as AppRole)}
        className="market-input lg:hidden">
        {roles.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}
      </select>
      <p className="hidden px-2 pb-2 text-[13px] font-medium text-ink-muted lg:block">Ruang kerja</p>
      <div className="hidden gap-1 lg:grid">
        {roles.map((item) => {
          const Icon = ROLE_ICONS[item];
          const count = pendingCount(item);
          const active = role === item;
          return (
            <button key={item} type="button" aria-pressed={active} onClick={() => setRole(item)}
              className={`flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-semibold transition-colors ${active
                ? "bg-brand text-cream" : "text-brand-ink hover:bg-brand-soft"}`}>
              <Icon size={16} aria-hidden className={active ? "text-cream" : "text-brand"} />
              <span className="min-w-0 flex-1 truncate">{ROLE_LABELS[item]}</span>
              {count > 0 && (
                <span className={`min-w-5 rounded px-1.5 py-0.5 text-center text-[12px] font-semibold tabular-nums ${active
                  ? "bg-cream/15 text-cream" : "bg-canvas text-ink-muted"}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
