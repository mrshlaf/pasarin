"use client";

import { useState } from "react";
import Image from "next/image";
import clsx from "clsx";

export type MarketImageContext =
  | "public"
  | "vendor"
  | "warteg"
  | "social_kitchen"
  | "maggot"
  | "logistics"
  | "manager"
  | "admin";

export interface EditorialItem {
  src: string;
  alt: string;
  position?: string;
}

export const EDITORIAL_MAP: Record<MarketImageContext, EditorialItem> = {
  public: {
    src: "/images/editorial/market.webp",
    alt: "Lapak sayuran dan komoditas pangan segar pasar tradisional",
    position: "center 40%",
  },
  vendor: {
    src: "/images/editorial/market.webp",
    alt: "Kios pedagang sayur dan komoditas pasar tradisional",
    position: "center 40%",
  },
  warteg: {
    src: "/images/editorial/meals.webp",
    alt: "Olahan pangan sayuran dan hidangan matang warung makan",
    position: "center 50%",
  },
  social_kitchen: {
    src: "/images/editorial/cooking.webp",
    alt: "Penyajian makanan komunal dari panci saji",
    position: "center 45%",
  },
  maggot: {
    src: "/images/editorial/biomass.webp",
    alt: "Biomassa organik sisa dapur dan kompos",
    position: "center 50%",
  },
  logistics: {
    src: "/images/editorial/cargo.webp",
    alt: "Armada angkutan dengan peti-peti sayuran pasar",
    position: "center 45%",
  },
  manager: {
    src: "/images/editorial/market.webp",
    alt: "Sirkulasi komoditas dan pasokan pasar",
    position: "center 40%",
  },
  admin: {
    src: "/images/editorial/market.webp",
    alt: "Tata kelola rantai pasok pasar",
    position: "center 40%",
  },
};

export interface MarketHeroBackgroundProps {
  context: MarketImageContext;
  className?: string;
}

/**
 * Latar belakang atmosferik foto lanskap lebar dengan gradient scrim mulus tanpa batas:
 * - Foto mengisi 100% wadah (inset-0) tanpa elemen potongan terpisah sehingga tidak ada garis/seam terpotong.
 * - Lapisan gradien bergradasi kontinu dari pinus pekat di area teks ke transparan di sisi foto.
 */
export function MarketHeroBackground({
  context,
  className,
}: MarketHeroBackgroundProps) {
  const item = EDITORIAL_MAP[context] || EDITORIAL_MAP.public;
  const [loadError, setLoadError] = useState(false);

  return (
    <div className={clsx("pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-brand-deep", className)}>
      {!loadError && (
        <div className="absolute inset-0">
          <Image
            src={item.src}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 1440px"
            className="object-cover opacity-80 brightness-[1.02] contrast-[1.05]"
            style={{ objectPosition: item.position || "center" }}
            onError={() => setLoadError(true)}
          />
          {/* Gradien horizontal mulus 100% tanpa potongan div terpisah: pinus solid di area teks, memudar halus ke kanan */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-deep from-15% via-brand-deep/80 via-50% to-brand-deep/20 sm:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/85 via-transparent to-brand-deep/30" />
        </div>
      )}
    </div>
  );
}

/**
 * Alias komponen gambar editorial pasar.
 */
export function MarketEditorialImage(props: MarketHeroBackgroundProps) {
  return <MarketHeroBackground {...props} />;
}
