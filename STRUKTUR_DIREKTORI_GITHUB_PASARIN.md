# PANDUAN LENGKAP STRUKTUR DIREKTORI & ARSITEKTUR REPOSITORI GITHUB PASARIN
## Proactive Agent for Market Surplus Redistribution (PASARIN)
### Dokumentasi Teknis Kode Sumber — Penjelasan Fungsi Seluruh Folder & Berkas dari Tingkat Root

---

## 1. IKHTISAR TEKNOLOGI REPOSITORI

Repositori **PASARIN** dibangun menggunakan tumpukan teknologi modern (*modern web & AI stack*) yang dirancang untuk performa tinggi, keamanan tipe data ketat, dan skalabilitas sistem:

* **Kerangka Kerja Utama:** Next.js 16 (React 19, App Router Architecture, Server & Client Components)
* **Bahasa Pemrograman:** TypeScript 5 (Strict Mode, 100% Type-Safe)
* **Desain Antarmuka:** Tailwind CSS v3 (Clean Swiss Minimalist, Desain Khusus Mode Terang, Kontras Tinggi WCAG 2.1 AA/AAA)
* **Basis Data & Autentikasi:** Supabase PostgreSQL (12 Tabel Relasional, Row Level Security, Edge Auth)
* **Kecerdasan Artifisial:** Google Gemini 2.0 Flash SDK (`@google/genai`) dengan Pola ReAct (*Reasoning + Acting*) dan Fallback Heuristik Lokal
* **Integrasi Eksternal:** OpenWeatherMap API (Sensor Cuaca Los Pasar), Telegram Bot API, dan QRIS Simulasi BI

---

## 2. PETA POHON STRUKTUR FOLDER DARI TINGKAT ROOT

