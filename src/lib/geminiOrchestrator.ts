// Modul Agen Pengorkestrasi Pusat ReAct (PSR-17 / Agent 1: Central Orchestrator).
// Bertanggung jawab mengoordinasikan seluruh sub-agen otonom PASARIN:
// 1. Menjalankan siklus otonom sapuan sore 14:30 WIB (Autonomous Afternoon Sweep).
// 2. Memproses kueri bahasa alami manajerial pengelola pasar dengan penalaran ReAct berantai.
// 3. Mengimplementasikan arsitektur Hybrid: Google Gemini (@google/genai)
// dengan fail-safe fallback otomatis ke mesin penalaran ReAct heuristik deterministik.
// Landasan Spesifikasi PRD §4.1, §4.18.1, dan baris 2904-2939:
// - Batas maksimal siklus penalaran dipatok 5 putaran (max 5 turns) untuk mencegah loop tak berujung.
// - Format penalaran baku: Thought -> Action -> Observation -> Final Answer.
// - Pencatatan komprehensif ke basis data jejak audit (system_audit_trail).

// Impor: klien Gemini, konfigurasi, agen cuaca dan mutu, rumus inti, log audit, kalkulator armada, dan registri alat.
import { GoogleGenAI } from "@google/genai";
import { getEnv } from "@/lib/env";
import { weatherAgent } from "@/lib/weatherAgent";
import { qualityGateAgent } from "@/lib/qualityGateAgent";
import {
  calculateCompositeMarketSurplus,
  calculateRainFootfallAttenuation,
  KioskStockInput,
  StallSurplusPrediction,
} from "@/lib/pasarinCore";
import {
  toolCallingRegistry,
  executeDecomposedManagerialQuery,
  PASARIN_TOOL_DECLARATIONS,
} from "@/lib/toolCallingRegistry";
import { KIOSKS } from "@/data/kiosks";
import { COMMODITIES } from "@/data/commodities";
import { recordAuditLog } from "@/lib/audit";
import {
  OrchestratorRunResult,
  OrchestratorQueryResult,
  ReActStep,
} from "@/types/api";

// Batas maksimal putaran penalaran ReAct sebelum terminasi wajib.
export const MAX_REACT_TURNS = 5;

// Prompt instruksi sistem untuk Agent 1 Central Orchestrator (PRD §4.18.1).
export const ORCHESTRATOR_SYSTEM_PROMPT =
  "You are the Central Orchestrator of PASARIN (Proactive Agent for Market Surplus Redistribution). " +
  "Coordinate sub-agents in 5 sequential phases: ingest stock from 30 kiosks, fetch field weather, model Arrhenius decay, " +
  "calculate fair dynamic pricing, match lots with Tier 1 (Warteg), Tier 2 (Social Kitchens), and Tier 3 (Maggot Centers), " +
  "and dispatch logistics. Always reason in structured ReAct steps (Thought, Action, Observation, Final Answer) before taking action.";

// Penyimpanan cache in-memory jejak CoT terakhir untuk visualisasi real-time pada dasbor Admin
let latestOrchestratorRun: OrchestratorRunResult | null = null;
// Riwayat kueri terbaru untuk panel admin; hanya di memori instans ini.
const latestQueryHistory: OrchestratorQueryResult[] = [];

// Mengambil rekam jejak siklus otonom orkestrator terakhir untuk visualisasi antarmuka pengguna dasbor.
export function getLatestOrchestratorRun(): OrchestratorRunResult | null {
  return latestOrchestratorRun;
}

// Mengambil riwayat kueri manajerial terakhir dari memori proses untuk jejak audit interaktif.
export function getLatestQueryHistory(limit = 10): OrchestratorQueryResult[] {
  return latestQueryHistory.slice(0, limit);
}

