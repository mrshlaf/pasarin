# PRODUCT REQUIREMENTS DOCUMENT (PRD) & ACCELERATED IMPLEMENTATION ROADMAP
# PASARIN: Proactive Agent for Market Surplus Redistribution
### Rencana Kerja Resmi Rekayasa Perangkat Lunak 2 Pekan (Deadline Final: Senin, 09 November 2026)

---

## 1. INFORMASI PROYEK & KONTROL DOKUMEN

* **Nama Proyek:** PASARIN (Proactive Agent for Market Surplus Redistribution)
* **Kode Dokumen:** PRD-ROADMAP-2WEEKS-MONDAYS-TESTING-V4.2
* **Target Waktu Proyek:** Kickoff Sprint 1 (30 Sep 2026) s/d Hard Deadline Final Release (**Senin, 09 November 2026**)
* **Hard Deadline Siap Rilis / Operational Freeze:** **Senin, 09 November 2026**
* **Milestone Pengujian Sesi Kelas (Setiap Hari Senin):**
  1. **Senin, 02 November 2026:** In-Class Unit Testing Suite Milestone (`PSR-39`) — Akhir Sprint 2.
  2. **Senin, 09 November 2026:** Final End-to-End Testing & Live Demo Milestone (`PSR-31` & `PSR-32`) — Akhir Sprint 3.
* **Tim Pengembang & Kepemilikan Sistem:**
  1. **Marshal Aufa D.** (NPM: 2406346913) — Lead Software Architect, ReAct Agentic AI, Backend API & Telegram Bot
  2. **Zahir Shahab** (NPM: 2406487084) — Biological Kinetics Modeling, Dynamic Pricing & Core Domain Engine
* **Institusi:** Departemen Teknik Elektro & Ilmu Komputer, Fakultas Teknik Universitas Indonesia
* **Mata Kuliah:** Rekayasa Perangkat Lunak (ENCE605024 - Kelas 01)
* **Dosen Pengampu:** Prof. Dr. Ir. Riri Fitri Sari, M.M., M.Sc.
* **Jira Board Resmi:** `https://zahirshahab25.atlassian.net/jira/software/projects/PSR/boards/2`
* **Status Arsitektur:** **100% Grounded, Bebas Vibe-Coding, ReAct Agentic AI Asli & Live Telegram Bot Terintegrasi**

---

## 2. TIMELINE MAKRO & KALENDER SPRINT KELAS SENIN (30 SEP – 09 NOV 2026)

Menyelaraskan dengan jadwal perkuliahan mingguan Prof. Riri di mana **setiap hari Senin adalah sesi evaluasi/testing di kelas**, maka sisa jadwal 2 pekan ke depan dipadatkan ke dalam dua siklus berbatas tegas:
* **Senin, 02 November 2026:** Target pengujian unit otomatis di kelas (In-Class Unit Testing `PSR-39`).
* **Senin, 09 November 2026:** Target rilis akhir, pengujian 24 jam end-to-end, dan demonstrasi final (`PSR-31` & `PSR-32`).

```
[30 Sep 2026] ───────────────────────[12 Okt] ──────────────────────[31 Okt] ──[01 Nov: Rest]────> [09 Nov 2026]
 ┌───────────────────────────────────┐ ┌───────────────────────────────────┐ ┌───────────────────────────────────┐
 │             SPRINT 1              │ │             SPRINT 2              │ │             SPRINT 3              │
 │       (FONDASI INFRASTRUKTUR)     │ │   (CORE LOGIC & UNIT TESTING)     │ │    (MATCHMAKER, BOT & FINAL DEMO) │
 │        30 Sep – 12 Okt 2026       │ │        13 Okt – 31 Okt 2026       │ │        01 Nov – 09 Nov 2026       │
 │        [ STATUS: 100% DONE ]      │ │      [ FREEZE: SABTU 31 OKT ]     │ │      [ SENIN 9 NOV: FINAL DEMO ]  │
 ├───────────────────────────────────┤ ├───────────────────────────────────┤ ├───────────────────────────────────┤
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
 │ • PSR-19: Composite Spoilage Calc │ │                                   │
 │ • PSR-39: In-Class Unit Testbench │ │                                   │
 │ • PSR-40: Supabase Role Login Flow│ │                                   │
 └───────────────────────────────────┘ └───────────────────────────────────┘ └───────────────────────────────────┘
```

