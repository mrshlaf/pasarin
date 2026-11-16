/**
 * Skrip Uji Integrasi Agen Gerbang Kendali Mutu & Anti-Moral Hazard (PSR-21).
 * Memverifikasi 6 kriteria penerimaan kritis (Acceptance Criteria / DoD):
 * 1. Penolakan mutlak pengalihan sayuran segar (< 0.35) ke pakan larva maggot (Invarian 1).
 * 2. Penolakan pengalihan sayuran layu ringan (0.35 - 0.65) ke pakan maggot dan pengalihan ke Tier 1.
 * 3. Penolakan sayuran layu sedang (0.65 - 0.85) ke maggot, dialihkan ke Tier 2 + jendela kunci 30m.
 * 4. Persetujuan komoditas afkir/rusak (>= 0.85) untuk diproses ke sentra maggot BSF (Tier 3).
 * 5. Perekaman otomatis insiden moral hazard ke tabel jejak audit sistem (system_audit_trail).
 * 6. Kompatibilitas fasad objek tool calling ReAct orchestrator.
 */

import { qualityGateAgent, verifyHumanGradeIntegrity } from "../src/lib/qualityGateAgent";
import { getRecentAuditLogs } from "../src/lib/audit";

// Variabel pelacak jumlah asersi lolos dan gagal
let passedCount = 0;
let failedCount = 0;

/**
 * Memeriksa kondisi boolean dan mencetak status uji ke konsol.
 *
 * @param condition - Kondisi kebenaran yang diuji.
 * @param testName - Nama skenario pengujian.
 * @param detail - Informasi rincian nilai hasil observasi.
 */
function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? ` -> ${detail}` : ""}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    failedCount++;
  }
}

/**
 * Menjalankan seluruh skenario pengujian gerbang kendali mutu etis PSR-21.
 */