```text
C:\Project\Pasarin\ (Root Repositori GitHub)
├── .github/                      -> Konfigurasi otomasi CI/CD GitHub Actions
│   └── workflows/ci.yml          -> Otomasi pemeriksaan TypeScript & Build di cloud
├── public/                       -> Aset statis publik yang dapat diakses langsung oleh browser
│   ├── brand/                    -> Varian logo resmi bunga teratai master (PNG, SVG)
│   ├── favicon.ico, icon-192.png -> Ikon favicon peramban dan PWA web app
│   └── openapi.json              -> Dokumentasi spesifikasi OpenAPI REST API
├── scripts/                      -> Kumpulan skrip pengujian unit dan migrasi basis data via terminal
│   ├── run_unit_tests.ts         -> Runner utama eksekusi 12 suite pengujian unit
│   ├── test_orchestrator.ts      -> Pengujian penalaran ReAct AI Google Gemini
│   ├── test_quality_gate.ts      -> Pengujian gerbang etika pangan (anti-maggot untuk makanan layak)
│   ├── test_role_auth.ts         -> Pengujian autentikasi dan isolasi hak akses 7 peran
│   ├── test_tool_calling_registry.ts -> Pengujian registri 9 fungsi pemanggilan alat AI
│   ├── test_weather_agent.ts     -> Pengujian integrasi sensor cuaca & cache
│   ├── test_supabase_connection.ts -> Pengujian konektivitas ke cloud Supabase
│   └── migrate_and_seed.ts       -> Skrip otomatis injeksi skema DDL & data awal
├── src/                          -> Seluruh kode sumber utama aplikasi
│   ├── app/                      -> Routing halaman (App Router) dan REST API endpoints
│   │   ├── api/                  -> Backend REST API (Cron, Cuaca, AI, Gerbang Mutu, Tes)
│   │   ├── login/                -> Halaman autentikasi login pengguna
│   │   ├── globals.css           -> Styling global Tailwind CSS dan tipografi
│   │   ├── layout.tsx            -> Shell pembungkus utama aplikasi dan AuthProvider
│   │   └── page.tsx              -> Halaman utama dashboard dinamis berbasis peran
│   ├── components/               -> Komponen antarmuka pengguna (UI Components)
│   │   ├── common/               -> Komponen utilitas (Logo, Jam Pasar, Simulator HP)
│   │   ├── layout/               -> Komponen bingkai aplikasi (AppHeader, AppSidebar)
│   │   └── roles/                -> 7 Dashboard mandiri untuk masing-masing peran pengguna
│   ├── data/                     -> Dataset lokal kios pasar, katalog sayuran, dan akun login
│   │   ├── accounts.ts           -> Direktori akun pengguna 7 peran (username & password)
│   │   ├── commodities.ts        -> Katalog 30 jenis komoditas sayur, laju pembusukan, & harga modal
│   │   └── kiosks.ts             -> Data 30 kios pedagang binaan Pasar Induk Kramat Jati
│   ├── lib/                      -> Logika bisnis inti, rumus matematika, dan modul AI
│   │   ├── api-response.ts       -> Format standar bungkus respons API (ApiResponse<T>)
│   │   ├── audit.ts              -> Pencatatan log audit mutasi transaksi sistem
│   │   ├── authContext.tsx       -> Konteks autentikasi React dan proteksi hak akses peran
│   │   ├── decayEngine.ts        -> Kalkulator peluruhan susut bobot komoditas harian
│   │   ├── env.ts                -> Validasi variabel lingkungan sistem (.env)
│   │   ├── geminiOrchestrator.ts -> Otak AI ReAct pengorkestrasi keputusan pasar
│   │   ├── inClassTestbench.ts   -> Test suite 12 pengujian otomatis (61 pengujian)
│   │   ├── pasarinCore.ts        -> Rumus kinetika suhu Arrhenius, redaman hujan, & diskon
│   │   ├── qualityGateAgent.ts   -> Penjaga etika pangan & model visual klorofil daun
│   │   ├── simulationStore.tsx   -> Pengelola state reaktif inventaris, pesanan, & logistik
│   │   ├── supabase.ts           -> Inisialisasi klien koneksi basis data Supabase
│   │   ├── toolCallingRegistry.ts-> Registri 9 fungsi pemanggilan alat untuk AI Gemini
│   │   └── weatherAgent.ts       -> Modul penarik data cuaca los pasar dan sistem cache
│   ├── types/                    -> Definisi antarmuka tipe data TypeScript
│   │   └── api.ts                -> Kontrak tipe data kios, komoditas, transaksi, & logistik
│   └── middleware.ts             -> Penjaga keamanan HTTP edge dan penanganan CORS
├── supabase/                     -> Konfigurasi skema basis data PostgreSQL
│   ├── migrations/               -> Berkas migrasi DDL SQL pembentuk 12 tabel sistem
│   └── seed.sql                  -> Data awal basis data SQL untuk kios dan komoditas
├── diagrams/                     -> Berkas diagram arsitektur UML (PlantUML & PNG)
├── PRD_MASTER_BUNDLE/            -> Kumpulan dokumen spesifikasi arsitektur & aturan kode
├── SUBMISSION_EMAS_PASARIN/      -> Berkas dokumen PDF final siap kumpul tugas kuliah
└── [Berkas Konfigurasi Root]     -> package.json, tsconfig.json, next.config.ts, vercel.json
```

---

## 3. PENJELASAN MENDALAM DIREKTORI KODE SUMBER UTAMA (`src/`)

Direktori `src/` adalah jantung dari seluruh aplikasi PASARIN yang memisahkan arsitektur backend, frontend, logika matematika, dan manajemen state secara modular.

### 3.1 Sub-Direktori `src/app/` (Routing Halaman & REST API)
Menggunakan standar Next.js App Router di mana setiap folder merepresentasikan jalur URL aplikasi:

1. **`src/app/layout.tsx`:**  
   Tata letak induk (*Root Layout*) yang membungkus seluruh halaman aplikasi. Di sinilah penyedia state global `<AuthProvider>` dipasang agar status login pengguna dapat diakses di seluruh komponen, serta font sistem dan metadata aplikasi diatur.

2. **`src/app/page.tsx`:**  
   Halaman beranda utama (`/`). Berkas ini bertindak sebagai pengarah otomatis: jika pengguna belum login, sistem langsung mengarahkannya ke `/login`. Jika sudah login, berkas ini menampilkan dashboard yang sesuai dengan peran pengguna (misal: jika login sebagai pedagang, otomatis merender dashboard pedagang).

