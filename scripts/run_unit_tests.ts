/**
 * Skrip Pelaksana Testbench Pengujian Sesi Kelas (PSR-39 / CLI Test Runner).
 * Mengeksekusi master testbench 12 suite pengujian unit dan memvalidasi kriteria kelulusan 100%.
 */

import { runMasterInClassTestSuite } from "../src/lib/inClassTestbench";

runMasterInClassTestSuite()
  .then((res) => {
    if (!res.isAllPassed || res.failedAssertions > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error("Fatal Test Suite Crash:", err);
    process.exit(1);
  });
