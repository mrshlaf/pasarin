import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
export { orderStatus } from "@/lib/orderStatus";
import type { RescueOffer } from "@/types/market";
import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const toneStyles: Record<Tone, string> = {
  neutral: "border-brand/20 bg-brand-soft text-brand-ink",
  info: "border-tier-1/30 bg-tier-1-soft text-tier-1-ink",
  success: "border-tier-3/30 bg-tier-3-soft text-tier-3-ink",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
};

const statusTones: Record<string, Tone> = {
  Tersedia: "success",
  Selesai: "success",
  "Di kios": "neutral",
  "Stok habis": "neutral",
  "Mutu berubah": "warning",
  "Perlu persetujuan": "warning",
  "Menunggu pembayaran": "warning",
  "Siap diantar": "info",
  Ditahan: "info",
  Ditolak: "danger",
  Dikembalikan: "danger",
};

/** Keeps section hierarchy and spacing consistent across workspaces. */
export function MarketSection({ title, description, action, variant = "card", children }: {
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "card" | "plain";
  children: ReactNode;
}) {
  const card = variant === "card";
  return (
    <section className={card ? "market-panel min-w-0" : "min-w-0"}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="market-section-heading break-words">{title}</h2>
          {description && <p className="mt-1 max-w-prose break-words text-sm leading-6 text-ink-muted">{description}</p>}
        </div>
        {action}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export interface MarketMetric {
  label: string;
  value: ReactNode;
  tone?: "brand" | "success" | "warning" | "danger";
}

const metricTones = {
  brand: "text-ink",
  success: "text-tier-3-ink",
  warning: "text-warning",
  danger: "text-danger",
} as const;

/** Displays live counts and balances as one hairline-divided reading band. */
export function MarketMetrics({ items }: { items: MarketMetric[] }) {
  const baseCols = items.length === 1 ? "grid-cols-1" : items.length === 3 ? "grid-cols-3" : "grid-cols-2";
  const wideCols = items.length === 1 ? "lg:grid-cols-1" : items.length === 2 ? "lg:grid-cols-2" : items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return (
    <dl className={`grid ${baseCols} gap-px overflow-hidden rounded-2xl border border-line bg-line ${wideCols}`}>
      {items.map(({ label, value, tone = "brand" }) => (
        <div key={label} className="min-w-0 bg-surface px-3 py-3.5 sm:p-4">
          <dt className="text-[13px] leading-5 text-ink-muted">{label}</dt>
          <dd className={`mt-1.5 break-words text-[clamp(1.125rem,2.4vw,1.5rem)] font-semibold leading-tight tracking-tight tabular-nums ${metricTones[tone]}`}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Renders a semantic status so colour is never the only signal. */
export function StatusPill({ label, tone }: { label: string; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[12px] font-semibold leading-4 ${toneStyles[tone ?? statusTones[label] ?? "neutral"]}`}>
      {label}
    </span>
  );
}

export const TIER_LABELS: Record<RescueOffer["targetTier"], string> = {
  tier_1: "Tier 1, Warteg",
  tier_2: "Tier 2, Dapur sosial",
  tier_3: "Tier 3, Maggot",
};

const tierStyles: Record<RescueOffer["targetTier"], string> = {
  tier_1: "border-tier-1/30 bg-tier-1-soft text-tier-1-ink",
  tier_2: "border-tier-2/30 bg-tier-2-soft text-tier-2-ink",
  tier_3: "border-tier-3/30 bg-tier-3-soft text-tier-3-ink",
};

/** Labels the redistribution lane attached to a lot. */
export function TierChip({ tier }: { tier: RescueOffer["targetTier"] }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[12px] font-semibold leading-4 ${tierStyles[tier]}`}>
      {TIER_LABELS[tier]}
    </span>
  );
}

/** Shows biological decay on a 0-100 scale with both the number and its condition. */
export function DecayMeter({ score }: { score: number }) {
  const percent = Math.max(0, Math.min(100, Math.round(score * 100)));
  const marker = Math.max(1, Math.min(99, percent));
  const zone = percent < 35
    ? { label: "Segar", text: "text-tier-3-ink" }
    : percent < 65
      ? { label: "Layu ringan", text: "text-warning" }
      : percent < 85
        ? { label: "Layu sedang", text: "text-warning" }
        : { label: "Khusus biokonversi", text: "text-danger" };
  return (
    <div className="min-w-0" role="meter" aria-label="Skor susut" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
      aria-valuetext={`${percent} dari 100, ${zone.label}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-ink-muted">Skor susut</span>
        <span className="flex flex-wrap items-baseline justify-end gap-x-2 text-right">
          <span className={`text-[12px] font-semibold ${zone.text}`}>{zone.label}</span>
          <span className="text-sm font-semibold tabular-nums">{percent}<span className="text-[12px] font-normal text-ink-muted">/100</span></span>
        </span>
      </div>
      <div className="relative mt-2 h-2">
        <div className="absolute inset-0 flex overflow-hidden rounded-full bg-track">
          <span aria-hidden className="h-full w-[35%] bg-decay-safe" />
          <span aria-hidden className="h-full w-[30%] bg-decay-watch" />
          <span aria-hidden className="h-full w-[20%] bg-decay-risk" />
          <span aria-hidden className="h-full w-[15%] bg-danger/70" />
          <span aria-hidden className="absolute inset-y-0 left-[35%] w-px bg-surface/80" />
          <span aria-hidden className="absolute inset-y-0 left-[65%] w-px bg-surface/80" />
          <span aria-hidden className="absolute inset-y-0 left-[85%] w-px bg-surface/80" />
        </div>
        <span aria-hidden className="absolute -top-1 h-4 w-[3px] -translate-x-1/2 rounded-full bg-ink" style={{ left: `${marker}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] leading-4 text-ink-muted">
        <span>0 segar</span>
        <span>100 susut</span>
      </div>
    </div>
  );
}

/** Holds space with a clear next step instead of a bare sentence. */
export function EmptyState({ icon: Icon, title, description }: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line-strong/60 bg-canvas/50 px-5 py-7 text-center">
      <span aria-hidden className="grid size-8 place-items-center rounded-full bg-brand-soft text-brand">
        <Icon size={16} />
      </span>
      <p className="mt-2.5 text-sm font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-[44ch] text-[13px] leading-5 text-ink-muted">{description}</p>}
    </div>
  );
}

/** Renders stock or offer rows without requiring horizontal scrolling on phones. */
export function MarketRow({ title, detail, status, children }: {
  title: string; detail: string; status?: string; children?: ReactNode;
}) {
  return (
    <li className="grid min-w-0 gap-3 border-b border-line py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="break-words font-semibold">{title}</p>
        <p className="mt-1 break-words text-sm leading-6 text-ink-muted">{detail}</p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {status && <StatusPill label={status} />}
        {children}
      </div>
    </li>
  );
}

/** Uses canonical commodity and kiosk labels for offers shared across roles. */
export function offerTitle(offer: RescueOffer) {
  return commodityName(offer.commodityId) + ", " + kg(offer.quantityKg);
}

/** Pairs lot figures with labels that distinguish stock from orders. */
export function LotFacts({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] leading-5">
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-wrap items-baseline gap-x-1.5">
          <dt className="text-ink-muted">{label}</dt>
          <dd className="font-semibold tabular-nums text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function commodityName(id: string) {
  return COMMODITIES.find((item) => item.id === id)?.localName ?? id;
}

export function kioskInfo(vendorId: string) {
  return KIOSKS.find((item) => item.id === vendorId);
}

/** Resolves the source kiosk displayed on buyer and courier orders. */
export function kioskLabel(vendorId: string) {
  const kiosk = kioskInfo(vendorId);
  return kiosk ? "Kios " + kiosk.stallNumber + ", " + kiosk.name : vendorId;
}

/** Uses the same amount formatting for the simulated ledger and catalog. */
export function rupiah(amount: number) {
  return "Rp " + amount.toLocaleString("id-ID");
}

/** Uses Indonesian decimal separators for kilograms. */
export function kg(amount: number) {
  return amount.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " kg";
}

/** Mengubah sisa jam simpan ke format ramah pengguna: menit jika < 1 jam, jam & menit jika ada sisa, atau afkir. */
export function formatRemainingShelfLife(hours: number, decayScore?: number): string {
  if (decayScore !== undefined && decayScore >= 0.85) {
    return "Afkir (pakan maggot)";
  }
  if (!Number.isFinite(hours) || hours <= 0) {
    return "Afkir (pakan maggot)";
  }
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes} menit`;
  }
  const fullHours = Math.floor(hours);
  const remainingMinutes = Math.round((hours - fullHours) * 60);
  if (remainingMinutes === 0) {
    return `${fullHours} jam`;
  }
  return `${fullHours} jam ${remainingMinutes} menit`;
}

/** Format durasi waktu pajang komoditas dalam jam bulat tanpa koma yang membingungkan. */
export function formatElapsedHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "1 jam";
  const rounded = Math.max(1, Math.round(hours));
  return `${rounded} jam`;
}

/** Keeps delivery history dates compact and locale-correct. */
export function dateLabel(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(date);
}

export const marketButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60";
export const marketSecondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line-strong bg-transparent px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft disabled:opacity-60";
export const marketGhost = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft disabled:opacity-60";
