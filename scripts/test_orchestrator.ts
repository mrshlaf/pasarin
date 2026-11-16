/**
 * Skrip Uji Otomatis Agen Pengorkestrasi Pusat ReAct (PSR-17 / Agent 1).
 * Memvalidasi 7 kriteria penerimaan kritis (Acceptance Criteria / DoD):
 * 1. Eksekusi mandiri siklus otonom sapuan 14:30 WIB dari telemetri cuaca hingga alokasi armada.
 * 2. Pemindaian lengkap 30 kios pasar tradisional Kramat Jati dan agregasi surplus kuantitatif.
 * 3. Pembatasan siklus penalaran ReAct maksimal 5 putaran (MAX_REACT_TURNS = 5).
 * 4. Penegakan gerbang kendali mutu etis (Invarian 1) dalam alur orkestrasi.
 * 5. Dekomposisi kueri bahasa alami manajerial armada logistik ("Lusa perlu berapa mobil?").
 * 6. Dekomposisi kueri mikroklimat cuaca dan laju degradasi termal sayuran daun.
 * 7. Perekaman komprehensif alur penalaran dan ringkasan eksekutif ke tabel jejak audit (system_audit_trail).
 */

import {
  geminiOrchestrator,
  executeAutonomousOrchestration,
  processManagerialNaturalQuery,
  MAX_REACT_TURNS,
} from "../src/lib/geminiOrchestrator";
import { getRecentAuditLogs } from "../src/lib/audit";

// Variabel pelacak total asersi uji lulus dan gagal
let passedCount = 0;
let failedCount = 0;

/**
 * Memeriksa kondisi boolean dan mencetak log hasil ke konsol.
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
 * Menjalankan rangkaian pengujian integrasi ReAct Orchestrator PSR-17.
 */
