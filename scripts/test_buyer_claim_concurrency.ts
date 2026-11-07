/**
 * Automated Test Suite untuk Validasi Kanal Siaran Instan & Konkurensi Klaim Cepat (PSR-26).
 * Menguji format pesan siaran, uji balapan serentak (race condition / double claim),
 * penolakan santun pembeli terlambat, dan penegakan batas wewenang tier.
 */

import {
  generateBuyerBroadcastMessage,
  executeFastClaim,
  resetClaimLocks,
  buyerClaimChannel,
} from "../src/lib/buyerClaimChannel";
import { CIRCULAR_BUYERS } from "../src/data/buyers";
import { RescueOffer } from "../src/lib/simulationStore";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testId: string, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  \x1b[32m✔ [PASS]\x1b[0m \x1b[1m${testId}\x1b[0m: ${testName}${detail ? ` \x1b[90m(${detail})\x1b[0m` : ""}`);
    passedTests++;
  } else {
    console.error(`  \x1b[31m✖ [FAIL]\x1b[0m \x1b[1m${testId}\x1b[0m: ${testName}${detail ? ` \x1b[31m(${detail})\x1b[0m` : ""}`);
    failedTests++;
  }
}

async function runBuyerClaimTestSuite() {
  console.log("\n================================================================================");
  console.log("  PASARIN PSR-26 BUYER INSTANT ALERT & FAST CLAIM CONCURRENCY TEST SUITE");
  console.log("  Mata Kuliah : Rekayasa Perangkat Lunak - Fakultas Teknik Universitas Indonesia");
  console.log(`  Waktu Uji   : ${new Date().toLocaleString("id-ID")}`);
  console.log("================================================================================\n");

  resetClaimLocks();

  // --- Test 1: Pembangkitan Pesan Siaran Instan Pembeli ---
  console.log("\x1b[33m▶ [Uji 1] Integritas Format Pesan Siaran Telegram Pembeli (Broadcast Payload)\x1b[0m");

  const sampleOffer = {
    id: "ofr_broadcast_01",
    commodityId: "kangkung",
    quantityKg: 40,
    originalPricePerKg: 6000,
    salvagePricePerKg: 2500,
    discountPercentage: 58,
    totalAmountIdr: 100000,
    targetTier: "tier_1" as const,
    expiresInMinutes: 30,
  };

  const sampleBuyer = CIRCULAR_BUYERS.find((b) => b.id === "buyer_warteg_01")!;
  const broadcastMsg = generateBuyerBroadcastMessage(sampleOffer, sampleBuyer);

  assert(
    broadcastMsg.formattedMessageText.includes("Warteg Kharisma Bahari Condet") &&
    broadcastMsg.formattedMessageText.includes("Diskon 58%") &&
    broadcastMsg.formattedMessageText.includes("Kangkung Darat"),
    "TC-BC01",
    "Pesan siaran memuat nama mitra, nama komoditas, persentase hemat modal, dan link klaim cepat",
    `Penerima: ${broadcastMsg.recipientName}, Komoditas: ${broadcastMsg.commodityName}`
  );

  assert(
    broadcastMsg.totalSavingsIdr === (6000 - 2500) * 40 && broadcastMsg.totalSavingsIdr === 140000,
    "TC-BC02",
    "Kalkulasi total penghematan modal belanja terverifikasi akurat (Rp 140.000)",
    `Total Hemat: Rp ${broadcastMsg.totalSavingsIdr.toLocaleString("id-ID")}`
  );

  // --- Test 2: Eksekusi Klaim Normal Tunggal ---
  console.log("\n\x1b[33m▶ [Uji 2] Eksekusi Klaim Normal Tunggal (Single Valid Claim)\x1b[0m");

  const singlePool: RescueOffer[] = [
    {
      id: "ofr_single_01",
      stockId: "stk_01",
      vendorId: "vendor_kramat_01",
      commodityId: "kangkung",
      targetTier: "tier_1",
      quantityKg: 45,
      originalPricePerKg: 6000,
      salvagePricePerKg: 2500,
      discountPercentage: 58,
      totalAmountIdr: 112500,
      expiresInMinutes: 45,
      status: "active",
      paymentStatus: "unpaid",
    },
  ];

  const singleClaimResult = await executeFastClaim(singlePool, "ofr_single_01", {
    buyerId: "buyer_warteg_01",
    buyerName: "Warteg Kharisma Bahari Condet",
    role: "warteg",
  });

  assert(
    singleClaimResult.success === true &&
    singlePool[0].status === "claimed" &&
    singlePool[0].claimedBy === "Warteg Kharisma Bahari Condet",
    "TC-BC03",
    "Klaim pertama berhasil mengubah status lot menjadi 'claimed' dan mencatat nama pemenang",
    `Status: ${singlePool[0].status}, Pemenang: ${singlePool[0].claimedBy}`
  );

  assert(
    typeof singleClaimResult.qrisPaymentReference === "string" &&
    typeof singleClaimResult.podVerificationToken === "string",
    "TC-BC04",
    "Klaim sukses menerbitkan referensi pembayaran QRIS dan token verifikasi fisik serah terima PoD",
    `QRIS Ref: ${singleClaimResult.qrisPaymentReference}`
  );

  // --- Test 3: UJI BALAPAN KONKURENSI SERENTAK (RACE CONDITION & ATOMIC LOCK) ---
  console.log("\n\x1b[33m▶ [Uji 3] Simulasi Balapan Konkurensi Serentak 5 Pembeli (Atomic Concurrency Test)\x1b[0m");

  const hotLotId = "ofr_hot_commodity_99";
  const concurrentPool: RescueOffer[] = [
    {
      id: hotLotId,
      stockId: "stk_rare_01",
      vendorId: "vendor_kramat_02",
      commodityId: "bayam",
      targetTier: "tier_1",
      quantityKg: 30,
      originalPricePerKg: 7000,
      salvagePricePerKg: 2500,
      discountPercentage: 64,
      totalAmountIdr: 75000,
      expiresInMinutes: 20,
      status: "active",
      paymentStatus: "unpaid",
    },
  ];

  const competingBuyers = [
    { buyerId: "buyer_01", buyerName: "Warteg Condet Raya", role: "warteg" as const },
    { buyerId: "buyer_02", buyerName: "Warteg Ibu Yayu Hek", role: "warteg" as const },
    { buyerId: "buyer_03", buyerName: "Warteg Barokah Cililitan", role: "warteg" as const },
    { buyerId: "buyer_04", buyerName: "Katering Cawang Baru", role: "warteg" as const },
    { buyerId: "buyer_05", buyerName: "Warteg TMII Pintu 1", role: "warteg" as const },
  ];

  // Eksekusi 5 permintaan klaim secara serentak persis pada milidetik yang sama
  const racePromises = competingBuyers.map((b) =>
    executeFastClaim(concurrentPool, hotLotId, b)
  );

  const raceResults = await Promise.all(racePromises);

  const successCount = raceResults.filter((r) => r.success).length;
  const rejectedCount = raceResults.filter((r) => !r.success).length;
  const winner = raceResults.find((r) => r.success)!;

  assert(
    successCount === 1,
    "TC-BC05",
    "Proteksi Konkurensi Atomik: Dari 5 pembeli serentak, TEPAT 1 pembeli yang berhasil mengamankan lot",
    `Sukses: ${successCount}, Tertolak: ${rejectedCount}, Pemenang: ${winner?.claimedBy}`
  );

  assert(
    rejectedCount === 4,
    "TC-BC06",
    "Empat pembeli lain yang kalah cepat otomatis ditolak untuk mencegah klaim ganda (Zero Double Claim)",
    `Total pembeli yang gagal balapan klaim: ${rejectedCount}`
  );

  // --- Test 4: Uji Pesan Penolakan Santun untuk Pembeli Terlambat ---
  console.log("\n\x1b[33m▶ [Uji 4] Validasi Pesan Penolakan Santun & Informatif (Polite Rejection)\x1b[0m");

  const lateBuyerResult = await executeFastClaim(concurrentPool, hotLotId, {
    buyerId: "buyer_late_06",
    buyerName: "Warteg Telat Tiba",
    role: "warteg",
  });

  assert(
    lateBuyerResult.success === false &&
    lateBuyerResult.code === "ALREADY_CLAIMED" &&
    lateBuyerResult.message.includes("telah resmi diklaim oleh"),
    "TC-BC07",
    "Pembeli terlambat menerima pesan santun yang menginformasikan bahwa lot telah diambil mitra lain",
    `Pesan balasan: '${lateBuyerResult.message}'`
  );

  // --- Test 5: Validasi Keselarasan Peran terhadap Kategori Tier ---
  console.log("\n\x1b[33m▶ [Uji 5] Validasi Batas Otoritas Peran Sirkular (Role Authorization)\x1b[0m");

  const activeTier1Pool: RescueOffer[] = [
    {
      id: "ofr_auth_test_01",
      stockId: "stk_01",
      vendorId: "vendor_kramat_01",
      commodityId: "kangkung",
      targetTier: "tier_1",
      quantityKg: 30,
      originalPricePerKg: 6000,
      salvagePricePerKg: 2500,
      discountPercentage: 58,
      totalAmountIdr: 75000,
      expiresInMinutes: 30,
      status: "active",
      paymentStatus: "unpaid",
    },
  ];

  // Peternak Maggot mencoba mengklaim lot makanan manusia Tier 1 yang masih aktif
  const unauthorizedClaim = await executeFastClaim(activeTier1Pool, "ofr_auth_test_01", {
    buyerId: "buyer_maggot_01",
    buyerName: "Sentra Maggot BSF",
    role: "maggot",
  });

  assert(
    unauthorizedClaim.success === false && unauthorizedClaim.code === "TIER_MISMATCH",
    "TC-BC08",
    "Sistem memblokir akun Maggot yang mencoba mengklaim penawaran Tier 1 Warteg (Anti-Misallocation)",
    `Kode galat: ${unauthorizedClaim.code}, Pesan: '${unauthorizedClaim.message}'`
  );

  // --- Test 6: SLA Kecepatan Eksekusi Transaksi (< 50 ms) ---
  console.log("\n\x1b[33m▶ [Uji 6] Tolok Ukur Latensi Transaksi Klaim (< 50 ms SLA)\x1b[0m");

  const freshLotPool: RescueOffer[] = [
    {
      id: "ofr_speed_test",
      stockId: "stk_05",
      vendorId: "vendor_kramat_03",
      commodityId: "pakcoy",
      targetTier: "tier_2",
      quantityKg: 20,
      originalPricePerKg: 8000,
      salvagePricePerKg: 1200,
      discountPercentage: 85,
      totalAmountIdr: 24000,
      expiresInMinutes: 30,
      status: "active",
      paymentStatus: "unpaid",
    },
  ];

  const speedClaim = await executeFastClaim(freshLotPool, "ofr_speed_test", {
    buyerId: "buyer_social_01",
    buyerName: "Dapur Pangan Yatim Al-Khairat",
    role: "social_kitchen",
  });

  assert(
    speedClaim.success === true && speedClaim.executionDurationMs < 50.0,
    "TC-BC09",
    "Eksekusi penguncian atomik dan mutasi status tuntas dalam durasi kilat (< 50 ms)",
    `Durasi aktual: ${speedClaim.executionDurationMs} ms (Target: < 50 ms)`
  );

  // --- Test 7: Integritas Fasad Modul buyerClaimChannel ---
  console.log("\n\x1b[33m▶ [Uji 7] Integritas Fasad Modul buyerClaimChannel\x1b[0m");

  assert(
    typeof buyerClaimChannel.generateBuyerBroadcastMessage === "function" &&
    typeof buyerClaimChannel.executeFastClaim === "function",
    "TC-BC10",
    "Fasad buyerClaimChannel mengekspos generator pesan dan eksekutor klaim atomik secara terpadu",
    "Fasad Channel Valid"
  );

  console.log("\n================================================================================");
  if (failedTests === 0) {
    console.log(`\x1b[32m🎉 SEMUA PENGUJIAN PSR-26 LULUS 100%! (${passedTests}/${totalTests} TESTS PASSED)\x1b[0m`);
    console.log("✔ Seluruh Kriteria Penerimaan (DoD) Tiket PSR-26 Terpenuhi Sempurna.");
  } else {
    console.error(`\x1b[31m✖ PENGUJIAN GAGAL: ${failedTests} pengujian tidak memenuhi syarat.\x1b[0m`);
  }
  console.log("================================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runBuyerClaimTestSuite().catch((err) => {
  console.error("Testbench execution error:", err);
  process.exit(1);
});