---

## 3. HASIL AUDIT STRUKTUR FITUR (PEMANGKASAN & KONSOLIDASI MODUL)

### 3.1 Fitur yang Resmi Dieliminasi (Anti-Vibe Coding & Anti-Slop)
1. **`PSR-29` (IPCC 2006 Methane Carbon Accounting Engine) — DIHAPUS:**  
   Menghitung dekomposisi anaerobik gas metana di TPA Bantar Gebang adalah ranah teknik lingkungan/kimia tanah, bukan rekayasa perangkat lunak.
2. **`PSR-33` (MobileNetV3 Leaf Chlorosis Vision Inspection) — DIHAPUS:**  
   Kontradiksi mutlak dengan premis PRD *"Zero CCTV / Zero Camera di los basah"*.
3. **`PSR-34` (Multi-Dialect NLP Assistant Sunda/Jawa/Betawi) — DIHAPUS:**  
   Pelatihan model dialek pasar lokal adalah riset linguistik/NLP tersendiri.
4. **`PSR-38` (Multi-Market Federation 4 Pasar Regional DKI) — DIHAPUS:**  
   *Scope creep* berlebihan; naskah hukum MoU resmi dengan Perumda Pasar Jaya hanya mengikat pilot 1–5 kios di Blok A Pasar Kramat Jati.
5. **`PSR-36` (HMAC-SHA256 Token & 50m Geofencing GPS Indoor) — DIHAPUS:**  
   GPS indoor di bawah atap seng/galvalum los pasar basah memiliki kelemahan fisika nyata (*multipath reflection & signal drift*).
6. **`PSR-35` (SITU Permit OCR & Physical Address Verification) — DIHAPUS:**  
   Birokrasi pendaftaran publik tidak relevan karena kios pilot sudah ditetapkan langsung bersama pengelola pasar pada naskah MoU.
7. **`PSR-30` (Offline Message Queue & Exponential Backoff Resiliency) — DIHAPUS:**  
   Overhead sistem terdistribusi yang tidak esensial untuk pengujian prototipe akademik.

---

### 3.2 Tiga Pilar Unggulan yang Dipertahankan & Dikonsolidasi Sesuai Pilihan Tim
1. **Full ReAct Multi-Turn AI Agent (Google Gemini 2.0 Flash - `PSR-17` & `PSR-18`):**  
   Dipertahankan secara utuh dengan pola penalaran nyata (*Thought $\rightarrow$ Action $\rightarrow$ Observation $\rightarrow$ Final Answer*) menggunakan SDK `@google/genai` dan registri Function Calling resmi. Menjadi etalase pembuktian Agentic AI sesuai kurikulum Prof. Riri.
2. **Bot Telegram Live Sungguhan (`PSR-24`, `PSR-25`, `PSR-26`):**  
   Dipertahankan sebagai bot Telegram live `@pasarin_bot` yang dapat berinteraksi langsung melalui ponsel cerdas di depan dosen evaluator via webhook Next.js, dilengkapi tombol penawaran 1-ketuk `[✅ Setuju Jual]` dan `[❌ Lewati]`.
3. **Konsolidasi Rumus Domain ke `src/lib/pasarinCore.ts` (`PSR-14`, `PSR-15`, `PSR-19`, `PSR-20`, `PSR-27`):**  
   Seluruh formula matematis (Arrhenius-Q10, redaman pengunjung saat hujan, harga dinamis dengan batas modal, dan aturan armada Viar/GranMax) disatukan dalam satu modul TypeScript yang bersih (~120 baris kode).

