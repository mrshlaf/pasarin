// Modul Agen Gerbang Kendali Mutu & Pencegahan Moral Hazard (PSR-21 / Agent 10).
// Bertanggung jawab menegakkan etika redistribusi pangan sirkular dan memblokir
// manipulasi pedagang yang berupaya mengalihkan sayuran layak konsumsi manusia ke pakan maggot.
// Landasan Invarian PRD §5.1 & §6.1:
// 1. Invarian 1 (Zero Edible Food to Feed): 0% sayuran layak makan manusia (decayScore < 0.85)
// boleh dialihkan ke sentra budidaya maggot BSF (Tier 3).
// 2. Invarian 2 (Strict Price Ordering): harga Tier 1 > Tier 2 > Tier 3 (gratis), dari tabel diskon tunggal quoteSalvagePrice.
// 3. Invarian 3 (30-Minute Social Reservation Window): Sayur bernutrisi tinggi di Tier 2
// dikunci selama 30 menit khusus untuk dapur sosial sebelum dapat diakses pihak lain.

// Impor: katalog komoditas, rumus peluruhan dan klasifikasi, log audit, dan tipe hasil gerbang mutu.
import { COMMODITIES, Commodity } from "@/data/commodities";
import { classifyProduceCondition, evaluateArrheniusDecay } from "@/lib/pasarinCore";
import { recordAuditLog } from "@/lib/audit";
import {
  QualityGateEvaluationResult,
  QualityGateRequestPayload,
  ChlorophyllLossEvaluationResult,
  CircularRescueTier,
} from "@/types/api";

// Ambang batas skor peluruhan maksimal untuk kategori layak konsumsi manusia.
// Komoditas dengan skor peluruhan di bawah 0.85 wajib dialokasikan untuk pangan manusia.
export const HUMAN_CONSUMABLE_DECAY_THRESHOLD = 0.85;

// Durasi jendela waktu reservasi eksklusif dapur sosial dalam menit.
export const SOCIAL_RESERVATION_WINDOW_MINUTES = 30;

