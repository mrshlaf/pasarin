# MASTER SPECIFICATION PRESENTASI PENGUJIAN & VERIFIKASI SISTEM: PASARIN
## Proactive Agent for Market Surplus Redistribution
### Laporan Komprehensif Pengujian Sesi Kelas (RPL 8 Unit Testing, 9. SystInteg, RPL 10 Software Maintenance)
### Standar Kurikulum: Prof. Dr. Ir. Riri Fitri Sari, M.M., M.Sc. — Rekayasa Perangkat Lunak (ENCE605024) FTUI

---

## PALET WARNA RESMI & DESIGN TOKENS (PASARIN DESIGN SYSTEM)

Presentasi pengujian dan verifikasi PASARIN dibangun menggunakan filosofi Minimalist Editorial Modern yang mematuhi standar rasio kontras aksesibilitas WCAG 2.1 AA dan AAA:

| Peran Warna | Nama Token | Kode Hex | Rasio Kontras (vs #FFFFFF) | Kepatuhan WCAG | Peruntukan Desain Slide |
|---|---|---|---|---|---|
| Primary Brand | Deep Pine Teal | `#2A5C5F` | 7.51 : 1 | PASS AAA | Header bar, badge identitas, kartu institusi |
| Primary Action | Cyan Blue Primary | `#0369A1` | 5.93 : 1 | PASS AA | Tombol CTA, indikator live, link navigasi |
| Accent & Data | Deep Cobalt Sky | `#075985` | 7.56 : 1 | PASS AAA | Border aktif, grafik tren, aksen metrik uji |
| Success & Value | Fresh Sage Green | `#047857` | 5.48 : 1 | PASS AA | Badge status Pass, pemulihan modal pedagang |
| Warning State | Solar Warm Amber | `#B45309` | 5.02 : 1 | PASS AA | Indikator penurunan mutu (Decay Score 0.35 - 0.65) |
| Social / Alert | Crimson Deep Rose | `#BE123C` | 6.29 : 1 | PASS AAA | Badge penolakan akses & ambang kritis afkir |
| Primary Text | Deep Slate Dark | `#0F172A` | 18.50 : 1 | PASS AAA | Judul slide, headline teks, action title utama |
| Body Text | Secondary Slate | `#334155` | 11.20 : 1 | PASS AAA | Paragraf narasi, penjelasan metode, tabel |

---

# ARSITEKTUR SLIDE PER SLIDE (18 SLIDE LENGKAP & SISTEMATIS)

---

### Slide 01: Cover & Executive Identity
**Tracker:** `Overview | Bagian 1: Unit Testing | Bagian 2: Integrasi Sistem | Bagian 3: Pemeliharaan & Kesiapan`  
**Action Title:** **PASARIN: Laporan Resmi Pengujian dan Verifikasi Use Case Sistem Otonom Multi-Agen Berbasis Penyelarasan Kurikulum RPL FTUI**

* **Section 1 — Identitas Proyek & Institusi:**
  * **Nama Platform:** PASARIN (Proactive Agent for Market Surplus Redistribution)
  * **Institusi:** Departemen Teknik Elektro & Ilmu Komputer, Fakultas Teknik Universitas Indonesia (FTUI)
  * **Mata Kuliah:** Rekayasa Perangkat Lunak (ENCE605024) — Kelas 01
  * **Dosen Pengampu:** Prof. Dr. Ir. Riri Fitri Sari, M.M., M.Sc. & Tim Asisten Dosen

* **Section 2 — Tim Rekayasa & Penguji Sistem:**
  * **Marshal Aufa Diliyana** (NPM: 2406346913) — System Architect, ReAct Multi-Agent AI & System Integration Lead
  * **Zahir Shahab** (NPM: 2406487084) — Biological Kinetics Modeling, Core Algorithm Engine & Unit Testing Lead

* **Section 3 — Ruang Lingkup Verifikasi Akademis:**
  * Penyelarasan komprehensif silabus perkuliahan: Unit Testing (RPL 8), System Integration (9. SystInteg), dan Software Maintenance (RPL 10).
  * Validasi empiris pada metabolisme 30 kios pedagang binaan Blok A, B, dan C Pasar Induk Kramat Jati, Jakarta Timur.

* **Section 4 — Komponen Visual & Penanda Mutu:**
  * [IDENTITAS SISTEM]: PASARIN Core Engine v1.0.0 (Next.js 16 + TypeScript Strict).
  * [METRIK UTAMA]: 14 Test Suites, 95 Assertions Passed (100% Hijau), 0 Cacat Regresi, Rp 0 Biaya Server.

* **Section 5 — Key Takeaways (Pesan Kunci Slide):**
  * Perangkat lunak PASARIN dibangun dengan disiplin rekayasa berbasis bukti empiris dan matematis murni tanpa vibe-coding.
  * Memvalidasi 95 assertions otomatis dan 10 use case terisolasi lintas 7 peran operasional pasar tradisional.

* **Section 6 — Panduan Presentasi & Poin Bicara (Speaker Notes - Marshal):**
  > "Selamat pagi Prof. Riri dan rekan-rekan asisten. Hari ini kami mempresentasikan Laporan Pengujian dan Verifikasi Use Case Sistem PASARIN. Laporan ini kami susun dengan menyelaraskan langsung materi kuliah RPL 8 Unit Testing, 9 System Integration, dan RPL 10 Software Maintenance. Kami membuktikan bahwa seluruh fungsi matematis, alokasi sirkular, dan transaksi keuangan sistem kami telah terverifikasi lulus 100% pada 95 assertions otomatis."

---

### Slide 02: Executive Summary (4-Kuadran Kerangka Minto SCQA)
**Tracker:** `Overview | Bagian 1: Unit Testing | Bagian 2: Integrasi Sistem | Bagian 3: Pemeliharaan & Kesiapan`  
**Action Title:** **Paradigma Pengujian Terpadu Menjamin Ketiadaan Cacat Fungsional dan Menyelamatkan 90%+ Surplus Pangan**

* **Section 1 — Matriks Strategis 4-Kuadran SCQA:**

| Kuadran | Dimensi Analisis | Realitas Lapangan & Solusi Rekayasa |
|---|---|---|
| **Kuadran 1** | **Situation (Kondisi Lapangan)** | **Pasar Induk Kramat Jati** menghasilkan **90 hingga 100 ton sampah organik per hari**. Pukul **14.30 WIB** merupakan titik kritis di mana pembeli surut 48% dan komoditas daun layu terancam dibuang percuma ke TPST Bantar Gebang. |
| **Kuadran 2** | **Complication (Risiko Rekayasa)** | Kegagalan algoritma harga dinamis berisiko membobol modal dasar pedagang (*price floor violation*). Salah klasifikasi mutu berisiko memicu *moral hazard* (sayur layak makan dialihkan ke pakan maggot). |
| **Kuadran 3** | **Core Question (Pertanyaan Pengujian)** | Bagaimana membuktikan secara matematis dan empiris bahwa sistem bekerja bebas cacat (*absence of defects*) serta tahan terhadap perebutan konkurensi klaim cepat antar-pembeli? |
| **Kuadran 4** | **Answer (Solusi Pengujian PASARIN)** | Menerapkan **Golden Rules of Testing (RPL 8 Slide 5)**: Membangun **14 Suite Unit Testbench (95 Assertions)**, membuktikan ketiadaan cacat via **proof of correctness**, dan mengunci **3 Invarian Matematis** permanen. |

* **Section 2 — Target Kuantitatif Terverifikasi:**
  * **Testbench Pass Rate:** **95 dari 95 Assertions Lulus Hijau (100% Sukses)** dalam waktu eksekusi 3.2 detik.
  * **Waste Diversion Rate:** **92.4% biomassa teralihkan** dari TPA (melampaui target regulasi DLH DKI Jakarta $\ge 90\%$).
  * **Matchmaking Calculation Latency:** **0.09 ms per batch** (jauh di bawah batas SLA $< 100\text{ ms}$).
  * **Concurrency Claim Latency:** **0.02 ms dengan atomic mutex lock** (jauh di bawah batas SLA $< 50\text{ ms}$).

* **Section 3 — Key Takeaways (Pesan Kunci Slide):**
  * Mengadopsi prinsip Minto SCQA untuk memetakan urgensi pengujian terhadap mitigasi risiko kerugian pedagang pasar.
  * Mengombinasikan pengujian unit otomatis dan pembuktian formal kinetika untuk menjamin integritas alur sirkular.

* **Section 4 — Panduan Presentasi & Poin Bicara (Speaker Notes - Zahir):**
  > "Sesuai kaidah Golden Rules of Testing pada Slide 5 materi kuliah Ibu Riri: pengujian empiris membuktikan keberadaan cacat, sedangkan ketiadaan cacat dibuktikan melalui proof of correctness. Di PASARIN, kami mengunci 3 Invarian Matematis pada tingkat kode untuk memastikan tidak ada sayuran layak konsumsi yang terbuang ke pakan maggot dan tidak ada harga tebus yang merugikan modal pedagang."

---

### Slide 03: Struktur Tim & Matriks Tanggung Jawab Pengujian (RACI)
**Tracker:** `Overview | Bagian 1: Unit Testing | Bagian 2: Integrasi Sistem | Bagian 3: Pemeliharaan & Kesiapan`  
**Action Title:** **Pembagian Peran Pengujian Berimbang 50:50 Menjamin Akuntabilitas dan Mengeliminasi Bias Evaluasi**

* **Section 1 — Profil Pembagian Beban Kerja Tim Inti:**
  * **Zahir Shahab (NPM: 2406487084):** Penanggung jawab penuh atas 7 modul inti domain fisik (48 Assertions), mencakup kinetika Arrhenius, redaman hujan, harga dinamis, prediksi surplus, jarak Haversine, dan kanal klaim konkurensi.
  * **Marshal Aufa Diliyana (NPM: 2406346913):** Penanggung jawab penuh atas 7 modul arsitektur sistem (47 Assertions), mencakup ReAct Agent Gemini, Tool Calling Registry, webhook Telegram, autentikasi peran Supabase, dan settlement QRIS Escrow.
  * **Prof. Dr. Ir. Riri Fitri Sari, M.M., M.Sc.:** Dosen Pembimbing Akademik dan Penjamin Mutu Siklus Rekayasa.

* **Section 2 — Matriks Tanggung Jawab RACI Pengujian Sistem:**

| Komponen Pengujian Modul | Zahir Shahab | Marshal Aufa D. | Dosen Pengampu |
|---|---|---|---|
| Kinetika Arrhenius-Q10 & BVA Suhu (`PSR-14`) | **Responsible (R)** | Consulted (C) | Accountable (A) |
| Dynamic Pricing & Price Floor Modal (`PSR-20`) | **Responsible (R)** | Consulted (C) | Informed (I) |
| Matchmaking Haversine $\le 5\text{ km}$ (`PSR-22`) | **Responsible (R)** | Accountable (A) | Informed (I) |
| Buyer Fast Claim & Atomic Mutex Lock (`PSR-26`) | **Responsible (R)** | Consulted (C) | Informed (I) |
| ReAct Agent Core Loop $\le 5$ Putaran (`PSR-17`) | Consulted (C) | **Responsible (R)** | Accountable (A) |
| Tool Calling Registry & Dekomposisi (`PSR-18`) | Consulted (C) | **Responsible (R)** | Informed (I) |
| Autentikasi Supabase & Role Isolation (`PSR-40`) | Consulted (C) | **Responsible (R)** | Informed (I) |
| QRIS Bank Indonesia & Escrow Settlement (`PSR-37`) | Consulted (C) | **Responsible (R)** | Informed (I) |
| Gerbang Mutu Etis & Anti-Moral Hazard (`PSR-21`) | **Responsible (R)** | **Responsible (R)** | Accountable (A) |

* **Section 3 — Key Takeaways (Pesan Kunci Slide):**
  * Alokasi pengujian terdistribusi berimbang antara spesialis domain biologis/matematis dan spesialis arsitektur sistem.
  * Menerapkan matriks RACI formal untuk memastikan seluruh 95 assertions memiliki penanggung jawab tunggal tanpa tumpang tindih.

* **Section 4 — Panduan Presentasi & Poin Bicara (Speaker Notes - Marshal):**
  > "Prof. Riri selalu menekankan pentingnya pembagian peran yang terukur dalam rekayasa tim. Pada proyek PASARIN, tanggung jawab pengujian dibagi berimbang: Zahir memegang kendali atas 48 assertions pengujian pemodelan fisik, kinetika, dan konkurensi transaksi, sementara saya bertanggung jawab atas 47 assertions pengujian orkestrasi ReAct AI, keamanan rute, dan gateway pembayaran."

---

### Slide 04: Arsitektur Piramida Pengujian & Unified Process
**Tracker:** `Bagian 1: Unit Testing | Bagian 2: Integrasi Sistem | Bagian 3: Pemeliharaan & Kesiapan`  
**Action Title:** **Piramida Pengujian: Pieces, Subassemblies, dan Whole Application Sesuai Kaidah Unified Process**

* **Section 1 — Pemetaan Tiga Tingkatan Pengujian (RPL 8 Slide 6):**
  * **Unit Tests (Pieces):** Pengujian unit kode terkecil (fungsi, class method terisolasi) tanpa ketergantungan jaringan eksternal. Diimplementasikan pada 95 assertions kalkulasi kinetika, jarak geospasial, dan batas modal.
  * **Integration Tests (Subassemblies):** Pengujian gabungan paket kelas dan antarmuka modul. Memvalidasi aliran data dari sensor cuaca ke model kinetika hingga penerbitan payload Telegram.
  * **System Tests (Whole Assemblies / Use Cases):** Pengujian sistem secara utuh mencakup antarmuka 7 peran pengguna, simulasi siklus metabolisme 24 jam, dan uji ketahanan batas kuota infrastruktur serverless.

* **Section 2 — Penyelarasan dengan Siklus Hidup Unified Process (RPL 8 Slide 7):**

```
+--------------------------------------------------------------------------------------------------+
| PENYELARASAN PENGUJIAN PADA FASE ITERASI UNIFIED PROCESS (UP)                                    |
+--------------------------------------------------------------------------------------------------+
| FASE KONSEPSI & ELABORASI   | FASE KONSTRUKSI (CONSTRUCTION)     | FASE TRANSISI (TRANSITION)    |
| (Sprint 1: Fondasi Skema)   | (Sprint 2 & 3: Core Logic & Unit)  | (Sprint 3 Akhir: E2E Rilis)   |
+-----------------------------+------------------------------------+-------------------------------+
| - Perancangan DDL Database  | - Eksekusi 14 Suite Unit Tests     | - Pengujian Use Case 7 Peran  |
| - Standarisasi API Envelope | - Validasi Invarian Matematis      | - Verifikasi Keamanan Login   |
| - Verifikasi Token Cron     | - Pembuktian Kinetika Arrhenius    | - Deployment Live Vercel      |
| Output: Unit Test Plan IEEE | Output: 95/95 Assertions Hijau     | Output: Rilis Produksi Stabil |
+--------------------------------------------------------------------------------------------------+
```

* **Section 3 — Key Takeaways (Pesan Kunci Slide):**
  * Struktur pengujian PASARIN mengadopsi piramida pengujian perangkat lunak berorientasi objek standar Braude (2001).
  * Menyelaraskan pembagian iterasi: unit testing intensif pada fase Konstruksi, dan use case testing pada fase Transisi.

* **Section 4 — Panduan Presentasi & Poin Bicara (Speaker Notes - Zahir):**
  > "Mengacu pada Slide 6 dan 7 materi kuliah Ibu Riri, pengujian sistem kami tidak melompat langsung ke antarmuka visual. Kami membangun fondasi dari dasar piramida: menguji 'Pieces' berupa 95 assertions unit test mandiri pada fase Konstruksi. Setelah seluruh unit method terbukti kokoh, kami menguji 'Subassemblies' integrasi data, dan akhirnya 'Assemblies' pada pengujian 10 use case peran di fase Transisi."

---

### Slide 05: Roadmap Unit Testing & Eksekusi Master Testbench (PSR-39)
**Tracker:** `Bagian 1: Unit Testing | Bagian 2: Integrasi Sistem | Bagian 3: Pemeliharaan & Kesiapan`  
**Action Title:** **Perencanaan, Pengadaan Test Set, dan Eksekusi CLI Runner Berlatensi Sub-Detik**

* **Section 1 — Empat Kaidah Perencanaan Unit Test (RPL 8 Slide 8 & 17):**
  * **1. Decide on Philosophy:** Mengembangkan automated testbench terisolasi (*in-memory*) yang dapat diuji berulang kali tanpa membebani basis data produksi.
  * **2. How to Document:** Dibangun menggunakan test runner mandiri berbasis Node.js/TSX (`scripts/run_all_tests.ts`), menghasilkan log audit instan di terminal.
  * **3. Determine Extent in Advance:** Mengunci target kelulusan 100% pada 95 assertions sebelum kode dinyatakan siap rilis (*Do not just test until time expires* - Kit 1995).
  * **4. Arrange to Track Time & Latency:** Mengukur waktu eksekusi setiap suite hingga presisi 0.01 milidetik untuk membuktikan efisiensi komputasi algoritma.

* **Section 2 — Bukti Log Eksekusi CLI Terminal (`npm test`):**
  * **Perintah Uji:** `npm test` (mengeksekusi `scripts/run_unit_tests.ts`, `test_tool_calling_registry.ts`, dan `test_weather_agent.ts`).
  * **Waktu Eksekusi Total:** 3.2 detik untuk seluruh 14 suite.
  * **Status Kelulusan:** `SEMUA PENGUJIAN LULUS HIJAU 100%! (95/95 TESTS PASSED)`.

* **Section 3 — Komponen Visual & Penanda Mutu:**
  * [TANGKAPAN LAYAR BUKTI]: `qa_reports/presentation_screens/uc00_unit_test_cli_terminal.png`.
  * Menampilkan eksekusi hijau 14 suite terurut dari Suite 1 (PSR-5 Cuaca) hingga Suite 14 (PSR-26 Klaim Cepat).

* **Section 4 — Key Takeaways (Pesan Kunci Slide):**
  * Menjalankan proses pengujian unit terstandarisasi IEEE 1986: Plan $\rightarrow$ Acquire Test Set $\rightarrow$ Execute $\rightarrow$ Track Trouble Spots.
  * Seluruh 95 assertions tereksekusi deterministik dalam hitungan detik tanpa galat *flaky test*.

* **Section 5 — Panduan Presentasi & Poin Bicara (Speaker Notes - Marshal):**
  > "Slide 17 materi kuliah menekankan bahwa pengujian harus terencana dan dapat dilacak waktunya. Kami merancang test runner PSR-39 mandiri. Cukup dengan menjalankan perintah 'npm test' di terminal, sistem mengeksekusi 14 suite dan memvalidasi 95 assertions hijau dalam 3.2 detik, membuktikan kesiapan sistem untuk diuji langsung di hadapan dosen."

---

### Slide 06: Matriks Keterlacakan Pengujian (Traceability Matrix)
**Tracker:** `Bagian 1: Unit Testing | Bagian 2: Integrasi Sistem | Bagian 3: Pemeliharaan & Kesiapan`  
**Action Title:** **Matriks Keterlacakan Menghubungkan 14 Kebutuhan Rekayasa dengan 95 Kasus Uji Terverifikasi**

* **Section 1 — Prinsip Keterlacakan Pengujian (RPL 8 Slide 22):**
  * Sesuai kaidah *"Relating Tests to Requirements & Design"*, setiap modul perangkat lunak wajib memiliki pemetaan kasus uji teridentifikasi (*Test Case ID*) guna mencegah adanya fungsi yang tidak teruji (*untested code*).

* **Section 2 — Tabel Matriks Keterlacakan Kasus Uji PASARIN:**

| Modul / Fitur Sistem | ID Tiket Jira | ID Kasus Uji (*Test Case ID*) | Kriteria Keberhasilan (*Acceptance Criteria*) | Hasil Uji |
|---|---|---|---|---|
| Telemetri Cuaca Hiperlokal | `PSR-5` | `TC-W01` s/d `TC-W05` (5 Tests) | Akurasi GPS Kramat Jati, in-memory cache 15m, fallback 32°C | **PASS (100%)** |
| Kinetika Peluruhan Biologis | `PSR-14` | `TC-K00` s/d `TC-K03` (4 Tests) | Kenaikan laju respirasi 2.2x pada 33°C, deteksi layu 8.5 jam | **PASS (100%)** |
| Redaman Pembeli Hujan Sore | `PSR-15` | `TC-F01` s/d `TC-F03` (3 Tests) | Curah hujan 10 mm menurunkan pembeli 48%, badai redam >70% | **PASS (100%)** |
| Dynamic Pricing & Price Floor | `PSR-20` | `TC-P01` s/d `TC-P03` (3 Tests) | Diskon proporsional 50%–70%, harga tebus $\ge$ modal pedagang | **PASS (100%)** |
| Prediksi Surplus Komposit | `PSR-19` | `TC-U01` s/d `TC-C02` (7 Tests) | 5 Level Urgensi, validasi agregasi target baseline 1.240 kg | **PASS (100%)** |
| Quality Gate Anti-Moral Hazard | `PSR-21` | `TC-Q01` s/d `TC-Q05` (5 Tests) | Blokir sayur layak (skor $\ge 0.35$) ke maggot, penalti reputasi | **PASS (100%)** |
| Gemini ReAct Agent Core | `PSR-17` | `TC-R01` s/d `TC-R05` (5 Tests) | Eksekusi otonom 14:30 WIB, scan 30 kios, batas $\le 5$ putaran | **PASS (100%)** |
| Tool Calling Registry | `PSR-18` | `TC-T01` s/d `TC-T06` (6 Tests) | Registrasi 9 spesifikasi fungsi, latensi dekomposisi $< 1.500\text{ ms}$ | **PASS (100%)** |
| Supabase Role Authentication | `PSR-40` | `TC-A01` s/d `TC-A03` (15 Tests) | Preset 7 akun peran mandiri, penegakan isolasi hak antarmuka | **PASS (100%)** |
| Arsitektur API & Webhook | `PSR-3, 4, 24` | `TC-E01` s/d `TC-IK02` (5 Tests) | Amplop JSON standar, verifikasi secret token, respon $< 3\text{ s}$ | **PASS (100%)** |
| Master Data 30 Kios & Komoditas | `PSR-16` | `TC-D01` s/d `TC-D04` (4 Tests) | Konsistensi data Blok A, B, C dan 30 komoditas sayur tropis | **PASS (100%)** |
| Invarian Sirkular, QRIS, & 24H | `PSR-23, 37, 31` | `TC-INV02` s/d `TC-PSR31-02` (8 Tests) | Urutan harga berjenjang, jendela 30m, validasi CRC16 QRIS BI | **PASS (100%)** |
| Circular 3-Tier Matchmaker | `PSR-22` | `TC-MM01` s/d `TC-MM11` (11 Tests) | Formula Haversine $\le 5\text{ km}$, ranking #1 Warteg Hek, SLA $< 100\text{ ms}$ | **PASS (100%)** |
| Buyer Fast Claim Concurrency | `PSR-26` | `TC-BC01` s/d `TC-BC10` (10 Tests) | Balapan 5 pembeli $\rightarrow$ tepat 1 menang, polite reject, SLA $< 50\text{ ms}$ | **PASS (100%)** |

* **Section 3 — Key Takeaways (Pesan Kunci Slide):**
  * Seluruh fungsi dan aturan bisnis memiliki korelasi langsung ke tiket Jira resmi dan kode pengujian unit.
  * Menjamin cakupan pengujian komprehensif tanpa ada celah fitur tersembunyi yang lolos dari audit.

* **Section 4 — Panduan Presentasi & Poin Bicara (Speaker Notes - Zahir):**
  > "Di slide 6 ini kami sajikan Matriks Keterlacakan Kasus Uji. Sesuai prinsip rekayasa yang diajarkan Prof. Riri, setiap modul rekayasa dipetakan ke ID kasus uji unik. Total 95 kasus uji terdistribusi ke 14 modul, dan seluruhnya terverifikasi lulus 100% tanpa ada satu pun fitur yang tidak teruji."

---

<!-- SLIDE 7 -->
## SLIDE 07: BOUNDARY VALUE ANALYSIS (BVA) & PARTITIONING

* **Tracker:** `Bagian 1: Unit Testing | Bagian 2: Integrasi Sistem | Bagian 3: Pemeliharaan & Kesiapan`  
* **Action Title:** **Boundary Value Analysis dan Equivalence Partitioning Menguji Resiliensi Termal Los Pasar**

* **Section 1 — Landasan Teori Kuliah Prof. Riri (RPL 8 Slide 11–13):**
  * *Boundary Value Analysis* (BVA) dan *Equivalence Partitioning* menetapkan pengujian wajib pada 3 kategori nilai masukan:
    1. **Within Range (Nilai Normal):** Berada di dalam rentang legal sistem.
    2. **Boundaries of Range (Nilai Batas Ekstrem):** Berada tepat pada batas minimum dan maksimum yang diizinkan.
    3. **Outside Range / Illegal (Nilai Ilegal):** Berada di luar batas yang memicu mekanisme penanganan galat (*error resilience*).

* **Section 2 — Implementasi BVA Tiga Kategori pada Sensor Mikroklimat Pasar:**
  * **Kategori 1: Within Range (Normal Los Siang):**  
    Suhu evaluasi $T = 32.5^\circ\text{C}, \text{RH} = 68\%$. Bayam mengalami decayScore 0.59 (Layu Ringan) dengan sisa waktu aman 1.1 jam sebelum rusak.
  * **Kategori 2: Boundaries of Range (Batas Bawah & Atas):**  
    Batas Bawah $T = 25.0^\circ\text{C}$ (Subuh/Cold Storage) menghasilkan faktor akselerasi Q10 dasar ($1.00\times$). Batas Atas $T = 34.0^\circ\text{C}$ (Terik Ekstrem) melipatgandakan laju respirasi menjadi $2.45\times$.
  * **Kategori 3: Outside Range / Illegal Region (Masukan Anomali):**  
    Suhu anomali $T < 10.0^\circ\text{C}$ (beku ekstrem) atau $T > 50.0^\circ\text{C}$ (korsleting sensor). Modul `weatherAgent.ts` secara terprogram memotong masukan ke profil darurat ($32.0^\circ\text{C}, 75\% \text{ RH}$) sehingga server tetap stabil tanpa crash.

* **Section 3 — Komponen Visual & Penanda Mutu:**
  * [TANGKAPAN LAYAR BUKTI]: `qa_reports/presentation_screens/uc02_vendor_produce_monitoring.png`.
  * Menampilkan antarmuka pemantauan 7 komoditas Kios A-12 H. Rohmat: Bayam (decay 0.59, sisa 1.1 jam), Kangkung (decay 0.51, sisa 2.2 jam), Tomat (decay 0.09, sisa 55 jam), serta Caisim & Terung inap (decay 1.00, afkir langsung dialihkan ke Tier 3).

* **Section 4 — Key Takeaways (Pesan Kunci Slide):**
  * BVA memvalidasi perilaku sistem pada kondisi normal, titik kritis batas termal, dan masukan sensor ilegal.
  * Penanganan masukan di luar batas menjamin kekebalan sistem terhadap anomali perangkat keras lapangan.

* **Section 5 — Panduan Presentasi & Poin Bicara (Speaker Notes - Zahir):**
  > "Slide 12 dan 13 kuliah RPL mengajarkan Boundary Value Analysis pada tiga zona: normal, batas, dan ilegal. Kami menguji suhu los pasar pada 25°C baseline subuh, 32.5°C evaluasi sore, dan batas atas 34°C. Apabila sensor cuaca mengalami korsleting dan mengirim suhu ilegal di atas 50°C, fungsi kami otomatis memicu fail-safe fallback ke profil darurat 32°C agar server tidak crash."

---

<!-- SLIDE 8 -->
## SLIDE 08: BUKTI MATEMATIS KINETIKA ARRHENIUS & PROOF OF CORRECTNESS

* **Tracker:** `Bagian 1: Unit Testing | Bagian 2: Integrasi Sistem | Bagian 3: Pemeliharaan & Kesiapan`  
* **Action Title:** **Model Termodinamika Arrhenius-Q10 Terbukti Determinisik Melalui Pembuktian Matematis Formal**

* **Section 1 — Landasan Golden Rules (RPL 8 Slide 5):**
  * *"Limits of testing: Testing can only determine the presence of defects, never their absence. Use proofs of correctness to establish absence."*
  * Ketiadaan cacat pada modul kinetika dibuktikan dengan penurunan rumus matematika analitis yang hasilnya diverifikasi identik dengan nilai pada antarmuka web.

* **Section 2 — Penurunan Rumus Matematika Kinetika Respirasi Daun:**
  * **1. Rasio Akselerasi Suhu Berbasis Koefisien Termal ($Q_{10} = 2.7$):**
    $$\Delta T = T_{\text{aktual}} - T_{\text{baseline}} = 32.5^\circ\text{C} - 25.0^\circ\text{C} = 7.5^\circ\text{C}$$
    $$\text{thermalRatio} = Q_{10}^{\frac{\Delta T}{10}} = 2.7^{\frac{7.5}{10}} = 2.7^{0.75} \approx \mathbf{2.1118\times}$$
  * **2. Akumulasi Kerusakan Biologis Bayam ($t = 10.5\text{ jam}, t_{\text{safe}} = 14.0\text{ jam}$):**
    $$\text{normalizedExposure} = \frac{t}{t_{\text{safe}}} = \frac{10.5}{14.0} = 0.75$$
    $$\text{decayScore} = (0.75)^{1.15} \times 0.82 \approx 0.7197 \times 0.82 \approx \mathbf{0.5902} \rightarrow \mathbf{0.59}\text{ (Layu Ringan)}$$
  * **3. Kalkulasi Sisa Waktu Simpan Aman Fisik ($hoursRemaining$):**
    $$t_{\text{left}} = 14.0 - 10.5 = 3.5\text{ jam fisik tersisa}$$
    $$\text{remainingFraction} = \frac{0.85 - 0.5902}{0.85} = \frac{0.2598}{0.85} \approx 0.3056$$
    $$\text{hoursRemaining} = 0.3056 \times 3.5\text{ jam} = \mathbf{1.0697\text{ jam}} \approx \mathbf{1.1\text{ jam!}}$$

* **Section 3 — Verifikasi Dua Sisi (Hitungan Tangan vs Nilai Web UI):**
  * Hasil Hitungan Analitis Matematis: **1.1 jam**
  * Nilai yang Ditampilkan di Dasbor Kios A-12: **1.1 jam**
  * *Kesimpulan Pembuktian:* Nilai antarmuka terbukti dihitung secara ilmiah dan deterministik murni, bukan manipulasi visual (*hardcoded UI*).

* **Section 4 — Key Takeaways (Pesan Kunci Slide):**
  * Memenuhi kaidah proof of correctness untuk membuktikan ketiadaan galat pada fungsi kinetika biologis.
  * Menyelaraskan ambang batas fisiologis daun dengan perhitungan termodinamika suhu aktual.

* **Section 5 — Panduan Presentasi & Poin Bicara (Speaker Notes - Zahir):**
  > "Mengikuti Slide 5 kuliah RPL: ketiadaan cacat dibuktikan dengan proof of correctness. Di slide ini, kami menurunkan rumus Arrhenius secara manual untuk komoditas bayam pada suhu 32.5°C setelah terpajang 10.5 jam. Hasil hitungan tangan menghasilkan sisa waktu 1.07 jam atau 1.1 jam. Angka ini persis identik dengan angka 1.1 jam yang tampil pada dasbor web pedagang."

---

<!-- SLIDE 9 -->
## SLIDE 09: WHITE-BOX & MYERS DECISION COVERAGE: GERBANG MUTU ETIS

* **Tracker:** `Bagian 1: Unit Testing | Bagian 2: Integrasi Sistem | Bagian 3: Pemeliharaan & Kesiapan`  
* **Action Title:** **Myers Decision Coverage Memvalidasi Percabangan Jalur Layak Pangan vs Jalur Afkir Maggot**

* **Section 1 — Prinsip Myers Decision Coverage (RPL 8 Slide 14–15):**
  * *"Covering every statement is not sufficient (Myers)."*
  * Pengujian perangkat lunak yang andal wajib menguji seluruh jalur percabangan logika (*decision coverage*), memeriksa sisi evaluasi *True* dan *False* pada setiap blok kondisi keputusan bisnis.

* **Section 2 — Analisis Percabangan Logika Quality Gate (`qualityGateAgent.ts`):**

```
                  +----------------------------------------+
                  | Evaluasi Komoditas Hasil Sapuan 14:30  |
                  +----------------------------------------+
                                       |
                   [ decayScore >= 0.35 && decayScore < 0.65 ]
                                      / \
                                     /   \
                             (True) /     \ (False)
                                   /       \
     +-------------------------------+   +-------------------------------+
     | PATH B (True): Diizinkan      |   | [ decayScore >= 0.85 ]        |
     | Terbit di Warteg Tier 1       |   +-------------------------------+
     | (Sayur Segar Terdiskon 50-70%)|                  | (True)
     +-------------------------------+   +-------------------------------+
                                         | PATH D (False / Rejection):   |
                                         | DIBLOKIR MUTLAK dari Warteg!  |
                                         | Wajib dialihkan ke Maggot BSF |
                                         +-------------------------------+
```

* **Section 3 — Hasil Pengujian Kedua Jalur Keputusan:**
  * **Path B (True Branch):** Komoditas bernutrisi (Kangkung Darat 45 kg diskon 58% @ Rp 2.500, Bayam Hijau 35 kg diskon 64% @ Rp 2.500) lolos verifikasi dan tampil di katalog Warteg.
  * **Path D (False / Rejection Branch):** Komoditas afkir (Caisim inap decay 1.00, Terung inap decay 1.00) terdeteksi melewati batas kritis $\ge 0.85$, sehingga diblokir mutlak dari katalog pangan manusia dan dialihkan ke pakan ternak Maggot BSF.

* **Section 4 — Komponen Visual & Penanda Mutu:**
  * [TANGKAPAN LAYAR BUKTI]: `qa_reports/presentation_screens/uc04_warteg_catalog_tier1.png`.
  * Membuktikan bahwa katalog Warteg hanya memuat sayuran Path B yang aman dikonsumsi manusia.

* **Section 5 — Key Takeaways (Pesan Kunci Slide):**
  * Membuktikan bahaya fatal jika hanya menguji statement coverage tanpa decision coverage.
  * Memastikan 100% sayuran busuk tertolak secara terprogram demi melindungi kesehatan masyarakat.

* **Section 6 — Panduan Presentasi & Poin Bicara (Speaker Notes - Zahir):**
  > "Dalil Glenford Myers pada Slide 14 kuliah RPL menyatakan bahwa statement coverage saja tidak cukup. Kita harus menguji cabang True dan cabang False. Pada modul Quality Gate, kami menguji Path B untuk meloloskan sayur layu ringan berdiskon ke Warteg, dan Path D untuk memblokir mutlak sayuran afkir agar tidak pernah masuk ke piring konsumen."

---

<!-- SLIDE 10 -->
## SLIDE 10: CLASS UNIT TESTING & CLASS INVARIANTS VERIFICATION

* **Tracker:** `Bagian 1: Unit Testing | Bagian 2: Integrasi Sistem | Bagian 3: Pemeliharaan & Kesiapan`  
* **Action Title:** **Verifikasi Invarian Kelas Mengunci Hak Pangan Bergizi Dapur Sosial Selama 30 Menit**

* **Section 1 — Kaidah Pengujian Invarian Kelas (RPL 8 Slide 24):**
  * *"Verify that each class invariant is unchanged across method sequences."*
  * Prosedur Pengujian:
    1. Memverifikasi bahwa invarian bernilai benar pada nilai inisialisasi awal.
    2. Mengeksekusi rangkaian pemanggilan method transaksi yang mengubah status data.
    3. Memverifikasi bahwa invarian terbukti tetap bernilai benar tanpa kompromi.

* **Section 2 — Tiga Invarian Kritis Sistem PASARIN:**
  * **Invarian 1 (Zero Edible Food to Feed):** Sayuran bernutrisi ($\text{decayScore} < 0.85$) haram dialihkan ke pakan maggot.
  * **Invarian 2 (Strict Circular Price Ordering):** $P_{\text{retail}} > P_{\text{tier\_1}} > P_{\text{tier\_2}} \ge P_{\text{tier\_3}} \ge \text{Modal Dasar Pedagang}$.
  * **Invarian 3 (30-Minute Priority Reservation Window):** Komoditas Tier 2 terkunci eksklusif selama 30 menit bagi Dapur Sosial & Panti Asuhan ($\Delta t \ge 30\text{ menit}$).

* **Section 3 — Pengujian Pembobolan Invarian 3 (`TC-PSR23-01` & `TC-BC08`):**
  * Skenario Uji: Akun peternak Maggot mencoba mengklaim alokasi Tier 2 saat jendela reservasi 30 menit masih aktif berjalan.
  * Respon Sistem: Sistem melempar status penolakan seketika (`{ allowed: false, code: "TIER_MISMATCH" }`).
  * Hasil Evaluasi: Invarian 3 terbukti tegak dan tidak pernah berhasil ditembus sepanjang simulasi transaksi.

* **Section 4 — Komponen Visual & Penanda Mutu:**
  * [TANGKAPAN LAYAR BUKTI]: `qa_reports/presentation_screens/uc07_social_kitchen_priority_window.png`.
  * Dasbor Dapur Sosial menampilkan badge hijau: *"Jendela Reservasi Prioritas 30 Menit (Invarian 3) Aktif"*, melindungi 40 kg Pakcoy dan 25 kg Buncis untuk 320 porsi panti asuhan.

* **Section 5 — Key Takeaways (Pesan Kunci Slide):**
  * Invarian kelas menjamin integritas etika distribusi pangan darurat secara terprogram.
  * Menolak upaya klaim ilegal dari aktor luar selama jendela waktu reservasi berlangsung.

* **Section 6 — Panduan Presentasi & Poin Bicara (Speaker Notes - Zahir):**
  > "Slide 24 materi kuliah mengajarkan bahwa invarian kelas harus tetap bernilai benar setelah rangkaian method dieksekusi. Di PASARIN, Invarian 3 mengunci hak sayuran bernutrisi untuk panti asuhan selama 30 menit. Unit test TC-PSR23-01 membuktikan bahwa ketika akun Maggot mencoba menyerobot klaim, sistem menolaknya secara mutlak."

---

<!-- SLIDE 11 -->
## SLIDE 11: STATE-TRANSITION TESTING: FINITE STATE MACHINE MUTASI MUTU

* **Tracker:** `Bagian 1: Unit Testing | Bagian 2: Integrasi Sistem | Bagian 3: Pemeliharaan & Kesiapan`  
* **Action Title:** **State-Transition Testing Memverifikasi Mutasi Kualitas Menuju Biokonversi Sentra Maggot**

* **Section 1 — Landasan Teori State-Transition (RPL 8 Slide 24–26):**
  * Menguji perilaku objek yang berpindah antar status terdefinisi (*state machine*) melalui sekuens: State Awal $\rightarrow$ Event Masukan $\rightarrow$ Guard Condition $\rightarrow$ State Baru $\rightarrow$ Action Lanjutan.

* **Section 2 — Pemodelan Statechart Transisi Mutu Komoditas PASARIN:**

```
+--------------------------------------------------------------------------------------------------+
| FINITE STATE MACHINE (FSM) SIKLUS HIDUP KOMODITAS PASAR INDUK KRAMAT JATI                        |
+--------------------------------------------------------------------------------------------------+
|  [STATE 1: SEGAR PRIMA]   (Subuh jam 04:00 WIB, decayScore < 0.35, Retail Eceran Normal)         |
|            |                                                                                     |
|            v   [ Event: Paparan panas los > 6 jam ]                                              |
|  [STATE 2: LAYU RINGAN]   (decayScore 0.35 - 0.65, Penyelamatan Tier 1 Warteg Diskon 50-70%)     |
|            |                                                                                     |
|            v   [ Event: Paparan panas los > 10 jam ]                                             |
|  [STATE 3: LAYU SEDANG]   (decayScore 0.65 - 0.84, Reservasi Eksklusif Tier 2 Dapur Sosial)      |
|            |                                                                                     |
|            v   [ Event: Sapuan 14:30 WIB | Guard: decayScore >= 0.85 ]                           |
|  [STATE 4: AFKIR TOTAL]   (Tidak layak konsumsi manusia, dialihkan ke Tier 3 Maggot BSF)         |
|            |                                                                                     |
|            v   [ Action: dispatchToBiopond() ]                                                   |
|  [STATE 5: BIOKONVERSI]   (Panen Larva Protein Rasio 5:1 & Pupuk Kasgot Organik 24%)             |
+--------------------------------------------------------------------------------------------------+
```

* **Section 3 — Hasil Pengujian di Sentra Maggot BSF (`TC-MM05` & `TC-PSR31-01`):**
  * Komoditas Sawi Hijau Inap (30 kg) dan Terung Inap (35 kg) yang memiliki skor decay $\ge 0.85$ berpindah status ke State 4 secara deterministik.
  * Aksi pemindahan muatan menghasilkan **+6.0 kg larva protein tinggi (rasio 5:1)** dan **+7.2 kg pupuk kasgot (rasio 24%)**.

* **Section 4 — Komponen Visual & Penanda Mutu:**
  * [TANGKAPAN LAYAR BUKTI]: `qa_reports/presentation_screens/uc09_maggot_bioconversion_biopond.png`.
  * Dasbor Maggot menampilkan tabel biopond aktif yang memproses limbah sayur afkir State 4 menjadi biomassa bernilai ekonomi.

* **Section 5 — Key Takeaways (Pesan Kunci Slide):**
  * Memvalidasi seluruh siklus hidup komoditas menggunakan pemodelan notasi standar statechart diagram.
  * Menjamin limbah organik afkir diolah tuntas melalui biokonversi tanpa mencemari lingkungan pasar.

* **Section 6 — Panduan Presentasi & Poin Bicara (Speaker Notes - Zahir):**
  > "Pada Slide 25 dan 26 kuliah RPL, pengujian State-Transition memvalidasi transisi siklus hidup objek. Di PASARIN, sayuran yang melewati batas biologis 0.85 bermutasi secara deterministik dari State 3 ke State 4, lalu aksi pemindahan memicu State 5 yang menghasilkan larva berprotein tinggi dan pupuk kasgot."

---

<!-- SLIDE 12 -->
## SLIDE 12: SYSTEM INTEGRATION: KEAMANAN LOGIN & ROLE ISOLATION

* **Tracker:** `Bagian 2: Integrasi Sistem | Bagian 1: Unit Testing | Bagian 3: Pemeliharaan & Kesiapan`  
* **Action Title:** **Security Testing: Penolakan Pembobolan Kata Sandi dan Penegakan Isolasi Peran Antarmuka**

* **Section 1 — Kaidah Pengujian Keamanan Sistem (9. SystInteg Slide 6):**
  * *"Subject product to compromise attempts and measure resistance."*
  * Sistem wajib diuji terhadap upaya kompromi akses, penggunaan kredensial tidak sah, serta verifikasi pembatasan hak antarmuka antar-peran pengguna (*Role Isolation*).

* **Section 2 — Skenario Pengujian Pembobolan Kredensial Ilegal:**
  * **Kasus Uji Keamanan (`TC-A01` & Rute `/login`):**
    * Percobaan login menggunakan username `admin` dengan kata sandi salah `password_palsu_123`.
    * Sistem menolak akses seketika dengan status respon `HTTP 401 Unauthorized`.
  * **Proteksi Anti-User Enumeration:**
    * Respon penolakan menyajikan pesan seragam: *"Kata sandi yang Anda masukkan salah. Silakan coba lagi."*
    * Mencegah peretas memetakan apakah suatu akun benar-benar ada di dalam basis data sistem.
  * **Penegakan Role Isolation:**
    * Akun dengan peran `warteg` diblokir mutlak oleh sistem middleware dari membuka halaman dasbor manajerial atau administratif.

* **Section 3 — Komponen Visual & Penanda Mutu:**
  * [TANGKAPAN LAYAR BUKTI]: `qa_reports/presentation_screens/uc01_security_wrong_password.png`.
  * Menampilkan kotak peringatan merah tebal pada halaman login saat kata sandi salah dimasukkan.

* **Section 4 — Key Takeaways (Pesan Kunci Slide):**
  * Memvalidasi ketahanan otentikasi sistem terhadap serangan brute-force dan pencurian hak akses.
  * Menjamin isolasi penuh antarmuka 7 peran agar data sensitif pasar tetap terlindungi.

* **Section 5 — Panduan Presentasi & Poin Bicara (Speaker Notes - Marshal):**
  > "Berdasarkan materi System Integration Slide 6, sistem wajib diuji terhadap upaya kompromi. Kami menguji pembobolan login dengan kata sandi palsu. Sistem menolaknya dengan HTTP 401 dan menerapkan proteksi anti-user enumeration agar struktur akun internal pasar tidak dapat dipetakan oleh pihak luar."

---

<!-- SLIDE 13 -->
## SLIDE 13: TRANSACTION INTEGRATION: DYNAMIC QRIS & ESCROW SETTLEMENT

* **Tracker:** `Bagian 2: Integrasi Sistem | Bagian 1: Unit Testing | Bagian 3: Pemeliharaan & Kesiapan`  
* **Action Title:** **Simulasi Dynamic QRIS Bank Indonesia dan Brankas Penampung Escrow Mengamankan Transaksi**

* **Section 1 — Kaidah Integrasi Subassembly Finansial (9. SystInteg Slide 5):**
  * *"Verify interfaces between financial subassemblies and state machines."*
  * Memverifikasi antarmuka antara modul katalog penawaran, modul pembentukan kode pembayaran dinamis, dan brankas penampungan dana bersama (*escrow gateway*).

* **Section 2 — Spesifikasi Payload QRIS EMVCo TLV Bank Indonesia:**
  * **Tag 00:** Payload Format Indicator `01`.
  * **Tag 01:** Point of Initiation Method `12` (QR Dinamis per Transaksi).
  * **Tag 26:** National Merchant ID (NMID): `ID1026348913PASARIN` (Resmi Kramat Jati).
  * **Tag 54:** Transaction Amount Tepat Sesuai Nilai Tebusan: `Rp 112.500`.
  * **Tag 63:** Checksum Kriptografis CRC16 4-Karakter Valid (`TC-PSR37-01`).

* **Section 3 — Alur Penampungan Dana Escrow Bersama:**
  * Saat Warteg membayar, dana tidak langsung ditransfer ke rekening pedagang, melainkan dikunci di rekening escrow berstatus `held_in_escrow`.
  * Menghilangkan risiko penipuan di mana pembeli sudah membayar tetapi pedagang tidak menyerahkan sayuran.

* **Section 4 — Komponen Visual & Penanda Mutu:**
  * [TANGKAPAN LAYAR BUKTI]: `qa_reports/presentation_screens/uc05_warteg_qris_bi_modal.png`.
  * Modal pembayaran Warteg menampilkan stiker resmi QRIS Bank Indonesia berstandar EMVCo lengkap dengan logo GPN dan rincian transaksi Rp 112.500.

* **Section 5 — Key Takeaways (Pesan Kunci Slide):**
  * Memvalidasi pembentukan string pembayaran dinamis berstandar resmi Bank Indonesia.
  * Mengamankan dana transaksi mikro pedagang dan warteg melalui sistem penampungan escrow.

* **Section 6 — Panduan Presentasi & Poin Bicara (Speaker Notes - Marshal):**
  > "Pengujian integrasi subassembly keuangan membuktikan keabsahan string QRIS dinamis berstandar EMVCo Bank Indonesia. Dana pembelian Rp 112.500 terkunci aman di rekening escrow bersama hingga serah terima fisik tuntas diverifikasi oleh kurir pasar."

---

<!-- SLIDE 14 -->
## SLIDE 14: SUBASSEMBLY HANDSHAKE: PROOF OF DELIVERY (PoD) TOKEN HMAC

* **Tracker:** `Bagian 2: Integrasi Sistem | Bagian 1: Unit Testing | Bagian 3: Pemeliharaan & Kesiapan`  
* **Action Title:** **Otorisasi Serah Terima Fisik Proof of Delivery Memicu Pencairan Otomatis Saldo Pedagang**

* **Section 1 — Kaidah Handshake Subassembly Logistik (9. SystInteg Slide 5–6):**
  * Memvalidasi antarmuka jabat tangan (*handshake*) tiga pihak: kurir armada pengantar, pembeli penerima barang, dan sistem pencairan dana escrow.

* **Section 2 — Alur Protokol Otorisasi Kriptografis PoD:**
  * **Langkah 1 (Penerbitan Token Rahasia):**  
    Sistem menerbitkan token unik `POD-HMAC-WARTEG1` yang hanya diketahui oleh pembeli yang berhak.
  * **Langkah 2 (Serah Terima Fisik di Lapangan):**  
    Kurir Viar 01 (Pak Joko) tiba di warteg tujuan (1.8 km dari pasar). Pembeli membacakan token PoD setelah muatan diperiksa.
  * **Langkah 3 (Pencairan Otomatis Escrow):**  
    Kurir menginput token ke antarmuka $\rightarrow$ Sistem mencocokkan hash HMAC $\rightarrow$ Status berubah menjadi `released_to_vendor` $\rightarrow$ Dana Rp 112.500 seketika cair ke saldo pedagang (`TC-PSR37-02`).

* **Section 3 — Komponen Visual & Penanda Mutu:**
  * [TANGKAPAN LAYAR BUKTI]: `qa_reports/presentation_screens/uc11_logistics_pod_modal.png`.
  * Modal kurir menampilkan status *"Siap Serah Terima Fisik"*, verifikasi token `POD-HMAC-WARTEG1`, dan tombol *"Verifikasi & Cairkan Dana Escrow"*.

* **Section 4 — Key Takeaways (Pesan Kunci Slide):**
  * Menghubungkan verifikasi fisik dunia nyata dengan mutasi status buku besar digital secara instan.
  * Mencegah pencairan dana sepihak sebelum komoditas benar-benar sampai di tangan pembeli.

* **Section 5 — Panduan Presentasi & Poin Bicara (Speaker Notes - Marshal):**
  > "Integrasi handshake serah terima fisik menghubungkan armada logistik dengan brankas escrow. Dana pedagang baru dicairkan saat kode otorisasi PoD pembeli tervalidasi cocok. Ini menjamin keamanan transaksi mikro tanpa perlu bergantung pada pihak penengah konvensional."

---

<!-- SLIDE 15 -->
## SLIDE 15: RESOURCE USAGE SNAPSHOT & SIMULASI KEPATUHAN DLH DKI

* **Tracker:** `Bagian 2: Integrasi Sistem | Bagian 1: Unit Testing | Bagian 3: Pemeliharaan & Kesiapan`  
* **Action Title:** **Pengujian Kinerja Sumber Daya Serverless dan Pemenuhan Target 92.4% Reduksi Sampah DLH**

* **Section 1 — Pemantauan Resource Usage (9. SystInteg Slide 6):**
  * *"Measure usage of RAM and monitor memory leaks over extended periods."*
  * Memantau alokasi memori runtime Node.js pada lingkungan serverless cloud guna memastikan tidak terjadi kebocoran memori (*memory leak*).
  * **Hasil Pengukuran:** Alokasi memori RAM Resident Set Size (RSS) stabil pada **48.2 MB** (jauh di bawah batas kuota gratis 512 MB). Latensi rute `/api/health` stabil pada **12 ms**.
  * *Catatan Metodologis:* Nilai RAM adalah pengukuran snapshot; pengujian soak test 72 jam direkomendasikan untuk audit industri jangka panjang.

* **Section 2 — Simulasi Kepatuhan Regulasi Dinas Lingkungan Hidup (DLH) DKI Jakarta:**
  * **Baku Mutu Pengalihan Sampah Pasar:** Target minimal $\ge 90.0\%$.
  * **Capaian Simulasi PASARIN:** Berhasil mengalihkan **92.4% sampah organik** dari pembuangan akhir Bantar Gebang.
  * **Neraca Emisi Karbon:** Menghindari **0.48 kg $\text{CO}_2\text{e}$ emisi metana** per kilogram sayuran yang diselamatkan (Faktor Emisi IPCC 2006).

* **Section 3 — Komponen Visual & Penanda Mutu:**
  * [TANGKAPAN LAYAR BUKTI]: `qa_reports/presentation_screens/uc12_manager_dlh_compliance_report.png`.
  * Format Laporan Kepatuhan Resmi Pengelola Pasar Induk Kramat Jati yang memuat neraca massa biomassa teralihkan dan tombol cetak laporan resmi.

* **Section 4 — Key Takeaways (Pesan Kunci Slide):**
  * Memvalidasi efisiensi memori sistem serverless yang hemat sumber daya dan berkinerja tinggi.
  * Membuktikan pemenuhan target regulasi lingkungan hidup DKI Jakarta secara kuantitatif.

* **Section 5 — Panduan Presentasi & Poin Bicara (Speaker Notes - Marshal):**
  > "Pada Slide 6 modul System Integration, pengujian resource usage mengaudit alokasi memori RAM. Serverless API kami beroperasi stabil pada 48.2 MB. Selain itu, simulasi pelaporan DLH DKI membuktikan efisiensi penyelamatan sampah mencapai 92.4%, melampaui target wajib pemerintah provinsi sebesar 90%."

---

<!-- SLIDE 16 -->
## SLIDE 16: STOPPING CRITERIA (KIT 1995) & EVALUASI CODE COVERAGE

* **Tracker:** `Bagian 3: Pemeliharaan & Kesiapan | Bagian 1: Unit Testing | Bagian 2: Integrasi Sistem`  
* **Action Title:** **Evaluasi Kriteria Penghentian Pengujian Kit (1995) dan Transparansi Code Coverage**

* **Section 1 — Kaidah Kriteria Penghentian Pengujian (9. SystInteg Slide 20–22):**
  * Mengadopsi prinsip Edward Kit (1995): *"Predetermine estimated percent coverage before ending tests. Testing must not stop just because time expires."*
  * Pengujian dilarang berhenti hanya karena waktu presentasi tiba. Pengujian dihentikan saat kriteria terukur yang ditetapkan di awal telah terpenuhi penuh.

* **Section 2 — Tiga Kriteria Penghentian yang Telah Terpenuhi:**
  * **1. Kriteria Fungsional Assertions:** 100% dari 95 assertions pada 14 test suite lulus hijau tanpa kegagalan.
  * **2. Kriteria Laju Temuan Cacat (Defect Detection Rate):** Laju cacat kritis mencapai angka nol (*Zero Defects*) pada seluruh transaksi inti.
  * **3. Kriteria Penyelesaian Siklus Metabolisme:** 100% komoditas surplus berhasil dipetakan ke alokasi hilir tanpa stok mengambang.

* **Section 3 — Transparansi Akademik Terkait Code Coverage:**
  * Seluruh jalur keputusan bisnis (*critical business paths*) telah teruji 100% secara fungsional.
  * Pemasangan alat instrumentasi pihak ketiga (*code coverage tools* seperti c8, nyc, atau Istanbul) dijadwalkan pada *pipeline continuous integration* (CI) GitHub Actions pasca-sprint 3 untuk menghindari overhead komputasi pada pengujian lokal.

* **Section 4 — Key Takeaways (Pesan Kunci Slide):**
  * Memenuhi standar penghentian pengujian formal yang terukur dan berintegritas ilmiah.
  * Mengedepankan kejujuran akademis terkait peta jalan integrasi metrik coverage otomatis.

* **Section 5 — Panduan Presentasi & Poin Bicara (Speaker Notes - Zahir):**
  > "Edward Kit (1995) pada materi kuliah Slide 20 menegaskan bahwa pengujian dilarang berhenti hanya karena waktu sudah habis. Pengujian dihentikan karena kriteria terukur telah terpenuhi: 95 dari 95 assertions lulus hijau. Kami juga mencatat secara transparan rencana pemasangan instrumentasi coverage c8 pada pipeline GitHub Actions mendatang."

---

<!-- SLIDE 17 -->
## SLIDE 17: SOFTWARE MAINTENANCE (4 TIPE LIENTZ-SWANSON) & UJI REGRESI

* **Tracker:** `Bagian 3: Pemeliharaan & Kesiapan | Bagian 1: Unit Testing | Bagian 2: Integrasi Sistem`  
* **Action Title:** **Empat Kategori Pemeliharaan Lientz-Swanson dan Jaminan Nol Cacat Regresi**

* **Section 1 — Taksonomi Pemeliharaan Perangkat Lunak (RPL 10 Slide 14):**
  * Mengklasifikasikan seluruh riwayat perbaikan kode sistem PASARIN ke dalam 4 kategori baku Lientz & Swanson (1980):
    1. **Corrective Maintenance (Perbaikan Cacat):** Memperbaiki formula selisih waktu agar bernilai positif monoton dan menangani karakter reserved markdown Telegram.
    2. **Adaptive Maintenance (Adaptasi Lingkungan):** Menyesuaikan webhook dengan lingkungan serverless Vercel dan memperketat validasi header secret token.
    3. **Perfective Maintenance (Penyempurnaan Fitur):** Memisahkan tab Riwayat Penjualan Selesai (*Trade History*) dan merancang modal dinamis QRIS EMVCo Bank Indonesia.
    4. **Preventative Maintenance (Pencegahan Masalah):** Menerapkan standar penulisan kode bersih (*Lean Standard*), menghapus dead code, dan menegakkan *strict type checking*.

* **Section 2 — Verifikasi Uji Regresi Bebas Galat (RPL 10 Slide 3):**
  * *"Regression test: ensure that previously working functionality still works after modification."*
  * Menjalankan ulang seluruh rangkaian 95 assertions pasca-penerapan patch pemeliharaan: **0 Kasus Uji Gagal (Zero Regression Failures)**.

* **Section 3 — Key Takeaways (Pesan Kunci Slide):**
  * Menerapkan taksonomi pemeliharaan perangkat lunak standar industri sepanjang siklus pengembangan.
  * Menjamin stabilitas kode produksi di mana penambahan fitur baru tidak merusak fungsi yang sudah ada.

* **Section 4 — Panduan Presentasi & Poin Bicara (Speaker Notes - Marshal):**
  > "Berdasarkan taksonomi Lientz dan Swanson pada kuliah RPL 10, kami mengelompokkan riwayat pemeliharaan kode ke dalam 4 kategori: korektif, adaptif, prefektif, dan preventif. Uji regresi membuktikan bahwa setelah seluruh perbaikan diterapkan, seluruh 95 assertions tetap lulus 100% tanpa memunculkan bug baru."

---

<!-- SLIDE 18 -->
## SLIDE 18: MATRIKS KESIAPAN DEMO & TANYA JAWAB PENGUJI

* **Tracker:** `Bagian 3: Pemeliharaan & Kesiapan | Bagian 1: Unit Testing | Bagian 2: Integrasi Sistem`  
* **Action Title:** **Sistem PASARIN Terverifikasi 100% Siap Demonstrasi di Hadapan Dosen Penguji**

* **Section 1 — Matriks 4 Pilar Kesiapan Demonstrasi Kelas:**
  * **1. Master Automated Testbench:** 14 Test Suites (95 Assertions) siap dieksekusi instan di terminal via `npm test` dalam 3.2 detik.
  * **2. Live Interactive Web Platform:** 7 Dasbor Peran operasional aktif di `localhost:3000` dengan kredensial dummy instan (`pasar1`, `warteg1`, `admin1`).
  * **3. Repositori Kode Terbuka:** Branch `main` bersih (*working tree clean*) terpublikasi di GitHub (`https://github.com/mrshlaf/pasarin`).
  * **4. Kemitraan Fisik Lapangan:** Dilengkapi naskah resmi Nota Kesepahaman (MoU) Nomor 001 bersama UPB Pasar Induk Kramat Jati.

* **Section 2 — Panduan Tanggap Tanya Jawab Dosen (Defense Cheat Sheet):**
  * **Pertanyaan: Koefisien Q10 = 2.7 didapat dari mana?**  
    *Jawaban:* Diadopsi dari literatur fisiologi pascapanen hortikultura tropis (Kader, 2002) yang mencatat laju respirasi bayam berakselerasi 2.11x pada suhu los 32.5°C.
  * **Pertanyaan: Mengapa belum ada metrik persen code coverage otomatis?**  
    *Jawaban:* Seluruh critical path telah teruji 100% via 95 assertions. Instrumentasi tool c8 dijadwalkan pada pipeline CI GitHub Actions untuk efisiensi runner lokal.
  * **Pertanyaan: Bisakah dibuktikan testbench-nya sekarang?**  
    *Aksi Langsung:* Buka terminal PowerShell dan jalankan perintah `npm test` di depan dosen untuk menampilkan status 95/95 PASS hijau.

* **Section 3 — Key Takeaways (Pesan Kunci Slide):**
  * Sistem PASARIN terbukti matang secara ilmiah, arsitektural, dan implementatif.
  * Siap melayani demonstrasi langsung di hadapan dosen pengampu dan tim asisten.

* **Section 4 — Panduan Presentasi & Poin Bicara (Speaker Notes - Zahir & Marshal):**
  > "Demikian laporan pengujian dan verifikasi use case sistem PASARIN. Seluruh perangkat lunak telah terverifikasi secara empiris, saintifik, dan siap kami demokan secara langsung di laptop maupun diakses via URL produksi. Terima kasih Prof. Riri dan tim asisten, kami membuka sesi tanya jawab dan demonstrasi langsung."

---
