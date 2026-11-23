# Panduan Lengkap PASARIN

Panduan ini menjelaskan seluruh isi repositori: konsep, alur, rumus, peran, agen AI, dan fungsi tiap file. Disusun supaya enak dipakai saat ditanya "ini apa, kenapa begini, cara kerjanya bagaimana".

---

## 1. Satu kalimat inti

**PASARIN adalah platform penyelamatan surplus sayur dan buah Pasar Induk Kramat Jati.** Sayur yang mulai layu dan belum laku dihitung tingkat susutnya dengan rumus, lalu disalurkan ke tujuan yang paling tepat: Warteg, dapur sosial, atau sentra maggot, sebelum benar-benar terbuang.

Versi 30 detik untuk presentasi:

> Di pasar induk, sayur yang tidak laku sore hari biasanya dibuang. PASARIN menghitung seberapa layu tiap lot memakai suhu, kelembapan, dan lama pajang. Lot yang masih bagus dijual diskon ke Warteg, yang agak layu didonasikan ke dapur sosial, dan yang sudah tidak layak dimakan diberikan ke maggot. Pembayaran lewat QRIS simulasi dengan dana ditahan (escrow) sampai barang diterima.

---

## 2. Masalah dan ide solusi

| Masalah | Solusi di PASARIN |
|---|---|
| Surplus sayur terbuang tiap hari | Skor susut per lot, lalu penyaluran bertingkat |
| Pedagang tidak tahu harus menjual sisa ke mana | Sistem menentukan tujuan (tier) otomatis dari skor |
| Pembeli kecil sulit mendapat bahan murah yang layak | Katalog penawaran diskon khusus per jenis pembeli |
| Pedagang takut tidak dibayar, pembeli takut tertipu | Escrow: dana ditahan sampai serah terima dikonfirmasi |
| Bahan layak makan jangan sampai jadi pakan | Gerbang mutu memblokirnya (Invarian 1) |
| Pengelola butuh gambaran seluruh pasar | Dasbor pengawas, buku besar, dan asisten AI |

---

## 3. Peran pengguna

Ada 7 peran. Tiap peran hanya melihat data yang menjadi haknya.

| Peran | Kode | Isi dasbor |
|---|---|---|
| Pedagang kios | `vendor` | Stok dan mutu lot, catat pasokan, timbang, setujui penawaran, saldo dompet |
| Warteg dan UMKM | `warteg` | Katalog Tier 1, klaim, bayar QRIS, riwayat |
| Dapur sosial dan panti | `social_kitchen` | Katalog Tier 2 (jual murah atau donasi), klaim |
| Sentra maggot | `maggot` | Katalog Tier 3, biomassa gratis |
| Kurir | `logistics` | Antrean antar tiga tahap, konfirmasi serah terima |
| Pengelola pasar | `manager` | Tombol Laporan penjualan yang membuka ringkasan hari ini (penjualan, pesanan selesai, berat, dana ditahan, komoditas teratas, penyaluran per tujuan) dan riwayat harian, pantauan seluruh penawaran, buku besar |
| Admin | `admin` | Semua milik pengelola, ditambah tombol evaluasi stok dan penyemaian data |

Akun demo: 30 pedagang, 100 Warteg, 3 dapur sosial, 2 maggot, 5 kurir, 1 pengelola, 1 admin (total 142). Di mode lokal, kata sandi sama dengan nama pengguna, misalnya `admin1` / `admin1`.

---

## 4. Konsep inti

### 4.1 Skor susut (decay score)

Angka 0 sampai 1 yang menyatakan seberapa layu satu lot. **Dihitung dengan rumus, bukan oleh AI.**

```
paparan   = jam dipajang / batas jam komoditas
kecepatan = Q10^((suhu - 32,5) / 10) x faktorKelembapan(RH) / faktorKelembapan(75)
skor      = (paparan x kecepatan)^1,15 x 0,82     (dibatasi 0 sampai 1)
```

