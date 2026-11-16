/**
 * Skrip Pengujian Unit Mandiri: PSR-31 (24-Hour Market Metabolism Simulation Trial).
 * Memverifikasi Kriteria Penerimaan (DoD):
 * 1. Seluruh 5 tahapan siklus 24 jam berhasil disimulasikan dari hulu ke hilir tanpa kendala.
 * 2. Angka penyelamatan surplus sayuran terbukti melampaui ambang batas efisiensi DLH DKI (>= 90%).
 * 3. Seluruh 3 Invarian Kritis (Invarian 1, 2, 3) terverifikasi lolos 100%.
 */

import { run24HourMarketMetabolismTrial } from "../src/lib/marketMetabolismSimulator";

// Variabel pelacak jumlah asersi uji
let passedCount = 0;
let failedCount = 0;

/**
 * Fungsi pembantu pencatat asersi uji metabolisme pasar 24 jam.
 *
 * @param condition - Ekspresi kebenaran boolean yang diuji.
 * @param testName - Nama spesifik pengujian.
 * @param detail - Informasi pendukung nilai observasi.
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
 * Runner utama simulasi metabolisme sirkadian 24 jam pasar Kramat Jati PSR-31.
 */
async function runMetabolismTrialTests() {
  console.log("\nPengujian Unit Mandiri: PSR-31 (24-Hour Market Metabolism Simulation Trial)");
  console.log("Fokus: Validasi 5 Fase Sirkadian, Target Efisiensi >=90%, dan Invarian Kritis\n");

  // Menjalankan simulasi penuh siklus harian dari subuh hingga malam
  const report = await run24HourMarketMetabolismTrial();

  // Uji 1: Verifikasi Kelengkapan 5 Fase Sirkadian
  console.log("[Test 1] Kelengkapan Eksekusi 5 Fase Sirkadian Pasar");

  // Memvalidasi bahwa seluruh 5 fase sirkadian pasar (Fase 1 s/d 5) tuntas tanpa interupsi
  assert(
    report.allPhasesCompleted === true && report.phasesCount === 5,
    "Seluruh 5 fase sirkadian (Subuh, Terik, Cron 14:30, Hujan, Handover) sukses dieksekusi",
    `${report.phasesCount}/5 Fase Selesai`
  );

  // Memvalidasi status keberhasilan eksekusi pada setiap log fase sirkadian individu
  report.phaseLogs.forEach((p, idx) => {
    // Memverifikasi status penyelesaian COMPLETED pada masing-masing jam sirkadian
    assert(
      p.status === "COMPLETED",
      `Fase ${idx + 1} (${p.phase}) tervalidasi tuntas pada jam ${p.timeClock}`,
      p.actionSummary
    );
  });

  // Uji 2: Ambang Batas Efisiensi Pengalihan Sampah Organik (Target DLH DKI >= 90%)
  console.log("\n[Test 2] Efisiensi Penyelamatan Surplus dari TPA Bantar Gebang");

  // Memvalidasi bahwa persentase pengalihan sampah organik memenuhi target resmi DLH DKI (>= 90%)
  assert(
    report.meetsDlhThreshold === true,
    "Target DLH DKI Terpenuhi: Efisiensi pengalihan sampah organik mencapai minimal 90%",
    `Efisiensi: ${report.wasteDiversionEfficiencyPct}%`
  );

  // Memverifikasi volume surplus yang berhasil diselamatkan dari TPA melampaui 1.000 kg metrik
  assert(
    report.totalRescuedKg > 1000,
    "Total tonase komoditas terselamatkan melampaui 1.000 kg",
    `Total: ${report.totalRescuedKg} kg dari surplus ${report.totalProjectedSurplusKg} kg`
  );

  // Uji 3: Audit Kepatuhan 3 Invarian Kritis
  console.log("\n[Test 3] Audit Kepatuhan 3 Invarian Kritis");

  // Memvalidasi Invarian 1: 0% makanan layak konsumsi manusia dialihkan ke pakan ternak maggot
  assert(
    report.invariantsAudit.invariant1ZeroEdibleToFeed === true,
    "Invarian 1 (Zero Edible Food to Feed): Makanan layak konsumsi manusia diblokir dari sentra maggot",
    "Invarian 1 Lolos"
  );

  // Memvalidasi Invarian 2: Urutan harga berjenjang secara ketat (P_Tier1 > P_Tier2 >= P_Tier3 >= Rp 1.500/kg)
  assert(
    report.invariantsAudit.invariant2StrictPriceOrdering === true,
    "Invarian 2 (Strict Price Ordering): P_Tier1 > P_Tier2 >= P_Tier3 >= Rp 1.500/kg",
    "Invarian 2 Lolos"
  );

  // Memvalidasi Invarian 3: Hak jendela reservasi eksklusif 30 menit bagi Dapur Sosial terkunci penuh
  assert(
    report.invariantsAudit.invariant3ThirtyMinuteWindow === true,
    "Invarian 3 (30-Minute Priority Window): Jendela reservasi eksklusif Dapur Sosial aktif",
    "Invarian 3 Lolos"
  );

  // Memverifikasi bahwa seluruh 3 invarian kritis lolos secara simultan tanpa anomali etis
  assert(
    report.invariantsAudit.allInvariantsPassed === true,
    "Seluruh 3 Invarian Kritis terverifikasi lolos 100% tanpa pelanggaran etis",
    "100% Invariants Compliant"
  );

  // Uji 4: Akuntansi Lingkungan & Keuangan Escrow
  console.log("\n[Test 4] Akuntansi Lingkungan IPCC 2006 & Settlement Finansial");

  // Memvalidasi formula First Order Decay IPCC 2006 menghasilkan reduksi emisi metana dan CO2e positif
  assert(
    report.environmentalImpact.methaneAvoidedKg > 0 && report.environmentalImpact.carbonOffsetCo2eKg > 0,
    "Potensi pencegahan gas metana dan reduksi emisi karbon terhitung valid",
    `${report.environmentalImpact.methaneAvoidedKg} kg CH4 | ${report.environmentalImpact.carbonOffsetCo2eKg} kg CO2e`
  );

  // Memvalidasi integritas escrow keuangan pasar: nol sengketa (disputesCount = 0) dan dana masuk ke dompet pedagang
  assert(
    report.financialSettlement.disputesCount === 0 && report.financialSettlement.totalVendorWalletCreditedIdr > 0,
    "Pelepasan dana escrow ke dompet pedagang berlangsung mulus tanpa sengketa transaksi",
    `Kredit: Rp ${report.financialSettlement.totalVendorWalletCreditedIdr.toLocaleString("id-ID")}`
  );

  // Rekapitulasi hasil uji
  console.log(`\nHasil akhir pengujian PSR-31: ${passedCount} lulus, ${failedCount} gagal\n`);

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

// Menjalankan skrip uji coba metabolisme pasar 24 jam
runMetabolismTrialTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
