/**
 * Skrip Pengujian Unit Mandiri: PSR-23 (Priority Time-Window Dispatcher Tier 2).
 * Memverifikasi:
 * 1. Penghitung waktu mundur 30 menit aktif segera setelah penawaran Tier 2 diterbitkan.
 * 2. Pihak budidaya maggot diblokir dari melakukan klaim selama masa reservasi sosial masih berlangsung.
 * 3. Pengalihan otomatis ke pakan biomassa maggot (Tier 3) berjalan mandiri jika jendela waktu berakhir tanpa klaim sosial.
 */

import {
  SOCIAL_RESERVATION_WINDOW_MINUTES,
  evaluateTier2PriorityWindow,
  validateClaimAgainstPriorityWindow,
  processPriorityWindowDowngrades,
} from "../src/lib/priorityWindowDispatcher";
import { RescueOffer } from "../src/lib/simulationStore";

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

async function runPriorityWindowTests() {
  console.log("================================================================================");
  console.log("  PENGUJIAN UNIT MANDIRI: PSR-23 (PRIORITY TIME-WINDOW DISPATCHER TIER 2)");
  console.log("  Fokus: Invarian 3 (30-Minute Social Reservation Window & Auto-Downgrade)");
  console.log("================================================================================\n");

  const now = new Date();

  // Test 1: Penawaran Tier 2 baru dibuat (elapsed 0 menit)
  console.log("[Test 1] Evaluasi Penawaran Baru Tier 2 (0 Menit Berlalu)");
  const freshOffer: RescueOffer = {
    id: "ofr_test_t2_01",
    stockId: "stk_01",
    vendorId: "vendor_kramat_01",
    commodityId: "pakcoy",
    targetTier: "tier_2",
    quantityKg: 40,
    originalPricePerKg: 8000,
    salvagePricePerKg: 1200,
    discountPercentage: 85,
    totalAmountIdr: 48000,
    expiresInMinutes: 30,
    status: "active",
    paymentStatus: "unpaid",
  };

  const freshEval = evaluateTier2PriorityWindow(freshOffer, now);
  assert(freshEval.isWindowActive === true, "Jendela reservasi 30 menit terdeteksi aktif");
  assert(freshEval.remainingMinutes === 30, "Sisa waktu reservasi eksklusif tepat 30 menit", `${freshEval.remainingMinutes} menit`);
  assert(freshEval.canSocialKitchenClaim === true, "Dapur Sosial diizinkan mengklaim alokasi Tier 2");
  assert(freshEval.canMaggotClaim === false, "Invarian 3: Sentra Maggot DILARANG mengklaim pada masa reservasi");

  // Test 2: Validasi penolakan klaim Maggot selama jendela 30 menit aktif
  console.log("\n[Test 2] Validasi Gerbang Etis (validateClaimAgainstPriorityWindow)");
  const maggotClaimBlocked = validateClaimAgainstPriorityWindow(freshOffer, "maggot", now);
  assert(
    maggotClaimBlocked.allowed === false && !!maggotClaimBlocked.reason,
    "Klaim Maggot ditolak secara terprogram selama jendela 30 menit berlangsung",
    maggotClaimBlocked.reason
  );

  const socialClaimAllowed = validateClaimAgainstPriorityWindow(freshOffer, "social_kitchen", now);
  assert(socialClaimAllowed.allowed === true, "Klaim Dapur Sosial diizinkan secara penuh", "Akses Diizinkan");

  // Test 3: Evaluasi Penawaran setelah 35 menit berlalu (Jendela Habis)
  console.log("\n[Test 3] Evaluasi Penawaran Setelah 35 Menit Berlalu Tanpa Klaim");
  const pastTime = new Date(now.getTime() - 35 * 60000);
  const expiredOffer: RescueOffer = {
    ...freshOffer,
    id: "ofr_test_t2_expired",
  };

  const expiredEval = evaluateTier2PriorityWindow(
    { ...expiredOffer, createdAt: pastTime },
    now
  );
  assert(expiredEval.isWindowActive === false, "Jendela prioritas 30 menit terdeteksi telah kadaluarsa");
  assert(expiredEval.remainingMinutes === 0, "Sisa waktu reservasi adalah 0 menit");
  assert(expiredEval.actionDecision === "eligible_tier3_downgrade", "Status penawaran menjadi eligible_tier3_downgrade");

  // Test 4: Otomasi pengalihan (auto-downgrade) ke Tier 3 saat masa reservasi selesai
  console.log("\n[Test 4] Pemrosesan Auto-Downgrade ke Pakan Biomassa Maggot (Tier 3)");
  const testOfferList: RescueOffer[] = [
    { ...freshOffer, id: "offer_active", createdAt: now.toISOString() },
    { ...expiredOffer, id: "offer_expired", createdAt: pastTime.toISOString() },
  ];

  const downgradeResult = processPriorityWindowDowngrades(testOfferList, now);
  assert(downgradeResult.downgradedCount === 1, "Tepat 1 tiket yang masa reservasinya habis dialihkan", "1 Tiket Teralihkan");
  
  const downgradedItem = downgradeResult.updatedOffers.find((o) => o.id === "offer_expired");
  assert(
    downgradedItem?.targetTier === "tier_3" && downgradedItem?.salvagePricePerKg === 500,
    "Komoditas kadaluarsa sukses turun kasta ke Tier 3 (Harga Biomassa Rp 500/kg)",
    `Tier: ${downgradedItem?.targetTier} | Harga: Rp ${downgradedItem?.salvagePricePerKg}`
  );

  console.log("\n================================================================================");
  console.log(`HASIL AKHIR PENGUJIAN PSR-23: ${passedCount} LULUS, ${failedCount} GAGAL`);
  console.log("================================================================================\n");

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

runPriorityWindowTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
