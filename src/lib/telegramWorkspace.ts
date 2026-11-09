/**
 * Modul Ruang Kerja Bot Telegram Multi-Peran PASARIN (PSR-38).
 * Menghubungkan seluruh perintah teks (/start, /menu, /stok, /pasok, /cuaca, dll.) dan tombol inline
 * ke mesin transaksi pasar terpadu, mendukung navigasi halaman berpaginasi, serta otorisasi ketat per peran pengguna.
 */

import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import { APP_ROLES, isAppRole, type AuthUser } from "@/data/accounts";
import { CIRCULAR_BUYERS } from "@/data/buyers";
import {
  completedDonationLots, distributionTierForDecay, isDonation, isFreeMaggotOffer,
  isReadyForDelivery, roundKg, type RescueOffer,
} from "@/types/market";
import { orderStatus } from "@/lib/orderStatus";
import {
  addVendorStockServer, BUYER_TIERS, claimOfferServer, confirmDeliveryServer, decideVendorOffer,
  payOfferServer, publishMarketOffers, readMarketSnapshot,
} from "@/lib/serverSimulationState";
import { weatherAgent } from "@/lib/weatherAgent";
import { calculateRainFootfallAttenuation } from "@/lib/pasarinCore";
import { calculateFleetAllocation } from "@/lib/fleetCargoCalculator";
import { run24HourMarketMetabolismTrial } from "@/lib/marketMetabolismSimulator";
import { generateBankIndonesiaQrisPayload } from "@/lib/qrisEscrowGateway";

/**
 * Representasi aktor pengguna Telegram terotentikasi (PSR-38).
 */
export type TelegramActor = Pick<AuthUser, "id" | "role" | "name" | "vendorId">;

/**
 * Tipe tombol interaktif Telegram inline keyboard atau Mini App WebApp (PSR-38).
 */
export type TelegramButton = { text: string; callback_data: string } | { text: string; web_app: { url: string } };

/**
 * Matriks baris dan kolom tombol inline keyboard Telegram (PSR-38).
 */
type Keyboard = TelegramButton[][];

/**
 * Kontrak struktur balasan bot Telegram (PSR-38).
 */
type Reply = { actionTaken: string; responseText: string; replyMarkup?: { inline_keyboard: Keyboard } };

/**
 * Pemetaan nama peran pengguna resmi ke label Bahasa Indonesia untuk ruang kerja Telegram (PSR-38).
 */
export const telegramRoleName: Record<TelegramActor["role"], string> = {
  vendor: "Pedagang", warteg: "Warteg", social_kitchen: "Dapur sosial", maggot: "Sentra maggot",
  logistics: "Kurir", manager: "Pengelola pasar", admin: "Administrator",
};

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const weight = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const pageSize = 6;

/**
 * Menyusun respons balasan bot Telegram beserta tombol inline keyboard jika tersedia.
 *
 * @param actionTaken - Pengenal aksi yang dieksekusi untuk keperluan audit/log.
 * @param responseText - Isi pesan balasan teks.
 * @param keyboard - Matriks susunan tombol interaktif inline.
 * @returns Objek Reply siap kirim ke API Telegram.
 */
export function telegramReply(actionTaken: string, responseText: string, keyboard: Keyboard = []): Reply {
  return { actionTaken, responseText, replyMarkup: keyboard.length ? { inline_keyboard: keyboard } : undefined };
}

/**
 * Memformat satu baris informasi ringkas lot penawaran untuk tampilan pesan teks Telegram.
 *
 * @param offer - Objek penawaran RescueOffer.
 * @param isCourier - Apakah informasi ditampilkan untuk kurir (menambahkan rincian tujuan pengantaran).
 * @returns String teks deskripsi lot komoditas, lokasi lapak, dan status pesanan.
 */
function offerLine(offer: RescueOffer, isCourier = false) {
  const commodity = COMMODITIES.find((item) => item.id === offer.commodityId)?.localName ?? offer.commodityId;
  const kiosk = KIOSKS.find((item) => item.id === offer.vendorId);
  const pickup = kiosk ? kiosk.name + ", Lapak " + kiosk.stallNumber + ", Blok " + kiosk.block : offer.vendorId;
  const details = offer.status === "pending_vendor" ? "Perkiraan " + weight.format(offer.quantityKg) + " kg · Belum masuk katalog"
    : weight.format(offer.quantityKg) + " kg · " + (isFreeMaggotOffer(offer) ? "Gratis pakan maggot" : isDonation(offer) ? "Donasi gratis" : money.format(offer.totalAmountIdr));

  if (isCourier) {
    const buyer = CIRCULAR_BUYERS.find((b) => b.id === offer.claimedById || b.name === offer.claimedBy || (offer.claimedBy && b.name.includes(offer.claimedBy)));
    const destination = buyer
      ? "\n   Tujuan: " + buyer.name + "\n   Alamat: " + buyer.address + "\n   Kontak: " + buyer.ownerName + " (" + buyer.phone + ")"
      : (offer.claimedBy ? "\n   Tujuan: " + offer.claimedBy : "");
    return commodity + " · " + details + "\n   Lapak: " + pickup + " · " + orderStatus(offer) + destination;
  }

  return commodity + " · " + details + "\n" +
    pickup + " · " + orderStatus(offer) + (offer.claimedBy ? " · " + offer.claimedBy : "");
}