// Memvalidasi integritas kelayakan konsumsi manusia dan menegakkan aturan anti-moral hazard.
// Menguji apakah komoditas yang diajukan ke Tier 3 (pakan maggot) sebenarnya masih layak dimakan manusia.
// Jika terbukti melanggar Invarian 1, sistem otomatis memblokir pengajuan dan mencatat ke audit trail.
export async function verifyHumanGradeIntegrity(
  params: QualityGateRequestPayload,
  options: { recordIncident?: boolean } = {},
): Promise<QualityGateEvaluationResult> {
  const {
    // Parameter permintaan; nilai bawaan dipakai untuk data yang tidak dikirim: vendor tak dikenal, 32,5 C, kelembapan 75%.
    commodityId,
    hoursOnDisplay,
    requestedTier,
    vendorId = "unknown_vendor",
    temperatureC = 32.5,
    humidityPercent = 75,
    imageBase64,
    chlorophyllRatio,
  } = params;

  // Evaluasi inspeksi visual klorofil daun jika data citra atau rasio klorofil disertakan (MobileNetV3)
  // Pemeriksaan visual klorofil hanya dijalankan bila ada gambar atau rasio klorofil.
  const visualVerification =
    imageBase64 || chlorophyllRatio !== undefined
      ? evaluateChlorophyllLoss({ imageBase64, chlorophyllRatio, commodityId })
      : undefined;
  // ID dicocokkan tanpa membedakan huruf besar kecil dan spasi.
  const normalizedId = commodityId.trim().toLowerCase();
  const commodity = COMMODITIES.find((c) => c.id.toLowerCase() === normalizedId);

  // Tangani kasus komoditas tidak terdaftar dalam master katalog pasar
  if (!commodity) {
    return {
      gateStatus: "blocked",
      isHumanConsumable: false,
      decayScore: 1.0,
      detectedCondition: "tidak_layak",
      recommendedTier: "tier_3",
      requestedTier,
      isMoralHazardViolation: false,
      violationReason: `Komoditas dengan ID '${commodityId}' tidak ditemukan dalam katalog 30 komoditas pasar.`,
      correctiveAction: "Pastikan ID komoditas terdaftar resmi di direktori master komoditas Pasar Kramat Jati.",
      evaluatedAt: new Date().toISOString(),
    };
  }

  // Evaluasi skor peluruhan biologis menggunakan mikroklimat los pasar
  // Memakai model yang sama dengan dasbor (evaluateArrheniusDecay) agar keputusan gerbang mutu tidak bertentangan dengan skor di layar.
  const { decayScore, condition, recommendedTier } = evaluateArrheniusDecay(commodity, temperatureC, humidityPercent, hoursOnDisplay);
  // Layak konsumsi manusia bila skor di bawah 0,85.
  const isHumanConsumable = decayScore < HUMAN_CONSUMABLE_DECAY_THRESHOLD;

  // Uji Invarian 1: Larangan mutlak pengalihan pangan manusia ke pakan larva maggot
  // Pelanggaran terjadi bila pangan layak manusia diajukan ke Tier 3 (pakan maggot).
  const isDivertingToFeed = requestedTier === "tier_3";
  const isMoralHazardViolation = isHumanConsumable && isDivertingToFeed;

  // Pelanggaran moral hazard: bahan masih layak dimakan (skor di bawah 0,85) tetapi diminta masuk Tier 3 maggot. Penawaran diblokir dan dicatat.
  if (isMoralHazardViolation) {
    const violationReason =
      `PELANGGARAN MORAL HAZARD: Komoditas ${commodity.localName || commodity.name} ` +
      `memiliki skor peluruhan ${decayScore.toFixed(4)} (< ${HUMAN_CONSUMABLE_DECAY_THRESHOLD}) ` +
      `dan terverifikasi masih layak konsumsi manusia (${condition}). ` +
      `Pengalihan ke pakan ternak maggot (Tier 3) dilarang mutlak oleh Invarian 1 PRD §5.1.`;

    // Komoditas diarahkan ke tier yang sesuai dengan mutunya.
    const correctiveAction =
      `Komoditas dialihkan secara otomatis ke antrean ${recommendedTier === "tier_1" ? "Tier 1 (Warteg & UMKM)" : "Tier 2 (Dapur Sosial & Panti Asuhan)"}.`;

    // recordIncident: false dipakai untuk pratinjau; insiden tidak dicatat dan penalti reputasi tidak dikenakan.
    const auditRecord = options.recordIncident === false ? undefined : await recordAuditLog({
      subsystem: "QUALITY_GATE",
      action_type: "MORAL_HAZARD_VIOLATION_BLOCKED",
      payload: {
        vendorId,
        commodityId: commodity.id,
        commodityName: commodity.localName,
        hoursOnDisplay,
        decayScore,
        condition,
        recommendedTier,
        attemptedTier: requestedTier,
        violationReason,
        enforcedRule: "INVARIANT_1_ZERO_EDIBLE_FOOD_TO_FEED",
      },
    });

    // Hasil diblokir: layak konsumsi manusia tetapi diminta ke maggot, lengkap dengan alasan, ID audit, dan penalti reputasi.
    return {
      gateStatus: "blocked",
      isHumanConsumable: true,
      decayScore,
      detectedCondition: condition,
      recommendedTier,
      requestedTier,
      isMoralHazardViolation: true,
      violationReason,
      correctiveAction,
      socialReservationWindowMinutes: recommendedTier === "tier_2" ? SOCIAL_RESERVATION_WINDOW_MINUTES : 0,
      // Penalti reputasi 5 poin hanya bila insiden benar-benar dicatat.
      reputationPenaltyApplied: auditRecord ? 5 : 0,
      visualVerification,
      auditEventId: auditRecord?.eventId,
      evaluatedAt: new Date().toISOString(),
    };
  }

  // Alokasi Tier 2 mendapat jendela reservasi eksklusif panti asuhan selama 30 menit
  // Hanya Tier 2 yang mendapat jendela reservasi 30 menit.
  const socialReservationWindowMinutes = requestedTier === "tier_2" ? SOCIAL_RESERVATION_WINDOW_MINUTES : 0;

  // Hasil lolos: alokasi tier tidak melanggar aturan mutu.
  return {
    gateStatus: "passed",
    isHumanConsumable,
    decayScore,
    detectedCondition: condition,
    recommendedTier,
    requestedTier,
    isMoralHazardViolation: false,
    socialReservationWindowMinutes,
    visualVerification,
    evaluatedAt: new Date().toISOString(),
  };
}

