// Modul Komponen Dialog Modal Aksesibel (MarketDialog).
// Membuka elemen modal native HTML5 <dialog> dengan perangkap fokus (focus trap)
// serta mengembalikan fokus keyboard ke pemicu asal saat modal ditutup.

"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

// Komponen dialog modal dengan penanganan fokus keyboard dan penutupan klik di luar latar (backdrop).
export function MarketDialog({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Modal dibuka saat dipasang; elemen yang fokus sebelumnya dicatat agar fokus kembali ke sana ketika dilepas.
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby={titleId} className="market-dialog"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <h2 id={titleId} className="mb-3 font-serif text-2xl leading-tight tracking-tight">{title}</h2>
      {children}
    </dialog>
  );
}
