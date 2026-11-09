/**
 * Master Direktori Mitra Pembeli dan Jalur Penyaluran Sirkular 3-Tier (PSR-22).
 * Memuat koordinat geospasial mitra pembeli di sekitar Pasar Induk Kramat Jati,
 * kuota tampung harian, komoditas preferensi, dan jam operasional.
 */

export interface CircularBuyer {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  telegramChatId?: string;
  tier: "tier_1" | "tier_2" | "tier_3";
  typeLabel: "Warteg & Katering UMKM" | "Dapur Sosial & Panti" | "Sentra Budidaya Maggot BSF";
  latitude: number;
  longitude: number;
  address: string;
  dailyCapacityKg: number;
  currentAllocatedKg: number;
  reputationScore: number;
  preferredCommodities: string[];
  operationalHours: {
    openClock: string;
    closeClock: string;
  };
}

/**
 * Titik jangkar geospasial los basah Blok A Pasar Induk Kramat Jati sebagai pusat kalkulasi jarak Haversine.
 */
export const MARKET_ANCHOR_COORDINATES = {
  latitude: -6.2675,
  longitude: 106.8702,
  name: "Pasar Induk Kramat Jati, Jakarta Timur",
} as const;

/**
 * Batas radius maksimal pengalihan logistik surplus pangan (5,0 km).
 * Ditentukan untuk memastikan pengantaran selesai dalam batas waktu kesegaran sayuran daun.
 */
export const MAX_MATCHMAKING_RADIUS_KM = 5.0;

/**
 * Direktori mitra pembeli sirkular terverifikasi dalam radius operasional Pasar Induk Kramat Jati.
 */
