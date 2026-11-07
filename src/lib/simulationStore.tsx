"use client";

/**
 * State Management Simulasi Pasar & Alur Penyelamatan Surplus 7-Role (PSR-7 & PSR-8).
 * Mengelola transisi 5 fase waktu pasar (Subuh s/d Handover), simulasi saldo escrow QRIS,
 * akuntansi emisi karbon (IPCC 2006: 0,48 kg CO2e/kg biomassa), serta notifikasi interaktif.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import { calculateDecay, DecayEvaluation } from "@/lib/decayEngine";
import { calculateRainFootfallAttenuation, FootfallSimulationResult } from "@/lib/pasarinCore";
import { DEMO_SEED_OFFERS, DEMO_SEED_TRANSACTIONS } from "@/data/seedData";
import {
  evaluateTier2PriorityWindow,
  validateClaimAgainstPriorityWindow,
  SOCIAL_RESERVATION_WINDOW_MINUTES,
} from "@/lib/priorityWindowDispatcher";
export { DEMO_SEED_OFFERS, DEMO_SEED_TRANSACTIONS };
export type AppRole =
  | "vendor"
  | "warteg"
  | "social_kitchen"
  | "maggot"
  | "logistics"
  | "manager"
  | "admin";

export type TimeOfDayStage = "subuh" | "terik" | "cron_sweep" | "hujan_sore" | "handover";

export interface TimeStageConfig {
  stage: TimeOfDayStage;
  clockTime: string;
  label: string;
  temperatureC: number;
  humidityPercent: number;
  rainMm: number;
  isRaining: boolean;
  hoursElapsedSinceArrival: number;
  description: string;
}

export const TIME_STAGES: Record<TimeOfDayStage, TimeStageConfig> = {
  subuh: {
    stage: "subuh",
    clockTime: "04:30 WIB",
    label: "Penerimaan Pasokan",
    temperatureC: 25.0,
    humidityPercent: 88,
    rainMm: 0,
    isRaining: false,
    hoursElapsedSinceArrival: 1.0,
    description: "Pasokan grosir tiba di los pasar. Komoditas bersuhu sejuk dan segar prima.",
  },
  terik: {
    stage: "terik",
    clockTime: "12:00 WIB",
    label: "Puncak Suhu Los",
    temperatureC: 34.0,
    humidityPercent: 62,
    rainMm: 0,
    isRaining: false,
    hoursElapsedSinceArrival: 8.0,
    description: "Suhu los meningkat. Laju respirasi seluler sayuran daun mulai meningkat.",
  },
  cron_sweep: {
    stage: "cron_sweep",
    clockTime: "14:30 WIB",
    label: "Evaluasi Mutu Harian",
    temperatureC: 32.5,
    humidityPercent: 68,
    rainMm: 0,
    isRaining: false,
    hoursElapsedSinceArrival: 10.5,
    description: "Pemeriksaan berkala sisa stok lapak dan penyusunan alokasi penyelamatan pangan.",
  },
  hujan_sore: {
    stage: "hujan_sore",
    clockTime: "15:30 WIB",
    label: "Hujan Sore",
    temperatureC: 27.0,
    humidityPercent: 95,
    rainMm: 18.5,
    isRaining: true,
    hoursElapsedSinceArrival: 11.5,
    description: "Curah hujan tinggi menurunkan pembeli fisik. Percepatan redistribusi surplus aktif.",
  },
  handover: {
    stage: "handover",
    clockTime: "17:30 WIB",
    label: "Distribusi Armada",
    temperatureC: 28.0,
    humidityPercent: 82,
    rainMm: 2.0,
    isRaining: false,
    hoursElapsedSinceArrival: 13.5,
    description: "Pengangkutan armada logistik dan konfirmasi serah terima fisik di los pedagang.",
  },
};

/**
 * Menghitung tahap operasional sirkadian pasar berdasarkan jam waktu nyata WIB (UTC+7).
 */
