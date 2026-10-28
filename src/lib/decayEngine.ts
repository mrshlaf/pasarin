// Adapter evaluasi peluruhan biologis untuk UI & simulationStore (PSR-14)

import { Commodity, COMMODITIES } from "@/data/commodities";
import {
  evaluateProduceDecay,
  evaluateProduceById,
  getAllCommodityEvaluations,
} from "@/lib/pasarinCore";
import { DecayEvaluationResult, ProduceCondition, CircularRescueTier } from "@/types/api";

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

// Hitung peluruhan biologis komoditas via pasarinCore
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

// Evaluasi batch seluruh 30 komoditas untuk matriks pasar
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