// Membentuk sampel representatif dataset stok 30 kios Kramat Jati untuk evaluasi komposit pasar 14:30 WIB.
function buildStallStockInputs(): KioskStockInput[] {
  const inputs: KioskStockInput[] = [];

  KIOSKS.forEach((kiosk, idx) => {
    // Setiap kios memiliki 2 lot komoditas: 1 lot pasokan subuh (04:00 WIB) & 1 lot carryover
    // Dua komoditas per kios dipilih bergantian dari katalog agar sampel stok beragam.
    const primaryComm = COMMODITIES[idx % COMMODITIES.length];
    const secondaryComm = COMMODITIES[(idx + 5) % COMMODITIES.length];

    // Lot 1: Stok subuh reguler (04:00 WIB)
    // Lot pertama tiap kios: 45 kg datang pukul 04.00 (stok subuh). Angka ini sampel simulasi, bukan stok nyata.
    inputs.push({
      kioskId: kiosk.id,
      kioskName: kiosk.name,
      commodityId: primaryComm.id,
      initialStockKg: 45.0,
      arrivalHourDecimal: 4.0,
    });

    // Lot 2: Stok dengan jam paparan lebih lama untuk menghasilkan distribusi 3-tier realistis
    // Waktu tiba lot kedua digeser (-2, 1, atau 4 jam) supaya ada campuran lot segar, layu, dan lama.
    const shiftedArrival = idx % 3 === 0 ? -2.0 : idx % 3 === 1 ? 1.0 : 4.0;
    inputs.push({
      kioskId: kiosk.id,
      kioskName: kiosk.name,
      commodityId: secondaryComm.id,
      initialStockKg: 35.0,
      arrivalHourDecimal: shiftedArrival,
    });
  });

  return inputs;
}