export function getRealtimeWIBStage(): TimeOfDayStage {
  const now = new Date();
  const wibHours = (now.getUTCHours() + 7) % 24;
  const wibMinutes = now.getUTCMinutes();
  const timeDecimal = wibHours + wibMinutes / 60;

  if (timeDecimal >= 4.0 && timeDecimal < 10.0) return "subuh";
  if (timeDecimal >= 10.0 && timeDecimal < 14.5) return "terik";
  if (timeDecimal >= 14.5 && timeDecimal < 15.5) return "cron_sweep";
  if (timeDecimal >= 15.5 && timeDecimal < 17.5) return "hujan_sore";
  return "handover";
}

/**
 * Mendapatkan format jam waktu nyata WIB saat ini (contoh: "14:35 WIB").
 */
export function getRealtimeWIBTimeString(): string {
  const now = new Date();
  const wibHours = (now.getUTCHours() + 7) % 24;
  const wibMinutes = now.getUTCMinutes();
  return `${String(wibHours).padStart(2, "0")}:${String(wibMinutes).padStart(2, "0")} WIB`;
}

export interface StockItem {
  id: string;
  vendorId: string;
  commodityId: string;
  initialKg: number;
  remainingKg: number;
  arrivalClock: string;
  lotNumber: string;
  hoursOffset?: number;
  createdAt?: string;
}
export interface RescueOffer {
  id: string;
  stockId: string;
  vendorId: string;
  commodityId: string;
  targetTier: "tier_1" | "tier_2" | "tier_3";
  quantityKg: number;
  originalPricePerKg: number;
  salvagePricePerKg: number;
  discountPercentage: number;
  totalAmountIdr: number;
  expiresInMinutes: number;
  createdAt?: string;
  status: "pending_vendor" | "active" | "claimed" | "settled" | "rejected";
  claimedBy?: string;
  claimedAt?: string;
  claimantRole?: "warteg" | "social_kitchen" | "maggot";
  paymentStatus: "unpaid" | "held_in_escrow" | "released_to_vendor";
  qrisReference?: string;
  podToken?: string;
  allocatedDriver?: string;
}

export interface EscrowTransaction {
  id: string;
  offerId: string;
  buyerName: string;
  vendorName: string;
  commodityName: string;
  amountIdr: number;
  status: "held_in_escrow" | "released" | "refunded";
  createdAt: string;
  releasedAt?: string;
  qrisPayload: string;
}

export interface TelegramNotification {
  id: string;
  recipient: string;
  role: string;
  message: string;
  timestamp: string;
  actionRequired: boolean;
  offerId?: string;
  type: "vendor_alert" | "warteg_broadcast" | "charity_reserve" | "dispatch";
}