/**
 * Merender daftar data berpaginasi dengan tombol navigasi halaman sebelumnya/berikutnya.
 *
 * @param command - Perintah dasar menu.
 * @param title - Judul daftar.
 * @param empty - Pesan jika daftar kosong.
 * @param items - Array data yang ditampilkan.
 * @param pageArg - Nomor halaman yang diminta.
 * @param line - Fungsi pemformat baris item.
 * @param actions - Fungsi pembuat tombol aksi per baris item.
 * @returns Teks daftar terpaginasi dan matriks keyboard inline.
 */
function paged<T>(
  command: string, title: string, empty: string, items: T[], pageArg: string | undefined,
  line: (item: T) => string, actions: (item: T, index: number) => TelegramButton[] = () => [],
) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(pages, Math.max(1, Number.parseInt(pageArg ?? "", 10) || 1));
  const start = (page - 1) * pageSize;
  const visible = items.slice(start, start + pageSize);
  const keyboard = visible.map((item, index) => actions(item, start + index + 1)).filter((row) => row.length);
  const nav = [];
  if (page > 1) nav.push({ text: "Sebelumnya", callback_data: "menu:" + command + ":" + (page - 1) });
  if (page < pages) nav.push({ text: "Berikutnya", callback_data: "menu:" + command + ":" + (page + 1) });
  if (nav.length) keyboard.push(nav);
  const list = visible.map((item, index) => (start + index + 1) + ". " + line(item));
  return { text: list.length ? [title + " (" + page + "/" + pages + ")", ...list].join("\n\n") : title + "\n" + empty, keyboard };
}

/**
 * Menghasilkan menu navigasi tombol inline sesuai peran pengguna aktif di Telegram.
 *
 * @param user - Profil aktor Telegram pengguna saat ini.
 * @returns Matriks tombol inline TelegramButton.
 */
function workspaceMenu(user: TelegramActor) {
  const accounts: TelegramButton[] = [{ text: "Akun saya", callback_data: "accounts" }];
  switch (user.role) {
    case "vendor":
      return [
        [{ text: "Catat pasokan", callback_data: "menu:pasok" }, { text: "Inventaris", callback_data: "menu:stok" }],
        [{ text: "Penawaran", callback_data: "menu:penawaran" }, { text: "Saldo & pembayaran", callback_data: "menu:transaksi" }],
        [{ text: "Cuaca los", callback_data: "menu:cuaca" }, accounts[0]],
      ];
    case "logistics":
      return [
        [{ text: "Antrean pengantaran", callback_data: "menu:tugas" }, { text: "Manifes armada", callback_data: "menu:armada" }],
        [{ text: "3 Tahap pengantaran", callback_data: "menu:tahap" }, { text: "Riwayat", callback_data: "menu:riwayat" }],
        [{ text: "Riwayat transaksi", callback_data: "menu:transaksi" }, accounts[0]],
      ];
    case "manager":
    case "admin":
      return [
        [{ text: "Ringkasan pasar", callback_data: "menu:status" }, { text: "Laporan DLH", callback_data: "menu:dlh" }],
        [{ text: "Penawaran", callback_data: "menu:penawaran" }, { text: "Pembayaran", callback_data: "menu:transaksi" }],
        [{ text: "Cuaca los", callback_data: "menu:cuaca" }, { text: "Pratinjau peran", callback_data: "menu:pratinjau" }],
        ...(user.role === "admin" ? [[{ text: "Evaluasi stok", callback_data: "menu:evaluasi" }]] : []),
        accounts,
      ];
    default:
      return [
        [{ text: "Katalog", callback_data: "menu:surplus" }, { text: "Pesanan saya", callback_data: "menu:status" }],
        [{ text: "Riwayat transaksi", callback_data: "menu:transaksi" }],
        accounts,
      ];
  }
}

/**
 * Memproses perintah teks masuk dari obrolan Telegram ke operasi transaksi pasar yang bersangkutan.
 *
 * @param text - Teks pesan perintah dari pengguna Telegram (misal: "/menu", "/stok", "/cuaca").
 * @param chatId - ID unik obrolan Telegram.
 * @param user - Profil aktor Telegram pengguna saat ini jika sudah terautentikasi.
 * @param updateId - Nomor urut pembaruan Telegram untuk idempoten pencatatan pasokan.
 * @returns Respons Reply berisi teks balasan dan tombol inline.
 */
