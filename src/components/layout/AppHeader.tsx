// Komponen Bilah Atas Aplikasi (App Header).
// Menampilkan logo merek, indikator jam digital WIB real-time, identitas profil pengguna aktif,
// tautan bot Telegram resmi, serta tombol keluar sesi (sign out).

"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Send } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { PasarinLogo } from "@/components/common/PasarinLogo";
import { RealtimeWibClock } from "@/components/common/RealtimeWibClock";
import { ROLE_LABELS } from "@/components/layout/AppSidebar";

// Komponen header navigasi global untuk seluruh dasbor peran terotentikasi.
export function AppHeader() {
  const { user, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/90 backdrop-blur">
      <div className="market-shell flex items-center justify-between gap-3 py-2">
        {/* Kiri: logo dan jam WIB sebagai teks biasa tanpa kotak. */}
        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          <Link href="/" aria-label="Dasbor publik Pasarin"><PasarinLogo size="sm" showSubtitle={false} /></Link>
          <div className="hidden items-center text-xs text-ink-muted sm:flex">
            <RealtimeWibClock />
          </div>
        </div>

        {/* Kanan: identitas akun (nama dan peran), tautan Telegram, dan tombol keluar tanpa bingkai. */}
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <div className="hidden shrink-0 items-center text-[11px] text-ink-muted min-[360px]:flex sm:hidden">
            <RealtimeWibClock showSeconds={false} showDate={false} />
          </div>
          <div className="hidden min-w-0 items-center gap-2.5 pr-2 sm:flex">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand">
              {user?.name?.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden min-w-0 leading-tight lg:block">
              <span className="block max-w-44 truncate text-sm font-semibold text-ink">{user?.name}</span>
              {user && <span className="block text-[11px] text-ink-muted">{ROLE_LABELS[user.role]}</span>}
            </span>
          </div>
          <a href="https://t.me/agent_pasarin_bot" target="_blank" rel="noopener noreferrer"
            aria-label="Buka Telegram"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-brand-soft hover:text-brand">
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
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-brand-soft hover:text-brand disabled:opacity-60">
            <LogOut size={17} aria-hidden />
          </button>
        </div>
      </div>
      {error && <p role="alert" className="market-shell pb-2 text-right text-sm font-medium text-danger">{error}</p>}
    </header>
  );
}
