/**
 * Modul Adaptor Evaluasi Peluruhan Biologis (Decay Engine Adapter)
 *
 * @see Jira Ticket PSR-14 (Biological Shelf-Life Decay Engine)
 * @see PRD_FIX_PASARIN.md Bagian 5.1 & Bagian 15.4.1
 *
 * Modul ini bertindak sebagai jembatan antarmuka (adapter) yang menghubungkan
 * state reaktif simulasi antarmuka (simulationStore.tsx) dengan mesin kinetika
 * fisika-kimia Arrhenius-Q10 terpadu di src/lib/pasarinCore.ts.
 */

import { Commodity, COMMODITIES } from "@/data/commodities";
import {
  evaluateProduceDecay,
  evaluateProduceById,
  getAllCommodityEvaluations,
} from "@/lib/pasarinCore";
import { DecayEvaluationResult, ProduceCondition, CircularRescueTier } from "@/types/api";

/**
 * Antarmuka hasil evaluasi peluruhan untuk kebutuhan komponen antarmuka pengguna
 */
export interface DecayEvaluation {
  commodityId: string;
  temperatureC: number;
  humidityPercent: number;
  hoursElapsed: number;
  decayScore: number;
  condition: ProduceCondition;
  recommendedTier: CircularRescueTier;
  tierLabel: string;
  hoursRemaining: number;
  salvageDiscount: number; // Persentase diskon desimal, misal 0.55 = 55%
  estimatedSalvagePrice: number;
}

/**
 * Menghitung kinetika pembusukan biologis sayuran dan buah berbasis persamaan
 * Arrhenius-Q10 dan kelipatan termal di src/lib/pasarinCore.ts.
 *
 * @param commodity - Profil komoditas hortikultura yang dievaluasi.
 * @param temperatureC - Suhu lingkungan los pasar (°C).
 * @param humidityPercent - Kelembapan relatif los pasar (%).
 * @param hoursElapsed - Jumlah jam paparan sejak subuh (jam).
 * @returns Objek DecayEvaluation terstruktur untuk konsumsi antarmuka pengguna.
 */
export function calculateDecay(
  commodity: Commodity,
  temperatureC: number,
  humidityPercent: number,
  hoursElapsed: number
): DecayEvaluation {
  const result: DecayEvaluationResult = evaluateProduceDecay(
    commodity,
    temperatureC,
    humidityPercent,
    hoursElapsed
  );

  return {
    commodityId: result.commodityId,
    temperatureC: result.temperatureC,
    humidityPercent: result.humidityPercent,
    hoursElapsed: result.hoursElapsed,
    decayScore: result.decayScore,
    condition: result.condition,
    recommendedTier: result.recommendedTier,
    tierLabel: result.tierLabel,
    hoursRemaining: result.hoursRemaining,
    salvageDiscount: Number((result.salvageDiscountPercent / 100.0).toFixed(2)),
    estimatedSalvagePrice: result.estimatedSalvagePriceIdr,
  };
}

/**
 * Mengambil profil komoditas berdasarkan pengenal string unik.
 *
 * @param id - Pengenal string unik komoditas (misal: 'kangkung', 'bayam').
 * @returns Objek Commodity atau undefined jika tidak ditemukan.
 */
export function getCommodityById(id: string): Commodity | undefined {
  const normalizedId = id.trim().toLowerCase();
  return COMMODITIES.find((c) => c.id.toLowerCase() === normalizedId);
}

// Re-export fungsi mesin inti untuk akses langsung dari backend dan testing
export { evaluateProduceDecay, evaluateProduceById, getAllCommodityEvaluations };
