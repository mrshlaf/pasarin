"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { COMMODITIES, Commodity } from "@/data/commodities";
import { KIOSKS, Kiosk } from "@/data/kiosks";
import { calculateDecay, DecayEvaluation } from "@/lib/decayEngine";

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
    label: "Subuh (Bongkar Muat)",
    temperatureC: 25.0,
    humidityPercent: 88,
    rainMm: 0,
    isRaining: false,
    hoursElapsedSinceArrival: 1.0,
    description: "Pasokan truk grosir Sukabumi & Brebes tiba. Sayur masih segar prima bersuhu rendah.",
  },
  terik: {
    stage: "terik",
    clockTime: "12:00 WIB",
    label: "Terik Tengah Hari",
    temperatureC: 34.0,
    humidityPercent: 62,
    rainMm: 0,
    isRaining: false,
    hoursElapsedSinceArrival: 8.0,
    description: "Suhu los meningkat tajam di bawah seng. Respirasi seluler sayur daun melonjak 3x lipat.",
  },
  cron_sweep: {
    stage: "cron_sweep",
    clockTime: "14:30 WIB",
    label: "Autonomous Sweep (Jam Rawan)",
    temperatureC: 32.5,
    humidityPercent: 68,
    rainMm: 0,
    isRaining: false,
    hoursElapsedSinceArrival: 10.5,
    description: "Trigger Autonomous Cron PASARIN aktif. Evaluasi kelayuan & penerbitan tiket surplus.",
  },
  hujan_sore: {
    stage: "hujan_sore",
    clockTime: "15:30 WIB",
    label: "Hujan Badai Sore Jakarta",
    temperatureC: 27.0,
    humidityPercent: 95,
    rainMm: 18.5,
    isRaining: true,
    hoursElapsedSinceArrival: 11.5,
    description: "Lorong los becek. Pembeli eceran turun 48%. Surplus tak terjual terancam busuk jika tidak diredistribusi.",
  },
  handover: {
    stage: "handover",
    clockTime: "17:30 WIB",
    label: "Distribusi Armada & Handover",
    temperatureC: 28.0,
    humidityPercent: 82,
    rainMm: 2.0,
    isRaining: false,
    hoursElapsedSinceArrival: 13.5,
    description: "Penjemputan armada Viar / GranMax. Validasi serah terima PoD HMAC dan pencairan escrow.",
  },
};

export interface StockItem {
  id: string;
  vendorId: string;
  commodityId: string;
  initialKg: number;
  remainingKg: number;
  arrivalClock: string;
  lotNumber: string;
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

// Initial Sample Stocks
const INITIAL_STOCKS: StockItem[] = [
  { id: "stk_01", vendorId: "vendor_kramat_01", commodityId: "kangkung", initialKg: 80, remainingKg: 45, arrivalClock: "04:30 WIB", lotNumber: "LOT-A12-01" },
  { id: "stk_02", vendorId: "vendor_kramat_01", commodityId: "bayam", initialKg: 60, remainingKg: 35, arrivalClock: "04:30 WIB", lotNumber: "LOT-A12-02" },
  { id: "stk_03", vendorId: "vendor_kramat_01", commodityId: "sawi_hijau", initialKg: 90, remainingKg: 50, arrivalClock: "04:30 WIB", lotNumber: "LOT-A12-03" },
  { id: "stk_04", vendorId: "vendor_kramat_02", commodityId: "pakcoy", initialKg: 100, remainingKg: 40, arrivalClock: "04:30 WIB", lotNumber: "LOT-A18-01" },
  { id: "stk_05", vendorId: "vendor_kramat_02", commodityId: "buncis", initialKg: 50, remainingKg: 25, arrivalClock: "04:30 WIB", lotNumber: "LOT-A18-02" },
  { id: "stk_06", vendorId: "vendor_kramat_03", commodityId: "selada", initialKg: 40, remainingKg: 20, arrivalClock: "04:30 WIB", lotNumber: "LOT-A24-01" },
  { id: "stk_07", vendorId: "vendor_kramat_11", commodityId: "tomat", initialKg: 120, remainingKg: 65, arrivalClock: "04:30 WIB", lotNumber: "LOT-B05-01" },
  { id: "stk_08", vendorId: "vendor_kramat_11", commodityId: "cabai_merah", initialKg: 70, remainingKg: 30, arrivalClock: "04:30 WIB", lotNumber: "LOT-B05-02" },
  { id: "stk_09", vendorId: "vendor_kramat_15", commodityId: "terung_ungu", initialKg: 85, remainingKg: 40, arrivalClock: "04:30 WIB", lotNumber: "LOT-B22-01" },
  { id: "stk_10", vendorId: "vendor_kramat_21", commodityId: "wortel", initialKg: 150, remainingKg: 80, arrivalClock: "04:30 WIB", lotNumber: "LOT-C04-01" },
];

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>("vendor");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("vendor_kramat_01");
  const [currentStage, setCurrentStage] = useState<TimeOfDayStage>("cron_sweep");
  const [stockItems, setStockItems] = useState<StockItem[]>(INITIAL_STOCKS);
  const [vendorWalletBalanceIdr, setVendorWalletBalanceIdr] = useState<number>(345000);

