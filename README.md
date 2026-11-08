# PASARIN: Proactive Agent for Market Surplus Redistribution
### Sistem Multi-Agen Berbasis Agentic AI untuk Penyelamatan & Redistribusi Surplus Sayur-Buah Pasar Tradisional

![Next.js 16](https://img.shields.io/badge/Next.js-16.4.5-black?style=flat-square&logo=next.js)
![React 19](https://img.shields.io/badge/React-19.2.8-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_15-3ecf8e?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-Edge_Platform-black?style=flat-square&logo=vercel)
![Academic Project](https://img.shields.io/badge/FTUI-Rekayasa_Perangkat_Lunak_2026-teal?style=flat-square)

---

## 📌 Ringkasan Eksekutif & Latar Belakang Masalah

**PASARIN** (*Proactive Agent for Market Surplus Redistribution*) adalah prototipe sistem multi-agen otonom berbasis Agentic AI yang dirancang untuk mengatasi paradoks pemborosan pangan (*food loss*) pada pasar induk tradisional di DKI Jakarta. 

### Permasalahan Empiris Lapangan
* **Skala Pemborosan Masif:** DKI Jakarta menghasilkan 7.500 hingga 8.000 ton sampah harian ke TPST Bantar Gebang, di mana lebih dari 53% merupakan sampah organik basah. **Pasar Induk Kramat Jati** menyumbang timbulan 90 hingga 100 ton sampah organik per hari.
* **Titik Kritis Pukul 14.30 WIB:** Sayuran daun segar yang dibongkar subuh jam 04.00 WIB mulai kehilangan turgor seluler saat terpapar suhu terik los pasar (>33°C). Pada pukul 14.30 WIB, kepadatan pembeli eceran anjlok hingga 48%, memicu dilema pedagang: menahan sayur hingga membusuk total atau membuangnya ke bak sampah.
* **Hambatan Adopsi Pedagang Tradisional:** Pedagang los basah bekerja dalam ritme fisik yang sibuk dengan tangan basah dan kotor. Mereka tidak memiliki waktu atau kemauan untuk membuka aplikasi e-commerce rumit, memfoto sayuran layu, dan mengetik harga diskon satu per satu.

### Solusi Rekayasa PASARIN
Berbeda dari aplikasi surplus konsumen pasif, PASARIN bekerja secara **proaktif dan otonom**:
1. **Penyapuan Terjadwal 14.30 WIB:** Background worker otomatis bangun pada jam rawan pasar untuk memindai stok tanpa menunggu instruksi pedagang.
2. **Kinetika Respirasi Biologis Arrhenius-Q10:** Memprediksi penurunan mutu dan sisa umur simpan sayur murni menggunakan data suhu mikro pasar tanpa ketergantungan kamera CCTV fisik di los basah.
3. **Kaskade Redistribusi 3-Tier Sirkular:**
   * **Tier 1 (Komersial Warteg):** Diskon dinamis 50%–70% dengan proteksi harga modal (*Price Floor*) untuk memulihkan modal tunai pedagang (*balik modal*).
   * **Tier 2 (Sosial & Kemanusiaan):** Jendela reservasi prioritas eksklusif 30 menit bagi Dapur Sosial & Panti Asuhan untuk mengklaim sayuran bergizi layak konsumsi.
   * **Tier 3 (Biokonversi Biomassa):** Alokasi otomatis sayuran reject non-food grade ke sentra budidaya larva Maggot BSF dan TPS 3R (Rp 1.500/kg).
4. **Arsitektur Nol Biaya Server ($0 Cloud):** Beroperasi 100% pada kuota gratis (Vercel Edge, Supabase PostgreSQL, Google Gemini Flash, OpenWeatherMap, dan Telegram Bot API).

---

## 🏛️ Kemitraan Lapangan Resmi (Legal MoU)

Proyek ini dipayungi secara hukum oleh perjanjian resmi antara perguruan tinggi dan BUMD pengelola pasar:
* **Nomor MoU:** `001/MOU-PASARIN/FTUI-UPB/X/2026`
* **Para Pihak:** Departemen Teknik Elektro FTUI & Perumda Pasar Jaya (UPB Pasar Induk Kramat Jati).
* **Ruang Lingkup:** Pengujian prototipe pada 1–5 kios binaan di area Los Basah Blok A untuk 4 komoditas sayuran daun (Bayam, Kangkung, Sawi, Selada).
* **Ketentuan Kunci:** Riset akademik nirlaba mutlak (Rp 0,- / Zero Cost), perlindungan rahasia modal pedagang (NDA), hak cipta source code 100% milik FTUI/mahasiswa, dan pengesahan resmi Dosen Pengampu **Prof. Dr. Ir. Riri Fitri Sari, M.Sc., M.M.** (NIP: `197007071995012003`).

---

## 🚀 Status Sprint & Peta Jalan Terakselerasi

Proyek diselesaikan melalui 3 Sprint terpadu dengan siklus pengujian mingguan pada hari Senin:

```
[30 Sep 2026] ───────────────────────[12 Okt] ──────────────────────[02 Nov] ─────────────────────> [09 Nov 2026]
 ┌───────────────────────────────────┐ ┌───────────────────────────────────┐ ┌───────────────────────────────────┐
 │             SPRINT 1              │ │             SPRINT 2              │ │             SPRINT 3              │
 │       (FONDASI INFRASTRUKTUR)     │ │   (CORE LOGIC & UNIT TESTING)     │ │    (MATCHMAKER, BOT & FINAL DEMO) │
 │        30 Sep – 12 Okt 2026       │ │        13 Okt – 02 Nov 2026       │ │        03 Nov – 09 Nov 2026       │
 │        [ STATUS: 100% DONE ]      │ │      [ SENIN 2 NOV: TESTING 1 ]   │ │      [ SENIN 9 NOV: FINAL DEMO ]  │
 ├───────────────────────────────────┤ ├───────────────────────────────────┤ ├───────────────────────────────────┤
 │ • PSR-1 : Core Infra & DB Epic    │ │ • PSR-5 : Weather Telemetry API   │ │ • PSR-9 : 3-Tier Matching Epic    │
 │ • PSR-2 : Supabase Schema & DDL   │ │ • PSR-6 : Bio Decay & Market Epic │ │ • PSR-22: Circular 3-Tier Engine  │
 │ • PSR-3 : Next.js 16 API Scaffold │ │ • PSR-14: Arrhenius Core Module   │ │ • PSR-23: 30m Social Priority Win │
 │ • PSR-4 : Cron Scheduler 14:30    │ │ • PSR-15: Rain Footfall In-Core   │ │ • PSR-10: Telegram Interface Epic │
 │ • PSR-28: 7 Role Mobile Dashboards│ │ • PSR-16: 30 Kiosks Synthetic Data│ │ • PSR-24: Live Telegram Webhook   │
 │                                   │ │ • PSR-8 : Spoilage & Pricing Epic │ │ • PSR-25: Vendor 1-Tap Inline Flow│
 │                                   │ │ • PSR-20: Dynamic Pricing In-Core │ │ • PSR-26: Buyer Fast Claim & Lock │
 │                                   │ │ • PSR-21: Quality Gate Ethical    │ │ • PSR-27: Fleet Rule & Sim QRIS   │
 │                                   │ │ • PSR-7 : ReAct Orchestrator Epic │ │ • PSR-13: Verification Epic       │
 │                                   │ │ • PSR-17: Gemini Flash Core   │ │ • PSR-31: 24h Market E2E Demo     │
 │                                   │ │ • PSR-18: Tool Calling Registry   │ │ • PSR-32: Academic Report & Pitch │
 │                                   │ │ • PSR-19: Composite Spoilage Calc │ │                                   │
 │                                   │ │ • PSR-39: In-Class Unit Testbench │ │                                   │
 │                                   │ │ • PSR-40: Supabase Role Login Flow│ │                                   │
 └───────────────────────────────────┘ └───────────────────────────────────┘ └───────────────────────────────────┘
```

### Rincian Capaian Sprint:
* **Sprint 1 (SELESAI / 100% Done):**
  * `PSR-1`: Epic Core Infrastructure Database & Scheduler.
  * `PSR-2`: Skema basis data relasional PostgreSQL Supabase (4 tabel inti: `kiosks`, `commodities`, `stock_items`, `offers`, indeks B-Tree, dan Row Level Security).
  * `PSR-3`: Framework Next.js 16 App Router, standardisasi kontrak `ApiResponse<T>`, validasi runtime Zod di `src/lib/env.ts`, edge security middleware, dan endpoint status kesehatan peladen `/api/health`.
  * `PSR-4`: Automated Cron Scheduler 14:30 WIB (`vercel.json` jadwal `30 7 * * *`), otentikasi Bearer token rahasia, dan pencatatan jejak audit `system_audit_trail`.
  * `PSR-28`: Antarmuka 7 Role Mobile Dashboards bertema terang (Pedagang, Warteg, Panti, Maggot, Kurir, Manajer, Admin) di `src/components/roles/`.
* **Sprint 2 (Target Kelas: Senin, 02 November 2026):**
  * Kinetika peluruhan biologis Arrhenius-Q10 & reduksi pengunjung hujan lebat (`PSR-14`, `PSR-15`).
  * Penetapan harga dinamis Inverse Surge dengan Price Floor Protection & Ethical Quality Gate (`PSR-20`, `PSR-21`).
  * Agen ReAct Multi-Turn Google Gemini Flash & Function Calling Registry (`PSR-17`, `PSR-18`).
  * **`PSR-39`:** In-Class Automated Unit Testing Suite (`npm run test:unit`) siap demo di kelas.
  * **`PSR-40`:** Frontend Supabase Role Authentication & Login System (`/login` + Role Isolation).
* **Sprint 3 (Target Final Release: Senin, 09 November 2026):**
  * Circular 3-Tier Matchmaking & Timer Prioritas 30 Menit Dapur Sosial (`PSR-22`, `PSR-23`).
  * Live Bot Telegram Gateway `@pasarin_bot` & tombol penawaran 1-ketuk pedagang (`PSR-24`, `PSR-25`, `PSR-26`).
  * Alokasi armada logistik Viar/GranMax & Simulated QRIS Escrow (`PSR-27`, `PSR-37`).
  * Demonstrasi simulasi 24 jam metabolisme pasar & penyerahan laporan akademik final (`PSR-31`, `PSR-32`).

---

## 📂 Struktur Direktori Codebase

```text
C:/Project/Pasarin/
├── .github/workflows/          # Pipeline otomatisasi CI GitHub Actions (Typecheck & Build)
├── public/brand/               # Aset visual master logo teratai geometris Ultra HD
├── src/
│   ├── app/                    # Next.js App Router (Layouts, Halaman Utama, dan API)
│   │   ├── api/
│   │   │   ├── health/         # Endpoint probe kesehatan peladen (GET /api/health)
│   │   │   └── cron/
│   │   │       └── afternoon-sweep/ # Pemicu sapuan otonom 14:30 WIB (GET/POST)
│   │   ├── globals.css         # Styling global Tailwind CSS v4 & tema terang
│   │   ├── layout.tsx          # Root layout aplikasi web
│   │   └── page.tsx            # Halaman utama cockpit interaktif 7 dasbor peran
│   ├── components/
│   │   ├── common/             # Komponen kontrol (MarketClock, TelegramSimulator, Stepper, Logo)
│   │   ├── layout/             # Bilah navigasi (AppHeader & AppSidebar isolasi peran)
│   │   └── roles/              # 7 Dashboard peran pengguna mandiri:
│   │       ├── VendorDashboard.tsx        (Lapak Pedagang Kios)
│   │       ├── WartegDashboard.tsx        (Pembeli Warteg & Kuliner Mikro)
│   │       ├── SocialKitchenDashboard.tsx (Dapur Sosial & Panti Asuhan)
│   │       ├── MaggotDashboard.tsx        (Sentra Biokonversi BSF & TPS 3R)
│   │       ├── LogisticsDashboard.tsx     (Kurir / Dispatcher Armada)
│   │       ├── ManagerDashboard.tsx       (Pengelola Pasar Jaya & Rekap DLH)
│   │       └── AdminDashboard.tsx         (Administrator Teknis & Audit Trail)
│   ├── data/                   # Basis data statis pasar:
│   │   ├── kiosks.ts           (Direktori 30 Kios Kramat Jati Blok A, B, C)
│   │   └── commodities.ts      (30 Profil Biologis Sayur & Koefisien Respirasi Q10)
│   ├── lib/                    # Mesin sains domain, konektor, dan utilitas:
│   │   ├── api-response.ts     (Standard response envelope builder & Zod body validator)
│   │   ├── audit.ts            (System audit trail logger ke Supabase & memory buffer)
│   │   ├── decayEngine.ts      (Formula kinetika Arrhenius & Inverse Surge Pricing)
│   │   ├── env.ts              (Runtime Zod validator untuk variabel lingkungan)
│   │   ├── simulationStore.tsx (State reaktif global React Context 24 jam pasar)
│   │   └── supabase.ts         (Inisialisasi koneksi Supabase Client & Service Role)
│   ├── middleware.ts           # Proxy penegakan header keamanan
│   └── types/
│       └── api.ts              # Interface TypeScript standar kontrak data & response API
├── supabase/
│   ├── migrations/             # Skrip SQL DDL relasional PostgreSQL
│   └── seed.sql                # Data awal untuk pengujian lokal
├── vercel.json                 # Konfigurasi deployment Vercel Edge & scheduler cron harian
├── tsconfig.json               # Konfigurasi kompilasi TypeScript strict mode
└── package.json                # Dependensi proyek (Next.js 16, React 19, Supabase, Zod)
```

---

## Menjalankan Pasarin

Gunakan Node.js 22 dan jalankan:

```sh
npm ci
npm run dev -- --hostname 127.0.0.1
```

Buka http://localhost:3000/login. Masuk menggunakan email lengkap akun Supabase Auth yang sudah diberi peran. Untuk akun berdomain `@pasarin.id`, cukup masukkan nama penggunanya. Lingkungan lokal memakai penyimpanan server berbasis berkas. Atur `PASARIN_STATE_FILE` untuk memakai berkas terpisah dan mulai dengan inventaris kosong.

Untuk demo kelas, semua akun memakai nama pengguna sebagai kata sandi:

| Peran | Akun |
| --- | --- |
| Pedagang kios | `pasar1` sampai `pasar30` |
| Warteg | `warteg1` sampai `warteg5` |
| Dapur sosial | `sosial1` sampai `sosial3` |
| Maggot BSF | `maggot1` sampai `maggot2` |
| Kurir | `kurir1` sampai `kurir5` |
| Pengelola | `pengelola1` |
| Admin | `admin1` |

Di localhost, akun tersebut aktif lewat sesi tes. Di deployment, akun yang sama dibuat di Supabase Auth oleh endpoint seed. Setiap kios memiliki enam lot dengan umur simpan berbeda, dan penawaran aktif dari seluruh kios terlihat oleh semua warteg, dapur sosial, atau maggot sesuai tier.

Untuk mengisi ulang data demo di deployment, set `PASARIN_SEED_SECRET` di Vercel, deploy ulang, lalu jalankan:

```sh
curl -X POST https://pasarin.vercel.app/api/admin/seed \
  -H "x-pasarin-seed-secret: $PASARIN_SEED_SECRET" \
  -H "content-type: application/json" -d "{}"
```

Endpoint seed membuat 47 akun Supabase, 180 lot stok, 90 penawaran, dan contoh transaksi. Di localhost, admin dapat memicu endpoint yang sama tanpa secret setelah masuk sebagai `admin1`.

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` memeriksa alur lintas peran dengan data terisolasi. `npm run test:db` melakukan CRUD pada Supabase yang dikonfigurasi. Gunakan basis data khusus pengujian untuk perintah tersebut.

### Supabase dan integrasi

- Set `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` dengan URL proyek dan kunci publishable atau anon. Untuk deployment, tambahkan `SUPABASE_SERVICE_ROLE_KEY` dan terapkan migrasi terlacak. Atur `SUPABASE_DB_URL` jika menerapkan migrasi lewat `npm run db:migrate`. Simpan semua kredensial di environment.
- Isi `app_metadata.pasarin_role` melalui admin Supabase dengan salah satu nilai `vendor`, `warteg`, `social_kitchen`, `maggot`, `logistics`, `manager`, atau `admin`. Untuk pedagang, set `app_metadata.pasarin_vendor_id` ke ID kios.
- Set `CRON_SECRET` untuk sapuan 14.30 WIB. Sapuan mengevaluasi usia stok yang sebenarnya dan membuat usulan penawaran.
- Set `OPENWEATHER_API_KEY` untuk cuaca aktual. Jika data cuaca tidak tersedia, skor tetap dihitung dari usia stok dan profil cuaca estimasi yang diberi label. Dashboard memperbarui data sekitar setiap 15 detik.
- Set `GEMINI_API_KEY` untuk pertanyaan pengelola di web dan Telegram. Default model `gemini-3.5-flash-lite` dapat diganti lewat `GEMINI_MODEL`. Jika Gemini tidak tersedia, aplikasi menyajikan ringkasan dari data pasar dan menyebut sumbernya.
- Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, dan `TELEGRAM_CHAT_ACCOUNTS`. Peta JSON menggunakan ID chat privat sebagai kunci dan objek `{ "id": "id-user-supabase", "name": "Nama akun", "role": "warteg" }` sebagai nilai. Tambahkan `vendorId` untuk pedagang. Gunakan ID Supabase yang sama agar pesanan tersambung ke akun web. Daftarkan webhook ke endpoint deployment `/api/telegram/webhook`. Perintah `/help` menampilkan aksi yang sesuai peran.

### Alur operasional

1. Pedagang mencatat komoditas dan berat, lalu menerbitkan penawaran. Skor susut dihitung dari waktu pasokan masuk dan cuaca yang tersedia.
2. Pembeli yang sesuai tier mengklaim lot. Warteg mengonfirmasi pembayaran simulasi agar pesanan masuk antrean kurir. Lot yang diklaim ditandai dipesan di dasbor pedagang.
3. Kurir mengonfirmasi serah terima. Stok fisik berkurang, pesanan selesai, dan saldo simulasi pedagang tercatat. Pengulangan konfirmasi tidak menambah saldo lagi.

### Kontrak dan batas simulasi

Kontrak HTTP tersedia di [public/openapi.json](public/openapi.json). Pembayaran dicatat dalam ledger simulasi. Serah terima dikonfirmasi oleh akun kurir untuk pesanan yang sudah dibayar.

Hasil pengujian terbaru dapat diperoleh melalui CI atau perintah verifikasi di atas.

---

## 👥 Tim Pengembang & Identitas Akademik

Proyek ini disusun untuk memenuhi deliverable mata kuliah **Rekayasa Perangkat Lunak (ENCE605024 - Kelas 01)**, Departemen Teknik Elektro & Ilmu Komputer, Fakultas Teknik Universitas Indonesia:

1. **Marshal Aufa Diliyana** (NPM: **2406346913**) — Lead Software Architect, ReAct Agentic AI, Backend API & Telegram Bot Integration.
2. **Zahir Shahab** (NPM: **2406487084**) — Biological Kinetics Modeling, Dynamic Pricing & Core Domain Engine.

**Dosen Pengampu:**  
**Prof. Dr. Ir. Riri Fitri Sari, M.M., M.Sc.**  
Guru Besar Rekayasa Perangkat Lunak & Jaringan Komputer, Fakultas Teknik Universitas Indonesia.
