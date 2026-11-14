/**
 * Komponen Bilah Samping Ruang Kerja (App Sidebar).
 * Memfasilitasi pengawas (Admin dan Pengelola UPB Pasar) untuk meninjau pratinjau (preview)
 * perspektif seluruh peran operasional pasar secara instan tanpa perlu keluar-masuk akun.
 */

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

/**
 * Komponen bilah samping navigasi pratinjau peran untuk pengguna pengawas (Admin/Manajer).
 */
export function AppSidebar() {
  const { role, setRole, offers, stockItems } = useMarketSimulation();
  const { user, isRoleAccessible } = useAuth();
  if (user?.role !== "admin" && user?.role !== "manager") return null;
  const roles = (Object.keys(ROLE_LABELS) as AppRole[]).filter(isRoleAccessible);

  /**
   * Menghitung kuantitas antrean tindakan aktif yang menunggu pada masing-masing peran.
   */
  function pendingCount(item: AppRole) {
    if (item === "vendor") return new Set(stockItems.filter((stock) => stock.remainingKg > 0).map((stock) => stock.vendorId)).size;
    if (item === "logistics") return offers.filter((offer) => isReadyForDelivery(offer)).length;
    const tier = PREVIEW_TIERS[item];
    return tier ? offers.filter((offer) => offer.targetTier === tier && offer.status === "active").length : 0;
  }

  function pendingLabel(item: AppRole, count: number) {
    if (item === "vendor") return `${count} pedagang dengan stok tersedia`;
    if (item === "logistics") return `${count} pengantaran siap diproses`;
    return `${count} penawaran aktif`;
  }

  return (
    <nav aria-label="Ruang kerja" className="workspace-nav w-full shrink-0 lg:sticky lg:top-24 lg:w-56 lg:self-start">
      <label htmlFor="workspace-role" className="block pb-2 text-sm font-medium text-cream lg:hidden">Pratinjau ruang kerja</label>
      <select id="workspace-role" value={role} onChange={(event) => setRole(event.target.value as AppRole)}
        className="market-input lg:hidden">
        {roles.map((item) => {
          const count = pendingCount(item);
          return <option key={item} value={item}>{ROLE_LABELS[item]}{count > 0 ? `, ${pendingLabel(item, count)}` : ""}</option>;
        })}
      </select>
      <div className="hidden border-b border-rail pb-4 lg:block">
        <p className="text-sm font-semibold text-cream">Operasional pasar</p>
        <p className="mt-1 text-xs leading-5 text-sage-soft">Tinjau alur setiap peran.</p>
      </div>
      <div className="hidden gap-1 pt-3 lg:grid">
        {roles.map((item) => {
          const Icon = ROLE_ICONS[item];
          const count = pendingCount(item);
          const active = role === item;
          return (
            <button key={item} type="button" aria-pressed={active} onClick={() => setRole(item)}
              className={`flex min-h-12 items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium transition-colors ${active
                ? "bg-cream text-brand-strong" : "text-sage-soft hover:bg-cream/10 hover:text-cream"}`}>
              <Icon size={17} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{ROLE_LABELS[item]}</span>
              {count > 0 && (
                <span aria-label={pendingLabel(item, count)} className={`min-w-5 rounded px-1.5 py-0.5 text-center text-[12px] font-semibold tabular-nums ${active
                  ? "bg-brand-soft text-brand-ink" : "bg-cream/10 text-cream"}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