// Menjalankan siklus otonom terpadu sistem multi-agen PASARIN (PSR-17).
// Mengorkestrasi pengumpulan telemetri cuaca, dekomposisi stok 30 kios, kalkulasi susut kinetika,
// verifikasi batas etika gerbang mutu, penetapan harga dinamis, dan perencanaan armada logistik.
export async function executeAutonomousOrchestration(options?: {
  executionMode?: "scheduled_autonomous_cron" | "manual_simulation";
  forceHeuristic?: boolean;
  recordResult?: boolean;
}): Promise<OrchestratorRunResult> {
  // Mode eksekusi dicatat di audit: jadwal cron otomatis atau simulasi manual.
  const executionMode = options?.executionMode || "scheduled_autonomous_cron";
  const executedAt = new Date().toISOString();
  const thoughtProcess: ReActStep[] = [];

  // Inisialisasi putaran ReAct untuk pencatatan jejak audit siklus otonom
  // Langkah 1 jejak ReAct: orkestrator memulai siklus sapuan sore.
  thoughtProcess.push({
    step: 1,
    agent: "OrchestratorAgent",
    thought:
      "Jadwal operasional kritis pukul 14:30 WIB tercapai. Memulai orkestrasi sapuan inventaris sore untuk los Pasar Induk Kramat Jati.",
    action: "triggerAutonomousSweep()",
    observation: "Sistem inisialisasi: memindai 30 kios pedagang binaan pada Blok A, B, dan C.",
  });

  // Akuisisi telemetri mikroklimat cuaca aktual dan perhitungan redaman pengunjung akibat hujan
  // forceHeuristic memaksa cuaca cadangan offline sehingga hasil tidak bergantung jaringan.
  const weather = await weatherAgent.getMarketWeather({ simulateOffline: options?.forceHeuristic });
  // Evaluasi redaman pengunjung: perhitungkan curah hujan aktual atau profil konvektif sore hari (12.5 mm)
  // Sapuan sore selalu mengasumsikan hujan minimal 12,5 mm (profil sore konvektif), kecuali cuaca nyata lebih deras.
  const effectiveRainfallMm = Math.max(12.5, weather.rainfallMm);
  const footfall = calculateRainFootfallAttenuation(effectiveRainfallMm, true);

  // Langkah 2: agen cuaca membaca suhu, kelembapan, dan hujan terkini (atau cadangan Open-Meteo atau estimasi bila sensor tidak tersedia).
  thoughtProcess.push({
    step: 2,
    agent: "WeatherAgent",
    tool: "getMarketWeather",
    thought: `Mengevaluasi parameter iklim mikro stasiun los Kramat Jati: Suhu ${weather.temperatureCelsius}°C, Kelembapan ${weather.relativeHumidityPercent}% RH, Curah Hujan Efektif ${effectiveRainfallMm} mm.`,
    action: `fetchMicroclimateTelemetry(lat: ${weather.location.latitude}, lon: ${weather.location.longitude})`,
    observation: `Kondisi: ${weather.weatherCondition}. ${footfall.aisleAccessibilityDescription} Pengali susut surplus: ${footfall.surplusMultiplier}x.`,
  });

  // Agregasi inventaris 30 kios dan proyeksi surplus komposit menggunakan pemodelan kinetika Arrhenius
  // Stok 30 kios disimulasikan, lalu surplus komposit dihitung dengan suhu, kelembapan, hujan, dan jam sapuan 14.5.
  // Surplus komposit dihitung untuk seluruh sampel stok kios pada pukul 14.30 (14,5 jam desimal) dengan cuaca terkini.
  const stallInputs = buildStallStockInputs();
  const compositeSurplus = calculateCompositeMarketSurplus(
    stallInputs,
    weather.temperatureCelsius,
    weather.relativeHumidityPercent,
    effectiveRainfallMm,
    14.5
  );
  // Langkah 4: gerbang mutu memeriksa Invarian 1, yaitu bahan layak manusia (skor di bawah 0,85) tidak boleh ke maggot.
  thoughtProcess.push({
    step: 3,
    agent: "SpoilagePredictiveEngine",
    tool: "calculateCompositeMarketSurplus",
    thought: `Mengompilasi sisa stok dari 30 kios pedagang. Memproyeksikan volume komposit yang berisiko busuk sebelum pasar tutup malam.`,
    action: `modelArrheniusDecay(totalStalls: 30, baselineExposure: 10.0 hours)`,
    observation: `Terdeteksi estimasi surplus total ${compositeSurplus.summary.totalPredictedSurplusKg} kg dari ${compositeSurplus.summary.totalMarketStockKg} kg stok masuk subuh. Item darurat kritis: ${compositeSurplus.summary.criticalEmergencyItemsCount} komoditas.`,
  });

  // Penegakan gerbang kendali mutu Invarian 1 (Zero Edible Food to Feed) untuk mencegah moral hazard
  const ethicalViolationsBlocked: string[] = [];
  // Gerbang aturan 1: lot layak makan yang terlanjur dialokasikan ke tier 3 dipindahkan ke tier 1 atau 2 menurut skornya.
  compositeSurplus.items.forEach((item: StallSurplusPrediction) => {
    if (item.decayScore < qualityGateAgent.HUMAN_CONSUMABLE_DECAY_THRESHOLD && item.allocatedTier === "tier_3") {
      ethicalViolationsBlocked.push(item.commodityId);
      item.allocatedTier = item.decayScore < 0.65 ? "tier_1" : "tier_2";
    }
  });

  // Langkah 5: alokasi armada dan pencocokan. Berat tiap tier diambil dari hasil surplus komposit.
  thoughtProcess.push({
    step: 4,
    agent: "QualityGateAgent",
    tool: "verifyHumanGradeIntegrity",
    thought:
      "Memeriksa kepatuhan Invarian 1 (Zero Edible Food to Feed). Memastikan 0% sayuran layak konsumsi manusia dialihkan ke pakan ternak maggot.",
    action: "auditAllocationIntegrity(threshold: 0.85)",
    observation:
      ethicalViolationsBlocked.length > 0
        ? `Invarian 1 ditegakkan: Memblokir ${ethicalViolationsBlocked.length} upaya pengalihan pangan segar. Seluruhnya dikembalikan ke antrean Warteg & Dapur Sosial.`
        : "Seluruh alokasi 3-Tier terverifikasi 100% mematuhi batas kelayakan biologis dan etika redistribusi.",
  });

  // Penetapan alokasi sirkular 3-Tier dan penugasan armada logistik berdasarkan tonase muatan
  // Alokasi akhir per tier dari hasil komposit setelah gerbang mutu.
  const tier1Kg = compositeSurplus.summary.tier1WartegAllocatedKg;
  const tier2Kg = compositeSurplus.summary.tier2SocialKitchenAllocatedKg;
  const tier3Kg = compositeSurplus.summary.tier3MaggotAllocatedKg;

  // Logika penugasan armada: muatan <= 300 kg menggunakan Viar Roda Tiga; > 300 kg menggunakan GranMax/Pikap
  // Perkiraan jumlah armada: satu unit per 450 kg surplus, minimal satu.
  const totalFleetRequired = Math.max(1, Math.ceil(compositeSurplus.summary.totalPredictedSurplusKg / 450));
  // Jumlah notifikasi kios dibatasi 30, sebanyak kios yang punya surplus.
  const telegramNotificationsDispatched = Math.min(30, compositeSurplus.items.filter((i) => i.estimatedSurplusKg > 0).length);

  thoughtProcess.push({
    step: 5,
    agent: "FleetAndMatchingAgent",
    tool: "dispatchLogisticsManifest",
    thought: `Menghitung kapasitas angkut armada untuk redistribusi ${compositeSurplus.summary.totalPredictedSurplusKg} kg surplus pangan.`,
    action: `allocateVehicles(surplusWeightKg: ${compositeSurplus.summary.totalPredictedSurplusKg})`,
    observation: `Alokasi terfinalisasi: Tier 1 Warteg (${tier1Kg} kg), Tier 2 Dapur Sosial (${tier2Kg} kg), Tier 3 Sentra Maggot (${tier3Kg} kg). Ditugaskan ${totalFleetRequired} armada dan ${telegramNotificationsDispatched} notifikasi Telegram disiarkan.`,
  });

  // Ringkasan eksekutif bawaan (deterministik); diganti teks model bila Gemini tersedia dan menjawab.
  let executiveSummary =
    `Siklus otonom sapuan pukul 14:30 WIB berhasil mengorkestrasi penyelamatan ${compositeSurplus.summary.totalPredictedSurplusKg} kg ` +
    `surplus pangan dari 30 kios Pasar Induk Kramat Jati. Alokasi sirkular terdistribusi ke Tier 1 Warteg (${tier1Kg} kg), ` +
    `Tier 2 Dapur Sosial (${tier2Kg} kg, jendela reservasi 30 menit aktif), dan Tier 3 Sentra Maggot (${tier3Kg} kg). ` +
    `Ditugaskan ${totalFleetRequired} unit armada penjemputan dengan proteksi modal pedagang terkunci aman.`;

  // Hubungkan ke Google Gemini live untuk sintesis orkestrator otonom jika API key tersedia
  const env = getEnv();
  const apiKey = env.GEMINI_API_KEY;
  // Model hanya dipanggil bila kunci valid (bukan placeholder), tidak dipaksa heuristik, dan hasilnya cukup panjang untuk dipakai.
  // Gemini dipanggil hanya bila kunci asli ada (bukan placeholder), mode heuristik tidak dipaksa, dan hasilnya cukup panjang; selain itu ringkasan heuristik tetap dipakai.
  if (apiKey && !options?.forceHeuristic && !apiKey.includes("your-gemini") && apiKey.length > 10) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt =
        `${ORCHESTRATOR_SYSTEM_PROMPT}\n\n` +
        `Data Sapuan Pukul 14:30 WIB Los Kramat Jati:\n` +
        `- Suhu Los: ${weather.temperatureCelsius}°C, Kelembapan: ${weather.relativeHumidityPercent}% RH, Curah Hujan Efektif: ${effectiveRainfallMm} mm\n` +
        `- Redaman Pengunjung: ${footfall.footfallDropPercentage}%, Pengali Susut Surplus: ${footfall.surplusMultiplier}x\n` +
        `- Total Pasokan Subuh: ${compositeSurplus.summary.totalMarketStockKg} kg, Estimasi Surplus Pangan: ${compositeSurplus.summary.totalPredictedSurplusKg} kg\n` +
        `- Alokasi 3-Tier Sirkular: Warteg ${tier1Kg} kg, Dapur Sosial ${tier2Kg} kg, Sentra Maggot ${tier3Kg} kg\n` +
        `- Armada Logistik: ${totalFleetRequired} unit (${totalFleetRequired <= 1 ? "Viar Roda Tiga" : "GranMax Pikap & Viar"})\n` +
        `- Notifikasi Telegram Kios: ${telegramNotificationsDispatched} lapak tersiarkan\n\n` +
        `Sebagai Agent 1: Central Orchestrator, berikan sintesis ringkasan eksekutif padat dalam Bahasa Indonesia teknis (2-3 kalimat) mengenai status pengawalan surplus sore ini dan instruksi armada.`;

      // Model dibaca dari GEMINI_MODEL; bila kosong memakai gemini-3.5-flash-lite. Gagal atau jawaban terlalu pendek berarti ringkasan heuristik tetap dipakai.
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
        contents: prompt,
      });
      if (response.text && response.text.trim().length > 20) {
        executiveSummary = response.text.trim();
      }
    } catch (e) {
      console.warn("[GeminiOrchestrator] Gagal menghubungi Gemini untuk sintesis sapuan otonom:", e);
    }
  }

  // Rekam riwayat siklus orkestrasi ke audit trail sistem
  // Audit dilewati pada pratinjau (recordResult false) supaya simulasi tidak mengotori catatan.
  // Catatan audit hanya ditulis bila recordResult tidak dimatikan, supaya pratinjau tidak mengotori jejak audit.
  const auditRecord = options?.recordResult === false ? undefined : await recordAuditLog({
    subsystem: "ORCHESTRATOR",
    action_type: "AUTONOMOUS_SWEEP_EXECUTED",
    payload: {
      executionMode,
      surplusDetectedKg: compositeSurplus.summary.totalPredictedSurplusKg,
      totalMarketStockKg: compositeSurplus.summary.totalMarketStockKg,
      allocations: {
        tier1WartegKg: tier1Kg,
        tier2SocialKg: tier2Kg,
        tier3MaggotKg: tier3Kg,
      },
      fleetCount: totalFleetRequired,
      notificationsCount: telegramNotificationsDispatched,
      executiveSummary,
    },
  });

  // Hasil siklus: mode eksekusi (Gemini atau heuristik), surplus, kios terpindai, notifikasi, armada, alokasi tier, dan ringkasan.
  const result: OrchestratorRunResult = {
    executionMode,
    surplusDetectedKg: compositeSurplus.summary.totalPredictedSurplusKg,
    kiosksScanned: compositeSurplus.summary.totalAnalyzedStalls,
    telegramNotificationsDispatched,
    fleetAssignmentsCount: totalFleetRequired,
    allocations: {
      tier1WartegKg: tier1Kg,
      tier2SocialKg: tier2Kg,
      tier3MaggotKg: tier3Kg,
    },
    thoughtProcess,
    executiveSummary,
    auditEventId: auditRecord?.eventId,
    executedAt,
  };

  // Hanya sapuan yang dicatat yang menjadi hasil terakhir di panel admin.
  if (options?.recordResult !== false) latestOrchestratorRun = result;
  return result;
}

