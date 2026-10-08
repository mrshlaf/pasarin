import Image from "next/image";

interface PasarinLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "teal" | "white";
  showSubtitle?: boolean;
  className?: string;
}

export function PasarinLogo({
  size = "md",
  variant = "teal",
  showSubtitle = true,
  className = "",
}: PasarinLogoProps) {
  const iconSrc =
    variant === "white"
      ? "/brand/pasarin_icon_white.png"
      : "/brand/pasarin_icon_teal.png";

  const iconDimensions = {
    sm: { w: 32, h: 27 },
    md: { w: 44, h: 37 },
    lg: { w: 58, h: 49 },
  }[size];

  const titleSize = {
    sm: "text-base tracking-widest",
    md: "text-lg tracking-widest",
    lg: "text-2xl tracking-widest",
  }[size];

  const subtitleSize = {
    sm: "text-[9px] tracking-wider",
    md: "text-[10px] tracking-wider",
    lg: "text-xs tracking-wider",
  }[size];

  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center">
        <Image
          src={iconSrc}
          alt="PASARIN Logo"
          width={iconDimensions.w}
          height={iconDimensions.h}
          className="object-contain"
          unoptimized
          priority
        />
      </div>

      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black uppercase leading-none font-sans ${titleSize} ${
              variant === "white" ? "text-white" : "text-[#2A5C5F]"
            }`}
          >
            PASARIN
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] shrink-0" />
        </div>
        {showSubtitle && (
          <span
            className={`font-semibold uppercase leading-none mt-1.5 whitespace-nowrap ${subtitleSize} ${
              variant === "white" ? "text-slate-200" : "text-slate-500"
            }`}
          >
            Proactive Market Surplus Redistribution
          </span>
        )}
      </div>
    </div>
  );
}