---

## 4. DOKUMENTASI LENGKAP 26 TIKET JIRA LEAN (PSR-1 s/d PSR-39)

### 4.1 Epics Arsitektur Sistem (7 Epics Aktif di Jira)
1. **`PSR-1`** (Epic): *Core Infrastructure Database and Scheduler* (Sprint 1 - DONE).
2. **`PSR-6`** (Epic): *Biological Decay Modeling and Dynamic Economics* (Sprint 2 - In Progress).
3. **`PSR-7`** (Epic): *Central Multi-Agent ReAct Orchestrator* (Sprint 2 - Planned).
4. **`PSR-8`** (Epic): *Spoilage Pricing and Ethical Quality Gate* (Sprint 2 - Planned).
5. **`PSR-9`** (Epic): *Circular 3-Tier Matchmaking and Dispatch* (Sprint 3 - Planned).
6. **`PSR-10`** (Epic): *Telegram Bot Interface Gateway* (Sprint 3 - Planned).
7. **`PSR-13`** (Epic): *Verification Simulation and Final Defense* (Sprint 3 - Planned).

---

### 4.2 Sprint 1: FONDASI INFRASTRUKTUR (SELESAI / 30 Sep – 12 Okt 2026 | 21.0 SP)

* **`PSR-2` (Task | 5.0 SP | Zahir Shahab | Status: Done | Due: 04 Okt 2026):** Supabase PostgreSQL Relational Schema & DDL Design (4 tabel inti: `kiosks`, `commodities`, `stock_items`, `offers`, indeks B-Tree, dan Row Level Security).
* **`PSR-3` (Task | 3.0 SP | Marshal Aufa | Status: Done | Due: 06 Okt 2026):** Next.js 14 App Router Framework Scaffold & API Boilerplate (Standarisasi envelope `ApiResponse<T>`, validasi runtime Zod di `src/lib/env.ts`, rute `/api/health`, dan edge security middleware).
* **`PSR-4` (Task | 5.0 SP | Marshal Aufa | Status: Done | Due: 10 Okt 2026):** Automated Cron Scheduler 14:30 WIB (`vercel.json` jadwal `30 7 * * *`, proteksi Bearer token rahasia, dan pencatatan riwayat ke `system_audit_trail`).
* **`PSR-28` (Task | 8.0 SP | Marshal Aufa | Status: Done | Due: 12 Okt 2026):** Responsive Light-Mode Mobile Dashboards (7 Dashboard peran mandiri: Pedagang, Warteg, Dapur Sosial, Maggot, Kurir, Manajer, Admin di `src/components/roles/`).

---

### 4.3 Sprint 2: CORE LOGIC & IN-CLASS UNIT TESTING (13 Okt – 02 Nov 2026 | 56.0 SP)
**Target Utama: Siap Diuji Langsung di Kelas pada Hari Senin, 02 November 2026**

* **`PSR-5`: Hyperlocal Climate Telemetry Agent (Task | 5.0 SP | Zahir Shahab | Due: 28 Okt 2026)**  
  Mengintegrasikan endpoint `/api/telemetry/weather` dengan OpenWeatherMap API pada koordinat Pasar Kramat Jati (-6.2644, 106.8687), cache memori 15 menit, dan profil tropis darurat (32°C & 75% RH).
* **`PSR-14`: Biological Shelf-Life Decay Engine (Task | 8.0 SP | Zahir Shahab | Due: 29 Okt 2026)**  
  Mengoding fungsi kinetika Arrhenius dan thermal quotient $Q_{10} = 2.0$ di `src/lib/pasarinCore.ts` untuk menghitung penurunan turgor daun sayuran secara matematis murni tanpa kamera fisik.