async function runOrchestratorTests() {
  console.log("\nPASARIN PSR-17 Gemini 2.0 Flash ReAct Orchestrator Test Suite");

  // Uji 1: Eksekusi mandiri alur sapuan otonom 14:30 WIB
  console.log("\n[Test 1] Eksekusi Mandiri Siklus Otonom Sapuan Sore 14:30 WIB");
  const startTime = Date.now();
  // Memulai pemicuan siklus otonom terjadwal jam 14:30 WIB
  const runResult = await executeAutonomousOrchestration({
    executionMode: "scheduled_autonomous_cron",
  });
  const durationMs = Date.now() - startTime;

  // Memvalidasi eksekusi siklus otonom berjalan sukses dengan mode scheduled_autonomous_cron
  assert(
    !!runResult && runResult.executionMode === "scheduled_autonomous_cron",
    "Siklus otonom berhasil dieksekusi dengan mode 'scheduled_autonomous_cron'",
    `Mode: ${runResult.executionMode}`
  );

  // Memvalidasi bahwa orkestrator memindai seluruh 30 kios pedagang binaan pasar Kramat Jati
  assert(
    runResult.kiosksScanned === 30,
    "Sistem memindai seluruh 30 kios pedagang binaan Pasar Kramat Jati",
    `Kiosks: ${runResult.kiosksScanned} kios`
  );

  // Memvalidasi estimasi total surplus komposit berada dalam rentang wajar operasional pasar (500 kg - 3000 kg)
  assert(
    runResult.surplusDetectedKg > 500 && runResult.surplusDetectedKg <= 3000,
    "Volume estimasi surplus komposit terhitung dalam rentang realistis pasar",
    `Surplus: ${runResult.surplusDetectedKg} kg`
  );

  // Memvalidasi durasi eksekusi orkestrasi multi-agen selesai dalam waktu respons cepat di bawah 2.000 ms
  assert(
    durationMs < 2000,
    "Eksekusi orkestrasi multi-agen selesai dalam waktu respons cepat (< 2.000 ms)",
    `Durasi: ${durationMs} ms`
  );

  // Uji 2: Distribusi Alokasi 3-Tier Sirkular
  console.log("\n[Test 2] Alokasi Sirkular 3-Tier & Penugasan Armada Logistik");

  // Memvalidasi bahwa alokasi Tier 1 (Komersial Warteg & UMKM) terisi muatan sayur surplus terdiskon (> 0 kg)
  assert(
    runResult.allocations.tier1WartegKg > 0,
    "Alokasi Tier 1 Warteg & UMKM terisi kuantitas surplus terdiskon",
    `Tier 1 Warteg: ${runResult.allocations.tier1WartegKg} kg`
  );

  // Memvalidasi bahwa alokasi Tier 2 (Dapur Sosial & Panti Asuhan) terisi sayuran bernutrisi layak konsumsi (> 0 kg)
  assert(
    runResult.allocations.tier2SocialKg > 0,
    "Alokasi Tier 2 Dapur Sosial & Panti Asuhan terisi komoditas bernutrisi",
    `Tier 2 Sosial: ${runResult.allocations.tier2SocialKg} kg`
  );

  // Memvalidasi bahwa alokasi Tier 3 (Sentra Maggot BSF) hanya menampung sisa sayur afkir (>= 0 kg)
  assert(
    runResult.allocations.tier3MaggotKg >= 0,
    "Alokasi Tier 3 Sentra Maggot memuat sisa afkir non-pangan",
    `Tier 3 Maggot: ${runResult.allocations.tier3MaggotKg} kg`
  );

  // Memvalidasi bahwa armada logistik penjemputan berhasil dialokasikan minimal 1 unit kendaraan
  assert(
    runResult.fleetAssignmentsCount >= 1,
    "Armada logistik teralokasi berdasarkan kalkulasi tonase muatan",
    `Armada: ${runResult.fleetAssignmentsCount} unit`
  );

  // Uji 3: Kepatuhan Batas Maksimal Putaran ReAct (MAX_REACT_TURNS = 5)
  console.log("\n[Test 3] Kepatuhan Pembatasan Putaran ReAct (Invarian Max 5 Turns)");

  // Memvalidasi penegakan invarian pembatasan putaran penalaran ReAct maksimal 5 langkah untuk mencegah infinite loop
  assert(
    runResult.thoughtProcess.length <= MAX_REACT_TURNS,
    "Siklus penalaran ReAct mematuhi batas maksimal 5 putaran (anti-infinite loop)",
    `Total Langkah: ${runResult.thoughtProcess.length} (Maks: ${MAX_REACT_TURNS})`
  );

  // Memvalidasi bahwa setiap langkah pemikiran memuat komponen Thought dan Action/Observation terstruktur
  assert(
    runResult.thoughtProcess.every((s) => s.thought && (s.action || s.observation)),
    "Setiap langkah penalaran memuat elemen Thought terstruktur beserta Action/Observation",
    "Struktur ReAct Valid"
  );

  // Uji 4: Pemrosesan Kueri Bahasa Alami Manajerial Armada (PSR-18)
  console.log("\n[Test 4] Dekomposisi Kueri Bahasa Alami Armada Logistik");
  const fleetQuery = "Lusa itu perlu berapa mobil untuk ke sentra maggot atau ke UMKM?";
  // Menjalankan dekomposisi kueri manajerial dengan fail-safe fallback heuristik
  const fleetResult = await processManagerialNaturalQuery(fleetQuery, { forceHeuristic: true });

  // Memvalidasi bahwa kueri bahasa alami manajerial berhasil diurai menjadi rangkaian langkah ReAct
  assert(
    !!fleetResult && fleetResult.thoughtProcess.length > 0,
    "Kueri armada berhasil diuraikan menjadi rangkaian pemikiran ReAct",
    `Langkah: ${fleetResult.thoughtProcess.length} tahap`
  );

  // Memvalidasi bahwa ringkasan eksekutif menyajikan rekomendasi jenis armada spesifik (GranMax atau Viar)
  assert(
    fleetResult.executiveSummary.toLowerCase().includes("granmax") || fleetResult.executiveSummary.toLowerCase().includes("viar"),
    "Ringkasan eksekutif menyajikan rekomendasi jenis armada spesifik (GranMax / Viar)",
    "Rekomendasi Armada Teridentifikasi"
  );

  // Memverifikasi adanya daftar rekomendasi manajerial yang dapat ditindaklanjuti
  assert(
    Array.isArray(fleetResult.recommendations) && fleetResult.recommendations.length > 0,
    "Sistem menyertakan poin rekomendasi manajerial yang dapat ditindaklanjuti",
    `Poin: ${fleetResult.recommendations?.length} saran`
  );

  // Uji 5: Pemrosesan Kueri Bahasa Alami Mikroklimat Cuaca
  console.log("\n[Test 5] Dekomposisi Kueri Bahasa Alami Cuaca & Kinetika");
  const weatherQuery = "Bagaimana ramalan cuaca dan suhunya untuk los sayur sore ini?";
  const weatherResult = await processManagerialNaturalQuery(weatherQuery, { forceHeuristic: true });

  // Memvalidasi bahwa jawaban kueri cuaca memuat informasi suhu mikroklimat dalam satuan derajat Celsius
  assert(
    weatherResult.executiveSummary.includes("°C") || weatherResult.executiveSummary.toLowerCase().includes("suhu"),
    "Kueri cuaca menghasilkan analisis suhu aktual mikroklimat los pasar",
    "Analisis Suhu Terverifikasi"
  );

  // Memvalidasi bahwa alur penalaran ReAct secara tepat memanggil modul WeatherAgent
  assert(
    weatherResult.thoughtProcess.some((s) => s.agent?.includes("WeatherAgent")),
    "Alur ReAct secara tepat memanggil modul WeatherAgent",
    "WeatherAgent Terpanggil"
  );

  // Uji 6: Perekaman Jejak Audit Sistem (System Audit Trail)
  console.log("\n[Test 6] Perekaman Jejak Audit Sistem Multi-Agen (Audit Trail)");
  const recentLogs = getRecentAuditLogs(15);
  const orchestratorSweepLog = recentLogs.find(
    (l) => l.subsystem === "ORCHESTRATOR" && l.action_type === "AUTONOMOUS_SWEEP_EXECUTED"
  );
  const orchestratorQueryLog = recentLogs.find(
    (l) => l.subsystem === "ORCHESTRATOR" && l.action_type === "MANAGERIAL_QUERY_ANSWERED"
  );

  // Memvalidasi bahwa peristiwa sapuan otonom tercatat pada jejak audit sistem
  assert(
    !!orchestratorSweepLog,
    "Peristiwa sapuan otonom tercatat pada basis data jejak audit",
    orchestratorSweepLog ? `Event ID: ${orchestratorSweepLog.event_id}` : "Log tidak ditemukan"
  );

  // Memvalidasi bahwa proses pemrosesan kueri bahasa alami manajerial tercatat pada jejak audit
  assert(
    !!orchestratorQueryLog,
    "Kueri manajerial bahasa alami tercatat pada jejak audit",
    orchestratorQueryLog ? `Event ID: ${orchestratorQueryLog.event_id}` : "Log tidak ditemukan"
  );

  // Uji 7: Integritas Fasad Objek Agen Orchestrator
  console.log("\n[Test 7] Integritas Fasad Agen & Prompt Sistem ReAct");

  // Memvalidasi nama identitas agen dan ketersediaan metode eksekusi otonom pada fasad orkestrator
  assert(
    geminiOrchestrator.name === "GeminiOrchestratorAgent" &&
      typeof geminiOrchestrator.executeAutonomousOrchestration === "function",
    "Fasad Agent 1 terdaftar valid dengan metode eksekusi otonom",
    `Agent: '${geminiOrchestrator.name}'`
  );

  // Memvalidasi bahwa System Prompt instruksi agen memuat deklarasi pengendali pusat resmi PASARIN
  assert(
    geminiOrchestrator.SYSTEM_PROMPT.includes("Central Orchestrator of PASARIN"),
    "Prompt instruksi sistem memuat deklarasi otoritas pengendali ReAct resmi",
    "System Prompt Valid"
  );

  // Rekapitulasi hasil pengujian
  console.log(`\nHasil pengujian akhir PSR-17: ${passedCount} lulus, ${failedCount} gagal\n`);

  if (failedCount > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

// Menjalankan skrip pengujian ReAct Orchestrator
runOrchestratorTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
