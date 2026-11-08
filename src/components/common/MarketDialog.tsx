"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/** Opens an accessible native dialog and restores focus when dismissed. */
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
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <h2 id={titleId} className="mb-3 text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </dialog>
  );
}