- **Batas jam** berbeda tiap komoditas (kangkung cepat layu, labu tahan lama).
- **Q10** adalah ukuran seberapa cepat proses membusuk naik tiap kenaikan 10 derajat. Nilainya per komoditas.
- **Kondisi acuan** adalah 32,5 °C dan 75 persen RH. Pada kondisi itu kecepatan bernilai tepat 1.
- **Kecepatan** dibatasi 0,2 sampai 5 kali agar suhu ekstrem tidak menghasilkan angka tak masuk akal.
- Konstanta 0,82 dan eksponen 1,15 adalah **kalibrasi buatan**, bukan hasil pengukuran. Jawab jujur bila ditanya: skor adalah indeks relatif.

Contoh: batas 16 jam, dipajang 8 jam pada kondisi acuan. Paparan 0,5, kecepatan 1. Skor = 0,5^1,15 x 0,82 = **0,37**, jadi sudah layu ringan.

Contoh pada suhu lebih panas dengan kecepatan 1,5: (0,5 x 1,5)^1,15 x 0,82 = **0,59**, masih layu ringan tetapi mendekati Tier 2.

### 4.2 Tiga tier penyaluran

| Skor | Kondisi | Tujuan | Diskon |
|---|---|---|---|
| di bawah 0,35 | Segar prima | Eceran biasa di kios | tidak ada |
| 0,35 sampai 0,65 | Layu ringan | **Tier 1**: Warteg dan UMKM | 50 sampai 70 persen |
| 0,65 sampai 0,85 | Layu sedang | **Tier 2**: dapur sosial dan panti | 75 sampai 85 persen, atau donasi |
| 0,85 ke atas | Tidak layak | **Tier 3**: sentra maggot | gratis |

Diskon Tier 1 naik lurus mengikuti posisi skor. Contoh: skor 0,50 berada di tengah fase, jadi diskon 60 persen.

Harga akhir = harga grosir x (1 - diskon), dibulatkan ke kelipatan Rp500, lalu **tidak boleh di bawah harga lantai** komoditas supaya pedagang tidak rugi di bawah modal.

### 4.3 Tiga aturan yang tidak boleh dilanggar (invarian)

1. **Tidak ada makanan layak manusia yang diberikan ke maggot.** Bahan dengan skor di bawah 0,85 yang diminta ke Tier 3 diblokir, dicatat di audit, dan pedagang kena penalti reputasi 5 poin.
2. **Urutan harga:** harga Tier 1 lebih besar dari Tier 2, Tier 2 lebih besar atau sama dengan Tier 3, dan Tier 3 minimal Rp1.500/kg pada rumus harga.
3. **Jendela eksklusif 30 menit untuk Tier 2:** dapur sosial punya kesempatan pertama sebelum penawaran dibuka ke peran lain.

### 4.4 Proyeksi surplus dan hujan

Hujan mengurangi pengunjung lorong, sehingga lebih banyak sayur tersisa. Penurunan pengunjung:

| Curah hujan | Penurunan pengunjung |
|---|---|
| 0 mm | 0 persen |
| sampai 2 mm | 15 persen |
| sampai 5 mm | 28 persen |
| 5 sampai 10 mm | naik lurus sampai 48 persen (lantai 28 persen) |
| di atas 10 mm | 48 persen + 1,6 persen per mm tambahan, maksimum 80 persen |

Pengali surplus = 1 + 0,95 x penurunan. Contoh: penurunan 48 persen memberi pengali 1,456.

### 4.5 Pencocokan pembeli (matchmaking)

Setiap penawaran dicocokkan ke mitra pada tier yang sama.

```
skor = 0,50 x skorJarak + 0,30 x skorKapasitas + 0,20 x skorReputasi + bonusPreferensi
skorJarak     = 1 - jarak / radius maksimal (5 km)
skorKapasitas = sisa kuota harian / kuota harian
bonusPreferensi = 0,05 bila komoditas favorit mitra
```

Jarak memakai rumus Haversine (garis lurus, bukan jarak jalan). Mitra di luar radius atau yang sisa kuotanya kurang dinyatakan tidak layak dan diberi skor 0, tetapi tetap tampil dengan alasannya.

### 4.6 Armada

