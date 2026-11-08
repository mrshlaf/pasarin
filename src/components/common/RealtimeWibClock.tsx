"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface RealtimeWibClockProps {
  className?: string;
  showSeconds?: boolean;
  showDate?: boolean;
}

/**
 * Komponen jam digital real-time Waktu Indonesia Barat (WIB, UTC+7).
 * Berjalan dinamis setiap detik di browser klien untuk semua dashboard peran.
 */
export function RealtimeWibClock({
  className = "",
  showSeconds = true,
  showDate = true,
}: RealtimeWibClockProps) {
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      // Hitung offset akurat ke WIB (UTC+7)
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
      const wibDate = new Date(utcTime + 7 * 3600000);

      const hours = String(wibDate.getHours()).padStart(2, "0");
      const minutes = String(wibDate.getMinutes()).padStart(2, "0");
      const seconds = String(wibDate.getSeconds()).padStart(2, "0");

      setTimeStr(showSeconds ? `${hours}.${minutes}.${seconds}` : `${hours}.${minutes}`);

      if (showDate) {
        const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const day = days[wibDate.getDay()];
        const date = wibDate.getDate();
        const month = months[wibDate.getMonth()];
        const year = wibDate.getFullYear();
        setDateStr(`${day}, ${date} ${month} ${year}`);
      }
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [showSeconds, showDate]);

  if (!timeStr) {
    return (
      <span className={`inline-flex items-center gap-1.5 tabular-nums text-ink-muted ${className}`}>
        <Clock size={13} aria-hidden />
        <span>--.-- WIB</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 tabular-nums ${className}`}>
      <Clock size={13} aria-hidden className="text-brand shrink-0" />
      <span className="font-semibold text-ink">{timeStr} WIB</span>
      {dateStr && <span className="text-ink-muted text-xs hidden md:inline">· {dateStr}</span>}
    </span>
  );
}