  // Initial Offers
  const [offers, setOffers] = useState<RescueOffer[]>([
    {
      id: "ofr_01",
      stockId: "stk_01",
      vendorId: "vendor_kramat_01",
      commodityId: "kangkung",
      targetTier: "tier_1",
      quantityKg: 45,
      originalPricePerKg: 6000,
      salvagePricePerKg: 2400,
      discountPercentage: 60,
      totalAmountIdr: 108000,
      expiresInMinutes: 45,
      status: "active",
      paymentStatus: "unpaid",
    },
    {
      id: "ofr_02",
      stockId: "stk_02",
      vendorId: "vendor_kramat_01",
      commodityId: "bayam",
      targetTier: "tier_1",
      quantityKg: 35,
      originalPricePerKg: 7000,
      salvagePricePerKg: 2500,
      discountPercentage: 64,
      totalAmountIdr: 87500,
      expiresInMinutes: 30,
      status: "pending_vendor",
      paymentStatus: "unpaid",
    },
    {
      id: "ofr_03",
      stockId: "stk_04",
      vendorId: "vendor_kramat_02",
      commodityId: "pakcoy",
      targetTier: "tier_2",
      quantityKg: 40,
      originalPricePerKg: 8000,
      salvagePricePerKg: 1200,
      discountPercentage: 85,
      totalAmountIdr: 48000,
      expiresInMinutes: 25,
      status: "active",
      paymentStatus: "unpaid",
    },
  ]);

  const [transactions, setTransactions] = useState<EscrowTransaction[]>([
    {
      id: "trx_901",
      offerId: "ofr_init_past",
      buyerName: "Warteg Bahari Condet",
      vendorName: "H. Rohmat Sayur Daun",
      commodityName: "Sawi Hijau (30 kg)",
      amountIdr: 72000,
      status: "released",
      createdAt: "13:15 WIB",
      releasedAt: "14:10 WIB",
      qrisPayload: "00020101021226580014ID.PASARIN.WWW0118936009990000000001520454995802ID5912PASARIN6007JAKARTA63047200",
    },
  ]);

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

  const stageConfig = TIME_STAGES[currentStage];

  // Hitung evaluasi decay untuk item stok berdasarkan stage cuaca saat ini
  const getEvaluationForStock = (stock: StockItem): DecayEvaluation => {
    const comm = COMMODITIES.find((c) => c.id === stock.commodityId) || COMMODITIES[0];
    return calculateDecay(
      comm,
      stageConfig.temperatureC,
      stageConfig.humidityPercent,
      stageConfig.hoursElapsedSinceArrival
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

  // Pembeli klaim penawaran
  const claimOfferByBuyer = (
    offerId: string,
    buyerName: string,
    claimantRole: "warteg" | "social_kitchen" | "maggot"
  ) => {
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

    // Lepas dana escrow ke saldo pedagang
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

    setTransactions((prev) =>
      prev.map((t) =>
        t.offerId === offerId
          ? { ...t, status: "released", releasedAt: stageConfig.clockTime }
          : t
      )
    );

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
          discountPercentage: evalResult.salvageDiscount,
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

export function useMarketSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error("useMarketSimulation must be used within a SimulationProvider");
  }
  return context;
}