export async function handleTelegramCommand(text: string, chatId: number | string, user?: TelegramActor, updateId?: number) {
  const [rawCommand, ...args] = text.trim().split(/\s+/);
  const command = rawCommand.toLowerCase().split("@")[0];
  if (!user) return telegramReply(command === "/start" ? "welcome_new_user" : "auth_required", "Masuk dengan akun Pasarin untuk membuka ruang kerja.");
  const account = user.name + " · " + telegramRoleName[user.role];
  if (["/start", "/menu", "/help"].includes(command)) {
    return telegramReply("welcome_existing_user", account + "\nPilih tugas di bawah.", workspaceMenu(user));
  }
  const vendor = user.role === "vendor" ? user.vendorId : undefined;
  const supervisor = user.role === "manager" || user.role === "admin";
  const buyer = user.role === "warteg" || user.role === "social_kitchen" || user.role === "maggot";

  // Perintah Cuaca Mikro Los Kramat Jati (Vendor & Pengawas)
  if (command === "/cuaca") {
    const weather = await weatherAgent.getMarketWeather();
    const effectiveRain = Math.max(0, weather.rainfallMm);
    const footfall = calculateRainFootfallAttenuation(effectiveRain, true);
    const weatherText = [
      "🌦️ Telemetri Cuaca Mikro Los Pasar Induk Kramat Jati",
      "• Suhu Los: " + weather.temperatureCelsius + "°C",
      "• Kelembapan Udara: " + weather.relativeHumidityPercent + "% RH",
      "• Kondisi: " + weather.weatherCondition + " (Curah hujan " + weather.rainfallMm + " mm)",
      "• Akses Lorong: " + footfall.aisleAccessibilityDescription,
      "• Arus Pembeli Retail: " + Math.round(footfall.footfallIndex * 100) + "%",
      "• Pengali Laju Surplus: " + footfall.surplusMultiplier + "x",
      "",
      "💡 Kinetika: Suhu dan kelembapan diukur untuk memodelkan laju peluruhan biologis Arrhenius-Q10.",
    ].join("\n");
    return telegramReply("weather_reported", weatherText, workspaceMenu(user));
  }

  // Perintah Laporan Kepatuhan DLH DKI Jakarta & Simulasi 24 Jam (Supervisor)
  if ((command === "/dlh" || command === "/laporan") && supervisor) {
    const report = await run24HourMarketMetabolismTrial();
    const dlhText = [
      "📋 Laporan Kepatuhan DLH DKI Jakarta & Simulasi 24 Jam",
      "• Efisiensi Pengalihan Sampah: " + report.wasteDiversionEfficiencyPct + "% " + (report.meetsDlhThreshold ? "✅ (MEMENUHI TARGET >=90%)" : "❌"),
      "",
      "📊 Metrik Pangan 30 Kios:",
      "• Pasokan Masuk Subuh: " + weight.format(report.totalMarketIntakeKg) + " kg",
      "• Estimasi Surplus: " + weight.format(report.totalProjectedSurplusKg) + " kg",
      "• Biomassa Terselamatkan: " + weight.format(report.totalRescuedKg) + " kg",
      "• Residu ke TPA Bantar Gebang: " + weight.format(Math.max(0, report.totalProjectedSurplusKg - report.totalRescuedKg)) + " kg",
      "",
      "🌱 Dampak Lingkungan (IPCC 2006):",
      "• Reduksi Metana: " + report.environmentalImpact.methaneAvoidedKg + " kg CH4",
      "• Reduksi Karbon: " + report.environmentalImpact.carbonOffsetCo2eKg + " kg CO2e",
      "",
      "🛡️ Audit Invarian Kritis Kurikulum:",
      "• Invarian 1 (Zero Edible Food to Feed): " + (report.invariantsAudit.invariant1ZeroEdibleToFeed ? "✅ Lolos" : "❌"),
      "• Invarian 2 (Strict Price Ordering): " + (report.invariantsAudit.invariant2StrictPriceOrdering ? "✅ Lolos" : "❌"),
      "• Invarian 3 (30-Minute Priority Window): " + (report.invariantsAudit.invariant3ThirtyMinuteWindow ? "✅ Lolos" : "❌"),
    ].join("\n");
    return telegramReply("dlh_reported", dlhText, workspaceMenu(user));
  }

  // Perintah 3 Tahapan Pengantaran Sirkular (Logistik)
  if ((command === "/tahap" || command === "/jadwal") && user.role === "logistics") {
    const dispatchText = [
      "🚚 3 Tahapan Pengantaran Terpadu Pasar Kramat Jati",
      "",
      "1️⃣ Tahap 1: Warteg & Katering UMKM",
      "• Waktu: 15:00 - 17:00 WIB (Berangkat 15:30 WIB)",
      "• Ambang Muatan: 200 kg",
      "• Armada: Daihatsu GranMax Pikap Bak (B 9812 SAA)",
      "• Pengemudi: Pak Hendra Wijaya",
      "• Fokus: Penyelamatan sayuran layu segar untuk makan malam warteg.",
      "",
      "2️⃣ Tahap 2: Dapur Sosial & Panti Asuhan",
      "• Waktu: 17:00 - 18:30 WIB (Berangkat 17:30 WIB)",
      "• Ambang Muatan: 75 kg",
      "• Armada: Motor Viar Roda Tiga (B 4521 TXX)",
      "• Pengemudi: Pak Joko Santoso",
      "• Fokus: Distribusi darurat panti asuhan (Jendela reservasi 30 menit).",
      "",
      "3️⃣ Tahap 3: Sentra Maggot BSF",
      "• Waktu: 18:30 - 21:00 WIB (Berangkat 19:00 WIB)",
      "• Ambang Muatan: 150 kg",
      "• Armada: Viar Roda Tiga TPS 3R (B 3319 BSF)",
      "• Pengemudi: Bpk. Rahmat Hidayat",
      "• Fokus: Pengangkutan afkir organik ke biokonversi pupuk & pakan larva.",
    ].join("\n");
    return telegramReply("dispatch_phases_reported", dispatchText, workspaceMenu(user));
  }

  // Perintah Kalkulator & Manifes Armada Logistik (Logistik)
  if ((command === "/armada" || command === "/manifes") && user.role === "logistics") {
    const state = await readMarketSnapshot(user);
    const ready = state.offers.filter(isReadyForDelivery);
    const totalWeightKg = ready.reduce((sum, item) => sum + item.quantityKg, 0);
    const allocation = calculateFleetAllocation(totalWeightKg);
    const fleetText = [
      "🚛 Manifes & Alokasi Armada Logistik Pasar (PSR-27)",
      "• Total Muatan Siap Antar: " + weight.format(totalWeightKg) + " kg (" + ready.length + " pesanan)",
      "• Kendaraan Ditugaskan: " + allocation.vehicleSpec.displayName + " (" + allocation.vehicleSpec.licensePlate + ")",
      "• Pengemudi: " + allocation.vehicleSpec.defaultDriver,
      "• Utilisasi Kapasitas: " + allocation.capacityUtilizationPct + "% (" + weight.format(totalWeightKg) + "/" + (allocation.vehicleSpec.maxCapacityKg * allocation.unitsRequired) + " kg)",
      "• Jenis BBM: " + allocation.vehicleSpec.fuelType + " (Rp " + allocation.vehicleSpec.fuelPricePerLiterIdr.toLocaleString("id-ID") + "/liter)",
      "• Rekomendasi: " + allocation.dispatchDescription,
      "",
      "🗺️ Urutan Penjemputan Los Terurut:",
      "1. Blok A (Los Basah / Sayuran Daun)",
      "2. Blok B (Los Bumbu / Cabai & Bawang)",
      "3. Blok C (Los Umbi / Kering)",
    ].join("\n");
    return telegramReply("fleet_manifest_reported", fleetText, workspaceMenu(user));
  }

  // Perintah Serah Terima Langsung via Teks (Kurir)
  if (command === "/kirim" && user.role === "logistics") {
    const [id] = args;
    if (!id) return telegramReply("deliver_usage", "Ketik /kirim ID_PENAWARAN untuk konfirmasi serah terima muatan.");
    const result = await confirmDeliveryServer(id);
    return telegramReply(result.success ? "deliver" : "deliver_failed", result.message);
  }

  // Perintah Pembayaran Langsung via Teks (Pembeli)
  if (command === "/bayar" && buyer) {
    const [id] = args;
    if (!id) return telegramReply("pay_usage", "Ketik /bayar ID_PENAWARAN untuk melihat tagihan QRIS.");
    return handleTelegramAction("invoice", id, user);
  }

  // Perintah Pembatalan / Penarikan Penawaran (Pedagang)
  if ((command === "/tarik" || command === "/tolak") && vendor) {
    const [id] = args;
    if (!id) return telegramReply("reject_usage", "Ketik " + command + " ID_PENAWARAN untuk membatalkan penawaran.");
    const result = await decideVendorOffer(id, vendor, false);
    return telegramReply(result.success ? "offer_rejected" : "action_failed", result.message);
  }

  if (command === "/pasok" && vendor) {
    const quantity = Number(args.at(-1)?.replace(",", "."));
    const label = args.slice(0, -1).join(" ").toLowerCase();
    if (!label) return telegramReply("stock_usage", "Ketik /pasok NAMA KOMODITAS KG. Contoh /pasok kangkung 25.",
      [[{ text: "Daftar komoditas", callback_data: "menu:komoditas" }]]);
    const commodity = COMMODITIES.find((item) => item.id === label || item.localName.toLowerCase() === label);
    if (!commodity || !Number.isFinite(quantity) || quantity <= 0) {
      return telegramReply("stock_rejected", "Periksa komoditas dan berat. Lihat /komoditas untuk daftar bahan.");
    }
    const result = await addVendorStockServer(commodity.id, quantity, vendor, updateId === undefined ? undefined : "tg-" + chatId + "-" + updateId);
    return telegramReply(result.success ? "stock_added" : "stock_rejected", result.message, [[{ text: "Lihat inventaris", callback_data: "menu:stok" }]]);
  }
  if (command === "/komoditas" && vendor) {
    return telegramReply("commodity_list", COMMODITIES.map((item) => item.localName + " (" + item.id + ")").join("\n"));
  }
  if ((command === "/terbitkan" || command === "/setujui") && vendor) {
    const [id, amount, choice] = args;
    if (!id || !amount || args.length > 3 || (choice && choice !== "jual" && choice !== "donasi")) {
      return telegramReply("publish_usage", "Ketik " + command + " ID KG_SISA. Tambahkan jual atau donasi untuk dapur sosial.");
    }
    const confirmation = { confirmedKg: Number(amount.replace(",", ".")),
      mode: choice === "jual" ? "sale" as const : choice === "donasi" ? "donation" as const : undefined };
    const result = command === "/terbitkan"
      ? await publishMarketOffers(vendor, id, confirmation)
      : await decideVendorOffer(id, vendor, true, confirmation);
    return telegramReply(result.success ? "offer_published" : "offer_rejected", result.message);
  }
  if (command === "/klaim" && (user.role === "warteg" || user.role === "social_kitchen" || user.role === "maggot")) {
    const [id, amount] = args;
    if (!id || !amount || args.length !== 2) return telegramReply("claim_usage", "Pilih lot dari /surplus, lalu ketik /klaim ID KG.");
    const result = await claimOfferServer(id, { ...user, role: user.role }, Number(amount.replace(",", ".")),
      updateId === undefined ? undefined : "tg-" + chatId + "-" + updateId);
    return telegramReply(result.success ? "order_reserved" : "claim_rejected", result.message,
      result.success && result.offer?.paymentStatus === "unpaid"
        ? [[{ text: "Lihat tagihan", callback_data: "invoice:" + result.offer.id }]] : []);
  }
  if (command === "/evaluasi" && user.role === "admin") {
    const result = await publishMarketOffers();
    return telegramReply(result.success ? "market_evaluated" : "evaluation_failed", result.message);
  }
  if (command === "/pratinjau" && supervisor) {
    const [preview, page] = args;
    if (!isAppRole(preview)) {
      return telegramReply("preview_roles", "Pilih ruang kerja yang ingin dilihat. Pratinjau hanya untuk membaca.",
        APP_ROLES.map((role) => [{ text: telegramRoleName[role], callback_data: "menu:pratinjau:" + role }]));
    }
    const state = await readMarketSnapshot(user);
    const offers = preview === "logistics"
      ? state.offers.filter((item) => item.paymentStatus !== "unpaid")
      : preview === "warteg" || preview === "social_kitchen" || preview === "maggot"
        ? state.offers.filter((item) => item.targetTier === BUYER_TIERS[preview])
        : state.offers;
    const view = paged("pratinjau:" + preview, "Pratinjau " + telegramRoleName[preview], "Belum ada penawaran.", offers, page, offerLine);
    return telegramReply("preview_workspace", view.text, view.keyboard);
  }

  if (command === "/stok" && vendor) {
    const state = await readMarketSnapshot(user);
    const lotOffer = new Map(state.offers.filter((offer) => offer.status === "active" || offer.status === "pending_vendor")
      .map((offer) => [offer.stockId, offer]));
    const freeKg = (stock: typeof state.stocks[number]) => roundKg(stock.remainingKg - state.offers
      .filter((offer) => offer.stockId === stock.id && offer.status === "claimed").reduce((sum, offer) => sum + offer.quantityKg, 0));
    const view = paged("stok", "Inventaris", "Belum ada pasokan.", state.stocks, args[0], (stock) => {
      const health = state.stockHealth[stock.id];
      const offer = lotOffer.get(stock.id);
      const commodity = COMMODITIES.find((item) => item.id === stock.commodityId)?.localName ?? stock.commodityId;
      const remainder = stock.verifiedAt ? weight.format(Math.max(0, freeKg(stock))) + " kg belum dipesan"
        : "Belum ditimbang · Perkiraan sisa " + weight.format(state.estimatedUnsoldKg[stock.id] ?? 0) + " kg";
      const tier = health ? distributionTierForDecay(health.decayScore) : undefined;
      const condition = health?.condition === "segar_prima" ? "Segar Prima"
        : tier === "tier_1" ? "Layu Ringan (Tier 1)"
        : tier === "tier_2" ? "Layu Sedang (Tier 2)"
        : tier === "tier_3" ? "Afkir (Tier 3)" : "";
      const shelfLife = health
        ? (health.hoursRemaining < 1
            ? "Sisa simpan " + Math.max(0, Math.round(health.hoursRemaining * 60)) + " menit"
            : "Sisa simpan " + Math.round(health.hoursRemaining) + " jam")
        : "";
      return commodity + " · Stok awal " + weight.format(stock.initialKg) + " kg\n" +
        remainder + (condition ? " · " + condition : "") +
        (health ? " · Susut " + Math.round(health.decayScore * 100) + "/100" : "") +
        (shelfLife ? " · " + shelfLife : "") +
        (offer ? "\nStatus penawaran: " + (offer.status === "active" && !stock.verifiedAt ? "Perlu timbang" : orderStatus(offer)) : "");
    }, (stock, index) => {
      const linked = lotOffer.get(stock.id);
      if (freeKg(stock) <= 0 || (linked?.status === "active" && stock.verifiedAt)) return [];
      return [{ text: "Timbang lot " + index, callback_data: linked ? "approve_offer:" + linked.id : "publish:" + stock.id }];
    });
    const stockKg = state.stocks.reduce((total, stock) => total + (stock.verifiedAt ? stock.remainingKg : 0), 0);
    const reserved = state.offers.filter((offer) => offer.status === "claimed").reduce((total, offer) => total + offer.quantityKg, 0);
    const summary = "Sisa fisik terkonfirmasi " + weight.format(stockKg) + " kg · Dipesan " + weight.format(reserved) + " kg";
    const kiosk = KIOSKS.find((item) => item.id === vendor);
    const reputation = kiosk ? "\nReputasi " + Math.min(100, kiosk.reputationScore + completedDonationLots(state.offers, vendor)) + "/100" : "";
    return telegramReply("stock_list", summary + reputation + "\n\n" + view.text, [...view.keyboard,
      [{ text: "Catat pasokan", callback_data: "menu:pasok" }]]);
  }
  if (command === "/penawaran" && (vendor || supervisor)) {
    const state = await readMarketSnapshot(user);
    const offers = state.offers.map((offer) => {
      const estimate = state.estimatedUnsoldKg[offer.stockId];
      return offer.status === "active" && estimate !== undefined
        ? { ...offer, status: "pending_vendor" as const, quantityKg: estimate }
        : offer;
    });
    const view = paged("penawaran", "Penawaran pasar", "Belum ada penawaran.", offers, args[0], offerLine, (offer, index) => {
      if (!vendor) return [];
      if (offer.status === "pending_vendor") return [
        { text: "Timbang & setujui " + index, callback_data: "approve_offer:" + offer.id },
        { text: "Tolak " + index, callback_data: "reject_offer:" + offer.id },
      ];
      return offer.status === "active" ? [{ text: "Tarik " + index, callback_data: "reject_offer:" + offer.id }] : [];
    });
    return telegramReply("offers_list", view.text, view.keyboard);
  }
  if (command === "/transaksi") {
    const state = await readMarketSnapshot(user);
    const view = paged("transaksi", "Riwayat transaksi & pembayaran", "Belum ada transaksi.", state.transactions, args[0], (item) =>
      item.commodityName + " · " + money.format(item.amountIdr) + "\n" + item.buyerName + " → " + item.vendorName + " · " +
      (item.status === "released" ? "Selesai" : item.status === "refunded" ? "Dikembalikan" : "Ditahan"));
    return telegramReply("payments_list", (vendor ? "Saldo " + money.format(state.vendorWalletIdr) + "\n\n" : "") + view.text, view.keyboard);
  }
  if ((command === "/surplus" || command === "/katalog") && buyer) {
    const state = await readMarketSnapshot(user);
    const activeOffers = state.offers.filter((offer) => offer.status === "active");
    const view = paged("surplus", "Katalog surplus", "Belum ada lot yang bisa diklaim.", activeOffers,
      args[0], (offer) => {
        const base = offerLine(offer);
        const isTier2 = offer.targetTier === "tier_2";
        const priority = isTier2 ? "\n🛡️ Jendela reservasi Dapur Sosial 30 menit aktif" : "";
        return base + priority;
      }, (offer, index) => [
        { text: (isFreeMaggotOffer(offer) ? "Ambil gratis " : isDonation(offer) ? "Ambil donasi " : "Pilih jumlah ") + index, callback_data: "claim:" + offer.id },
      ]);
    return telegramReply("surplus_catalog_viewed", view.text, view.keyboard);
  }
  if ((command === "/tugas" || command === "/riwayat" || command === "/antar") && user.role === "logistics") {
    const history = command === "/riwayat";
    const state = await readMarketSnapshot(user);
    const ready = state.offers.filter((offer) => isReadyForDelivery(offer));
    const completed = state.offers.filter((offer) => offer.status === "settled");
    const view = paged(history ? "riwayat" : "tugas", history ? "Riwayat pengantaran" : "Antrean pengantaran", "Belum ada pengantaran.",
      history ? completed : ready, args[0], (offer) => offerLine(offer, true),
      (offer, index) => history ? [] : [{ text: "Serah terima " + index, callback_data: "handover:" + offer.id }]);
    const load = ready.reduce((total, offer) => total + offer.quantityKg, 0);
    const held = ready.reduce((total, offer) => total + offer.totalAmountIdr, 0);
    const summary = ready.length + " siap diantar · " + weight.format(load) + " kg\n" + money.format(held) + " ditahan · " + completed.length + " selesai";
    return telegramReply("logistics_tasks_displayed", summary + "\n\n" + view.text, [
      ...view.keyboard,
      [{ text: "Manifes armada", callback_data: "menu:armada" }, { text: "3 Tahap pengantaran", callback_data: "menu:tahap" }],
    ]);
  }
  if (command === "/status" || command === "/ringkasan" || (command === "/pesanan" && buyer)) {
    const state = await readMarketSnapshot(user);
    if (buyer) {
      const orders = state.offers.filter((offer) => offer.isMine);
      const view = paged("status", "Pesanan saya", "Belum ada pesanan.", orders,
        args[0], offerLine, (offer, index) => offer.status === "claimed" && offer.paymentStatus === "unpaid"
          ? [{ text: "Bayar " + index, callback_data: "invoice:" + offer.id }] : []);
      const orderedKg = orders.reduce((total, offer) => total + offer.quantityKg, 0);
      const spendSavings = orders.reduce((total, offer) => {
        const comm = COMMODITIES.find((c) => c.id === offer.commodityId);
        const normalPrice = comm ? comm.baseWholesalePricePerKg * offer.quantityKg : offer.totalAmountIdr;
        return total + Math.max(0, normalPrice - offer.totalAmountIdr);
      }, 0);
      const impact = user.role === "social_kitchen"
        ? "Perkiraan " + Math.round(orderedKg * 4) + " porsi makanan bergizi"
        : user.role === "maggot"
          ? "Perkiraan " + weight.format(orderedKg / 5) + " kg larva protein tinggi"
          : "Total pesanan " + money.format(orders.reduce((total, offer) => total + offer.totalAmountIdr, 0)) +
            (spendSavings > 0 ? " · Hemat belanja " + money.format(spendSavings) : "");
      return telegramReply("status_reported", impact + "\n\n" + view.text, view.keyboard);
    }
    const risky = state.stocks.filter((item) => item.remainingKg > 0 && (state.stockHealth[item.id]?.decayScore ?? 0) >= 0.35).length;
    return telegramReply("status_reported", [
      account, "Kios aktif " + new Set(state.stocks.map((item) => item.vendorId)).size,
      "Lot perlu ditinjau " + risky,
      "Penawaran aktif " + state.offers.filter((offer) => offer.status === "active").length,
      "Siap diantar " + state.offers.filter((offer) => isReadyForDelivery(offer)).length,
      "Selesai " + state.offers.filter((offer) => offer.status === "settled").length,
    ].join("\n"), workspaceMenu(user));
  }
  return telegramReply("help_displayed", "Pilih tugas yang tersedia untuk " + telegramRoleName[user.role] + ".", workspaceMenu(user));
}

