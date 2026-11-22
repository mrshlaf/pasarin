/**
 * Normalisasi bahasa untuk Asisten PASARIN.
 * Mengubah tulisan santai, singkatan, akhiran kepemilikan, dan salah ketik ringan menjadi bentuk baku
 * agar pertanyaan seperti "brp keuntunganku" atau "sayutrku bisa dijual dmn" dikenali.
 */

import { COMMODITIES, type Commodity } from "@/data/commodities";

/** Singkatan dan bahasa santai yang umum di chat. */
const SLANG: Record<string, string> = {
  brp: "berapa", brapa: "berapa", berapakah: "berapa", brpa: "berapa",
  dmn: "dimana", dimn: "dimana", dmana: "dimana", kmn: "kemana", kmana: "kemana",
  gmn: "bagaimana", gimana: "bagaimana", gmana: "bagaimana", bgmn: "bagaimana", gmna: "bagaimana", bagaimanakah: "bagaimana",
  sy: "saya", aku: "saya", ak: "saya", gw: "saya", gue: "saya", gua: "saya", sya: "saya",
  yg: "yang", udh: "sudah", udah: "sudah", sdh: "sudah", dah: "sudah", blm: "belum", blom: "belum", lom: "belum",
  ga: "tidak", gak: "tidak", gk: "tidak", nggak: "tidak", ngga: "tidak", enggak: "tidak", engga: "tidak", tdk: "tidak", kagak: "tidak",
  utk: "untuk", dgn: "dengan", krn: "karena", kpn: "kapan", knp: "kenapa", napa: "kenapa",
  hrg: "harga", byr: "bayar", aja: "saja", aj: "saja", doang: "saja", lg: "lagi", jg: "juga", tp: "tapi",
  kalo: "kalau", klo: "kalau", emg: "memang", duit: "uang", bs: "bisa", bsa: "bisa", pgn: "ingin", pengen: "ingin",
  liat: "lihat", pesenan: "pesanan", orderan: "pesanan", pesen: "pesan", dr: "dari", pd: "pada",
  jualan: "jual", dagangan: "stok", tx: "transaksi", trx: "transaksi",
  ngapain: "apa yang harus saya lakukan", ongkir: "ongkos kirim", cuan: "keuntungan", gpp: "tidak apa",
  jelasin: "jelaskan", jelasi: "jelaskan", bedain: "bedakan", bayarin: "bayar", beliin: "beli", batalin: "batalkan", terbitin: "terbitkan", klaimin: "klaim", dateng: "datang", pake: "pakai", gede: "besar", bgt: "banget", dapet: "dapat",
  msh: "masih", mash: "masih", nerima: "menerima", kasi: "kasih", cepet: "cepat", seger: "segar", skrg: "sekarang", skrang: "sekarang", hrini: "hari ini",
  td: "tadi", trs: "terus", sampe: "sampai", nyampe: "sampai", nyampai: "sampai", terimakasih: "terima kasih", trimakasih: "terima kasih",
  thx: "terima kasih", makasih: "terima kasih", makasi: "terima kasih", trims: "terima kasih", tq: "terima kasih",
};

/** Kata kunci maksud yang dikenali asisten; menjadi sasaran koreksi salah ketik. */
const KEYWORDS = [
  "berapa", "bagaimana", "dimana", "kemana", "kapan", "kenapa", "mengapa", "siapa",
  "harga", "stok", "sayur", "sayuran", "jual", "dijual", "menjual", "penjualan", "beli", "dibeli", "membeli", "pembeli",
  "keuntungan", "untung", "laba", "pendapatan", "penghasilan", "pemasukan", "omzet", "saldo", "dompet", "uang",
  "pengeluaran", "belanja", "tagihan", "biaya", "penawaran", "pesanan", "pembayaran", "bayar", "dibayar", "antar", "diantar",
  "pengantaran", "kurir", "kirim", "dikirim", "timbang", "ditimbang", "diskon", "donasi", "maggot", "biomassa",
  "risiko", "berisiko", "layu", "busuk", "afkir", "segar", "termurah", "murah", "termahal", "kios", "toko", "lapak",
  "komoditas", "barang", "produk", "tersedia", "terjual", "laku", "salurkan", "disalurkan", "rekomendasi", "saran",
  "hemat", "penghematan", "cuaca", "suhu", "escrow", "transaksi", "selesai", "ringkas", "ringkasan", "evaluasi",
  "katalog", "klaim", "diklaim", "kendaraan", "muatan", "tujuan", "alamat", "dampak", "aman", "dimakan",
  "dikonsumsi", "prioritas", "sekarang", "cair", "masuk", "sampai", "terima", "kasih", "status", "operasional",
  "pasar", "dapur", "sosial", "warteg", "pedagang", "penerima", "lakukan", "muncul", "tampil", "terlihat", "lebih",
];

