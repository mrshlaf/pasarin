/**
 * Modul Komponen Dialog Modal Aksesibel (MarketDialog).
 * Membuka elemen modal native HTML5 <dialog> dengan perangkap fokus (focus trap)
 * serta mengembalikan fokus keyboard ke pemicu asal saat modal ditutup.
 */

"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Komponen dialog modal dengan penanganan fokus keyboard dan penutupan klik di luar latar (backdrop).
 *
 * @param title - Judul modal yang terhubung ke aria-labelledby.
 * @param onClose - Callback fungsi saat modal ditutup.
 * @param children - Konten elemen anak di dalam modal.
 */
export function MarketDialog({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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
      <h2 id={titleId} className="mb-3 text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </dialog>
  );
}
