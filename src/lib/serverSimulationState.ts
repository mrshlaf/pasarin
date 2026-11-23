// Modul Pengelola State Simulasi Pasar dan Sinkronisasi Sesi Server (Server Simulation State) (PSR-4 / PSR-37).
// Bertanggung jawab terhadap persistensi status buku besar pasar (lot penawaran, pasokan kios, mutasi rekening escrow),
// mekanisme konkurensi optimistik (Compare-And-Swap revision locking), serta orkestrasi transaksi sirkular multi-peran.

// Impor: pustaka Node, basis data, rumus mutu dan harga, kalkulator escrow dan armada, serta tipe pasar.
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { COMMODITIES } from "@/data/commodities";
import { KIOSKS } from "@/data/kiosks";
import { distributionTierForDecay, isDonation, isFreeMaggotOffer, isReadyForDelivery, roundKg, type RescueOffer, type EscrowTransaction, type StockConfirmation, type StockItem } from "@/types/market";
import type { AuthUser } from "@/data/accounts";
import { calculateDecay } from "@/lib/decayEngine";
import { getRealtimeWIBTimeString } from "@/lib/marketClock";
import { getHyperlocalMarketWeather } from "@/lib/weatherAgent";
import { calculateRainFootfallAttenuation, predictRetailSurplusKg, quoteSalvagePrice, type SalvagePriceQuote } from "@/lib/pasarinCore";
import { executeEscrowSettlement } from "@/lib/qrisEscrowGateway";
import { getServiceRoleClient } from "@/lib/supabase";
import { buildMarketSeedState } from "@/lib/marketSeed";
import { databaseConfigured, getDatabasePool } from "@/lib/database";

// Pemetaan peran pembeli sirkular ke tingkatan alokasi penawaran yang sah (PSR-21 / PSR-22).
export const BUYER_TIERS = { warteg: "tier_1", social_kitchen: "tier_2", maggot: "tier_3" } as const;

// Tipe peran pembeli sirkular yang sah dalam ekosistem PASARIN.
export type BuyerRole = keyof typeof BUYER_TIERS;

// Kontrak struktur state buku besar pasar (Server Simulation State) (PSR-4 / PSR-37).
// Bentuk seluruh data pasar yang disimpan: penawaran, transaksi escrow, stok, saldo dompet pedagang, biomassa maggot, porsi sosial, dan waktu ubah terakhir.
export interface ServerState {
  offers: RescueOffer[];
  transactions: EscrowTransaction[];
  stocks: StockItem[];
  vendorWalletIdr: number;
  biomassProcessedKg: number;
  socialMealsServed: number;
  lastUpdated: string;
}

// Hasil mutasi transaksional state server.
type MutationResult = { success: true; message: string; offer?: RescueOffer } |
  { success: false; message: string; status: 403 | 404 | 409 | 422 };

// Representasi aktor pengguna terotentikasi dalam transaksi mutasi pasar.
type Actor = Pick<AuthUser, "id" | "name" | "role" | "vendorId">;

// Tabel Supabase yang menyimpan snapshot state pasar.
const table = "pasarin_simulation_state";
// Kunci baris state pasar di tabel itu.
const stateKey = "market";
// Lokasi berkas state lokal; bisa diganti dengan PASARIN_STATE_FILE untuk data uji terpisah.
const stateFile = () => process.env.PASARIN_STATE_FILE ?? path.join(os.tmpdir(), "pasarin_market_state_v2.json");
// Produksi dan mode Supabase menyimpan state di database; selain itu di berkas lokal.
const storesStateInDatabase = () => databaseConfigured() || process.env.NODE_ENV === "production" || process.env.PASARIN_STATE_BACKEND === "supabase";

// Menginisialisasi objek state pasar kosong baru tanpa pasokan awal.
// State awal yang kosong: dipakai saat belum ada berkas lokal atau baris di basis data.
function newState(): ServerState {
  return {
    offers: [],
    transactions: [],
    stocks: [],
    vendorWalletIdr: 0,
    biomassProcessedKg: 0,
    socialMealsServed: 0,
    lastUpdated: new Date().toISOString(),
  };
}

// Menormalkan struktur state pasar dengan membersihkan token lama dan memastikan pesanan Maggot Rp0 bebas biaya.
// Membersihkan state lama: membuang podToken lama dan memastikan lot Maggot (Tier 3) selalu gratis (harga 0, diskon 100 persen, tanpa tagihan).
function normalizeState(state: ServerState): ServerState {
  return {
    ...state,
    offers: state.offers.map((offer: RescueOffer & { podToken?: string }) => {
      const { podToken, ...safe } = offer;
      const maggotPaymentPending = offer.paymentStatus === "unpaid" ||
        (offer.paymentStatus === "not_required" && offer.status !== "claimed");
      if (offer.targetTier === "tier_3" && maggotPaymentPending && offer.status !== "settled" && offer.status !== "rejected") {
        return { ...safe, distributionMode: "free", salvagePricePerKg: 0, totalAmountIdr: 0, discountPercentage: 100,
          paymentStatus: offer.status === "claimed" ? "not_required" : "unpaid" };
      }
      return podToken === undefined ? offer : safe;
    }),
  };
}

// Membaca state pasar dari berkas JSON lokal di sistem operasi.
// Mendukung pembacaan fail-safe migrasi dari berkas state versi sebelumnya jika tersedia.
// Membaca state dari berkas lokal; bila tidak ada, mencoba berkas lama di folder sementara, lalu menggabungkan stok bawaan dengan yang tersimpan.
function readLocalState(): ServerState {
  const file = stateFile();
  if (fs.existsSync(/* turbopackIgnore: true */ file)) {
    return normalizeState(JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ file, "utf-8")) as ServerState);
  }
  if (!process.env.PASARIN_STATE_FILE) {
    const legacy = path.join(os.tmpdir(), "pasarin_server_state_v1.json");
    if (fs.existsSync(legacy)) {
      const data = JSON.parse(fs.readFileSync(legacy, "utf-8")) as Partial<ServerState>;
      const initial = newState();
      const stockById = new Map(initial.stocks.map((stock) => [stock.id, stock]));
      for (const stock of data.stocks ?? []) stockById.set(stock.id, stock);
      return normalizeState({ ...initial, ...data, stocks: [...stockById.values()] });
    }
  }
  return newState();
}

// Menyimpan pembaruan state pasar ke berkas lokal secara atomik (atomic rename) untuk mencegah korupsi data saat konkurensi.
// Menulis state secara atomik: tulis ke berkas sementara dengan izin 0600, lalu rename agar pembaca tidak pernah melihat berkas setengah jadi.
function writeLocalState(state: ServerState) {
  const file = stateFile();
  const temporary = file + "." + randomUUID();
  fs.writeFileSync(temporary, JSON.stringify(state), { mode: 0o600 });
  // Prompt analisis: data ringkas pasar dan permintaan dua kalimat (status dan rute prioritas). Model tidak diminta menghitung angka.
  try {
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

// Menginisialisasi klien Supabase Service Role untuk akses tingkat server ke tabel simulasi.
function databaseClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for persistent simulation state.");
  }
  return getServiceRoleClient();
}

// Membaca snapshot state pasar beserta nomor revisi CAS (Compare-And-Swap) dari Supabase PostgREST API.
async function readDatabaseState(client: ReturnType<typeof databaseClient>) {
  const { data, error } = await client.from(table).select("revision, state").eq("id", stateKey).maybeSingle();
  if (error) throw error;
  return data ? { revision: data.revision as number, state: normalizeState(data.state as ServerState) } : null;
}