3. **`src/app/login/page.tsx`:**  
   Halaman antarmuka login pengguna (`/login`). Menampilkan kartu login minimalis yang bersih dengan validasi form, penanganan pesan error, dan tombol masuk instan.

4. **`src/app/globals.css`:**  
   Lembar gaya (*stylesheet*) global yang mengonfigurasi Tailwind CSS, palet warna *Deep Pine Teal* (`#2A5C5F`), font Swiss modern, dan scrollbar tipis yang elegan.

#### Endpoint Backend API (`src/app/api/`):
* **`/api/health/route.ts`:** Endpoint pemeriksaan kesehatan server. Mengembalikan status operasional sistem, penggunaan memori RAM (RSS), dan durasi aktif (*uptime*).
* **`/api/cron/afternoon-sweep/route.ts`:** Endpoint sapuan otonom harian pukul 14:30 WIB. Dilindungi dengan otentikasi rahasia `CRON_SECRET_KEY` untuk memicu pemindaian stok sayur yang berisiko busuk sore hari.
* **`/api/telemetry/weather/route.ts`:** Endpoint pembaca suhu dan kelembapan los Pasar Kramat Jati dari OpenWeatherMap yang dilengkapi sistem cache memori 15 menit agar hemat kuota API.
* **`/api/kinetics/decay/route.ts`:** Endpoint perhitungan laju pembusukan komoditas berdasarkan rumus biokimia respirasi suhu.
* **`/api/orchestrator/run/route.ts`:** Endpoint eksekusi alur orkestrasi multi-agen otonom berbasis AI.
* **`/api/orchestrator/tools/route.ts`:** Endpoint untuk mengambil daftar 9 alat yang terdaftar di sistem.
* **`/api/orchestrator/query/route.ts`:** Endpoint pemrosesan kueri bahasa alami dari manajer pasar (contoh: *"Berapa armada yang dibutuhkan sore ini?"*) yang dipecah secara otomatis oleh AI menjadi pemanggilan alat yang relevan.
* **`/api/quality-gate/validate/route.ts`:** Endpoint gerbang etika mutu untuk memastikan makanan yang masih layak konsumsi tidak boleh dibuang atau dialihkan ke pakan ternak/maggot.
* **`/api/test/suite/route.ts`:** Endpoint runner pengujian otomatis yang menjalankan 12 suite pengujian unit dan mengembalikan laporan status pengujian dalam format JSON.

---

### 3.2 Sub-Direktori `src/components/` (Komponen Antarmuka Pengguna)
Seluruh komponen UI diorganisir berdasarkan tanggung jawabnya:

#### A. Folder `src/components/roles/` (7 Dashboard Mandiri Pengguna)
Setiap aktor dalam ekosistem pasar memiliki dashboard khusus yang terisolasi:
1. **`VendorDashboard.tsx` (Dashboard Pedagang Pasar):**  
   Tempat pedagang mencatat pasokan sayur masuk, memantau sisa jam kelayakan sayur di lapak mereka, melihat estimasi risiko pembusukan, dan menekan tombol jalan pintas `⚡ Ajukan Diskon` untuk menjual stok surplus sore hari.
2. **`WartegDashboard.tsx` (Dashboard Usaha Kuliner / Warteg):**  
   Katalog sayuran segar berdiskon 30%–70% dari pedagang pasar. Pemilik warteg dapat mengklaim sayuran murah untuk menekan modal belanja harian, lengkap dengan jendela simulasi pembayaran QRIS.
3. **`SocialKitchenDashboard.tsx` (Dashboard Dapur Sosial & Panti Asuhan):**  
   Pusat alokasi bantuan pangan darurat. Dapur sosial menerima sayuran layak makan dengan subsidi atau donasi penuh melalui jendela alokasi khusus 30 menit.
4. **`MaggotDashboard.tsx` (Dashboard Sentra Budidaya Maggot BSF):**  
   Fasilitas daur ulang sampah organik. Menampilkan penerimaan sisa sayur dan buah yang sudah melewati batas layak konsumsi manusia untuk dijadikan pakan larva lalat tentara hitam (*Black Soldier Fly*).
