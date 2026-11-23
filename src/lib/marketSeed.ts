// Modul Pembangkit Data Awal Simulasi Pasar (Market Seed Generator) (PSR-2 / PSR-4).
// Menghasilkan dataset deterministik realistis untuk 30 kios pedagang binaan Pasar Induk Kramat Jati:
// - 6 tingkatan mutu komoditas per kios (segar, layu ringan, layu sedang, tidak layak).
// - Algoritma pencarian biner (binary search) untuk menghitung durasi paparan jam fisik yang tepat sesuai target DecayScore.
// - Penawaran dan transaksi riwayat realistis untuk antrean kerja seluruh peran (Warteg, Dapur Sosial, Maggot, Kurir).

// Impor: komoditas, kios, akun pasar, dan tipe data pasar.
import { COMMODITIES, type Commodity } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import { MARKET_ACCOUNTS, localActorId } from "@/data/marketAccounts";
import type { EscrowTransaction, RescueOffer, StockItem } from "@/types/market";
import type { ServerState } from "@/lib/serverSimulationState";
import { calculateDecay } from "@/lib/decayEngine";
import { quoteSalvagePrice } from "@/lib/pasarinCore";

// Parameter cuaca mikro dasar untuk penyemaian data pasar (32°C, 75% RH) (PSR-5).
const SEED_WEATHER = { temperatureC: 32, humidityPercent: 75 } as const;

// Enam tahapan mutu simpan per kios Pasar Kramat Jati:
// 1. Segar Prima (decayTarget: 0.12, penjualan retail normal).
// 2. Layu Ringan (decayTarget: 0.46, Tier 1 Warteg & UMKM).
// 3. Transisi Layu Ringan-Sedang (decayTarget: 0.60).
// 4. Layu Sedang (decayTarget: 0.74, Tier 2 Dapur Sosial & Panti).
// 5. Transisi Layu Sedang-Afkir (decayTarget: 0.82).
// 6. Tidak Layak / Afkir (decayTarget: 0.94, Tier 3 Sentra Maggot BSF).
const STAGES = [
  { decayTarget: 0.12, offerTier: null },
  { decayTarget: 0.46, offerTier: "tier_1" },
  { decayTarget: 0.60, offerTier: null },
  { decayTarget: 0.74, offerTier: "tier_2" },
  { decayTarget: 0.82, offerTier: null },
  { decayTarget: 0.94, offerTier: "tier_3" },
] as const;

// Tipe tingkatan alokasi penyelamatan sirkular yang sah (tier_1 | tier_2 | tier_3).
type OfferTier = NonNullable<(typeof STAGES)[number]["offerTier"]>;

// Memilih komoditas acuan yang selaras dengan spesialisasi los kios dan memprioritaskan kategori komoditas serupa.
function selectCommodities(kiosk: (typeof KIOSKS)[number], kioskIndex: number) {
  const selected: Commodity[] = [];
  for (const specialization of kiosk.specialization) {
    const needle = specialization.toLowerCase();
    const match = COMMODITIES.find((commodity) =>
      commodity.localName.toLowerCase().includes(needle) ||
      needle.includes(commodity.localName.toLowerCase()) ||
      commodity.name.toLowerCase().includes(needle));
    if (match && !selected.includes(match)) selected.push(match);
  }

  // Prioritaskan komoditas yang se-kategori dengan spesialisasi lapak (misal Sayur Daun -> leafy_vegetable)
  const primaryCategory = selected[0]?.category;
  const categoryPool = primaryCategory
    ? COMMODITIES.filter((c) => c.category === primaryCategory)
    : COMMODITIES;

  // Pemilihan komoditas per kios deterministik: indeks kios x 7 ditambah langkah x 11, modulo jumlah pool; data contoh sama tiap penyemaian.
  let cursor = 0;
  while (selected.length < STAGES.length && cursor < categoryPool.length * 2) {
    const candidate = categoryPool[(kioskIndex * 7 + cursor * 11) % categoryPool.length];
    if (!selected.includes(candidate)) selected.push(candidate);
    cursor++;
  }

  // Bila pool kategori kurang, sisanya diisi dari seluruh katalog dengan pola yang sama.
  cursor = 0;
  while (selected.length < STAGES.length) {
    const candidate = COMMODITIES[(kioskIndex * 7 + cursor * 11) % COMMODITIES.length];
    if (!selected.includes(candidate)) selected.push(candidate);
    cursor++;
  }
  return selected.slice(0, STAGES.length);
}

