// Skrip Seed Ulang Deployment (Remote Reseed).
// Memanggil POST /api/admin/seed di deployment (misalnya Vercel) supaya data pasar dibuat ulang dari awal:
// 30 kios, 180 lot, dan penawaran aktif di ketiga tier (Warteg, dapur sosial, maggot), lalu memeriksa hasilnya.
// Pemakaian:
//   PASARIN_URL=https://pasarin.vercel.app PASARIN_SEED_SECRET=xxxx npm run seed:remote
// Peringatan: seed MENIMPA seluruh state pasar di deployment itu (stok, penawaran, transaksi, saldo).

// Alamat dasar deployment tanpa garis miring di akhir.
const baseUrl = (process.env.PASARIN_URL ?? "").replace(/\/+$/, "");
// Kunci server yang sama dengan PASARIN_SEED_SECRET di Vercel.
const secret = process.env.PASARIN_SEED_SECRET ?? "";

// Menjalankan seed lalu menampilkan jumlah lot per tier dari ringkasan publik.
async function run() {
  if (!baseUrl || !secret) {
    throw new Error("Isi PASARIN_URL dan PASARIN_SEED_SECRET. Contoh: PASARIN_URL=https://pasarin.vercel.app");
  }
  console.log(`Seed ulang ${baseUrl} (semua data pasar akan ditimpa)...`);

  // Permintaan seed memakai rahasia di header; body kosong sudah cukup.
  const response = await fetch(`${baseUrl}/api/admin/seed`, {
    method: "POST",
    headers: { "x-pasarin-seed-secret": secret, "content-type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Seed gagal (${response.status}): ${body?.error ?? body?.message ?? "tanpa pesan"}`);
  }
  console.log("Seed berhasil:", JSON.stringify(body.data ?? body));

  // Verifikasi: ringkasan publik harus memuat lot di ketiga tier.
  const overview = await fetch(`${baseUrl}/api/market/overview`, { signal: AbortSignal.timeout(30_000) });
  const summary = await overview.json().catch(() => ({}));
  const lanes = summary?.data?.lanes;
  if (!lanes) {
    console.log("Ringkasan publik belum bisa dibaca; cek manual di /api/market/overview.");
    return;
  }
  console.log(`Lot aktif: Tier 1 ${lanes.tier_1.lots}, Tier 2 ${lanes.tier_2.lots}, Tier 3 ${lanes.tier_3.lots}`);
  if (!lanes.tier_1.lots || !lanes.tier_2.lots || !lanes.tier_3.lots) {
    throw new Error("Ada tier yang kosong setelah seed. Periksa log deployment.");
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