5. **`LogisticsDashboard.tsx` (Dashboard Pengemudi & Armada Kurir):**  
   Daftar tugas rute pengiriman armada (GranMax dan Viar Roda Tiga), status penjemputan dari kios pedagang, serta tombol validasi bukti serah terima (*Proof of Delivery*) berbasis sensor geofencing GPS radius 50 meter.
6. **`ManagerDashboard.tsx` (Dashboard Analitik Manajer Pasar Jaya):**  
   Panel analitik makro untuk pengelola pasar yang menyajikan grafik total tonase surplus pasar, metrik pengurangan emisi gas metana/karbon, serta konsol kueri manajerial berbasis AI.
7. **`AdminDashboard.tsx` (Dashboard Administrator Sistem & Pengujian):**  
   Pusat kendali teknis yang memuat buku besar transaksi keuangan escrow QRIS, rekaman jejak audit sistem (*system audit trail*), terminal pelacak penalaran AI ReAct (*Chain of Thought*), dan tombol pelari pengujian unit otomatis (*Live Testbench Runner*).

#### B. Folder `src/components/layout/` (Bingkai & Navigasi Aplikasi)
* **`AppHeader.tsx`:** Bilah navigasi atas (*topbar*) berlatar semi-transparan yang menampilkan logo aplikasi, jam operasional pasar, indikator suhu/cuaca los terkini, profil pengguna yang sedang login, dan tombol Logout.
* **`AppSidebar.tsx`:** Bilah menu samping (*sidebar*). Komponen ini memiliki aturan cerdas: jika pengguna biasa (pedagang, warteg, kurir) yang login, pemilih peran disembunyikan sepenuhnya agar tampilan bersih; namun jika Admin yang login, menu navigasi lengkap ke seluruh dashboard ditampilkan.

#### C. Folder `src/components/common/` (Komponen Utilitas Interaktif)
* **`PasarinLogo.tsx`:** Render vektor SVG resmi lambang bunga teratai PASARIN.
* **`MarketClockController.tsx`:** Pengendali sirkadian jam pasar yang menghubungkan kondisi pasar dengan waktu nyata WIB.
* **`RoleWorkflowStepper.tsx`:** Indikator visual langkah-langkah alur kerja penyelamatan surplus dari tahap panen hingga terdistribusi.
* **`TelegramDeviceSimulator.tsx`:** Komponen simulasi layar ponsel cerdas yang menampilkan contoh notifikasi pesan instan bot Telegram yang diterima oleh pedagang dan pembeli.

---

### 3.3 Sub-Direktori `src/lib/` (Logika Bisnis, Algoritma, & Modul AI)
Bagian ini berisi seluruh kalkulasi matematika murni, algoritma kecerdasan buatan, dan jembatan data:

* **`pasarinCore.ts`:**  
  Pusat rumus matematika sistem yang mencakup:
  - Model kinetika respirasi Arrhenius-$Q_{10}$ untuk menghitung percepatan pembusukan sayur akibat hawa panas pasar.
  - Model redaman pengunjung lorong becek akibat hujan sore hari.
  - Formula penetapan diskon dinamis yang tetap melindungi harga batas modal pedagang (*Price Floor*).
  - Algoritma penghitungan reduksi emisi gas metana berbasis standar IPCC 2006.
* **`geminiOrchestrator.ts`:**  
  Otak pengorkestrasi multi-agen ReAct (*Thought $\rightarrow$ Action $\rightarrow$ Observation $\rightarrow$ Final Answer*). Terintegrasi dengan SDK Google Gemini 2.0 Flash dan memiliki mekanisme cadangan (*fallback*) lokal heuristik jika kuota API habis atau server offline, serta membatasi penalaran maksimal 5 putaran agar tidak terjadi looping tanpa henti.
* **`toolCallingRegistry.ts`:**  
  Registri 9 fungsi pemanggilan alat (*tool calling*) standar Gemini yang menghubungkan kecerdasan bahasa LLM dengan fungsi komputasi nyata di backend. Juga memuat modul dekomposisi kueri bahasa alami.
* **`qualityGateAgent.ts`:**  
  Modul penegak etika pangan yang secara ketat memblokir makanan layak konsumsi agar tidak dialihkan ke pakan maggot, serta memuat fungsi evaluasi klorofil daun untuk mengukur tingkat kesegaran visual sayuran.
