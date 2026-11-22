// Penjelasan skor peluruhan satu lot: langkah hitung dari rumus, ditambah kalimat penjelasan dari Gemini.
// Angka selalu dari explainArrheniusDecay; Gemini hanya menyusun kalimat dan tidak boleh mengubah angka.
// Bila kunci tidak ada, kuota habis, atau Gemini gagal, kalimat disusun dari template tanpa AI.

import { GoogleGenAI } from "@google/genai";
import { getEnv } from "@/lib/env";
import { cachedAnswer, noteAiFailure, reserveAiCall, storeAnswer } from "@/lib/aiBudget";
import type { DecayBreakdown } from "@/lib/pasarinCore";
import { plainText } from "@/lib/marketChatbot";

// Satu langkah perhitungan yang ditampilkan di antarmuka.
export interface DecayStep {
  label: string;
  value: string;
  note: string;
}

// Hasil penjelasan: langkah rumus, kalimat penjelasan, dan sumber kalimatnya.
export interface DecayExplanation {
  steps: DecayStep[];
  explanation: string;
  source: "gemini" | "rumus";
}

// Lama jawaban Gemini disimpan di cache untuk lot dengan angka yang sama: 15 menit.
const CACHE_TTL_MS = 15 * 60 * 1000;

// Angka dengan koma desimal Indonesia.
const num = (value: number, digits = 2) => value.toLocaleString("id-ID", { maximumFractionDigits: digits });

// Nama kategori mutu dalam kalimat.
const CONDITION: Record<DecayBreakdown["condition"], string> = {
  segar_prima: "segar",
  layu_ringan: "layu ringan",
  layu_sedang: "layu sedang",
  tidak_layak: "tidak layak konsumsi",
};

// Sisa simpan dalam kata: menit bila kurang dari satu jam.
function shelfLife(b: DecayBreakdown) {
  if (b.decayScore >= 0.85 || b.hoursRemaining <= 0) return "sudah melewati batas konsumsi manusia";
  if (b.hoursRemaining < 1) return `sekitar ${Math.max(1, Math.round(b.hoursRemaining * 60))} menit lagi`;
  return `sekitar ${num(b.hoursRemaining, 1)} jam lagi`;
}

// Kalimat kecepatan peluruhan dibanding kondisi acuan (32,5 °C dan 75%), dalam bahasa sehari-hari.
function speedSentence(b: DecayBreakdown) {
  if (b.relativeSpeed >= 1.05) return "lebih cepat dari kondisi acuan (32,5 °C dan 75%), jadi sayur lebih cepat layu.";
  if (b.relativeSpeed <= 0.95) return "lebih lambat dari kondisi acuan (32,5 °C dan 75%) karena lebih sejuk.";
  return "sama dengan kondisi acuan (32,5 °C dan 75%), jadi tidak mempercepat atau memperlambat.";
}

// Lama pajang dibanding batasnya, dalam kalimat pendek: persen bila belum mencapai batas, kelipatan bila sudah lewat.
function exposureSentence(b: DecayBreakdown) {
  if (b.exposure < 1) return `${num(b.exposure * 100, 0)}% dari batas ${num(b.horizonHours, 0)} jam.`;
  if (b.exposure < 1.2) return `Sudah mencapai batas ${num(b.horizonHours, 0)} jam.`;
  return `Sudah ${num(b.exposure, 1)}× batas ${num(b.horizonHours, 0)} jam.`;
}

// Langkah perhitungan yang ditampilkan: empat baris pendek, tanpa rumus mentah.
export function decayExplanationSteps(b: DecayBreakdown): DecayStep[] {
  return [
    { label: "Lama dipajang", value: `${num(b.hoursElapsed, 1)} jam`, note: exposureSentence(b) },
    {
      label: "Suhu dan kelembapan",
      value: `${num(b.temperatureCelsius, 1)} °C, ${num(b.relativeHumidityPercent, 0)}%`,
      note: `Peluruhan ${speedSentence(b)}`,
    },
    {
      label: "Skor susut",
      value: `${Math.round(b.decayScore * 100)}/100`,
      note: `Kategori ${CONDITION[b.condition]}. Batasnya 35 segar, 65 layu ringan, 85 layu sedang.${b.rawScore > 1 ? " Hasil hitung melebihi 100, jadi ditampilkan 100." : ""}`,
    },
    {
      label: "Sisa simpan",
      value: b.decayScore >= 0.85 ? "habis" : shelfLife(b).replace(" lagi", ""),
      note: "Jam sampai skor mencapai 85, yaitu batas konsumsi manusia.",
    },
  ];
}

