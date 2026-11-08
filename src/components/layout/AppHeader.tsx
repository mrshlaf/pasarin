"use client";

import { useState } from "react";
import { LogOut, Send } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { PasarinLogo } from "@/components/common/PasarinLogo";

/** Displays shared brand, account and session actions on every dashboard. */
export function AppHeader() {
  const { user, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);

  return (
    <header className="border-b border-[#d5ded2] bg-[#fffef8]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-7">
        <PasarinLogo size="sm" showSubtitle={false} />
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <span className="hidden max-w-56 truncate text-sm font-semibold text-[#36594f] md:block">{user?.name}</span>
          <a href="https://t.me/agent_pasarin_bot" target="_blank" rel="noopener noreferrer"
            aria-label="Buka Telegram"
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#214d43] hover:bg-[#e8efe5]">
            <Send size={16} aria-hidden /> <span className="hidden min-[375px]:inline">Telegram</span>
          </a>
          <button type="button" disabled={leaving}
            onClick={async () => { setLeaving(true); try { await signOut(); } finally { setLeaving(false); } }}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-[#788e81] px-3 text-sm font-semibold text-[#214d43] hover:bg-[#e8efe5] disabled:opacity-60">
            <LogOut size={16} aria-hidden /> {leaving ? "Keluar…" : "Keluar"}
          </button>
        </div>
      </div>
    </header>
  );
}