| Muatan | Kendaraan |
|---|---|
| sampai 300 kg | Motor Viar Roda Tiga |
| sampai 1.000 kg | Daihatsu GranMax Pikap Bak |
| di atas 1.000 kg | Truk Engkel Isuzu Elf (4.000 kg per unit) |

Satu sumber kebenaran: `fleetCargoCalculator.ts`. Registri alat AI dan dasbor kurir memakai kalkulator yang sama.

### 4.7 Pembayaran QRIS dan escrow

1. Pembeli klaim penawaran (jumlah bisa sebagian).
2. Sistem membuat **payload QRIS dinamis** berstandar EMVCo TLV dengan checksum CRC16 (simulasi, bukan pembayaran sungguhan).
3. Setelah bayar, status menjadi `held_in_escrow`: uang ditahan.
4. Kurir mengantar dan mengonfirmasi serah terima.
5. Dana **dicairkan** ke dompet pedagang (`released_to_vendor`). Bisa juga `refunded`.

Lot Tier 3 gratis, jadi tidak ada pembayaran.

### 4.8 Cuaca

Sumber berurutan: **OpenWeather**, lalu **Open-Meteo** (tanpa kunci), lalu **profil tropis cadangan** (32 °C, 75 persen RH). Hasil di-cache. Cuaca dipakai oleh rumus skor dan proyeksi surplus.

### 4.9 Sapuan sore otomatis

Tiap hari pukul **14.30 WIB** (cron `30 7 * * *` UTC di `vercel.json`) sistem memindai stok, memproyeksikan surplus, memeriksa gerbang mutu, dan menghitung kebutuhan armada. Orkestrator menulis ringkasannya.

---

## 5. Agen AI

Ada dua kelompok. Detailnya ada di jawaban sebelumnya; ringkasnya di sini.

### 5.1 Yang memakai Gemini (model `gemini-3.5-flash-lite`)

Gemini hanya menyusun kalimat. **Angka selalu dihitung server.**

| Fitur | File utama |
|---|---|
| Panel chat per peran (dan Telegram) | `marketChatbot.ts` |
| Asisten publik di landing page | `publicChatbot.ts` |
| Penjelas skor "kenapa skornya segini" | `decayExplainer.ts` |
| Analisis ikhtisar pasar | `serverSimulationState.ts` |
| Orkestrator: ringkasan sapuan dan kueri pengelola | `geminiOrchestrator.ts` |

Penjaga kuota (`aiBudget.ts`): cache jawaban (200 entri), batas panggilan harian (`AI_DAILY_CALL_LIMIT`), dan jeda 5 menit setelah respons 429. Gagal berarti jatuh ke jawaban berbasis rumus atau data.

### 5.2 Yang murni rumus (tidak memanggil AI)

Skor susut, klasifikasi tier, harga, proyeksi surplus, gerbang mutu, pencocokan, armada, metana, konversi satuan, dan cuaca.

### 5.3 Cara panel chat memutuskan

1. Pertanyaan dinormalkan (`chatbotLanguage.ts`): bahasa santai, singkatan, salah ketik.
2. Dicek batas privasi (`chatbotPrivacy.ts`): data etalase boleh, data pribadi akun lain tidak.
3. Dicocokkan dengan pola pertanyaan (stok, pesanan, pendapatan harian, antrean, dan lain-lain), dijawab dari **snapshot data sesuai peran**.
4. Jawaban pasti diberi label "Ringkasan data dan panduan PASARIN"; Gemini bisa merapikan bahasanya.
5. Pertanyaan terbuka yang tidak cocok pola dijawab Gemini dengan label "Jawaban AI".
6. Tiap jawaban membawa saran pertanyaan lanjutan.

### 5.4 Hal yang perlu diakui bila ditanya

- Orkestrator belum memakai function calling Gemini. Pemilihan alat dilakukan aturan kata kunci; Gemini hanya menulis ringkasan akhir.
- Langkah ReAct di jejak orkestrator versi Gemini adalah kerangka tetap, bukan penalaran model.
- Hitungan panggilan harian disimpan per instance server, jadi batasnya perkiraan.
- Gemini tidak bisa mengubah data. Klaim, bayar, timbang, dan serah terima dilakukan manusia.

