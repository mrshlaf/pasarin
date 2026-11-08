"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/authContext";
import { apiFetch } from "@/lib/apiFetch";
import { useMarketSimulation } from "@/lib/simulationStore";
import { kioskLabel, marketButton, marketSecondary, MarketMetrics, MarketRow, MarketSection, offerTitle, orderStatus, rupiah } from "@/components/common/MarketWorkspace";

/** Gives supervisors the same live inventory and ledger with role-appropriate actions. */
export function OversightDashboard() {
  const { user } = useAuth();
  const { offers, stockItems, stockHealth, transactions, busy, triggerCronSweepNow } = useMarketSimulation();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<{ summary: string; source: string } | null>(null);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState(false);

  /** Uses the shared read-only orchestration endpoint and reports the answer source. */
  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAsking(true);
    setError("");
    try {
      const response = await apiFetch("/api/orchestrator/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAnswer(result.data);
    } catch {
      setError("Ringkasan pasar belum bisa dimuat. Coba lagi.");
    } finally {
      setAsking(false);
    }
  }

  const ready = offers.filter((offer) => offer.status === "claimed" && offer.paymentStatus === "held_in_escrow");
  const risk = stockItems.filter((item) => item.remainingKg > 0 && (stockHealth[item.id]?.decayScore ?? 0) >= 0.35);
  return (
    <div className="grid gap-4">
      <MarketMetrics items={[
        ["Kios dengan pasokan", new Set(stockItems.map((item) => item.vendorId)).size],
        ["Lot perlu ditinjau", risk.length], ["Siap diantar", ready.length],
        ["Pesanan selesai", offers.filter((offer) => offer.status === "settled").length],
      ]} />
      <MarketSection title="Orkestrasi pasar" description="Tanyakan pasokan, pesanan, atau pekerjaan yang perlu ditangani hari ini.">
        <form onSubmit={ask} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="grid gap-1 text-sm font-semibold">Pertanyaan
            <input className="market-input min-w-0" value={query} required maxLength={1000} onChange={(event) => setQuery(event.target.value)} placeholder="Berapa pesanan siap diantar hari ini?" />
          </label>
          <button className={marketButton} type="submit" disabled={asking}>{asking ? "Memproses…" : "Tanyakan"}</button>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-[#8e2d23]">{error}</p>}
        {answer && <div role="status" className="mt-4 rounded-lg bg-[#e8efe5] p-3">
          <p className="text-xs font-semibold text-[#214d43]">{answer.source === "gemini" ? "Gemini · Data pasar" : "Ringkasan data pasar"}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{answer.summary}</p>
        </div>}
        {user?.role === "admin" && <button className={marketSecondary + " mt-4"} type="button" disabled={busy} onClick={triggerCronSweepNow}>Evaluasi stok sekarang</button>}
      </MarketSection>
      <MarketSection title="Penawaran dan pesanan">
        {offers.length === 0 ? <p className="text-sm text-[#465c54]">Belum ada penawaran tercatat.</p> :
          <ul>{offers.map((offer) => <MarketRow key={offer.id} title={offerTitle(offer)} detail={kioskLabel(offer.vendorId)} status={orderStatus(offer)} />)}</ul>}
      </MarketSection>
      <MarketSection title="Buku pembayaran simulasi">
        {transactions.length === 0 ? <p className="text-sm text-[#465c54]">Belum ada pembayaran tercatat.</p> :
          <ul>{transactions.map((item) => <MarketRow key={item.id} title={item.commodityName + " · " + rupiah(item.amountIdr)}
            detail={item.buyerName + " · " + item.vendorName} status={item.status === "released" ? "Selesai" : item.status === "refunded" ? "Dikembalikan" : "Ditahan"} />)}</ul>}
      </MarketSection>
    </div>
  );
}