// Membaca snapshot state pasar beserta nomor revisi langsung melalui pool koneksi PostgreSQL native.
async function readPostgresState() {
  const result = await getDatabasePool().query<{ revision: string; state: ServerState }>(
    "select revision::text as revision, state from public.pasarin_simulation_state where id = $1",
    [stateKey],
  );
  const row = result.rows[0];
  return row ? { revision: Number(row.revision), state: normalizeState(row.state) } : null;
}

// Mengambil state pasar aktif dari penyimpanan persisten (PostgreSQL, Supabase REST, atau berkas lokal).
export async function getServerSimulationState() {
  if (!storesStateInDatabase()) return readLocalState();
  if (databaseConfigured()) return (await readPostgresState())?.state ?? newState();
  return (await readDatabaseState(databaseClient()))?.state ?? newState();
}

// Antrean mutasi lokal untuk mencegah kondisi balapan (race condition) pada penyimpanan berkas.
let localMutationQueue: Promise<void> = Promise.resolve();

// Menerapkan mutasi state pasar secara atomik dengan protokol penguncian optimistik (CAS) hingga 5 kali percobaan.
// Satu pintu perubahan data. Lokal: antrean berurutan agar dua permintaan tidak saling menimpa. Basis data: baca, ubah, tulis dengan pemeriksaan revisi.
async function updateState(mutate: (state: ServerState) => MutationResult): Promise<MutationResult> {
  if (!storesStateInDatabase()) {
    const run = localMutationQueue.then(() => {
      const state = readLocalState();
      const result = mutate(state);
      if (result.success) {
        state.lastUpdated = new Date().toISOString();
        writeLocalState(state);
      }
      return result;
    });
    localMutationQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  // Jalur Postgres langsung (SUPABASE_DB_URL): baca, ubah, tulis dengan nomor revisi. Bila revisi berubah di tengah jalan, ulangi hingga 5 kali lalu menyerah dengan 409.
  // Jalur Postgres: coba sampai 5 kali; bila revisi berubah di tengah jalan, baca ulang dan ulangi perubahannya.
  if (databaseConfigured()) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const snapshot = await readPostgresState();
      const state = snapshot?.state ?? newState();
      const result = mutate(state);
      if (!result.success) return result;
      state.lastUpdated = new Date().toISOString();
      const pool = getDatabasePool();
      if (!snapshot) {
        // Belum ada baris state: sisipkan revisi 1; on conflict do nothing menandakan ada permintaan lain yang menyisipkan lebih dulu.
        // Belum ada baris: sisipkan baris pertama dengan revisi 1; on conflict do nothing mencegah dua instance menyisipkan bersamaan.
        const inserted = await pool.query(
          `insert into public.pasarin_simulation_state (id, revision, state)
           values ($1, 1, $2::jsonb)
           on conflict (id) do nothing
           returning id`,
          [stateKey, JSON.stringify(state)],
        );
        if (inserted.rowCount) return result;
      } else {
        // Perbarui hanya bila revisi masih sama dengan yang dibaca (compare-and-swap).
        // Update dengan syarat revisi sama (compare-and-swap); bila tidak ada baris yang terubah, berarti instance lain menulis lebih dulu dan dicoba lagi.
        const updated = await pool.query(
          `update public.pasarin_simulation_state
           set state = $1::jsonb, revision = $2
           where id = $3 and revision = $4
           returning id`,
          [JSON.stringify(state), snapshot.revision + 1, stateKey, snapshot.revision],
        );
        if (updated.rowCount) return result;
      }
    }
    return { success: false, status: 409, message: "Data pasar baru berubah. Coba lagi." };
  }

  // Jalur klien Supabase (REST) memakai pola yang sama; kode 23505 berarti baris sudah dibuat permintaan lain, jadi ulangi.
  const client = databaseClient();
  // Predikat nomor revisi mencegah dua permintaan konkurensi saling menimpa data (Compare-And-Swap)
  // Jalur Supabase: pola yang sama, coba sampai 5 kali. Kode 23505 berarti baris sudah disisipkan pihak lain, jadi baca ulang.
  for (let attempt = 0; attempt < 5; attempt++) {
    const snapshot = await readDatabaseState(client);
    const state = snapshot?.state ?? newState();
    const result = mutate(state);
    if (!result.success) return result;
    state.lastUpdated = new Date().toISOString();
    if (!snapshot) {
      const { error } = await client.from(table).insert({ id: stateKey, revision: 1, state });
      if (!error) return result;
      if (error.code !== "23505") throw error;
    } else {
      const { data, error } = await client.from(table)
        .update({ state, revision: snapshot.revision + 1 })
        .eq("id", stateKey).eq("revision", snapshot.revision)
        .select("id").maybeSingle();
      if (error) throw error;
      if (data) return result;
    }
  }
  return { success: false, status: 409, message: "Data pasar baru berubah. Coba lagi." };
}

// Mengisi ulang (seed) state pasar secara lengkap dalam satu revisi atomik.
export async function seedMarketStateServer(actorIds: Record<string, string> = {}) {
  const seeded = buildMarketSeedState(actorIds);
  return updateState((state) => {
    Object.assign(state, seeded);
    return { success: true as const, message: "Data pasar berhasil dibuat ulang." };
  });
}

// Menyaring data inventaris, lot penawaran, dan buku besar transaksi sesuai hak akses peran pengguna aktif (RBAC).
export function visibleMarketState(state: ServerState, user: Pick<AuthUser, "id" | "role" | "vendorId">) {
  const { role } = user;
  const supervisor = role === "admin" || role === "manager";
  // Lot yang sudah ditimbang; pembeli hanya melihat penawaran dari lot yang sudah ditimbang.
  const weighed = new Set(state.stocks.filter((stock) => stock.verifiedAt).map((stock) => stock.id));
  // Aturan visibilitas penawaran: pengelola dan admin semua, pedagang hanya kiosnya, kurir hanya yang sudah lunas atau gratis, pembeli hanya klaimnya sendiri atau lot aktif di tier-nya.
  // Aturan visibilitas penawaran: pengelola dan admin melihat semua, pedagang hanya kiosnya, kurir yang sudah dibayar, pembeli miliknya atau katalog aktif untuk tier-nya.
  const visible = state.offers.filter((offer) => {
    if (supervisor) return true;
    if (role === "vendor") return offer.vendorId === user.vendorId;
    if (role === "logistics") return offer.paymentStatus !== "unpaid";
    return offer.claimedById === user.id || (offer.status === "active" && offer.targetTier === BUYER_TIERS[role] && weighed.has(offer.stockId));
  });
  const visibleIds = new Set(visible.map((offer) => offer.id));
  const stockIds = new Set(visible.map((offer) => offer.stockId));
  const transactions = state.transactions.filter((item) => visibleIds.has(item.offerId));
  // Saldo dompet: pedagang hanya dari transaksinya yang sudah cair, pengelola total, peran lain 0.
  const vendorWalletIdr = role === "vendor" ? transactions
    .filter((item) => item.status === "released")
    .reduce((total, item) => total + item.amountIdr, 0) : supervisor ? state.vendorWalletIdr : 0;
  return {
    ...state,
    vendorWalletIdr,
    // Stok ikut disaring; pembeli hanya melihat stok yang terkait penawaran yang terlihat.
    stocks: state.stocks.filter((stock) => supervisor || (role === "vendor" ? stock.vendorId === user.vendorId : stockIds.has(stock.id))),
    offers: visible.map((offer) => marketOfferForUser(offer, user.id)),
    transactions,
  };
}

