"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/authContext";
import type { AppRole } from "@/data/accounts";
import type { EscrowTransaction, RescueOffer, StockItem } from "@/types/market";
import type { readMarketSnapshot } from "@/lib/serverSimulationState";
import type { ApiResponse } from "@/types/api";
export type { AppRole, EscrowTransaction, RescueOffer, StockItem };

type ServerState = Awaited<ReturnType<typeof readMarketSnapshot>>;

export interface SimulationContextType {
  role: AppRole;
  setRole: (role: AppRole) => void;
  stockHealth: ServerState["stockHealth"];
  weather: ServerState["weather"] | null;
  stockItems: StockItem[];
  addStockItem: (item: Pick<StockItem, "commodityId" | "initialKg">) => Promise<MarketActionResult>;
  createInstantSurplusOffer: (stockId: string) => Promise<MarketActionResult>;
  busy: boolean;
  stateReady: boolean;
  feedback: MarketActionResult | null;
  clearFeedback: () => void;
  refreshMarket: () => void;
  offers: RescueOffer[];
  transactions: EscrowTransaction[];
  vendorWalletBalanceIdr: number;
  approveOfferByVendor: (offerId: string) => Promise<MarketActionResult>;
  rejectOfferByVendor: (offerId: string) => Promise<MarketActionResult>;
  claimOfferByBuyer: (offerId: string, donated?: boolean) => Promise<MarketActionResult>;
  payQrisForOffer: (offerId: string) => Promise<MarketActionResult>;
  confirmDelivery: (offerId: string) => Promise<MarketActionResult>;
  triggerCronSweepNow: () => Promise<MarketActionResult>;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

type MarketActionResult = { success: boolean; message: string };
type MarketSnapshot = { userId: string; state: ServerState };

/** Keeps a role-scoped market snapshot synchronized across sessions and channels. */
export function SimulationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [workspace, setWorkspace] = useState<{ userId?: string; role: AppRole }>({ role: "vendor" });
  const role = workspace.userId === userId ? workspace.role : user?.role ?? "vendor";
  const setRole = (next: AppRole) => setWorkspace({ userId, role: next });
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [feedback, setFeedback] = useState<(MarketActionResult & { userId: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const generation = useRef(0);
  const changing = useRef(false);

  const data = userId && snapshot?.userId === userId ? snapshot.state : null;
  const stockItems = data?.stocks ?? [];
  const offers = data?.offers ?? [];
  const transactions = data?.transactions ?? [];
  const vendorWalletBalanceIdr = data?.vendorWalletIdr ?? 0;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();

    // Discard poll results that started before a newer mutation.
    async function sync() {
      if (changing.current || !userId) return;
      const version = generation.current;
      try {
        const response = await apiFetch("/api/simulation/state", { signal: controller.signal, cache: "no-store" });
        const payload: ApiResponse<ServerState> = await response.json();
        if (controller.signal.aborted || generation.current !== version) return;
        if (response.ok && payload.data) {
          setSnapshot({ userId, state: payload.data });
        } else {
          setFeedback({ userId, success: false, message: payload.error ?? "Data pasar tidak dapat dimuat." });
        }
      } catch {
        if (!controller.signal.aborted && generation.current === version) {
          setFeedback({ userId, success: false, message: "Koneksi terputus. Coba muat ulang data." });
        }
      }
    }
    void sync();
    const timer = setInterval(sync, 15_000);
    window.addEventListener("focus", sync);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", sync);
    };
  }, [userId, refreshTick]);

  // All role actions go through the server and refresh the shared snapshot.
  async function mutate(body: Record<string, unknown>, endpoint = "/api/simulation/state"): Promise<MarketActionResult> {
    if (!userId || changing.current) return { success: false, message: "Tunggu tindakan sebelumnya selesai." };
    changing.current = true;
    generation.current++;
    setBusy(true);
    let result: MarketActionResult;
    try {
      const response = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload: ApiResponse<{ message: string; state?: ServerState }> = await response.json();
      result = response.ok && payload.data
        ? { success: true, message: payload.data.message }
        : { success: false, message: payload.error ?? "Tindakan tidak dapat diproses." };
      if (payload.data?.state) setSnapshot({ userId, state: payload.data.state });
    } catch {
      result = { success: false, message: "Koneksi terputus. Periksa data sebelum mencoba lagi." };
    } finally {
      changing.current = false;
      setBusy(false);
      setRefreshTick((tick) => tick + 1);
    }
    setFeedback({ ...result, userId });
    return result;
  }

  const addStockItem = (item: Pick<StockItem, "commodityId" | "initialKg">) =>
    mutate({ action: "stock", commodityId: item.commodityId, quantityKg: item.initialKg });
  const createInstantSurplusOffer = (stockId: string) => mutate({ action: "publish", stockId });
  const approveOfferByVendor = (offerId: string) => mutate({ action: "vendor_decision", offerId, approved: true });
  const rejectOfferByVendor = (offerId: string) => mutate({ action: "vendor_decision", offerId, approved: false });
  const claimOfferByBuyer = (offerId: string, donated = false) => mutate({ offerId, donated }, "/api/offers/claim");
  const payQrisForOffer = (offerId: string) => mutate({ action: "payment", offerId });
  const confirmDelivery = (offerId: string) => mutate({ action: "delivery", offerId });
  const triggerCronSweepNow = () => mutate({}, "/api/orchestrator/run");
  return (
    <SimulationContext.Provider
      value={{
        role,
        setRole,
        stockHealth: data?.stockHealth ?? {},
        weather: data?.weather ?? null,
        busy,
        stateReady: data !== null,
        feedback: feedback?.userId === userId ? feedback : null,
        clearFeedback: () => setFeedback(null),
        refreshMarket: () => setRefreshTick((tick) => tick + 1),
        stockItems,
        addStockItem,
        createInstantSurplusOffer,
        offers,
        transactions,
        vendorWalletBalanceIdr,
        approveOfferByVendor,
        rejectOfferByVendor,
        claimOfferByBuyer,
        payQrisForOffer,
        confirmDelivery,
        triggerCronSweepNow,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

/**
 * Kaitan React kustom (custom hook) untuk mengakses konteks simulasi pasar.
 *
 * @throws Error jika hook dipanggil di luar cakupan komponen SimulationProvider.
 * @returns Objek konteks simulasi pasar bertipe SimulationContextType.
 */
export function useMarketSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error("useMarketSimulation must be used within a SimulationProvider");
  }
  return context;
}