---

## 6. Arsitektur singkat

```
Browser (React) ──► Next.js App Router ──► Lib (rumus, agen, state)
                          │                       │
                          │                       ├─► Supabase Postgres (state, audit, akun)
                          │                       ├─► Gemini API
                          │                       └─► OpenWeather / Open-Meteo
Telegram ◄──► /api/telegram/webhook ──► telegramWorkspace
Vercel Cron 14.30 WIB ──► /api/cron/afternoon-sweep
```

- **Frontend:** Next.js 16 (App Router), React, Tailwind. Font Geist untuk teks dan Newsreader untuk judul.
- **Backend:** rute API di `src/app/api`, logika di `src/lib`.
- **Data:** state pasar disimpan sebagai satu dokumen JSON di tabel `pasarin_simulation_state` dengan nomor revisi. Penulisan memakai **compare-and-swap**: tulis hanya bila revisi masih sama, ulangi sampai 5 kali. Ini mencegah dua permintaan bersamaan saling menimpa.
- **Tanpa Supabase (lokal):** state disimpan di berkas dengan antrean mutasi berurutan.
- **Keamanan:** sesi cookie HttpOnly bertanda tangan HMAC-SHA256, header keamanan di `proxy.ts`, validasi input dengan zod, pembatas laju untuk jalur AI publik.

---

## 7. Alur utama dari awal sampai akhir

1. **Pedagang** mencatat pasokan subuh. Sistem langsung menghitung skor lot.
2. **Pedagang menimbang** sisa fisik dan mengonfirmasi. Hanya lot yang sudah ditimbang masuk katalog.
3. Sistem menentukan **tier dan harga** dari skor. Bila mutu berubah, tujuan penawaran berpindah otomatis.
4. **Pembeli** (Warteg, dapur sosial, maggot) melihat katalog tier miliknya dan **klaim**.
5. Pembeli **membayar** lewat QRIS simulasi. Dana ditahan di escrow.
6. **Kurir** melihat antrean per tahap, mengantar, dan **mengonfirmasi serah terima**.
7. Dana **cair** ke dompet pedagang. Semua kejadian penting tercatat di audit.
8. **Pengelola dan admin** membuka tombol Laporan penjualan (ringkasan hari ini dan riwayat harian), penawaran, dan buku besar. Simulasi 24 jam tidak lagi ada di dasbor; masih bisa dijalankan lewat perintah Telegram `/dlh` dan rute API.

---

## 8. Peta file

### 8.1 Akar proyek

| File | Fungsi |
|---|---|
| `package.json` | Dependensi dan skrip (`dev`, `build`, `test`, `lint`, `typecheck`, `db:migrate`, `seed:cloud`, `bot:poll`, `bot:setup`) |
| `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs` | Konfigurasi Next, TypeScript, Tailwind, lint |
| `vercel.json` | Deploy, jadwal cron 14.30 WIB, header API (tanpa cache) |
| `.github/workflows/ci.yml` | CI: lint, typecheck, test, build pada push dan PR ke `main` |
| `.env.example` | Daftar variabel lingkungan beserta contohnya |
| `AGENTS.md`, `CLAUDE.md` | Instruksi untuk agen kode (versi Next.js ini berbeda dari yang umum) |
| `README.md` | Ringkasan dan cara menjalankan |
| `PRD_*.md`, `Chapter_4_*.md`, `DOKUMENTASI_*.md`, `LEMBAR_CATATAN_*.md`, `PITCH_DECK_*.md` | Dokumen tugas kuliah: kebutuhan produk, desain, catatan arsitektur, pitch |
| `public/openapi.json` | Dokumentasi OpenAPI seluruh rute |

### 8.2 `src/data` (data master)

| File | Isi |
|---|---|
| `commodities.ts` | 30 komoditas dengan Q10, batas jam, harga grosir, harga lantai. **Parameternya asumsi tanpa sumber, sudah diberi label.** |
| `kiosks.ts` | 30 kios: blok A/B/C, nomor lapak, nama pemilik |
| `buyers.ts` | Mitra pembeli: koordinat, tier, kapasitas harian, reputasi, komoditas favorit |
| `accounts.ts` | Daftar peran dan pemetaan profil pengguna |
| `marketAccounts.ts` | 142 akun demo dan kredensialnya |

