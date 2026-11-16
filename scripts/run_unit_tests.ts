/**
 * Skrip Pelaksana Testbench Pengujian Sesi Kelas (PSR-39 / CLI Test Runner).
 * Mengeksekusi master testbench 13 suite pengujian unit dan memvalidasi kriteria kelulusan 100%.
 *
 * Cakupan Pengujian:
 * - Suite 1 (PSR-5): Telemetri Cuaca Hiperlokal & In-Memory Cache 15 Menit.
 * - Suite 2 (PSR-14): Kinetika Peluruhan Biologis Arrhenius-Q10 & Laju Respirasi Daun.
 * - Suite 3 (PSR-15): Model Redaman Pengunjung Pasar saat Hujan Lebat (Penurunan 48%).
 * - Suite 4 (PSR-20): Inverse Surge Dynamic Pricing & Proteksi Price Floor Modal.
 * - Suite 5 (PSR-19): Prediksi Surplus Komposit & Validasi Baseline 1.240 kg.
 * - Suite 6 (PSR-21): Gerbang Mutu Etis, Anti-Moral Hazard & Invarian 1.
 * - Suite 7 (PSR-17): Google Gemini 2.0 Flash ReAct Agent Core (Maks 5 Putaran).
 * - Suite 8 (PSR-18): Tool Calling Registry & Dekomposisi Kueri Bahasa Alami.
 * - Suite 9 (PSR-40): Autentikasi Supabase Auth & Penegakan Isolasi 7 Peran.
 * - Suite 10 (PSR-3, 4, 24, 25): API Response Envelope & Telegram Inline Gateway.
 * - Suite 11 (PSR-16): Integritas Master Data 30 Kios & 30 Komoditas Pasar Kramat Jati.
 * - Suite 12 (PSR-31, 37): Urutan Harga Berjenjang, QRIS Escrow, & Uji Metabolisme 24 Jam.
 * - Suite 13 (PSR-22): Mesin Pencocokan Sirkular 3-Tier & Formula Haversine.
 */

import { runMasterInClassTestSuite } from "../src/lib/inClassTestbench";

// Menjalankan master in-class testbench suite PSR-39 secara asinkron
runMasterInClassTestSuite()
  .then((res) => {
    // Memverifikasi apakah seluruh asersi pengujian lulus 100% tanpa ada kegagalan
    if (!res.isAllPassed || res.failedAssertions > 0) {
      // Keluar dengan status kode 1 (gagal) jika ada asersi yang tidak memenuhi syarat
      process.exit(1);
    } else {
      // Keluar dengan status kode 0 (sukses) jika seluruh asersi terverifikasi hijau
      process.exit(0);
    }
  })
  .catch((err) => {
    // Menangkap dan mencetak galat fatal jika terjadi crash pada test runner
    console.error("Fatal Test Suite Crash:", err);
    process.exit(1);
  });