* **`simulationStore.tsx`:**  
  Pengelola state aplikasi di sisi klien (*Client-side State Management*) yang menyimpan data kios, daftar pesanan, saldo escrow, armada logistik, dan riwayat audit secara reaktif tanpa perlu me-reload halaman.
* **`authContext.tsx`:**  
  Manajemen sesi autentikasi pengguna, penyimpanan data login di `localStorage`, sinkronisasi dengan Supabase Auth, dan pembatasan hak akses halaman.
* **`weatherAgent.ts`:**  
  Klien pemanggil API cuaca OpenWeatherMap untuk titik koordinat Pasar Induk Kramat Jati dengan sistem penyimpanan cache memori.
* **`decayEngine.ts`:**  
  Mesin komputasi susut bobot komoditas harian.
* **`audit.ts`:**  
  Pencatat jejak audit mutasi transaksi ke tabel basis data dan ke penyangga sirkular memori (*in-memory buffer failover*).
* **`inClassTestbench.ts`:**  
  Kumpulan 12 suite pengujian unit (61 assertions) yang dapat dijalankan langsung di browser maupun di terminal untuk memverifikasi kebenaran seluruh logika aplikasi.
* **`api-response.ts`:**  
  Fungsi pembantu pembungkus format respons standar HTTP JSON (`success`, `data`, `error`, `timestamp`).
* **`env.ts`:**  
  Validasi variabel lingkungan sistem menggunakan Zod untuk memastikan kunci API penting terpasang dengan benar.
* **`supabase.ts`:**  
  Inisialisasi klien SDK `@supabase/supabase-js`.

---

### 3.4 Sub-Direktori `src/data/` (Dataset Lokal & Data Awal)
* **`accounts.ts`:** Daftar kredensial akun dummy 7 peran pengguna (username dan password dibuat identik, misal: `pasar1`/`pasar1`, `warteg1`/`warteg1`) lengkap dengan data profil asli pedagang dan pengelola.
* **`commodities.ts`:** Master katalog 30 jenis komoditas hortikultura tropis (Kangkung, Bayam, Cabai, Tomat, dll.) lengkap dengan data biokimia daya tahan simpan, koefisien suhu, harga kulakan dasar, dan harga modal terendah.
* **`kiosks.ts`:** Data 30 kios pedagang binaan Pasar Induk Kramat Jati yang terbagi rapi di Blok A (Sayur Daun), Blok B (Bumbu & Buah), dan Blok C (Umbi-umbian).

---

### 3.5 Berkas Tambahan di `src/`
* **`src/types/api.ts`:** Kontrak antarmuka (*interface*) TypeScript untuk seluruh entitas sistem (Kios, Komoditas, Pesanan, Telemetri Cuaca, Logika ReAct).
* **`src/middleware.ts`:** Lapisan keamanan Edge Middleware yang menyaring setiap request masuk, menyuntikkan header keamanan HTTP (`X-Frame-Options`, `X-Content-Type-Options`), serta menangani izin CORS antar-domain.

---

## 4. PENJELASAN DIREKTORI PENGUJIAN & OTOMASI SKRIP (`scripts/`)

Direktori `scripts/` berisi program-program mandiri berbasis Node.js/TypeScript untuk menguji keandalan sistem dari terminal CLI:

1. **`run_unit_tests.ts`:**  
   Pintu gerbang eksekusi pengujian unit utama. Menjalankan modul `inClassTestbench.ts` dari terminal via perintah `npm run test:unit`, menghasilkan tampilan log warna-warni yang memverifikasi kelulusan 61 kasus uji dalam 2,6 detik.
2. **`test_orchestrator.ts`:**  
   Pengujian khusus untuk memastikan otak AI ReAct Gemini dapat menalar urutan penanganan surplus pasar dan tidak mengalami looping lebih dari 5 putaran.
3. **`test_quality_gate.ts`:**  
   Pengujian verifikasi gerbang etika pangan untuk membuktikan bahwa makanan manusia yang dicoba dialihkan ke pakan ternak akan ditolak secara mutlak dan pedagang dikenakan penalti reputasi.
4. **`test_role_auth.ts`:**  
   Pengujian logika autentikasi, kecocokan 7 pasang akun dummy, dan pemisahan hak akses peran.
