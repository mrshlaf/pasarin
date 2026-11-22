/**
 * Asisten publik landing page PASARIN untuk pengunjung yang belum masuk.
 * Hanya memakai etalase publik (komoditas, harga, kios, berat), ringkasan agregat, dan panduan;
 * tidak pernah membaca atau menampilkan data akun siapa pun.
 */

import { GoogleGenAI } from "@google/genai";
import { findCommodity, normalizeQuestion, withoutCommodities } from "@/lib/chatbotLanguage";
import { mentionedKioskIds, publicPrivacyRefusal } from "@/lib/chatbotPrivacy";
import { getEnv } from "@/lib/env";
import {
  type CatalogScope, DESTINATION, FILLERS, OPEN_QUESTION_INSTRUCTION, type Offer, VAGUE,
  commodityName, kg, kioskLabel, plainText, publicCatalogAnswer,
} from "@/lib/marketChatbot";
import { readPublicCatalog, readPublicMarketOverview } from "@/lib/serverSimulationState";
import { isDonation, roundKg } from "@/types/market";

/** Contoh pertanyaan untuk pengunjung; juga dipakai tombol saran di landing page. */
export const PUBLIC_EXAMPLES = [
  "Sayur apa yang tersedia hari ini?",
  "Bayam paling murah di kios mana?",
  "Bagaimana cara kerja PASARIN?",
  "Berapa pangan yang sudah tersalurkan?",
  "Siapa saja yang bisa menerima sayur?",
];

const ABOUT = "PASARIN menyalurkan sisa sayur dan buah dari kios Pasar Induk Kramat Jati sebelum terbuang. " +
  "Pedagang menimbang sisa stok, sistem memperkirakan mutunya, lalu menawarkannya ke penerima yang sesuai: Warteg & UMKM (jual diskon), " +
  "Dapur Sosial (jual murah atau donasi), dan Sentra Maggot (gratis untuk pakan biokonversi). Pembeli membayar lewat QRIS simulasi; " +
  "dana ditahan sampai kurir menyerahkan barang, lalu cair ke pedagang.";

const RECIPIENTS = "Penerima dibagi menurut estimasi mutu sayur: Warteg & UMKM untuk sayur segar sampai layu ringan dengan harga diskon, " +
  "Dapur Sosial dan panti untuk layu sedang (jual murah atau donasi Rp0), dan Sentra Maggot untuk bahan yang sudah tidak layak konsumsi (gratis, untuk pakan biokonversi).";

const ACCOUNT = "Akun PASARIN dipakai oleh mitra: pedagang kios, Warteg & UMKM, dapur sosial, sentra maggot, kurir, dan pengelola pasar. " +
  "Jika sudah punya akun, pilih Masuk untuk membuka dashboard sesuai peran Anda. Pendaftaran mitra baru belum tersedia lewat halaman ini.";

/** Contoh pertanyaan sebagai daftar berpoin. */
const examples = (count: number) => PUBLIC_EXAMPLES.slice(0, count).map((item) => `• ${item}`).join("\n");

/**
 * Menjawab pertanyaan pengunjung landing page. Data akun tidak pernah dibaca; topik pribadi selalu ditolak.
 * Pertanyaan bebas diteruskan ke Gemini hanya dengan data etalase dan ringkasan publik.
 */