// Membersihkan ID internal pemilik dan kunci reservasi dari respons penawaran publik.
export function marketOfferForUser(offer: RescueOffer, userId: string) {
  // isMine menandai klaim milik pengguna ini; ID pemilik dan kunci reservasi dihapus agar tidak bocor ke pihak lain.
  const visible = { ...offer, isMine: offer.claimedById === userId };
  delete visible.claimedById;
  delete visible.reservationKey;
  return visible;
}

// Mencatat kepemilikan klaim pembeli pada lot penawaran sebelum penyelesaian pembayaran.
function reserveOffer(offer: RescueOffer, buyer: Actor & { role: BuyerRole }) {
  offer.status = "claimed";
  offer.claimedBy = buyer.name;
  offer.claimedById = buyer.id;
  offer.claimedAt = getRealtimeWIBTimeString();
}

// Membuat rekaman transaksi rekening bersama (Escrow) baru dengan status held_in_escrow.
// Mencatat dana ditahan di escrow: transaksi baru ditaruh paling depan dan status pembayaran penawaran menjadi held_in_escrow.
function holdPayment(state: ServerState, offer: RescueOffer) {
  const transaction: EscrowTransaction = {
    id: randomUUID(),
    offerId: offer.id,
    buyerName: offer.claimedBy ?? "Pembeli",
    vendorName: KIOSKS.find((kiosk) => kiosk.id === offer.vendorId)?.name ?? offer.vendorId,
    commodityName: COMMODITIES.find((commodity) => commodity.id === offer.commodityId)?.localName ?? offer.commodityId,
    amountIdr: offer.totalAmountIdr,
    status: "held_in_escrow",
    createdAt: getRealtimeWIBTimeString(),
  };
  offer.paymentStatus = "held_in_escrow";
  state.transactions.unshift(transaction);
}

// Mereservasi sebagian atau seluruh kuantitas kilogram lot penawaran untuk pembeli tertentu.
// Menegakkan aturan kuota stok, kelayakan mutu biologis, dan jendela reservasi.
export async function claimOfferServer(
  offerId: string, buyer: Actor & { role: BuyerRole }, quantityKg?: number, reservationKey?: string,
) {
  const weather = await getHyperlocalMarketWeather();
  return updateState((state) => {
    // Permintaan dengan kunci reservasi yang sama dianggap pengulangan: kembalikan hasil sebelumnya bila isinya sama, atau 409 bila berbeda.
    const prior = reservationKey && state.offers.find((item) => item.reservationKey === reservationKey && item.claimedById === buyer.id);
    if (prior) {
      return (prior.listingId ?? prior.id) === offerId && (quantityKg === undefined || prior.quantityKg === quantityKg)
        ? { success: true, offer: prior, message: "Pesanan ini sudah tercatat." }
        : { success: false, status: 409, message: "Permintaan sebelumnya sudah tercatat. Buka ulang penawaran." };
    }
    const offer = state.offers.find((item) => item.id === offerId);
    if (!offer) return { success: false, status: 404, message: "Penawaran tidak ditemukan." };
    // Pembeli hanya boleh mengklaim penawaran di tier perannya.
    if (BUYER_TIERS[buyer.role] !== offer.targetTier) {
      return { success: false, status: 403, message: "Peran ini tidak dapat mengklaim penawaran tersebut." };
    }
    if (offer.status !== "active") {
      return { success: false, status: 409, message: "Penawaran sudah tidak tersedia." };
    }
    const stock = state.stocks.find((item) => item.id === offer.stockId);
    const requested = quantityKg ?? offer.quantityKg;
    // Berat yang diminta harus positif dan tidak melebihi kuota penawaran.
    if (!validWeight(requested) || requested === 0 || requested > offer.quantityKg) {
      return { success: false, status: 422, message: "Pilih berat yang tersedia pada penawaran." };
    }
    // Cek ulang saat klaim: lot sudah ditimbang, sisa stok cukup, dan mutu terkini masih cocok dengan tier penawaran.
    if (!stock?.verifiedAt || roundKg(stock.remainingKg - reservedStockKg(state, stock.id)) < requested ||
      !isOfferSuitable(offer, evaluateMarketStock(stock, weather)?.decayScore)) {
      return { success: false, status: 422, message: "Stok atau mutu lot sudah berubah. Pilih penawaran lain." };
    }
    const donation = isDonation(offer);
    const free = isFreeMaggotOffer(offer);
    // Klaim sebagian memecah penawaran: pesanan baru dibuat untuk bagian yang diklaim, penawaran asal berkurang.
    // Klaim sebagian: bila jumlah kurang dari stok penawaran, buat pesanan baru (ID baru) dan kurangi penawaran induk; bila sama, pesanan memakai penawaran itu sendiri.
    const order = requested === offer.quantityKg
      ? offer
      : { ...offer, id: randomUUID(), listingId: offer.id, quantityKg: requested };
    if (order !== offer) {
      offer.quantityKg = roundKg(offer.quantityKg - requested);
      offer.totalAmountIdr = donation || free ? 0 : Math.round(offer.salvagePricePerKg * offer.quantityKg);
      state.offers.unshift(order);
    }
    order.distributionMode = free ? "free" : donation ? "donation" : "sale";
    // Total dihitung ulang untuk bagian yang diklaim; donasi dan lot maggot gratis bernilai 0.
    order.totalAmountIdr = donation || free ? 0 : Math.round(order.salvagePricePerKg * requested);
    order.reservationKey = reservationKey;
    reserveOffer(order, buyer);
    // Lot maggot tidak perlu bayar; donasi dicatat langsung sebagai dana tertahan; lot berbayar menunggu pembayaran pembeli.
    if (free) order.paymentStatus = "not_required";
    else if (donation) holdPayment(state, order);
    const message = free ? "Lot Maggot gratis diklaim dan siap diantar."
      : donation ? "Donasi diklaim dan siap diantar." : "Pesanan diklaim. Lanjutkan ke pembayaran simulasi.";
    return { success: true, offer: order, message };
  });
}

// Mencatat simulasi pembayaran pesanan dan memindahkan pesanan ke antrean penjemputan armada kurir.
export function payOfferServer(offerId: string, buyerId: string) {
  return updateState((state) => {
    const offer = state.offers.find((item) => item.id === offerId);
    if (!offer) return { success: false, status: 404, message: "Penawaran tidak ditemukan." };
    // Pembayaran hanya boleh oleh pemilik pesanan.
    // Pemeriksaan sebelum bayar: harus pemilik pesanan, bukan lot Maggot gratis, dan statusnya masih claimed dan belum dibayar.
    if (offer.claimedById !== buyerId) return { success: false, status: 403, message: "Pesanan ini milik akun lain." };
    if (offer.targetTier === "tier_3") return { success: false, status: 403, message: "Lot Maggot gratis dan tidak memerlukan pembayaran." };
    if (offer.status !== "claimed" || offer.paymentStatus !== "unpaid") {
      return { success: false, status: 409, message: "Pesanan sudah diproses atau belum dapat dibayar." };
    }
    holdPayment(state, offer);
    return { success: true, message: "Pembayaran simulasi berhasil dicatat." };
  });
}