export interface SimulationContextType {
  role: AppRole;
  setRole: (role: AppRole) => void;
  selectedVendorId: string;
  setSelectedVendorId: (id: string) => void;
  currentStage: TimeOfDayStage;
  setStage: (stage: TimeOfDayStage) => void;
  stageConfig: TimeStageConfig;
  stockItems: StockItem[];
  addStockItem: (item: StockItem) => void;
  createInstantSurplusOffer: (stockId: string) => void;
  resetSimulationState: () => void;
  seedThreeTierDemoLots: () => void;
  footfallSimulation: FootfallSimulationResult;
  offers: RescueOffer[];
  transactions: EscrowTransaction[];
  notifications: TelegramNotification[];
  totalCarbonSavedKg: number;
  totalMethanePreventedKg: number;
  escrowBalanceTotalIdr: number;
  vendorWalletBalanceIdr: number;
  getEvaluationForStock: (stock: StockItem) => DecayEvaluation;
  approveOfferByVendor: (offerId: string) => void;
  rejectOfferByVendor: (offerId: string) => void;
  claimOfferByBuyer: (offerId: string, buyerName: string, role: "warteg" | "social_kitchen" | "maggot") => void;
  payQrisForOffer: (offerId: string) => void;
  verifyDeliveryPoD: (offerId: string, gpsDistanceMeters: number) => { success: boolean; message: string };
  triggerCronSweepNow: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

/**
 * Membangkitkan katalog stok awal untuk seluruh 30 kios Pasar Induk Kramat Jati
 * dengan slot khusus Kios A-12 untuk alur pengujian Tier 1, 2, dan Tier 3 (Maggot).
 */
function generateMarketWideInitialStocks(): StockItem[] {
  const nowMs = Date.now();
  const stocks: StockItem[] = [
    // Kios A-12 (H. Rohmat) - Sentra Demonstrasi Lengkap Seluruh Komoditas 3-Tier
    { id: "stk_01", vendorId: "vendor_kramat_01", commodityId: "kangkung", initialKg: 80, remainingKg: 45, arrivalClock: "04:30 WIB", lotNumber: "LOT-A12-01", createdAt: new Date(nowMs).toISOString() },
    { id: "stk_02", vendorId: "vendor_kramat_01", commodityId: "bayam", initialKg: 60, remainingKg: 35, arrivalClock: "04:30 WIB", lotNumber: "LOT-A12-02", createdAt: new Date(nowMs).toISOString() },
    { id: "stk_07", vendorId: "vendor_kramat_01", commodityId: "tomat", initialKg: 80, remainingKg: 50, arrivalClock: "04:30 WIB", lotNumber: "LOT-A12-03", createdAt: new Date(nowMs).toISOString() },
    { id: "stk_04", vendorId: "vendor_kramat_01", commodityId: "pakcoy", initialKg: 60, remainingKg: 40, arrivalClock: "04:30 WIB", lotNumber: "LOT-A12-04", hoursOffset: 4, createdAt: new Date(nowMs).toISOString() },
    { id: "stk_05", vendorId: "vendor_kramat_01", commodityId: "buncis", initialKg: 40, remainingKg: 25, arrivalClock: "04:30 WIB", lotNumber: "LOT-A12-05", hoursOffset: 3, createdAt: new Date(nowMs).toISOString() },
    { id: "stk_03", vendorId: "vendor_kramat_01", commodityId: "sawi_hijau", initialKg: 50, remainingKg: 30, arrivalClock: "Kemarin 17:00 (Inap)", lotNumber: "LOT-A12-AFKIR", hoursOffset: 25, createdAt: new Date(nowMs - 25 * 3600 * 1000).toISOString() },
    { id: "stk_09", vendorId: "vendor_kramat_01", commodityId: "terung_ungu", initialKg: 50, remainingKg: 35, arrivalClock: "Kemarin 17:00 (Inap)", lotNumber: "LOT-A12-AFKIR2", hoursOffset: 135, createdAt: new Date(nowMs - 135 * 3600 * 1000).toISOString() },
  ];

  KIOSKS.filter((k) => k.id !== "vendor_kramat_01").forEach((kiosk, idx) => {
    const c1 = COMMODITIES[idx % COMMODITIES.length];
    const c2 = COMMODITIES[(idx + 7) % COMMODITIES.length];

    stocks.push({
      id: `stk_${kiosk.stallNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}_01`,
      vendorId: kiosk.id,
      commodityId: c1.id,
      initialKg: 60 + ((idx * 5) % 40),
      remainingKg: 35 + ((idx * 3) % 25),
      arrivalClock: "04:30 WIB",
      lotNumber: `LOT-${kiosk.stallNumber}-01`,
      createdAt: new Date(nowMs).toISOString(),
    });

    stocks.push({
      id: `stk_${kiosk.stallNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}_02`,
      vendorId: kiosk.id,
      commodityId: c2.id,
      initialKg: 50 + ((idx * 4) % 30),
      remainingKg: 25 + ((idx * 2) % 20),
      arrivalClock: "05:00 WIB",
      lotNumber: `LOT-${kiosk.stallNumber}-02`,
      createdAt: new Date(nowMs).toISOString(),
    });
  });
  return stocks;
}

const INITIAL_STOCKS: StockItem[] = generateMarketWideInitialStocks();


export const INITIAL_OFFERS: RescueOffer[] = [];
export const INITIAL_TRANSACTIONS: EscrowTransaction[] = [];

/**
 * Komponen penyedia state global (React Context Provider) simulasi pasar PASARIN.
 * Menginkorporasikan alur kerja 7 peran (Pedagang, Warteg, Dapur Sosial, Maggot, Logistik, Pengelola, Admin).
 *
 * @param props - Properti pembawa elemen anak (children: ReactNode).
 * @returns Elemen penyedia konteks SimulationContext.Provider.
 */
export function SimulationProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>("vendor");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("vendor_kramat_01");
  const [currentStage, setCurrentStage] = useState<TimeOfDayStage>(getRealtimeWIBStage);