* **`PSR-15`: Market Crowd Footfall Attenuation Simulator (Task | 5.0 SP | Zahir Shahab | Due: 29 Okt 2026)**  
  Memodelkan fungsi redaman pengunjung eceran akibat hujan lebat sore (curah hujan > 10 mm menurunkan pembeli 48%), memicu koreksi proyeksi sisa stok lapak di dalam modul `pasarinCore.ts`.
* **`PSR-16`: Synthetic Data Generator 30 Stalls (Task | 5.0 SP | Marshal Aufa | Due: 30 Okt 2026)**  
  Menyediakan dataset 30 kios Kramat Jati (Blok A, B, C) dan 30 komoditas hortikultura di `src/data/` untuk mendukung simulasi terukur.
* **`PSR-20`: Inverse Surge Dynamic Pricing Engine (Task | 5.0 SP | Zahir Shahab | Due: 30 Okt 2026)**  
  Menghitung penurunan harga bertahap diskon 50%–70% untuk Warteg seiring bertambahnya jam simpan, terkunci aman pada batas bawah modal (*price floor* $\ge$ modal kulakan dasar) agar pedagang tidak rugi.
* **`PSR-21`: Quality Gate Moral Hazard Protection (Task | 5.0 SP | Marshal Aufa | Due: 30 Okt 2026)**  
  Membangun aturan kendali mutu etis: jika sayuran terverifikasi masih layak konsumsi manusia (Quality Score $\ge$ 0.35), sistem memblokir rute pakan ternak maggot secara terprogram.
* **`PSR-40`: Frontend Supabase Role Authentication and Login System (Task | 3.0 SP | Marshal Aufa | Due: 30 Okt 2026 — JUMAT MALAM)**  
  **Sistem Autentikasi Frontend:** Membangun form login email/password murni yang terhubung langsung ke Supabase Auth, proteksi rute (`/login` vs dashboard), penguncian antarmuka per peran (Role Isolation), serta tombol Logout di header (100% kelar Jumat malam!).
* **`PSR-17`: Google Gemini 2.0 Flash ReAct Agent Core (Task | 8.0 SP | Marshal Aufa | Due: 31 Okt 2026)**  
  Membangun orkestrator ReAct multi-turn menggunakan SDK `@google/genai` (siklus *Thought $\rightarrow$ Action $\rightarrow$ Observation $\rightarrow$ Final Answer*) dengan batas maksimal 5 putaran penalaran.
* **`PSR-18`: Tool Calling Registry & Query Decomposition (Task | 5.0 SP | Marshal Aufa | Due: 31 Okt 2026)**  
  Mendaftarkan fungsi sub-agen (`checkWeather`, `evaluateDecay`, `calculatePricing`, `allocateTiers`) ke format Function Calling Gemini untuk merespons kueri manajerial pengelola pasar.
* **`PSR-19`: Composite Predictive Spoilage Engine (Task | 5.0 SP | Zahir Shahab | Due: 31 Okt 2026)**  
  Mengintegrasikan data stok masuk, telemetri cuaca, dan redaman pengunjung menjadi prediksi kuantitatif surplus kilogram per lapak pada jam 14.30 WIB.
* **`PSR-39`: In-Class Automated Unit Testing Suite (Testing | 5.0 SP | Marshal & Zahir | Due: 31 Okt 2026 — SABTU MALAM FREEZE)**  
  **Milestone Pengujian Kelas:** Membangun test suite pengujian unit otomatis (`npm run test:unit`) yang memverifikasi integritas formula kinetika Arrhenius, penurunan harga dinamis, proteksi moral hazard, dan rute API. 100% lulus hijau pada Sabtu 31 Okt malam!

---

### 4.4 Sprint 3: 3-TIER MATCHMAKING, LIVE TELEGRAM & FINAL DEMO (03 Nov – 09 Nov 2026 | 38.0 SP)
**Target Utama: Rilis Akhir & Demonstrasi Final pada Hari Senin, 09 November 2026**