5. **`test_tool_calling_registry.ts`:**  
   Pengujian registri fungsi alat dan pembuktian bahwa kueri bahasa alami dari manajer pasar dapat didekomposisi dengan benar ke alat yang relevan dalam waktu $< 50\text{ ms}$.
6. **`test_weather_agent.ts`:**  
   Pengujian integrasi sensor cuaca los pasar dan mekanisme penyimpanan cache memori.
7. **`test_supabase_connection.ts`:**  
   Pengujian koneksi jaringan langsung dari aplikasi ke peladen cloud Supabase PostgreSQL.
8. **`migrate_and_seed.ts` & `deploy_supabase_via_pat.py`:**  
   Skrip otomasi untuk menjalankan migrasi berkas DDL SQL dan mengisi data awal kios ke basis data Supabase secara terprogram.

---

## 5. PENJELASAN DIREKTORI BASIS DATA (`supabase/`)

Direktori `supabase/` berisi seluruh kode manajemen basis data relasional PostgreSQL:

* **`supabase/migrations/20261005000000_init_pasarin_schema.sql`:**  
  Berkas skrip SQL utama yang mendefinisikan 12 tabel basis data sistem:
  1. `kiosks` (Data profil pedagang dan koordinat lapak)
  2. `commodities` (Katalog jenis sayur dan sifat biologis)
  3. `kiosk_inventory` (Pencatatan pasokan harian dan sisa stok tiap kios)
  4. `surplus_predictions` (Hasil kalkulasi estimasi surplus oleh AI)
  5. `salvage_offers` (Penawaran diskon komoditas surplus)
  6. `orders` (Transaksi klaim pesanan oleh warteg atau dapur sosial)
  7. `escrow_accounts` (Pencatatan rekening penampung dana sementara BI)
  8. `logistics_fleet` (Data kendaraan motor Viar dan mobil GranMax)
  9. `logistics_deliveries` (Penugasan rute pengiriman dan koordinat tujuan)
  10. `proof_of_delivery` (Rekaman foto dan validasi GPS serah terima barang)
  11. `system_audit_trail` (Buku besar pencatatan seluruh mutasi sistem)
  12. `market_telemetry` (Pencatatan data sensor suhu dan kelembapan los)
* **`supabase/seed.sql`:**  
  Data awal SQL untuk menginjeksi 30 kios, 30 komoditas, dan data akun ke basis data cloud.

---

## 6. PENJELASAN DIREKTORI ASET PUBLIK (`public/`)

Direktori `public/` berisi berkas-berkas statis yang langsung disajikan oleh server web:

* **`public/brand/`:**  
  Koleksi aset visual identitas aplikasi dalam berbagai resolusi dan warna (varian hijau teal, putih transparan, SVG teratai, dan logo horizontal) yang digunakan di header, sampul proposal, dan dokumen presentasi.
* **`public/favicon.ico` & `icon-192.png`:**  
  Ikon kecil yang muncul di tab browser pengguna dan ikon layar utama saat aplikasi diinstal di smartphone.
* **`public/openapi.json`:**  
  Berkas spesifikasi standar OpenAPI / Swagger yang menjelaskan seluruh dokumentasi endpoint REST API sistem.

---

## 7. PENJELASAN DIREKTORI OTOMASI CI/CD (`.github/`)

* **`.github/workflows/ci.yml`:**  
  Alur kerja terotomasi (*Continuous Integration Pipeline*) yang dijalankan otomatis oleh server GitHub setiap kali ada kode yang dikirim (*push*) ke branch `main`. Pipeline ini secara otomatis menjalankan pemeriksaan tipe data TypeScript (`tsc --noEmit`) dan mencoba melakukan kompilasi produksi Next.js (`npm run build`) untuk memastikan tidak ada kode rusak yang lolos ke server produksi.

---

## 8. PENJELASAN BERKAS KONFIGURASI DI TINGKAT ROOT

Di bagian terluar repositori terdapat berkas konfigurasi esensial proyek:

