# PASARIN DEFINITIVE PRD MASTER BUNDLE
### Kumpulan Dokumen Spesifikasi Produk & Rekayasa Perangkat Lunak Resmi (Versi Lean 2 Pekan)

Folder ini mengonsolidasikan **tiga dokumen acuan mutlak (*Single Source of Truth*)** untuk pengembangan sistem **PASARIN** (*Proactive Agent for Market Surplus Redistribution*), terbebas dari fitur berlebihan (*anti-vibe coding* & *anti-slop*), serta diselaraskan dengan tenggat evaluasi kelas hari Senin, 02 November 2026 dan rilis final Senin, 09 November 2026.

---

## 📂 DAFTAR BERKAS SPESIFIKASI DALAM BUNDLE

### 1. `01_PRD_FIX_SYSTEM_ARCHITECTURE.md`
* **Peran:** **Master Architecture & Backend Specification (Spesifikasi Inti Sistem)**
* **Cakupan Utama:**
  * Latar belakang empiris timbulan sampah 90–100 ton/hari di Pasar Induk Kramat Jati.
  * Analisis metabolisme pasar 24 jam dan urgensi titik kritis pukul 14.30 WIB.
  * Payung hukum kerjasama formal **MoU Nomor `001/MOU-PASARIN/FTUI-UPB/X/2026`** bersama Perumda Pasar Jaya.
  * Skema relasional basis data PostgreSQL Supabase (DDL 8 tabel, indeks B-Tree, dan Row Level Security).
  * Spesifikasi 17 spesialis agen otonom dan arsitektur penalaran ReAct Google Gemini 2.0 Flash.
  * Desain kaskade ekonomi sirkular 3-Tier (Tier 1 Warteg Diskon 50%–70% dengan Price Floor modal, Tier 2 Dapur Sosial Priority 30m, Tier 3 Maggot BSF Biokonversi).
  * 36 Kontrak spesifikasi endpoint API modular (`/api/*`).
  * Matriks ketertelusuran 26 tiket Jira produksi lean.

---

### 2. `02_PRD_FRONTEND_DESIGN_SPECIFICATION.md`
* **Peran:** **Frontend Architecture & Interaction Design Specification (Spesifikasi Desain & UI/UX)**
* **Cakupan Utama:**
  * Filosofi visual *Minimalist Editorial Modern* bebas dari kartu gradien AI-clutter.
  * Audit aksesibilitas rasio kontras WCAG 2.1 AA & AAA untuk seluruh palet warna (Pine Teal `#2A5C5F`, Cyan Blue `#0369A1`, Sage Green `#047857`, Slate Dark `#0F172A`).
  * Arsitektur state reaktif global React Context (`simulationStore.tsx`) pengendali jam pasar 24 jam.
  * Rincian teknis 7 Dashboard Peran Mandiri terisolasi:
    1. `VendorDashboard`: Lapak pedagang kios (status turgor sayur, konfirmasi tebus kilat, saldo QRIS).
    2. `WartegDashboard`: Pembeli usaha kuliner mikro (katalog lot surplus diskon, checkout escrow).
    3. `SocialKitchenDashboard`: Panti asuhan & dapur sosial (timer hak reservasi darurat 30 menit).
    4. `MaggotDashboard`: Sentra biokonversi BSF & TPS 3R (alokasi limbah organik reject Rp 1.500/kg).
    5. `LogisticsDashboard`: Kurir gerobak motor pasar (rute TSP optimal & aturan armada Viar/GranMax).
    6. `ManagerDashboard`: Pengelola BUMD Pasar Jaya (rekapitulasi tonase sampah dialihkan dari Bantar Gebang).
    7. `AdminDashboard`: Administrator sistem (pemantauan kuota free-tier cloud & penampil jejak audit).
  * Simulator perangkat ponsel Telegram (`TelegramDeviceSimulator.tsx`) dengan tombol inline 1-ketuk `[Setuju Jual]`.
  * Sistem login Supabase Auth murni (`/login`) dengan penguncian antarmuka per peran (*Role Isolation*).

---

### 3. `03_PRD_IMPLEMENTATION_ROADMAP_SPRINT.md`
* **Peran:** **Accelerated 2-Week Implementation Roadmap & Jira Backlog (Rencana Kerja & Sprint)**
* **Cakupan Utama:**
  * Rencana kerja terakselerasi pasca Sprint 1 menuju tenggat akhir 09 November 2026.
  * Hasil audit pemangkasan 8 fitur berisiko tinggi / over-engineered (uji metana IPCC, kamera MobileNetV3, NLP dialek Sunda/Jawa, federasi 4 pasar, geofencing 50m, antrean offline, dan birokrasi SITU).
  * Struktur 3 Sprint Terpadu berbasis ritme evaluasi kelas hari Senin:
    * **Sprint 1 (SELESAI / 100% Done):** Fondasi infrastruktur database, Next.js scaffold, cron 14.30 WIB, dan 7 dashboard web (`PSR-1` s/d `PSR-4`, `PSR-28`).
    * **Sprint 2 (13 – 31 Okt 2026 / Freeze Sabtu 31 Okt):** Core logic Arrhenius-Q10, dynamic pricing, Gemini ReAct agent, sistem login Supabase (`PSR-40`), dan **In-Class Automated Unit Testing Suite (`PSR-39`)** siap demo di kelas Senin, 02 November 2026.
    * **Sprint 3 (01 – 09 Nov 2026 / Final Release):** Pemadanan 3-tier, live bot Telegram `@pasarin_bot`, simulated QRIS escrow, dan uji coba 24 jam demonstrasi final Senin, 09 November 2026.
  * Blok CSV Master Export resmi yang sinkron 100% dengan Jira Board `PSR` di `https://zahirshahab25.atlassian.net`.

---

## 👥 Tim Pengembang & Institusi
* **Marshal Aufa Diliyana** (NPM: 2406346913) — Lead Software Architect & Backend Integration
* **Zahir Shahab** (NPM: 2406487084) — Biological Kinetics Modeling & Dynamic Economics Lead
* **Dosen Pengampu:** Prof. Dr. Ir. Riri Fitri Sari, M.M., M.Sc.
* **Departemen Teknik Elektro & Ilmu Komputer, Fakultas Teknik Universitas Indonesia (FTUI)**