* **`PSR-22`: Circular 3-Tier Matchmaking Engine (Task | 5.0 SP | Zahir Shahab | Due: 04 Nov 2026)**  
  Membangun logika pemadanan sirkular berbasis formula jarak Haversine (radius $\le 5\text{ km}$), kapasitas tampung harian, dan skor reputasi pembeli Warteg terdekat.
* **`PSR-23`: Priority Time-Window Dispatcher Tier 2 (Task | 3.0 SP | Marshal Aufa | Due: 05 Nov 2026)**  
  Menerapkan penghitung waktu mundur 30 menit khusus bagi Dapur Sosial & Panti Asuhan untuk mengklaim sayuran bernutrisi sebelum dialihkan ke pakan maggot.
* **`PSR-24`: Live Telegram Bot API Gateway & Webhook (Task | 5.0 SP | Marshal Aufa | Due: 06 Nov 2026)**  
  Mendaftarkan bot resmi `@pasarin_bot` via BotFather, membangun endpoint webhook asinkron di Next.js dengan verifikasi token rahasia untuk melayani perintah pedagang dan pembeli.
* **`PSR-25`: Vendor 1-Tap Inline Keyboard Flow (Task | 5.0 SP | Marshal Aufa | Due: 06 Nov 2026)**  
  Menyusun format notifikasi penawaran Telegram jam 14.30 WIB dengan tombol interaktif `[✅ Setuju Jual]` dan `[❌ Lewati]` yang terhubung langsung ke basis data.
* **`PSR-26`: Buyer Instant Alert & Fast Claim Channel (Task | 5.0 SP | Zahir Shahab | Due: 07 Nov 2026)**  
  Membangun kanal siaran penawaran kilat ke Warteg dengan penguncian konkurensi atomik (*atomic locking*) guna mencegah klaim ganda atas satu lot sayur.
* **`PSR-27`: Logistics Fleet Allocation and Weight Dispatch Rule (Task | 5.0 SP | Marshal Aufa | Due: 07 Nov 2026)**  
  Aturan penugasan armada berdasarkan bobot muatan ($\le 300\text{ kg}$ Viar roda tiga; $> 300\text{ kg}$ pikap GranMax) dan kalkulasi rute los kios.
* **`PSR-37`: Simulated In-App QRIS Escrow Payment Gateway (Task | 5.0 SP | Marshal Aufa | Due: 07 Nov 2026)**  
  Antarmuka simulasi pembayaran QRIS terproteksi *in-app escrow* untuk mengamankan transaksi tebusan Warteg sebelum serah terima selesai.
* **`PSR-31`: 24-Hour Market Metabolism Simulation Trial (Testing | 5.0 SP | Marshal Aufa | Due: 08 Nov 2026)**  
  Uji coba demonstrasi terpadu siklus 24 jam metabolisme pasar untuk 30 kios: kedatangan subuh, cron sweep 14.30 WIB, klaim Warteg, reservasi sosial, dan penjemputan logistik.
* **`PSR-32`: Academic Word Report Audit and Video Pitch (Testing | 5.0 SP | Zahir Shahab | Due: 09 Nov 2026 — SENIN FINAL DEMO)**  
  Audit akhir dokumen proposal akademik bebas pola AI slop, kelengkapan berkas fisik MoU ber-meterai, dan video demonstrasi sistem 5 menit untuk sidang akhir pada hari Senin, 09 November 2026.

---

## 5. CSV MASTER EXPORT RESMI (SINKRONISASI JIRA BOARD PSR 26 TIKET LEAN)