// Evaluasi sinkronus cepat integritas mutu untuk komponen antarmuka pengguna (UI Playground).
export function evaluateProduceQuality(
  commodity: Commodity | string,
  decayScore: number,
  requestedTier: CircularRescueTier
): {
  isBlocked: boolean;
  isHumanConsumable: boolean;
  message: string;
} {
  const isHumanConsumable = decayScore < HUMAN_CONSUMABLE_DECAY_THRESHOLD;
  // Diblokir hanya bila layak makan dan diajukan ke Tier 3.
  const isBlocked = isHumanConsumable && requestedTier === "tier_3";

  // Diblokir: bahan layak manusia tidak boleh dialihkan ke Tier 3.
  if (isBlocked) {
    // Lolos: alokasi memenuhi batas mutu biologis dan etika redistribusi.
    return {
      isBlocked: true,
      isHumanConsumable: true,
      message: "BLOCKED: Moral hazard terdeteksi! Sayuran masih layak pangan manusia dan dilarang dialihkan ke pakan maggot.",
    };
  }

  // Hasil visual: persen kehilangan klorofil, skor susut visual, dan perkiraan kondisi.
  return {
    isBlocked: false,
    isHumanConsumable,
    message: "PASSED: Alokasi memenuhi batas mutu biologis dan etika redistribusi.",
  };
}
// Evaluasi degradasi klorofil visual sayuran daun berbasis MobileNetV3 visual classifier (PSR-21 / Agent 10).
// Mengukur tingkat klorosis (menguningnya pigmen hijau daun) untuk mendeteksi pembusukan dini.
// Implementasi saat ini belum memanggil model visual; lihat catatan placeholder di dalam fungsi.
export function evaluateChlorophyllLoss(input: {
  chlorophyllRatio?: number;
  imageBase64?: string;
  commodityId?: string;
}): ChlorophyllLossEvaluationResult {
  let ratio = input.chlorophyllRatio;

  // Belum ada model citra: tanpa rasio numerik, rasio diturunkan deterministik dari panjang base64 sebagai placeholder
  if (ratio === undefined && input.imageBase64) {
    const rawLen = input.imageBase64.length;
    // Placeholder deterministik: rasio = 1 - (panjang base64 mod 50)/100, dibatasi 0,1 sampai 1,0. Hanya agar hasil konsisten sampai model citra sungguhan dipasang; bukan pembacaan warna nyata.
    ratio = Math.max(0.1, Math.min(1.0, 1.0 - (rawLen % 50) / 100));
  }

  // Rasio default 0,88 (daun masih hijau); skor visual adalah kebalikan rasio klorofil sehingga skala tier sama dengan decayScore.
  const effectiveRatio = Math.max(0.0, Math.min(1.0, ratio ?? 0.88));
  // Kehilangan klorofil (persen) = (1 - rasio) x 100. Contoh: rasio 0,88 berarti 12 persen klorofil hilang.
  const chlorophyllLossPercent = Number(((1.0 - effectiveRatio) * 100).toFixed(1));
  // Skor visual = 1 - rasio, sehingga dipakai dengan ambang yang sama seperti skor peluruhan (0,35, 0,65, 0,85).
  const visualDecayScore = Number((1.0 - effectiveRatio).toFixed(4));

  const { condition, recommendedTier } = classifyProduceCondition(visualDecayScore);
  const isHumanConsumable = visualDecayScore < HUMAN_CONSUMABLE_DECAY_THRESHOLD;

  return {
    chlorophyllLossPercent,
    visualDecayScore,
    estimatedCondition: condition,
    recommendedTier,
    isHumanConsumable,
    // Nilai tetap karena belum ada model citra sungguhan.
    visualConfidence: 0.92,
    gateStatus: isHumanConsumable ? "passed" : "blocked",
  };
}

// Objek fasad Agent 10: Multi-Modal Quality Gate & Moral Hazard Protection Agent.
// Terdaftar pada ReAct Tool Calling Registry untuk pemanggilan alat otonom orchestrator.
export const qualityGateAgent = {
  name: "QualityGateAgent",
  role: "Multi-Modal Quality Gate & Moral Hazard Protection",
  verifyHumanGradeIntegrity,
  evaluateChlorophyllLoss,
  evaluateProduceQuality,
  HUMAN_CONSUMABLE_DECAY_THRESHOLD,
  SOCIAL_RESERVATION_WINDOW_MINUTES,
  // Teks invarian PRD untuk ditampilkan atau dikutip orkestrator.
  INVARIANTS: {
    INVARIANT_1: "0% makanan layak konsumsi manusia dialihkan ke pakan maggot",
    INVARIANT_2: "Strict Price Ordering: P_Tier1 > P_Tier2 >= P_Tier3 >= Rp 1.500/kg",
    INVARIANT_3: "30-Minute Exclusive Social Reservation Window untuk Tier 2",
  },
};