/**
 * Memproses aksi interaktif klik tombol inline keyboard Telegram dengan validasi kepemilikan peran dan pesanan.
 *
 * @param action - Kata kunci aksi tombol (misal: "claim", "pay", "deliver", "reject_offer", "qc", "qp").
 * @param id - Parameter ID penawaran atau pasokan terkait.
 * @param user - Profil aktor Telegram pengguna saat ini.
 * @param args - Parameter argumen tambahan (kuantitas, mode, dll.).
 * @returns Respons Reply hasil pemrosesan aksi tombol.
 */
export async function handleTelegramAction(action: string, id: string | undefined, user: TelegramActor, args: string[] = []) {
  const role = user.role;
  const vendor = role === "vendor" ? user.vendorId : undefined;
  const buyer = role === "warteg" || role === "social_kitchen" || role === "maggot";

  // Aksi Klaim Kuota Kilat Satu-Sentuhan (Quick Claim)
  if (action === "qc" && buyer && id) {
    const amount = Number(args[0]?.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) return telegramReply("claim_rejected", "Jumlah kuota tidak valid.");
    const buyerRole = user.role as "warteg" | "social_kitchen" | "maggot";
    const result = await claimOfferServer(id, { ...user, role: buyerRole }, amount);
    if (result.success && result.offer?.paymentStatus === "unpaid") {
      return telegramReply("order_reserved", result.message, [
        [{ text: "Lihat tagihan & bayar QRIS", callback_data: "invoice:" + result.offer.id }],
      ]);
    }
    return telegramReply(result.success ? "order_reserved" : "claim_rejected", result.message);
  }

  // Aksi Konfirmasi Timbang Kilat Satu-Sentuhan (Quick Publish)
  if (action === "qp" && vendor && id) {
    const amount = Number(args[0]?.replace(",", "."));
    const mode = args[1] === "jual" ? "sale" as const : args[1] === "donasi" ? "donation" as const : undefined;
    if (!Number.isFinite(amount) || amount < 0) return telegramReply("offer_rejected", "Jumlah kg sisa fisik tidak valid.");
    const confirmation = { confirmedKg: amount, mode };
    const result = await publishMarketOffers(vendor, id, confirmation);
    return telegramReply(result.success ? "offer_published" : "offer_rejected", result.message,
      [[{ text: "Lihat penawaran", callback_data: "menu:penawaran" }]]);
  }

  if (action === "publish_all" && vendor) return telegramReply("publish_usage", "Timbang setiap lot dari /stok sebelum diterbitkan.");
  if (id && vendor && (action === "publish" || action === "approve_offer")) {
    const state = await readMarketSnapshot(user);
    const proposal = action === "approve_offer" ? state.offers.find((offer) => offer.id === id &&
      (offer.status === "pending_vendor" || offer.status === "active")) : undefined;
    const stock = state.stocks.find((item) => item.id === (action === "publish" ? id : proposal?.stockId));
    if (!stock) return telegramReply("offer_rejected", "Lot atau usulan sudah tidak tersedia.");
    if (proposal?.status === "active" && stock.verifiedAt) return telegramReply("offer_rejected", "Tarik penawaran aktif sebelum menimbang ulang.");
    const command = action === "publish" ? "/terbitkan" : "/setujui";
    const social = distributionTierForDecay(state.stockHealth[stock.id]?.decayScore ?? 0) === "tier_2";
    const example = command + " " + id + " KG_SISA";
    const predictedKg = state.estimatedUnsoldKg[stock.id] ?? (proposal?.status === "pending_vendor" ? proposal.quantityKg : undefined);
    const estimate = predictedKg === undefined ? "" : "Perkiraan sisa " + weight.format(predictedKg) + " kg. Belum masuk katalog.\n\n";

    const keyboard: TelegramButton[][] = [];
    if (predictedKg !== undefined && predictedKg > 0) {
      const roundedPred = Math.round(predictedKg);
      if (social) {
        keyboard.push([
          { text: "Jual " + roundedPred + " kg", callback_data: "qp:" + id + ":" + roundedPred + ":jual" },
          { text: "Donasi " + roundedPred + " kg", callback_data: "qp:" + id + ":" + roundedPred + ":donasi" },
        ]);
      } else {
        keyboard.push([{ text: "Konfirmasi " + roundedPred + " kg", callback_data: "qp:" + id + ":" + roundedPred }]);
      }
    }
    keyboard.push([{ text: "Habis terjual (0 kg)", callback_data: "qp:" + id + ":0" }]);
    keyboard.push([{ text: "Batal", callback_data: "menu:stok" }]);

    return telegramReply("publish_usage", estimate + "Isi sisa fisik setelah penjualan di pasar, di luar pesanan PASARIN. Seluruh hasil timbang diterbitkan. Isi 0 jika habis.\n\n" +
      example + (social ? " jual\n" + example + " donasi" : "") + "\n\nAtau pilih tombol kilat di bawah:", keyboard);
  }
  if (id && vendor && action === "reject_offer") return telegramReply(action, (await decideVendorOffer(id, vendor, false)).message);
  if (id && buyer && (action === "claim" || action === "donate")) {
    const state = await readMarketSnapshot(user);
    const offer = state.offers.find((item) => item.id === id && item.status === "active");
    if (!offer) return telegramReply("claim_rejected", "Penawaran sudah tidak tersedia.");

    const keyboard: TelegramButton[][] = [
      [{ text: "Ambil semua (" + weight.format(offer.quantityKg) + " kg)", callback_data: "qc:" + id + ":" + offer.quantityKg }],
    ];
    if (offer.quantityKg >= 10) {
      keyboard.push([
        { text: "5 kg", callback_data: "qc:" + id + ":5" },
        { text: "10 kg", callback_data: "qc:" + id + ":10" },
      ]);
    }
    keyboard.push([{ text: "Kembali ke katalog", callback_data: "menu:surplus" }]);

    return telegramReply("claim_usage", offerLine(offer) + "\n\nPilih tombol jumlah di bawah atau ketik manual:\n/klaim " + id + " KG", keyboard);
  }
  if (id && action === "invoice" && buyer) {
    const state = await readMarketSnapshot(user);
    const offer = state.offers.find((item) => item.id === id && item.isMine && item.status === "claimed" && item.paymentStatus === "unpaid");
    if (!offer) return telegramReply(action, "Tagihan ini sudah diproses atau tidak tersedia untuk akun Anda.");
    const kiosk = KIOSKS.find((k) => k.id === offer.vendorId);
    const qris = generateBankIndonesiaQrisPayload(offer.totalAmountIdr, offer.id, {
      merchantId: offer.vendorId,
      merchantName: kiosk?.name ?? "Kios Pasarin",
    });
    const invoiceText = [
      "🏷️ Tagihan Pembayaran Escrow Dynamic QRIS Bank Indonesia",
      "",
      offerLine(offer),
      "",
      "• Rekening Penampung: Escrow Pasar Jaya Kramat Jati",
      "• Total Tagihan: " + money.format(offer.totalAmountIdr),
      "",
      "📱 String Dynamic QRIS EMVCo TLV (PSR-37):",
      "`" + qris.qrisPayload + "`",
      "",
      "(Checksum CRC16: " + qris.crc16 + " · Polinomial 0x1021)",
      "Dana ditahan aman di rekening penampung bersama Pasar Jaya hingga kurir menyelesaikan serah terima fisik.",
    ].join("\n");
    return telegramReply(action, invoiceText, [[{ text: "Konfirmasi pembayaran QRIS", callback_data: "pay:" + id }]]);
  }
  if (id && action === "pay" && buyer) return telegramReply(action, (await payOfferServer(id, user.id)).message);
  if (id && action === "handover" && role === "logistics") {
    const state = await readMarketSnapshot(user);
    const offer = state.offers.find((item) => item.id === id && isReadyForDelivery(item));
    if (!offer) return telegramReply(action, "Pengantaran ini sudah diproses atau belum siap diserahterimakan.");
    const handoverText = [
      "Konfirmasi Serah Terima Muatan (Proof of Delivery)",
      "",
      offerLine(offer, true),
      "",
      "Pelepasan Escrow: Mengonfirmasi serah terima akan secara instan mencairkan saldo " + money.format(offer.totalAmountIdr) + " ke saldo dompet pedagang.",
    ].join("\n");
    return telegramReply(action, handoverText,
      [[{ text: "Barang sudah diterima (Cairkan escrow)", callback_data: "deliver:" + id }]]);
  }
  if (id && action === "deliver" && role === "logistics") return telegramReply(action, (await confirmDeliveryServer(id)).message);
  return telegramReply("action_denied", "Aksi ini tidak tersedia untuk akun Anda.");
}
