/**
 * Halaman Utama Publik PASARIN (Public Landing Page).
 * Menampilkan dasbor agregat volume penyelamatan pangan 3-tier, pemantauan cuaca, dan alokasi armada.
 */

import { PublicMarketAssistant } from "@/components/common/MarketChatbot";
import { PublicMarketDashboard } from "@/components/market/PublicMarketDashboard";

/**
 * Komponen halaman beranda publik beserta asisten publik (hanya etalase dan panduan).
 */
export default function Home() {
  return (
    <>
      <PublicMarketDashboard />
      <PublicMarketAssistant />
    </>
  );
}
