/**
 * Modul Penyedia State Simulasi Pasar Sisi Klien (Client-Side Simulation Provider) (PSR-4 / PSR-37).
 * Menyinkronkan snapshot state pasar secara periodik dengan server, menghitung peluruhan kinetika
 * secara real-time pada detik jam fisik peramban, serta mengelola aksi mutasi terisolasi per peran pengguna.
 */

"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/authContext";
import type { AppRole } from "@/data/accounts";
import type { EscrowTransaction, RescueOffer, StockConfirmation, StockItem } from "@/types/market";
import type { readMarketSnapshot } from "@/lib/serverSimulationState";
import type { ApiResponse } from "@/types/api";
export type { AppRole, EscrowTransaction, RescueOffer, StockItem };

type ServerState = Awaited<ReturnType<typeof readMarketSnapshot>>;

/**
 * Kontrak konteks status dan aksi operasional simulasi pasar sisi klien (PSR-4 / PSR-37).
 */
export interface SimulationContextType {
  role: AppRole;
  setRole: (role: AppRole) => void;
  stockHealth: ServerState["stockHealth"];
  estimatedUnsoldKg: ServerState["estimatedUnsoldKg"];
  weather: ServerState["weather"] | null;
  stockItems: StockItem[];
  addStockItem: (item: Pick<StockItem, "commodityId" | "initialKg">) => Promise<MarketActionResult>;
  createInstantSurplusOffer: (stockId: string, confirmation: StockConfirmation) => Promise<MarketActionResult>;
  busy: boolean;
  stateReady: boolean;
  syncError: string | null;
  isSyncing: boolean;
  feedback: MarketActionResult | null;
  clearFeedback: () => void;
  refreshMarket: () => void;
  offers: RescueOffer[];
  transactions: EscrowTransaction[];
  vendorWalletBalanceIdr: number;
  approveOfferByVendor: (offerId: string, confirmation: StockConfirmation) => Promise<MarketActionResult>;
  rejectOfferByVendor: (offerId: string) => Promise<MarketActionResult>;
  claimOfferByBuyer: (offerId: string, quantityKg: number, requestId: string) => Promise<MarketActionResult>;
  payQrisForOffer: (offerId: string) => Promise<MarketActionResult>;
  confirmDelivery: (offerId: string) => Promise<MarketActionResult>;
  triggerCronSweepNow: () => Promise<MarketActionResult>;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

/**
 * Hasil aksi operasional pasar sisi klien (pesan status dan objek penawaran).
 */
type MarketActionResult = { success: boolean; message: string; offer?: RescueOffer };

/**
 * Rekaman snapshot pasar tersinkronisasi per identitas pengguna.
 */
type MarketSnapshot = { userId: string; state: ServerState; syncedAt: number };

/**
 * Komponen penyedia state simulasi pasar yang menyinkronkan data antar-sesi pengguna secara berkala.
 */
export function SimulationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [workspace, setWorkspace] = useState<{ userId?: string; role: AppRole }>({ role: "vendor" });
  const role = workspace.userId === userId ? workspace.role : user?.role ?? "vendor";
  const setRole = (next: AppRole) => setWorkspace({ userId, role: next });
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [feedback, setFeedback] = useState<(MarketActionResult & { userId: string }) | null>(null);
  const [syncError, setSyncError] = useState<{ userId: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncingUserId, setSyncingUserId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const generation = useRef(0);
  const changing = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const data = userId && snapshot?.userId === userId ? snapshot.state : null;
  const stockItems = data?.stocks ?? [];
  const offers = data?.offers ?? [];
  const transactions = data?.transactions ?? [];
  const vendorWalletBalanceIdr = data?.vendorWalletIdr ?? 0;

  // Kalkulasi peluruhan dinamis berbasis detik jam aktual peramban klien
  const liveStockHealth = data?.stockHealth
    ? Object.fromEntries(
        Object.entries(data.stockHealth).map(([stockId, health]) => {
          if (!health) return [stockId, null];
          const deltaHours = Math.max(0, (now - (snapshot?.syncedAt ?? now)) / 3_600_000);
          const liveHoursElapsed = health.hoursElapsed + deltaHours;
          const liveHoursRemaining = Math.max(0, health.hoursRemaining - deltaHours);
          const isSpoiled = health.decayScore >= 0.85 || (health.hoursRemaining > 0 && liveHoursRemaining <= 0);
          return [
            stockId,
            {
              ...health,
              hoursElapsed: liveHoursElapsed,
              hoursRemaining: liveHoursRemaining,
              decayScore: isSpoiled ? Math.max(health.decayScore, 0.85) : health.decayScore,
              condition: isSpoiled ? ("tidak_layak" as const) : health.condition,
              recommendedTier: isSpoiled ? ("tier_3" as const) : health.recommendedTier,
              tierLabel: isSpoiled
                ? "Tier 3: Sentra Budidaya Maggot BSF & Kompos Organik"
                : health.tierLabel,
            },
          ];
        })
      )
    : {};

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    let inFlight = false;

    // Mengabaikan respons polling jika ada mutasi data lokal yang lebih mutakhir
    async function sync() {
      if (inFlight || changing.current || !userId) return;
      inFlight = true;
      setSyncingUserId(userId);
      const version = generation.current;
      try {
        const response = await apiFetch("/api/simulation/state", { signal: controller.signal, cache: "no-store" });
        const payload: ApiResponse<ServerState> = await response.json();
        if (controller.signal.aborted || generation.current !== version) return;
        if (response.ok && payload.data) {
          setSnapshot({ userId, state: payload.data, syncedAt: Date.now() });
          setSyncError(null);
        } else {
          setSyncError({ userId, message: payload.error ?? "Data pasar tidak dapat dimuat." });
        }
      } catch {
        if (!controller.signal.aborted && generation.current === version) {
          setSyncError({ userId, message: "Koneksi terputus. Coba muat ulang data." });
        }
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) setSyncingUserId(null);
      }
    }
    void sync();
    const timer = setInterval(sync, 15_000);
    window.addEventListener("focus", sync);
    return () => {
      controller.abort();
      setSyncingUserId(null);
      clearInterval(timer);
      window.removeEventListener("focus", sync);
    };
  }, [userId, refreshTick]);

  /**
   * Mengalirkan aksi mutasi peran ke endpoint API server dan memperbarui snapshot pasar secara atomik.
   *
   * @param body - Muatan data mutasi yang dikirimkan.
   * @param endpoint - URL endpoint target (default: "/api/simulation/state").
   * @returns Hasil aksi operasional pasar bertipe MarketActionResult.
   */
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
      const payload: ApiResponse<{ message: string; state?: ServerState; offer?: RescueOffer }> = await response.json();
      result = response.ok && payload.data
        ? { success: true, message: payload.data.message, offer: payload.data.offer }
        : { success: false, message: payload.error ?? "Tindakan tidak dapat diproses." };
      if (payload.data?.state) {
        setSnapshot({ userId, state: payload.data.state, syncedAt: Date.now() });
        setSyncError((error) => error?.userId === userId ? null : error);
      }
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
  const createInstantSurplusOffer = (stockId: string, confirmation: StockConfirmation) => mutate({ action: "publish", stockId, confirmation });
  const approveOfferByVendor = (offerId: string, confirmation: StockConfirmation) => mutate({ action: "vendor_decision", offerId, approved: true, confirmation });
  const rejectOfferByVendor = (offerId: string) => mutate({ action: "vendor_decision", offerId, approved: false });
  const claimOfferByBuyer = (offerId: string, quantityKg: number, requestId: string) => mutate({ offerId, quantityKg, requestId }, "/api/offers/claim");
  const payQrisForOffer = (offerId: string) => mutate({ action: "payment", offerId });
  const confirmDelivery = (offerId: string) => mutate({ action: "delivery", offerId });
  const triggerCronSweepNow = () => mutate({}, "/api/orchestrator/run");
  return (
    <SimulationContext.Provider
      value={{
        role,
        setRole,
        stockHealth: liveStockHealth,
        estimatedUnsoldKg: data?.estimatedUnsoldKg ?? {},
        weather: data?.weather ?? null,
        busy,
        stateReady: data !== null,
        syncError: syncError && syncError.userId === userId ? syncError.message : null,
        isSyncing: !!userId && syncingUserId === userId,
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
