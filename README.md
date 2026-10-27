# PASARIN: Proactive Agent for Market Surplus Redistribution
### Sistem Multi-Agen Berbasis Agentic AI untuk Penyelamatan & Redistribusi Surplus Sayur-Buah Pasar Tradisional

![Next.js 16](https://img.shields.io/badge/Next.js-16.3.8-black?style=flat-square&logo=next.js)
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
4. **Arsitektur Nol Biaya Server ($0 Cloud):** Beroperasi 100% pada kuota gratis (Vercel Edge, Supabase PostgreSQL, Google Gemini 2.0 Flash, OpenWeatherMap, dan Telegram Bot API).

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
 │ • PSR-3 : Next.js 14 API Scaffold │ │ • PSR-14: Arrhenius Core Module   │ │ • PSR-23: 30m Social Priority Win │
 │ • PSR-4 : Cron Scheduler 14:30    │ │ • PSR-15: Rain Footfall In-Core   │ │ • PSR-10: Telegram Interface Epic │
 │ • PSR-28: 7 Role Mobile Dashboards│ │ • PSR-16: 30 Kiosks Synthetic Data│ │ • PSR-24: Live Telegram Webhook   │
 │                                   │ │ • PSR-8 : Spoilage & Pricing Epic │ │ • PSR-25: Vendor 1-Tap Inline Flow│
 │                                   │ │ • PSR-20: Dynamic Pricing In-Core │ │ • PSR-26: Buyer Fast Claim & Lock │
 │                                   │ │ • PSR-21: Quality Gate Ethical    │ │ • PSR-27: Fleet Rule & Sim QRIS   │
 │                                   │ │ • PSR-7 : ReAct Orchestrator Epic │ │ • PSR-13: Verification Epic       │
 │                                   │ │ • PSR-17: Gemini 2.0 Flash Core   │ │ • PSR-31: 24h Market E2E Demo     │
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
  * `PSR-3`: Framework Next.js 14 App Router, standardisasi kontrak `ApiResponse<T>`, validasi runtime Zod di `src/lib/env.ts`, edge security middleware, dan endpoint status kesehatan peladen `/api/health`.
  * `PSR-4`: Automated Cron Scheduler 14:30 WIB (`vercel.json` jadwal `30 7 * * *`), otentikasi Bearer token rahasia, dan pencatatan jejak audit `system_audit_trail`.
  * `PSR-28`: Antarmuka 7 Role Mobile Dashboards bertema terang (Pedagang, Warteg, Panti, Maggot, Kurir, Manajer, Admin) di `src/components/roles/`.
* **Sprint 2 (Target Kelas: Senin, 02 November 2026):**
  * Kinetika peluruhan biologis Arrhenius-Q10 & reduksi pengunjung hujan lebat (`PSR-14`, `PSR-15`).
  * Penetapan harga dinamis Inverse Surge dengan Price Floor Protection & Ethical Quality Gate (`PSR-20`, `PSR-21`).
  * Agen ReAct Multi-Turn Google Gemini 2.0 Flash & Function Calling Registry (`PSR-17`, `PSR-18`).
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
│   ├── middleware.ts           # Global edge middleware penegakan header keamanan & CORS
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

## 🛠️ Cara Menjalankan Secara Lokal (Getting Started)

### 1. Prasyarat Sistem
* Node.js v20.x atau lebih baru.
* Manajer paket `npm`.

### 2. Kloning Repositori & Instalasi Dependensi
```bash
git clone https://github.com/mrshlaf/pasarin.git
cd pasarin
npm install
```

### 3. Konfigurasi Variabel Lingkungan
Salin berkas template environment:
```bash
cp .env.example .env.local
```
Sesuaikan variabel lingkungan yang diperlukan:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
CRON_SECRET_KEY=pasarin-cron-secret-dev-2026
```

### 4. Menjalankan Server Pengembangan (Development Mode)
```bash
npm run dev
```
Buka browser Anda di **`http://localhost:3000`**.

### 5. Memeriksa Tipe Data & Melakukan Build Produksi
```bash
# Verifikasi strict type-safety (0 errors):
node ./node_modules/typescript/bin/tsc --noEmit

# Menjalankan build produksi:
npm run build

# Menjalankan peladen produksi:
npm run start
```

---

## 📡 Dokumentasi Endpoint API Aktif

### 1. `GET /api/health`
Endpoint probe kesehatan peladen dan metrik mesin waktu nyata.
* **Header Respons:** `X-Service-Identity: PASARIN-Engine-v0.1.0`
* **Contoh Output (HTTP 200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "pasarin-api",
    "version": "0.1.0",
    "environment": "production",
    "uptimeSeconds": 65,
    "timestamp": "2026-10-26T06:50:40.957Z",
    "checks": {
      "database": "configured",
      "memoryUsageMB": 94.03
    }
  },
  "timestamp": "2026-10-26T06:50:40.958Z"
}
```

### 2. `GET /api/cron/afternoon-sweep` & `POST /api/cron/afternoon-sweep`
Endpoint pemicu otonom sapuan sore hari jam 14.30 WIB yang memindai sisa stok lapak, mengalokasikan komoditas ke 3 tier penyelamatan, dan menerbitkan log audit.
* **Otentikasi Wajib:** Header `Authorization: Bearer <CRON_SECRET_KEY>`.
* **Proteksi Keamanan:** Akses tanpa token resmi ditolak langsung dengan status **HTTP 401 Unauthorized**.
* **Contoh Output Terotorisasi (HTTP 200 OK):**
```json
{
  "success": true,
  "data": {
    "eventId": "evt_1792972119022_ehmjhkl",
    "subsystem": "CRON_SCHEDULER",
    "actionType": "AFTERNOON_SWEEP_EXECUTED",
    "schedule": "14:30 WIB (07:30 UTC)",
    "triggeredAt": "2026-10-25T23:48:39.020Z",
    "result": "Autonomous sweep completed: 1,240 kg surplus processed across 3 tiers.",
    "executionDurationMs": 2,
    "kiosksScanned": 30,
    "surplusDetectedKg": 1240,
    "allocations": {
      "tier1WartegKg": 750,
      "tier2SocialKg": 350,
      "tier3MaggotKg": 140
    },
    "financials": {
      "estimatedCapitalRecoveredIdr": 3750000,
      "discountAveragePercent": 52.5
    },
    "auditTrail": {
      "logged": true,
      "storage": "in_memory"
    }
  },
  "timestamp": "2026-10-25T23:48:39.022Z"
}
```

---

## 👥 Tim Pengembang & Identitas Akademik

Proyek ini disusun untuk memenuhi deliverable mata kuliah **Rekayasa Perangkat Lunak (ENCE605024 - Kelas 01)**, Departemen Teknik Elektro & Ilmu Komputer, Fakultas Teknik Universitas Indonesia:

1. **Marshal Aufa Diliyana** (NPM: **2406346913**) — Lead Software Architect, ReAct Agentic AI, Backend API & Telegram Bot Integration.
2. **Zahir Shahab** (NPM: **2406487084**) — Biological Kinetics Modeling, Dynamic Pricing & Core Domain Engine.

**Dosen Pengampu:**  
**Prof. Dr. Ir. Riri Fitri Sari, M.M., M.Sc.**  
Guru Besar Rekayasa Perangkat Lunak & Jaringan Komputer, Fakultas Teknik Universitas Indonesia.
