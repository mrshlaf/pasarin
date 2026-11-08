import type { ReactNode } from "react";
export { orderStatus } from "@/lib/orderStatus";
import type { RescueOffer } from "@/types/market";
import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";

/** Keeps section hierarchy, spacing and empty states consistent across workspaces. */
export function MarketSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#d5ded2] bg-[#fffef8] p-4 sm:p-6">
      <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
      {description && <p className="mt-1 text-sm leading-6 text-[#465c54]">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Displays live counts and balances using the same label and number styles. */
export function MarketMetrics({ items }: { items: Array<[string, string | number]> }) {
  return (
    <dl className="grid grid-cols-2 gap-3 rounded-xl border border-[#d5ded2] bg-[#fffef8] p-4 sm:flex sm:flex-wrap sm:gap-x-10">
      {items.map(([label, value]) => <div key={label} className="min-w-0">
        <dt className="text-sm text-[#465c54]">{label}</dt>
        <dd className="mt-1 break-words text-xl font-semibold tabular-nums">{value}</dd>
      </div>)}
    </dl>
  );
}

/** Renders stock or offer rows without requiring horizontal scrolling on phones. */
export function MarketRow({ title, detail, status, children }: {
  title: string; detail: string; status?: string; children?: ReactNode;
}) {
  return (
    <li className="grid min-w-0 gap-3 border-b border-[#d5ded2] py-3.5 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="break-words font-semibold">{title}</p>
        <p className="mt-1 break-words text-sm text-[#465c54]">{detail}</p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {status && <span className="rounded-md bg-[#e8efe5] px-2.5 py-1 text-sm font-semibold text-[#214d43]">{status}</span>}
        {children}
      </div>
    </li>
  );
}

/** Uses canonical commodity and kiosk labels for offers shared across roles. */
export function offerTitle(offer: RescueOffer) {
  return (COMMODITIES.find((item) => item.id === offer.commodityId)?.localName ?? offer.commodityId) + " · " + offer.quantityKg + " kg";
}

/** Uses the same amount formatting for the simulated ledger and catalog. */
export function rupiah(amount: number) {
  return "Rp " + amount.toLocaleString("id-ID");
}

/** Resolves the source kiosk displayed on buyer and courier orders. */
export function kioskLabel(vendorId: string) {
  const kiosk = KIOSKS.find((item) => item.id === vendorId);
  return kiosk ? "Kios " + kiosk.stallNumber + " · " + kiosk.name : vendorId;
}

export const marketButton = "min-h-11 rounded-lg bg-[#214d43] px-3 py-2 text-sm font-semibold text-white hover:bg-[#173b34]";
export const marketSecondary = "min-h-11 rounded-lg border border-[#788e81] px-3 py-2 text-sm font-semibold text-[#214d43] hover:bg-[#e8efe5]";
