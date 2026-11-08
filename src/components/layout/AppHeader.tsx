"use client";

import { useState } from "react";
import { LogOut, Send } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { PasarinLogo } from "@/components/common/PasarinLogo";

/** Displays brand and session actions on every dashboard. */
export function AppHeader() {
  const { user, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-2.5 sm:px-7">
        <PasarinLogo size="sm" showSubtitle={false} />

        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <div className="flex min-w-0 items-center gap-2 pr-1">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
              {user?.name?.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden max-w-44 truncate text-sm font-semibold text-ink-soft lg:block">{user?.name}</span>
          </div>
          <a href="https://t.me/agent_pasarin_bot" target="_blank" rel="noopener noreferrer"
            aria-label="Buka Telegram"
            className="inline-flex size-11 items-center justify-center rounded-lg text-brand transition-colors hover:bg-brand-soft">
            <Send size={17} aria-hidden />
          </a>
          <button type="button" disabled={leaving}
            onClick={async () => { setLeaving(true); try { await signOut(); } finally { setLeaving(false); } }}
            aria-label="Keluar dari akun"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-line-strong text-brand transition-colors hover:bg-brand-soft disabled:opacity-60">
            <LogOut size={17} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