export async function answerPublicQuestion(question: string, forceHeuristic = false) {
  const text = normalizeQuestion(question);
  const commodity = findCommodity(text);
  const kioskIds = mentionedKioskIds(question.toLowerCase());
  const scope: CatalogScope = { commodityId: commodity?.id, commodityName: commodity?.localName, kioskIds };
  const words = text.split(" ").filter(Boolean);
  const refusal = publicPrivacyRefusal(text);
  const commodityOnly = Boolean(commodity) && withoutCommodities(text).split(" ").filter(Boolean).every((word) => VAGUE.has(word) || FILLERS.has(word));
  let answer: string;
  let openQuestion = false;
  if (/^(hi|hai|halo|hello|hey|selamat pagi|selamat siang|selamat sore|selamat malam)( (kak|min|pak|bu|bang))?$/.test(text)) {
    answer = "Halo! Saya asisten publik PASARIN. Saya bisa menjelaskan cara kerja PASARIN dan info etalase pasar: komoditas, harga, berat tersedia, dan kios penjual.";
  } else if (/^(?:terima kasih|thanks|thank you|oke|ok|okay|sip|siap|mantap|mantul|baik|good)(?: (?:terima kasih|thanks|oke|ok|sip|siap|mantap|baik|banyak|ya|kak|min|pak|bu|bang|deh|sekali))*$/.test(text)) {
    answer = "Sama-sama! Kalau ada yang ingin dicek lagi, tanyakan saja.";
  } else if (/\b(?:siapa|apa) (?:kamu|anda)\b|\b(?:kamu|anda) bisa (?:apa|bantu)\b|\bbisa (?:bantu|tanya) apa\b/.test(text)) {
    answer = `Saya asisten publik PASARIN. Saya menjawab dari data etalase pasar dan panduan, misalnya:\n${examples(5)}\nData akun seperti pesanan dan saldo hanya bisa dilihat setelah masuk.`;
  } else if (refusal) {
    answer = refusal;
  } else if (/c\+\+|python|javascript|hello world|kode program|presiden/.test(text)) {
    answer = "Saya membantu pertanyaan seputar PASARIN dan etalase pasar. Untuk pertanyaan ini, saya belum bisa membantu.";
  } else if (!commodity && kioskIds.length === 0 && words.length <= 4 && words.every((word) => VAGUE.has(word) || /^\d+$/.test(word))) {
    answer = `Pertanyaannya masih terlalu umum. Maksud Anda yang mana?\n${examples(4)}`;
  } else if (/\bapa itu\b|\b(?:cara|proses) kerja\b|\btentang pasarin\b|\bpasarin (?:itu|apa|untuk apa|buat apa)\b|\bbagaimana (?:pasarin|sistem)\b|\bfungsi pasarin\b|\btujuan pasarin\b/.test(text)) {
    answer = ABOUT;
  } else if (/\b(?:daftar|mendaftar|registrasi|register|buat akun|bikin akun|login|masuk akun|gabung|bergabung|jadi mitra|menjadi mitra)\b/.test(text)) {
    answer = ACCOUNT;
  } else if (!commodity && /\b(?:siapa saja|untuk siapa|buat siapa|penerima|mitra|tier)\b/.test(text)) {
    answer = RECIPIENTS;
  } else if (/\baman (?:untuk |buat )?(?:dimakan|dikonsumsi|dimasak|pakan)\b|\blayak (?:makan|dimakan|konsumsi|dikonsumsi)\b|\b(?:bisa|boleh) (?:dimakan|dikonsumsi)\b/.test(text)) {
    answer = "Mutu sayur di PASARIN adalah estimasi model peluruhan, bukan hasil pemeriksaan fisik, jadi kondisi barang tetap dicek sebelum diolah. " +
      "Penawaran Warteg & UMKM dan Dapur Sosial ditujukan untuk konsumsi setelah disortir dan dicuci; penawaran Sentra Maggot hanya untuk pakan biokonversi.";
  } else if (/\b(?:menu|masak|dimasak|masakan|resep|olah|diolah|olahan|enak|ide|jelaskan|menurut|menurutmu|beda|bedanya|perbedaan|tumis|sop|lodeh|sambal)\b/.test(text)) {
    openQuestion = true;
    answer = `Saya belum bisa menjawab itu sekarang. Coba salah satu pertanyaan ini:\n${examples(4)}`;
  } else if (kioskIds.length || commodityOnly ||
    /\bharga\b|\bper kg\b|\bmurah\b|\btermurah\b|\bterendah\b|\bmahal\b|\btermahal\b|\bdiskon\b|\bpenawaran\b|\bkatalog\b|\betalase\b|\bdonasi\b|\bgratis\b|\b(?:di ?mana|dimana|kios mana|toko mana)\b|\byang jual\b/.test(text)) {
    answer = publicCatalogAnswer(scope, await readPublicCatalog(), /termahal|paling mahal/.test(text) ? "expensive" : "cheap")
      .replace("klaim dan pembelian dilakukan oleh akun pembeli sesuai tujuannya", "klaim dan pembelian dilakukan oleh akun mitra penerima setelah masuk");
  } else if (/cuaca|suhu|kelembapan|hujan|panas/.test(text)) {
    const { forecast } = await readPublicMarketOverview();
    answer = `Suhu sekitar ${forecast.weather.temperatureC} °C dan kelembapan ${forecast.weather.humidityPercent}%${forecast.weather.isEstimated ? " (estimasi, bukan pengukuran langsung)" : ""}. Cuaca panas dan lembap mempercepat sayur layu.`;
  } else if (/\bdampak\b|\btersalurkan\b|\bdisalurkan\b|\bdiselamatkan\b|\bterselamatkan\b|\bporsi\b|\bsampah\b|\blimbah\b|\bpencapaian\b|\bcapaian\b/.test(text)) {
    const overview = await readPublicMarketOverview();
    answer = `Sejauh ini ${kg(overview.distributedKg)} pangan tersalurkan lewat ${overview.completedDeliveries} pengantaran yang selesai. ` +
      `Saat ini ${overview.availableLots} lot (${kg(overview.availableKg)}) siap disalurkan.`;
  } else if (/\b(?:kendaraan|armada|kurir|mobil|motor|truk)\b/.test(text)) {
    const { forecast } = await readPublicMarketOverview();
    answer = `Perkiraan armada untuk ${kg(forecast.fleet.totalPayloadKg)} pasokan yang tersedia: ${forecast.fleet.vehicles.map((vehicle) => `${vehicle.units} unit ${vehicle.name}`).join(", ")}. ` +
      "Ini estimasi perencanaan, bukan penugasan kurir.";
  } else if (commodity) {
    answer = publicCatalogAnswer(scope, await readPublicCatalog(), "cheap")
      .replace("klaim dan pembelian dilakukan oleh akun pembeli sesuai tujuannya", "klaim dan pembelian dilakukan oleh akun mitra penerima setelah masuk");
  } else if (/\b(?:tersedia|ada apa|apa saja|stok|pasokan|komoditas|sayur|sayuran|buah|hari ini|berapa kg|berapa lot|total)\b/.test(text)) {
    const overview = await readPublicMarketOverview();
    const lanes = overview.lanes;
    answer = overview.availableLots === 0
      ? "Belum ada penawaran aktif di etalase pasar saat ini."
      : `Saat ini ada ${overview.availableLots} lot (${kg(overview.availableKg)}) siap disalurkan: Warteg & UMKM ${lanes.tier_1.lots} lot (${kg(lanes.tier_1.kg)}), ` +
        `Dapur Sosial ${lanes.tier_2.lots} lot (${kg(lanes.tier_2.kg)}), dan Sentra Maggot ${lanes.tier_3.lots} lot (${kg(lanes.tier_3.kg)}).` +
        (overview.topCommodities.length ? ` Komoditas terbanyak: ${overview.topCommodities.map((item) => `${item.name} (${kg(item.kg)})`).join(", ")}.` : "");
  } else {
    openQuestion = true;
    answer = `Saya belum memahami pertanyaan itu. Coba salah satu pertanyaan ini:\n${examples(4)}`;
  }

  const key = getEnv().GEMINI_API_KEY;
  if (!openQuestion || !key || forceHeuristic) return { summary: answer, source: "data_pasar" };
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  try {
    const [overview, catalog] = await Promise.all([readPublicMarketOverview(), readPublicCatalog()]);
    const offer = (item: Offer) => ({
      komoditas: commodityName(item.commodityId), kios: kioskLabel(item.vendorId), tujuan: DESTINATION[item.targetTier],
      beratKg: item.quantityKg, hargaPerKg: item.salvagePricePerKg, hargaAcuanPerKg: item.originalPricePerKg, donasi: isDonation(item),
    });
    const response = await new GoogleGenAI({ apiKey: key, httpOptions: { fetch: (input, init) => globalThis.fetch(input, init) } }).models.generateContent({
      model,
      contents: JSON.stringify({
        pertanyaan: question,
        pengguna: "pengunjung landing page yang belum masuk; tidak ada data akun",
        aturan: [ABOUT, RECIPIENTS, ACCOUNT, "Skor mutu dan cuaca adalah estimasi."],
        data: {
          tersediaLot: overview.availableLots, tersediaKg: roundKg(overview.availableKg), tersalurkanKg: roundKg(overview.distributedKg),
          pengantaranSelesai: overview.completedDeliveries, perTujuan: overview.lanes, komoditasTerbanyak: overview.topCommodities,
          cuaca: overview.forecast.weather,
          etalaseTermurah: [...catalog].sort((a, b) => a.salvagePricePerKg - b.salvagePricePerKg).slice(0, 30).map(offer),
        },
      }),
      config: {
        systemInstruction: `${OPEN_QUESTION_INSTRUCTION} Pengguna belum masuk ke akun, jadi jangan menjawab pertanyaan tentang pesanan, saldo, atau data akun siapa pun; arahkan untuk masuk.`,
        temperature: 0.2,
        maxOutputTokens: 600,
        abortSignal: AbortSignal.timeout(12000),
      },
    });
    const reply = plainText(response.text ?? "");
    if (reply) return { summary: reply, source: "gemini", model };
  } catch {
    return { summary: answer, source: "data_pasar" };
  }
  return { summary: answer, source: "data_pasar" };
}
