/**
 * Skrip Pengujian Unit Mandiri: PSR-23 (Priority Time-Window Dispatcher Tier 2).
 * Memverifikasi:
 * 1. Penghitung waktu mundur 30 menit aktif segera setelah penawaran Tier 2 diterbitkan.
 * 2. Pihak budidaya maggot diblokir dari melakukan klaim selama masa reservasi sosial masih berlangsung.
 * 3. Pengalihan otomatis ke pakan biomassa maggot (Tier 3) berjalan mandiri jika jendela waktu berakhir tanpa klaim sosial.
 */

import {
  evaluateTier2PriorityWindow,
  validateClaimAgainstPriorityWindow,
  processPriorityWindowDowngrades,
} from "../src/lib/priorityWindowDispatcher";
import { RescueOffer } from "../src/lib/simulationStore";

// Pelacak jumlah asersi uji
let passedCount = 0;
let failedCount = 0;

/**
 * Fungsi pembantu pengecekan asersi uji jendela prioritas 30 menit.
 *
 * @param condition - Ekspresi boolean yang diverifikasi.
 * @param testName - Judul kasus pengujian.
 * @param detail - Detail nilai observasi.
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
 * Runner utama pengujian jendela waktu prioritas Tier 2 (PSR-23).
 */
async function runPriorityWindowTests() {
  console.log("\nPengujian Unit Mandiri: PSR-23 (Priority Time-Window Dispatcher Tier 2)");
  console.log("Fokus: Invarian 3 (30-Minute Social Reservation Window & Auto-Downgrade)\n");

  const now = new Date();

  // Uji 1: Penawaran Tier 2 baru dibuat (elapsed 0 menit)
  console.log("[Test 1] Evaluasi Penawaran Baru Tier 2 (0 Menit Berlalu)");
  // Menyiapkan data penawaran segar Tier 2 Dapur Sosial dengan durasi reservasi 30 menit
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

  // Memvalidasi bahwa jendela prioritas 30 menit terdeteksi aktif segera setelah lot dibuat
  assert(freshEval.isWindowActive === true, "Jendela reservasi 30 menit terdeteksi aktif");

  // Memverifikasi sisa hitung mundur waktu reservasi eksklusif tercatat tepat 30 menit
  assert(freshEval.remainingMinutes === 30, "Sisa waktu reservasi eksklusif tepat 30 menit", `${freshEval.remainingMinutes} menit`);

  // Memvalidasi bahwa mitra Dapur Sosial / Panti Asuhan berhak mengklaim alokasi pangan Tier 2
  assert(freshEval.canSocialKitchenClaim === true, "Dapur Sosial diizinkan mengklaim alokasi Tier 2");

  // Memvalidasi penegakan Invarian 3: Sentra Maggot dilarang keras mengklaim selama 30 menit pertama
  assert(freshEval.canMaggotClaim === false, "Invarian 3: Sentra Maggot DILARANG mengklaim pada masa reservasi");

  // Uji 2: Validasi penolakan klaim Maggot selama jendela 30 menit aktif
  console.log("\n[Test 2] Validasi Gerbang Etis (validateClaimAgainstPriorityWindow)");

  // Mencoba klaim tidak sah dari peran maggot pada jendela 30 menit aktif
  const maggotClaimBlocked = validateClaimAgainstPriorityWindow(freshOffer, "maggot", now);

  // Memvalidasi penolakan sistem terprogram saat peran maggot mencoba mengklaim alokasi sosial aktif
  assert(
    maggotClaimBlocked.allowed === false && !!maggotClaimBlocked.reason,
    "Klaim Maggot ditolak secara terprogram selama jendela 30 menit berlangsung",
    maggotClaimBlocked.reason
  );

  // Mencoba klaim sah dari peran social_kitchen
  const socialClaimAllowed = validateClaimAgainstPriorityWindow(freshOffer, "social_kitchen", now);

  // Memvalidasi otorisasi penuh bagi mitra Dapur Sosial untuk mengklaim sayuran pada jendela aktif
  assert(socialClaimAllowed.allowed === true, "Klaim Dapur Sosial diizinkan secara penuh", "Akses Diizinkan");

  // Uji 3: Evaluasi Penawaran setelah 35 menit berlalu (Jendela Habis)
  console.log("\n[Test 3] Evaluasi Penawaran Setelah 35 Menit Berlalu Tanpa Klaim");
  // Mensimulasikan waktu mundur 35 menit yang lalu (sudah melampaui batas 30 menit)
  const pastTime = new Date(now.getTime() - 35 * 60000);
  const expiredOffer: RescueOffer = {
    ...freshOffer,
    id: "ofr_test_t2_expired",
  };

  const expiredEval = evaluateTier2PriorityWindow(
    { ...expiredOffer, createdAt: pastTime },
    now
  );

  // Memvalidasi bahwa jendela prioritas telah non-aktif karena waktu reservasi 30 menit telah lewat
  assert(expiredEval.isWindowActive === false, "Jendela prioritas 30 menit terdeteksi telah kadaluarsa");

  // Memvalidasi bahwa sisa menit reservasi sosial tercatat 0 menit
  assert(expiredEval.remainingMinutes === 0, "Sisa waktu reservasi adalah 0 menit");

  // Memverifikasi keputusan aksi sistem berubah menjadi memenuhi syarat penurunan kasta (eligible_tier3_downgrade)
  assert(expiredEval.actionDecision === "eligible_tier3_downgrade", "Status penawaran menjadi eligible_tier3_downgrade");

  // Uji 4: Otomasi pengalihan (auto-downgrade) ke Tier 3 saat masa reservasi selesai
  console.log("\n[Test 4] Pemrosesan Auto-Downgrade ke Pakan Biomassa Maggot (Tier 3)");
  // Daftar lot gabungan antara lot yang masih aktif dan lot yang sudah kedaluwarsa 30 menit
  const testOfferList: RescueOffer[] = [
    { ...freshOffer, id: "offer_active", createdAt: now.toISOString() },
    { ...expiredOffer, id: "offer_expired", createdAt: pastTime.toISOString() },
  ];

  // Menjalankan fungsi pemicu penurunan status otomatis
  const downgradeResult = processPriorityWindowDowngrades(testOfferList, now);

  // Memvalidasi tepat 1 penawaran kedaluwarsa berhasil diproses dan diturunkan statusnya
  assert(downgradeResult.downgradedCount === 1, "Tepat 1 tiket yang masa reservasinya habis dialihkan", "1 Tiket Teralihkan");
  
  const downgradedItem = downgradeResult.updatedOffers.find((o) => o.id === "offer_expired");

  // Memverifikasi bahwa komoditas yang lewat 30 menit berganti target ke tier_3 dengan harga tebus pakan maggot Rp 500/kg
  assert(
    downgradedItem?.targetTier === "tier_3" && downgradedItem?.salvagePricePerKg === 500,
    "Komoditas kadaluarsa sukses turun kasta ke Tier 3 (Harga Biomassa Rp 500/kg)",
    `Tier: ${downgradedItem?.targetTier} | Harga: Rp ${downgradedItem?.salvagePricePerKg}`
  );

  // Rekapitulasi hasil pengujian
  console.log(`\nHasil akhir pengujian PSR-23: ${passedCount} lulus, ${failedCount} gagal\n`);

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

// Menjalankan pengujian jendela waktu prioritas Tier 2
runPriorityWindowTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exitCode = 1;
});
