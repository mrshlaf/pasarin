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
    sm: { w: 26, h: 24 },
    md: { w: 34, h: 31 },
    lg: { w: 46, h: 42 },
  }[size];

  const titleSize = {
    sm: "text-base tracking-wider",
    md: "text-lg tracking-wider",
    lg: "text-2xl tracking-widest",
  }[size];

  const subtitleSize = {
    sm: "text-[9px] tracking-widest",
    md: "text-[10px] tracking-wider",
    lg: "text-xs tracking-wider",
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center">
        <Image
          src={iconSrc}
          alt="PASARIN Logo"
          width={iconDimensions.w}
          height={iconDimensions.h}
          className="object-contain"
          priority
        />
      </div>

      <div className="flex flex-col">
        <span
          className={`font-black uppercase leading-none font-sans ${titleSize} ${
            variant === "white" ? "text-white" : "text-[#2A5C5F]"
          }`}
        >
          PASARIN
        </span>
        {showSubtitle && (
          <span
            className={`font-semibold uppercase leading-none mt-1 ${subtitleSize} ${
              variant === "white" ? "text-slate-200" : "text-slate-500"
            }`}
          >
            Proactive Agent for Market Surplus Redistribution
          </span>
        )}
      </div>
    </div>
  );
}