export const CIRCULAR_BUYERS: CircularBuyer[] = [
  // Mitra Tier 1: Warteg & Katering UMKM (Penyelamatan Mutu Layu Ringan)
  {
    id: "buyer_warteg_01",
    name: "Warteg Kharisma Bahari Condet",
    ownerName: "Pak Sugeng",
    phone: "081288991122",
    telegramChatId: "tg_warteg_condet_01",
    tier: "tier_1",
    typeLabel: "Warteg & Katering UMKM",
    latitude: -6.275,
    longitude: 106.862,
    address: "Jl. Raya Condet No. 14, Batu Ampar, Kramat Jati (1.2 km)",
    dailyCapacityKg: 80,
    currentAllocatedKg: 15,
    reputationScore: 96,
    preferredCommodities: ["kangkung", "bayam", "sawi_hijau", "tomat", "cabai_merah"],
    operationalHours: { openClock: "06:00", closeClock: "23:00" },
  },
  {
    id: "buyer_warteg_02",
    name: "Warteg Ibu Yayu Hek Kramat Jati",
    ownerName: "Ibu Yayu",
    phone: "081399887766",
    telegramChatId: "tg_warteg_hek_02",
    tier: "tier_1",
    typeLabel: "Warteg & Katering UMKM",
    latitude: -6.264,
    longitude: 106.872,
    address: "Jl. Raya Bogor No. 2, Hek Kramat Jati (0.4 km)",
    dailyCapacityKg: 50,
    currentAllocatedKg: 10,
    reputationScore: 92,
    preferredCommodities: ["kangkung", "bayam", "terung_ungu", "wortel"],
    operationalHours: { openClock: "05:30", closeClock: "22:00" },
  },
  {
    id: "buyer_warteg_03",
    name: "Warteg Barokah Cililitan",
    ownerName: "Mas Bambang",
    phone: "085712345678",
    telegramChatId: "tg_warteg_cililitan_03",
    tier: "tier_1",
    typeLabel: "Warteg & Katering UMKM",
    latitude: -6.261,
    longitude: 106.868,
    address: "Jl. Cililitan Besar No. 88, Kramat Jati (0.8 km)",
    dailyCapacityKg: 65,
    currentAllocatedKg: 20,
    reputationScore: 94,
    preferredCommodities: ["bayam", "sawi_hijau", "pakcoy", "buncis"],
    operationalHours: { openClock: "06:00", closeClock: "21:00" },
  },
  {
    id: "buyer_warteg_04",
    name: "Katering Berkah Bersama Cawang",
    ownerName: "Hj. Maryam",
    phone: "081198765432",
    telegramChatId: "tg_katering_cawang_04",
    tier: "tier_1",
    typeLabel: "Warteg & Katering UMKM",
    latitude: -6.248,
    longitude: 106.865,
    address: "Jl. Cawang Baru No. 12, Jatinegara (2.2 km)",
    dailyCapacityKg: 120,
    currentAllocatedKg: 40,
    reputationScore: 98,
    preferredCommodities: ["kangkung", "sawi_hijau", "wortel", "tomat", "buncis"],
    operationalHours: { openClock: "05:00", closeClock: "20:00" },
  },
  {
    id: "buyer_warteg_05",
    name: "Warteg Putra Bahari TMII",
    ownerName: "Bang Tono",
    phone: "081977665544",
    telegramChatId: "tg_warteg_tmii_05",
    tier: "tier_1",
    typeLabel: "Warteg & Katering UMKM",
    latitude: -6.292,
    longitude: 106.885,
    address: "Jl. Pintu 1 TMII No. 5, Cipayung (3.2 km)",
    dailyCapacityKg: 70,
    currentAllocatedKg: 0,
    reputationScore: 89,
    preferredCommodities: ["kangkung", "terung_ungu", "cabai_merah"],
    operationalHours: { openClock: "07:00", closeClock: "23:00" },
  },

  // Mitra Tier 2: Dapur Sosial & Panti Asuhan (Pangan Darurat Nutrisi Layu Sedang)
  {
    id: "buyer_social_01",
    name: "Dapur Pangan Yatim Al-Khairat Condet",
    ownerName: "Ust. Zulkifli",
    phone: "081211223399",
    telegramChatId: "tg_panti_alkhairat_01",
    tier: "tier_2",
    typeLabel: "Dapur Sosial & Panti",
    latitude: -6.279,
    longitude: 106.858,
    address: "Jl. Condet Raya No. 45, Balekambang (1.8 km)",
    dailyCapacityKg: 90,
    currentAllocatedKg: 25,
    reputationScore: 99,
    preferredCommodities: ["bayam", "kangkung", "wortel", "tomat", "labu_siam"],
    operationalHours: { openClock: "06:00", closeClock: "19:00" },
  },
  {
    id: "buyer_social_02",
    name: "Dapur Darurat Siaga PMI Cabang Jaktim",
    ownerName: "Koordinator Logistik PMI",
    phone: "081122334455",
    telegramChatId: "tg_pmi_jaktim_02",
    tier: "tier_2",
    typeLabel: "Dapur Sosial & Panti",
    latitude: -6.242,
    longitude: 106.879,
    address: "Jl. I Gusti Ngurah Rai No. 7, Duren Sawit (3.0 km)",
    dailyCapacityKg: 150,
    currentAllocatedKg: 30,
    reputationScore: 97,
    preferredCommodities: ["kangkung", "sawi_hijau", "bayam", "kentang", "wortel"],
    operationalHours: { openClock: "00:00", closeClock: "23:59" },
  },
  {
    id: "buyer_social_03",
    name: "Rumah Singgah Sahabat Dhuafa Kramat Jati",
    ownerName: "Ibu Rahmawati",
    phone: "087811992288",
    telegramChatId: "tg_rumah_singgah_03",
    tier: "tier_2",
    typeLabel: "Dapur Sosial & Panti",
    latitude: -6.259,
    longitude: 106.878,
    address: "Jl. Dato Tonggara No. 18, Kramat Jati (1.3 km)",
    dailyCapacityKg: 60,
    currentAllocatedKg: 10,
    reputationScore: 95,
    preferredCommodities: ["sawi_putih", "wortel", "buncis", "labu_siam"],
    operationalHours: { openClock: "07:00", closeClock: "18:00" },
  },

  // Mitra Tier 3: Sentra Budidaya Maggot BSF & Biokonversi Organik
  {
    id: "buyer_maggot_01",
    name: "Sentra Budidaya Maggot BSF TPS 3R Pasar Kramat Jati",
    ownerName: "Pak Dadang Biopond",
    phone: "081233445566",
    telegramChatId: "tg_maggot_kramat_01",
    tier: "tier_3",
    typeLabel: "Sentra Budidaya Maggot BSF",
    latitude: -6.269,
    longitude: 106.8715,
    address: "Area Pengolahan Kompos TPS 3R Belakang Pasar Induk (0.2 km)",
    dailyCapacityKg: 500,
    currentAllocatedKg: 80,
    reputationScore: 99,
    preferredCommodities: ["kangkung", "bayam", "sawi_hijau", "kol", "tomat", "semua_organik"],
    operationalHours: { openClock: "06:00", closeClock: "21:00" },
  },
  {
    id: "buyer_maggot_02",
    name: "Biokonversi Maggot Makasar Lestari",
    ownerName: "Kelompok Tani BSF Makasar",
    phone: "085811223344",
    telegramChatId: "tg_maggot_makasar_02",
    tier: "tier_3",
    typeLabel: "Sentra Budidaya Maggot BSF",
    latitude: -6.282,
    longitude: 106.885,
    address: "Jl. Kerja Bakti No. 102, Makasar (2.3 km)",
    dailyCapacityKg: 350,
    currentAllocatedKg: 40,
    reputationScore: 94,
    preferredCommodities: ["semua_organik"],
    operationalHours: { openClock: "07:00", closeClock: "18:00" },
  },
];
