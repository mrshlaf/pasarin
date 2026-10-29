/**
 * Adapter Evaluasi Peluruhan Biologis untuk Antarmuka Pengguna & State Manajemen (PSR-14).
 * Menjembatani perhitungan kinetika pasarinCore dengan format konsumsi komponen UI
 * dan Zustand store simulasi pasar.
 */

import { Commodity } from "@/data/commodities";
import {
  evaluateProduceDecay,
  evaluateProduceById,
  getAllCommodityEvaluations,
} from "@/lib/pasarinCore";
import { DecayEvaluationResult, ProduceCondition, CircularRescueTier } from "@/types/api";

/**
 * Struktur data ringkas evaluasi peluruhan untuk kebutuhan rendering komponen antarmuka.
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
  salvageDiscount: number;
  estimatedSalvagePrice: number;
}

/**
 * Menghitung peluruhan biologis komoditas tunggal dengan format keluaran yang disesuaikan untuk UI.
 *
 * @param commodity - Objek metadata komoditas dari katalog.
 * @param temperatureC - Suhu lingkungan pasar dalam derajat Celsius (°C).
 * @param humidityPercent - Kelembapan lingkungan pasar dalam persen (% RH).
 * @param hoursElapsed - Lama waktu komoditas dipajang di los pasar (jam).
 * @returns Objek evaluasi peluruhan siap pakai untuk komponen presentasi antarmuka.
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
    salvageDiscount: result.salvageDiscountPercent / 100,
    estimatedSalvagePrice: result.estimatedSalvagePriceIdr,
  };
}

export { evaluateProduceById };

/**
 * Mengevaluasi seluruh 30 komoditas katalog pasar dan memetakannya ke dalam kamus (Record) berbasis ID komoditas.
 * Mempermudah lookup O(1) status mutu komoditas pada dashboard inventaris pedagang.
 *
 * @param temperatureC - Suhu lingkungan pasar dalam derajat Celsius (°C).
 * @param humidityPercent - Kelembapan lingkungan pasar dalam persen (% RH).
 * @param hoursElapsed - Waktu pajang sejak subuh dalam satuan jam.
 * @returns Kamus Record<string, DecayEvaluation> dengan kunci ID komoditas.
 */
export function calculateBatchDecay(
  temperatureC: number,
  humidityPercent: number,
  hoursElapsed: number
): Record<string, DecayEvaluation> {
  const evaluations = getAllCommodityEvaluations(hoursElapsed, temperatureC, humidityPercent);
  const result: Record<string, DecayEvaluation> = {};

  for (const evalResult of evaluations) {
    result[evalResult.commodityId] = {
      commodityId: evalResult.commodityId,
      temperatureC: evalResult.temperatureC,
      humidityPercent: evalResult.humidityPercent,
      hoursElapsed: evalResult.hoursElapsed,
      decayScore: evalResult.decayScore,
      condition: evalResult.condition,
      recommendedTier: evalResult.recommendedTier,
      tierLabel: evalResult.tierLabel,
      hoursRemaining: evalResult.hoursRemaining,
      salvageDiscount: evalResult.salvageDiscountPercent / 100,
      estimatedSalvagePrice: evalResult.estimatedSalvagePriceIdr,
    };
  }

  return result;
}
