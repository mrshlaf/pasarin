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
  console.log("\n--- PASARIN PSR-21 QUALITY GATE & ANTI-MORAL HAZARD TEST SUITE ---");

  // Test 1: Penolakan mutlak pengalihan bayam segar (decayScore < 0.35) ke pakan maggot
  console.log("\n[Test 1] Pengujian Invarian 1 pada Sayuran Segar Prima (Bayam 2 jam pajang)");
  const freshResult = await verifyHumanGradeIntegrity({
    commodityId: "bayam",
    hoursOnDisplay: 2.0,
    requestedTier: "tier_3",
    vendorId: "vendor_kramat_01",
  });

  assert(
    freshResult.gateStatus === "blocked",
    "Sistem memblokir pengajuan pakan maggot untuk sayuran segar",
    `gateStatus: '${freshResult.gateStatus}'`
  );
  assert(
    freshResult.isMoralHazardViolation === true,
    "Terdeteksi sebagai pelanggaran moral hazard",
    `isMoralHazardViolation: ${freshResult.isMoralHazardViolation}`
  );
  assert(
    freshResult.isHumanConsumable === true,
    "Status pangan tervalidasi layak konsumsi manusia",
    `isHumanConsumable: ${freshResult.isHumanConsumable} (decayScore: ${freshResult.decayScore.toFixed(3)})`
  );
  assert(
    freshResult.recommendedTier === "fresh" || freshResult.recommendedTier === "tier_1",
    "Sistem mengarahkan rekomendasi ke jalur konsumsi manusia",
    `recommendedTier: '${freshResult.recommendedTier}'`
  );

  // Test 2: Penolakan sayuran layu ringan (0.35 - 0.65) ke maggot & pemindahan ke Tier 1 (Warteg)
  console.log("\n[Test 2] Pengujian Sayuran Layu Ringan (Kangkung 4.5 jam pajang)");
  const lightWiltResult = await verifyHumanGradeIntegrity({
    commodityId: "kangkung",
    hoursOnDisplay: 4.5,
    requestedTier: "tier_3",
    vendorId: "vendor_kramat_02",
  });

  assert(
    lightWiltResult.gateStatus === "blocked",
    "Sistem menolak komoditas layu ringan dialihkan ke sentra maggot",
    `gateStatus: '${lightWiltResult.gateStatus}'`
  );
  assert(
    lightWiltResult.recommendedTier === "tier_1",
    "Sistem mengoreksi alokasi secara otomatis ke Tier 1 (Warteg)",
    `recommendedTier: '${lightWiltResult.recommendedTier}'`
  );

  // Test 3: Penolakan sayuran layu sedang (0.65 - 0.85) ke maggot & aktivasi jendela reservasi 30 menit
  console.log("\n[Test 3] Pengujian Sayuran Layu Sedang & Invarian 3 (Kangkung 6.5 jam pajang)");
  const mediumWiltResult = await verifyHumanGradeIntegrity({
    commodityId: "kangkung",
    hoursOnDisplay: 6.5,
    requestedTier: "tier_3",
    vendorId: "vendor_kramat_03",
  });

  assert(
    mediumWiltResult.gateStatus === "blocked",
    "Sistem menolak komoditas layu sedang dialihkan ke sentra maggot",
    `gateStatus: '${mediumWiltResult.gateStatus}'`
  );
  assert(
    mediumWiltResult.recommendedTier === "tier_2",
    "Sistem mengalihkan komoditas bernutrisi ke Tier 2 (Dapur Sosial)",
    `recommendedTier: '${mediumWiltResult.recommendedTier}'`
  );
  assert(
    mediumWiltResult.socialReservationWindowMinutes === 30,
    "Invarian 3 aktif: Jendela reservasi eksklusif panti asuhan terkunci selama 30 menit",
    `socialReservationWindowMinutes: ${mediumWiltResult.socialReservationWindowMinutes} menit`
  );

  // Test 4: Persetujuan komoditas afkir/rusak (decayScore >= 0.85) untuk pakan maggot
  console.log("\n[Test 4] Pengujian Komoditas Afkir / Tidak Layak Konsumsi (Kangkung 9 jam pajang)");
  const spoiledResult = await verifyHumanGradeIntegrity({
    commodityId: "kangkung",
    hoursOnDisplay: 9.0,
    requestedTier: "tier_3",
    vendorId: "vendor_kramat_04",
  });

  assert(
    spoiledResult.gateStatus === "passed",
    "Sistem meloloskan alokasi Tier 3 untuk sayuran yang rusak secara biologis",
    `gateStatus: '${spoiledResult.gateStatus}'`
  );
  assert(
    spoiledResult.isHumanConsumable === false,
    "Status pangan tervalidasi tidak layak konsumsi manusia",
    `isHumanConsumable: ${spoiledResult.isHumanConsumable} (decayScore: ${spoiledResult.decayScore.toFixed(3)})`
  );
  assert(
    spoiledResult.isMoralHazardViolation === false,
    "Bukan pelanggaran moral hazard karena mutu sudah tidak memenuhi syarat pangan",
    `isMoralHazardViolation: ${spoiledResult.isMoralHazardViolation}`
  );

  // Test 5: Perekaman otomatis insiden moral hazard ke riwayat audit sistem
  console.log("\n[Test 5] Pengujian Perekaman Jejak Audit Sistem (Audit Trail Logging)");
  const recentLogs = getRecentAuditLogs(10);
  const moralHazardLog = recentLogs.find(
    (log) => log.subsystem === "QUALITY_GATE" && log.action_type === "MORAL_HAZARD_VIOLATION_BLOCKED"
  );

  assert(
    !!moralHazardLog,
    "Insiden pelanggaran moral hazard tercatat secara otomatis pada jejak audit",
    moralHazardLog ? `Event ID: ${moralHazardLog.event_id}` : "Log tidak ditemukan"
  );
  assert(
    moralHazardLog?.payload_json?.enforcedRule === "INVARIANT_1_ZERO_EDIBLE_FOOD_TO_FEED",
    "Log audit merekam penegakan Invarian 1 (Zero Edible Food to Feed)",
    `Enforced Rule: '${moralHazardLog?.payload_json?.enforcedRule}'`
  );

  // Test 6: Kompatibilitas fasad agen ReAct Tool Calling
  console.log("\n[Test 6] Pengujian Fasad Agen Tool Calling & Invarian PRD");
  assert(
    qualityGateAgent.name === "QualityGateAgent" && typeof qualityGateAgent.verifyHumanGradeIntegrity === "function",
    "Fasad Agent 10 terdaftar valid untuk integrasi ReAct Tool Calling",
    `Agent Name: '${qualityGateAgent.name}'`
  );
  assert(
    qualityGateAgent.HUMAN_CONSUMABLE_DECAY_THRESHOLD === 0.85,
    "Ambang batas kelayakan pangan manusia dipatok tepat pada nilai 0.85",
    `Threshold: ${qualityGateAgent.HUMAN_CONSUMABLE_DECAY_THRESHOLD}`
  );

  // Test 7: Evaluasi klorofil visual MobileNetV3 (evaluateChlorophyllLoss)
  console.log("\n[Test 7] Pengujian Evaluasi Kehilangan Klorofil Visual (MobileNetV3)");
  const visualFresh = qualityGateAgent.evaluateChlorophyllLoss({ chlorophyllRatio: 0.92, commodityId: "bayam" });
  assert(
    visualFresh.isHumanConsumable === true && visualFresh.chlorophyllLossPercent === 8.0,
    "Sayuran berklorofil 92% tervalidasi layak konsumsi manusia dengan kehilangan klorofil 8%",
    `Loss: ${visualFresh.chlorophyllLossPercent}%, Condition: '${visualFresh.estimatedCondition}'`
  );
  const visualSpoiled = qualityGateAgent.evaluateChlorophyllLoss({ chlorophyllRatio: 0.10, commodityId: "kangkung" });
  assert(
    visualSpoiled.isHumanConsumable === false && visualSpoiled.gateStatus === "blocked",
    "Sayuran dengan klorofil 10% (kuning kecokelatan) terdeteksi tidak layak pangan manusia",
    `Loss: ${visualSpoiled.chlorophyllLossPercent}%, Condition: '${visualSpoiled.estimatedCondition}'`
  );

  // Test 8: Penalti reputasi pedagang saat terbukti melakukan moral hazard
  console.log("\n[Test 8] Pengujian Penalti Reputasi Pedagang saat Moral Hazard");
  const penaltyResult = await verifyHumanGradeIntegrity({
    commodityId: "bayam",
    hoursOnDisplay: 2.0,
    requestedTier: "tier_3",
    vendorId: "vendor_kramat_nakal",
    chlorophyllRatio: 0.95,
  });
  assert(
    penaltyResult.reputationPenaltyApplied === 5,
    "Sistem menerapkan penalti pengurangan 5 poin reputasi bagi pedagang yang memicu moral hazard",
    `reputationPenaltyApplied: ${penaltyResult.reputationPenaltyApplied}`
  );
  assert(
    !!penaltyResult.visualVerification && penaltyResult.visualVerification.isHumanConsumable === true,
    "Hasil inspeksi visual klorofil terlampir pada verifikasi gerbang mutu",
    `Visual Loss: ${penaltyResult.visualVerification?.chlorophyllLossPercent}%`
  );
  // Ringkasan hasil test
  console.log(`\n🎉 HASIL PENGUJIAN AKHIR PSR-21: ${passedCount} LULUS, ${failedCount} GAGAL\n`);

  if (failedCount > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

runQualityGateTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