### 8.3 `src/types`

| File | Isi |
|---|---|
| `market.ts` | Tipe domain: stok, penawaran (`RescueOffer`), transaksi escrow, tier |
| `api.ts` | Tipe amplop API, hasil evaluasi peluruhan, gerbang mutu, orkestrator, cuaca |

### 8.4 `src/lib` (otak aplikasi)

**Rumus dan agen inti**

| File | Fungsi |
|---|---|
| `pasarinCore.ts` | Rumus skor susut, klasifikasi tier, harga, hujan, proyeksi surplus, invarian, faktor emisi |
| `decayEngine.ts` | Adaptor yang menjembatani rumus inti dengan format yang dipakai UI |
| `decayExplainer.ts` | Empat langkah penjelasan skor ditambah kalimat Gemini |
| `qualityGateAgent.ts` | Gerbang mutu, penalti reputasi, estimasi klorofil visual |
| `matchmakingEngine.ts` | Haversine dan skor komposit pembeli |
| `fleetCargoCalculator.ts` | Pilihan kendaraan, jumlah unit, manifes, biaya BBM |
| `priorityWindowDispatcher.ts` | Jendela 30 menit untuk Tier 2 |
| `qrisEscrowGateway.ts` | QRIS dinamis (TLV, CRC16) dan transisi status escrow |
| `weatherAgent.ts` | Cuaca: OpenWeather, Open-Meteo, cadangan, cache |
| `geminiOrchestrator.ts` | Orkestrator ReAct: sapuan sore dan kueri pengelola |
| `toolCallingRegistry.ts` | 9 alat sub-agen, deklarasi fungsi, dekomposisi kueri |
| `marketMetabolismSimulator.ts` | Simulasi 24 jam lima fase |

**Asisten AI**

| File | Fungsi |
|---|---|
| `marketChatbot.ts` | Panel chat per peran |
| `publicChatbot.ts` | Asisten publik |
| `chatbotLanguage.ts`, `chatbotPrivacy.ts` | Normalisasi bahasa dan batas privasi |
| `aiBudget.ts` | Kuota, jeda 429, cache jawaban |
| `rateLimit.ts` | Pembatas permintaan di memori |

**State dan data**

| File | Fungsi |
|---|---|
| `serverSimulationState.ts` | Penyimpanan state, klaim, bayar, serah terima, visibilitas per peran, analisis ikhtisar |
| `simulationStore.tsx` | Penyedia state di browser: sinkronisasi dan hitung ulang sisa jam |
| `marketSeed.ts` | Data awal deterministik untuk 30 kios |
| `marketOperations.ts` | Agregasi metrik harian untuk pengelola |
| `marketClock.ts`, `orderStatus.ts` | Waktu WIB dan label status |

**Autentikasi dan infrastruktur**

| File | Fungsi |
|---|---|
| `serverAuth.ts` | Sesi HMAC, akun di basis data, penyemaian akun |
| `apiAuth.ts` | Gerbang otorisasi peran untuk rute API |
| `authContext.tsx`, `apiFetch.ts` | Konteks login dan pemanggilan API dari klien |
| `localTestAuth.ts` | Login uji lokal (hanya localhost) |
| `database.ts`, `supabase.ts` | Koneksi Postgres dan klien Supabase |
| `audit.ts` | Jejak audit |
| `env.ts`, `api-response.ts` | Validasi env dan amplop respons seragam |

**Telegram**

| File | Fungsi |
|---|---|
| `telegramBotGateway.ts` | Kirim pesan, tombol, verifikasi rahasia webhook |
| `telegramSessions.ts` | Sesi multi-akun per obrolan, login Mini App |
| `telegramWorkspace.ts` | Semua perintah bot per peran |

**Pengujian**

| File | Fungsi |
|---|---|
| `inClassTestbench.ts` | Testbench master beberapa suite untuk praktikum |

### 8.5 `src/app` (halaman dan API)

**Halaman**