/** Kata umum yang tidak pernah dikoreksi. */
const KNOWN = new Set([
  ...KEYWORDS, "saya", "anda", "kamu", "yang", "ada", "apa", "di", "ke", "dari", "untuk", "dengan", "dan", "atau",
  "tidak", "sudah", "belum", "bisa", "mau", "ingin", "akan", "ini", "itu", "sini", "sana", "mana", "saja", "lagi",
  "juga", "kalau", "tapi", "karena", "pada", "punya", "cek", "lihat", "tolong", "dong", "deh", "sih", "nih", "tuh",
  "hari", "besok", "kemarin", "minggu", "bulan", "total", "semua", "banyak", "sedikit", "paling", "kurang", "masih",
  "harus", "perlu", "sebaiknya", "bagus", "baik", "enak", "cocok", "kategori", "tier", "kasih", "data", "info",
  "jumlah", "kilo", "rupiah", "orang", "porsi", "jam", "menit", "sama", "boleh", "kok", "pakai", "dipakai", "cara",
  "kami", "kita", "mereka", "masing", "setiap", "per", "satu", "dua", "tiga", "hal", "dulu", "duluan", "nanti",
  "baru", "lama", "cepat", "lambat", "habis", "sisa", "tersisa", "awal", "akhir", "tinggi", "rendah", "naik", "turun",
  "akun", "peran", "fitur", "bantu", "bantuan", "halo", "hai", "pagi", "siang", "sore", "malam", "selamat", "oke",
  "kasih", "mohon", "jelaskan", "jelasin", "kasih", "tahu", "tau", "bilang", "contoh", "misal", "berarti", "artinya",
  "memang", "benar", "salah", "harusnya", "seharusnya", "kira", "kira-kira", "sekitar", "rata", "hitung", "dihitung",
  "pakan", "makan", "makanan", "dimasak", "masak", "kemas", "simpan", "gudang", "bawa", "ambil", "jemput", "rute",
  "antrean", "antrian", "armada", "sopir", "pengemudi", "driver", "panti", "umkm", "admin", "pengelola", "manajer",
  // Kata yang dipakai pola maksud di marketChatbot.ts; tidak boleh "dikoreksi" menjadi kata lain.
  "hello", "hey", "evaluasi", "ditinjau", "ditangani", "dicek", "diperiksa", "tindak", "lanjut", "omset", "dana",
  "salur", "menyalurkan", "didonasikan", "donasikan", "python", "javascript", "world", "kode", "program", "presiden",
  "bahan", "serah", "membayar", "hapus", "ubah", "konfirmasi", "transfer", "delete", "update", "pay", "claim", "list",
  "isi", "apakah", "kelembapan", "weather", "delivery", "pasokan", "kedatangan", "arrivals", "inventory", "logistik",
  "settled", "order", "alokasi", "kondisi", "summary", "menjual", "menimbang", "mengirim", "mengantar", "menerima",
  "menerbitkan", "diterbitkan", "terbit", "dievaluasi", "dipilih", "diantarkan", "dijemput", "diambil", "dipesan",
  "memesan", "mengklaim", "pesan", "ongkos", "terendah", "tertinggi", "terbanyak", "terbesar", "teratas", "ranking",
  "peringkat", "kualitas", "mutu", "skor", "lot", "berat", "kirimkan", "harian", "mingguan", "tahun",
  // Kata percakapan dan kata saran yang tidak boleh "dikoreksi" menjadi kata lain.
  "tadi", "terus", "lalu", "jadi", "gitu", "begitu", "kok", "lho", "anu", "hmm", "maksud", "maksudnya", "jelas", "bingung",
  "ngerti", "mengerti", "paham", "informasi", "menurut", "beda", "bedanya", "bedakan", "perbedaan", "jelaskan", "menu", "resep",
  "olahan", "masakan", "tumis", "lodeh", "sambal", "fokus", "macet", "jalan", "lama", "cerita", "pantun", "puisi", "setia",
  "bentar", "sebentar", "nyetir", "menyetir", "tren", "analisis", "aktif", "pantau", "monitor", "sering", "jarang",
]);

const SUFFIX_OWNER: Array<[string, string]> = [["ku", "saya"], ["mu", "anda"], ["nya", ""]];

/** Jarak Damerau-Levenshtein (optimal string alignment) dengan batas atas untuk efisiensi. */
function editDistance(a: string, b: string, limit: number) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[a.length][b.length];
}