// Menyelesaikan serah terima pengantaran muatan (Proof-of-Delivery) dan mencairkan dana escrow seketika ke dompet pedagang.
export function confirmDeliveryServer(offerId: string) {
  return updateState((state) => {
    const offer = state.offers.find((item) => item.id === offerId);
    if (!offer) return { success: false, status: 404, message: "Penawaran tidak ditemukan." };
    // Serah terima yang diulang dijawab sukses tanpa menggandakan pencairan dana.
    if (offer.status === "settled") return { success: true, message: "Pengantaran sudah dikonfirmasi." };

    if (!isReadyForDelivery(offer)) {
      return { success: false, status: 409, message: "Pesanan belum siap diserahterimakan." };
    }
    // Dana escrow dicairkan ke dompet pedagang sebesar nilai yang lolos penyelesaian.
    // Pencairan escrow: cari transaksi yang masih ditahan, minta kalkulator escrow menyetujui, lalu kreditkan ke dompet pedagang dan tandai transaksi released.
    if (offer.paymentStatus === "held_in_escrow") {
      const transaction = state.transactions.find((item) => item.offerId === offerId && item.status === "held_in_escrow");
      if (!transaction) return { success: false, status: 409, message: "Catatan pembayaran belum tersedia." };
      const result = executeEscrowSettlement(transaction.amountIdr, offer.paymentStatus);
      if (!result.settled) return { success: false, status: 422, message: result.message };
      offer.paymentStatus = "released_to_vendor";
      transaction.status = "released";
      transaction.releasedAt = getRealtimeWIBTimeString();
      state.vendorWalletIdr += result.creditedAmountIdr;
    }

    // Pesanan selesai: catat tanggal antar dan tambahkan ke statistik dampak (biomassa tier 3, porsi tier 2 dengan asumsi 4 porsi per kg).
    offer.status = "settled";
    offer.deliveredOn = new Date().toISOString();
    if (offer.targetTier === "tier_3") state.biomassProcessedKg += offer.quantityKg;
    // 4 porsi per kg adalah asumsi awal untuk dapur sosial, belum diverifikasi ke standar porsi.
    if (offer.targetTier === "tier_2") state.socialMealsServed += offer.quantityKg * 4;
    // Stok fisik lot berkurang sebesar berat yang diserahterimakan.
    const stock = state.stocks.find((item) => item.id === offer.stockId);
    if (stock) stock.remainingKg = Math.max(0, roundKg(stock.remainingKg - offer.quantityKg));
    return { success: true, message: isFreeMaggotOffer(offer) ? "Serah terima lot Maggot gratis dikonfirmasi." : isDonation(offer)
      ? "Donasi telah diserahterimakan. Reputasi kios diperbarui."
      : "Serah terima dikonfirmasi. Saldo simulasi pedagang diperbarui." };
  });
}

// Mencatat kedatangan pasokan fisik baru kios pada subuh hari dengan penomoran lot otomatis.
export function addVendorStockServer(commodityId: string, quantityKg: number, vendorId: string, sourceId?: string) {
  return updateState((state) => {
    const kiosk = KIOSKS.find((item) => item.id === vendorId);
    if (!kiosk || !COMMODITIES.some((item) => item.id === commodityId) ||
      !validWeight(quantityKg) || quantityKg === 0) {
      return { success: false, status: 422, message: "Pasokan harus memiliki kios, komoditas, dan berat yang valid." };
    }
    // ID sumber (misalnya dari update Telegram) membuat pencatatan idempoten.
    if (sourceId && state.stocks.some((stock) => stock.id === sourceId)) {
      return { success: true, message: "Pasokan ini sudah tercatat." };
    }
    // Nomor lot: LOT, nomor lapak, dan tiga byte acak dalam heksadesimal.
    state.stocks.unshift({
      id: sourceId ?? randomUUID(), vendorId, commodityId, initialKg: quantityKg, remainingKg: quantityKg,
      arrivalClock: getRealtimeWIBTimeString(), lotNumber: "LOT-" + kiosk.stallNumber + "-" + randomBytes(3).toString("hex").toUpperCase(),
      createdAt: new Date().toISOString(),
    });
    return { success: true, message: "Pasokan berhasil dicatat." };
  });
}

// Mengevaluasi kinetika peluruhan biologis stok kios berdasarkan waktu pajang dan kondisi cuaca lapangan terkini.
export function evaluateMarketStock(stock: StockItem, weather: { temperatureC: number; humidityPercent: number }, now = Date.now()) {
  const commodity = COMMODITIES.find((item) => item.id === stock.commodityId);
  if (!commodity) return null;
  // Lama pajang = jam sejak pasokan dibuat ditambah offset jam bawaan seed.
  const created = Date.parse(stock.createdAt ?? "");
  const elapsed = Number.isFinite(created) ? Math.max(0, (now - created) / 3_600_000) : 0;
  return calculateDecay(commodity, weather.temperatureC, weather.humidityPercent, (stock.hoursOffset ?? 0) + elapsed);
}

// Membaca snapshot komprehensif pasar terkini dengan pembaruan dinamis skor mutu dan estimasi sisa stok.
export async function readMarketSnapshot(user: Pick<AuthUser, "id" | "role" | "vendorId">) {
  const [state, weather] = await Promise.all([getServerSimulationState(), getHyperlocalMarketWeather()]);
  const now = Date.now();
  // Skor peluruhan dihitung ulang saat dibaca; bila tier penawaran bergeser, perubahan disimpan.
  const changed = syncOffersWithDecay(state, weather, now);
  if (changed) {
    // Ditunggu, bukan fire-and-forget: di Vercel proses dibekukan setelah respons terkirim sehingga
    // penulisan latar bisa hilang. Lewat updateState juga agar tidak menimpa mutasi lain (antrean lokal / CAS).
    await updateState((current) => syncOffersWithDecay(current, weather, now)
      ? { success: true, message: "Decay synced" }
      : { success: false, status: 409, message: "Tidak ada perubahan tier." })
      .catch((err) => console.error("Decay sync update failed:", err));
  }
  // Data disaring menurut peran dulu, baru dievaluasi dan dikirim.
  const visible = visibleMarketState(state, user);
  const stockHealth = Object.fromEntries(visible.stocks.map((stock) => [stock.id, evaluateMarketStock(stock, weather, now)]));
  // Perkiraan sisa belum ditimbang hanya untuk pedagang dan pengawas.
  const estimatesVisible = user.role === "vendor" || user.role === "admin" || user.role === "manager";
  const { footfallDropPercentage } = calculateRainFootfallAttenuation(weather.rainfallMm);
  const estimatedUnsoldKg = estimatesVisible
    ? Object.fromEntries(visible.stocks.filter((stock) => !stock.verifiedAt)
      .map((stock) => [stock.id, estimateUnsoldStockKg(state, stock, footfallDropPercentage)]))
    : {};
  // Pembeli tidak melihat penawaran aktif yang stok atau mutunya sudah tidak layak diklaim.
  if (user.role === "warteg" || user.role === "social_kitchen" || user.role === "maggot") {
    const stockById = new Map(visible.stocks.map((stock) => [stock.id, stock]));
    visible.offers = visible.offers.filter((offer) => offer.status !== "active" ||
      canClaimStock(state, offer, stockById.get(offer.stockId), stockHealth[offer.stockId]?.decayScore));
  }
  return { ...visible, stockHealth, estimatedUnsoldKg, weather: { isEstimated: weather.isEstimated ?? false, temperatureC: weather.temperatureC, humidityPercent: weather.humidityPercent } };
}