| Rute | Fungsi |
|---|---|
| `/` | Landing page publik dengan ringkasan pasar dan asisten publik |
| `/login` | Masuk |
| `/dashboard` | Ruang kerja sesuai peran |
| `/telegram/login` | Login Telegram Mini App |

**API**

| Rute | Fungsi | Akses |
|---|---|---|
| `/api/health` | Kesehatan layanan | publik |
| `/api/market/overview` | Ringkasan agregat tanpa data akun | publik |
| `/api/market/assistant` | Asisten publik (12 per 5 menit per IP) | publik |
| `/api/market/explain-decay` | Penjelasan skor satu lot (20 per 5 menit per akun) | login, lot sesuai peran |
| `/api/simulation/state` | Snapshot dan semua aksi (stok, terbit, bayar, antar) | login, dibatasi peran |
| `/api/offers/claim` | Klaim penawaran | pembeli |
| `/api/escrow/qris` | QRIS dan transisi escrow | login |
| `/api/orchestrator/query` | Asisten dashboard | login |
| `/api/orchestrator/run` | Evaluasi stok massal | admin |
| `/api/orchestrator/tools` | Daftar alat sub-agen | publik |
| `/api/simulation/metabolism-trial` | Simulasi 24 jam | pengelola dan admin |
| `/api/cron/afternoon-sweep` | Sapuan 14.30 WIB | token cron |
| `/api/quality-gate/validate`, `/api/kinetics/decay`, `/api/matchmaking` | Rumus murni sebagai API | publik |
| `/api/telemetry/weather` | Cuaca terkini | publik |
| `/api/auth/session`, `/api/auth/local-test` | Sesi dan login uji lokal | sesuai fungsinya |
| `/api/telegram/webhook`, `/api/telegram/login` | Bot dan Mini App | rahasia webhook, initData |
| `/api/admin/seed` | Penyemaian data | admin |
| `/api/test/suite` | Menjalankan testbench | khusus uji |

### 8.6 `src/components`

| Folder | Isi |
|---|---|
| `roles/` | Lima dasbor: `VendorDashboard`, `BuyerDashboard`, `LogisticsDashboard`, `OversightDashboard` (manager dan admin) |
| `common/` | `MarketWorkspace` (kartu, metrik, pil status, meteran skor), `MarketChatbot`, `DecayExplainer`, `MarketDialog`, `PasarinLogo`, `RealtimeWibClock`, `MarketEditorialImage` |
| `layout/` | `AppHeader`, `AppSidebar` |
| `market/` | `PublicMarketDashboard` (landing page) |

### 8.7 `supabase`

| File | Isi |
|---|---|
| `migrations/..._init_pasarin_schema.sql` | Skema awal, indeks, kebijakan RLS |
| `migrations/..._audit_and_simulation_state.sql` | Tabel audit dan state simulasi |
| `migrations/..._align_relational_schema.sql` | Penyelarasan skema dengan model aplikasi |
| `seed.sql`, `seed_testing_scenarios.sql` | Data awal dan skenario uji mutu |

### 8.8 `scripts`

| Kelompok | File |
|---|---|
| Pengujian | `run_all_tests.ts` (menjalankan semuanya), `run_unit_tests.ts` (testbench), dan `test_*.ts` per modul: peluruhan, gerbang mutu, pencocokan, armada, QRIS, jendela prioritas, cuaca, orkestrator, registri alat, Telegram, keamanan API, autentikasi peran, konsistensi peran, chatbot |
| Data | `migrate_and_seed.ts`, `seed_cloud_market.ts`, `run_seed_scenarios.ts` |
| Telegram | `setup_telegram_bot.ts` (daftar perintah), `run_telegram_polling.ts` (polling lokal) |

---

## 9. Bot Telegram

Bot `@agent_pasarin_bot`. Perintah dibatasi per peran, misalnya `/pasok`, `/stok`, `/terbitkan` untuk pedagang, `/surplus` dan `/klaim` untuk pembeli, `/tugas` dan `/antar` untuk kurir, `/status`, `/dlh`, `/pratinjau` untuk pengelola dan admin. Satu obrolan bisa menyimpan beberapa akun sekaligus. Login lewat Mini App memverifikasi `initData` yang ditandatangani HMAC, sehingga kata sandi tidak diketik di obrolan.