async function runQualityGateTests() {
  console.log("\nPASARIN PSR-21 Quality Gate & Anti-Moral Hazard Test Suite");

  // Uji 1: Penolakan mutlak pengalihan bayam segar (decayScore < 0.35) ke pakan maggot
  console.log("\n[Test 1] Pengujian Invarian 1 pada Sayuran Segar Prima (Bayam 2 jam pajang)");
  // Mensimulasikan pedagang nakal mencoba membuang bayam yang baru dipajang 2 jam ke Tier 3 Maggot
  const freshResult = await verifyHumanGradeIntegrity({
    commodityId: "bayam",
    hoursOnDisplay: 2.0,
    requestedTier: "tier_3",
    vendorId: "vendor_kramat_01",
  });

  // Memvalidasi bahwa gerbang mutu memblokir alokasi ke tier_3 (gateStatus = 'blocked')
  assert(
    freshResult.gateStatus === "blocked",
    "Sistem memblokir pengajuan pakan maggot untuk sayuran segar",
    `gateStatus: '${freshResult.gateStatus}'`
  );

  // Memvalidasi bahwa percobaan pengalihan sayur segar ditandai sebagai pelanggaran moral hazard
  assert(
    freshResult.isMoralHazardViolation === true,
    "Terdeteksi sebagai pelanggaran moral hazard",
    `isMoralHazardViolation: ${freshResult.isMoralHazardViolation}`
  );

  // Memverifikasi status pangan tervalidasi layak konsumsi manusia (isHumanConsumable = true)
  assert(
    freshResult.isHumanConsumable === true,
    "Status pangan tervalidasi layak konsumsi manusia",
    `isHumanConsumable: ${freshResult.isHumanConsumable} (decayScore: ${freshResult.decayScore.toFixed(3)})`
  );

  // Memvalidasi bahwa rekomendasi jalur distribusi diarahkan kembali ke pangan manusia (fresh atau tier_1)
  assert(
    freshResult.recommendedTier === "fresh" || freshResult.recommendedTier === "tier_1",
    "Sistem mengarahkan rekomendasi ke jalur konsumsi manusia",
    `recommendedTier: '${freshResult.recommendedTier}'`
  );

  // Uji 2: Penolakan sayuran layu ringan (0.35 - 0.65) ke maggot & pemindahan ke Tier 1 (Warteg)
  console.log("\n[Test 2] Pengujian Sayuran Layu Ringan (Kangkung 4.5 jam pajang)");
  // Mengevaluasi kangkung yang sudah dipajang 4.5 jam (layu ringan) yang diajukan ke Tier 3
  const lightWiltResult = await verifyHumanGradeIntegrity({
    commodityId: "kangkung",
    hoursOnDisplay: 4.5,
    requestedTier: "tier_3",
    vendorId: "vendor_kramat_02",
  });

  // Memvalidasi bahwa sayur layu ringan tetap diblokir dari sentra maggot BSF
  assert(
    lightWiltResult.gateStatus === "blocked",
    "Sistem menolak komoditas layu ringan dialihkan ke sentra maggot",
    `gateStatus: '${lightWiltResult.gateStatus}'`
  );

  // Memvalidasi bahwa sistem secara otomatis mengoreksi rekomendasi alokasi ke Tier 1 (Warteg & Kuliner UMKM)
  assert(
    lightWiltResult.recommendedTier === "tier_1",
    "Sistem mengoreksi alokasi secara otomatis ke Tier 1 (Warteg)",
    `recommendedTier: '${lightWiltResult.recommendedTier}'`
  );

  // Uji 3: Penolakan sayuran layu sedang (0.65 - 0.85) ke maggot & aktivasi jendela reservasi 30 menit
  console.log("\n[Test 3] Pengujian Sayuran Layu Sedang & Invarian 3 (Kangkung 6.5 jam pajang)");
  // Mengevaluasi kangkung pajang 6.5 jam (layu sedang bernutrisi) yang diajukan ke Tier 3
  const mediumWiltResult = await verifyHumanGradeIntegrity({
    commodityId: "kangkung",
    hoursOnDisplay: 6.5,
    requestedTier: "tier_3",
    vendorId: "vendor_kramat_03",
  });

  // Memvalidasi penolakan sistem terhadap pengalihan sayur layu sedang ke pakan maggot
  assert(
    mediumWiltResult.gateStatus === "blocked",
    "Sistem menolak komoditas layu sedang dialihkan ke sentra maggot",
    `gateStatus: '${mediumWiltResult.gateStatus}'`
  );

  // Memvalidasi pengalihan komoditas sayur bernutrisi ke Tier 2 (Dapur Sosial & Panti Asuhan)
  assert(
    mediumWiltResult.recommendedTier === "tier_2",
    "Sistem mengalihkan komoditas bernutrisi ke Tier 2 (Dapur Sosial)",
    `recommendedTier: '${mediumWiltResult.recommendedTier}'`
  );

  // Memvalidasi aktivasi Invarian 3: jendela waktu reservasi eksklusif selama tepat 30 menit
  assert(
    mediumWiltResult.socialReservationWindowMinutes === 30,
    "Invarian 3 aktif: Jendela reservasi eksklusif panti asuhan terkunci selama 30 menit",
    `socialReservationWindowMinutes: ${mediumWiltResult.socialReservationWindowMinutes} menit`
  );

  // Uji 4: Persetujuan komoditas afkir/rusak (decayScore >= 0.85) untuk pakan maggot
  console.log("\n[Test 4] Pengujian Komoditas Afkir / Tidak Layak Konsumsi (Kangkung 9 jam pajang)");
  // Mengevaluasi kangkung busuk yang telah terpapar panas 9 jam di los pasar
  const spoiledResult = await verifyHumanGradeIntegrity({
    commodityId: "kangkung",
    hoursOnDisplay: 9.0,
    requestedTier: "tier_3",
    vendorId: "vendor_kramat_04",
  });

  // Memvalidasi persetujuan status kelulusan gerbang mutu (gateStatus = 'passed') untuk pakan maggot
  assert(
    spoiledResult.gateStatus === "passed",
    "Sistem meloloskan alokasi Tier 3 untuk sayuran yang rusak secara biologis",
    `gateStatus: '${spoiledResult.gateStatus}'`
  );

  // Memvalidasi bahwa kondisi fisik sayur tervalidasi tidak layak konsumsi manusia (isHumanConsumable = false)
  assert(
    spoiledResult.isHumanConsumable === false,
    "Status pangan tervalidasi tidak layak konsumsi manusia",
    `isHumanConsumable: ${spoiledResult.isHumanConsumable} (decayScore: ${spoiledResult.decayScore.toFixed(3)})`
  );

  // Memverifikasi bukan pelanggaran moral hazard karena kondisi biologis sayuran memang sudah rusak total
  assert(
    spoiledResult.isMoralHazardViolation === false,
    "Bukan pelanggaran moral hazard karena mutu sudah tidak memenuhi syarat pangan",
    `isMoralHazardViolation: ${spoiledResult.isMoralHazardViolation}`
  );

  // Uji 5: Perekaman otomatis insiden moral hazard ke riwayat audit sistem
  console.log("\n[Test 5] Pengujian Perekaman Jejak Audit Sistem (Audit Trail Logging)");
  // Mengambil jejak audit terbaru dari subsistem QUALITY_GATE
  const recentLogs = getRecentAuditLogs(10);
  const moralHazardLog = recentLogs.find(
    (log) => log.subsystem === "QUALITY_GATE" && log.action_type === "MORAL_HAZARD_VIOLATION_BLOCKED"
  );

  // Memvalidasi bahwa peristiwa penolakan moral hazard terekam secara otomatis di audit trail
  assert(
    !!moralHazardLog,
    "Insiden pelanggaran moral hazard tercatat secara otomatis pada jejak audit",
    moralHazardLog ? `Event ID: ${moralHazardLog.event_id}` : "Log tidak ditemukan"
  );

  // Memverifikasi bahwa aturan Invarian 1 (Zero Edible Food to Feed) terlampir pada log jejak audit
  assert(
    moralHazardLog?.payload_json?.enforcedRule === "INVARIANT_1_ZERO_EDIBLE_FOOD_TO_FEED",
    "Log audit merekam penegakan Invarian 1 (Zero Edible Food to Feed)",
    `Enforced Rule: '${moralHazardLog?.payload_json?.enforcedRule}'`
  );

  // Uji 6: Kompatibilitas fasad agen ReAct Tool Calling
  console.log("\n[Test 6] Pengujian Fasad Agen Tool Calling & Invarian PRD");

  // Memvalidasi pendaftaran fasad agen QualityGateAgent untuk integrasi pemanggilan fungsi ReAct
  assert(
    qualityGateAgent.name === "QualityGateAgent" && typeof qualityGateAgent.verifyHumanGradeIntegrity === "function",
    "Fasad Agent 10 terdaftar valid untuk integrasi ReAct Tool Calling",
    `Agent Name: '${qualityGateAgent.name}'`
  );

  // Memverifikasi ambang batas batas kelayakan pangan manusia dipatok tepat pada angka 0.85 sesuai spesifikasi PRD
  assert(
    qualityGateAgent.HUMAN_CONSUMABLE_DECAY_THRESHOLD === 0.85,
    "Ambang batas kelayakan pangan manusia dipatok tepat pada nilai 0.85",
    `Threshold: ${qualityGateAgent.HUMAN_CONSUMABLE_DECAY_THRESHOLD}`
  );

  // Uji 7: Evaluasi klorofil visual MobileNetV3 (evaluateChlorophyllLoss)
  console.log("\n[Test 7] Pengujian Evaluasi Kehilangan Klorofil Visual (MobileNetV3)");

  // Evaluasi sampel citra daun berklorofil 92%
  const visualFresh = qualityGateAgent.evaluateChlorophyllLoss({ chlorophyllRatio: 0.92, commodityId: "bayam" });

  // Memvalidasi daun berklorofil 92% (kehilangan klorofil 8%) berstatus layak makan manusia
  assert(
    visualFresh.isHumanConsumable === true && visualFresh.chlorophyllLossPercent === 8.0,
    "Sayuran berklorofil 92% tervalidasi layak konsumsi manusia dengan kehilangan klorofil 8%",
    `Loss: ${visualFresh.chlorophyllLossPercent}%, Condition: '${visualFresh.estimatedCondition}'`
  );

  // Evaluasi sampel daun kuning kecokelatan berklorofil hanya 10%
  const visualSpoiled = qualityGateAgent.evaluateChlorophyllLoss({ chlorophyllRatio: 0.10, commodityId: "kangkung" });

  // Memvalidasi daun dengan klorofil 10% (kehilangan klorofil 90%) terdeteksi tidak layak pangan manusia
  assert(
    visualSpoiled.isHumanConsumable === false && visualSpoiled.gateStatus === "blocked",
    "Sayuran dengan klorofil 10% (kuning kecokelatan) terdeteksi tidak layak pangan manusia",
    `Loss: ${visualSpoiled.chlorophyllLossPercent}%, Condition: '${visualSpoiled.estimatedCondition}'`
  );

  // Uji 8: Penalti reputasi pedagang saat terbukti melakukan moral hazard
  console.log("\n[Test 8] Pengujian Penalti Reputasi Pedagang saat Moral Hazard");

  // Mensimulasikan pedagang nakal mencoba membuang daun segar prima ke Tier 3
  const penaltyResult = await verifyHumanGradeIntegrity({
    commodityId: "bayam",
    hoursOnDisplay: 2.0,
    requestedTier: "tier_3",
    vendorId: "vendor_kramat_nakal",
    chlorophyllRatio: 0.95,
  });

  // Memvalidasi sanksi pengurangan 5 poin reputasi bagi pedagang yang memicu moral hazard
  assert(
    penaltyResult.reputationPenaltyApplied === 5,
    "Sistem menerapkan penalti pengurangan 5 poin reputasi bagi pedagang yang memicu moral hazard",
    `reputationPenaltyApplied: ${penaltyResult.reputationPenaltyApplied}`
  );

  // Memverifikasi lampiran hasil inspeksi visual klorofil pada respons gerbang mutu
  assert(
    !!penaltyResult.visualVerification && penaltyResult.visualVerification.isHumanConsumable === true,
    "Hasil inspeksi visual klorofil terlampir pada verifikasi gerbang mutu",
    `Visual Loss: ${penaltyResult.visualVerification?.chlorophyllLossPercent}%`
  );

  // Rekapitulasi hasil pengujian
  console.log(`\nHasil pengujian akhir PSR-21: ${passedCount} lulus, ${failedCount} gagal\n`);

  if (failedCount > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

// Menjalankan pengujian gerbang kendali mutu PSR-21
runQualityGateTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
