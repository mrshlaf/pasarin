// Adapter Evaluasi Peluruhan Biologis untuk Antarmuka Pengguna & State Manajemen (PSR-14).
// Menjembatani perhitungan kinetika pasarinCore dengan format konsumsi komponen UI
// dan Zustand store simulasi pasar.

import { Commodity } from "@/data/commodities";
import {
  evaluateProduceDecay,
  evaluateProduceById,
} from "@/lib/pasarinCore";
import { DecayEvaluationResult, ProduceCondition, CircularRescueTier } from "@/types/api";

// Struktur data ringkas evaluasi peluruhan untuk kebutuhan rendering komponen antarmuka.
export interface DecayEvaluation {
  // ID komoditas dari katalog.
  commodityId: string;
  // Suhu udara los pasar, derajat Celsius.
  temperatureC: number;
  // Kelembapan relatif, persen.
  humidityPercent: number;
  // Lama komoditas dipajang sejak masuk pasar, jam.
  hoursElapsed: number;
  // Skor peluruhan 0-1; batas fase di 0,35, 0,65, dan 0,85.
  decayScore: number;
  // Kondisi mutu hasil klasifikasi skor (misalnya segar atau layu).
  condition: ProduceCondition;
  // Tier penyaluran yang disarankan menurut skor.
  recommendedTier: CircularRescueTier;
  // Nama tier siap tampil di antarmuka.
  tierLabel: string;
  // Jam tersisa sebelum skor mencapai 0,85 (tidak layak konsumsi).
  hoursRemaining: number;
  // Diskon dalam pecahan 0-1, bukan persen.
  salvageDiscount: number;
  // Harga tebus penyelamatan dalam rupiah per kg.
  estimatedSalvagePrice: number;
}

// Menghitung peluruhan biologis komoditas tunggal dengan format keluaran yang disesuaikan untuk UI.
export function calculateDecay(
  commodity: Commodity,
  temperatureC: number,
  humidityPercent: number,
  hoursElapsed: number
): DecayEvaluation {
  // Perhitungan sebenarnya ada di pasarinCore; fungsi ini hanya menyesuaikan bentuk keluarannya.
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
    // Core memakai persen (0-100); UI memakai pecahan (0-1).
    salvageDiscount: result.salvageDiscountPercent / 100,
    estimatedSalvagePrice: result.estimatedSalvagePriceIdr,
  };
}

// Mengevaluasi peluruhan biologis komoditas berdasarkan pengidentifikasi unik string komoditas (PSR-14).
export { evaluateProduceById };