// Model Gemini mengikuti GEMINI_MODEL, sama dengan chatbot dan orkestrator.
const forecastModel = () => process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";

// Cache ramalan AI di memori instans agar model tidak dipanggil ulang selama masa berlaku.
// Cache jawaban analisis AI ikhtisar pasar dengan kunci dan masa berlaku, supaya masukan yang sama tidak memanggil Gemini berulang.
let aiForecastCache: {
  key: string;
  expiresAt: number;
  data: {
    summary: string;
    recommendation: string;
    model: string;
    source: "gemini" | "heuristik";
  };
} | null = null;

// Menghasilkan sintesis analisis operasional pasar berbasis Google Gemini dengan cache cerdas 10 menit (PSR-17).
// Menyediakan fail-safe otomatis ke ringkasan heuristik terformat jika API key tidak tersedia atau kuota habis.
// Masukan analisis: suhu, kelembapan, berat per penerima, jumlah kurir, dan ringkasan armada. Semuanya sudah dihitung di server, model hanya merangkai kalimat.
async function generateOverviewAiAnalysis(
  temperatureC: number,
  humidityPercent: number,
  wartegKg: number,
  socialKg: number,
  maggotKg: number,
  couriersCount: number,
  vehiclesList: string
): Promise<{ summary: string; recommendation: string; model: string; source: "gemini" | "heuristik" }> {
  // Kunci cache dari angka yang memengaruhi ramalan; berubah angka berarti ramalan dibuat ulang.
  const cacheKey = `${temperatureC}_${wartegKg}_${socialKg}_${maggotKg}_${couriersCount}`;
  if (aiForecastCache && aiForecastCache.key === cacheKey && Date.now() < aiForecastCache.expiresAt) {
    return aiForecastCache.data;
  }

  // Ringkasan bawaan tanpa model, dipakai bila kunci Gemini tidak ada atau panggilan gagal.
  const defaultHeuristic = {
    summary: `Suhu los ${temperatureC}°C (${humidityPercent}% RH). Total ${roundKg(wartegKg + socialKg + maggotKg)} kg komoditas siap salur (${wartegKg} kg Warteg, ${socialKg} kg Dapur Sosial, ${maggotKg} kg Maggot).`,
    recommendation: `Prioritas penjemputan sayuran daun Blok A sebelum 15:00 WIB menggunakan ${couriersCount} kurir armada (${vehiclesList}).`,
    model: forecastModel(),
    source: "heuristik" as const,
  };

  // Kunci terlalu pendek dianggap tidak valid (placeholder).
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey.length < 15) {
    aiForecastCache = { key: cacheKey, expiresAt: Date.now() + 5 * 60 * 1000, data: defaultHeuristic };
    return defaultHeuristic;
  }

  try {
    const prompt = `Anda adalah asisten logistik Pasar Induk Kramat Jati.
Data hari ini:
- Suhu: ${temperatureC}°C, Kelembapan: ${humidityPercent}% RH
- Alokasi Warteg: ${wartegKg} kg, Dapur Sosial: ${socialKg} kg, Maggot: ${maggotKg} kg
- Armada: ${couriersCount} kurir (${vehiclesList})

Berikan jawaban singkat, faktual, padat, tanpa kata-kata klise:
1. Satu kalimat status kondisi pasar dan total muatan.
2. Satu kalimat instruksi rute pengantaran prioritas.
Format persis:
RINGKASAN: [isi 1 kalimat ringkas]
REKOMENDASI: [isi 1 kalimat instruksi]`;

    // Kunci dikirim lewat header agar tidak ikut tercatat di log URL.
    // Panggilan HTTP langsung ke Gemini dengan batas 180 token, suhu 0,2, dan batas waktu 4 detik; kegagalan jatuh ke ringkasan heuristik.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(forecastModel())}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 180, temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(4000),
      }
    );

    // Respons dibaca dari kandidat pertama; teks kosong atau galat berarti ringkasan heuristik dipakai.
    if (response.ok) {
      const json = await response.json();
      const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text.length > 20) {
        let summary = defaultHeuristic.summary;
        let recommendation = defaultHeuristic.recommendation;

        const summaryMatch = text.match(/RINGKASAN:\s*([\s\S]*?)(?=REKOMENDASI:|$)/i);
        const recMatch = text.match(/REKOMENDASI:\s*([\s\S]*?)$/i);

        if (summaryMatch && summaryMatch[1].trim()) summary = summaryMatch[1].trim();
        if (recMatch && recMatch[1].trim()) recommendation = recMatch[1].trim();

        // Hasil Gemini disimpan di cache dengan kunci dan masa berlaku, lalu dikembalikan dengan sumber gemini.
        const geminiResult = {
          summary,
          recommendation,
          model: forecastModel(),
          source: "gemini" as const,
        };
        // Jawaban model sukses disimpan 10 menit.
        aiForecastCache = { key: cacheKey, expiresAt: Date.now() + 10 * 60 * 1000, data: geminiResult };
        return geminiResult;
      }
    }
  } catch {
    // Bila model gagal, beralih ke perkiraan heuristik tanpa menghambat respons.
  }

  // Gagal atau tanpa model: ramalan heuristik disimpan 3 menit supaya model tidak dipanggil berulang.
  aiForecastCache = { key: cacheKey, expiresAt: Date.now() + 3 * 60 * 1000, data: defaultHeuristic };
  return defaultHeuristic;
}

// Katalog publik: penawaran aktif yang masih bisa diklaim di seluruh pasar.
// Hanya memuat data etalase (komoditas, kios penjual, tujuan, harga, berat); tanpa pembeli, pesanan, atau dana.
export async function readPublicCatalog() {
  const [state, weather] = await Promise.all([getServerSimulationState(), getHyperlocalMarketWeather()]);
  const now = Date.now();
  const stockById = new Map(state.stocks.map((stock) => [stock.id, stock]));
  // Hanya field etalase yang disalin; pembeli, pesanan, dan dana sengaja tidak ikut.
  // Katalog publik: hanya penawaran aktif yang masih boleh diklaim, dan hanya bidang aman (tanpa data pembeli atau dana).
  return state.offers.flatMap((offer) => {
    if (offer.status !== "active") return [];
    const stock = stockById.get(offer.stockId);
    const score = stock && evaluateMarketStock(stock, weather, now)?.decayScore;
    if (!canClaimStock(state, offer, stock, score)) return [];
    return [{
      id: offer.id, stockId: offer.stockId, vendorId: offer.vendorId, commodityId: offer.commodityId, targetTier: offer.targetTier,
      quantityKg: offer.quantityKg, originalPricePerKg: offer.originalPricePerKg, salvagePricePerKg: offer.salvagePricePerKg,
      discountPercentage: offer.discountPercentage, totalAmountIdr: offer.totalAmountIdr, distributionMode: offer.distributionMode,
      status: offer.status, paymentStatus: "unpaid" as const, expiresInMinutes: offer.expiresInMinutes, isMine: false,
    }];
  });
}