| Nama Berkas | Fungsi & Peran Teknis |
|:---|:---|
| **`package.json`** | Manifes utama proyek Node.js: mendefinisikan daftar pustaka ketergantungan (*dependencies* seperti `@google/genai`, `@supabase/supabase-js`, `next`, `react`, `zod`), serta perintah skrip terminal (`npm run dev`, `npm run build`, `npm run test:unit`, `npm run lint`). |
| **`package-lock.json`** | Mengunci versi spesifik dari seluruh paket ketergantungan agar tidak terjadi perbedaan versi saat dijalankan di komputer yang berbeda. |
| **`tsconfig.json`** | Berkas konfigurasi kompiler TypeScript: mengatur mode ketat (*strict mode*), target sintaks JavaScript modern, dan pemetaan alias path folder (`@/*` mengarah ke `./src/*`). |
| **`next.config.ts`** | Konfigurasi inti Next.js untuk optimasi bundling, pengaturan header keamanan, dan perutean server. |
| **`vercel.json`** | Konfigurasi penyebaran cloud ke platform Vercel, termasuk jadwal eksekusi otomatis cron job sapuan pasar pukul 14:30 WIB (`0 7 * * *` UTC). |
| **`postcss.config.mjs`** | Konfigurasi pemroses CSS yang menghubungkan Tailwind CSS dan Autoprefixer ke mesin kompilasi Next.js. |
| **`eslint.config.mjs`** | Aturan linter kode untuk menjaga kebersihan dan standar gaya penulisan kode JavaScript/TypeScript. |
| **`.env.example`** | Contoh cetak biru variabel lingkungan yang mendokumentasikan kunci-kunci rahasia apa saja yang dibutuhkan sistem (URL Supabase, kunci anonim, token Gemini, token cuaca, dan kunci rahasia cron). |
| **`.gitignore`** | Daftar nama folder dan berkas lokal yang tidak boleh diunggah ke GitHub (seperti folder `node_modules/`, folder `.next/`, dan berkas rahasia `.env.local`). |
| **`README.md`** | Halaman depan dokumentasi repositori GitHub yang menjelaskan gambaran umum proyek, cara instalasi lokal, dan panduan menjalankan sistem. |

---

## 9. RINGKASAN ALUR INTERAKSI ANTAR-MODUL SISTEM

Diagram berikut merangkum bagaimana seluruh direktori dan modul di atas saling berkomunikasi saat sistem berjalan:

```text
[ Browser Pengguna / Klien ]
             │
             ▼
     src/middleware.ts            -> Menyaring keamanan HTTP & memeriksa CORS
             │
             ▼
       src/app/page.tsx           -> Memeriksa status login via src/lib/authContext.tsx
        ├── Belum Login           -> Diarahkan ke src/app/login/page.tsx (Akun dummy di src/data/accounts.ts)
        └── Sudah Login           -> Menampilkan salah satu dari 7 Dashboard di src/components/roles/
                                     (Mengambil data reaktif dari src/lib/simulationStore.tsx)

[ Proses Logika & Keputusan Pasar ]
             │
             ▼
  src/lib/geminiOrchestrator.ts   -> Agen AI ReAct menganalisis situasi pasar
             │
             ├── Memanggil Alat   -> src/lib/toolCallingRegistry.ts (9 Fungsi Pemanggilan Alat)
             ├── Hitung Suhu      -> src/lib/pasarinCore.ts (Kinetika Arrhenius & Redaman Cuaca)
             ├── Tarik Cuaca      -> src/lib/weatherAgent.ts (Sensor Pasar Kramat Jati)
             ├── Cek Etika Pangan -> src/lib/qualityGateAgent.ts (Blokir Makanan Layak ke Maggot)
             └── Catat Transaksi  -> src/lib/audit.ts (Disimpan ke supabase/migrations/ schema)

[ Jalur Verifikasi & Pengujian ]
             │
             ├── Terminal CLI     -> scripts/run_unit_tests.ts (npm run test:unit)
             ├── Endpoint API     -> src/app/api/test/suite/route.ts
             └── Tombol UI        -> Komponen Runner di src/components/roles/AdminDashboard.tsx
                                     (Semua mengeksekusi 12 suite di src/lib/inClassTestbench.ts)
```

---

*Dokumen ini disusun untuk memberikan pemahaman menyeluruh mengenai struktur arsitektur kode sumber PASARIN dari tingkat root hingga modul terkecil.*