/** Alias komoditas: frasa yang biasa dipakai pedagang dan pembeli. */
const ALIASES: Record<string, string[]> = {
  kangkung: ["kangkung"], bayam: ["bayam"], sawi_hijau: ["sawi hijau", "caisim", "sawi"],
  pakcoy: ["pakcoy", "pak choy", "pakchoy", "bok choy"], selada: ["selada"], daun_singkong: ["daun singkong"],
  daun_bawang: ["daun bawang"], seledri: ["seledri"], sawi_putih: ["sawi putih", "petsai"], daun_katuk: ["daun katuk", "katuk"],
  tomat: ["tomat"], cabai_merah: ["cabai merah", "cabe merah", "cabai keriting", "cabe keriting", "cabai", "cabe"],
  cabai_rawit: ["cabai rawit", "cabe rawit", "rawit"], terung_ungu: ["terung", "terong"], mentimun: ["mentimun", "timun"],
  buncis: ["buncis"], kacang_panjang: ["kacang panjang"], labu_siam: ["labu siam", "labu", "jipang"], oyong: ["oyong", "gambas"],
  pare: ["pare", "paria"], wortel: ["wortel"], kentang: ["kentang"], bawang_merah: ["bawang merah", "bawang"],
  bawang_putih: ["bawang putih"], lobak_putih: ["lobak putih", "lobak"], singkong: ["singkong", "ubi kayu"],
  pepaya: ["pepaya", "papaya"], semangka: ["semangka"], melon: ["melon"], pisang: ["pisang"],
};

const COMMODITY_PATTERNS = COMMODITIES.flatMap((commodity) => [
  ...(ALIASES[commodity.id] ?? []), commodity.id.replace(/_/g, " "), commodity.localName.toLowerCase(), commodity.name.toLowerCase(),
].map((alias) => ({ alias, commodity })))
  .filter((item, index, list) => list.findIndex((other) => other.alias === item.alias) === index)
  .sort((a, b) => b.alias.length - a.alias.length);

const COMMODITY_WORDS = [...new Set(COMMODITY_PATTERNS.flatMap(({ alias }) => alias.split(" ")).filter((word) => word.length >= 4))];
const TARGETS = [...new Set([...KNOWN, ...COMMODITY_WORDS])].filter((word) => word.length >= 4 && !word.includes("-"));
const RESOLVABLE = new Set([...KNOWN, ...COMMODITY_WORDS]);

/** Mengoreksi satu kata ke kata kunci terdekat bila salah ketiknya ringan; null jika tidak yakin. */
function correctWord(word: string) {
  if (word.length < 4 || /\d/.test(word)) return null;
  const limit = word.length >= 8 ? 2 : 1;
  let best: string | null = null;
  let bestDistance = limit + 1;
  let tie = false;
  for (const target of TARGETS) {
    const distance = editDistance(word, target, limit);
    if (distance < bestDistance) {
      best = target;
      bestDistance = distance;
      tie = false;
    } else if (distance === bestDistance && target !== best) {
      tie = true;
    }
  }
  return best && bestDistance <= limit && !tie ? best : null;
}

function resolveWord(word: string): string[] {
  if (SLANG[word]) return [SLANG[word]];
  if (RESOLVABLE.has(word)) return [word];
  for (const [suffix, owner] of SUFFIX_OWNER) {
    const stem = word.slice(0, -suffix.length);
    if (!word.endsWith(suffix) || stem.length < 4) continue;
    const resolved = SLANG[stem] ?? (RESOLVABLE.has(stem) ? stem : correctWord(stem));
    if (resolved) return owner ? [resolved, owner] : [resolved];
  }
  const corrected = correctWord(word);
  return [corrected ?? word];
}

/**
 * Menormalkan pertanyaan: huruf kecil, tanpa tanda baca, singkatan diperluas, dan salah ketik ringan dikoreksi.
 * Contoh: "cek sayutrku bisa dijual dimana?" -> "cek sayur saya bisa dijual dimana".
 */
export function normalizeQuestion(question: string) {
  const words = question.toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\/\s*kg(?![a-z])/g, " per kg ")
    .replace(/[^a-z0-9+\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  // Kata ulang ala chat ("murah2", "sayur2an") disederhanakan ke kata dasarnya.
  const base = (word: string) => word.replace(/^([a-z]{3,})2(?:an)?$/, "$1");
  return words.flatMap((word) => word.includes("+") ? [word] : resolveWord(base(word))).join(" ").replace(/\s+/g, " ").trim();
}

const aliasPattern = (alias: string) => new RegExp(`(?<![a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`, "g");

/** Mencari komoditas yang disebut dalam teks ternormalisasi, mendahulukan frasa terpanjang. */
export function findCommodity(text: string): Commodity | undefined {
  return COMMODITY_PATTERNS.find(({ alias }) => aliasPattern(alias).test(text))?.commodity;
}

/** Menghapus semua sebutan komoditas dari teks, untuk mengetahui apakah pertanyaan hanya menyebut nama sayur. */
export function withoutCommodities(text: string) {
  return COMMODITY_PATTERNS.reduce((rest, { alias }) => rest.replace(aliasPattern(alias), " "), text).replace(/\s+/g, " ").trim();
}