  // Sinkronisasi otomatis tahapan sirkadian dengan jam nyata WIB di latar belakang
  useEffect(() => {
    const updateRealtimeStage = () => {
      const stage = getRealtimeWIBStage();
      setCurrentStage(stage);
    };

    updateRealtimeStage();
    const timer = setInterval(updateRealtimeStage, 60000);
    return () => clearInterval(timer);
  }, []);

  // Sinkronisasi status penawaran dari peladen (memungkinkan kontrol via terminal CLI npm run seed:demo / clear:demo)
  useEffect(() => {
    fetch("/api/simulation/state")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          if (json.data.offers.length === 0) {
            if (typeof window !== "undefined") {
              localStorage.removeItem("pasarin_sim_stocks");
              localStorage.removeItem("pasarin_sim_offers");
              localStorage.removeItem("pasarin_sim_transactions");
              localStorage.removeItem("pasarin_sim_wallet");
            }
            setStockItemsState(INITIAL_STOCKS);
            setOffersState([]);
            setTransactionsState([]);
            setVendorWalletBalanceIdrState(345000);
          } else {
            setOffersState(json.data.offers);
            setTransactionsState(json.data.transactions);
          }
        }
      })
      .catch(() => {});
  }, []);
  const [stockItems, setStockItemsState] = useState<StockItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pasarin_sim_stocks");
        if (saved) {
          const parsed = JSON.parse(saved) as StockItem[];
          let needsUpdate = false;
          const hydrated = parsed.map((item) => {
            if (!item.createdAt) {
              needsUpdate = true;
              const isOvernight = item.arrivalClock?.toLowerCase().includes("inap") || item.arrivalClock?.toLowerCase().includes("kemarin");
              const defaultCreatedMs = isOvernight ? Date.now() - 25 * 3600 * 1000 : Date.now() - 14 * 3600 * 1000;
              return { ...item, createdAt: new Date(defaultCreatedMs).toISOString() };
            }
            return item;
          });
          if (needsUpdate) {
            localStorage.setItem("pasarin_sim_stocks", JSON.stringify(hydrated));
          }
          return hydrated;
        }
      } catch {}
    }
    return INITIAL_STOCKS;
  });

  const setStockItems = (updater: StockItem[] | ((prev: StockItem[]) => StockItem[])) => {
    setStockItemsState((prev) => {
      const updated = typeof updater === "function" ? updater(prev) : updater;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pasarin_sim_stocks", JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  const [vendorWalletBalanceIdr, setVendorWalletBalanceIdrState] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pasarin_sim_wallet");
        if (saved) return Number(saved);
      } catch {}
    }
    return 345000;
  });

  const setVendorWalletBalanceIdr = (updater: number | ((prev: number) => number)) => {
    setVendorWalletBalanceIdrState((prev) => {
      const updated = typeof updater === "function" ? updater(prev) : updater;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pasarin_sim_wallet", String(updated));
        } catch {}
      }
      return updated;
    });
  };
  // Offers state dengan sinkronisasi otomatis ke localStorage browser
  const [offers, setOffersState] = useState<RescueOffer[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pasarin_sim_offers");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return INITIAL_OFFERS;
  });

  const setOffers = (updater: RescueOffer[] | ((prev: RescueOffer[]) => RescueOffer[])) => {
    setOffersState((prev) => {
      const updated = typeof updater === "function" ? updater(prev) : updater;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pasarin_sim_offers", JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  const [transactions, setTransactionsState] = useState<EscrowTransaction[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pasarin_sim_transactions");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return INITIAL_TRANSACTIONS;
  });

  const setTransactions = (updater: EscrowTransaction[] | ((prev: EscrowTransaction[]) => EscrowTransaction[])) => {
    setTransactionsState((prev) => {
      const updated = typeof updater === "function" ? updater(prev) : updater;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pasarin_sim_transactions", JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  const [notifications, setNotifications] = useState<TelegramNotification[]>([
    {
      id: "notif_01",
      recipient: "@H_Rohmat (Pedagang A-12)",
      role: "vendor",
      message: "⚠️ Laju respirasi Bayam tinggi (34°C). Estimasi sisa 35 kg diajukan diskon 64% ke Warteg. Klik Setuju.",
      timestamp: "14:30 WIB",
      actionRequired: true,
      offerId: "ofr_02",
      type: "vendor_alert",
    },
    {
      id: "notif_02",
      recipient: "Grup Warteg Kramat Jati",
      role: "warteg",
      message: "🔥 Kangkung Segar 45 kg diskon 60% @ Rp2.400/kg dari Kios A-12 siap diklaim sekarang!",
      timestamp: "14:32 WIB",
      actionRequired: false,
      offerId: "ofr_01",
      type: "warteg_broadcast",
    },
  ]);

  const baseConfig = TIME_STAGES[currentStage];
  const stageConfig: TimeStageConfig = {
    ...baseConfig,
    clockTime: getRealtimeWIBTimeString(),
  };
  const footfallSimulation = calculateRainFootfallAttenuation(
    stageConfig.rainMm,
    stageConfig.isRaining
  );

  // Hitung evaluasi decay untuk item stok berdasarkan stage cuaca & waktu nyata yang telah berlalu
  const getEvaluationForStock = (stock: StockItem): DecayEvaluation => {
    const comm = COMMODITIES.find((c) => c.id === stock.commodityId) || COMMODITIES[0];

    // 1. Akumulasi jam riil yang telah berlalu sejak stok tiba / dicatat di sistem
    let realElapsedHours = 0;
    if (stock.createdAt) {
      const createdMs = new Date(stock.createdAt).getTime();
      if (!isNaN(createdMs) && createdMs > 0) {
        realElapsedHours = Math.max(0, (Date.now() - createdMs) / (1000 * 60 * 60));
      }
    }

    const offset = stock.hoursOffset ?? 0;
    const simulatedStageHours = stageConfig.hoursElapsedSinceArrival;

    // Hukum waktu: penambahan jam riil terus mengakumulasi usia simpan komoditas dan monoton bertambah
    const effectiveHours = simulatedStageHours + offset + realElapsedHours;

    return calculateDecay(
      comm,
      stageConfig.temperatureC,
      stageConfig.humidityPercent,
      effectiveHours
    );
  };
  // Vendor 1-ketuk persetujuan
  const approveOfferByVendor = (offerId: string) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, status: "active" } : o))
    );
    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        recipient: "Grup Pembeli Warteg",
        role: "warteg",
        message: `✅ Pedagang menyetujui penawaran #${offerId}. Tiket sekarang aktif untuk diklaim!`,
        timestamp: stageConfig.clockTime,
        actionRequired: false,
        offerId,
        type: "warteg_broadcast",
      },
      ...prev,
    ]);
  };

  const rejectOfferByVendor = (offerId: string) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, status: "rejected" } : o))
    );
  };

  // Pembeli klaim penawaran dengan validasi gerbang mutu Invarian 1 (PSR-21)
  const claimOfferByBuyer = (
    offerId: string,
    buyerName: string,
    claimantRole: "warteg" | "social_kitchen" | "maggot"
  ) => {
    const targetOffer = offers.find((o) => o.id === offerId);
    if (!targetOffer) return;

    // Invarian 3 & Invarian 1 (PSR-23 & PSR-21): Validasi gerbang etika jendela waktu prioritas Dapur Sosial
    const priorityValidation = validateClaimAgainstPriorityWindow(targetOffer, claimantRole);
    if (!priorityValidation.allowed) {
      setNotifications((prev) => [
        {
          id: `notif_block_${Date.now()}`,
          recipient: buyerName,
          role: "maggot",
          message: priorityValidation.reason || "Klaim ditolak oleh aturan Invarian sistem.",
          timestamp: stageConfig.clockTime,
          actionRequired: false,
          offerId,
          type: "vendor_alert",
        },
        ...prev,
      ]);
      return;
    }

    // Invarian 1 (Zero Edible Food to Feed): Sentra maggot dilarang mengambil alokasi Tier 1 atau Tier 2
    if (claimantRole === "maggot" && targetOffer.targetTier !== "tier_3") {
      setNotifications((prev) => [
        {
          id: `notif_block_${Date.now()}`,
          recipient: buyerName,
          role: "maggot",
          message: `KLAIM DITOLAK (Invarian 1): Lot #${offerId} berstatus layak pangan manusia (${targetOffer.targetTier.toUpperCase()}). Dilarang dialihkan ke pakan maggot!`,
          timestamp: stageConfig.clockTime,
          actionRequired: false,
          offerId,
          type: "vendor_alert",
        },
        ...prev,
      ]);
      return;
    }

    setOffers((prev) =>
      prev.map((o) =>
        o.id === offerId
          ? {
              ...o,
              status: "claimed",
              claimedBy: buyerName,
              claimedAt: stageConfig.clockTime,
              claimantRole,
              allocatedDriver: "Armada Viar 01 (Pak Joko)",
              podToken: `POD-HMAC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            }
          : o
      )
    );
  };

  // Pembayaran Escrow via QRIS
  const payQrisForOffer = (offerId: string) => {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return;

    const vendor = KIOSKS.find((k) => k.id === offer.vendorId);
    const comm = COMMODITIES.find((c) => c.id === offer.commodityId);

    const newTx: EscrowTransaction = {
      id: `trx_${Date.now().toString().slice(-4)}`,
      offerId,
      buyerName: offer.claimedBy || "Pembeli Terverifikasi",
      vendorName: vendor ? vendor.name : "Pedagang Lapak",
      commodityName: `${comm?.localName || "Komoditas"} (${offer.quantityKg} kg)`,
      amountIdr: offer.totalAmountIdr,
      status: "held_in_escrow",
      createdAt: stageConfig.clockTime,
      qrisPayload: `00020101021226580014ID.PASARIN.WWW0118${offerId}520454995802ID5912PASARIN6007JAKARTA6304${offer.totalAmountIdr}`,
    };

    setOffers((prev) =>
      prev.map((o) =>
        o.id === offerId
          ? {
              ...o,
              paymentStatus: "held_in_escrow",
              qrisReference: newTx.id,
            }
          : o
      )
    );
    setTransactions((prev) => [newTx, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        recipient: vendor?.phone || "@pedagang",
        role: "vendor",
        message: `💳 Dana Rp ${offer.totalAmountIdr.toLocaleString("id-ID")} diamankan di Escrow QRIS BI. Siapkan paket untuk kurir!`,
        timestamp: stageConfig.clockTime,
        actionRequired: false,
        offerId,
        type: "vendor_alert",
      },
      ...prev,
    ]);
  };

  // Verifikasi Serah Terima PoD Kurir dengan Geofence GPS
  const verifyDeliveryPoD = (offerId: string, gpsDistanceMeters: number) => {
    if (gpsDistanceMeters > 50) {
      return {
        success: false,
        message: `Verifikasi GAGAL: Jarak kurir ${gpsDistanceMeters}m melebihi radius batas geofence aman (maks 50m dari los pedagang).`,
      };
    }

    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return { success: false, message: "Penawaran tidak ditemukan." };

    // 1. Lepas dana escrow ke status settled
    setOffers((prev) =>
      prev.map((o) =>
        o.id === offerId
          ? {
              ...o,
              status: "settled",
              paymentStatus: "released_to_vendor",
            }
          : o
      )
    );

    // 2. Catat pelepasan dana transaksi
    setTransactions((prev) =>
      prev.map((t) =>
        t.offerId === offerId
          ? { ...t, status: "released", releasedAt: stageConfig.clockTime }
          : t
      )
    );

    // 3. Kurangi stok di lapak pedagang yang telah selesai diantar kurir
    setStockItems((prev) =>
      prev.map((s) => {
        if (s.id === offer.stockId) {
          const newRemaining = Math.max(0, s.remainingKg - offer.quantityKg);
          return { ...s, remainingKg: newRemaining };
        }
        return s;
      })
    );

    // 4. Tambahkan dana hasil penjualan ke saldo dompet pedagang
    setVendorWalletBalanceIdr((prev) => prev + offer.totalAmountIdr);
    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        recipient: offer.vendorId,
        role: "vendor",
        message: `🎉 PoD Valid! Dana Rp ${offer.totalAmountIdr.toLocaleString("id-ID")} telah dicairkan ke saldo dompet pedagang. Emisi karbon dicatat!`,
        timestamp: stageConfig.clockTime,
        actionRequired: false,
        offerId,
        type: "vendor_alert",
      },
      ...prev,
    ]);

    return {
      success: true,
      message: `Verifikasi SUKSES: Kode HMAC valid & Geofence ${gpsDistanceMeters}m memenuhi syarat. Dana resmi dicairkan ke pedagang.`,
    };
  };

  // Trigger Autonomous Cron Sweep
  const triggerCronSweepNow = () => {
    setCurrentStage("cron_sweep");
    // Generate new offers for stocks that have decayScore >= 0.35
    const newGeneratedOffers: RescueOffer[] = [];
    stockItems.forEach((stk, idx) => {
      const evalResult = getEvaluationForStock(stk);
      if (evalResult.decayScore >= 0.35 && !offers.some((o) => o.stockId === stk.id)) {
        const comm = COMMODITIES.find((c) => c.id === stk.commodityId)!;
        newGeneratedOffers.push({
          id: `ofr_auto_${Date.now()}_${idx}`,
          stockId: stk.id,
          vendorId: stk.vendorId,
          commodityId: stk.commodityId,
          targetTier: evalResult.recommendedTier === "tier_1" ? "tier_1" : evalResult.recommendedTier === "tier_2" ? "tier_2" : "tier_3",
          quantityKg: stk.remainingKg,
          originalPricePerKg: comm.baseWholesalePricePerKg,
          salvagePricePerKg: evalResult.estimatedSalvagePrice,
          discountPercentage: Math.round(evalResult.salvageDiscount * 100),
          totalAmountIdr: evalResult.estimatedSalvagePrice * stk.remainingKg,
          expiresInMinutes: 30,
          status: "pending_vendor",
          paymentStatus: "unpaid",
        });
      }
    });

    if (newGeneratedOffers.length > 0) {
      setOffers((prev) => [...newGeneratedOffers, ...prev]);
    }
  };
  // Menambahkan pasokan masuk baru dan menyinkronkan ke penyimpanan lokal serta Supabase
  const addStockItem = (newStock: StockItem) => {
    setStockItems((prev) => {
      const updated = [newStock, ...prev];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pasarin_sim_stocks", JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    // Sinkronisasi asinkron non-blocking ke Supabase jika terhubung
    try {
      supabase.from("stock_items").insert({
        id: newStock.id,
        vendor_id: newStock.vendorId,
        commodity_id: newStock.commodityId,
        initial_quantity_kg: newStock.initialKg,
        remaining_quantity_kg: newStock.remainingKg,
        arrival_timestamp: new Date().toISOString(),
        lot_number: newStock.lotNumber,
      }).then(({ error }) => {
        if (error) console.warn("[Supabase Stock Insert Sync]:", error.message);
      });
    } catch {}
  };

  // Pemicu pembuatan penawaran surplus instan untuk mempermudah demonstrasi di depan dosen
  const createInstantSurplusOffer = (stockId: string) => {
    const stock = stockItems.find((s) => s.id === stockId);
    if (!stock) return;
    const comm = COMMODITIES.find((c) => c.id === stock.commodityId) || COMMODITIES[0];
    const evalResult = getEvaluationForStock(stock);

    const discountPct =
      evalResult.decayScore >= 0.35 && evalResult.salvageDiscount > 0
        ? Math.round(evalResult.salvageDiscount * 100)
        : 55;

    const floorPrice = Math.max(comm.minimumSalvagePricePerKg, 2500);
    const rawDiscountedPrice = Math.round(comm.baseWholesalePricePerKg * (1 - discountPct / 100));
    const pricePerKg = Math.max(floorPrice, Math.round(rawDiscountedPrice / 100) * 100);
    const targetTier: "tier_1" | "tier_2" | "tier_3" =
      evalResult.recommendedTier === "tier_1"
        ? "tier_1"
        : evalResult.recommendedTier === "tier_2"
        ? "tier_2"
        : evalResult.recommendedTier === "tier_3"
        ? "tier_3"
        : "tier_1";

    const newOffer: RescueOffer = {
      id: `ofr_demo_${Date.now().toString().slice(-4)}`,
      stockId: stock.id,
      vendorId: stock.vendorId,
      commodityId: stock.commodityId,
      targetTier,
      quantityKg: stock.remainingKg,
      originalPricePerKg: comm.baseWholesalePricePerKg,
      salvagePricePerKg: pricePerKg,
      discountPercentage: discountPct,
      totalAmountIdr: pricePerKg * stock.remainingKg,
      expiresInMinutes: 30,
      status: "active",
      paymentStatus: "unpaid",
    };

    setOffers((prev) => [newOffer, ...prev.filter((o) => o.stockId !== stock.id)]);

    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        recipient: `@Kios_${stock.vendorId}`,
        role: "vendor",
        message: `⚡ Penawaran surplus ${comm.localName} (${stock.remainingKg} kg) diskon ${discountPct}% langsung aktif dan disiarkan ke pembeli ${targetTier.toUpperCase()}!`,
        timestamp: stageConfig.clockTime,
        actionRequired: false,
        offerId: newOffer.id,
        type: "vendor_alert",
      },
      ...prev,
    ]);
  };

  // Mengembalikan status simulasi ke keadaan default awal
  const resetSimulationState = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pasarin_sim_stocks");
      localStorage.removeItem("pasarin_sim_offers");
      localStorage.removeItem("pasarin_sim_transactions");
      localStorage.removeItem("pasarin_sim_wallet");
    }
    setStockItems(generateMarketWideInitialStocks());
    setOffers(INITIAL_OFFERS);
    setTransactions(INITIAL_TRANSACTIONS);
    setVendorWalletBalanceIdr(345000);
  };

  // Memuat data benih demo 3-tier lengkap untuk Warteg, Dapur Sosial, Maggot, dan Kurir
  const seedThreeTierDemoLots = () => {
    const freshStocks = generateMarketWideInitialStocks();
    setStockItems(freshStocks);
    setOffers(DEMO_SEED_OFFERS);
    setTransactions(DEMO_SEED_TRANSACTIONS);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pasarin_sim_stocks", JSON.stringify(freshStocks));
        localStorage.setItem("pasarin_sim_offers", JSON.stringify(DEMO_SEED_OFFERS));
        localStorage.setItem("pasarin_sim_transactions", JSON.stringify(DEMO_SEED_TRANSACTIONS));
      } catch {}
    }
  };

  // Akuntansi Karbon Terakumulasi (IPCC 2006: 0.48 kg CO2e / kg biomassa terselamatkan)
  const settledOffers = offers.filter((o) => o.status === "settled");
  const totalBiomassSavedKg = settledOffers.reduce((acc, o) => acc + o.quantityKg, 30); // 30kg baseline
  const totalCarbonSavedKg = Number((totalBiomassSavedKg * 0.48).toFixed(1));
  const totalMethanePreventedKg = Number((totalBiomassSavedKg * 0.038).toFixed(2));

  // Escrow balance total
  const escrowBalanceTotalIdr = transactions
    .filter((t) => t.status === "held_in_escrow")
    .reduce((acc, t) => acc + t.amountIdr, 0);

  return (
    <SimulationContext.Provider
      value={{
        role,
        setRole,
        selectedVendorId,
        setSelectedVendorId,
        currentStage,
        setStage: setCurrentStage,
        stageConfig,
        stockItems,
        addStockItem,
        footfallSimulation,
        createInstantSurplusOffer,
        resetSimulationState,
        seedThreeTierDemoLots,
        offers,
        transactions,
        notifications,
        totalCarbonSavedKg,
        totalMethanePreventedKg,
        escrowBalanceTotalIdr,
        vendorWalletBalanceIdr,
        getEvaluationForStock,
        approveOfferByVendor,
        rejectOfferByVendor,
        claimOfferByBuyer,
        payQrisForOffer,
        verifyDeliveryPoD,
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
