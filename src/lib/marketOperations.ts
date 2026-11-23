// Modul Agregasi Operasional Pasar dan Asisten Tanya Jawab Pengelola (PSR-17 / PSR-38).
// Menghitung metrik rantai pasok harian (pasokan masuk, pengantaran, pesanan tertahan, stok berisiko layu)
// serta mengintegrasikan model Google Gemini untuk sintesis laporan manajerial berbasis fakta lapangan.

import { getServerSimulationState, evaluateMarketStock } from "@/lib/serverSimulationState";
import { getHyperlocalMarketWeather } from "@/lib/weatherAgent";
import { isReadyForDelivery } from "@/types/market";

// Formatter tanggal WIB; locale sv-SE dipilih karena menghasilkan format YYYY-MM-DD.
const jakartaDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });

// Membandingkan stempel waktu ISO dengan tanggal kalender bisnis pasar hari ini di zona waktu WIB.
function isToday(iso: string | undefined, today: string) {
  const date = Date.parse(iso ?? "");
  return Number.isFinite(date) && jakartaDate.format(date) === today;
}

// Mengompilasi ringkasan metrik operasional pasar hari ini secara real-time.
// Mengagregasi data pasokan fisik masuk, lot penawaran aktif, status pembayaran pesanan,
// kesiapan penjemputan armada logistik, serta estimasi komoditas yang memasuki fase peluruhan kritis.
export async function getMarketOperations() {
  // State pasar dan cuaca dibaca paralel karena saling tidak bergantung.
  const [state, weather] = await Promise.all([getServerSimulationState(), getHyperlocalMarketWeather()]);
  const today = jakartaDate.format(new Date());
  // Hanya stok yang masih bersisa yang dihitung.
  const stock = state.stocks.filter((item) => item.remainingKg > 0);
  // ID stok yang sudah ditimbang; stok belum ditimbang belum boleh dijual.
  const weighed = new Set(stock.filter((item) => item.verifiedAt).map((item) => item.id));
  // Penawaran aktif yang stoknya belum ditimbang tetap dihitung tertahan karena belum boleh dibeli.
  const pending = state.offers.filter((offer) => offer.status === "pending_vendor" || (offer.status === "active" && !weighed.has(offer.stockId))).length;
  // Pesanan sudah diklaim pembeli tetapi belum dibayar.
  const unpaid = state.offers.filter((offer) => offer.status === "claimed" && offer.paymentStatus === "unpaid").length;
  // Pesanan yang sudah lunas dan siap diantar kurir.
  const ready = state.offers.filter(isReadyForDelivery).length;
  // Skor 0,35 adalah awal fase layu ringan, jadi stok di atasnya dianggap berisiko.
  const atRisk = stock.filter((item) => (evaluateMarketStock(item, weather)?.decayScore ?? 0) >= 0.35).length;
  return {
    date: today,
    // Pasokan yang dicatat hari ini menurut tanggal WIB.
    arrivalsToday: state.stocks.filter((item) => isToday(item.createdAt, today)).length,
    deliveriesToday: state.offers.filter((offer) => isToday(offer.deliveredOn, today)).length,
    // Total sisa stok terverifikasi (sudah ditimbang), dalam kg.
    inventoryKg: stock.reduce((total, item) => total + (item.verifiedAt ? item.remainingKg : 0), 0),
    activeOffers: state.offers.filter((offer) => offer.status === "active" && weighed.has(offer.stockId)).length,
    pending, unpaid, ready, atRisk,
    // Daftar alur kerja yang perlu perhatian pengelola; kosong bila semuanya beres.
    workstreams: [
      ...(pending || atRisk ? ["Evaluasi stok dan penawaran"] : []),
      ...(unpaid ? ["Pembayaran pesanan"] : []),
      ...(ready ? ["Pengantaran"] : []),
    ],
    weatherSource: weather.source,
    weatherEstimated: weather.isEstimated ?? false,
  };
}
