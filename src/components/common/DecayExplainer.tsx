"use client";

// Tombol "Kenapa skornya segini?" di kartu lot: menampilkan langkah rumus dan penjelasan dari AI atau template.

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import type { DecayExplanation } from "@/lib/decayExplainer";

// Bentuk respons API; data hanya ada saat berhasil.
type Response = { success: boolean; data?: DecayExplanation; error?: string };

// Penjelasan skor susut satu lot. Data diminta ke server hanya saat pertama dibuka.
export function DecayExplainer({ stockId }: { stockId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DecayExplanation | null>(null);

  // Membuka atau menutup panel; permintaan dikirim hanya bila belum ada hasil.
  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || result || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/market/explain-decay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockId }),
      });
      const payload: Response = await response.json();
      if (!response.ok || !payload.data) throw new Error(payload.error || "Penjelasan belum tersedia.");
      setResult(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Koneksi terputus. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 border-t border-line pt-2">
      <button type="button" onClick={() => void toggle()} aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-brand underline-offset-2 hover:underline">
        <Sparkles size={14} aria-hidden /> Kenapa skornya segini?
        <ChevronDown size={14} aria-hidden className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <div className="mt-1 grid gap-3 text-[13px] leading-5" aria-busy={loading}>
          {loading && <p role="status" className="text-ink-muted">Menyusun penjelasan…</p>}
          {error && (
            <p role="alert" className="text-danger">
              {error} <button type="button" className="font-semibold underline" onClick={() => { setOpen(false); setError(""); }}>Tutup</button>
            </p>
          )}
          {result && (
            <>
              {/* Kalimat penjelasan; labelnya menyebut sumber agar pengguna tahu mana yang dari AI. */}
              <div>
                <p className="text-xs font-semibold text-brand">{result.source === "gemini" ? "Penjelasan AI" : "Penjelasan dari rumus"}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-ink">{result.explanation}</p>
              </div>
              {/* Langkah perhitungan selalu dari rumus, apa pun sumber kalimatnya. */}
              <div>
                <p className="text-xs font-semibold text-ink-muted">Langkah perhitungan</p>
                <ol className="mt-1 grid gap-2">
                  {result.steps.map((step) => (
                    <li key={step.label} className="grid min-w-0 gap-0.5 border-b border-line pb-2 last:border-b-0 last:pb-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="font-semibold text-ink">{step.label}</span>
                        <span className="tabular-nums font-semibold text-ink">{step.value}</span>
                      </div>
                      <span className="text-ink-muted">{step.note}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