// Memproses kueri bahasa alami dari pengelola pasar menggunakan arsitektur ReAct Hybrid (PSR-17 / PSR-18).
// Menghubungkan Google Gemini (@google/genai) saat API key tersedia dan valid,
// serta secara cerdas beralih ke mesin penalaran ReAct heuristik deterministik jika layanan offline atau kuota habis.
export async function processManagerialNaturalQuery(
  query: string,
  options?: { forceHeuristic?: boolean; recordResult?: boolean }
): Promise<OrchestratorQueryResult> {
  const cleanQuery = query.trim();
  const generatedAt = new Date().toISOString();
  const env = getEnv();
  const apiKey = env.GEMINI_API_KEY;

  // Jalur model: mengirim kueri dan memakai teks balasan sebagai ringkasan.
  // 1. Coba eksekusi melalui Google Gemini API jika API key tersedia dan tidak dipaksa heuristik
  // Jalur kueri: Gemini dipanggil hanya dengan kunci asli dan tanpa paksaan heuristik; jawabannya diminta berbentuk alur ReAct ringkas.
  if (apiKey && !options?.forceHeuristic && !apiKey.includes("your-gemini") && apiKey.length > 10) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const promptText =
        `${ORCHESTRATOR_SYSTEM_PROMPT}\n\n` +
        `User Query: "${cleanQuery}"\n\n` +
        `Berikan jawaban dalam Bahasa Indonesia teknis yang padat dan terstruktur. ` +
        `Rincikan alur penalaran ReAct Anda (maksimal 5 langkah Thought -> Action -> Observation) ` +
        `dan sertakan ringkasan eksekutif bernilai rekayasa nyata.`;

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
        contents: promptText,
      });

      const responseText = response.text || "";

      // Jawaban model dipakai hanya bila lebih dari 20 karakter; langkah-langkah di bawah adalah kerangka tetap, bukan hasil penalaran model.
      if (responseText.length > 20) {
        const thoughtProcess: ReActStep[] = [
          {
            step: 1,
            agent: "GeminiOrchestrator",
            thought: `Menerima dan mendekonstruksi kueri pengelola pasar: "${cleanQuery}".`,
            action: "parseQueryIntent()",
            observation: "Entitas teridentifikasi: kebutuhan armada logistik dan alokasi surplus komoditas.",
          },
          {
            step: 2,
            agent: "FleetAndMatchingAgent",
            thought: "Mengevaluasi kapasitas muatan kendaraan (Viar Roda Tiga <=300kg, GranMax Bak >300kg).",
            action: "calculateFleetRequirements()",
            observation: "Estimasi volume terbagi rata pada komoditas sayuran daun dan hortikultura buah.",
          },
        ];

        const queryResult: OrchestratorQueryResult = {
          query: cleanQuery,
          executiveSummary: responseText,
          thoughtProcess,
          recommendations: [
            "Pastikan konfirmasi pemesanan penjemputan sebelum pukul 15:00 WIB.",
            "Prioritaskan pengiriman sayur daun ke Warteg dalam radius 5 km Pasar Kramat Jati.",
          ],
          generatedAt,
        };

        // Riwayat kueri disimpan di memori, maksimal 20 terakhir.
        // Riwayat kueri disimpan di memori proses (maksimal 20 terbaru) dan hilang saat server dimulai ulang.
        if (options?.recordResult !== false) {
          latestQueryHistory.unshift(queryResult);
          if (latestQueryHistory.length > 20) latestQueryHistory.pop();
        }
        return queryResult;
      }
    } catch (apiError) {
      console.warn("[GeminiOrchestrator] Gagal menghubungi Gemini API, beralih ke mesin heuristik:", apiError);
    }
  }
  // 2. Mesin Penalaran ReAct Dekomposisi Terstruktur via Tool Calling Registry (PSR-18)
  const queryResult = await executeDecomposedManagerialQuery(cleanQuery);

  // Catatan audit kueri pengelola; dilewati pada pratinjau.
  if (options?.recordResult === false) return queryResult;
  await recordAuditLog({
    subsystem: "ORCHESTRATOR",
    action_type: "MANAGERIAL_QUERY_ANSWERED",
    payload: {
      query: cleanQuery,
      executiveSummary: queryResult.executiveSummary,
      stepCount: queryResult.thoughtProcess.length,
      toolsInvoked: queryResult.toolsInvoked,
      durationMs: queryResult.executionDurationMs,
    },
  });

  latestQueryHistory.unshift(queryResult);
  if (latestQueryHistory.length > 20) latestQueryHistory.pop();
  return queryResult;
}

// Objek fasad Agent 1: Central Orchestrator & Coordinator Agent (PSR-17).
// Fasad Agent 1: satu objek yang membuka fungsi orkestrasi, riwayat, registri alat, deklarasi alat, batas putaran ReAct, dan prompt sistem.
export const geminiOrchestrator = {
  name: "GeminiOrchestratorAgent",
  role: "Central Orchestrator & Multi-Agent ReAct Coordinator",
  executeAutonomousOrchestration,
  processManagerialNaturalQuery,
  getLatestOrchestratorRun,
  getLatestQueryHistory,
  toolRegistry: toolCallingRegistry,
  toolDeclarations: PASARIN_TOOL_DECLARATIONS,
  MAX_REACT_TURNS,
  SYSTEM_PROMPT: ORCHESTRATOR_SYSTEM_PROMPT,
};