// Menyusun ringkasan agregat pasar publik untuk beranda tanpa membocorkan privasi akun maupun transaksi.
// Memetakan proyeksi serapan 3-tier, kebutuhan armada kurir, serta sintesis catatan operasional AI.
export async function readPublicMarketOverview() {
  const [state, weather] = await Promise.all([getServerSimulationState(), getHyperlocalMarketWeather()]);
  const now = Date.now();
  const stockById = new Map(state.stocks.map((stock) => [stock.id, stock]));
  // Penghitung per jalur untuk penawaran yang masih bisa diklaim; pengantaran selesai dihitung terpisah.
  // Rekap ikhtisar pasar: lot dan kg per jalur tujuan, jumlah komoditas, kg tersedia, kg tersalurkan, dan pengantaran selesai.
  const lanes = { tier_1: { lots: 0, kg: 0 }, tier_2: { lots: 0, kg: 0 }, tier_3: { lots: 0, kg: 0 } };
  const commodities = new Map<string, number>();
  let availableLots = 0;
  let availableKg = 0;
  let distributedKg = 0;
  let completedDeliveries = 0;
  for (const offer of state.offers) {
    if (offer.status === "settled") {
      distributedKg += offer.quantityKg;
      completedDeliveries++;
    }
    if (offer.status !== "active") continue;
    const stock = stockById.get(offer.stockId);
    const score = stock && evaluateMarketStock(stock, weather, now)?.decayScore;
    if (!canClaimStock(state, offer, stock, score)) continue;
    const commodity = COMMODITIES.find((item) => item.id === offer.commodityId);
    if (!commodity) continue;
    lanes[offer.targetTier].lots++;
    lanes[offer.targetTier].kg += offer.quantityKg;
    availableLots++;
    availableKg += offer.quantityKg;
    commodities.set(commodity.localName, (commodities.get(commodity.localName) ?? 0) + offer.quantityKg);
  }
  // Lima komoditas dengan volume terbesar; seri diurutkan menurut nama.
  const topCommodities = [...commodities].map(([name, kg]) => ({ name, kg }))
    .sort((a, b) => b.kg - a.kg || a.name.localeCompare(b.name, "id")).slice(0, 5);

  // Berat dan jumlah lot per tier diambil dari rekap lane di atas.
  const wartegKg = lanes.tier_1.kg;
  const wartegLots = lanes.tier_1.lots;
  const socialKg = lanes.tier_2.kg;
  const socialLots = lanes.tier_2.lots;
  const maggotKg = lanes.tier_3.kg;
  const maggotLots = lanes.tier_3.lots;

  // Alokasi armada logistik berdasarkan ambang batas bobot muatan (Weight Dispatch Rule PSR-27)
  // Perkiraan armada publik: Viar untuk Warteg (300 kg per unit), GranMax untuk dapur sosial dan kelebihan Warteg (1.000 kg), Isuzu untuk maggot (4.000 kg).
  const viarUnits = wartegKg > 0 ? Math.max(1, Math.ceil(wartegKg / 300)) : 1;
  const granmaxUnits = (socialKg > 0 || wartegKg > 300) ? Math.max(1, Math.ceil((socialKg + Math.max(0, wartegKg - 300)) / 1000)) : 1;
  const isuzuUnits = maggotKg > 300 ? Math.max(1, Math.ceil(maggotKg / 4000)) : (availableKg > 800 ? 1 : 0);

  // Daftar armada untuk ikhtisar. Nama pengemudi dan pelat adalah data contoh (demo), bukan data operasional nyata.
  const vehicles = [
    {
      type: "viar_trike" as const,
      name: "Motor Viar Roda 3",
      units: viarUnits,
      driverName: "Pak Joko Santoso",
      licensePlate: "B 4521 TXX",
      capacityKg: 300,
      fuelType: "Pertalite",
      targetLane: "Warteg & UMKM",
      description: "Rute los basah dan warteg mitra.",
    },
    {
      type: "granmax_pickup" as const,
      name: "Daihatsu GranMax Pikap",
      units: granmaxUnits,
      driverName: "Pak Hendra Wijaya",
      licensePlate: "B 9812 SAA",
      capacityKg: 1000,
      fuelType: "Pertamax",
      targetLane: "Dapur Sosial & Panti",
      description: "Rute gabungan Warteg dan Dapur Sosial.",
    },
    ...(isuzuUnits > 0 ? [{
      type: "isuzu_truck" as const,
      name: "Truk Engkel Isuzu Elf",
      units: isuzuUnits,
      driverName: "Bpk. Rahmat Hidayat",
      licensePlate: "B 7710 KDA",
      capacityKg: 4000,
      fuelType: "Bio Solar",
      targetLane: "Sentra Maggot BSF",
      description: "Pengangkutan limbah organik ke sentra maggot.",
    }] : []),
  ];

  // Jumlah unit seluruh armada dan ringkasannya dikirim ke analisis AI.
  const totalCouriers = vehicles.reduce((sum, v) => sum + v.units, 0);
  const vehicleSummary = vehicles.map((v) => `${v.units} ${v.name}`).join(", ");

  // Analisis AI memakai angka rekap di atas; hasilnya dicache dan punya cadangan heuristik.
  const aiAnalysis = await generateOverviewAiAnalysis(
    weather.temperatureC,
    weather.humidityPercent,
    wartegKg,
    socialKg,
    maggotKg,
    totalCouriers,
    vehicleSummary
  );

  // Paket ramalan untuk beranda; porsi dihitung dengan asumsi 1 kg bahan menjadi 4 porsi.
  // Objek prakiraan akhir yang dikirim ke dashboard: cuaca, penerima, armada, dan analisis AI.
  const forecast = {
    weather: {
      temperatureC: weather.temperatureC,
      humidityPercent: weather.humidityPercent,
      isEstimated: weather.isEstimated ?? false,
    },
    recipients: {
      warteg: {
        lots: wartegLots,
        kg: wartegKg,
        partnerCount: 5,
        estimatedMeals: Math.round(wartegKg * 4),
        description: "Sayuran segar & layu ringan siap olah untuk Warteg & UMKM kuliner.",
      },
      socialKitchen: {
        lots: socialLots,
        kg: socialKg,
        partnerCount: 3,
        // Untuk dapur sosial angka 4 per kg adalah perkiraan penerima manfaat.
        // Penerima manfaat dapur sosial adalah perkiraan sederhana 4 porsi per kg, bukan data penerima nyata.
        estimatedBeneficiaries: Math.round(socialKg * 4),
        description: "Bahan pangan bernutrisi terlindungi jendela 30 menit untuk dapur sosial dan panti asuhan.",
      },
      maggot: {
        lots: maggotLots,
        kg: maggotKg,
        partnerCount: 2,
        landfillDivertedKg: maggotKg,
        description: "Biomassa afkir teralihkan ke biokonversi maggot BSF bebas biaya (Rp0).",
      },
    },
    fleet: {
      totalCouriers,
      totalPayloadKg: availableKg,
      vehicles,
    },
    aiAnalysis,
  };

  return { availableLots, availableKg, distributedKg, completedDeliveries, lanes, topCommodities, forecast };
}

// Memvalidasi apakah lot penawaran masih memiliki sisa fisik yang memadai dan mutu yang sesuai untuk diklaim.
function canClaimStock(state: ServerState, offer: RescueOffer, stock: StockItem | undefined, score: number | undefined) {
  return Boolean(stock?.verifiedAt && roundKg(stock.remainingKg - reservedStockKg(state, stock.id)) >= offer.quantityKg && isOfferSuitable(offer, score));
}