// Menggunakan pencarian biner (binary search) untuk menemukan durasi jam pajang fisik yang tepat sesuai target DecayScore.
function hoursForDecay(commodity: Commodity, target: number) {
  let low = 0;
  let high = Math.max(24, commodity.standardShelfLifeHours * 3);
  for (let step = 0; step < 48; step++) {
    const middle = (low + high) / 2;
    if (calculateDecay(commodity, SEED_WEATHER.temperatureC, SEED_WEATHER.humidityPercent, middle).decayScore < target) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return Number(((low + high) / 2).toFixed(2));
}

// Menghitung stempel waktu string WIB (HH:mm) berdasarkan pengurangan jam offset dari saat ini.
function wibClockFromOffset(hours: number) {
  const date = new Date(Date.now() - hours * 3_600_000);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta",
  }).format(date);
}

// Mengambil nama profil pengguna pasar berdasarkan username akun.
function accountName(username: string) {
  return MARKET_ACCOUNTS.find((account) => account.username === username)?.name ?? username;
}

// Menentukan harga penyelamatan per kg untuk lot seed (PSR-20) dari tabel diskon tunggal di pasarinCore,
// sama dengan harga yang dipakai saat pedagang menerbitkan lot: Tier 1 diskon 50-70 persen, Tier 2 75-85 persen, Tier 3 gratis.
function priceForTier(commodity: Commodity, tier: OfferTier, decayScore: number) {
  if (tier === "tier_3") return 0;
  return quoteSalvagePrice(commodity, decayScore).pricePerKg;
}

