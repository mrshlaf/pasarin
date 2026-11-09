/**
 * Halaman Utama Publik PASARIN (Public Landing Page).
 * Menampilkan dasbor agregat volume penyelamatan pangan 3-tier, pemantauan cuaca, dan alokasi armada.
 */

import { PublicMarketDashboard } from "@/components/market/PublicMarketDashboard";

/**
 * Komponen halaman beranda publik.
 */
export default function Home() {
  return <PublicMarketDashboard />;
}