// Menghitung bobot komoditas yang sedang berada dalam status reservasi pesanan aktif.
function reservedStockKg(state: ServerState, stockId: string) {
  return roundKg(state.offers.reduce((sum, offer) => sum + (offer.stockId === stockId && offer.status === "claimed" ? offer.quantityKg : 0), 0));
}

// Menghitung bobot komoditas yang telah berhasil diserahterimakan ke pembeli dari satu lot pasokan.
function distributedStockKg(state: ServerState, stockId: string) {
  return roundKg(state.offers.reduce((sum, offer) => sum + (offer.stockId === stockId && offer.status === "settled" ? offer.quantityKg : 0), 0));
}

// Memproyeksikan sisa stok eceran yang belum terjual akibat cuaca tanpa mengubah catatan timbangan fisik aktual.
function estimateUnsoldStockKg(state: ServerState, stock: StockItem, footfallDropPercentage: number) {
  const reserved = reservedStockKg(state, stock.id);
  const estimated = predictRetailSurplusKg(stock.initialKg, footfallDropPercentage) - distributedStockKg(state, stock.id) - reserved;
  return Math.max(0, roundKg(Math.min(stock.remainingKg - reserved, estimated)));
}

// Memvalidasi kepatuhan nilai bobot terhadap rentang toleransi fisik dan batas presisi 2 desimal.
function validWeight(weight: number) {
  return Number.isFinite(weight) && weight >= 0 && weight <= 10_000 && roundKg(weight) === weight;
}

// Menyelaraskan alokasi tier penawaran (Tier 1/2/3) dan skema harga penyelamatan dengan laju peluruhan mutu fisik terkini (PSR-14 / Invarian 1 & 2).
// Mencegah komoditas afkir (decayScore >= 0.85) masuk ke katalog pangan manusia (Warteg & Dapur Sosial)
// serta mengalihkan lot yang mutunya menurun secara otomatis ke peruntukan yang sah.
export function syncOffersWithDecay(
  state: ServerState,
  weather: { temperatureC: number; humidityPercent: number },
  now = Date.now()
): boolean {
  let changed = false;
  const stockById = new Map(state.stocks.map((stock) => [stock.id, stock]));

  for (const offer of state.offers) {
    if (offer.status !== "active" && offer.status !== "pending_vendor") continue;
    const stock = stockById.get(offer.stockId);
    if (!stock) continue;

    // Skor peluruhan terbaru menentukan tier sebenarnya; bila berbeda dari tier penawaran, penawaran dipindah dan harganya dihitung ulang.
    const health = evaluateMarketStock(stock, weather, now);
    if (!health) continue;

    const liveTier = distributionTierForDecay(health.decayScore);
    if (offer.targetTier !== liveTier) {
      changed = true;
      offer.targetTier = liveTier;

      if (liveTier === "tier_3") {
        // Tier 3: gratis, khusus biokonversi.
        offer.distributionMode = "free";
        offer.salvagePricePerKg = 0;
        offer.totalAmountIdr = 0;
        offer.discountPercentage = 100;
        // paymentStatus sengaja tetap "unpaid": "not_required" baru diberikan saat lot diklaim,
        // agar lot yang belum diklaim tidak masuk antrean kurir (yang memfilter paymentStatus !== "unpaid").
      } else if (liveTier === "tier_2") {
        // Tier 2: harga dari tabel diskon tunggal (75-85 persen); donasi yang sudah dipilih pedagang tetap Rp0.
        const commodity = COMMODITIES.find((c) => c.id === offer.commodityId);
        if (commodity && offer.distributionMode !== "donation") {
          applySalvageQuote(offer, quoteSalvagePrice(commodity, health.decayScore));
        }
        if (offer.distributionMode !== "donation") {
          offer.distributionMode = "sale";
        }
      } else if (liveTier === "tier_1") {
        // Tier 1: harga dari tabel diskon tunggal (50-70 persen) dengan harga lantai Tier 1; lot kembali berbayar.
        const commodity = COMMODITIES.find((c) => c.id === offer.commodityId);
        if (commodity) applySalvageQuote(offer, quoteSalvagePrice(commodity, health.decayScore));
        offer.distributionMode = "sale";
        if (offer.paymentStatus === "not_required") {
          offer.paymentStatus = "unpaid";
        }
      }
    }
  }

  return changed;
}

// Menulis harga, diskon, dan total dari penawaran harga tabel tunggal ke sebuah penawaran.
function applySalvageQuote(offer: RescueOffer, quote: SalvagePriceQuote) {
  offer.salvagePricePerKg = quote.pricePerKg;
  offer.discountPercentage = quote.discountPercent;
  offer.totalAmountIdr = Math.round(quote.pricePerKg * offer.quantityKg);
}

// Memastikan peruntukan tier penawaran tetap selaras dengan kondisi kinetika peluruhan biologis terkini.
function isOfferSuitable(offer: RescueOffer, score: number | undefined) {
  return score !== undefined && offer.targetTier === distributionTierForDecay(score);
}

// Mengonstruksi usulan penawaran penyelamatan pangan dari hasil evaluasi kinetika biologis dan proteksi harga modal.
function evaluateStockOffer(stock: StockItem, weather: { temperatureC: number; humidityPercent: number }, automatic: boolean): RescueOffer | null {
  const commodity = COMMODITIES.find((item) => item.id === stock.commodityId);
  const evaluation = evaluateMarketStock(stock, weather);
  if (!commodity || !evaluation || stock.remainingKg <= 0) return null;
  // Usulan otomatis hanya dibuat untuk lot yang skornya sudah 0,35 ke atas; yang masih segar tidak perlu diselamatkan.
  if (automatic && evaluation.decayScore < 0.35) return null;
  // Tier, harga, dan diskon dari tabel tunggal. Lot segar yang tetap diterbitkan pedagang ikut diskon awal Tier 1 (50 persen),
  // jadi tidak pernah lebih murah daripada lot yang sudah layu.
  const quote = quoteSalvagePrice(commodity, evaluation.decayScore);
  return {
    id: randomUUID(), stockId: stock.id, vendorId: stock.vendorId, commodityId: commodity.id,
    targetTier: quote.tier, quantityKg: stock.remainingKg, originalPricePerKg: commodity.baseWholesalePricePerKg,
    salvagePricePerKg: quote.pricePerKg, discountPercentage: quote.discountPercent,
    // Penawaran berlaku 30 menit; usulan otomatis menunggu pedagang, penawaran manual langsung aktif.
    totalAmountIdr: Math.round(quote.pricePerKg * stock.remainingKg), expiresInMinutes: 30,
    createdAt: new Date().toISOString(), status: automatic ? "pending_vendor" : "active", paymentStatus: "unpaid",
  };
}