// Membangun dataset simulasi pasar deterministik dengan 30 kios pedagang, tahapan umur simpan bertingkat, dan penawaran teralokasi.
export function buildMarketSeedState(actorIds: Record<string, string> = {}): ServerState {
  const stocks: StockItem[] = [];
  const offers: RescueOffer[] = [];
  const transactions: EscrowTransaction[] = [];
  const nowIso = new Date().toISOString();
  const nowClock = wibClockFromOffset(0);

  // Tiap kios mendapat beberapa komoditas; urutan lot menentukan tahap umur simpan lewat STAGES.
  KIOSKS.forEach((kiosk, kioskIndex) => {
    const commodities = selectCommodities(kiosk, kioskIndex);
    commodities.forEach((commodity, lotIndex) => {
      const stage = STAGES[lotIndex];
      // Jam pajang dihitung mundur dari skor susut target tahap sehingga mutu lot sesuai tier yang diinginkan.
      const hoursOffset = hoursForDecay(commodity, stage.decayTarget);
      const stockId = `stk_seed_${String(kioskIndex + 1).padStart(2, "0")}_${lotIndex + 1}`;
      // Berat dibuat deterministik dari indeks kios dan lot, jadi seed selalu sama tiap dijalankan.
      const remainingKg = 20 + ((kioskIndex * 7 + lotIndex * 13) % 46);
      const initialKg = remainingKg + 10 + ((kioskIndex + lotIndex) % 16);
      const stock: StockItem = {
        id: stockId,
        vendorId: kiosk.id,
        commodityId: commodity.id,
        initialKg,
        // Lot yang punya penawaran sudah ditimbang (verifiedAt terisi) dan sisanya = berat penawaran; lot tanpa penawaran belum ditimbang.
        remainingKg: stage.offerTier ? remainingKg : initialKg,
        arrivalClock: wibClockFromOffset(hoursOffset),
        lotNumber: `LOT-${kiosk.stallNumber}-D${lotIndex + 1}`,
        hoursOffset,
        createdAt: nowIso,
        verifiedAt: stage.offerTier ? nowIso : undefined,
      };
      stocks.push(stock);
      // Lot tahap pertama tidak punya penawaran: tetap berupa stok yang belum ditimbang.
      if (!stage.offerTier) return;

      const evaluation = calculateDecay(
        commodity, SEED_WEATHER.temperatureC, SEED_WEATHER.humidityPercent, hoursOffset,
      );
      const salvagePricePerKg = priceForTier(commodity, stage.offerTier, evaluation.decayScore);
      // Diskon dihitung dari harga seed terhadap harga grosir dan dibatasi 0 sampai 100.
      const discountPercentage = Math.max(0, Math.min(100,
        Math.round(100 * (1 - salvagePricePerKg / commodity.baseWholesalePricePerKg))));
      offers.push({
        id: `ofr_seed_${String(kioskIndex + 1).padStart(2, "0")}_${lotIndex + 1}`,
        stockId,
        vendorId: kiosk.id,
        commodityId: commodity.id,
        targetTier: stage.offerTier,
        distributionMode: stage.offerTier === "tier_3" ? "free" : "sale",
        quantityKg: remainingKg,
        originalPricePerKg: commodity.baseWholesalePricePerKg,
        salvagePricePerKg,
        discountPercentage,
        totalAmountIdr: Math.round(salvagePricePerKg * remainingKg),
        // Penawaran tier 3 berlaku lebih lama (12 jam) daripada tier lain (6 jam).
        expiresInMinutes: stage.offerTier === "tier_3" ? 720 : 360,
        createdAt: nowIso,
        status: "active",
        paymentStatus: "unpaid",
      });
    });
  });

  // Mencari penawaran seed menurut nomor kios dan tier; melempar galat bila seed tidak lengkap.
  const findOffer = (kioskNumber: number, tier: OfferTier) => {
    const offer = offers.find((item) => item.vendorId === KIOSKS[kioskNumber - 1].id && item.targetTier === tier);
    if (!offer) throw new Error(`Seed offer missing for kiosk ${kioskNumber} ${tier}`);
    return offer;
  };
  // ID aktor untuk username; memakai ID akun Supabase bila ada, jika tidak ID lokal.
  const actorId = (username: string) => actorIds[username] ?? localActorId(username);
  // Nama kios menurut ID, atau ID itu sendiri bila tidak ditemukan.
  const vendorName = (vendorId: string) => KIOSKS.find((kiosk) => kiosk.id === vendorId)?.name ?? vendorId;
  // Nama lokal komoditas menurut ID, atau ID itu sendiri bila tidak ditemukan.
  const commodityName = (commodityId: string) =>
    COMMODITIES.find((commodity) => commodity.id === commodityId)?.localName ?? commodityId;

  // Menetapkan klaim pada lot penawaran dan menyinkronkan baris transaksi rekening escrow terkait.
  const claimOffer = (
    offer: RescueOffer, username: string, paymentStatus: RescueOffer["paymentStatus"], settled = false,
  ) => {
    offer.status = settled ? "settled" : "claimed";
    offer.claimedBy = accountName(username);
    offer.claimedById = actorId(username);
    offer.claimedAt = nowClock;
    // Lot maggot gratis tidak memerlukan pembayaran.
    offer.paymentStatus = offer.targetTier === "tier_3" ? "not_required" : paymentStatus;
    if (settled) offer.deliveredOn = nowIso;
    const transaction: EscrowTransaction = {
      id: `txn_seed_${offer.id}`,
      offerId: offer.id,
      buyerName: offer.claimedBy,
      vendorName: vendorName(offer.vendorId),
      commodityName: commodityName(offer.commodityId),
      amountIdr: offer.totalAmountIdr,
      status: settled ? "released" : "held_in_escrow",
      createdAt: nowClock,
      ...(settled ? { releasedAt: nowClock } : {}),
    };
    // Pesanan yang belum dibayar belum punya catatan escrow; catatan baru dibuat saat pembayaran.
    if (offer.paymentStatus === "held_in_escrow" || offer.paymentStatus === "released_to_vendor") transactions.push(transaction);
    if (settled) {
      const stock = stocks.find((item) => item.id === offer.stockId);
      if (stock) stock.remainingKg = 0;
    }
  };

  // Skenario demo yang selalu ada: satu pesanan Warteg belum dibayar, dapur sosial sedang diantar dan satu selesai, maggot satu selesai dan satu sedang diantar.
  const wartegUnpaid = findOffer(10, "tier_1");
  claimOffer(wartegUnpaid, "warteg1", "unpaid");

  const socialInTransit = findOffer(15, "tier_2");
  claimOffer(socialInTransit, "sosial1", "held_in_escrow");

  const socialSettled = findOffer(16, "tier_2");
  claimOffer(socialSettled, "sosial2", "released_to_vendor", true);

  const maggotSettled = findOffer(20, "tier_3");
  claimOffer(maggotSettled, "maggot1", "released_to_vendor", true);

  const maggotInTransit = findOffer(21, "tier_3");
  claimOffer(maggotInTransit, "maggot2", "held_in_escrow");

  // Satu usulan menunggu pedagang (lot dikembalikan ke belum ditimbang) dan satu penawaran ditolak, agar semua status punya contoh.
  const vendorPending = findOffer(22, "tier_2");
  vendorPending.status = "pending_vendor";
  const pendingStock = stocks.find((item) => item.id === vendorPending.stockId);
  if (pendingStock) {
    delete pendingStock.verifiedAt;
    pendingStock.remainingKg = pendingStock.initialKg;
  }

  const vendorRejected = findOffer(23, "tier_1");
  vendorRejected.status = "rejected";

  // Saldo dompet awal = total transaksi yang sudah cair; statistik dampak diturunkan dari pesanan selesai (4 porsi per kg).
  const released = transactions.filter((transaction) => transaction.status === "released");
  return {
    stocks,
    offers,
    transactions,
    vendorWalletIdr: released.reduce((total, transaction) => total + transaction.amountIdr, 0),
    biomassProcessedKg: maggotSettled.quantityKg,
    socialMealsServed: socialSettled.quantityKg * 4,
    lastUpdated: nowIso,
  };
}