// Kalimat penjelasan dari template, dipakai sebagai cadangan tanpa AI.
export function ruleExplanation(b: DecayBreakdown) {
  const parts = [
    `${b.commodityName} sudah dipajang ${num(b.hoursElapsed, 1)} jam. ${exposureSentence(b)}`,
    `Suhu ${num(b.temperatureCelsius, 1)} °C dan kelembapan ${num(b.relativeHumidityPercent, 0)}%: peluruhan ${speedSentence(b)}`,
    `Skor susutnya ${Math.round(b.decayScore * 100)}/100, kategori ${CONDITION[b.condition]}, sehingga cocok untuk ${b.tierLabel}.`,
    b.decayScore >= 0.85 ? "Lot ini sudah melewati batas konsumsi manusia." : `Perkiraan sisa simpan ${shelfLife(b)}.`,
    "Skor ini estimasi dari model, bukan pemeriksaan fisik.",
  ];
  return parts.join(" ");
}

// Audiens penjelasan menentukan jenis saran praktis di akhir kalimat.
export type ExplainAudience = "pedagang" | "pembeli" | "kurir";

// Saran penutup menurut audiens.
const ADVICE: Record<ExplainAudience, string> = {
  pedagang: "satu saran praktis untuk pedagang (misalnya segera ditimbang, dijual, atau dialihkan sesuai tujuannya)",
  pembeli: "satu saran praktis untuk pembeli mitra (apakah lot ini sebaiknya segera diolah atau diklaim, sesuai tujuannya)",
  kurir: "satu catatan untuk kurir tentang seberapa mendesak lot ini diantar",
};

// Instruksi model: hanya memakai angka yang diberikan dan menulis teks polos, langsung ke penjelasan tanpa sapaan.
function instructionFor(audience: ExplainAudience) {
  return [
    "Kamu Asisten PASARIN. Jelaskan mengapa sebuah lot sayur atau buah punya skor susut tertentu.",
    "Jangan menyapa dan jangan memperkenalkan diri; langsung ke penjelasan. Sebut pembaca dengan Anda, bukan Kak.",
    "Gunakan hanya angka pada data; jangan mengubah, membulatkan ulang, atau mengarang angka. Skor susut berskala 0 sampai 100: di bawah 35 segar, 35-64 layu ringan, 65-84 layu sedang, 85 ke atas tidak layak konsumsi.",
    "Tulis 3 sampai 4 kalimat bahasa Indonesia yang sederhana: faktor yang paling berpengaruh (lama pajang, suhu, kelembapan), arti skornya untuk tujuan penyaluran, lalu " + ADVICE[audience] + ".",
    "Sebutkan bahwa skor adalah estimasi model. Tulis teks biasa tanpa Markdown.",
  ].join(" ");
}

// Kunci cache dari angka yang dibulatkan, agar lot dengan kondisi hampir sama memakai jawaban yang sama.
function cacheKey(b: DecayBreakdown, audience: ExplainAudience) {
  return [audience, b.commodityName, Math.round(b.decayScore * 100), Math.round(b.temperatureCelsius), Math.round(b.relativeHumidityPercent),
    Math.round(b.hoursElapsed * 2)].join("|");
}

// Menyusun penjelasan lengkap: langkah dari rumus, lalu kalimat dari Gemini atau template.
export async function explainDecay(b: DecayBreakdown, forceHeuristic = false, audience: ExplainAudience = "pedagang"): Promise<DecayExplanation> {
  const steps = decayExplanationSteps(b);
  const fallback: DecayExplanation = { steps, explanation: ruleExplanation(b), source: "rumus" };
  const key = getEnv().GEMINI_API_KEY;
  if (!key || forceHeuristic || key.includes("your-gemini") || key.length < 10) return fallback;

  const cached = cachedAnswer(cacheKey(b, audience));
  if (cached) return { steps, explanation: cached, source: "gemini" };
  // Batas harian atau masa jeda 429 berlaku: pakai template tanpa memanggil model.
  if (!reserveAiCall()) return fallback;

  try {
    const client = new GoogleGenAI({ apiKey: key, httpOptions: { fetch: (input, init) => globalThis.fetch(input, init) } });
    const response = await client.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
      contents: JSON.stringify({
        komoditas: b.commodityName,
        lamaPajangJam: Number(b.hoursElapsed.toFixed(1)),
        batasJamTidakLayak: b.horizonHours,
        suhuC: Number(b.temperatureCelsius.toFixed(1)),
        kelembapanPersen: Math.round(b.relativeHumidityPercent),
        kecepatanPeluruhanDibandingKondisiAcuan32_5C_75persen: Number(b.relativeSpeed.toFixed(2)),
        skorSusutDari100: Math.round(b.decayScore * 100),
        kategori: CONDITION[b.condition],
        tujuan: b.tierLabel,
        sisaSimpanJam: b.decayScore >= 0.85 ? 0 : Number(b.hoursRemaining.toFixed(1)),
      }),
      config: { systemInstruction: instructionFor(audience), temperature: 0.2, maxOutputTokens: 700, abortSignal: AbortSignal.timeout(10000) },
    });
    const text = plainText(response.text ?? "");
    if (text.length > 20) {
      storeAnswer(cacheKey(b, audience), text, CACHE_TTL_MS);
      return { steps, explanation: text, source: "gemini" };
    }
  } catch (error) {
    noteAiFailure(error);
  }
  return fallback;
}
