/**
 * Komponen Bilah Atas Aplikasi (App Header).
 * Menampilkan logo merek, indikator jam digital WIB real-time, identitas profil pengguna aktif,
 * tautan bot Telegram resmi, serta tombol keluar sesi (sign out).
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Send } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { PasarinLogo } from "@/components/common/PasarinLogo";
import { RealtimeWibClock } from "@/components/common/RealtimeWibClock";

/**
 * Komponen header navigasi global untuk seluruh dasbor peran terotentikasi.
 */
export function AppHeader() {
  const { user, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="market-shell flex items-center justify-between gap-2 py-2.5 sm:gap-3">
        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <Link href="/" aria-label="Dasbor publik Pasarin"><PasarinLogo size="sm" showSubtitle={false} /></Link>
          <div className="hidden sm:flex items-center rounded-lg border border-line bg-canvas/80 px-2.5 py-1 text-xs text-ink-soft">
            <RealtimeWibClock />
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <div className="hidden shrink-0 items-center rounded-lg border border-line bg-canvas/80 px-1.5 py-1 text-[11px] text-ink-soft min-[360px]:flex sm:hidden">
            <RealtimeWibClock showSeconds={false} showDate={false} />
          </div>
          <div className="hidden min-w-0 items-center gap-2 pr-1 sm:flex">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
              {user?.name?.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden max-w-44 truncate text-sm font-semibold text-ink-soft lg:block">{user?.name}</span>
          </div>
          <a href="https://t.me/agent_pasarin_bot" target="_blank" rel="noopener noreferrer"
            aria-label="Buka Telegram"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-brand transition-colors hover:bg-brand-soft">
            <Send size={17} aria-hidden />
          </a>
          <button type="button" disabled={leaving}
            onClick={async () => {
              setLeaving(true);
              setError("");
              try { await signOut(); }
              catch { setError("Akun belum bisa keluar. Coba lagi."); }
              finally { setLeaving(false); }
            }}
            aria-label="Keluar dari akun"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-line-strong text-brand transition-colors hover:bg-brand-soft disabled:opacity-60">
            <LogOut size={17} aria-hidden />
          </button>
        </div>
      </div>
      {error && <p role="alert" className="market-shell pb-2 text-right text-sm font-medium text-danger">{error}</p>}
    </header>
  );
}