```csv
Issue Type,Issue key,Summary,Priority,Story Points,Assignee,Epic Link,Due Date
Epic,PSR-1,Core Infrastructure Database and Scheduler,Highest,,Marshal Aufa,,2026-10-12
Task,PSR-2,Supabase PostgreSQL Schema and DDL Design,Highest,5,Zahir Shahab,PSR-1,2026-10-04
Task,PSR-3,Next.js 14 App Router Framework Scaffold and API Boilerplate,Highest,3,Marshal Aufa,PSR-1,2026-10-06
Task,PSR-4,Automated Cron Scheduler 14:30 WIB,Highest,5,Marshal Aufa,PSR-1,2026-10-10
Task,PSR-28,Responsive Light-Mode Mobile Dashboards,High,8,Marshal Aufa,PSR-1,2026-10-12
Epic,PSR-6,Biological Decay Modeling and Dynamics,Highest,,Zahir Shahab,,2026-11-02
Task,PSR-5,Hyperlocal Climate Telemetry Agent,High,5,Zahir Shahab,PSR-6,2026-10-28
Task,PSR-14,Biological Shelf-Life Decay Engine,Highest,8,Zahir Shahab,PSR-6,2026-10-29
Task,PSR-15,Market Crowd Footfall Attenuation Simulator,High,5,Zahir Shahab,PSR-6,2026-10-30
Task,PSR-16,Synthetic Data Generator 30 Stalls,Medium,5,Marshal Aufa,PSR-6,2026-10-30
Epic,PSR-8,Spoilage Pricing and Quality Gate,High,,Zahir Shahab,,2026-11-02
Task,PSR-20,Inverse Surge Dynamic Pricing Engine,High,5,Zahir Shahab,PSR-8,2026-10-31
Task,PSR-21,Quality Gate Moral Hazard Protection,Highest,5,Marshal Aufa,PSR-8,2026-10-31
Epic,PSR-7,Central ReAct Orchestrator,Highest,,Marshal Aufa,,2026-11-02
Task,PSR-17,Google Gemini ReAct Agent Core,Highest,8,Marshal Aufa,PSR-7,2026-11-01
Task,PSR-18,Tool Calling Registry and Query Decomposition,Medium,5,Marshal Aufa,PSR-7,2026-11-01
Task,PSR-19,Composite Predictive Spoilage Engine,Medium,5,Zahir Shahab,PSR-8,2026-11-02
Testing,PSR-39,In-Class Automated Unit Testing Suite,Highest,5,Marshal Aufa,PSR-7,2026-11-02
Task,PSR-40,Frontend Supabase Role Authentication and Login System,High,3,Marshal Aufa,PSR-1,2026-11-02
Epic,PSR-9,3-Tier Matchmaking and Routing,High,,Marshal Aufa,,2026-11-09
Task,PSR-22,Circular 3-Tier Matchmaking Engine,High,5,Zahir Shahab,PSR-9,2026-11-04
Task,PSR-23,Priority Time-Window Dispatcher Tier 2,High,3,Marshal Aufa,PSR-9,2026-11-05
Epic,PSR-10,Telegram Bot Interface Gateway,High,,Marshal Aufa,,2026-11-09
Task,PSR-24,Telegram Bot API Gateway and Webhook,Highest,5,Marshal Aufa,PSR-10,2026-11-06
Task,PSR-25,Vendor 1-Tap Inline Keyboard Flow,High,5,Marshal Aufa,PSR-10,2026-11-06
Task,PSR-26,Buyer Instant Alert and Fast Claim Channel,High,5,Zahir Shahab,PSR-10,2026-11-07
Task,PSR-27,Logistics Fleet Cargo Allocation and Weight Dispatch Rule,Medium,5,Marshal Aufa,PSR-9,2026-11-07
Task,PSR-37,Simulated In-App QRIS Escrow Payment Gateway,High,5,Marshal Aufa,PSR-9,2026-11-07
Epic,PSR-13,Verification Simulation and Defense,Medium,,Zahir Shahab,,2026-11-09
Testing,PSR-31,24-Hour Market Metabolism Simulation Trial,Medium,5,Marshal Aufa,PSR-13,2026-11-08
Testing,PSR-32,Academic Word Report Audit and Video Pitch,Medium,5,Zahir Shahab,PSR-13,2026-11-09
```