// Mencatat hasil penimbangan fisik pedagang dan menerbitkan penawaran aktif ke katalog pasar.
function publishConfirmedStock(
  state: ServerState, stock: StockItem, weather: { temperatureC: number; humidityPercent: number },
  confirmation: StockConfirmation | undefined, proposal?: RescueOffer,
): MutationResult {
  // Batas sisa fisik: stok awal dikurangi yang sudah diserahterimakan dan yang sedang dipesan.
  const reserved = reservedStockKg(state, stock.id);
  const max = Math.max(0, roundKg(stock.initialKg - distributedStockKg(state, stock.id) - reserved));
  if (!confirmation || !validWeight(confirmation.confirmedKg) || confirmation.confirmedKg > max) {
    return { success: false, status: 422, message: "Konfirmasi berat sisa yang belum dipesan, maksimal " + max.toLocaleString("id-ID") + " kg." };
  }
  const { confirmedKg, mode } = confirmation;
  // Sisa nol: hasil timbang disimpan dan usulan ditutup tanpa menerbitkan penawaran.
  if (confirmedKg === 0) {
    stock.remainingKg = reserved;
    stock.verifiedAt = new Date().toISOString();
    if (proposal) proposal.status = "rejected";
    return { success: true, message: "Hasil timbang tersimpan. Tidak ada penawaran yang diterbitkan." };
  }
  // Tier ditentukan dari mutu lot saat ini; tier 2 wajib memilih jual atau donasi, donasi tidak boleh di tier lain.
  const listing = evaluateStockOffer({ ...stock, remainingKg: confirmedKg }, weather, false);
  if (!listing) return { success: false, status: 422, message: "Mutu lot belum dapat dievaluasi." };
  if (listing.targetTier === "tier_2" && !mode) {
    return { success: false, status: 422, message: "Pilih jual atau donasi untuk lot dapur sosial." };
  }
  if (listing.targetTier !== "tier_2" && mode === "donation") {
    return { success: false, status: 422, message: "Donasi hanya berlaku untuk lot dapur sosial." };
  }
  // Lot maggot selalu gratis; donasi berharga nol dan diskon 100 persen.
  listing.distributionMode = listing.targetTier === "tier_3" ? "free" : mode ?? "sale";
  if (listing.distributionMode === "donation") {
    listing.salvagePricePerKg = 0;
    listing.totalAmountIdr = 0;
    listing.discountPercentage = 100;
  }
  // Sisa fisik terkonfirmasi ditambah berat yang sudah dipesan menjadi sisa stok baru.
  stock.remainingKg = roundKg(confirmedKg + reserved);
  stock.verifiedAt = new Date().toISOString();
  if (proposal) Object.assign(proposal, listing, { id: proposal.id });
  else state.offers.unshift(listing);
  const message = listing.distributionMode === "free" ? "Lot Maggot gratis diterbitkan."
    : listing.distributionMode === "donation" ? "Penawaran donasi diterbitkan." : "Penawaran jual diterbitkan.";
  return { success: true, message };
}

// Menerbitkan usulan penawaran terjadwal atau memublikasikan satu lot spesifik yang dikonfirmasi oleh pemiliknya.
export async function publishMarketOffers(vendorId?: string, stockId?: string, confirmation?: StockConfirmation) {
  const weather = await getHyperlocalMarketWeather();
  return updateState((state) => {
    // Pedagang menerbitkan satu lot; tanpa argumen, ini adalah sapuan terjadwal untuk semua kios.
    if (vendorId || stockId) {
      const stock = state.stocks.find((item) => item.id === stockId && item.vendorId === vendorId);
      if (!stock || state.offers.some((offer) => offer.stockId === stock.id && (offer.status === "active" || offer.status === "pending_vendor"))) {
        return { success: false, status: 409, message: "Stok ini tidak tersedia atau sudah memiliki penawaran." };
      }
      return publishConfirmedStock(state, stock, weather, confirmation);
    }

    // Sapuan terjadwal: sinkronkan tier, kembalikan penawaran aktif yang lotnya belum ditimbang menjadi menunggu pedagang.
    const stockById = new Map(state.stocks.map((stock) => [stock.id, stock]));
    syncOffersWithDecay(state, weather);
    for (const offer of state.offers) {
      if (offer.status !== "active") continue;
      const stock = stockById.get(offer.stockId);
      if (stock && !stock.verifiedAt) offer.status = "pending_vendor";
    }

    // Lot yang sudah punya penawaran aktif dilewati; sisanya dinilai ulang dari perkiraan sisa tak terjual.
    // Evaluasi stok: stok yang sudah punya penawaran aktif dilewati, usulan menunggu pedagang dicocokkan per stok, dan penurunan pengunjung karena hujan ikut dihitung.
    const active = new Set(state.offers.filter((offer) => offer.status === "active").map((offer) => offer.stockId));
    const pending = new Map(state.offers.filter((offer) => offer.status === "pending_vendor").map((offer) => [offer.stockId, offer]));
    const { footfallDropPercentage } = calculateRainFootfallAttenuation(weather.rainfallMm);
    const newProposals: RescueOffer[] = [];
    let updated = 0;
    for (const stock of state.stocks) {
      if (active.has(stock.id)) continue;
      const proposedKg = estimateUnsoldStockKg(state, stock, footfallDropPercentage);
      const proposal = evaluateStockOffer({ ...stock, remainingKg: proposedKg }, weather, true);
      const existing = pending.get(stock.id);
      // Usulan lama diperbarui, usulan baru ditambahkan, dan usulan yang tidak lagi layak ditolak.
      // Usulan lama diperbarui, usulan baru dimasukkan, dan usulan yang tidak lagi layak ditolak.
      if (proposal && existing) {
        Object.assign(existing, proposal, { id: existing.id, createdAt: existing.createdAt });
        updated++;
      } else if (proposal) {
        newProposals.push(proposal);
      } else if (existing) {
        existing.status = "rejected";
      }
    }
    state.offers.unshift(...newProposals);
    return { success: true, message: newProposals.length + " usulan baru, " + updated + " diperbarui. Menunggu konfirmasi pedagang." };
  });
}

// Memproses keputusan pedagang atas usulan penawaran (menyetujui atau menolak/menarik penawaran aktif).
export async function decideVendorOffer(offerId: string, vendorId: string, approved: boolean, confirmation?: StockConfirmation) {
  // Cuaca hanya dibutuhkan saat menyetujui, karena persetujuan menerbitkan penawaran.
  const weather = approved ? await getHyperlocalMarketWeather() : undefined;
  return updateState((state) => {
    // Pedagang hanya bisa memutuskan penawaran kiosnya sendiri.
    // Konfirmasi pedagang: penawaran harus milik kios itu dan masih menunggu atau aktif; bila ada cuaca, stok ditimbang ulang dan penawaran diterbitkan.
    const offer = state.offers.find((item) => item.id === offerId && item.vendorId === vendorId);
    if (!offer) return { success: false, status: 404, message: "Penawaran kios tidak ditemukan." };
    if (offer.status !== "pending_vendor" && offer.status !== "active") {
      return { success: false, status: 409, message: "Penawaran sudah diproses." };
    }
    if (weather) {
      const stock = state.stocks.find((item) => item.id === offer.stockId && item.vendorId === vendorId);
      if (!stock) return { success: false, status: 404, message: "Stok penawaran tidak ditemukan." };
      if (offer.status === "active" && stock.verifiedAt) {
        return { success: false, status: 409, message: "Penawaran sudah aktif. Tarik sebelum menimbang ulang." };
      }
      return publishConfirmedStock(state, stock, weather, confirmation, offer);
    }
    // Menolak atau menarik tidak memerlukan penimbangan.
    offer.status = "rejected";
    return { success: true, message: "Penawaran ditarik atau ditolak." };
  });
}

// Mengambil katalog penawaran aktif yang memenuhi syarat kelayakan bagi peran pembeli tertentu.
export async function getSurplusOffersForRole(role: BuyerRole) {
  const state = await readMarketSnapshot({ id: "", role });
  return state.offers.filter((offer) => offer.status === "active");
}