---

## 10. Cara menjalankan dan menguji

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # seluruh pengujian
npm run lint
npm run typecheck
npm run build
```

Konfigurasi di `.env.local` (lihat `.env.example`): kunci Supabase, `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_DAILY_CALL_LIMIT`, kunci cuaca, token Telegram. Tanpa kunci Gemini, semua fitur AI tetap berjalan dengan jawaban berbasis rumus.

---

## 11. Pertanyaan yang sering muncul

**Skor susut itu AI?**
Bukan. Rumus matematika. AI hanya menjelaskan hasilnya dengan kalimat.

**Dari mana angka batas jam tiap sayur?**
Asumsi parameter di `commodities.ts`, diberi label tidak bersumber. Arah dasarnya, seperti pengaruh suhu terhadap laju pembusukan, didukung literatur pascapanen; angka per komoditas belum dikalibrasi dengan pengukuran lapangan.

**Kenapa 0,82 dan 1,15?**
Kalibrasi buatan supaya skor pada batas jam tidak langsung 0,85 dan peluruhan makin cepat menjelang akhir. Bukan hasil pengukuran.

**Kenapa ada escrow?**
Pedagang tahu pembayaran sudah ada, pembeli tahu uang baru cair setelah barang sampai.

**Apakah pembayarannya nyata?**
Tidak. QRIS dibuat sesuai struktur standar tetapi simulasi.

**Bagaimana mencegah pedagang mengalihkan sayur layak ke maggot?**
Gerbang mutu (Invarian 1) memblokir, mencatat ke audit, dan memberi penalti reputasi.

**Bagaimana mencegah dua orang klaim stok yang sama?**
Semua perubahan lewat satu pintu dengan compare-and-swap pada nomor revisi; yang kalah mengulang dan melihat stok terbaru.

**Bagaimana kuota Gemini gratis dijaga?**
Cache jawaban, batas harian, jeda saat kena 429, dan sebagian besar pertanyaan dijawab dari data tanpa model.

**Apa bedanya jawaban "Ringkasan data" dan "Jawaban AI"?**
Yang pertama dari data dan panduan lewat aturan; yang kedua dari Gemini untuk pertanyaan terbuka.

**Data siapa yang boleh dilihat tiap peran?**
Pedagang hanya kiosnya, kurir hanya pesanan yang sudah dibayar, pembeli hanya miliknya dan katalog tier-nya, pengelola dan admin semua. Etalase publik (komoditas, harga, kios, berat) boleh dilihat semua, tanpa data dana atau akun.

**Ringkasan penjualan hari ini di dasbor pengelola dihitung dari apa?**
Dari pesanan yang sudah diserahterimakan hari ini (zona Jakarta); dana ditahan diambil dari transaksi escrow yang belum cair. Riwayat tujuh hari di bawahnya memakai pesanan selesai, dikelompokkan per hari kalender Jakarta menurut tanggal serah terimanya. Penjualan hanya menghitung lot berbayar; donasi dan lot maggot gratis dicatat sebagai berat.

**Kenapa simulasi 24 jam disebut bukan data nyata?**
Memakai data sampel dan skenario tetap untuk menguji alur lima fase, bukan data langsung pasar. Sekarang hanya tersedia lewat Telegram `/dlh` dan API.

---

## 12. Batasan dan asumsi yang jujur

- Parameter komoditas dan dua konstanta skor adalah asumsi.
- Estimasi porsi dapur sosial memakai 4 porsi per kg, perkiraan sederhana.
- Nama pengemudi, pelat kendaraan, dan beberapa teks ringkasan di simulasi adalah data contoh.
- Jarak pencocokan adalah garis lurus, bukan jarak jalan.
- Hitungan panggilan Gemini per instance, bukan global.
- Pembayaran QRIS simulasi.
- Tiga rute hitung murni (`kinetics/decay`, `matchmaking`, `orchestrator/tools`) sengaja publik karena tidak membaca data akun.
