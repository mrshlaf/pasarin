/**
 * Skrip Pengujian Unit Mandiri: PSR-31 (24-Hour Market Metabolism Simulation Trial).
 * Memverifikasi Kriteria Penerimaan (DoD):
 * 1. Seluruh 5 tahapan siklus 24 jam berhasil disimulasikan dari hulu ke hilir tanpa kendala.
 * 2. Angka penyelamatan surplus sayuran terbukti melampaui ambang batas efisiensi DLH DKI (>= 90%).
 * 3. Seluruh 3 Invarian Kritis (Invarian 1, 2, 3) terverifikasi lolos 100%.
 */

import { run24HourMarketMetabolismTrial } from "../src/lib/marketMetabolismSimulator";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? ` -> ${detail}` : ""}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    failedCount++;
  }
}

async function runMetabolismTrialTests() {
  console.log("================================================================================");
  console.log("  PENGUJIAN UNIT MANDIRI: PSR-31 (24-HOUR MARKET METABOLISM SIMULATION TRIAL)");
  console.log("  Fokus: Validasi 5 Fase Sirkadian, Target Efisiensi >=90%, & Invarian Kritis");
  console.log("================================================================================\n");

  const report = await run24HourMarketMetabolismTrial(true);

  // Test 1: Verifikasi Kelengkapan 5 Fase Sirkadian
  console.log("[Test 1] Kelengkapan Eksekusi 5 Fase Sirkadian Pasar");
  assert(
    report.allPhasesCompleted === true && report.phasesCount === 5,
    "Seluruh 5 fase sirkadian (Subuh, Terik, Cron 14:30, Hujan, Handover) sukses dieksekusi",
    `${report.phasesCount}/5 Fase Selesai`
  );

  report.phaseLogs.forEach((p, idx) => {
    assert(
      p.status === "COMPLETED",
      `Fase ${idx + 1} (${p.phase}) tervalidasi tuntas pada jam ${p.timeClock}`,
      p.actionSummary
    );
  });

  // Test 2: Ambang Batas Efisiensi Pengalihan Sampah Organik (Target DLH DKI >= 90%)
  console.log("\n[Test 2] Efisiensi Penyelamatan Surplus dari TPA Bantar Gebang");
  assert(
    report.meetsDlhThreshold === true,
    "Target DLH DKI Terpenuhi: Efisiensi pengalihan sampah organik mencapai minimal 90%",
    `Efisiensi: ${report.wasteDiversionEfficiencyPct}%`
  );
  assert(
    report.totalRescuedKg > 1000,
    "Total tonase komoditas terselamatkan melampaui 1.000 kg",
    `Total: ${report.totalRescuedKg} kg dari surplus ${report.totalProjectedSurplusKg} kg`
  );

  // Test 3: Audit Kepatuhan 3 Invarian Kritis
  console.log("\n[Test 3] Audit Kepatuhan 3 Invarian Kritis");
  assert(
    report.invariantsAudit.invariant1ZeroEdibleToFeed === true,
    "Invarian 1 (Zero Edible Food to Feed): Makanan layak konsumsi manusia diblokir dari sentra maggot",
    "Invarian 1 Lolos"
  );
  assert(
    report.invariantsAudit.invariant2StrictPriceOrdering === true,
    "Invarian 2 (Strict Price Ordering): P_Tier1 > P_Tier2 >= P_Tier3 >= Rp 1.500/kg",
    "Invarian 2 Lolos"
  );
  assert(
    report.invariantsAudit.invariant3ThirtyMinuteWindow === true,
    "Invarian 3 (30-Minute Priority Window): Jendela reservasi eksklusif Dapur Sosial aktif",
    "Invarian 3 Lolos"
  );
  assert(
    report.invariantsAudit.allInvariantsPassed === true,
    "Seluruh 3 Invarian Kritis terverifikasi lolos 100% tanpa pelanggaran etis",
    "100% Invariants Compliant"
  );

  // Test 4: Akuntansi Lingkungan & Keuangan Escrow
  console.log("\n[Test 4] Akuntansi Lingkungan IPCC 2006 & Settlement Finansial");
  assert(
    report.environmentalImpact.methaneAvoidedKg > 0 && report.environmentalImpact.carbonOffsetCo2eKg > 0,
    "Potensi pencegahan gas metana dan reduksi emisi karbon terhitung valid",
    `${report.environmentalImpact.methaneAvoidedKg} kg CH4 | ${report.environmentalImpact.carbonOffsetCo2eKg} kg CO2e`
  );
  assert(
    report.financialSettlement.disputesCount === 0 && report.financialSettlement.totalVendorWalletCreditedIdr > 0,
    "Pelepasan dana escrow ke dompet pedagang berlangsung mulus tanpa sengketa transaksi",
    `Kredit: Rp ${report.financialSettlement.totalVendorWalletCreditedIdr.toLocaleString("id-ID")}`
  );

  console.log("\n================================================================================");
  console.log(`HASIL AKHIR PENGUJIAN PSR-31: ${passedCount} LULUS, ${failedCount} GAGAL`);
  console.log("================================================================================\n");

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

runMetabolismTrialTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
