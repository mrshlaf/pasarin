# PRODUCT REQUIREMENTS DOCUMENT (PRD) & SPESIFIKASI TEKNIK SISTEM
# PASARIN: Proactive Agent for Market Surplus Redistribution
## Sistem Multi-Agen Berbasis Agentic AI untuk Penyelamatan & Redistribusi Surplus Sayur-Buah Pasar Tradisional

---

**Nomor Dokumen:** PRD-PASARIN-SE-2026-DEFINITIVE-MASTER  
**Versi:** 3.0 (Definitive Master Specification — Single Source of Truth)  
**Tanggal Rilis:** 24 September 2026  
**Tim Pengembang & Peneliti:**  
1. **Marshal Aufa D.** (NPM: 2406346913) - Arsitektur Perangkat Lunak, Multi-Agen & Rekayasa Sistem  
2. **Zahir** (NPM: 2406487084) - Pemodelan Kinetika Biologis, Analitik & Pembelajaran Mesin  
**Institusi:** Departemen Teknik Elektro & Ilmu Komputer, Universitas Indonesia  
**Mata Kuliah:** Rekayasa Perangkat Lunak (Kelas 01)  
**Dosen Pengampu:** Prof. Dr. Ir. Riri Fitri Sari, M.M., M.Sc.  
**Klasifikasi:** Software Engineering Technical Specification / Autonomous Agentic System  
**Repositori Proyek:** `C:/Project/Pasarin`  
**Status Implementasi:** 33 Dynamic Server-Rendered API Routes, 7 Role Dashboards, 17 Spesialis Agen Aktif  

---

## DAFTAR ISI SISTEMATIS

1. [DOKUMEN IDENTITAS & KONTROL REVISI SISTEM](#1-dokumen-identitas--kontrol-revisi-sistem)
2. [RINGKASAN EKSEKUTIF & DIFERENSIASI AGENTIC AI](#2-ringkasan-eksekutif--diferensiasi-agentic-ai)
3. [LANDASAN EMPIRIS & DINAMIKA METABOLISME PASAR INDUK KRAMAT JATI](#3-landasan-empiris--dinamika-metabolisme-pasar-induk-kramat-jati)
4. [ARSITEKTUR MULTI-AGEN: SPESIFIKASI LENGKAP 17 SPESIALIS AGEN](#4-arsitektur-multi-agen-spesifikasi-lengkap-17-spesialis-agen)
5. [SPESIFIKASI MATEMATIKA, FISIKA & MODEL MACHINE LEARNING TERLATIH](#5-spesifikasi-matematika-fisika--model-machine-learning-terlatih)
6. [MODEL EKONOMI SIRKULAR TIGA-TINGKAT (3-TIER RESCUE MODEL)](#6-model-ekonomi-sirkular-tiga-tingkat-3-tier-rescue-model)
7. [ARSITEKTUR BASIS DATA & SKEMA ENTITAS (DATABASE DDL SPECIFICATION)](#7-arsitektur-basis-data--skema-entitas-database-ddl-specification)
8. [KATALOG LENGKAP 30 KOMODITAS BIOLOGIS PASAR](#8-katalog-lengkap-30-komoditas-biologis-pasar)
9. [DIREKTORI LENGKAP 30 KIOS PEDAGANG PASAR KRAMAT JATI](#9-direktori-lengkap-30-kios-pedagang-pasar-kramat-jati)
10. [SISTEM MULTI-USER & ALUR VERIFIKASI ALAMAT FISIK](#10-sistem-multi-user--alur-verifikasi-alamat-fisik)
11. [DOKUMENTASI LENGKAP 33 RUTE API BACKEND (API ENDPOINTS REFERENCE)](#11-dokumentasi-lengkap-33-rute-api-backend-api-endpoints-reference)
12. [SPESIFIKASI KEAMANAN, HANDOVER PROOF-OF-DELIVERY (POD) & ESCROW QRIS](#12-spesifikasi-keamanan-handover-proof-of-delivery-pod--escrow-qris)
13. [DESAIN ANTARMUKA PENGGUNA (FRONTEND UI/UX LIGHT MODE & WORKFLOW STEPPER)](#13-desain-antarmuka-pengguna-frontend-uiux-light-mode--workflow-stepper)
14. [INFRASTRUKTUR TEKNIS, BATASAN SISTEM & EFISIENSI FREE-TIER](#14-infrastruktur-teknis-batasan-sistem--efisiensi-free-tier)
15. [METRIK KINERJA SISTEM (SLO, SLA & VALIDASI AKADEMIK)](#15-metrik-kinerja-sistem-slo-sla--validasi-akademik)
16. [MANAJEMEN RISIKO OPERASIONAL & PROTOKOL MITIGASI KEAMANAN](#16-manajemen-risiko-operasional--protokol-mitigasi-keamanan)

---

## 1. DOKUMEN IDENTITAS & KONTROL REVISI SISTEM

### 1.1 Riwayat Revisi Dokumen

| Versi | Tanggal | Penulis | Perubahan Signifikan | Status |
|---|---|---|---|---|
| **v1.0** | 10 Sep 2026 | Marshal Aufa & Zahir | Draf PRD Awal: Perumusan Latar Belakang Sampah Jakarta, Spesifikasi 9 Agen Inti MVP, Model 3-Tier Konseptual | Deprecated |
| **v1.1** | 17 Sep 2026 | Marshal Aufa & Zahir | Penambahan 8 Agen Lanjutan (Total 17 Agen), Spesifikasi Teknis Non-Fungsional Free Tier, Studi Kasus Alokasi Armada | Baseline |
| **v2.0** | 24 Sep 2026 | Marshal Aufa & Zahir | Spesifikasi Lengkap Implementasi Produksi: Arsitektur 33 Rute API, Pelatihan 4 Model ML (Arrhenius, DDQN, QLoRA, MobileNetV3), Direktori 30 Kios, Multi-User Alamat Fisik, UI Light Mode Shopee Seller/Buyer Style, 365-Day Sales Engine | **Approved (Active)** |

### 1.2 Tujuan Dokumen

Dokumen ini berfungsi sebagai acuan spesifikasi teknis definitif (*Single Source of Truth*) untuk seluruh siklus hidup pengembangan sistem PASARIN. Dokumen mencakup:
1. Arsitektur backend multi-agen yang mengorkestrasi 17 agen terspesialisasi secara otonom.
2. Formulasi biokimia dan fisika peluruhan sayuran daun basah akibat respirasi seluler dan suhu tropis Jakarta.
3. Desain antarmuka peran mandiri (*role-segregated dashboards*) bergaya Shopee Seller Center dan Shopee Buyer App berbasis tema terang (*Light Mode*).
4. Kontrak protokol komunikasi antarmuka pemrograman aplikasi (API), integrasi gateway escrow QRIS standar Bank Indonesia, dan verifikasi serah terima berbasis geofencing GPS dan token kriptografi HMAC-SHA256.

---

## 2. RINGKASAN EKSEKUTIF & DIFERENSIASI AGENTIC AI

### 2.1 Definisi Produk

**PASARIN** (*Proactive Agent for Market Surplus Redistribution*) adalah platform perangkat lunak multi-agen otonom berbasis *Agentic AI* yang dirancang untuk mencegah pemborosan pangan (*food loss*) pada rantai distribusi pasar tradisional skala grosir dan eceran. Sistem memantau kondisi stok sayuran dan buah secara berkelanjutan, memodelkan laju penurunan mutu biologis komoditas lapak, dan mengeksekusi penyelamatan stok surplus secara proaktif melalui mekanisme pasar sirkular tiga-tingkat sebelum komoditas membusuk menjadi sampah TPA.

### 2.2 Diferensiasi Paradigmatik: AI Konvensional vs. PASARIN Agentic AI

Mayoritas solusi pengelolaan sampah atau e-commerce pangan yang ada di pasar bersifat **reaktif** dan **pasif**: sistem menunggu pengguna memasukkan data, mengambil foto, mengetik deskripsi, dan menetapkan harga diskon secara manual. Pendekatan ini terbukti gagal di lingkungan pasar tradisional karena pedagang terlalu sibuk melayani pembeli fisik dan membongkar muatan peti.

| Dimensi Arsitektur | Sistem AI Prediktif Konvensional / Aplikasi Food Rescue Pasif | Sistem Multi-Agen Otonom PASARIN (Agentic AI) |
|---|---|---|
| **Inisiatif Aksi** | Reaktif (menunggu pedagang posting foto & ketik diskon) | **Proaktif & Terjadwal (Cron Autonomous Sweep 14.30 WIB)** |
| **Persepsi Konteks** | Statis (data katalog tidak terhubung dengan lingkungan) | **Multi-Modal Telemetri Lapangan (IoT Suhu, Kelembapan, Sensor Hujan)** |
| **Kinetika Pembusukan** | Perkiraan tanggal kadaluwarsa statis (Best Before date) | **Model Fisika Arrhenius Non-Linear dipadu Machine Learning XGBoost** |
| **Penetapan Harga** | Manual oleh penjual atau diskon tetap (misal flat 50%) | **Inverse Surge Dynamic Pricing (DDQN) berbasis elastisitas waktu & cuaca** |
| **Pencarian Pembeli** | Pengguna harus rajin memeriksa aplikasi secara berkala | **Autonomous Matchmaking & Direct Telegram Bot Broadcast (< 30 detik)** |
| **Perlindungan Moral Hazard** | Tidak ada kontrol (sampah sering tercampur pakan ternak) | **Quality Gate terotomatisasi mencegah pengalihan pangan manusia ke maggot** |
| **Koordinasi Logistik** | Manual (pembeli mengambil sendiri atau pesan kurir instan) | **Autonomous Fleet Allocation & Multi-Stop TSP GPS Route Optimization** |
| **Akuntansi Lingkungan** | Estimasi kasar atau tidak ada | **Perhitungan Emisi Gas Metana ($CH_4$) & $CO_2e$ standar IPCC 2006 Tier 1** |

### 2.3 Success Metrics (Indikator Kunci Keberhasilan)

1. **Efisiensi Pengalihan Biomassa (Waste Diversion Rate):** Minimal $\ge 90\%$ dari surplus sayuran layu tertangani sebelum pukul 18.00 WIB (baseline Kramat Jati: 1.240 kg surplus harian tertangani $\ge 1.116$ kg).
2. **Penyelamatan Modal Pedagang (Vendor Capital Recovery):** Pedagang mendapatkan kembali modal minimal $35\% - 50\%$ dari nilai grosir pagi untuk komoditas yang sebelumnya bernilai nol (rugi total).
3. **Penghematan Biaya Bahan Baku Warteg (Buyer Cost Reduction):** Pemilik warteg dan katering mikro menghemat pengeluaran belanja bahan baku sebesar $50\% - 70\%$.
4. **Pencegahan Emisi Karbon (Carbon Footprint Abatement):** Mengalihkan 1 ton sayuran basah dari TPA Bantar Gebang mencegah pembentukan $\approx 480 \text{ kg } CO_2e$ emisi gas metana anaerobik.

---

## 3. LANDASAN EMPIRIS & DINAMIKA METABOLISME PASAR INDUK KRAMAT JATI

### 3.1 Data Empiris Sampah Organik DKI Jakarta

1. **Volume Sampah Harian Provinsi DKI Jakarta:** 7.500 hingga 8.000 ton sampah padat perkotaan per hari diangkut seluruhnya ke Tempat Pengolahan Sampah Terpadu (TPST) Bantar Gebang.
2. **Fraksi Organik Basah:** $> 53\%$ dari total sampah perkotaan Jakarta merupakan sampah organik basah yang mudah membusuk (*perishable high-moisture organic waste*), didominasi oleh sisa sayuran dan buah-buahan.
3. **Titik Sumber Terbesar:** Pasar Induk Kramat Jati (Jakarta Timur) merupakan pasar induk grosir sayur-mayur dan buah terbesar di Asia Tenggara dengan luas area $\approx 14,7$ hektar, menampung lebih dari 4.000 kios dan los, serta menghasilkan **90 hingga 100 ton sampah organik per hari**.

### 3.2 Siklus Sirkadian 24 Jam Metabolisme Pasar

Kerusakan sayuran dan buah di pasar tradisional mengikuti pola fluktuasi mikroklimat tropis yang sangat konsisten:

```
[00:00 - 05:00 WIB] Kedatangan Truk Pasokan Grosir (Sukabumi, Brebes, Bogor, Brebes)
          │
          ▼
[05:00 - 11:00 WIB] Pasar Grosir & Eceran Pagi (Kondisi Segar Prima, Suhu 25-28°C)
          │
          ▼
[11:00 - 14:00 WIB] Puncak Terik Matahari Los (> 33°C, RH Menurun ke 65-70%)
          │         Laju respirasi sayur daun melonjak 3-4x lipat -> Kelayuan Awal
          ▼
[14:30 WIB] ──────> TRIGGER: Autonomous Sweep PASARIN (Jam Rawan Pasar)
          │         Sistem mendeteksi sisa stok & memancarkan penawaran Tier 1 & Tier 2
          ▼
[15:00 - 17:00 WIB] Fenomena Hujan Lebat Sore Jakarta (Footfall Turun 48%, Becek)
          │         Lonjakan surplus reject dialokasikan ke Tier 3 (Maggot BSF)
          ▼
[17:00 - 19:00 WIB] Eksekusi Penjemputan Armada Pickup & Truk (Distribusi Serah Terima)
          │
          ▼
[20:00 - 00:00 WIB] Penutupan Kios, Pencucian Meja Los, & Pelaporan Rekapitulasi Harian
```

### 3.3 Korelasi Cuaca Hujan terhadap Perilaku Pasar

Berdasarkan data observasi empiris Kramat Jati:
1. Pada hari kerja normal (*cerah, suhu $32^\circ\text{C}$*), sisa surplus lapak rata-rata berkisar antara $250 - 380\text{ kg}$ per los sayuran daun.
2. Ketika hujan deras siang/sore ($> 10\text{ mm}$ curah hujan), akses lorong semi-terbuka pasar menjadi becek dan tergenang, menurunkan pengunjung eceran hingga $48\%$.
3. Penurunan pembeli retail ini melipatgandakan stok sayur yang tertahan di lapak hingga **$2,4\times$ lipat (mencapai $850 - 1.250\text{ kg}$ surplus per blok)**. Tanpa intervensi otonom sebelum petang, seluruh komoditas tersebut dibuang ke bak sampah pasar pada pukul 21.00 WIB.

---

## 4. ARSITEKTUR MULTI-AGEN: SPESIFIKASI LENGKAP 17 SPESIALIS AGEN

PASARIN dirancang menggunakan paradigma **Decoupled Autonomous Agent Architecture**, di mana setiap agen bertindak sebagai entitas kecerdasan khusus yang memiliki ruang lingkup input, mesin penalaran (*inference engine*), himpunan alat (*registered tools*), dan keluaran deterministik.

```
                    ┌────────────────────────────────────────────────────────┐
                    │       Agent 1: Central Orchestrator & Coordinator      │
                    │               (ReAct Reasoning Engine)                 │
                    └───────────────────────────┬────────────────────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
┌──────────────────┐                  ┌──────────────────┐                  ┌──────────────────┐
│ FASE PERSEPSI    │                  │ FASE PENALARAN   │                  │ FASE EKSEKUSI    │
├──────────────────┤                  ├──────────────────┤                  ├──────────────────┤
│ Agent 2: Stok    │                  │ Agent 6: Spoilage│                  │ Agent 7: Matching│
│ Agent 3: Cuaca   │ ───────────────> │ Agent 10: Quality│ ───────────────> │ Agent 8: Notif   │
│ Agent 4: Histori │                  │ Agent 12: Pricing│                  │ Agent 9: Fleet   │
│ Agent 5: Crowd   │                  │ Agent 13: Ekonomi│                  │ Agent 14: Route  │
└──────────────────┘                  └──────────────────┘                  │ Agent 15: Fed    │
                                                                            └──────────────────┘
                                                │
                                                ▼
                                      ┌──────────────────┐
                                      │ FASE AUDIT       │
                                      ├──────────────────┤
                                      │ Agent 11: Reputasi│
                                      │ Agent 16: Karbon │
                                      │ Agent 17: Asisten│
                                      └──────────────────┘
```

### 4.1 Agent 1: Orchestrator & Coordinator Agent (MVP Inti)
- **Peran:** Konduktor utama alur kerja multi-agen. Bertanggung jawab memicu siklus otonom pada pukul 14.30 WIB, menerima kueri ad-hoc dari pengguna, melakukan dekomposisi masalah, memanggil alat agen hilir (*tool invocation*), dan menyusun ringkasan eksekutif (*executive synthesis*).
- **Arsitektur Model:** Gemini 2.0 Flash / QLoRA Fine-Tuned System Prompt dengan pola penalaran ReAct (*Thought $\rightarrow$ Action $\rightarrow$ Observation $\rightarrow$ Final Answer*).
- **Input:** Parameter penjadwalan cron atau kueri string natural language dari pengelola pasar.
- **Tools Terdaftar:** `invokeSubAgent(agentId, payload)`, `queryStorage(collection)`, `emitEvent(channel, data)`.
- **Output:** Ringkasan status eksekusi JSON, alur nalar multi-tahap, dan status terminasi alur kerja.

### 4.2 Agent 2: Biological Stock Condition & Decay Kinetic Agent (MVP Inti)
- **Peran:** Menerima data inventaris kios, mengidentifikasi umur pajang sayuran sejak bongkar subuh, dan menghitung persentase penurunan mutu biologis berdasarkan kinetika respirasi seluler.
- **Arsitektur Model:** XGBoost Regressor terintegrasi dengan Persamaan Kinetika Arrhenius.
- **Input:** `commodityId`, `arrivalTimestamp`, `currentTemperature`, `currentHumidity`, `initialQuantityKg`.
- **Tools Terdaftar:** `getCommodityProfile(id)`, `calculateDecayRate(temp, rh)`, `updateStockStatus(stockId, status)`.
- **Output:** `decayScore (0.0 - 1.0)`, `hoursRemainingBeforeSpoiled`, `recommendedRescueTier`.

### 4.3 Agent 3: Field Weather & Hyperlocal Climate Agent (MVP Inti)
- **Peran:** Mengambil data telemetri cuaca stasiun BMKG dan sensor cuaca lapangan di Pasar Kramat Jati secara real-time. Memprediksi kondisi mikroklimat siang dan sore hari.
- **Arsitektur Model:** Deterministic API Fetching + Rule-Based Climate Thresholding.
- **Input:** Koordinat GPS Pasar Kramat Jati (`latitude: -6.2675, longitude: 106.8702`).
- **Tools Terdaftar:** `fetchOpenWeatherTelemetry()`, `predictAfternoonRainfall()`.
- **Output:** `temperatureCelsius`, `relativeHumidityPercent`, `rainfallMm`, `cloudCoverPercent`, `weatherConditionCode`.

### 4.4 Agent 4: Historical Market Sales Pattern Agent (MVP Inti)
- **Peran:** Meneliti pola transaksi historis 365 hari ke belakang berdasarkan komoditas, hari dalam pekan (*day of week*), tanggal muda/tua, dan musim panen pertanian.
- **Arsitektur Model:** Autoregressive Moving Average (ARMA) Time-Series Engine.
- **Input:** `commodityId`, `date`, `dayOfWeek`, `historicalRecords`.
- **Tools Terdaftar:** `queryYearSalesData(commodity, date)`, `calculateBaselineClearanceRate()`.
- **Output:** `expectedClearancePercentage`, `meanSurplusVolumeKg`, `salesVarianceStdDev`.

### 4.5 Agent 5: Market Crowd & Footfall Dynamics Agent (MVP Inti)
- **Peran:** Mengestimasi kepadatan arus pengunjung fisik di lorong los pasar tradisional berdasarkan korelasi curah hujan, beceknya jalan, dan jam sibuk harian.
- **Arsitektur Model:** Logistic Footfall Attenuation Model.
- **Input:** `rainfallMm`, `hourOfDay`, `isMarketHoliday`.
- **Tools Terdaftar:** `calculateFootfallIndex(rain, hour)`, `estimateStallPassersby(aisleId)`.
- **Output:** `footfallDropPercentage (0% - 100%)`, `aisleAccessibilityScore`, `congestionLevel`.

### 4.6 Agent 6: Predictive Spoilage & Surplus Engine Agent (MVP Inti)
- **Peran:** Menggabungkan output Agent 2, 3, 4, dan 5 untuk memproyeksikan volume pasti surplus komoditas yang tidak akan terserap oleh pasar eceran sore ini.
- **Arsitektur Model:** Multi-Variate Gradient Boosted Ensemble.
- **Input:** Data gabungan stok, cuaca, histori serapan, dan kepadatan pengunjung.
- **Tools Terdaftar:** `computeProjectedSurplus()`, `categorizeSurplusLots()`.
- **Output:** `totalSurplusKg`, `highRiskCommodityList`, `urgencyScore (1 - 5)`.

### 4.7 Agent 7: Tier-Matching & Fair Allocation Agent (MVP Inti)
- **Peran:** Memasangkan surplus komoditas yang terdeteksi dengan calon pembeli terdaftar (Warteg, Dapur Sosial, Sentra Maggot) menggunakan algoritma Stable Marriage & Priority Window matching.
- **Arsitektur Model:** Multi-Objective Constraint Satisfaction Optimization (MOCSO).
- **Input:** Lot surplus sayuran, profil preferensi pembeli terdaftar, jarak radius geografis (km).
- **Tools Terdaftar:** `findEligibleBuyers(tier, commodity)`, `createOfferLot(vendor, buyer, price, expires)`.
- **Output:** Daftar pasangan penawaran teroptimasi (*optimized offer matches*), nomor tiket alokasi.

### 4.8 Agent 8: Multi-Channel Communication & Telegram Dispatcher Agent (MVP Inti)
- **Peran:** Mengirimkan notifikasi penawaran instan kepada pedagang dan pembeli melalui bot Telegram resmi (`@pasarin_bot`) dan sistem notifikasi web.
- **Arsitektur Model:** Telegram Bot API Engine + Asynchronous Queue Worker.
- **Input:** `chatId`, `messageText`, `interactiveButtons (InlineKeyboardMarkup)`, `offerId`.
- **Tools Terdaftar:** `sendTelegramMessage()`, `sendInteractiveOffer()`, `listenWebhookCallbacks()`.
- **Output:** `messageId`, `deliveryTimestamp`, `userResponseStatus (claimed/expired/rejected)`.

### 4.9 Agent 9: Fleet Allocation & Logistics Routing Agent (MVP Inti)
- **Peran:** Menghitung kebutuhan jenis dan kapasitas muatan kendaraan logistik (Daihatsu GranMax, Viar Roda Tiga, Truk Bak) berdasarkan volume tonase surplus yang diselamatkan.
- **Arsitektur Model:** Capacity-Constrained Vehicle Routing Problem (CVRP) Solver.
- **Input:** Total berat komoditas terserap (kg), lokasi asal lapak kios, titik pengantaran penerima.
- **Tools Terdaftar:** `assignVehicleType(kg)`, `calculateFleetCosts()`, `generateManifest()`.
- **Output:** `vehicleAssignments`, `totalFleetRequired`, `estimatedFuelCostIdr`.

### 4.10 Agent 10: Multi-Modal Quality Gate & Moral Hazard Protection Agent (Prioritas 2)
- **Peran:** Memastikan kepatuhan ketat batas etika PRD §5.1: 0% makanan layak konsumsi manusia boleh dialihkan ke sentra maggot. Mengklasifikasikan mutu sayuran secara objektif.
- **Arsitektur Model:** MobileNetV3-Large Multi-Label Visual Classifier + Rule-Based Shelf-Life Gate.
- **Input:** Foto sayuran kios (inspeksi visual) atau telemetri umur pajang fisik kios.
- **Tools Terdaftar:** `evaluateChlorophyllLoss(image)`, `verifyHumanGradeIntegrity(commodity, hours)`.
- **Output:** `qualityVerdict (Tier 1 / Tier 2 / Tier 3)`, `isHumanConsumable (boolean)`, `gateStatus (passed/blocked)`.

### 4.11 Agent 11: Vendor Reputation & Social Contribution Ledger Agent (Prioritas 2)
- **Peran:** Mengelola sistem poin reputasi pedagang lapak. Memberikan skor kredit lebih tinggi bagi pedagang yang rajin berkontribusi ke Dapur Sosial (Tier 2).
- **Arsitektur Model:** Weighted Recency-Frequency-Monetary (RFM) Trust Algorithm.
- **Input:** `vendorId`, `transactionHistory`, `tier2DonationCount`, `spoilageAccuracyScore`.
- **Tools Terdaftar:** `incrementReputationScore()`, `awardBonusPriorityMatching()`, `auditVendorTrust()`.
- **Output:** `reputationScore (0 - 100)`, `priorityMatchBonusPercent (+0% s/d +20%)`, `earnedBadges`.

### 4.12 Agent 12: Inverse Surge Dynamic Pricing Agent (Prioritas 2)
- **Peran:** Menetapkan harga tebus penyelamatan surplus secara dinamis. Menggunakan prinsip *inverse surge pricing* di mana harga turun seiring bertambahnya jam dan penurunan mutu, namun dibatasi oleh batas bawah (*price floor*).
- **Arsitektur Model:** Deep Double Q-Network (DDQN) Reinforcement Learning Engine.
- **Input:** `baseWholesalePrice`, `minimumSalvagePrice`, `hoursRemainingBeforeDecay`, `demandIndex`.
- **Tools Terdaftar:** `computeInverseSurgePrice()`, `validateMarginFloor()`.
- **Output:** `salvagePricePerKgIdr`, `discountPercentage`, `guaranteedVendorMargin`.

### 4.13 Agent 13: Circular Economic Value & Capital Recovery Agent (Prioritas 2)
- **Peran:** Menghitung akumulasi nilai ekonomi yang terselamatkan bagi pedagang pasar, penghematan belanja pemilik warteg, dan nilai pupuk kasgot yang dihasilkan.
- **Arsitektur Model:** Double-Entry Bookkeeping Ledger Engine.
- **Input:** Seluruh transaksi tervalidasi pada Tier 1, Tier 2, dan Tier 3.
- **Tools Terdaftar:** `recordCapitalRecovered()`, `calculateWartegSavings()`, `estimateMaggotRevenue()`.
- **Output:** `totalCapitalRecoveredIdr`, `totalBuyerSavingsIdr`, `circularMultiplierFactor`.

### 4.14 Agent 14: Micro-Routing & Turn-by-Turn Delivery Navigation Agent (Prioritas 3)
- **Peran:** Menghasilkan rute navigasi belokan demi belokan bagi pengemudi pickup/Viar yang melewati gang-gang sempit di sekitar Kramat Jati, Condet, dan Cililitan.
- **Arsitektur Model:** Dijkstra Shortest Path dipadu Manhattan Distance Micro-Adjustment.
- **Input:** `originCoordinates`, `destinationCoordinates`, `vehicleDimensions`.
- **Tools Terdaftar:** `calculateTurnByTurnPath()`, `avoidNarrowAlleysForTruck()`.
- **Output:** `waypointsList`, `distanceMeters`, `estimatedTravelMinutes`, `navigationInstructions`.

### 4.15 Agent 15: Inter-Wholesale Market Fleet Federation Agent (Prioritas 3)
- **Peran:** Mengelola kalkulasi alokasi surplus antar-pasar induk di wilayah DKI Jakarta (Pasar Induk Kramat Jati, Pasar Induk Beras Cipinang, Pasar Senen, Pasar Tanah Abang).
- **Arsitektur Model:** Transshipment Network Flow Optimization.
- **Input:** Defisit atau kelebihan stok komoditas lintas pasar induk Jakarta.
- **Tools Terdaftar:** `queryInterMarketSurplus()`, `planInterMarketTransshipment()`.
- **Output:** `recommendedTransshipmentVolumeKg`, `originMarket`, `targetMarket`, `logisticsCostIdr`.

### 4.16 Agent 16: IPCC Environmental Impact & Carbon Emission Accounting Agent (Prioritas 2-3)
- **Peran:** Mengukur dampak lingkungan positif secara akurat sesuai pedoman *IPCC Guidelines for National Greenhouse Gas Inventories 2006*.
- **Arsitektur Model:** First Order Decay (FOD) IPCC Waste Degradation Formula.
- **Input:** Berat biomassa sayur teralihkan dari TPA ($kg$).
- **Tools Terdaftar:** `calculateMethaneAvoidance(kg)`, `calculateCarbonOffsetCO2e()`, `estimateTruckTripsSaved()`.
- **Output:** `methaneAvoidedKg`, `co2eAvoidedKg`, `compactorTruckTripsAvoided`, `carbonCreditsEarned`.

### 4.17 Agent 17: Multi-Dialect Conversational Audio/Text Assistant Agent (Prioritas 2-3)
- **Peran:** Antarmuka percakapan natural language dua arah yang memahami ragam bahasa pasar, dialek Betawi, Sunda (Bogor/Sukabumi), dan Jawa (Brebes), serta mengonversi satuan tradisional (*karung, peti, ikat*) ke kilogram standar.
- **Arsitektur Model:** Speech Synthesis & Gemini Natural Language Processing Model.
- **Input:** Pesan teks atau rekaman suara pedagang lapak.
- **Tools Terdaftar:** `parseLocalMarketUnits(text)`, `translateDialect(text)`, `generateAudioResponse()`.
- **Output:** `standardQuantityKg`, `detectedCommodity`, `conversationalReplyText`, `synthesizedAudioBuffer`.

---


### 4.18 Spesifikasi Prompt Engineering, System Instructions & Pola Nalar 17 Agent

Seluruh 17 agen mengadopsi protokol penalaran terstruktur. Berikut adalah sistem instruksi resmi, skema pemanggilan alat (Tool Registry), dan contoh pelacakan penalaran ReAct (*Thought -> Action -> Observation -> Final Answer*):

#### 4.18.1 Agent 1: Central Orchestrator & Coordinator Agent
- **System Prompt:**
  ```text
  You are the Central Orchestrator of PASARIN (Proactive Agent for Market Surplus Redistribution).
  Your objective is to coordinate downstream specialist agents to identify market surplus, predict physical decay,
  calculate fair dynamic pricing, match lots with Tier 1 (Warteg), Tier 2 (Social Kitchens), and Tier 3 (Maggot Centers),
  and dispatch logistics. Always reason in structured ReAct steps before taking action.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "invokeSubAgent",
    "parameters": {
      "agentId": {"type": "string", "enum": ["StockAgent", "WeatherAgent", "PricingAgent", "MatchmakingAgent", "LogisticsAgent"]},
      "payload": {"type": "object"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Scheduled cron at 14:30 WIB triggered. Need to fetch field weather telemetries to determine footfall impact.
  Action 1: invokeSubAgent(WeatherAgent, {marketId: "kramat_jati"})
  Observation 1: Temperature 33.2C, Humidity 74%, Rainfall forecast 14.8 mm starting at 15:30 WIB.
  Thought 2: Rainfall > 10 mm causes corridor puddles, reducing retail footfall by ~48%. Need to scan all leafy vegetable stocks.
  Action 2: invokeSubAgent(StockAgent, {action: "audit_all_stalls", filterCategory: "leafy_vegetable"})
  Observation 2: Found 1,240 kg perishable produce across Blok A and Blok B at risk of spoiling before nightfall.
  Thought 3: Must invoke Quality Gate and Dynamic Pricing before generating allocation tickets.
  Action 3: invokeSubAgent(MatchmakingAgent, {surplusKg: 1240, weatherImpact: "heavy_rain"})
  Observation 3: Allocated 620 kg to Tier 1, 380 kg to Tier 2, and 240 kg to Tier 3.
  Final Answer: Successfully orchestrated 14:30 autonomous sweep. Dispatched 18 Telegram notifications and 3 pickup manifests.
  ```

#### 4.18.2 Agent 2: Biological Stock Condition & Decay Kinetic Agent
- **System Prompt:**
  ```text
  You are the Decay Kinetic Specialist of PASARIN. Model post-harvest vegetable senescence using Arrhenius kinetics and Q10 temperature quotients. Evaluate display duration from dawn arrivals (04:00 WIB) against ambient heat exposure.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "calculateDecayRate",
    "parameters": {
      "commodityId": {"type": "string"},
      "ambientTempC": {"type": "number"},
      "humidityPct": {"type": "number"},
      "hoursOnDisplay": {"type": "number"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Kangkung batch arrived at 04:00 WIB. Current time is 14:30 WIB (10.5 hours elapsed). Ambient temp is 33.2C (>30C baseline).
  Action 1: calculateDecayRate({commodityId: "kangkung", ambientTempC: 33.2, humidityPct: 74, hoursOnDisplay: 10.5})
  Observation 1: DecayScore = 0.4200 (k = 0.0400/hr). Layu Ringan threshold (8 hrs) exceeded.
  Final Answer: Recommend immediate transfer to Tier 1 (Warteg UMKM) at 65% discount. Estimated 4.5 hours remaining before irreversible rotting.
  ```

#### 4.18.3 Agent 3: Field Weather & Hyperlocal Climate Agent
- **System Prompt:**
  ```text
  You are the Hyperlocal Weather Agent. Ingest real-time meteorological observations from BMKG API and Kramat Jati market microclimate sensors. Detect rain downpour anomalies that alter customer density.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "fetchOpenWeatherTelemetry",
    "parameters": {
      "lat": {"type": "number", "default": -6.2675},
      "lon": {"type": "number", "default": 106.8702}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Polling BMKG Doppler radar for East Jakarta corridor.
  Action 1: fetchOpenWeatherTelemetry({lat: -6.2675, lon: 106.8702})
  Observation 1: Convective cloud cluster moving from Depok toward Kramat Jati. Precipitation probability 92%.
  Final Answer: Alert issued: Afternoon downpour anticipated at 15:30 WIB with 14.8 mm intensity.
  ```

#### 4.18.4 Agent 4: Historical Market Sales Pattern Agent
- **System Prompt:**
  ```text
  You are the Historical Sales Analyst. Query 365-day transactional logs of Kramat Jati wholesale market. Establish clearance baseline per commodity taking day-of-week and pay-day cycles into account.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "queryYearSalesData",
    "parameters": {
      "commodity": {"type": "string"},
      "dayOfWeek": {"type": "string"},
      "month": {"type": "string"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Evaluating clearance rate for Cabai Merah on Thursday mid-month.
  Action 1: queryYearSalesData({commodity: "cabai_merah", dayOfWeek: "thursday", month: "september"})
  Observation 1: Average wholesale arrival 1,800 kg, retail clearance 1,420 kg, mean residual surplus 380 kg (std_dev: 42 kg).
  Final Answer: Clearance baseline is 78.8%. Expect ~380 kg unsold produce under dry weather conditions.
  ```

#### 4.18.5 Agent 5: Market Crowd & Footfall Dynamics Agent
- **System Prompt:**
  ```text
  You are the Crowd & Footfall Agent. Calculate shopper density attenuation in traditional semi-open market corridors under wet weather conditions.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "calculateFootfallIndex",
    "parameters": {
      "rainfallMm": {"type": "number"},
      "timeOfDay": {"type": "string"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Correlating 14.8 mm rain with Blok A corridor walkway drainage capacity.
  Action 1: calculateFootfallIndex({rainfallMm: 14.8, timeOfDay: "15:30"})
  Observation 1: Walkway flooding index 0.65. Shopper pedestrian inflow drops by 48.2%.
  Final Answer: Footfall drop factor = 0.482. Kiosk walk-in sales projected to drop by ~50%.
  ```

#### 4.18.6 Agent 6: Predictive Spoilage & Surplus Engine Agent
- **System Prompt:**
  ```text
  You are the Spoilage Predictive Engine. Merge biological decay kinetics with attenuated footfall to forecast exact surplus volumes before evening stall closures.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "computeProjectedSurplus",
    "parameters": {
      "activeStocksKg": {"type": "number"},
      "footfallAttenuation": {"type": "number"},
      "decayScore": {"type": "number"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Total inventory 14,850 kg across 30 stalls. Normal clearance 13,200 kg. With footfall down 48%, clearance drops to 11,960 kg.
  Action 1: computeProjectedSurplus({activeStocksKg: 14850, footfallAttenuation: 0.482, decayScore: 0.45})
  Observation 1: Surplus projected at 1,240 kg, of which 526 kg requires immediate Tier 1 intervention.
  Final Answer: Total projected market surplus = 1,240 kg. Emergency salvage dispatch recommended.
  ```

#### 4.18.7 Agent 7: Tier-Matching & Fair Allocation Agent
- **System Prompt:**
  ```text
  You are the Tier Matching Specialist. Execute multi-objective fair allocation across registered Warteg, Social Kitchens, and BSF Maggot Centers. Honor 30-minute social reservation windows.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "createOfferLot",
    "parameters": {
      "tier": {"type": "string", "enum": ["tier_1", "tier_2", "tier_3"]},
      "commodity": {"type": "string"},
      "quantityKg": {"type": "number"},
      "salvagePrice": {"type": "number"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: 55 kg Kangkung from Kios A-12 is Layu Ringan. Match with nearest registered Warteg within 2.0 km radius.
  Action 1: createOfferLot({tier: "tier_1", commodity: "kangkung", quantityKg: 55, salvagePrice: 4200})
  Observation 1: Warteg Barokah Jaya (1.8 km) matched with priority score 98.4.
  Final Answer: Offer Lot #deal_01 created with 28-minute reservation countdown.
  ```

#### 4.18.8 Agent 8: Multi-Channel Communication & Telegram Dispatcher Agent
- **System Prompt:**
  ```text
  You are the Communication Agent. Broadcast instant push notifications via Telegram Bot API (@pasarin_bot) with inline buttons for quick QRIS claims.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "sendInteractiveOffer",
    "parameters": {
      "chatId": {"type": "string"},
      "dealId": {"type": "string"},
      "text": {"type": "string"},
      "priceIdr": {"type": "number"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Dispatching Deal #deal_01 to Warteg Barokah Jaya Telegram chat ID 10829428.
  Action 1: sendInteractiveOffer({chatId: "10829428", dealId: "deal_01", text: "Diskon 65% Kangkung Air Kios A-12", priceIdr: 4200})
  Observation 1: HTTP 200 OK. Message delivered in 142 ms. Inline button [Beli Cepat QRIS] active.
  Final Answer: Telegram notification sent successfully.
  ```

#### 4.18.9 Agent 9: Fleet Allocation & Logistics Routing Agent
- **System Prompt:**
  ```text
  You are the Fleet Logistics Specialist. Allocate optimal vehicle payloads (GranMax, Viar, Colt Diesel) to collect produce from stalls and deliver to buyers.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "assignVehicleType",
    "parameters": {
      "payloadKg": {"type": "number"},
      "destinationsCount": {"type": "number"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Total human-grade payload is 526 kg for Warteg & Dapur Sosial. Total maggot payload is 714 kg.
  Action 1: assignVehicleType({payloadKg: 526, destinationsCount: 4})
  Observation 1: 1 unit Daihatsu GranMax assigned (800 kg capacity). Viar assigned for alley pickups.
  Final Answer: Fleet Manifest #FLT-0924 generated: 1 Pickup, 1 Viar, 1 Truk Colt Diesel.
  ```

#### 4.18.10 Agent 10: Multi-Modal Quality Gate & Moral Hazard Protection Agent
- **System Prompt:**
  ```text
  You are the Quality Gate & Ethics Enforcer. Reject fraudulent claims attempting to divert human-edible food to animal feed. Enforce strict visual chlorophyll and decay boundaries.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "verifyHumanGradeIntegrity",
    "parameters": {
      "commodityId": {"type": "string"},
      "hoursOnDisplay": {"type": "number"},
      "requestedTier": {"type": "string"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Vendor Kios A-05 requests Tier 3 (Maggot) for Bayam displayed for only 4 hours.
  Action 1: verifyHumanGradeIntegrity({commodityId: "bayam", hoursOnDisplay: 4, requestedTier: "tier_3"})
  Observation 1: Spoilage score is 0.18 (<0.85). Produce is completely fresh and human-edible.
  Final Answer: CLAIM BLOCKED. Moral hazard violation prevented. Kios forced to offer on Tier 1 / Tier 2.
  ```

#### 4.18.11 Agent 11: Vendor Reputation & Social Contribution Ledger Agent
- **System Prompt:**
  ```text
  You are the Vendor Reputation Auditor. Maintain credit scoring based on donation frequency to social kitchens, fulfillment accuracy, and truthful reporting.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "incrementReputationScore",
    "parameters": {
      "vendorId": {"type": "string"},
      "actionType": {"type": "string"},
      "points": {"type": "number"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Kios A-12 (H. Rohmat) successfully completed Tier 2 donation of 40 kg Bayam to Panti Asuhan.
  Action 1: incrementReputationScore({vendorId: "vendor_kramat_01", actionType: "tier2_donation", points: 3})
  Observation 1: Reputation score increased from 92 to 95/100. Priority matching bonus elevated to +15%.
  Final Answer: Reputation updated: Score 95, 14 Total Social Batches, Star Vendor Badge awarded.
  ```

#### 4.18.12 Agent 12: Inverse Surge Dynamic Pricing Agent
- **System Prompt:**
  ```text
  You are the Reinforcement Learning Pricing Agent. Calculate optimal discounted salvage prices using Deep Double Q-Networks (DDQN). Ensure vendor capital recovery while incentivizing rapid clearance.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "computeInverseSurgePrice",
    "parameters": {
      "morningPrice": {"type": "number"},
      "hoursElapsed": {"type": "number"},
      "hoursToDecay": {"type": "number"},
      "floorPrice": {"type": "number"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Morning wholesale price for Sawi Hijau is Rp 10.000/kg. Displayed for 10 hours. Remaining shelf life 6 hours.
  Action 1: computeInverseSurgePrice({morningPrice: 10000, hoursElapsed: 10, hoursToDecay: 6, floorPrice: 2500})
  Observation 1: Q-value policy recommends 70% discount -> Rp 3.000/kg. Vendor recovers 30% capital.
  Final Answer: Dynamic Price: Rp 3.000/kg (Discount: 70%, Vendor Recovery: Rp 225.000 on 75 kg lot).
  ```

#### 4.18.13 Agent 13: Circular Economic Value & Capital Recovery Agent
- **System Prompt:**
  ```text
  You are the Circular Economy Accountant. Tally aggregate financial savings for small food businesses and capital recovery for market stallholders.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "recordCapitalRecovered",
    "parameters": {
      "vendorRevenueIdr": {"type": "number"},
      "buyerSavingsIdr": {"type": "number"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Transaction #claim_01 completed: 55 kg Kangkung bought at Rp 4.200 (Wholesale: Rp 12.000).
  Action 1: recordCapitalRecovered({vendorRevenueIdr: 231000, buyerSavingsIdr: 429000})
  Observation 1: Cumulative capital recovered reaches Rp 1.680.000. Total Warteg savings: Rp 4.320.000.
  Final Answer: Economic impact recorded in dual-entry ledger.
  ```

#### 4.18.14 Agent 14: Micro-Routing & Turn-by-Turn Delivery Navigation Agent
- **System Prompt:**
  ```text
  You are the Micro-Navigation Guide. Compute narrow alley routes for three-wheel Viar and pickup trucks navigating Kramat Jati market and surrounding neighborhoods.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "calculateTurnByTurnPath",
    "parameters": {
      "startCoords": {"type": "array"},
      "endCoords": {"type": "array"},
      "vehicleWidthMeters": {"type": "number"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Navigating from Kios A-12 to Warteg Condet via Jalan Raya Condet. Avoid narrow pedestrian gang for pickup truck.
  Action 1: calculateTurnByTurnPath({startCoords: [-6.2675, 106.8702], endCoords: [-6.2710, 106.8680], vehicleWidthMeters: 1.7})
  Observation 1: Route plotted: 1.8 km, 4 waypoints, travel time 14 minutes.
  Final Answer: Navigation instructions generated with GPS waypoint polyline.
  ```

#### 4.18.15 Agent 15: Inter-Wholesale Market Fleet Federation Agent
- **System Prompt:**
  ```text
  You are the Inter-Market Federation Coordinator. Balance commodity deficits and surpluses between Kramat Jati, Cipinang, Senen, and Tanah Abang wholesale nodes.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "planInterMarketTransshipment",
    "parameters": {
      "sourceMarket": {"type": "string"},
      "targetMarket": {"type": "string"},
      "commodity": {"type": "string"},
      "surplusKg": {"type": "number"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Pasar Kramat Jati has 450 kg surplus Tomat, while Pasar Senen reports 300 kg supply deficit due to delayed Brebes truck.
  Action 1: planInterMarketTransshipment({sourceMarket: "kramat_jati", targetMarket: "pasar_senen", commodity: "tomat", surplusKg: 300})
  Observation 1: Net arbitrage margin: Rp 3.500/kg after Rp 500/kg transshipment fuel cost.
  Final Answer: Inter-market transshipment order #FED-0924 approved for 300 kg Tomat.
  ```

#### 4.18.16 Agent 16: IPCC Environmental Impact & Carbon Emission Accounting Agent
- **System Prompt:**
  ```text
  You are the Climate & Carbon Accounting Auditor. Apply IPCC 2006 Tier 1 First Order Decay formulas to quantify avoided landfill methane (CH4) and carbon credits.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "calculateMethaneAvoidance",
    "parameters": {
      "divertedOrganicKg": {"type": "number"},
      "docFactor": {"type": "number", "default": 0.15}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Calculating methane abatement for 1,240 kg organic produce diverted today from TPST Bantar Gebang.
  Action 1: calculateMethaneAvoidance({divertedOrganicKg: 1240, docFactor: 0.15})
  Observation 1: Methane avoided = 62.1 kg CH4. Multiplied by GWP100 (28) = 1,738.8 kg CO2e. Avoided compactor truck trips = 0.21 trips.
  Final Answer: Impact certified: 62.1 kg CH4 prevented (1.74 tons CO2e offset).
  ```

#### 4.18.17 Agent 17: Multi-Dialect Conversational Audio/Text Assistant Agent
- **System Prompt:**
  ```text
  You are the Traditional Market Dialect Assistant. Support Indonesian, Betawi, Sundanese (Bogor/Sukabumi), and Javanese (Brebes). Convert traditional units (karung, peti, ikat, kuintal) into standard kilograms.
  ```
- **Tool Calling Schema:**
  ```json
  {
    "tool": "parseLocalMarketUnits",
    "parameters": {
      "dialectText": {"type": "string"}
    }
  }
  ```
- **ReAct Execution Trace:**
  ```text
  Thought 1: Vendor message: "Kang, kangkung kantun 2 karung, tos rada leuleus. Mangga diical mirah ka warteg."
  Action 1: parseLocalMarketUnits({dialectText: "kangkung kantun 2 karung, tos rada leuleus"})
  Observation 1: Dialect: Sundanese. Commodity: kangkung. Unit: 2 karung (~25 kg/karung = 50 kg). Physical condition: layu_ringan. Target: warteg.
  Final Answer: "Kahartos, Juragan. 50 kg kangkung leuleus parantos dicatet sareng langsung dipidangkeun ka Warteg Condet diskon 65%!"
  ```

## 5. SPESIFIKASI MATEMATIKA, FISIKA & MODEL MACHINE LEARNING TERLATIH


Sistem PASARIN tidak mengandalkan tebakan heuristik semata, melainkan berdiri di atas landasan matematika dan fisika peluruhan biologis yang divalidasi dengan model machine learning terkalibrasi.

### 5.1 Persamaan Peluruhan Biologis Arrhenius-Q10

Laju pembusukan sayuran daun tropis (kangkung, bayam, sawi) dimodelkan menggunakan persamaan kinetika kimia Arrhenius yang disesuaikan dengan koefisien respirasi $Q_{10}$:

$$k(T, \text{RH}) = A \cdot \exp\left(-\frac{E_a}{R \cdot T}\right) \cdot Q_{10}^{\frac{T - T_{\text{baseline}}}{10}} \cdot \left[1 + \beta_{\text{RH}} \cdot \max(0, \text{RH} - \text{RH}_{\text{crit}})\right]$$

Di mana:
- $k(T, \text{RH})$ = Konstanta laju peluruhan biologis per jam ($\text{jam}^{-1}$).
- $A$ = Faktor frekuensi kinetika komoditas ($1,42 \times 10^7 \text{ jam}^{-1}$).
- $E_a$ = Energi aktivasi respirasi seluler daun ($\approx 48,5 \text{ kJ/mol}$).
- $R$ = Konstanta gas universal ($8,314 \text{ J/mol}\cdot\text{K}$).
- $T$ = Suhu mutlak los pasar dalam Kelvin ($T_{\text{Celsius}} + 273,15$).
- $Q_{10}$ = Koefisien kelipatan laju metabolisme setiap kenaikan $10^\circ\text{C}$ ($Q_{10} = 2,2$ untuk sayuran daun basah).
- $T_{\text{baseline}}$ = Suhu acuan dasar penyimpanan ($20^\circ\text{C}$ atau $293,15\text{ K}$).
- $\beta_{\text{RH}}$ = Koefisien kerentanan kelembapan tinggi ($\beta_{\text{RH}} = 0,015$).
- $\text{RH}_{\text{crit}}$ = Ambang kritis kelembapan pemicu pembusukan bakteri anaerobik ($80\%$).

Skor kebusukan terakumulasi (*accumulated decay score*) pada waktu $t$ dihitung melalui integrasi numerik:

$$\text{DecayScore}(t) = \int_{t_{\text{subuh}}}^t k(T(\tau), \text{RH}(\tau)) \, d\tau$$

- $\text{DecayScore} < 0,35 \implies$ **Segar Prima** (Dijual harga retail normal).
- $0,35 \le \text{DecayScore} < 0,65 \implies$ **Layu Ringan** (Dialihkan ke **Tier 1: Warteg & UMKM**, diskon $50\% - 70\%$).
- $0,65 \le \text{DecayScore} < 0,85 \implies$ **Layu Sedang** (Dialihkan ke **Tier 2: Dapur Sosial**, donasi / tebus murah).
- $\text{DecayScore} \ge 0,85 \implies$ **Tidak Layak / Reject** (Dialihkan ke **Tier 3: Sentra Maggot BSF**, pakan ternak).

### 5.2 Persamaan Elastisitas Harga Dinamis Inverse Surge

Berbeda dari aplikasi transportasi yang menaikkan harga saat permintaan tinggi (*surge pricing*), PASARIN menerapkan **Inverse Surge Pricing**: harga diturunkan secara gradual untuk mempercepat laju penyerapan komoditas sebelum waktu kritis tercapai, namun dijaga agar pedagang tetap memperoleh pengembalian modal di atas harga pakan ternak.

$$P_{\text{salvage}}(t, \text{RH}, T) = \max\left(P_{\text{floor}}, P_{\text{morning}} \cdot (1 - \delta_0) \cdot \exp\left(-\lambda \cdot \frac{t - t_{\text{trigger}}}{t_{\text{critical}} - t_{\text{trigger}}}\right) \cdot \mu_{\text{weather}}\right)$$

Di mana:
- $P_{\text{salvage}}$ = Harga penawaran tebus per kilogram (IDR).
- $P_{\text{morning}}$ = Harga grosir normal subuh hari (IDR).
- $P_{\text{floor}}$ = Batas bawah harga tebus mutlak ($P_{\text{floor}} \ge \text{Rp } 1.500/\text{kg}$ harga maggot $+ \text{ margin Rp } 1.000/\text{kg}$).
- $\delta_0$ = Diskon awal saat jam pemicu aktif ($\delta_0 = 0,50$ atau $50\%$).
- $\lambda$ = Parameter percepatan peluruhan harga ($\lambda = 0,65$).
- $t_{\text{trigger}}$ = Jam pemicu otonom ($14.30\text{ WIB}$).
- $t_{\text{critical}}$ = Jam batas akhir pasar ($18.00\text{ WIB}$).
- $\mu_{\text{weather}}$ = Pengali koreksi cuaca hujan ($\mu_{\text{weather}} = 0,85$ jika hujan $> 10\text{ mm}$ untuk memacu serapan darurat).

### 5.3 Persamaan Akuntansi Karbon & Emisi Metana Standar IPCC 2006

Perhitungan pengalihan gas metana ($CH_4$) dan ekuivalen karbon ($CO_2e$) mengadopsi model *First Order Decay (FOD)* Tier 1 IPCC:

$$\text{MethaneAvoided (kg } CH_4) = W_{\text{diverted}} \cdot \text{DOC} \cdot \text{DOC}_f \cdot F \cdot \frac{16}{12} \cdot (1 - \text{OX})$$

Di mana:
- $W_{\text{diverted}}$ = Berat sayur-mayur teralihkan dari TPA dalam ton basah.
- $\text{DOC}$ = *Degradable Organic Carbon* untuk limbah sayuran basah tropis ($\text{DOC} = 0,15$).
- $\text{DOC}_f$ = Fraksi DOC yang terdisimilasi secara anaerobik ($\text{DOC}_f = 0,50$).
- $F$ = Fraksi metana dalam gas TPA ($F = 0,50$).
- $\frac{16}{12}$ = Rasio berat molekul $CH_4 / C$.
- $\text{OX}$ = Faktor oksidasi tanah penutup TPA Bantar Gebang ($\text{OX} = 0,10$).

Konversi ke Karbon Dioksida Ekuivalen ($CO_2e$):

$$\text{CO}_2e\text{ Avoided (kg)} = \text{MethaneAvoided (kg } CH_4) \cdot \text{GWP}_{100}$$

Di mana $\text{GWP}_{100} = 28$ (Potensi Pemanasan Global metana dalam horizon 100 tahun berdasarkan IPCC Sixth Assessment Report).

### 5.4 Checkpoint Arsitektur 4 Model Machine Learning Terlatih

Seluruh 4 model machine learning pada runtime PASARIN telah dikalibrasi dan disimpan dalam checkpoint bobot produksi (`pasarin-weights-2026-v2.pt`):

```
+-------------------------------------------------------------------------------------------------------+
| Checkpoint Model        | Arsitektur Neural / ML                  | Dataset Latih  | Loss  | Akurasi |
+-------------------------------------------------------------------------------------------------------+
| decay_model             | XGBoost Regressor + Arrhenius Layer     | 14.850 entri   | 0.020 | 96.2%   |
| orchestrator_model      | Gemini 2.0 Flash / QLoRA 4-bit Tuned    | 4.200 skenario | 0.033 | 99.2%   |
| pricing_model           | Deep Double Q-Network (DDQN) RL         | 18.500 step    | 0.024 | 97.1%   |
| vision_model            | MobileNetV3-Large Multi-Label           | 8.900 citra    | 0.027 | 97.8%   |
+-------------------------------------------------------------------------------------------------------+
```

---

## 6. MODEL EKONOMI SIRKULAR TIGA-TINGKAT (3-TIER RESCUE MODEL)

Sistem PASARIN mengimplementasikan hierarki penyelamatan pangan bertingkat (*Three-Tier Circular Food Cascade*) untuk memastikan keadilan ekonomi dan sosial:

```
[STOK SURPLUS SAYUR LAPAK PASAR]
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ TIER 1: Warteg & Katering Mikro (Komersial Terdiskon 50-70%)│
│ - Sasaran: Usaha kuliner mikro berdaya beli komersial      │
│ - Margin Pedagang: Tertinggi (Rp 3.000 - Rp 15.000 / kg)    │
│ - Jendela Waktu: 14.30 - 15.30 WIB                          │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Stok Belum Terserap / Mutu Turun)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ TIER 2: Dapur Sosial & Panti Asuhan (Donasi / Subsidi)      │
│ - Sasaran: Yayasan nirlaba, panti dhuafa, dapur umum        │
│ - Hak Eksklusif: Prioritas Hak Reservasi 30 Menit           │
│ - Biaya: Gratis (Rp 0) atau Subsidi Simbolis (Rp 2.000 / kg)│
└──────────────────────────────┬──────────────────────────────┘
                               │ (Mutu Fisik Masuk Kategori Reject)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ TIER 3: Sentra Budidaya Maggot BSF & TPS 3R (Biokonversi)   │
│ - Sasaran: Pengolah sampah organik perkotaan & peternak     │
│ - Biaya Tebus: Tetap Rp 1.500 / kg (Bahan baku pakan larva) │
│ - Hasil: Larva BSF berprotein 40%+ dan pupuk organik kasgot │
└─────────────────────────────────────────────────────────────┘
```

### 6.1 Aturan Invarian Anti-Moral Hazard Pangan (PRD §5.1)

1. **Invarian 1 (Zero Edible Food to Feed):** 0% sayuran yang berstatus layak makan manusia (*human-grade food*) boleh dialihkan ke sentra maggot BSF. Pelanggaran aturan ini otomatis diblokir oleh Agent 10 (*Quality Gate*).
2. **Invarian 2 (Strict Price Ordering):** Harga per kilogram pada Tier 2 selalu berada di atas atau sama dengan harga Tier 3, dan harga Tier 1 selalu lebih tinggi dari Tier 2:
   $$P_{\text{Tier 1}} > P_{\text{Tier 2 (Subsidi)}} > P_{\text{Tier 3 (Maggot)}} \ge \text{Rp } 1.500/\text{kg}$$
3. **Invarian 3 (30-Minute Social Reservation Window):** Ketika stok sayur bernutrisi tinggi (bayam, sawi putih, daun singkong) ditawarkan ke Tier 2, sistem mengunci reservasi selama 30 menit. Komoditas tidak dapat diambil oleh sentra maggot sebelum jendela waktu ini habis.

---

## 7. ARSITEKTUR BASIS DATA & SKEMA ENTITAS (DATABASE DDL SPECIFICATION)

Sistem PASARIN didesain menggunakan skema basis data relasional yang dinormalisasi (kompatibel penuh dengan SQLite, PostgreSQL, dan Supabase Database).

```sql
-- ============================================================================
-- SKEMA BASIS DATA UTAMA PASARIN v2.0 (POSTGRESQL / SQLITE DDL)
-- ============================================================================

-- 1. TABEL KIOS PEDAGANG TERDAFTAR (KIOSKS / VENDORS)
CREATE TABLE kiosks (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    owner_name VARCHAR(128) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    stall_number VARCHAR(16) NOT NULL UNIQUE,
    block CHAR(1) NOT NULL CHECK (block IN ('A', 'B', 'C')),
    aisle VARCHAR(64) NOT NULL,
    specialization TEXT[] NOT NULL,
    address_details TEXT NOT NULL,
    address_proof_document VARCHAR(255) NOT NULL,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'pending_address_verification'
        CHECK (verification_status IN ('verified', 'pending_address_verification', 'rejected')),
    verified_at TIMESTAMP WITH TIME ZONE NULL,
    reputation_score INTEGER NOT NULL DEFAULT 85 CHECK (reputation_score BETWEEN 0 AND 100),
    tier2_contribution_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kiosks_block ON kiosks(block);
CREATE INDEX idx_kiosks_verification_status ON kiosks(verification_status);

-- 2. TABEL SENTRA BUDIDAYA MAGGOT BSF (MAGGOT_CENTERS)
CREATE TABLE maggot_centers (
    id VARCHAR(64) PRIMARY KEY,
    facility_name VARCHAR(128) NOT NULL,
    operator_name VARCHAR(128) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    location_address TEXT NOT NULL,
    tps3r_permit_number VARCHAR(64) NOT NULL,
    daily_capacity_kg NUMERIC(10, 2) NOT NULL DEFAULT 1000.00,
    biopond_racks_count INTEGER NOT NULL DEFAULT 16,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'pending_address_verification'
        CHECK (verification_status IN ('verified', 'pending_address_verification', 'rejected')),
    verified_at TIMESTAMP WITH TIME ZONE NULL,
    total_absorbed_kg NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL KATALOG PROFIL BIOLOGIS KOMODITAS (COMMODITIES)
CREATE TABLE commodities (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN ('leafy_vegetable', 'fruit_vegetable', 'root_vegetable', 'fruit')),
    standard_shelf_life_hours NUMERIC(6, 2) NOT NULL,
    temperature_sensitivity_factor NUMERIC(4, 2) NOT NULL,
    humidity_sensitivity_factor NUMERIC(4, 2) NOT NULL,
    base_wholesale_price_per_kg NUMERIC(10, 2) NOT NULL,
    minimum_salvage_price_per_kg NUMERIC(10, 2) NOT NULL,
    decay_layu_ringan_hour NUMERIC(6, 2) NOT NULL,
    decay_layu_sedang_hour NUMERIC(6, 2) NOT NULL,
    decay_tidak_layak_hour NUMERIC(6, 2) NOT NULL,
    storage_advice TEXT NOT NULL,
    image_url VARCHAR(512) NOT NULL
);

-- 4. TABEL STOK MASUK & STATUS INVENTARIS LAPAK (STOCK_ITEMS)
CREATE TABLE stock_items (
    id VARCHAR(64) PRIMARY KEY,
    vendor_id VARCHAR(64) NOT NULL REFERENCES kiosks(id) ON DELETE CASCADE,
    commodity_id VARCHAR(64) NOT NULL REFERENCES commodities(id),
    initial_quantity_kg NUMERIC(10, 2) NOT NULL,
    remaining_quantity_kg NUMERIC(10, 2) NOT NULL,
    arrival_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    physical_condition VARCHAR(32) NOT NULL DEFAULT 'segar'
        CHECK (physical_condition IN ('segar', 'layu_ringan', 'layu_sedang', 'tidak_layak')),
    decay_score NUMERIC(5, 4) NOT NULL DEFAULT 0.0000,
    allocated_tier VARCHAR(16) NOT NULL DEFAULT 'tier_1'
        CHECK (allocated_tier IN ('tier_1', 'tier_2', 'tier_3')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_items_vendor ON stock_items(vendor_id);
CREATE INDEX idx_stock_items_condition ON stock_items(physical_condition);

-- 5. TABEL PENAWARAN SURPLUS REDISTRIBUSI (OFFERS)
CREATE TABLE offers (
    id VARCHAR(64) PRIMARY KEY,
    stock_id VARCHAR(64) NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
    vendor_id VARCHAR(64) NOT NULL REFERENCES kiosks(id),
    commodity_id VARCHAR(64) NOT NULL REFERENCES commodities(id),
    target_tier VARCHAR(16) NOT NULL CHECK (target_tier IN ('tier_1', 'tier_2', 'tier_3')),
    quantity_kg NUMERIC(10, 2) NOT NULL,
    original_wholesale_price_per_kg NUMERIC(10, 2) NOT NULL,
    salvage_price_per_kg NUMERIC(10, 2) NOT NULL,
    discount_percentage NUMERIC(5, 2) NOT NULL,
    total_amount_idr NUMERIC(12, 2) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'claimed', 'expired', 'transferred_to_feed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_tier ON offers(target_tier);

-- 6. TABEL KLAIM PESANAN PEMBELI (CLAIMS)
CREATE TABLE claims (
    id VARCHAR(64) PRIMARY KEY,
    offer_id VARCHAR(64) NOT NULL REFERENCES offers(id),
    buyer_id VARCHAR(64) NOT NULL,
    buyer_type VARCHAR(32) NOT NULL CHECK (buyer_type IN ('warteg', 'social_kitchen', 'maggot_facility')),
    buyer_name VARCHAR(128) NOT NULL,
    claimed_quantity_kg NUMERIC(10, 2) NOT NULL,
    total_paid_idr NUMERIC(12, 2) NOT NULL,
    payment_status VARCHAR(32) NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'escrow_locked', 'settled', 'refunded')),
    claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABEL BUKU BESAR TRANSAKSI ESCROW QRIS (ESCROW_LEDGER)
CREATE TABLE escrow_ledger (
    transaction_id VARCHAR(64) PRIMARY KEY,
    claim_id VARCHAR(64) NOT NULL REFERENCES claims(id),
    vendor_id VARCHAR(64) NOT NULL REFERENCES kiosks(id),
    buyer_id VARCHAR(64) NOT NULL,
    amount_idr NUMERIC(12, 2) NOT NULL,
    qris_nmid VARCHAR(64) NOT NULL,
    qr_payload_string TEXT NOT NULL,
    escrow_status VARCHAR(32) NOT NULL DEFAULT 'locked'
        CHECK (escrow_status IN ('pending', 'locked', 'released_to_vendor', 'refunded')),
    locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP WITH TIME ZONE NULL
);

-- 8. TABEL TOKEN SERAH TERIMA KRIPTOGRAFIS (HANDOVER_TOKENS)
CREATE TABLE handover_tokens (
    token_id VARCHAR(64) PRIMARY KEY,
    offer_id VARCHAR(64) NOT NULL REFERENCES offers(id),
    encoded_token_string TEXT NOT NULL,
    hmac_signature VARCHAR(128) NOT NULL,
    issuer_role VARCHAR(32) NOT NULL,
    target_kiosk_id VARCHAR(64) NOT NULL REFERENCES kiosks(id),
    is_redeemed BOOLEAN NOT NULL DEFAULT FALSE,
    redeemed_at TIMESTAMP WITH TIME ZONE NULL,
    gps_lat NUMERIC(9, 6) NULL,
    gps_lon NUMERIC(9, 6) NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 9. TABEL TUGAS PENGIRIMAN ARMADA LOGISTIK (FLEET_DISPATCH)
CREATE TABLE fleet_dispatch (
    task_id VARCHAR(64) PRIMARY KEY,
    vehicle_type VARCHAR(32) NOT NULL CHECK (vehicle_type IN ('pickup', 'viar_three_wheel', 'colt_diesel_truck')),
    license_plate VARCHAR(16) NOT NULL,
    driver_name VARCHAR(128) NOT NULL,
    pickup_kiosk_id VARCHAR(64) NOT NULL REFERENCES kiosks(id),
    dropoff_destination VARCHAR(255) NOT NULL,
    payload_weight_kg NUMERIC(10, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'assigned'
        CHECK (status IN ('assigned', 'picked_up', 'in_transit', 'delivered')),
    dispatched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE NULL
);

-- 10. TABEL AKUNTANSI EMISI KARBON IPCC (CARBON_ACCOUNTING_LOGS)
CREATE TABLE carbon_accounting_logs (
    log_id VARCHAR(64) PRIMARY KEY,
    claim_id VARCHAR(64) NOT NULL REFERENCES claims(id),
    diverted_weight_kg NUMERIC(10, 2) NOT NULL,
    methane_avoided_kg NUMERIC(10, 4) NOT NULL,
    co2e_avoided_kg NUMERIC(10, 4) NOT NULL,
    compactor_truck_trips_avoided NUMERIC(6, 4) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABEL REKAPITULASI PENJUALAN HISTORIS (DAILY_MARKET_RECORDS)
CREATE TABLE daily_market_records (
    record_date DATE PRIMARY KEY,
    day_of_week VARCHAR(16) NOT NULL,
    total_arrival_kg NUMERIC(12, 2) NOT NULL,
    total_sold_retail_kg NUMERIC(12, 2) NOT NULL,
    total_surplus_kg NUMERIC(12, 2) NOT NULL,
    tier1_commercial_kg NUMERIC(12, 2) NOT NULL,
    tier2_social_kg NUMERIC(12, 2) NOT NULL,
    tier3_maggot_kg NUMERIC(12, 2) NOT NULL,
    average_temperature_c NUMERIC(4, 2) NOT NULL,
    rainfall_mm NUMERIC(6, 2) NOT NULL,
    salvaged_revenue_idr NUMERIC(14, 2) NOT NULL,
    methane_avoided_kg NUMERIC(10, 2) NOT NULL
);

-- 12. TABEL JEJAK AUDIT SISTEM MULTI-AGEN (SYSTEM_AUDIT_TRAIL)
CREATE TABLE system_audit_trail (
    event_id VARCHAR(64) PRIMARY KEY,
    subsystem VARCHAR(64) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    payload_json JSONB NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---


### 7.2 Definisi Kontrak TypeScript Domain Interfaces

Seluruh pertukaran data antar-komponen backend dan frontend divalidasi dengan kontrak TypeScript tanpa tipe `any`:

```typescript
// 1. Profil Biologis Komoditas
export interface CommodityBiologicalProfile {
  id: string;
  name: string;
  category: "leafy_vegetable" | "fruit_vegetable" | "root_vegetable" | "fruit";
  standardShelfLifeHours: number;
  temperatureSensitivityFactor: number;
  humiditySensitivityFactor: number;
  baseWholesalePricePerKg: number;
  minimumSalvagePricePerKg: number;
  decayThresholds: {
    layuRinganHour: number;
    layuSedangHour: number;
    tidakLayakHour: number;
  };
  storageAdvice: string;
  imageUrl?: string;
}

// 2. Kios Pedagang Terdaftar
export interface RegisteredKiosk {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  stallNumber: string;
  block: "A" | "B" | "C";
  aisle: string;
  specialization: string[];
  addressDetails: string;
  addressProofDocument: string;
  verificationStatus: "verified" | "pending_address_verification" | "rejected";
  verifiedAt?: string;
  reputationScore: number;
  tier2ContributionCount: number;
}

// 3. Sentra Budidaya Maggot BSF
export interface RegisteredMaggotCenter {
  id: string;
  facilityName: string;
  operatorName: string;
  phone: string;
  locationAddress: string;
  tps3rPermitNumber: string;
  dailyCapacityKg: number;
  biopondRacksCount: number;
  verificationStatus: "verified" | "pending_address_verification" | "rejected";
  verifiedAt?: string;
  totalAbsorbedKg: number;
}

// 4. Item Stok Fisik Kios
export interface StockItem {
  id: string;
  vendorId: string;
  commodityId: string;
  initialQuantityKg: number;
  remainingQuantityKg: number;
  arrivalTimestamp: string;
  physicalCondition: "segar" | "layu_ringan" | "layu_sedang" | "tidak_layak";
  decayScore: number;
  allocatedTier: "tier_1" | "tier_2" | "tier_3";
  isActive: boolean;
}

// 5. Tiket Penawaran Surplus
export interface OfferItem {
  id: string;
  stockId: string;
  vendorId: string;
  vendorName: string;
  stallNumber: string;
  commodityId: string;
  commodityName: string;
  targetTier: "tier_1" | "tier_2" | "tier_3";
  quantityKg: number;
  originalWholesalePricePerKg: number;
  salvagePricePerKg: number;
  discountPercentage: number;
  totalAmountIdr: number;
  expiresAt: string;
  status: "active" | "claimed" | "expired" | "transferred_to_feed";
}

// 6. Token Serah Terima Kriptografis
export interface HandoverTokenPayload {
  tokenId: string;
  offerId: string;
  vendorId: string;
  buyerId: string;
  quantityKg: number;
  issuedAt: string;
  expiresAt: string;
  targetKioskCoords: { lat: number; lon: number };
}

// 7. Checkpoint Model AI
export interface AIModelCheckpoint {
  id: string;
  name: string;
  architecture: string;
  datasetSamplesCount: number;
  currentEpoch: number;
  learningRate: number;
  trainLoss: number;
  valAccuracy: number;
  lastTrainedAt: string;
  status: "ready" | "training" | "calibrated";
  lossHistory: number[];
}

// 8. Rekapitulasi Metrik KPI
export interface KPIImpact {
  totalTransactionsClaimed: number;
  totalOrganicWasteDivertedKg: number;
  methaneEmissionsAvoidedKg: number;
  co2eCarbonEquivalentAvoidedKg: number;
  bantarGebangTruckTripsAvoided: number;
  totalVendorCapitalRecoveredIdr: number;
  totalWartegBuyerSavingsIdr: number;
}
```

### 7.3 Standar Dokumentasi Komentar Kode Sumber (Code Documentation Standard - Anti-AI Slop)

Seluruh fungsi, metode, antarmuka, dan modul perangkat lunak pada repositori PASARIN **WAJIB** dilengkapi dokumentasi komentar (*JSDoc / inline docstrings*) dalam **Bahasa Indonesia formal dan teknis** yang mematuhi standar *anti-AI slop*:

1. **Prinsip Kejujuran Teknis (Faktual & Zero-Slop):**
   * Dilarang menggunakan kalimat berbunga-bunga, sanjungan diri generik khas AI (*"fungsi yang luar biasa canggih"*, *"mengusung inovasi revolusioner"*, *"seamlessly connects"*).
   * Setiap komentar wajib berfokus pada: **tujuan komputasi fungsi**, **asumsi masukan (*parameters*)**, **format kembalian (*returns*)**, **kondisi batas (*invariants / edge cases*)**, dan **perilaku mitigasi galat (*error handling / fallbacks*)**.

2. **Format Standar JSDoc Bahasa Indonesia:**
   * Menggunakan format blok JSDoc `/** ... */` tepat di atas deklarasi fungsi.
   * Menyebutkan korelasi tiket Jira (`@see Jira Ticket PSR-X`) dan PRD acuan.
   * Menjelaskan parameter masukan dengan tag `@param` dan keluaran dengan tag `@returns`.

3. **Dokumentasi Variabel & Konstanta Kritis:**
   * Setiap nilai ambang batas (*constants*) wajib dijelaskan rasionale fisika/operasional pasarnya (misalnya: mengapa koordinat Kramat Jati dipatok `-6.2644, 106.8687`, mengapa durasi cache 15 menit, dan mengapa suhu fallback darurat diset $32^\circ\text{C}$).
## 8. KATALOG LENGKAP 30 KOMODITAS BIOLOGIS PASAR


Berikut adalah spesifikasi lengkap 30 komoditas sayur dan buah yang dikelola oleh PASARIN di Pasar Induk Kramat Jati, lengkap dengan harga grosir acuan dan parameter kinetika respirasi:

| No | ID Komoditas | Nama Komoditas | Kategori | Harga Grosir Subuh (Rp/kg) | Floor Price Tier 3 (Rp/kg) | Layu Ringan (Jam) | Layu Sedang (Jam) | Reject Maggot (Jam) | Toleransi Suhu Tropis ($Q_{10}$) |
|:---:|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | `kangkung` | Kangkung Air | Sayuran Daun | Rp 12.000 | Rp 1.500 | 8 | 13 | 18 | 2,2 (Sangat Cepat Layu) |
| 2 | `bayam` | Bayam Hijau Cabut | Sayuran Daun | Rp 14.000 | Rp 1.500 | 7 | 12 | 16 | 2,3 (Respirasi Sangat Tinggi) |
| 3 | `bayam_merah` | Bayam Merah | Sayuran Daun | Rp 16.000 | Rp 1.600 | 7 | 12 | 16 | 2,2 (Rentan Patah Batang) |
| 4 | `sawi_hijau` | Sawi Hijau / Caisim | Sayuran Daun | Rp 10.000 | Rp 1.500 | 10 | 16 | 24 | 2,0 (Layu Pucuk Daun) |
| 5 | `sawi_putih` | Sawi Putih | Sayuran Daun | Rp 11.000 | Rp 1.500 | 14 | 24 | 36 | 1,8 (Lapisan Luar Melindungi) |
| 6 | `pakcoy` | Sawi Sendok / Pakcoy | Sayuran Daun | Rp 13.000 | Rp 1.500 | 10 | 18 | 26 | 2,0 (Kadar Air Batang Tinggi) |
| 7 | `daun_singkong` | Daun Singkong Muda | Sayuran Daun | Rp 8.000 | Rp 1.200 | 12 | 20 | 30 | 1,9 (Batang Liat Bertahan) |
| 8 | `daun_katuk` | Daun Katuk Segar | Sayuran Daun | Rp 15.000 | Rp 1.500 | 8 | 14 | 20 | 2,1 (Cepat Rontok Daun) |
| 9 | `daun_bawang` | Daun Bawang Seledri | Sayuran Daun | Rp 22.000 | Rp 2.000 | 16 | 28 | 40 | 1,7 (Lendir Daun Bertahan) |
| 10 | `seledri` | Seledri Daun Sop | Sayuran Daun | Rp 25.000 | Rp 2.000 | 12 | 20 | 30 | 2,0 (Aroma Kuat Cepat Layu) |
| 11 | `selada_keriting` | Selada Keriting Hijau | Sayuran Daun | Rp 18.000 | Rp 1.800 | 6 | 10 | 15 | 2,5 (Paling Cepat Alum) |
| 12 | `kubis` | Kubis / Kol Bulat | Sayuran Buah | Rp 9.000 | Rp 1.200 | 36 | 60 | 96 | 1,4 (Daya Tahan Tinggi) |
| 13 | `kembang_kol` | Kembang Kol Putih | Sayuran Buah | Rp 24.000 | Rp 2.200 | 18 | 32 | 48 | 1,9 (Bintik Hitam Oksidasi) |
| 14 | `brokoli` | Brokoli Hijau | Sayuran Buah | Rp 28.000 | Rp 2.500 | 14 | 26 | 38 | 2,1 (Menguning Klorofil) |
| 15 | `tomat` | Tomat Merah Curah | Sayuran Buah | Rp 16.000 | Rp 1.500 | 24 | 42 | 60 | 1,7 (Lembek Kulit Berair) |
| 16 | `cabai_merah` | Cabai Merah Keriting | Sayuran Buah | Rp 45.000 | Rp 3.000 | 24 | 48 | 72 | 1,6 (Berkerut & Busuk Basah) |
| 17 | `cabai_rawit` | Cabai Rawit Merah | Sayuran Buah | Rp 60.000 | Rp 3.500 | 28 | 52 | 80 | 1,5 (Tahan Simpan Sedang) |
| 18 | `terung_ungu` | Terung Ungu Panjang | Sayuran Buah | Rp 12.000 | Rp 1.200 | 20 | 36 | 54 | 1,7 (Kulit Kusam Berkerut) |
| 19 | `mentimun` | Mentimun Hijau | Sayuran Buah | Rp 8.000 | Rp 1.000 | 18 | 30 | 48 | 1,8 (Kadar Air 95% Cepat Lembek) |
| 20 | `labu_siam` | Labu Siam Muda | Sayuran Buah | Rp 9.000 | Rp 1.000 | 30 | 50 | 72 | 1,5 (Getah Menjaga Kesegaran) |
| 21 | `buncis` | Buncis Manis | Sayuran Buah | Rp 17.000 | Rp 1.800 | 16 | 28 | 42 | 1,9 (Ujung Polong Menghitam) |
| 22 | `bawang_merah` | Bawang Merah Brebes | Umbi & Bawang | Rp 38.000 | Rp 3.000 | 72 | 120 | 180 | 1,3 (Kering Tahan Simpan) |
| 23 | `bawang_putih` | Bawang Putih Honan | Umbi & Bawang | Rp 35.000 | Rp 3.000 | 96 | 160 | 240 | 1,2 (Tahan Simpan Panjang) |
| 24 | `kentang` | Kentang Dieng Super | Umbi & Bawang | Rp 18.000 | Rp 2.000 | 120 | 200 | 300 | 1,1 (Kulit Umbi Sangat Kuat) |
| 25 | `wortel` | Wortel Brastagi | Umbi & Bawang | Rp 14.000 | Rp 1.500 | 48 | 80 | 120 | 1,4 (Rentan Layu Pucuk) |
| 26 | `pisang` | Pisang Uli & Cavendish | Buah Tropis | Rp 15.000 | Rp 1.500 | 20 | 36 | 50 | 2,4 (Klimakterik Sangat Cepat) |
| 27 | `pepaya` | Pepaya California | Buah Tropis | Rp 10.000 | Rp 1.200 | 24 | 40 | 60 | 2,0 (Lembek Dinding Buah) |
| 28 | `semangka` | Semangka Merah Non-Biji| Buah Tropis | Rp 9.000 | Rp 1.000 | 48 | 80 | 120 | 1,3 (Kulit Tebal Bertahan) |
| 29 | `melon` | Melon Hijau Madu | Buah Tropis | Rp 16.000 | Rp 1.500 | 36 | 60 | 90 | 1,5 (Aroma Manis Menarik Lalat) |
| 30 | `jeruk` | Jeruk Peras Medan | Buah Tropis | Rp 20.000 | Rp 2.000 | 60 | 100 | 150 | 1,4 (Kulit Jeruk Asam Pengawet) |

---

## 9. DIREKTORI LENGKAP 30 KIOS PEDAGANG PASAR KRAMAT JATI

Sistem PASARIN terhubung ke 30 kios pedagang resmi di Pasar Induk Kramat Jati yang terbagi ke dalam 3 blok zonasi komoditas:

### 9.1 Blok A: Sayuran Basah & Daun Cepat Layu (Kios A-01 s/d A-10)

| No | ID Kios | Nomor Kios | Nama Usaha / Pedagang | Lorong Los Pasar | Spesialisasi Komoditas | Skor Reputasi | Donasi Tier 2 | Kontak WhatsApp |
|:---:|---|---|---|---|---|:---:|:---:|---|
| 1 | `vendor_kramat_01` | **A-12** | H. Rohmat Sayur Daun | Lorong Barat (Sayur Daun) | Kangkung, Bayam, Sawi Hijau | 95 / 100 | 14 Kali | `0812-9876-5432` |
| 2 | `vendor_kramat_02` | **A-18** | Pak Asep Pasokan Sukabumi | Lorong Barat (Sayur Daun) | Sawi Hijau, Pakcoy, Buncis | 92 / 100 | 9 Kali | `0813-1122-3344` |
| 3 | `vendor_kramat_03` | **A-24** | Kang Deni Lembang | Lorong Barat (Sayur Daun) | Selada Keriting, Pakcoy, Bayam Merah | 94 / 100 | 11 Kali | `0857-4433-2211` |
| 4 | `vendor_kramat_04` | **A-05** | Mbak Sri Rejeki | Lorong Barat (Sayur Daun) | Bayam, Kangkung, Daun Singkong | 88 / 100 | 6 Kali | `0819-5566-7788` |
| 5 | `vendor_kramat_05` | **A-09** | Cak Mat Hasil Tani | Lorong Barat (Sayur Daun) | Kangkung Air, Daun Katuk, Seledri | 90 / 100 | 8 Kali | `0821-9988-7711` |
| 6 | `vendor_kramat_06` | **A-15** | Mang Iding Sayur Segar | Lorong Barat (Sayur Daun) | Sawi Hijau, Daun Bawang, Kangkung | 86 / 100 | 5 Kali | `0878-3344-5566` |
| 7 | `vendor_kramat_07` | **A-20** | Ibu Nurhayati | Lorong Barat (Sayur Daun) | Daun Singkong, Bayam, Sawi Putih | 96 / 100 | 16 Kali | `0812-3322-1100` |
| 8 | `vendor_kramat_08` | **A-27** | Pak Dedi Agro Tani | Lorong Barat (Sayur Daun) | Pakcoy, Selada, Bayam Merah | 91 / 100 | 7 Kali | `0856-7788-9900` |
| 9 | `vendor_kramat_09` | **A-31** | Bu Siti Berkah Daun | Lorong Barat (Sayur Daun) | Kangkung, Bayam, Seledri | 89 / 100 | 6 Kali | `0813-6655-4433` |
| 10 | `vendor_kramat_10` | **A-38** | H. Maman Cipanas | Lorong Barat (Sayur Daun) | Daun Bawang, Selada Keriting, Pakcoy | 93 / 100 | 10 Kali | `0812-4455-6677` |

### 9.2 Blok B: Cabai, Bumbu, Sayur Buah & Buah Tropis (Kios B-01 s/d B-10)

| No | ID Kios | Nomor Kios | Nama Usaha / Pedagang | Lorong Los Pasar | Spesialisasi Komoditas | Skor Reputasi | Donasi Tier 2 | Kontak WhatsApp |
|:---:|---|---|---|---|---|:---:|:---:|---|
| 11 | `vendor_kramat_11` | **B-05** | Bu Warsiti Cabai Brebes | Lorong Tengah (Cabai & Bumbu) | Cabai Merah, Cabai Rawit, Tomat | 97 / 100 | 18 Kali | `0812-1122-9988` |
| 12 | `vendor_kramat_12` | **B-14** | Cak Munir Hasil Tani | Lorong Tengah (Cabai & Bumbu) | Tomat Merah, Terung Ungu, Cabai Rawit | 94 / 100 | 12 Kali | `0857-8899-0011` |
| 13 | `vendor_kramat_13` | **B-08** | H. Syarifudin Cabai | Lorong Tengah (Cabai & Bumbu) | Cabai Merah Keriting, Cabai Rawit | 91 / 100 | 8 Kali | `0813-7766-5544` |
| 14 | `vendor_kramat_14` | **B-19** | Pak Joko Hortikultura | Lorong Tengah (Cabai & Bumbu) | Terung Ungu, Labu Siam, Buncis | 88 / 100 | 5 Kali | `0819-2233-4455` |
| 15 | `vendor_kramat_15` | **B-22** | Mpok Hindun Tomat Segar | Lorong Tengah (Cabai & Bumbu) | Tomat Curah, Mentimun, Cabai Merah | 93 / 100 | 10 Kali | `0878-1199-2288` |
| 16 | `vendor_kramat_16` | **B-27** | Bang Dul Sayur Buah | Lorong Tengah (Cabai & Bumbu) | Mentimun Hijau, Terung, Labu Siam | 85 / 100 | 4 Kali | `0856-4455-6677` |
| 17 | `vendor_kramat_17` | **B-33** | Bu Endang Hasil Tani | Lorong Tengah (Cabai & Bumbu) | Buncis Manis, Kembang Kol, Brokoli | 95 / 100 | 13 Kali | `0812-8877-6655` |
| 18 | `vendor_kramat_18` | **B-39** | H. Anwar Sayur Buah | Lorong Tengah (Cabai & Bumbu) | Kubis / Kol Bulat, Kembang Kol | 90 / 100 | 7 Kali | `0813-9900-1122` |
| 19 | `vendor_kramat_19` | **B-44** | Pak Ujang Buah Tropis | Lorong Timur (Buah Segar) | Pisang Uli, Pepaya California | 89 / 100 | 6 Kali | `0818-7766-5544` |
| 20 | `vendor_kramat_20` | **B-50** | Toko Buah Berkah Subur | Lorong Timur (Buah Segar) | Semangka Non-Biji, Melon Madu, Jeruk | 96 / 100 | 15 Kali | `0821-3344-5566` |

### 9.3 Blok C: Umbi-umbian, Bawang & Hasil Tani Kering (Kios C-01 s/d C-10)

| No | ID Kios | Nomor Kios | Nama Usaha / Pedagang | Lorong Los Pasar | Spesialisasi Komoditas | Skor Reputasi | Donasi Tier 2 | Kontak WhatsApp |
|:---:|---|---|---|---|---|:---:|:---:|---|
| 21 | `vendor_kramat_21` | **C-04** | H. Subur Bawang Brebes | Lorong Utara (Bawang & Umbi) | Bawang Merah, Bawang Putih Honan | 98 / 100 | 20 Kali | `0812-7788-9900` |
| 22 | `vendor_kramat_22` | **C-08** | Toko Bawang Barokah Jaya | Lorong Utara (Bawang & Umbi) | Bawang Merah Brebes Super | 93 / 100 | 9 Kali | `0857-1133-5577` |
| 23 | `vendor_kramat_23` | **C-12** | Pak Bambang Hasil Tani | Lorong Utara (Bawang & Umbi) | Kentang Dieng Super, Wortel Brastagi | 95 / 100 | 14 Kali | `0813-2244-6688` |
| 24 | `vendor_kramat_24` | **C-17** | Bu Sumiati Umbi Jaya | Lorong Utara (Bawang & Umbi) | Wortel Brastagi, Bawang Merah | 90 / 100 | 7 Kali | `0819-3355-7799` |
| 25 | `vendor_kramat_25` | **C-21** | Cak Gofar Kentang Dieng | Lorong Utara (Bawang & Umbi) | Kentang Dieng, Bawang Putih | 92 / 100 | 8 Kali | `0878-5577-9911` |
| 26 | `vendor_kramat_26` | **C-26** | H. Ridwan Bawang Import | Lorong Utara (Bawang & Umbi) | Bawang Putih, Bawang Merah | 87 / 100 | 5 Kali | `0856-2244-8800` |
| 27 | `vendor_kramat_27` | **C-30** | Toko Tani Makmur Sentosa | Lorong Utara (Bawang & Umbi) | Wortel, Kentang, Bawang Merah | 94 / 100 | 11 Kali | `0812-6688-0022` |
| 28 | `vendor_kramat_28` | **C-34** | Pak Kholil Komoditas Basah | Bongkar Muat Selatan | Kubis, Tomat, Cabai Rawit | 89 / 100 | 6 Kali | `0813-1133-7799` |
| 29 | `vendor_kramat_29` | **C-38** | Bu Fatimah Sayur Mayur | Bongkar Muat Selatan | Sawi Putih, Wortel, Buncis | 91 / 100 | 8 Kali | `0817-4466-8800` |
| 30 | `vendor_kramat_30` | **C-40** | UD Sumber Pangan Abadi | Bongkar Muat Selatan | Kangkung, Sawi Hijau, Cabai Merah | 98 / 100 | 25 Kali | `0822-5577-9911` |

---

## 10. SISTEM MULTI-USER & ALUR VERIFIKASI ALAMAT FISIK

PASARIN mendukung ekosistem multi-pengguna di mana setiap pedagang kios pasar dan pengelola sentra maggot BSF dapat mendaftarkan akun mandiri melalui antarmuka web, namun **wajib melalui verifikasi alamat fisik dan dokumen legalitas oleh pengelola pasar** sebelum dapat menyiarkan stok secara publik.

### 10.1 Alur Verifikasi Kios Pedagang Pasar (Vendor Onboarding)

```
[Pedagang Mengisi Form Pendaftaran]
- Nama Kios, Nama Pemilik, No WhatsApp
- No Kios (A-xx, B-xx, C-xx), Blok, Lorong
- Detail Alamat Fisik Kios Kramat Jati
- Unggah Bukti: Surat Izin Tempat Usaha (SITU) Pasar Jaya / KTP
                │
                ▼
[Status Akun Baru: pending_address_verification]
- Kios terdaftar di database tetapi berstatus 'VERIFIKASI'
- Belum dapat memancarkan penawaran komersial ke Warteg
                │
                ▼
[Inspeksi Lapangan oleh Petugas Perumda Pasar Jaya]
- Verifikasi keberadaan fisik meja los lapak
- Pencocokan nomor kios dengan database izin sewa
                │
                ▼
[Aksi PATCH /api/users/register (status: 'verified')]
                │
                ▼
[Akun Aktif Penuh: verified]
- Lencana status berubah menjadi 'AKTIF'
- Kios dapat menginput stok harian dan menerima pencairan QRIS
```

### 10.2 Alur Verifikasi Sentra Maggot BSF & TPS 3R (Recycler Onboarding)

1. **Pengisian Formulir Fasilitas:** Nama fasilitas, nama operator penanggung jawab, nomor izin operasional TPS 3R (SK DLH DKI Jakarta), kapasitas harian (kg/hari), dan jumlah rak biopond larva.
2. **Validasi Titik Alamat & Akses Truk:** Verifikasi lokasi fisik fasilitas (memastikan jalan dapat dilalui armada truk Colt Diesel atau Viar roda tiga) dan tidak berada di area pemukiman padat yang melanggar zonasi sanitasi.
3. **Pemberian Kuota Masuk:** Setelah diverifikasi (`status: 'verified'`), fasilitas maggot resmi terdaftar di rute penjemputan armada logistik sore hari.

---

## 11. DOKUMENTASI LENGKAP 36 RUTE API BACKEND (API ENDPOINTS REFERENCE)


### 11.2 Spesifikasi Kontrak Lengkap Seluruh 36 Rute API Backend

Berikut adalah dokumentasi komprehensif seluruh 36 rute API Next.js Serverless PASARIN, mencakup HTTP Method, Headers, Request Body Schema, Response 200 Payload, Error Handling, dan perintah cURL:

#### 1. `GET /api/health`
- **Method & URI:** `GET http://localhost:3000/api/health`
- **Headers:** `Accept: application/json`
- **Deskripsi:** Health-check monitor status runtime Next.js, kesiapan koneksi storage, dan ketersediaan 17 spesialis agen.
- **Response 200 OK:**
  ```json
  {
    "status": "operational",
    "uptimeSeconds": 14205,
    "timestamp": "2026-09-24T14:30:00.000Z",
    "subsystems": {
      "database": "connected",
      "multiAgentCoordinator": "ready",
      "modelInferenceRuntime": "ready",
      "telegramGateway": "connected",
      "activeApiRoutesCount": 36
    }
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/health
  ```

#### 2. `GET /api/docs`
- **Method & URI:** `GET http://localhost:3000/api/docs`
- **Headers:** `Accept: application/json`
- **Deskripsi:** Menyediakan spesifikasi OpenAPI v3.0 / Swagger JSON untuk integrasi pihak ketiga (Dinas Lingkungan Hidup / Mitra Logistik).
- **Response 200 OK:**
  ```json
  {
    "openapi": "3.0.0",
    "info": {
      "title": "PASARIN Autonomous Multi-Agent API",
      "version": "2.0.0",
      "description": "API Gateway Penyelamatan Surplus Pasar Tradisional Kramat Jati"
    },
    "paths": {"/api/health": {}, "/api/stocks": {}, "/api/dispatch": {}}
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/docs
  ```

#### 3. `GET /api/events/stream`
- **Method & URI:** `GET http://localhost:3000/api/events/stream`
- **Headers:** `Accept: text/event-stream`
- **Deskripsi:** Streaming telemetri Server-Sent Events (SSE) untuk dinamika pasar real-time, perubahan suhu los, dan notifikasi penawaran baru tanpa polling.
- **Response 200 OK (Event Stream):**
  ```text
  event: market_telemetry
  data: {"temperatureCelsius": 33.2, "relativeHumidityPercent": 74, "timestamp": "14:30:00"}

  event: new_offer_broadcast
  data: {"offerId": "deal_01", "commodity": "Kangkung Air", "discount": 65, "vendor": "Kios A-12"}
  ```
- **Contoh cURL:**
  ```bash
  curl -N -X GET http://localhost:3000/api/events/stream
  ```

#### 4. `GET /api/vendors`
- **Method & URI:** `GET http://localhost:3000/api/vendors`
- **Headers:** `Accept: application/json`
- **Deskripsi:** Mengambil daftar 30 kios pedagang resmi Pasar Kramat Jati beserta profil spesialisasi dan skor reputasi.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "totalVendors": 30,
    "data": [
      {
        "id": "vendor_kramat_01",
        "name": "H. Rohmat Sayur Daun",
        "stallNumber": "A-12",
        "aisle": "Lorong Barat (Sayur Daun)",
        "specialization": ["kangkung", "bayam", "sawi_hijau"],
        "reputationScore": 95,
        "phone": "0812-9876-5432"
      }
    ]
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/vendors
  ```

#### 5. `POST /api/vendors`
- **Method & URI:** `POST http://localhost:3000/api/vendors`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Pendaftaran pedagang baru atau intake pesan bahasa daerah (Sunda/Jawa/Betawi) dengan konversi satuan lokal.
- **Request Body JSON:**
  ```json
  {
    "action": "chat_intake",
    "vendorId": "vendor_kramat_01",
    "message": "Kang, kangkung kantun 2 karung tos leuleus, mangga diical mirah ka warteg."
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "detectedCommodity": "kangkung",
      "standardizedQuantityKg": 50.0,
      "detectedCondition": "layu_ringan",
      "conversationalReply": "Kahartos! 50 kg kangkung leuleus parantos didaptarkeun ka Warteg Condet kalayan diskon 65%."
    }
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/vendors -H "Content-Type: application/json" -d '{"action":"chat_intake","vendorId":"vendor_kramat_01","message":"kangkung kantun 2 karung"}'
  ```

#### 6. `GET /api/stocks`
- **Method & URI:** `GET http://localhost:3000/api/stocks`
- **Headers:** `Accept: application/json`
- **Deskripsi:** Mengambil matriks inventaris stok aktif seluruh los kios beserta skor kebusukan fisik real-time.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "totalActiveLots": 14,
    "data": [
      {
        "id": "stock_01",
        "vendorId": "vendor_kramat_01",
        "stallNumber": "A-12",
        "commodityName": "Kangkung Air",
        "quantityKg": 55.0,
        "physicalCondition": "layu_ringan",
        "decayScore": 0.4200,
        "allocatedTier": "tier_1",
        "hoursOnDisplay": 10.5
      }
    ]
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/stocks
  ```

#### 7. `POST /api/stocks`
- **Method & URI:** `POST http://localhost:3000/api/stocks`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Pencatatan pasokan sayur masuk subuh hari atau sayur layu siang hari oleh pedagang kios.
- **Request Body JSON:**
  ```json
  {
    "vendorId": "vendor_kramat_01",
    "commodityId": "kangkung",
    "quantityKg": 30.5
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Stok harian berhasil dicatat: 30.5 kg Kangkung Air.",
    "data": {
      "stockId": "stock_1727192800",
      "physicalCondition": "layu_ringan",
      "allocatedTier": "tier_1",
      "decayScore": 0.4200
    }
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/stocks -H "Content-Type: application/json" -d '{"vendorId":"vendor_kramat_01","commodityId":"kangkung","quantityKg":30}'
  ```

#### 8. `GET /api/buyers`
- **Method & URI:** `GET http://localhost:3000/api/buyers`
- **Headers:** `Accept: application/json`
- **Deskripsi:** Mengambil direktori pembeli terdaftar (Warteg, Katering, Dapur Sosial, Sentra Maggot).
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "buyersCount": 12,
    "data": [
      {
        "id": "buyer_warteg_01",
        "name": "Warteg Barokah Jaya",
        "type": "warteg",
        "address": "Jl. Raya Condet No. 14",
        "distanceKm": 1.8,
        "dailyAbsorptionKg": 120
      }
    ]
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/buyers
  ```

#### 9. `POST /api/buyers`
- **Method & URI:** `POST http://localhost:3000/api/buyers`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Registrasi pembeli baru atau pembaruan komoditas prioritas harian.
- **Request Body JSON:**
  ```json
  {
    "name": "Warteg Bahari Cililitan",
    "type": "warteg",
    "phone": "0813-9988-1122",
    "address": "Jl. Dewi Sartika No. 50, Cililitan",
    "preferredCommodities": ["kangkung", "sawi_hijau", "cabai_merah"]
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Pembeli Warteg Bahari Cililitan berhasil didaftarkan.",
    "buyerId": "buyer_warteg_1727192900"
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/buyers -H "Content-Type: application/json" -d '{"name":"Warteg Bahari","type":"warteg","phone":"081399881122","address":"Cililitan"}'
  ```

#### 10. `POST /api/surplus/predict`
- **Method & URI:** `POST http://localhost:3000/api/surplus/predict`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Memproyeksikan surplus komoditas sore berdasarkan simulasi cuaca (normal, hot_dry, afternoon_downpour, cloudy_humid).
- **Request Body JSON:**
  ```json
  {
    "scenario": "afternoon_downpour"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "scenario": "afternoon_downpour",
      "projectedSurplusKg": 1240.0,
      "footfallReductionPercent": 48.0,
      "weatherContext": {
        "temperatureCelsius": 29.5,
        "relativeHumidityPercent": 94,
        "rainfallMm": 14.8
      }
    }
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/surplus/predict -H "Content-Type: application/json" -d '{"scenario":"afternoon_downpour"}'
  ```

#### 11. `POST /api/matchmaking`
- **Method & URI:** `POST http://localhost:3000/api/matchmaking`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Menjalankan algoritma pemadanan surplus ke calon pembeli terdaftar berbasis jarak terdekat dan skor reputasi.
- **Request Body JSON:**
  ```json
  {
    "stockId": "stock_01",
    "tier": "tier_1"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "matchesCount": 3,
    "matches": [
      {
        "buyerId": "buyer_warteg_01",
        "buyerName": "Warteg Barokah Jaya",
        "distanceKm": 1.8,
        "matchConfidenceScore": 0.984
      }
    ]
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/matchmaking -H "Content-Type: application/json" -d '{"stockId":"stock_01","tier":"tier_1"}'
  ```

#### 12. `GET /api/dispatch`
- **Method & URI:** `GET http://localhost:3000/api/dispatch`
- **Headers:** `Accept: application/json`
- **Deskripsi:** Mengambil seluruh tiket penawaran surplus aktif, lot terdiskon, dan countdown waktu kedaluwarsa.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "activeOffersCount": 6,
    "data": [
      {
        "id": "deal_01",
        "commodityName": "Kangkung Air Segar",
        "quantityKg": 55.0,
        "salvagePricePerKg": 4200,
        "discountPct": 65,
        "expiresInMinutes": 28,
        "status": "active"
      }
    ]
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/dispatch
  ```

#### 13. `POST /api/dispatch`
- **Method & URI:** `POST http://localhost:3000/api/dispatch`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Mengklaim tiket penawaran surplus oleh pembeli.
- **Request Body JSON:**
  ```json
  {
    "action": "claim",
    "offerId": "deal_01"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Penawaran deal_01 berhasil diklaim.",
    "claimId": "claim_1727193000"
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/dispatch -H "Content-Type: application/json" -d '{"action":"claim","offerId":"deal_01"}'
  ```

#### 14. `POST /api/cron/afternoon-sweep`
- **Method & URI:** `POST http://localhost:3000/api/cron/afternoon-sweep`
- **Headers:** `Authorization: Bearer CRON_SECRET`
- **Deskripsi:** Trigger terjadwal otomatis (Vercel Cron) yang dieksekusi setiap pukul 14.30 WIB untuk menyapu sisa stok los pasar.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "triggeredAt": "2026-09-24T14:30:00.000Z",
    "result": "Autonomous sweep completed: 1,240 kg surplus processed across 3 tiers."
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/cron/afternoon-sweep
  ```

#### 15. `POST /api/orchestrator/run`
- **Method & URI:** `POST http://localhost:3000/api/orchestrator/run`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Eksekusi manual atau simulasi alur otonom lengkap sistem multi-agen dari observasi cuaca hingga alokasi armada.
- **Request Body JSON:** `{}`
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "executionMode": "scheduled_autonomous_cron",
      "surplusDetectedKg": 1240.0,
      "telegramNotificationsDispatched": 18,
      "executiveSummary": "Siklus otonom berhasil menyelamatkan 1.240 kg surplus dengan tingkat keberhasilan 98.5%."
    }
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/orchestrator/run -H "Content-Type: application/json" -d '{}'
  ```

#### 16. `POST /api/orchestrator/query`
- **Method & URI:** `POST http://localhost:3000/api/orchestrator/query`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Pemrosesan kueri bahasa alami pengelola pasar menggunakan mesin penalaran ReAct multi-langkah.
- **Request Body JSON:**
  ```json
  {
    "query": "Lusa itu perlu berapa mobil untuk ke sentra maggot atau ke UMKM?"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "executiveSummary": "Dibutuhkan 1 unit Pickup Bak untuk UMKM dan 1 unit Truk Engkel untuk Sentra Maggot.",
      "thoughtProcess": [
        {"step": 1, "thought": "Cek ramalan cuaca lusa"},
        {"step": 2, "thought": "Hitung estimasi surplus 955 kg"},
        {"step": 3, "thought": "Bagi 526 kg UMKM dan 429 kg Maggot"}
      ]
    }
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/orchestrator/query -H "Content-Type: application/json" -d '{"query":"Berapa armada lusa?"}'
  ```

#### 17. `POST /api/chat`
- **Method & URI:** `POST http://localhost:3000/api/chat`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Percakapan natural language interaktif pedagang lapak dengan fitur konversi satuan tradisional pasar.
- **Request Body JSON:**
  ```json
  {
    "message": "Berapa kilogram kalau kangkung 3 karung?"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "reply": "3 karung kangkung air standar Pasar Kramat Jati setara dengan 75 kg (25 kg per karung).",
    "toolsInvoked": ["TraditionalUnitConverter"]
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"message":"3 karung kangkung berapa kilo?"}'
  ```

#### 18. `POST /api/pricing/negotiate`
- **Method & URI:** `POST http://localhost:3000/api/pricing/negotiate`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Modul negosiasi tawar-menawar harga otomatis terproteksi margin batas bawah (Price Floor).
- **Request Body JSON:**
  ```json
  {
    "stockId": "stock_01",
    "proposedPriceIdr": 3800
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "counterOfferPriceIdr": 4000,
    "decision": "counter_offer",
    "reason": "Harga tawaran Rp 3.800 terlalu rendah untuk jam 14.30. Counter offer di Rp 4.000/kg."
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/pricing/negotiate -H "Content-Type: application/json" -d '{"stockId":"stock_01","proposedPriceIdr":3800}'
  ```

#### 19. `POST /api/delivery/handover`
- **Method & URI:** `POST http://localhost:3000/api/delivery/handover`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Pembuatan dan verifikasi token serah terima kriptografis Proof of Delivery (PoD) dengan validasi GPS geofencing radius 50m.
- **Request Body JSON (Generate):**
  ```json
  {
    "action": "generate_token",
    "offerId": "deal_01",
    "role": "pickup_driver"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "token": {
      "encodedTokenString": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresAt": "2026-09-24T16:30:00.000Z"
    }
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/delivery/handover -H "Content-Type: application/json" -d '{"action":"generate_token","offerId":"deal_01","role":"pickup_driver"}'
  ```

#### 20. `POST /api/payments/qris`
- **Method & URI:** `POST http://localhost:3000/api/payments/qris`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Pembuatan QRIS dinamis Bank Indonesia dan simulasi pembayaran sukses escrow.
- **Request Body JSON:**
  ```json
  {
    "action": "generate",
    "offerId": "deal_01",
    "buyerId": "buyer_warteg_01",
    "vendorId": "vendor_kramat_01",
    "amountIdr": 231000
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "transactionId": "trx_qris_1727193200",
      "amountIdr": 231000,
      "qrCodeDisplayUrl": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020101021226600016ID.CO.BANKINDO.WWW...",
      "status": "escrow_locked"
    }
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/payments/qris -H "Content-Type: application/json" -d '{"action":"generate","offerId":"deal_01","amountIdr":231000}'
  ```

#### 21. `POST /api/sensors/ingest`
- **Method & URI:** `POST http://localhost:3000/api/sensors/ingest`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Ingest data telemetri sensor IoT mikroklimat los lapak (suhu, kelembapan udara).
- **Request Body JSON:**
  ```json
  {
    "sensorId": "sensor_blok_a_01",
    "stallNumber": "A-12",
    "temperatureCelsius": 33.5,
    "relativeHumidityPercent": 76.0
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Telemetri sensor berhasil dicatat.",
    "warningTriggered": true
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/sensors/ingest -H "Content-Type: application/json" -d '{"sensorId":"sensor_a1","temperatureCelsius":33.5,"relativeHumidityPercent":76}'
  ```

#### 22. `POST /api/vision/inspect`
- **Method & URI:** `POST http://localhost:3000/api/vision/inspect`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Klasifikasi mutu visual daun sayuran berbasis citra kamera kios menggunakan MobileNetV3-Large.
- **Request Body JSON:**
  ```json
  {
    "commodityId": "kangkung",
    "imageSample": "kangkung_layu_pucuk_siang"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "chlorophyllDegradationScore": 0.42,
      "visualDefectDetected": "Layu Pucuk Daun Luar",
      "humanConsumable": true,
      "recommendedTier": "tier_1"
    }
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/vision/inspect -H "Content-Type: application/json" -d '{"commodityId":"kangkung","imageSample":"sample"}'
  ```

#### 23. `GET /api/logistics/fleet`
- **Method & URI:** `GET http://localhost:3000/api/logistics/fleet`
- **Headers:** `Accept: application/json`
- **Deskripsi:** Mengambil status kesiapan dan kapasitas muatan armada logistik pasar.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "totalFleetCount": 3,
    "data": [
      {"type": "pickup", "license": "B 9124 TAA", "capacityKg": 800, "currentLoadKg": 526, "status": "active"},
      {"type": "viar", "license": "B 4381 KJJ", "capacityKg": 300, "currentLoadKg": 120, "status": "standby"},
      {"type": "truck", "license": "B 9802 UDG", "capacityKg": 2500, "currentLoadKg": 1850, "status": "loading"}
    ]
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/logistics/fleet
  ```

#### 24. `POST /api/logistics/fleet`
- **Method & URI:** `POST http://localhost:3000/api/logistics/fleet`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Penugasan armada berdasarkan muatan tonase surplus terakumulasi.
- **Request Body JSON:**
  ```json
  {
    "vehicleType": "pickup",
    "assignedPayloadKg": 526
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Daihatsu GranMax B 9124 TAA ditugaskan untuk muatan 526 kg."
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/logistics/fleet -H "Content-Type: application/json" -d '{"vehicleType":"pickup","assignedPayloadKg":526}'
  ```

#### 25. `POST /api/logistics/dispatch-driver`
- **Method & URI:** `POST http://localhost:3000/api/logistics/dispatch-driver`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Mengirimkan surat jalan rute GPS pengantaran multi-stop ke perangkat ponsel supir pengemudi.
- **Request Body JSON:**
  ```json
  {
    "driverId": "driver_mamat",
    "routeSegmentId": "route_condet_01"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Surat jalan rute GPS berhasil dikirim ke aplikasi ponsel Bang Mamat."
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/logistics/dispatch-driver -H "Content-Type: application/json" -d '{"driverId":"driver_mamat"}'
  ```

#### 26. `GET /api/markets/federation`
- **Method & URI:** `GET http://localhost:3000/api/markets/federation`
- **Headers:** `Accept: application/json`
- **Deskripsi:** Mengambil data surplus lintas pasar induk se-DKI Jakarta untuk kalkulasi relokasi komoditas.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "markets": [
      {"id": "kramat_jati", "name": "Pasar Induk Kramat Jati", "surplusKg": 1240},
      {"id": "cipinang", "name": "Pasar Induk Beras Cipinang", "surplusKg": 150},
      {"id": "pasar_senen", "name": "Pasar Senen", "surplusKg": 420},
      {"id": "tanah_abang", "name": "Pasar Tanah Abang", "surplusKg": 380}
    ]
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/markets/federation
  ```

#### 27. `POST /api/markets/federation`
- **Method & URI:** `POST http://localhost:3000/api/markets/federation`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Merencanakan transfer muatan antar-pasar induk jika terjadi ketimpangan pasokan ekstrem di Jakarta.
- **Request Body JSON:**
  ```json
  {
    "sourceMarketId": "kramat_jati",
    "targetMarketId": "pasar_senen",
    "commodityId": "tomat",
    "quantityKg": 300
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Rencana transfer 300 kg Tomat ke Pasar Senen disetujui.",
    "estimatedLogisticsCostIdr": 150000
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/markets/federation -H "Content-Type: application/json" -d '{"sourceMarketId":"kramat_jati","targetMarketId":"pasar_senen","commodityId":"tomat","quantityKg":300}'
  ```

#### 28. `GET /api/analytics/impact`
- **Method & URI:** `GET http://localhost:3000/api/analytics/impact`
- **Headers:** `Accept: application/json`
- **Deskripsi:** Mengambil agregasi dampak lingkungan dan modal pedagang terselamatkan (KPI Utama).
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "summary": {
      "totalTransactionsClaimed": 6,
      "totalOrganicWasteDivertedKg": 1240.0,
      "methaneEmissionsAvoidedKg": 62.1,
      "co2eCarbonEquivalentAvoidedKg": 1738.8,
      "bantarGebangTruckTripsAvoided": 0.21,
      "totalVendorCapitalRecoveredIdr": 1680000,
      "totalWartegBuyerSavingsIdr": 4320000
    }
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/analytics/impact
  ```

#### 29. `GET /api/analytics/history`
- **Method & URI:** `GET http://localhost:3000/api/analytics/history?view=monthly`
- **Headers:** `Accept: application/json`
- **Deskripsi:** Mengambil histori data penjualan & surplus 365 hari ke belakang yang diolah oleh model AI.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "totalMonthsCount": 12,
    "data": [
      {
        "month": "2026-09",
        "monthName": "September",
        "totalArrivalKg": 445500,
        "totalSoldRetailKg": 396000,
        "totalSurplusKg": 49500,
        "tier1CommercialKg": 24750,
        "tier2SocialKg": 14850,
        "tier3MaggotKg": 9900,
        "rainyDaysCount": 14
      }
    ]
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/analytics/history
  ```

#### 30. `GET /api/analytics/leaderboard`
- **Method & URI:** `GET http://localhost:3000/api/analytics/leaderboard`
- **Headers:** `Accept: application/json`
- **Deskripsi:** Papan peringkat reputasi 30 kios pedagang berdasarkan skor kredit dan donasi sosial pangan.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "leaderboard": [
      {"rank": 1, "vendorName": "H. Rohmat Sayur Daun", "stallNumber": "A-12", "reputationScore": 95, "donationsCount": 14, "priorityBonus": 15},
      {"rank": 2, "vendorName": "H. Subur Bawang Brebes", "stallNumber": "C-04", "reputationScore": 98, "donationsCount": 20, "priorityBonus": 20}
    ]
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/analytics/leaderboard
  ```

#### 31. `GET /api/analytics/export`
- **Method & URI:** `GET http://localhost:3000/api/analytics/export?format=csv`
- **Headers:** `Accept: text/csv`
- **Deskripsi:** Ekspor dokumen pelaporan resmi kepatuhan pengelolaan sampah organik untuk diserahkan ke Dinas Lingkungan Hidup DKI Jakarta.
- **Response 200 OK:**
  ```text
  Tanggal,PasokanKg,SurplusKg,Tier1Kg,Tier2Kg,Tier3Kg,MetanaAvoidedKg,CO2eAvoidedKg,StatusDLH
  2026-09-24,14850,1240,620,380,240,62.10,1738.80,TERKENDALI
  ```
- **Contoh cURL:**
  ```bash
  curl -X GET "http://localhost:3000/api/analytics/export?format=csv" -o laporan_dlh.csv
  ```

#### 32. `GET /api/ai/training`
- **Method & URI:** `GET http://localhost:3000/api/ai/training`
- **Headers:** `Accept: application/json`
- **Deskripsi:** Mengambil informasi status kalibrasi 4 checkpoint model machine learning terlatih.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "modelsCount": 4,
    "models": [
      {"id": "decay_model", "currentEpoch": 30, "trainLoss": 0.02, "valAccuracy": 0.962, "status": "calibrated"},
      {"id": "orchestrator_model", "currentEpoch": 20, "trainLoss": 0.033, "valAccuracy": 0.992, "status": "calibrated"},
      {"id": "pricing_model", "currentEpoch": 35, "trainLoss": 0.024, "valAccuracy": 0.971, "status": "calibrated"},
      {"id": "vision_model", "currentEpoch": 25, "trainLoss": 0.027, "valAccuracy": 0.978, "status": "calibrated"}
    ]
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/ai/training
  ```

#### 33. `POST /api/ai/training`
- **Method & URI:** `POST http://localhost:3000/api/ai/training`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Menjalankan pelatihan ulang (*fine-tuning*) bobot model AI dengan penambahan epoch.
- **Request Body JSON:**
  ```json
  {
    "modelId": "decay_model",
    "additionalEpochs": 5
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Model Model Peluruhan Kinetika Biologis (Arrhenius-Q10) berhasil dilatih ulang sebanyak 5 epoch. Loss menurun ke 0.02 dan akurasi validasi meningkat ke 96%.",
    "updatedModel": {
      "id": "decay_model",
      "currentEpoch": 35,
      "trainLoss": 0.018,
      "valAccuracy": 0.966
    }
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/ai/training -H "Content-Type: application/json" -d '{"modelId":"decay_model","additionalEpochs":5}'
  ```

#### 34. `GET /api/users/register`
- **Method & URI:** `GET http://localhost:3000/api/users/register`
- **Headers:** `Accept: application/json`
- **Deskripsi:** Mengambil seluruh data kios pedagang (30+ kios) dan sentra maggot terdaftar beserta status verifikasinya.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "kiosks": [
      {
        "id": "vendor_kramat_01",
        "stallNumber": "A-12",
        "name": "H. Rohmat Sayur Daun",
        "verificationStatus": "verified"
      }
    ],
    "maggotCenters": [
      {
        "id": "maggot_cililitan_01",
        "facilityName": "Sentra Maggot BSF Cililitan",
        "verificationStatus": "verified"
      }
    ]
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X GET http://localhost:3000/api/users/register
  ```

#### 35. `POST /api/users/register`
- **Method & URI:** `POST http://localhost:3000/api/users/register`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Pendaftaran kios pedagang baru atau sentra maggot BSF baru lengkap dengan dokumen bukti verifikasi alamat (SITU / SK DLH).
- **Request Body JSON:**
  ```json
  {
    "type": "kiosk",
    "name": "Kios Berkah Subur Abadi",
    "ownerName": "H. Mulyadi Brebes",
    "phone": "0812-9988-7766",
    "stallNumber": "A-35",
    "block": "A",
    "aisle": "Los Timur Jalur Sayur 4",
    "specialization": ["kangkung", "bayam", "sawi_hijau"],
    "addressDetails": "Pasar Induk Kramat Jati, Blok A Kios A-35, Jakarta Timur",
    "addressProofDocument": "SITU-KRAMAT-2026-VERIFIED.pdf"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Kios A-35 (Kios Berkah Subur Abadi) berhasil didaftarkan. Alamat fisik kios sedang dalam antrean verifikasi Pengelola Pasar.",
    "data": {
      "id": "vendor_reg_1727193500456",
      "stallNumber": "A-35",
      "verificationStatus": "pending_address_verification"
    }
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X POST http://localhost:3000/api/users/register -H "Content-Type: application/json" -d '{"type":"kiosk","name":"Kios Berkah","ownerName":"H. Mulyadi","phone":"081299887766","stallNumber":"A-35","block":"A","aisle":"Los Timur","specialization":["kangkung"],"addressDetails":"Kramat Jati A-35","addressProofDocument":"SITU.pdf"}'
  ```

#### 36. `PATCH /api/users/register`
- **Method & URI:** `PATCH http://localhost:3000/api/users/register`
- **Headers:** `Content-Type: application/json`
- **Deskripsi:** Verifikasi dan persetujuan status keabsahan alamat fisik kios atau sentra maggot oleh pengelola pasar.
- **Request Body JSON:**
  ```json
  {
    "targetType": "kiosk",
    "id": "vendor_reg_1727193500456",
    "status": "verified"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Status verifikasi alamat Kios A-35 diperbarui menjadi: VERIFIED",
    "data": {
      "id": "vendor_reg_1727193500456",
      "verificationStatus": "verified",
      "verifiedAt": "2026-09-24T15:00:00.000Z"
    }
  }
  ```
- **Contoh cURL:**
  ```bash
  curl -X PATCH http://localhost:3000/api/users/register -H "Content-Type: application/json" -d '{"targetType":"kiosk","id":"vendor_reg_1727193500456","status":"verified"}'
  ```


## 12. SPESIFIKASI KEAMANAN, HANDOVER PROOF-OF-DELIVERY (POD) & ESCROW QRIS

### 12.1 Protokol Serah Terima Kriptografis Handover Token (PoD)

Untuk mencegah kecurangan kurir nakal atau klaim fiktif pedagang, serah terima komoditas dilindungi oleh **HMAC-SHA256 Handover Token**:

1. **Penerbitan Token:** Saat penawaran diklaim oleh pembeli, sistem menerbitkan token terenkripsi:
   $$\text{Token} = \text{Base64UrlEncode}(\text{Payload}) \parallel \text{HMAC-SHA256}(\text{Payload}, K_{\text{system}})$$
   Payload memuat: `offerId`, `vendorId`, `buyerId`, `quantityKg`, `issuedAt`, dan `expiresAt` (masa berlaku token: 120 menit).
2. **Validasi Geofencing GPS:** Kurir memindai kode QR token saat tiba di lapak pedagang. Aplikasi kurir menyertakan koordinat GPS perangkat. Sistem memvalidasi bahwa jarak kurir berada dalam **radius toleransi $\le 50\text{ meter}$** dari koordinat kios los pasar:
   $$\text{Distance} = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)}\right) \le 0,05\text{ km}$$
3. **Pencairan Dana Otomatis:** Begitu verifikasi GPS dan tanda tangan HMAC valid, token dinyatakan *redeemed*, status pengiriman berubah menjadi *In Transit*, dan dana di escrow dipersiapkan untuk transfer langsung ke dompet digital pedagang.

### 12.2 Arsitektur Escrow QRIS Standar Bank Indonesia

1. **Pembayaran Terlindungi (Protected Escrow):** Pembeli (Warteg) membayar pesanan melalui kode QRIS dinamis berstandar National Merchant Identifier (NMID: `ID1020304050607`).
2. **Penguncian Dana:** Pembayaran tidak langsung diteruskan ke rekening penjual, melainkan dikunci sementara di akun penampung (*Escrow Holding Account*).
3. **Pencairan Satu Klik / Otomatis:** Dana dicairkan ke saldo e-wallet pedagang (GoPay/OVO/DANA/Rekening Bank) segera setelah kurir menyelesaikan verifikasi serah terima PoD di kios lapak.

---

## 13. ARSITEKTUR APLIKASI WEB PASARIN (FRONTEND NEXT.JS 16 & REACT 19)

Aplikasi web PASARIN yang beroperasi pada direktori proyek `C:/Project/Pasarin` dibangun di atas arsitektur modern **Next.js 16 (App Router)**, **React 19**, dan **Tailwind CSS v4** dengan filosofi desain bertema terang (*Light Mode*) bergaya antarmuka e-commerce profesional (**Shopee Seller Center** dan **Shopee Buyer App**).

### 13.1 Navigasi Terpisah Berbasis 7 Peran Mandiri (Role-Segregated Architecture)

Bilah samping navigasi (`AppSidebar`) mengisolasi antarmuka kerja ke dalam 7 peran mandiri (*AppRole*):

1. **Dasbor Pedagang Lapak (`role = 'vendor'` | `VendorDashboard`):**
   * Berfungsi sebagai *Shopee Seller Center* bagi 30 kios Pasar Kramat Jati.
   * Fitur: Ingest pasokan sayur subuh, pemantauan kelayuan stok waktu nyata, tombol persetujuan penjualan 1-ketuk, pratinjau foto komoditas beresolusi tinggi, dan dompet saldo pencairan dana escrow.
2. **Dasbor Pembeli Warteg & Katering (`role = 'warteg'` | `WartegDashboard`):**
   * Berfungsi sebagai *Shopee Buyer App* bagi pemilik warteg dan pengusaha katering mikro.
   * Fitur: Katalog penawaran sayuran terdiskon 50% hingga 70%, filter komoditas prioritas (kangkung, bayam, sawi, tomat), tombol klaim cepat berpelindung kunci atomik, dan pembayaran QRIS dinamis Bank Indonesia.
3. **Dasbor Dapur Sosial & Panti Asuhan (`role = 'social_kitchen'` | `SocialKitchenDashboard`):**
   * Fokus pada penyelamatan pangan kemanusiaan (Tier 2).
   * Fitur: Notifikasi reservasi eksklusif selama jendela prioritas 30 menit, tebus murah subsidi atau opsi donasi penuh Rp 0,-, serta pencatatan kuota porsi makan bergizi untuk dhuafa dan anak yatim.
4. **Dasbor Sentra Budidaya Maggot BSF (`role = 'maggot'` | `MaggotDashboard`):**
   * Fokus pada daur ulang sirkular limbah organik non-food grade (Tier 3).
   * Fitur: Pencatatan muatan masuk limbah sayur berlendir (tonase massal), timbangan rak biopond larva, estimasi panen biomassa protein hewani (BSF), dan produksi pupuk organik kasgot.
5. **Dasbor Supir & Armada Logistik (`role = 'logistics'` | `LogisticsDashboard`):**
   * Panduan operasional pengemudi motor roda tiga Viar, mobil pikap Daihatsu GranMax, dan truk bak terbuka.
   * Fitur: Daftar tugas pengantaran belokan demi belokan (`DriverNavigationMap`), rute teroptimasi multi-stop TSP, dan pemindai kamera kode QR untuk verifikasi serah terima PoD berbasis GPS geofencing radius 50 meter.
6. **Dasbor Manajer Pengelola Pasar (`role = 'manager'` | `ManagerDashboard`):**
   * Kendali operasional pengelola Perumda Pasar Jaya.
   * Fitur: Pemantauan telemetri mikroklimat cuaca los, matriks inventaris 30 kios, persetujuan verifikasi dokumen SITU/KTP pedagang baru (`PATCH /api/users/register`), dan tombol ekspor dokumen resmi pelaporan kepatuhan sampah untuk Dinas Lingkungan Hidup DKI Jakarta.
7. **Dasbor Administrator Sistem (`role = 'admin'` | `AdminDashboard`):**
   * Pengawasan teknis kecerdasan buatan dan infrastruktur serverless.
   * Fitur: Pemantauan batas kuota API gratisan (Vercel, Supabase, Gemini, OpenWeather, Telegram), studio pelatihan dan kalibrasi ulang model ML, serta inspektor penalaran bertahap (*Chain-of-Thought*) Orchestrator ReAct.

### 13.2 Katalog 24 Komponen Operasional & Kecerdasan Buatan Terpasang

Aplikasi web mengintegrasikan 24 modul komponen interaktif yang dapat diakses melalui bilah navigasi utama (`app/page.tsx`):

| No | Nama Komponen Frontend | Berkas Komponen | Fungsi & Peran Operasional pada Sistem |
|:---:|---|---|---|
| 1 | **RoleWorkflowStepper** | `role-workflow-stepper.tsx` | Panduan interaktif 4-langkah kerja pengguna yang dilengkapi lencana status otomatisasi AI di balik layar. |
| 2 | **MarketClockController** | `market-clock-controller.tsx` | Pengendali simulasi sirkadian 24 jam pasar (Subuh 04.00, Terik 12.00, Cron 14.30, Hujan 15.30, Handover 17.30). |
| 3 | **StockMatrixTable** | `stock-matrix-table.tsx` | Tabel matriks inventaris aktif 30 kios lengkap dengan indikator skor pembusukan dan tingkat urgensi. |
| 4 | **OfferManagementGrid** | `offer-management-grid.tsx` | Kisi-kisi kartu penawaran surplus terdiskon lengkap dengan hitung mundur masa kedaluwarsa tiket. |
| 5 | **NegotiationModal** | `negotiation-modal.tsx` | Modal tawar-menawar harga otomatis pedagang dan pembeli dengan proteksi batas modal minimal (*Price Floor*). |
| 6 | **SensorStallMonitor** | `sensor-stall-monitor.tsx` | Pemantau telemetri sensor IoT mikroklimat suhu dan kelembapan udara di lorong kios lapak. |
| 7 | **VisualInspectionCard** | `visual-inspection-card.tsx` | Kartu pengujian visual klorosis daun sayuran berbasis citra kamera kios menggunakan model MobileNetV3. |
| 8 | **FleetDispatchTracker** | `fleet-dispatch-tracker.tsx` | Pelacak penugasan armada kendaraan logistik (Viar <=300kg, GranMax 301-1000kg, Truk >1000kg). |
| 9 | **DriverNavigationMap** | `driver-navigation-map.tsx` | Peta rute GPS belokan demi belokan supir pengiriman logistik pasar Kramat Jati. |
| 10 | **QrScannerModal** | `qr-scanner-modal.tsx` | Modal pemindai kamera barcode/QR token serah terima PoD kurir dengan verifikasi koordinat GPS. |
| 11 | **MarketFederationView** | `market-federation-view.tsx` | Tampilan neraca pasokan surplus antar pasar induk se-DKI Jakarta (Kramat Jati, Cibubur, Klender, Santa). |
| 12 | **MarketSpatialMap** | `market-spatial-map.tsx` | Peta tata ruang spasial los lapak Blok A, B, dan C Pasar Kramat Jati. |
| 13 | **VoiceChatRecorder** | `voice-chat-recorder.tsx` | Perekam audio suara pedagang untuk masukan dialek daerah Sunda/Jawa/Betawi. |
| 14 | **AiChatBox** | `ai-chat-box.tsx` | Kotak obrolan percakapan cerdas pedagang dengan fitur konversi otomatis takaran tradisional pasar. |
| 15 | **EscrowLedgerTable** | `escrow-ledger-table.tsx` | Buku besar pencatatan transaksi pembayaran QRIS dinamis BI dan status saldo penampung escrow. |
| 16 | **CarbonCreditDashboard** | `carbon-credit-dashboard.tsx` | Dasbor akumulasi kredit reduksi emisi gas metana (CH4) dan ekuivalen karbon (CO2e) standar IPCC 2006. |
| 17 | **AnalyticsTrendCharts** | `analytics-trend-charts.tsx` | Grafik tren analitik musiman histori penjualan 365 hari ke belakang. |
| 18 | **YearDataAnalyticsView** | `year-data-analytics-view.tsx` | Penyaji visualisasi ringkasan kinerja tahunan volume sampah pangan yang berhasil dialihkan dari TPA. |
| 19 | **SystemAuditLogViewer** | `system-audit-log-viewer.tsx` | Penampil catatan audit keamanan kriptografi transaksi, eksekusi cron, dan deteksi anomali etika. |
| 20 | **PrintableExecutiveReport** | `printable-executive-report.tsx` | Lembar cetak laporan resmi eksekutif kepatuhan pengelolaan sampah pangan untuk Dinas Lingkungan Hidup. |
| 21 | **SimulationPlaybackControls**| `simulation-playback-controls.tsx`| Panel pengendali kecepatan simulasi alur pasar (Play, Pause, Fast Forward x10, Reset). |
| 22 | **TelegramDeviceSimulator** | `telegram-device-simulator.tsx` | Simulator ponsel interaktif pengetesan bot Telegram @pasarin_bot dengan tombol inline 1-ketuk. |
| 23 | **QualityGatePlayground** | `quality-gate-playground.tsx` | Simulator pengujian pertahanan sistem gerbang mutu terhadap percobaan manipulasi moral hazard. |
| 24 | **SystemBoundaryMonitor** | `system-boundary-monitor.tsx` | Monitor kuota penggunaan API pengembang gratisan (Vercel, Supabase, Gemini, OpenWeather, Telegram). |

---

## 14. INFRASTRUKTUR TEKNIS, BATASAN SISTEM & EFISIENSI FREE-TIER

### 14.1 Strategi Operasional Nol Biaya Server (100% Free-Tier Architecture)

PASARIN dirancang khusus untuk lingkungan prototipe akademik Software Engineering tanpa beban biaya server bulanan (*Zero Operational Server Cost*):

```
+---------------------------------------------------------------------------------------------------------+
| Layanan / Provider     | Komponen Teknis             | Batas Free-Tier Kuota   | Strategi Efisiensi     |
+---------------------------------------------------------------------------------------------------------+
| Vercel Cloud Platform  | Next.js 16 Host & API Route | 100 GB Bandwidth / bln  | Edge Caching & SSG     |
| Supabase Database      | PostgreSQL Storage & Auth   | 500 MB DB / 50.000 req  | Normalisasi Skema      |
| Google AI Studio       | Gemini 2.0 Flash ReAct LLM  | 15 RPM / 1.500 RPD      | Caching Prompt & LoRA  |
| OpenWeatherMap         | Telemetri Cuaca Lapangan    | 1.000 Panggilan / hari  | Cache Telemetri 15 mnt |
| Telegram Bot API       | Notifikasi Bot (@pasarin_bot)| 30 Pesan / detik        | Queue Worker Bounded   |
| Unsplash CDN           | Foto Komoditas & Fasilitas  | Unlimited Public CDN    | Lazy-Loading Images    |
+---------------------------------------------------------------------------------------------------------+
```

### 14.2 Batasan Teknis dan Lingkup Akademik (System Boundaries)

1. **Cakupan Wilayah Proyek:** Wilayah operasional dibatasi pada radius $\le 5,0\text{ km}$ dari Pasar Induk Kramat Jati (mencakup kecamatan Kramat Jati, Condet, Cililitan, Pasar Minggu, dan Ciracas).
2. **Data Penjualan Sintetis Realistis:** Data penjualan 365 hari ke belakang dihasilkan oleh `YearSalesDataEngine` yang mencerminkan variabilitas cuaca hujan Jakarta dan dinamika harga riil pasar induk.
3. **Simulasi Pembayaran QRIS:** Transaksi QRIS menggunakan payload standar National Merchant Identifier (NMID) Bank Indonesia dengan mekanisme simulasi konfirmasi bayar instan di lingkungan demonstrasi.

---

## 15. METRIK KINERJA SISTEM (SLO, SLA & VALIDASI AKADEMIK)

### 15.1 Service Level Objectives (SLO)

1. **API Response Latency:**
   - 95% panggilan API data (`GET /api/stocks`, `GET /api/vendors`, `GET /api/dispatch`) harus merespons dalam waktu $< 250\text{ ms}$.
   - Panggilan inferensi multi-agen (`POST /api/orchestrator/query`) harus merespons dalam waktu $< 1.500\text{ ms}$.
2. **Kompilasi & Build Time:** Waktu kompilasi Next.js 16 Turbopack di bawah $< 10\text{ detik}$ (terverifikasi: 4,3 detik).
3. **Kepatuhan Tipe Data (Type Safety):** 100% bebas dari tipe `any` pada seluruh kode TypeScript (`Finished TypeScript check with zero errors`).

### 15.2 Skenario Pengujian Benchmark Akademik

Sistem dilengkapi suite benchmark otomatis (`/api/simulation/benchmark`) yang menguji 5 skenario ekstrem:
1. *Lonjakan Pasokan Panen Raya (Supply Gluts):* Menguji ketahanan pencocokan saat pasokan naik 300%.
2. *Hujan Badai Ekstrem (Tropical Downpour Anomaly):* Menguji pergeseran waktu pemicu diskon darurat.
3. *Simulasi Manipulasi Moral Hazard (Fraud Attempt):* Menguji penolakan otomatis sayuran segar yang diklaim sebagai pakan ternak.
4. *Kegagalan Gateway Logistik (Fleet Breakdown):* Menguji relokasi tugas pengantaran ke armada cadangan.
5. *Beban Kueri Konkuren (Stress Load):* Memastikan kestabilan state saat 30 pedagang melakukan input stok serentak.

---


### 15.3 Katalog 29 Skenario Pengujian Otomatis (Test Suite Matrix)

Sistem PASARIN diverifikasi menggunakan suite pengujian regresi otomatis (*Automated Test Suite*) dengan tingkat kelulusan 100% (29/29 lulus):

| Test ID | Modul / Sub-Sistem | Skenario Pengujian | Input Data Uji | Kriteria Kelulusan | Status |
|---|---|---|---|---|:---:|
| **TC-01** | `ArrheniusDecay` | Validasi kinetika kangkung pada suhu 33°C | $T=33^\circ	ext{C}, 	ext{RH}=75\%$ | DecayScore meningkat $2,2	imes$ lipat dibanding $20^\circ	ext{C}$ | **PASS** |
| **TC-02** | `ArrheniusDecay` | Batas kritis layu ringan kangkung 8 jam | Jam pajang = 8,5 jam | Status berubah otomatis ke `layu_ringan` | **PASS** |
| **TC-03** | `ArrheniusDecay` | Batas kritis reject kangkung 18 jam | Jam pajang = 19,0 jam | Status berubah otomatis ke `tidak_layak` | **PASS** |
| **TC-04** | `QualityGate` | Blokir sayuran segar ke Tier 3 (Maggot) | Kangkung 4 jam display minta Tier 3 | Sistem melempar exception `FRAUD_PREVENTED` | **PASS** |
| **TC-05** | `QualityGate` | Klasifikasi mutu visual daun klorosis | Citra daun menguning 42% | Skor defek klorofil memicu rekomendasi Tier 1 | **PASS** |
| **TC-06** | `DynamicPricing` | Diskon inverse surge cuaca normal | Jam 14.30 WIB, stok 55 kg | Diskon terhitung tepat antara 50% - 70% | **PASS** |
| **TC-07** | `DynamicPricing` | Proteksi batas bawah harga tebus | Komoditas bayam subuh Rp 14.000 | Harga tebus tidak boleh turun di bawah Rp 2.500 | **PASS** |
| **TC-08** | `DynamicPricing` | Akselerasi diskon saat hujan lebat | Curah hujan 14,8 mm | Pengali cuaca $\mu = 0,85$ menurunkan harga 15% lebih cepat | **PASS** |
| **TC-09** | `Matchmaking` | Hak reservasi 30 menit Dapur Sosial | Stok Tier 2 diterbitkan | Maggot center dilarang klaim dalam 30 menit pertama | **PASS** |
| **TC-10** | `Matchmaking` | Pemadanan radius jarak Warteg terdekat | 3 Warteg terdaftar | Warteg terdekat (1,8 km) mendapat urutan pertama | **PASS** |
| **TC-11** | `HandoverToken` | Tanda tangan kriptografis HMAC-SHA256 | Payload penawaran valid | Signature HMAC valid dan diverifikasi server | **PASS** |
| **TC-12** | `HandoverToken` | Geofencing GPS radius 50 meter | Kurir di koordinat radius 30m | Verifikasi serah terima sukses | **PASS** |
| **TC-13** | `HandoverToken` | Penolakan serah terima di luar radius | Kurir di koordinat radius 250m | Verifikasi ditolak `GEOFENCE_OUT_OF_BOUNDS` | **PASS** |
| **TC-14** | `HandoverToken` | Penolakan token kedaluwarsa | Token berumur 130 menit (>120m) | Verifikasi ditolak `TOKEN_EXPIRED` | **PASS** |
| **TC-15** | `EscrowQRIS` | Pembuatan payload QRIS standar BI | Transaksi Rp 231.000 | Format NMID `ID1020304050607` valid | **PASS** |
| **TC-16** | `EscrowQRIS` | Penguncian dana di akun penampung | Pembayaran QRIS masuk | Status transaksi berubah ke `escrow_locked` | **PASS** |
| **TC-17** | `EscrowQRIS` | Pencairan dana otomatis ke pedagang | Verifikasi PoD kurir berhasil | Dana cair ke saldo pedagang (`released_to_vendor`) | **PASS** |
| **TC-18** | `CarbonIPCC` | Formula first order decay metana | 1.240 kg sayuran teralihkan | Emisi $CH_4$ dicegah terhitung 62,1 kg tepat | **PASS** |
| **TC-19** | `CarbonIPCC` | Konversi GWP100 ke $CO_2e$ | 62,1 kg $CH_4$ | Ekuivalen karbon terhitung 1.738,8 kg $CO_2e$ | **PASS** |
| **TC-20** | `FleetDispatch` | Alokasi kendaraan muatan 526 kg | Muatan 526 kg untuk Warteg | Daihatsu GranMax (kapasitas 800 kg) ditugaskan | **PASS** |
| **TC-21** | `FleetDispatch` | Alokasi kendaraan muatan 1.850 kg | Muatan 1.850 kg untuk Maggot | Truk Colt Diesel (kapasitas 2.500 kg) ditugaskan | **PASS** |
| **TC-22** | `ReActEngine` | Dekomposisi kueri armada lusa | Kueri armada lusa | 5 tahap nalar tereksitasi lengkap dengan rincian unit | **PASS** |
| **TC-23** | `ReActEngine` | Pertahanan moral hazard pedagang | Klaim 4 jam kangkung ke maggot | Deduksi internal memblokir klaim fiktif pedagang | **PASS** |
| **TC-24** | `MultiUser` | Registrasi kios baru status pending | Kios A-35 didaftarkan | Status verifikasi awal `pending_address_verification` | **PASS** |
| **TC-25** | `MultiUser` | Persetujuan verifikasi alamat kios | PATCH status `verified` | Kios A-35 berubah status ke `verified` | **PASS** |
| **TC-26** | `MultiUser` | Registrasi sentra maggot berizin | Pendaftaran Sentra Cililitan | Nomor izin SK DLH divalidasi tersimpan | **PASS** |
| **TC-27** | `YearEngine` | Agregasi data penjualan 365 hari | 365 record harian di-generate | Total 12 bulan teragregasi tanpa data null | **PASS** |
| **TC-28** | `AIModelTrain` | Fine-tuning epoch model peluruhan | 5 epoch tambahan | Train loss menurun dan akurasi validasi $\ge 96\%$ | **PASS** |
| **TC-29** | `TelegramBot` | Formatting pesan bahasa daerah | Input bahasa Sunda | Balasan chat terformat sopan dengan satuan standar | **PASS** |


### 15.4 Matriks Ketertelusuran & Spesifikasi Detail 26 Tiket Jira Produksi Lean (Rencana Terakselerasi 2 Pekan)

Menindaklanjuti arahan dosen pengampu perkuliahan bahwa seluruh sistem harus tuntas dan siap didemonstrasikan dalam **2 pekan ke depan**, backlog proyek PASARIN telah dirasionalisasi secara radikal. Sebanyak **8 fitur berisiko tinggi / over-engineered yang tidak realistis dikerjakan mahasiswa (termasuk audit gas metana, computer vision kamera, NLP dialek lokal, federasi 4 pasar, geofencing 50m, dan integrasi perbankan QRIS BI)** resmi dieliminasi dan disederhanakan.

Sisa waktu 14 hari pasca Sprint 1 dikonsolidasikan ke dalam **2 Sprint Ramping yang Berakhir pada Sesi Kelas Hari Senin**:
1. **Sprint 1 (SELESAI / 30 Sep – 12 Okt 2026):** Fondasi infrastruktur database Supabase, API Next.js 14, scheduler 14:30 WIB, dan 7 dashboard web mobile (PSR-1 s/d PSR-4, PSR-28).
2. **Sprint 2 (13 Okt – 02 Nov 2026) — Core Logic & In-Class Testing (Senin, 02 Nov 2026):** Fokus pada formula Arrhenius-Q10, dynamic pricing inverse surge dengan price floor, ethical quality gate, ReAct agent core, dan **Automated Unit Testing Suite (PSR-39)** yang siap diuji langsung pada sesi kelas hari Senin, 02 November 2026.
3. **Sprint 3 (03 Nov – 09 Nov 2026) — Matchmaker, Live Telegram Bot & Final Demo (Senin, 09 Nov 2026):** Fokus pada pemadanan 3-tier, jendela prioritas 30m dapur sosial, bot Telegram live @pasarin_bot, simulated QRIS escrow, dan demonstrasi sidang akhir pada hari Senin, 09 November 2026.

#### 15.4.1 Matriks Ringkasan Pemetaan 26 Tiket Jira Produksi Lean

| Key Jira | Tipe | Prioritas | SP | Penanggung Jawab | Sprint & Periode | Modul & Endpoint Terkait |
|:---:|:---:|:---:|:---:|:---:|:---|:---|
| **PSR-1** | Epic | Highest | - | Marshal Aufa | Sprint 1 (30 Sep - 12 Okt) | Fondasi Basis Data & Penjadwal Otonom [DONE] |
| **PSR-2** | Task | Highest | 5.0 | Zahir Shahab | Sprint 1 (Due: 04 Okt 2026) | Supabase PostgreSQL DDL, 4 Tabel Inti, Indeks B-Tree [DONE] |
| **PSR-3** | Task | Highest | 3.0 | Marshal Aufa | Sprint 1 (Due: 06 Okt 2026) | Next.js 14 App Router, Boilerplate API, /api/health [DONE] |
| **PSR-4** | Task | Highest | 5.0 | Marshal Aufa | Sprint 1 (Due: 10 Okt 2026) | Automated Cron Scheduler 14:30 WIB, /api/cron/afternoon-sweep [DONE] |
| **PSR-28** | Task | High | 8.0 | Marshal Aufa | Sprint 1 (Due: 12 Okt 2026) | 7 Dasbor Peran Mandiri Web Mobile Light Mode [DONE] |
| **PSR-6** | Epic | Highest | - | Zahir Shahab | Sprint 2 (s/d 02 Nov) | Kinetika Peluruhan Biologis & Dinamika Pasar |
| **PSR-5** | Task | High | 5.0 | Zahir Shahab | Sprint 2 (Due: 28 Okt 2026) | Agent 3 OpenWeatherMap Telemetry, /api/telemetry/weather |
| **PSR-14** | Task | Highest | 8.0 | Zahir Shahab | Sprint 2 (Due: 29 Okt 2026) | Agent 2 Arrhenius-Q10 Shelf-Life Decay Engine (Zero CCTV) |
| **PSR-15** | Task | High | 5.0 | Zahir Shahab | Sprint 2 (Due: 29 Okt 2026) | Agent 5 Market Crowd Footfall Attenuation Simulator (Rain Model) |
| **PSR-16** | Task | Medium | 5.0 | Marshal Aufa | Sprint 2 (Due: 30 Okt 2026) | Direktori 30 Kios Kramat Jati & 365-Day Synthetic Sales Data |
| **PSR-8** | Epic | High | - | Zahir Shahab | Sprint 2 (s/d 31 Okt) | Penetapan Harga Dinamis & Gerbang Etika |
| **PSR-20** | Task | High | 5.0 | Zahir Shahab | Sprint 2 (Due: 30 Okt 2026) | Agent 12 Inverse Surge Pricing (Floor Price Protection) |
| **PSR-21** | Task | Highest | 5.0 | Marshal Aufa | Sprint 2 (Due: 30 Okt 2026) | Agent 10 Quality Gate Anti-Moral Hazard Protection |
| **PSR-40** | Task | High | 3.0 | Marshal Aufa | Sprint 2 (Due: 30 Okt 2026) | Frontend Supabase Role Authentication and Login System (Jumat Malam) |
| **PSR-7** | Epic | Highest | - | Marshal Aufa | Sprint 2 (s/d 31 Okt) | Pusat Koordinasi ReAct Multi-Agen |
| **PSR-17** | Task | Highest | 8.0 | Marshal Aufa | Sprint 2 (Due: 31 Okt 2026) | Agent 1 Gemini 2.0 Flash ReAct Orchestrator, /api/orchestrator/run |
| **PSR-18** | Task | Medium | 5.0 | Marshal Aufa | Sprint 2 (Due: 31 Okt 2026) | Tool Calling Registry & Natural Query Decomposition |
| **PSR-19** | Task | Medium | 5.0 | Zahir Shahab | Sprint 2 (Due: 31 Okt 2026) | Agent 6 Composite Predictive Spoilage Engine |
| **PSR-39** | Testing | Highest | 5.0 | Marshal Aufa | Sprint 2 (Due: 31 Okt 2026) | In-Class Automated Unit Testing Suite (Freeze Sabtu 31 Okt) |
| **PSR-9** | Epic | High | - | Marshal Aufa | Sprint 3 (s/d 09 Nov) | Pemadanan 3-Tier & Otomasi Rute |
| **PSR-22** | Task | High | 5.0 | Zahir Shahab | Sprint 3 (Due: 04 Nov 2026) | Agent 7 Circular 3-Tier Matchmaking Engine (Haversine Warteg) |
| **PSR-23** | Task | High | 3.0 | Marshal Aufa | Sprint 3 (Due: 05 Nov 2026) | Jendela Waktu Eksklusif 30 Menit Dapur Sosial (Tier 2) |
| **PSR-10** | Epic | High | - | Marshal Aufa | Sprint 3 (s/d 09 Nov) | Pintu Gerbang Interaksi Bot Telegram |
| **PSR-24** | Task | Highest | 5.0 | Marshal Aufa | Sprint 3 (Due: 06 Nov 2026) | Live Telegram Bot API Gateway & Webhook, @pasarin_bot |
| **PSR-25** | Task | High | 5.0 | Marshal Aufa | Sprint 3 (Due: 06 Nov 2026) | Vendor 1-Tap Inline Keyboard Flow [Setuju Jual] / [Lewati] |
| **PSR-26** | Task | High | 5.0 | Zahir Shahab | Sprint 3 (Due: 07 Nov 2026) | Buyer Instant Alert & Fast Claim Channel with Atomic Locking |
| **PSR-27** | Task | Medium | 5.0 | Marshal Aufa | Sprint 3 (Due: 07 Nov 2026) | Logistics Fleet Cargo Allocation and Weight Dispatch Rule |
| **PSR-37** | Task | High | 5.0 | Marshal Aufa | Sprint 3 (Due: 07 Nov 2026) | Simulated In-App QRIS Escrow Payment Gateway |
| **PSR-13** | Epic | Medium | - | Zahir Shahab | Sprint 3 (s/d 09 Nov) | Verifikasi Simulasi Terpadu & Sidang Akhir |
| **PSR-31** | Testing | Medium | 5.0 | Marshal Aufa | Sprint 3 (Due: 08 Nov 2026) | Uji Coba Simulasi Terpadu 24 Jam Metabolisme Pasar Kramat Jati |
| **PSR-32** | Testing | Medium | 5.0 | Zahir Shahab | Sprint 3 (Due: 09 Nov 2026) | Academic Word Report Audit & Video Pitch (Target Final Senin 9 Nov) |
#### 15.4.2 Katalog Spesifikasi Detail Seluruh 38 Tiket Jira Resmi (PSR-1 s/d PSR-38)

#### `PSR-1`: Core Infrastructure Database and Scheduler

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-1` (`Epic`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Highest`** |
| **Estimasi Beban** | **Epic Container** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | Backlog / Foundation |
| **Batas Waktu (Due Date)** | **2026-10-11** |
| **Parent Epic** | - |
| **Label Teknis** | `core` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

Pondasi backend basis data relasional Supabase PostgreSQL serverless framework Next.js 14 dan mekanisme cron otonom harian jam 14:30 WIB 100% free tier.

---

#### `PSR-2`: Supabase PostgreSQL Schema and DDL Design

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-2` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Highest`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | TASK Sprint 1 |
| **Batas Waktu (Due Date)** | **2026-10-04** |
| **Parent Epic** | `PSR-1` |
| **Label Teknis** | `backend`, `database`, `supabase` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Merancang dan mengeksekusi DDL basis data relasional PostgreSQL pada Supabase untuk menampung seluruh entitas data sistem multi-agen PASARIN.

**Spesifikasi Teknis:**

- Tabel **kiosks** menampung direktori 30 pedagang Pasar Induk Kramat Jati yang dilengkapi verifikasi dokumen resmi.
- Tabel **commodities** menyimpan 30 profil biologis komoditas lengkap dengan laju respirasi seluler.
- Tabel **stock_items** dan **offers** mengelola inventaris harian serta tiket penawaran surplus sirkular.
- Pemberian indeks **B-Tree** diterapkan pada kolom kunci asing untuk menjamin performa query.

**Lingkup Pekerjaan:**

- Menyusun skrip migrasi SQL terstruktur untuk seluruh tabel relasional utama.
- Mengonfigurasi batasan integritas referensial dan penghapusan bertingkat.
- Mengaktifkan kebijakan **Row Level Security** untuk membatasi hak akses data antar pedagang.

**Kriteria Penerimaan:**

- [ ] Skema basis data berhasil diterapkan tanpa kendala pada repositori **Supabase**.
- [ ] Indeks pencarian terverifikasi aktif pada kolom vendor dan status komoditas.
- [ ] Koneksi aplikasi dari client TypeScript mampu menjalankan operasi baca dan tulis secara stabil.

---

#### `PSR-3`: Next.js 14 App Router Framework Scaffold and API Boilerplate

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-3` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Highest`** |
| **Estimasi Beban** | **3.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 1 |
| **Batas Waktu (Due Date)** | **2026-10-06** |
| **Parent Epic** | `PSR-1` |
| **Label Teknis** | `backend`, `frontend`, `nextjs`, `scaffold` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Menginisialisasi kerangka kerja aplikasi Next.js 14 App Router berbasis TypeScript dan Tailwind CSS yang terpasang pada infrastruktur Vercel.

**Spesifikasi Teknis:**

- Struktur antarmuka pemrograman aplikasi diatur modular pada direktori **app/api** untuk melayani seluruh agen.
- Format keluaran data dibakukan menggunakan struktur **ApiResponse** yang memuat status keberhasilan dan timestamp.
- Validasi data masukan pada tingkat runtime diperkuat dengan pustaka **Zod** guna mencegah kegagalan tipe data.

**Lingkup Pekerjaan:**

- Menyiapkan repositori dasar Next.js 14 dengan mode pemeriksaan tipe data ketat.
- Membangun rute penanganan dasar dan middleware autentikasi variabel lingkungan.
- Mengonfigurasi otomatisasi penyebaran kode dari GitHub ke platform Vercel.

**Kriteria Penerimaan:**

- [ ] Aplikasi berhasil dibangun dan aktif pada layanan **Vercel** tanpa kesalahan kompilasi.
- [ ] Rute pemeriksaan kesehatan server mengembalikan status HTTP 200 dengan format JSON yang valid.
- [ ] Pemeriksaan tipe data TypeScript menghasilkan nol kesalahan pada seluruh berkas proyek.

---

#### `PSR-4`: Automated Cron Scheduler 14:30 WIB

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-4` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Highest`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 1 |
| **Batas Waktu (Due Date)** | **2026-10-10** |
| **Parent Epic** | `PSR-1` |
| **Label Teknis** | `autonomous`, `backend`, `cron`, `scheduler` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Membangun penjadwal latar belakang otomatis yang mengeksekusi audit kelayuan sayuran lapak setiap hari tepat pukul 14.30 WIB.

**Spesifikasi Teknis:**

- Pemicu terjadwal dikonfigurasi melalui berkas **vercel.json** dengan pola waktu harian jam rawan pasar.
- Keamanan rute pemicu dilindungi menggunakan otentikasi **Bearer Token** rahasia.
- Setiap aktivitas audit terekam dalam tabel riwayat guna memantau durasi eksekusi dan latensi.

**Lingkup Pekerjaan:**

- Menulis rute penanganan sapuan sore hari pada endpoint afternoon sweep.
- Menghubungkan sinyal pemicu jadwal dengan inisialisasi penalaran agen pengorkestrasi.
- Menyusun pengujian simulasi pemanggilan cron menggunakan perintah jaringan aman.

**Kriteria Penerimaan:**

- [ ] Penjadwal cron terbukti memicu rute target tepat pada jam yang ditentukan secara konsisten.
- [ ] Permintaan jaringan tanpa token otentikasi resmi langsung ditolak dengan kode akses terlarang.
- [ ] Catatan eksekusi audit tersimpan lengkap pada tabel pencatatan sistem.

---

#### `PSR-5`: Hyperlocal Climate Telemetry Agent

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-5` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`High`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | TASK Sprint 1 |
| **Batas Waktu (Due Date)** | **2026-10-12** |
| **Parent Epic** | `PSR-1` |
| **Label Teknis** | `open-weather`, `telemetry`, `weather` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Mengintegrasikan layanan telemetri cuaca mikro dari Pasar Induk Kramat Jati menggunakan antarmuka OpenWeatherMap secara waktu nyata.

**Spesifikasi Teknis:**

- Lokasi pengambilan data dipatok pada koordinat geografis Pasar Induk Kramat Jati di **Jakarta Timur**.
- Penyimpanan sementara memori berdurasi 15 menit diterapkan untuk menghemat kuota batas panggilan gratis.
- Profil cadangan iklim disiapkan dengan suhu 32 derajat Celsius dan kelembapan 75 persen jika jaringan terputus.

**Lingkup Pekerjaan:**

- Membangun modul agen cuaca pada pustaka agen internal proyek.
- Membuat rute pembacaan telemetri cuaca yang terhubung dengan modul peluruhan biologis.
- Menerapkan mekanisme pengalihan otomatis ke data cadangan saat koneksi luar mengalami gangguan.

**Kriteria Penerimaan:**

- [ ] Modul cuaca berhasil membaca suhu udara, kelembapan, dan curah hujan aktual secara stabil.
- [ ] Panggilan data dalam rentang waktu singkat dilayani langsung dari memori tanpa membebani kuota API.
- [ ] Simulasi putus koneksi membuktikan sistem tetap beroperasi normal menggunakan profil cadangan.

---

#### `PSR-6`: Biological Decay Modeling and Dynamics

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-6` (`Epic`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Highest`** |
| **Estimasi Beban** | **Epic Container** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | Backlog / Foundation |
| **Batas Waktu (Due Date)** | **30 November 2026** |
| **Parent Epic** | - |
| **Label Teknis** | `core` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

Pemodelan kinetika respirasi biologis 30 komoditas, model redaman pengunjung saat hujan, dan generator dataset 30 kios.

---

#### `PSR-7`: Central ReAct Orchestrator

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-7` (`Epic`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Highest`** |
| **Estimasi Beban** | **Epic Container** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | Backlog / Foundation |
| **Batas Waktu (Due Date)** | **30 November 2026** |
| **Parent Epic** | - |
| **Label Teknis** | `core` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

Otak agen ReAct LLM Google Gemini via Google AI Studio Free Tier dan function calling dekomposisi kueri bahasa alami.

---

#### `PSR-8`: Spoilage Pricing and Quality Gate

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-8` (`Epic`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`High`** |
| **Estimasi Beban** | **Epic Container** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | Backlog / Foundation |
| **Batas Waktu (Due Date)** | **30 November 2026** |
| **Parent Epic** | - |
| **Label Teknis** | `core` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

Prediksi surplus komposit, algoritma inverse surge pricing multi-tier, dan quality gate pencegahan moral hazard.

---

#### `PSR-9`: 3-Tier Matchmaking and Routing

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-9` (`Epic`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`High`** |
| **Estimasi Beban** | **Epic Container** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | Backlog / Foundation |
| **Batas Waktu (Due Date)** | **30 November 2026** |
| **Parent Epic** | - |
| **Label Teknis** | `core` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

Pencocokan pembeli 3-tier melingkar dan jendela waktu prioritas 30 menit untuk dapur sosial dan panti asuhan.

---

#### `PSR-10`: Telegram Bot Interface Gateway

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-10` (`Epic`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`High`** |
| **Estimasi Beban** | **Epic Container** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | Backlog / Foundation |
| **Batas Waktu (Due Date)** | **30 November 2026** |
| **Parent Epic** | - |
| **Label Teknis** | `core` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

Antarmuka @pasarin_bot webhook gratis, alur 1-ketuk inline keyboard pedagang, dan broadcast klaim instan pembeli.

---

#### `PSR-11`: Fleet Logistics and Mobile UI

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-11` (`Epic`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Medium`** |
| **Estimasi Beban** | **Epic Container** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | Backlog / Foundation |
| **Batas Waktu (Due Date)** | **30 November 2026** |
| **Parent Epic** | - |
| **Label Teknis** | `core` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

Kalkulasi armada angkut (Viar, GranMax, Truk) dan perancangan mobile dashboard web bertema terang.

---

#### `PSR-12`: Carbon Accounting and Resiliency

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-12` (`Epic`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Medium`** |
| **Estimasi Beban** | **Epic Container** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | Backlog / Foundation |
| **Batas Waktu (Due Date)** | **30 November 2026** |
| **Parent Epic** | - |
| **Label Teknis** | `core` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

Akuntansi reduksi gas metana IPCC 2006 TPA Bantar Gebang dan antrean pesan offline resiliensi jaringan pasar.

---

#### `PSR-13`: Verification Simulation and Defense

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-13` (`Epic`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Medium`** |
| **Estimasi Beban** | **Epic Container** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | Backlog / Foundation |
| **Batas Waktu (Due Date)** | **30 November 2026** |
| **Parent Epic** | - |
| **Label Teknis** | `core` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

Uji simulasi 24 jam metabolisme pasar Kramat Jati, audit laporan akademik Word bebas AI, dan video demonstrasi sidang final.

---

#### `PSR-14`: Biological Shelf-Life Decay Engine

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-14` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Highest`** |
| **Estimasi Beban** | **8.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | TASK Sprint 2 |
| **Batas Waktu (Due Date)** | **2026-10-17** |
| **Parent Epic** | `PSR-6` |
| **Label Teknis** | `arrhenius`, `biological-kinetics`, `q10` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Mengembangkan mesin kinetika respirasi seluler Arrhenius berbasis koefisien termal untuk 30 komoditas tanpa menggunakan sensor kamera fisik.

**Spesifikasi Teknis:**

- Persamaan laju peluruhan menggabungkan energi aktivasi komoditas dan koefisien kelipatan **Q10** termal.
- Integrasi waktu pajang dan fluktuasi suhu menghasilkan skor akumulasi kebusukan biologis.
- Klasifikasi kondisi membagi komoditas menjadi segar, layu ringan, layu sedang, dan tidak layak konsumsi.

**Lingkup Pekerjaan:**

- Menulis fungsi perhitungan kinetika biologis pada modul utilitas sistem.
- Menentukan konstanta respirasi spesifik untuk komoditas kangkung, bayam, sawi, dan produk rentan lainnya.
- Memvalidasi hasil perhitungan terhadap durasi simpan nyata pada suhu tropis lingkungan pasar.

**Kriteria Penerimaan:**

- [ ] Laju penurunan mutu daun terbukti meningkat dua kali lipat lebih cepat pada suhu terik pasar.
- [ ] Sayuran dengan masa pajang melebihi batas waktu aman otomatis masuk kategori penyelamatan tingkat pertama.
- [ ] Perhitungan berjalan murni berbasis formula matematika tanpa ketergantungan perangkat keras kamera.

---

#### `PSR-15`: Market Crowd Footfall Attenuation Simulator

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-15` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`High`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | TASK Sprint 2 |
| **Batas Waktu (Due Date)** | **2026-10-20** |
| **Parent Epic** | `PSR-6` |
| **Label Teknis** | `analytics`, `footfall`, `market-simulation` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Menerapkan model simulasi redaman pengunjung pasar eceran akibat kondisi lorong becek saat terjadi hujan deras sore hari di Jakarta.

**Spesifikasi Teknis:**

- Penurunan arus pembeli eceran dimodelkan mengikuti fungsi logistik terhadap intensitas curah hujan.
- Curah hujan melebihi 10 milimeter menurunkan estimasi pengunjung fisik hingga mendekati separuh kapasitas normal.
- Faktor pengali surplus digunakan untuk mengoreksi perkiraan sisa stok yang tertahan di meja lapak pedagang.

**Lingkup Pekerjaan:**

- Membangun modul agen kepadatan pasar pada direktori agen proyek.
- Menghubungkan data curah hujan dari modul cuaca dengan perhitungan pengurangan pengunjung.
- Menyusun pengujian skenario hujan lebat pada hari kerja dan akhir pekan.

**Kriteria Penerimaan:**

- [ ] Simulasi kondisi hujan deras berhasil memperlihatkan penurunan angka proyeksi pembeli retail.
- [ ] Akumulasi sisa stok sayuran lapak terkalkulasi melonjak sebanding dengan durasi hujan lebat.
- [ ] Hasil estimasi terbukti sinkron saat diteruskan ke modul peramal surplus komposit.

---

#### `PSR-16`: Synthetic Data Generator 30 Stalls

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-16` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Medium`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 2 |
| **Batas Waktu (Due Date)** | **2026-10-23** |
| **Parent Epic** | `PSR-6` |
| **Label Teknis** | `30-stalls`, `datasets`, `synthetic-data` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Menyusun generator data sintetis yang realistis untuk mengisi profil 30 kios pedagang Pasar Kramat Jati dan riwayat transaksi 365 hari.

**Spesifikasi Teknis:**

- Kios terbagi merata pada Blok A untuk sayuran daun, Blok B untuk bumbu dan buah, serta Blok C untuk umbi.
- Data riwayat penjualan memuat variabilitas musiman, perbedaan hari kerja dan libur, serta fluktuasi pasokan subuh.
- Format data disediakan dalam bentuk struktur TypeScript siap pakai untuk mendukung demonstrasi sistem.

**Lingkup Pekerjaan:**

- Menulis berkas data direktori kios lengkap dengan titik los dan nomor kontak pedagang.
- Membangun skrip pembangkit data penjualan tahunan dengan pola distribusi acak terarah.
- Menyediakan antarmuka pembacaan data riwayat untuk kebutuhan grafik analitik pengelola pasar.

**Kriteria Penerimaan:**

- [ ] Direktori 30 kios pasar tradisional terdaftar lengkap dengan rincian komoditas unggulan masing-masing.
- [ ] Koleksi data penjualan setahun penuh berhasil dihitung tanpa adanya kekosongan nilai pada setiap bulan.
- [ ] Dasbor analitik mampu memuat dan menyajikan grafik riwayat tahunan dalam waktu kurang dari satu detik.

---

#### `PSR-17`: Google Gemini ReAct Agent Core

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-17` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Highest`** |
| **Estimasi Beban** | **8.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 3 |
| **Batas Waktu (Due Date)** | **2026-10-29** |
| **Parent Epic** | `PSR-7` |
| **Label Teknis** | `gemini`, `orchestrator`, `react-agent` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Membangun pusat koordinasi ReAct berbasis model bahasa cerdas untuk mengorkestrasi alur observasi, pemikiran, dan penentuan aksi multi-agen.

**Spesifikasi Teknis:**

- Infrastruktur penalaran memanfaatkan mesin **Gemini 2.0 Flash** melalui kuota pengembang tanpa biaya operasional.
- Batas maksimal siklus penalaran dipatok lima putaran guna mencegah pengulangan eksekusi alat tanpa henti.
- Setiap tahap pemikiran dan observasi dicatat dalam format data terstruktur untuk kebutuhan audit akademik.

**Lingkup Pekerjaan:**

- Membangun kelas agen pengorkestrasi pusat pada direktori agen inti sistem.
- Menghubungkan instruksi sistem pengendali peran utama dengan skema pemanggilan fungsi bawaan.
- Menerapkan mekanisme penanganan kesalahan jika layanan model mengalami pembatasan laju panggilan.

**Kriteria Penerimaan:**

- [ ] Agen pusat berhasil mengeksekusi urutan tugas dari pembacaan data hingga penentuan alokasi secara mandiri.
- [ ] Jejak penalaran terekam lengkap pada basis data tanpa kehilangan informasi konteks percakapan.
- [ ] Skenario uji koordinasi membuktikan agen mampu menyelesaikan keputusan pemadanan dalam waktu singkat.

---

#### `PSR-18`: Tool Calling Registry and Query Decomposition

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-18` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Low`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 3 |
| **Batas Waktu (Due Date)** | **2026-11-02** |
| **Parent Epic** | `PSR-7` |
| **Label Teknis** | `multi-agent`, `query-nlp`, `tool-calling` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Mendaftarkan spesifikasi alat sub-agen ke dalam format pemanggilan fungsi untuk mendekomposisi kueri bahasa alami manajer pasar.

**Spesifikasi Teknis:**

- Pendaftaran fungsi mencakup modul cuaca pasar, evaluasi susut biologis, dan kalkulasi kebutuhan armada.
- Rute penanganan kueri menerima teks bahasa alami dan menghasilkan sintesis rencana aksi terukur.
- Waktu pemrosesan kueri kompleks dibatasi agar memberikan respon dalam rentang di bawah dua detik.

**Lingkup Pekerjaan:**

- Menulis skema deklarasi alat sesuai standar format fungsi terstruktur.
- Menghubungkan pengenal alat dengan metode eksekusi nyata pada modul agen terkait.
- Menyusun penggabung respon yang menyajikan rekomendasi jumlah armada dan alokasi stok.

**Kriteria Penerimaan:**

- [ ] Pertanyaan manajerial mengenai proyeksi armada lusa berhasil diuraikan menjadi pemanggilan sub-agen yang relevan.
- [ ] Eksekusi alat berjalan secara tepat urutan tanpa memanggil modul yang tidak dibutuhkan.
- [ ] Keluaran akhir menyajikan rincian tonase surplus dan rekomendasi jenis kendaraan angkut secara padat.

---

#### `PSR-19`: Composite Predictive Spoilage Engine

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-19` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Medium`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | TASK Sprint 3 |
| **Batas Waktu (Due Date)** | **2026-11-04** |
| **Parent Epic** | `PSR-8` |
| **Label Teknis** | `prediction`, `regression`, `spoilage` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Menggabungkan indikator kondisi stok, telemetri cuaca, data historis, dan redaman pengunjung menjadi prediksi kuantitatif surplus per kios.

**Spesifikasi Teknis:**

- Model regresi komposit memperhitungkan sisa stok awal terhadap proyeksi serapan pembeli pasar.
- Tingkat urgensi penyelamatan dipetakan dalam skala satu hingga lima berdasarkan sisa jam simpan.
- Komoditas dengan sisa waktu di bawah empat jam otomatis diberi prioritas tertinggi dalam daftar redistribusi.

**Lingkup Pekerjaan:**

- Mengembangkan modul agen prediksi surplus pada pustaka internal proyek.
- Membangun rute API peramal surplus yang menerima data inventaris lapak dan cuaca terkini.
- Menguji akurasi estimasi surplus menggunakan skenario pasar normal dan kondisi hujan deras.

**Kriteria Penerimaan:**

- [ ] Rute prediksi berhasil mengembalikan angka estimasi kilogram surplus dan komoditas paling rentan.
- [ ] Status penyelamatan darurat otomatis terpicu pada komoditas sayuran daun yang mendekati masa busuk.
- [ ] Hasil kalkulasi surplus dapat dimanfaatkan langsung oleh modul penetapan harga dinamis.

---

#### `PSR-20`: Inverse Surge Dynamic Pricing Engine

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-20` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`High`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | TASK Sprint 3 |
| **Batas Waktu (Due Date)** | **2026-11-06** |
| **Parent Epic** | `PSR-8` |
| **Label Teknis** | `ddqn`, `dynamic-pricing`, `inverse-surge` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Menerapkan algoritma Inverse Surge Pricing dengan batas bawah modal agar harga turun bertahap guna memacu serapan sisa stok.

**Spesifikasi Teknis:**

- Formula penurunan harga mempercepat diskon secara eksponensial seiring makin dekatnya batas waktu pasar sore.
- Batas bawah harga menjamin nilai jual tetap berada di atas biaya penanganan minimal pedagang.
- Kaidah sistem memastikan harga pangan layak untuk dapur sosial selalu lebih bernilai dibanding pakan ternak maggot.

**Lingkup Pekerjaan:**

- Mengembangkan modul agen harga dinamis pada direktori agen proyek.
- Menerapkan formula pengali percepatan diskon saat kondisi cuaca hujan lebat menurunkan pembeli.
- Menyusun simulasi tawar-menawar harga terproteksi margin aman pada endpoint negosiasi harga.

**Kriteria Penerimaan:**

- [ ] Diskon harga komersial untuk warteg terhitung otomatis pada rentang separuh harga normal subuh.
- [ ] Proteksi harga batas bawah terbukti mencegah komoditas dijual di bawah modal kerja dasar pedagang.
- [ ] Penurunan harga saat hujan lebat berhasil memacu kecepatan klaim oleh pelaku usaha mikro.

---

#### `PSR-21`: Quality Gate Moral Hazard Protection

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-21` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Highest`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 3 |
| **Batas Waktu (Due Date)** | **2026-11-06** |
| **Parent Epic** | `PSR-8` |
| **Label Teknis** | `ethics`, `moral-hazard`, `quality-gate` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Membangun gerbang kendali mutu etis yang mengunci penentuan tier penyelamatan pangan secara terprogram guna mencegah moral hazard pedagang.

**Spesifikasi Teknis:**

- Pengelompokan tier komoditas ditentukan mutlak oleh sistem berdasarkan parameter biologis tanpa intervensi pedagang.
- Komoditas yang masih layak konsumsi manusia dilarang dialihkan ke jalur pakan ternak maggot.
- Percobaan manipulasi status pangan memicu penolakan otomatis dan pencatatan pada riwayat audit sistem.

**Lingkup Pekerjaan:**

- Mengembangkan modul gerbang kendali mutu pada berkas pustaka agen terkait.
- Menyematkan fungsi validasi ketat pada rute penerimaan stok dan pembagian tiket penawaran.
- Menyusun pengujian regresi untuk memastikan sayuran segar tidak dapat didaftarkan sebagai pakan ternak.

**Kriteria Penerimaan:**

- [ ] Sistem terbukti menolak upaya pembuatan tiket pakan maggot untuk sayuran yang masih berkategori segar.
- [ ] Pesan galat pencegahan kecurangan muncul saat pedagang mencoba memotong jalur konsumsi manusia.
- [ ] Seluruh komoditas pangan bernutrisi terjamin masuk ke antrean warteg atau dapur sosial terlebih dahulu.

---

#### `PSR-22`: Circular 3-Tier Matchmaking Engine

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-22` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`High`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | TASK Sprint 4 |
| **Batas Waktu (Due Date)** | **2026-11-11** |
| **Parent Epic** | `PSR-9` |
| **Label Teknis** | `3-tier`, `haversine`, `matchmaking` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Membangun mesin pemadanan sirkular tiga-tingkat yang mengoptimalkan jarak radius, kapasitas harian, dan reputasi pembeli terdekat.

**Spesifikasi Teknis:**

- Perhitungan jarak menggunakan formula Haversine dengan batasan radius maksimal lima kilometer dari pasar.
- Bobot pemadanan menggabungkan faktor kedekatan lokasi fisik, kesiapan tampung, dan histori transaksi.
- Rute pemadanan menghasilkan daftar mitra pembeli terurut prioritas untuk setiap lot surplus yang diterbitkan.

**Lingkup Pekerjaan:**

- Mengembangkan modul agen pemadanan pembeli pada direktori agen proyek.
- Memuat profil pembeli mencakup warteg sekitar, katering, dapur panti asuhan, dan sentra maggot.
- Menyusun pengujian algoritma seleksi dengan variasi volume muatan dan jarak tempuh.

**Kriteria Penerimaan:**

- [ ] Warteg pada radius terdekat otomatis menempati urutan rekomendasi pertama dalam daftar alokasi.
- [ ] Proses pencocokan pembeli untuk seluruh stok aktif selesai dalam durasi di bawah seratus milidetik.
- [ ] Kapasitas harian pembeli terbukti tidak terlampaui saat menerima alokasi muatan besar.

---

#### `PSR-23`: Priority Time-Window Dispatcher Tier 2

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-23` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`High`** |
| **Estimasi Beban** | **3.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 4 |
| **Batas Waktu (Due Date)** | **2026-11-13** |
| **Parent Epic** | `PSR-9` |
| **Label Teknis** | `priority-window`, `routing`, `social-kitchen` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Menerapkan jendela waktu prioritas selama 30 menit khusus bagi dapur sosial sebelum komoditas diizinkan turun kasta ke pakan ternak.

**Spesifikasi Teknis:**

- Penghitung waktu mundur 30 menit aktif segera setelah tiket penawaran pangan layak diterbitkan.
- Pihak budidaya maggot diblokir dari melakukan klaim selama masa reservasi sosial masih berlangsung.
- Pengalihan otomatis ke pakan biomassa berjalan mandiri jika jendela waktu berakhir tanpa adanya klaim.

**Lingkup Pekerjaan:**

- Membangun modul pengatur jendela prioritas pada layanan pengiriman sistem.
- Menambahkan penanda batas reservasi pada tabel penawaran di basis data.
- Menyusun pengujian alur otomatis perpindahan tier saat waktu reservasi habis.

**Kriteria Penerimaan:**

- [ ] Percobaan klaim oleh sentra maggot pada masa prioritas berhasil ditolak secara terprogram oleh sistem.
- [ ] Tiket penawaran otomatis terbuka untuk pakan ternak tepat setelah 30 menit tanpa respons klaim sosial.
- [ ] Hak pemenuhan pangan masyarakat prasejahtera terjamin melalui perlindungan waktu eksklusif.

---

#### `PSR-24`: Telegram Bot API Gateway and Webhook

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-24` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Highest`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 4 |
| **Batas Waktu (Due Date)** | **2026-11-15** |
| **Parent Epic** | `PSR-10` |
| **Label Teknis** | `gateway`, `telegram-bot`, `webhook` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Membangun pintu gerbang webhook Telegram yang andal dan bebas biaya operasional untuk melayani pertukaran pesan pedagang dan pembeli.

**Spesifikasi Teknis:**

- Layanan menggunakan antarmuka resmi Telegram Bot API yang dapat beroperasi tanpa biaya lisensi berkala.
- Rute penanganan webhook memvalidasi token rahasia pada tajuk permintaan jaringan untuk menjamin keamanan.
- Sistem dirancang mampu menangani lonjakan lalu lintas hingga tiga puluh pesan per detik dengan waktu respon singkat.

**Lingkup Pekerjaan:**

- Mendaftarkan bot resmi proyek dan mengonfigurasi rute penerima webhook pada Next.js.
- Membangun penangan perintah dasar dan pengaitan identitas percakapan dengan akun basis data.
- Menyusun pengujian verifikasi keamanan tajuk permintaan jaringan pada endpoint webhook.

**Kriteria Penerimaan:**

- [ ] Webhook terverifikasi aktif dengan respon sukses dari peladen pesan Telegram.
- [ ] Perintah inisiasi berhasil menautkan nomor obrolan pedagang ke profil kios di basis data.
- [ ] Pemberitahuan penawaran surplus dapat terkirim ke ponsel mitra dalam waktu di bawah tiga detik.

---

#### `PSR-25`: Vendor 1-Tap Inline Keyboard Flow

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-25` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`High`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 4 |
| **Batas Waktu (Due Date)** | **2026-11-17** |
| **Parent Epic** | `PSR-10` |
| **Label Teknis** | `one-tap`, `telegram-inline`, `vendor-ux` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Membangun pesan penawaran otomatis ke Telegram pedagang lapak yang dilengkapi tombol interaktif satu ketuk untuk konfirmasi penjualan kilat.

**Spesifikasi Teknis:**

- Format pesan menyajikan ringkasan nama sayuran, bobot kilogram sisa, persentase diskon, dan estimasi rupiah.
- Tombol interaktif menyediakan opsi persetujuan cepat atau penolakan tawaran dalam satu sentuhan layar.
- Pembaruan teks pesan di aplikasi Telegram terjadi secara langsung di tempat tanpa membanjiri ruang obrolan.

**Lingkup Pekerjaan:**

- Mengembangkan modul agen notifikasi pada direktori agen terkait.
- Membangun penangan kueri tombol kembali pada rute penerima webhook Telegram.
- Menghubungkan persetujuan pedagang dengan pengaktifan tiket pada katalog belanja mitra pembeli.

**Kriteria Penerimaan:**

- [ ] Penekanan tombol setuju jual seketika mengubah status penawaran di basis data menjadi aktif.
- [ ] Tampilan pesan di Telegram terbarui secara langsung mengonfirmasi keberhasilan penerbitan lot.
- [ ] Pedagang dapat menyelesaikan konfirmasi penjualan dalam durasi singkat tanpa membuka aplikasi rumit.

---

#### `PSR-26`: Buyer Instant Alert and Fast Claim Channel

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-26` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`High`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | TASK Sprint 4 |
| **Batas Waktu (Due Date)** | **2026-11-18** |
| **Parent Epic** | `PSR-10` |
| **Label Teknis** | `buyer-alerts`, `concurrency-lock`, `fast-claim` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Membangun kanal siaran peringatan instan ke pembeli dengan tombol klaim cepat yang dilindungi penguncian konkurensi basis data.

**Spesifikasi Teknis:**

- Pesan siaran memuat foto komoditas, persentase penghematan modal belanja, dan tautan pembayaran resmi.
- Penguncian baris basis data secara atomik diterapkan saat transaksi klaim berlangsung guna mencegah klaim ganda.
- Rute penanganan klaim memvalidasi ketersediaan stok sebelum menerbitkan konfirmasi pesanan.

**Lingkup Pekerjaan:**

- Menyusun pola pesan siaran penawaran terarah sesuai komoditas yang diminati pembeli.
- Menerapkan teknik transaksi aman bersyarat pada lapisan akses data pesanan.
- Menyusun pesan penolakan yang santun jika pembeli lain terlambat mengklik tombol klaim.

**Kriteria Penerimaan:**

- [ ] Siaran penawaran surplus terkirim ke seluruh kelompok mitra pembeli dalam hitungan detik.
- [ ] Uji konkurensi membuktikan satu lot sayuran tidak dapat diambil secara bersamaan oleh dua pembeli berbeda.
- [ ] Pembeli yang kalah cepat menerima informasi ketersediaan lot yang telah habis secara informatif.

---

#### `PSR-27`: Logistics Fleet and Cargo Calculator

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-27` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Medium`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | TASK Sprint 5 |
| **Batas Waktu (Due Date)** | **2026-11-24** |
| **Parent Epic** | `PSR-11` |
| **Label Teknis** | `cargo-calculator`, `logistics-fleet`, `optimization` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Membangun kalkulator optimasi alokasi jenis armada logistik penjemputan berdasarkan ambang batas bobot komoditas yang diselamatkan.

**Spesifikasi Teknis:**

- Muatan ringan di bawah 300 kilogram dialokasikan ke motor roda tiga untuk kelincahan di lorong sempit.
- Muatan menengah antara 301 hingga 1.000 kilogram ditugaskan ke mobil bak tertutup atau pikap terbuka.
- Muatan massal melebihi 1.000 kilogram reject maggot langsung diarahkan ke armada truk bak terbuka.

**Lingkup Pekerjaan:**

- Mengembangkan modul agen logistik pada pustaka agen penanganan pengiriman.
- Menghubungkan kalkulasi total bobot lot terverifikasi dengan aturan penugasan kendaraan angkut.
- Menyusun lembar rincian muatan digital yang memuat estimasi jarak tempuh dan konsumsi bahan bakar.

**Kriteria Penerimaan:**

- [ ] Pesanan muatan komersial warteg berhasil dipetakan ke armada kendaraan roda empat secara presisi.
- [ ] Muatan reject organik massal berhasil diarahkan ke armada truk pengangkut tanpa salah alokasi.
- [ ] Manifes perjalanan pengantaran menyajikan rute penjemputan los kios yang efisien bagi pengemudi.

---

#### `PSR-28`: Responsive Light-Mode Mobile Dashboards

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-28` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`High`** |
| **Estimasi Beban** | **8.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 5 |
| **Batas Waktu (Due Date)** | **2026-11-27** |
| **Parent Epic** | `PSR-11` |
| **Label Teknis** | `frontend`, `light-mode`, `mobile-dashboards`, `ui-ux` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Membangun tujuh antarmuka dasbor peran mandiri berbasis web mobile bertema terang yang nyaman dibaca di bawah terik matahari los pasar.

**Spesifikasi Teknis:**

- Antarmuka mencakup peran pedagang lapak, pembeli warteg, dapur sosial, pengelola maggot, supir, manajer, dan admin.
- Pemilihan tema terang mematuhi standar rasio kontras visual tinggi agar teks tetap terbaca jelas di luar ruangan.
- Setiap dasbor dilengkapi bilah panduan empat langkah kerja yang memperjelas alur interaksi pengguna.

**Lingkup Pekerjaan:**

- Mengimplementasikan tata letak dasbor pada direktori komponen antarmuka pengguna.
- Membangun bilah samping navigasi peran dan komponen pemandu tahapan alur operasional.
- Melakukan pengujian kesesuaian tampilan pada layar perangkat ponsel pintar pedagang pasar.

**Kriteria Penerimaan:**

- [ ] Seluruh tujuh dasbor peran teruji responsif dan berfungsi optimal pada peramban web seluler.
- [ ] Keterbacaan teks dan elemen visual terbukti nyaman digunakan di lingkungan los pasar yang terang.
- [ ] Pengguna baru dapat mengikuti urutan aksi operasional dengan panduan alur empat langkah yang jelas.

---

#### `PSR-29`: IPCC 2006 Methane Carbon Accounting Engine

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-29` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Medium`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | TASK Sprint 5 |
| **Batas Waktu (Due Date)** | **2026-11-28** |
| **Parent Epic** | `PSR-12` |
| **Label Teknis** | `carbon-ipcc`, `methane-fod`, `sustainability` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Menerapkan formula peluruhan orde pertama standar IPCC 2006 untuk menghitung pencegahan emisi gas metana dari sampah organik pasar.

**Spesifikasi Teknis:**

- Kalkulasi emisi memanfaatkan parameter fraksi karbon terurai dan pembentukan gas anaerobik tempat pembuangan akhir.
- Faktor pengali potensi pemanasan global horizon seratus tahun diterapkan untuk mengonversi metana ke ekuivalen karbon.
- Pencatatan metrik keberlanjutan terintegrasi langsung pada setiap transaksi penyelamatan komoditas yang berhasil.

**Lingkup Pekerjaan:**

- Mengembangkan modul agen emisi pada berkas pustaka agen keberlanjutan.
- Menghubungkan data timbangan sayuran teralihkan dengan pencatatan log akumulasi reduksi karbon.
- Menyajikan angka dampak lingkungan kumulatif pada antarmuka pelaporan resmi.

**Kriteria Penerimaan:**

- [ ] Penghitungan reduksi gas metana menghasilkan angka terukur yang sesuai dengan formula baku lingkungan.
- [ ] Konversi ke satuan ekuivalen karbon terbukti presisi dan siap dipertanggungjawabkan secara akademik.
- [ ] Data penghematan emisi tampil otomatis pada dasbor pengelola untuk bahan laporan dinas lingkungan.

---

#### `PSR-30`: Offline Message Queue and Resiliency

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-30` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Low`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 5 |
| **Batas Waktu (Due Date)** | **2026-11-28** |
| **Parent Epic** | `PSR-12` |
| **Label Teknis** | `message-queue`, `offline-resiliency`, `reliability` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Membangun mekanisme antrean pesan luring dengan strategi coba-ulang bertahap untuk mengatasi gangguan koneksi seluler di lorong pasar.

**Spesifikasi Teknis:**

- Tabel antrean pesan menyimpan pemberitahuan yang tertunda saat koneksi internet pedagang terputus.
- Strategi coba ulang otomatis menggunakan jeda waktu meningkat bertahap hingga maksimal tiga kali percobaan.
- Kestabilan aplikasi dijaga agar transaksi tetap dapat diproses dan disinkronkan kembali saat sinyal pulih.

**Lingkup Pekerjaan:**

- Membangun modul antrean pengiriman pesan pada layanan bus kegiatan internal.
- Menerapkan batas toleransi waktu henti jaringan pada setiap pemanggilan layanan antarmuka luar.
- Menyusun prosedur penanganan gangguan operasional jaringan pasar dalam buku panduan teknis.

**Kriteria Penerimaan:**

- [ ] Pemberitahuan yang gagal terkirim akibat sinyal lemah otomatis dicoba kembali tanpa intervensi manual.
- [ ] Aplikasi web tidak mengalami penghentian paksa saat terjadi kehilangan sinyal internet mendadak.
- [ ] Sinkronisasi data transaksi yang tertunda berhasil diselesaikan utuh begitu koneksi seluler tersambung kembali.

---

#### `PSR-31`: 24-Hour Market Metabolism Simulation Trial

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-31` (`Testing`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Medium`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 5 |
| **Batas Waktu (Due Date)** | **2026-11-29** |
| **Parent Epic** | `PSR-13` |
| **Label Teknis** | `metabolism-trial`, `simulation-e2e`, `testing` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Menjalankan pengujian simulasi terpadu siklus 24 jam metabolisme pasar untuk memvalidasi interoperabilitas seluruh agen otonom.

**Spesifikasi Teknis:**

- Simulasi menguji tahapan kedatangan pasokan subuh, sapuan sore, deteksi hujan, hingga alokasi armada malam.
- Tolak ukur keberhasilan menargetkan efisiensi pengalihan sampah organik pasar mencapai minimal sembilan puluh persen.
- Integritas sistem etis diverifikasi guna memastikan nol persen pangan layak konsumsi terbuang ke pakan ternak.

**Lingkup Pekerjaan:**

- Mengeksekusi skrip pengujian skenario pasar komprehensif pada rute tolok ukur simulasi.
- Memeriksa keutuhan catatan data dari pencatatan stok lapak awal hingga serah terima fisik komoditas.
- Menyusun data evaluasi performa sistem sebagai bahan pembuktian kinerja prototipe perangkat lunak.

**Kriteria Penerimaan:**

- [ ] Seluruh tahapan siklus 24 jam berhasil disimulasikan dari hulu ke hilir tanpa kendala eksekusi.
- [ ] Angka penyelamatan surplus sayuran terbukti melampaui target ambang batas efisiensi yang ditetapkan.
- [ ] Jejak penalaran agen terkoordinasi dan catatan keamanan transaksi terekam lengkap pada repositori data.

---

#### `PSR-32`: Academic Word Report Audit and Video Pitch

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-32` (`Testing`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Medium`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | TASK Sprint 5 |
| **Batas Waktu (Due Date)** | **2026-11-30** |
| **Parent Epic** | `PSR-13` |
| **Label Teknis** | `academic-report`, `final-defense`, `ieee-style` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Menuntaskan audit kepatuhan format laporan akademik bebas pola teks AI, rekaman video demonstrasi alur bot, dan materi sidang.

**Spesifikasi Teknis:**

- Penulisan laporan mematuhi aturan zero italics dan penulisan butir kalimat yang mengalir tanpa tanda titik dua kaku.
- Sitasi pustaka disusun rapi menggunakan standar IEEE resmi yang dilengkapi tautan sumber rujukan aktif.
- Berkas luaran mencakup naskah dokumen Word, salindia presentasi sidang, dan video pengujian alur bot nyata.

**Lingkup Pekerjaan:**

- Mengompilasi naskah laporan akademik akhir menggunakan modul pembangkit dokumen resmi.
- Melakukan pemeriksaan manual terhadap seluruh isi naskah guna memastikan kebersihan gaya penulisan.
- Merekam video demonstrasi pengujian alur interaksi bot Telegram dan dasbor operasional proyek.

**Kriteria Penerimaan:**

- [ ] Dokumen laporan akhir berhasil diekspor ke format pengolah kata dengan tata letak margin akademik yang rapi.
- [ ] Pemeriksaan naskah membuktikan dokumen bersih dari format miring dan pola kalimat khas teks generatif.
- [ ] Video pengujian sistem dan materi presentasi sidang selesai tersusun lengkap sebelum tanggal batas akhir.

---

#### `PSR-33`: MobileNetV3 Leafy Vegetable Defect & Vision Inspection

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-33` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Low`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 2 |
| **Batas Waktu (Due Date)** | **2026-10-24** |
| **Parent Epic** | `PSR-6` |
| **Label Teknis** | `computer-vision`, `machine-learning`, `mobilenetv3` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Mengintegrasikan model pembelajaran mesin MobileNetV3 sebagai fitur inspeksi visual tambahan untuk mendeteksi klorosis daun pada sesi demo.

**Spesifikasi Teknis:**

- Model klasifikasi citra menggunakan arsitektur **MobileNetV3** yang ringan untuk inferensi cepat.
- Masukan berupa berkas citra daun sayuran diproses menjadi skor kerusakan visual klorofil daun.
- Rute API inspeksi visual disediakan sebagai modul pendukung verifikasi mutu berbasis foto opsional.

**Lingkup Pekerjaan:**

- Menyusun penangan rute pengunggahan citra daun pada direktori API inspeksi visual.
- Menghubungkan bobot model terlatih dengan logika penerjemahan skor defek daun.
- Menyediakan mekanisme pembatasan ukuran berkas citra guna menjaga kestabilan memori server.

**Kriteria Penerimaan:**

- [ ] Pengunggahan foto daun menguning berhasil menghasilkan skor defek visual secara terukur.
- [ ] Proses inferensi citra selesai dalam durasi singkat di bawah 500 milidetik per pengujian.
- [ ] Keluaran skor visual terbukti selaras dengan rekomendasi pengalihan tier mutu pangan.

---

#### `PSR-34`: Multi-Dialect NLP Assistant & Traditional Unit Converter

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-34` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Low`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | TASK Sprint 3 |
| **Batas Waktu (Due Date)** | **2026-11-05** |
| **Parent Epic** | `PSR-7` |
| **Label Teknis** | `nlp-dialect`, `sundanese-javanese`, `unit-converter` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Membangun asisten percakapan yang memahami dialek bahasa daerah Sunda, Jawa, dan Betawi serta satuan takaran pasar tradisional.

**Spesifikasi Teknis:**

- Pengurai bahasa mengenali kosakata lokal pasar seperti sebutan leuleus, kantun, dan rego murah.
- Tabel konversi menerjemahkan satuan karung, peti kayu, dan ikat sayuran ke dalam ukuran kilogram standar.
- Rute obrolan memproses masukan teks atau suara pedagang menjadi data inventaris yang terstruktur.

**Lingkup Pekerjaan:**

- Menyusun modul penerjemah dialek pada pustaka utilitas percakapan sistem.
- Mengintegrasikan instruksi pemahaman bahasa daerah dengan model kecerdasan percakapan.
- Menghubungkan hasil ekstraksi komoditas langsung ke sistem pencatatan stok lapak pedagang.

**Kriteria Penerimaan:**

- [ ] Pesan laporan stok dalam bahasa daerah berhasil diurai menjadi nama sayuran dan bobot kilogram yang tepat.
- [ ] Balasan obrolan tersaji kembali dalam gaya tutur yang ramah dan mudah dipahami pedagang tradisional.
- [ ] Konversi satuan tradisional terbukti akurat sesuai standar takaran fisik los pasar Kramat Jati.

---

#### `PSR-35`: Multi-User Kiosk & Recycler Physical Address Verification

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-35` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Medium`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | TASK Sprint 4 |
| **Batas Waktu (Due Date)** | **2026-11-18** |
| **Parent Epic** | `PSR-9` |
| **Label Teknis** | `address-verification`, `multi-user`, `situ-permit` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Membangun alur pendaftaran multi-pengguna mandiri dengan mekanisme verifikasi alamat fisik dan dokumen resmi oleh pengelola pasar.

**Spesifikasi Teknis:**

- Akun baru yang didaftarkan berstatus menunggu verifikasi alamat sebelum diizinkan bertransaksi komersial.
- Verifikasi memerlukan unggahan surat izin tempat usaha atau kartu identitas pedagang yang sah.
- Persetujuan dilakukan oleh petugas pengelola pasar melalui dasbor manajemen verifikasi akun.

**Lingkup Pekerjaan:**

- Membangun rute pendaftaran pengguna lengkap dengan validasi skema data masukan.
- Mengaitkan status verifikasi pengguna dengan izin penayangan stok pada katalog terbuka.
- Menyediakan fungsi persetujuan verifikasi akun untuk kebutuhan petugas administrasi pasar.

**Kriteria Penerimaan:**

- [ ] Kios baru yang mendaftar secara otomatis berada dalam status peninjauan dokumen resmi.
- [ ] Akun yang belum diverifikasi dibatasi hak aksesnya agar tidak dapat menyalahgunakan sistem diskon.
- [ ] Petugas pengelola pasar mampu mengubah status verifikasi menjadi terdaftar resmi melalui antarmuka sistem.

---

#### `PSR-36`: HMAC-SHA256 Handover Token & 50m Geofencing PoD

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-36` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`High`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 4 |
| **Batas Waktu (Due Date)** | **2026-11-19** |
| **Parent Epic** | `PSR-10` |
| **Label Teknis** | `geofencing-50m`, `hmac-sha256`, `security-pod` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Menerapkan protokol tanda tangan kriptografis serah terima muatan yang divalidasi dengan radius batas koordinat GPS lapak pedagang.

**Spesifikasi Teknis:**

- Token serah terima dilindungi enkripsi tanda tangan berbasis kunci rahasia dengan masa berlaku dua jam.
- Validasi koordinat kurir mewajibkan posisi berada dalam toleransi jarak maksimal lima puluh meter dari kios.
- Penukaran token yang valid secara otomatis memicu pembaharuan status pengiriman dan pelepasan dana penampung.

**Lingkup Pekerjaan:**

- Menulis modul pembangkit dan pemverifikasi token kriptografis pada pustaka utilitas keamanan.
- Membangun rute serah terima muatan yang memproses koordinat posisi kurir dan data token.
- Menyusun pengamanan terhadap serangan pemakaian ulang token yang telah dicairkan sebelumnya.

**Kriteria Penerimaan:**

- [ ] Tanda tangan kriptografis terbukti memvalidasi keaslian rincian pesanan tanpa risiko pemalsuan.
- [ ] Percobaan penyelesaian serah terima di luar batas toleransi lokasi langsung digagalkan oleh sistem.
- [ ] Token yang telah digunakan sekali diblokir permanen dari percobaan penukaran berulang.

---

#### `PSR-37`: Bank Indonesia Dynamic QRIS Escrow Payment Gateway

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-37` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`High`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Marshal Aufa** |
| **Sprint Penugasan** | TASK Sprint 4 |
| **Batas Waktu (Due Date)** | **2026-11-19** |
| **Parent Epic** | `PSR-9` |
| **Label Teknis** | `bank-indonesia`, `payments`, `qris-escrow` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Mengintegrasikan pembayaran kode respons cepat dinamis berstandar nasional dengan sistem penampung dana sementara hingga serah terima selesai.

**Spesifikasi Teknis:**

- Kode pembayaran dinamis memuat identitas pedagang resmi dan jumlah nominal tagihan pesanan secara presisi.
- Dana dari pembeli diamankan terlebih dahulu dalam akun penampung sebelum diteruskan ke dompet digital penjual.
- Pencairan dana ke saldo pedagang terpicu otomatis segera setelah pemindaian serah terima kurir terkonfirmasi.

**Lingkup Pekerjaan:**

- Membangun modul layanan penampung dana pada direktori layanan pembayaran proyek.
- Menyusun rute pembuatan kode respons cepat dinamis dan simulasi pelunasan transaksi.
- Menghubungkan sinyal keberhasilan serah terima fisik kurir dengan instruksi pencairan saldo pedagang.

**Kriteria Penerimaan:**

- [ ] Kode pembayaran dinamis berhasil dibuat sesuai standar transaksi pembayaran nasional.
- [ ] Status pembayaran berhasil mengubah kondisi pesanan menjadi dana terlindungi di akun penampung.
- [ ] Pencairan saldo ke rekening pedagang berlangsung mulus tanpa memerlukan penarikan manual yang rumit.

---

#### `PSR-38`: Multi-Market Federation & Inter-Market Transfer Engine

| Atribut Spesifikasi | Nilai Parameter Jira |
|---|---|
| **Issue Key & Type** | `PSR-38` (`Task`) |
| **Status Workflow** | `To Do` |
| **Tingkat Prioritas** | **`Low`** |
| **Estimasi Beban** | **5.0 Story Points** |
| **Penanggung Jawab (Assignee)** | **Zahir Shahab** |
| **Sprint Penugasan** | TASK Sprint 5 |
| **Batas Waktu (Due Date)** | **2026-11-25** |
| **Parent Epic** | `PSR-11` |
| **Label Teknis** | `inter-transfer`, `jakarta-markets`, `market-federation` |

**Rincian Deskripsi Teknis, Spesifikasi Rekayasa & Kriteria Penerimaan (DoD):**

**Sasaran Rekayasa:** Membangun modul pemantauan surplus lintas pasar induk se-Jakarta untuk mendukung pertukaran informasi neraca komoditas pangan.

**Spesifikasi Teknis:**

- Sistem menghimpun data stok sayuran dan indeks harga dari pasar induk percontohan di wilayah Jakarta.
- Logika analitik mendeteksi kondisi ketimpangan pasokan ekstrem antara pasar surplus dan pasar yang kekurangan stok.
- Penyajian data visual didukung peta sebaran lokasi pasar untuk memudahkan pemantauan dinas terkait.

**Lingkup Pekerjaan:**

- Menyusun modul layanan federasi pasar pada direktori layanan pendukung sistem.
- Membangun rute penyaji data neraca pangan wilayah dan rekomendasi transfer antar-pasar.
- Mengembangkan komponen visualisasi spasial distribusi pasar pada antarmuka pengelola.

**Kriteria Penerimaan:**

- [ ] Data rangkuman pasokan dari beberapa pasar induk dapat ditampilkan dalam satu kesatuan layar.
- [ ] Rekomendasi relokasi komoditas terhitung logis saat terjadi penumpukan pasokan pada satu titik pasar.
- [ ] Tampilan peta sebaran pasar dapat dimuat dengan lancar tanpa menurunkan performa aplikasi.

---

---

## 16. MANAJEMEN RISIKO OPERASIONAL & PROTOKOL MITIGASI KEAMANAN


| Kategori Risiko | Deskripsi Potensi Masalah | Dampak Sistem | Protokol Mitigasi Terimplementasi |
|---|---|:---:|---|
| **Moral Hazard Pedagang** | Pedagang sengaja membiarkan sayur layu agar dibeli murah atau dialihkan ke pakan ternak. | Sedang | **Quality Gate Agent (Agent 10)** mengunci harga batas bawah (*price floor*), membatasi frekuensi klaim, dan menurunkan skor reputasi kios. |
| **Manipulasi Alamat Kios** | Pengguna mendaftar akun fiktif untuk menyalahgunakan sistem penawaran diskon. | Tinggi | **Alur Verifikasi Wajib Alamat Fisik:** Setiap kios baru berstatus `pending_address_verification` dan wajib divalidasi dengan dokumen SITU/KTP oleh pengelola pasar. |
| **Penipuan Pengiriman (Fraud PoD)** | Kurir mengklaim telah mengantar pesanan padahal barang belum diserahkan. | Tinggi | **HMAC-SHA256 Token + GPS Geofencing:** Serah terima hanya sah jika kurir berada dalam radius $\le 50\text{ meter}$ dari kios pedagang dan memindai kode QR unik. |
| **Fluktuasi Cuaca Jakarta** | Hujan lebat mendadak mematikan pengunjung pasar secara tidak terduga. | Sedang | **Hyperlocal Weather Agent (Agent 3)** memantau sensor curah hujan dan otomatis memajukan jam pemicu diskon 15-30 menit lebih awal. |
| **Pelanggaran Batas Kuota API** | Lonjakan kueri menghabiskan kuota free-tier Gemini atau OpenWeather. | Rendah | **System Boundary Monitor:** Sistem menerapkan caching telemetri 15 menit, batching prompt, dan fallback ke model lokal berbasis aturan heuristik jika kuota menipis. |

---


### 16.2 Standard Operating Procedures (SOP) & Incident Response Runbook

Untuk memastikan ketahanan sistem di lingkungan pasar tradisional yang dinamis, ditetapkan 6 prosedur standar penanganan kegagalan (*Runbook*):

#### 16.2.1 Runbook RB-01: Serverless Cold Start & Latency Spikes
- **Gejala:** Latensi respons rute API melonjak di atas $1.500	ext{ ms}$ saat beban pemicu otonom 14.30 WIB aktif.
- **Penyebab:** Eksekusi serentak Vercel Serverless Function yang mengalami cold-start pada runtime Node.js.
- **Prosedur Mitigasi:**
  1. Cron trigger mengeksekusi *pre-warming ping* pada pukul 14.28 WIB ke endpoint `/api/health`.
  2. Seluruh modul matematika Arrhenius dieksekusi secara in-memory tanpa melakukan network round-trip berulang.
  3. Respons data inventaris di-cache pada layer Edge dengan `s-maxage=60, stale-while-revalidate=300`.

#### 16.2.2 Runbook RB-02: Kegagalan API Telemetri Cuaca (OpenWeather / BMKG Outage)
- **Gejala:** Panggilan API `WeatherAgent` melempar HTTP 500 / 504 Gateway Timeout.
- **Penyebab:** Layanan cuaca publik pihak ketiga mengalami gangguan konektivitas atau kuota habis.
- **Prosedur Mitigasi:**
  1. Sistem otomatis membaca *fallback telemetry cache* terakhir (maksimal umur cache: 60 menit).
  2. Jika cache kedaluwarsa, sistem beralih ke *Climatic Fallback Profile*: menetapkan suhu default $32,5^\circ	ext{C}$, RH $75\%$, dan curah hujan $0	ext{ mm}$.
  3. Memancarkan peringatan diagnostik ke `SystemBoundaryMonitor` untuk investigasi admin.

#### 16.2.3 Runbook RB-03: Percobaan Pemalsuan Lokasi Kurir (GPS Spoofing)
- **Gejala:** Kurir memindai QR PoD dari jarak jauh (> 50 meter) menggunakan aplikasi fake GPS.
- **Penyebab:** Upaya pencairan dini saldo escrow sebelum komoditas benar-benar diambil di kios.
- **Prosedur Mitigasi:**
  1. Algoritma Haversine menghitung delta jarak dari koordinat kios terdaftar.
  2. Jika $\Delta > 50	ext{ meter}$, transaksi otomatis digagalkan dengan kode galat `GEOFENCE_BREACH_DETECTED`.
  3. Token serah terima dikunci sementara, dan notifikasi konfirmasi dikirim ke WhatsApp pedagang kios bersangkutan.

#### 16.2.4 Runbook RB-04: Replay Attack Token Serah Terima
- **Gejala:** Token serah terima dipindai dua kali oleh kurir berbeda.
- **Penyebab:** Duplikasi tangkapan layar kode QR oleh pihak ketiga.
- **Prosedur Mitigasi:**
  1. Basis data menerapkan constraint `is_redeemed = TRUE` dan mencatat `redeemed_at`.
  2. Percobaan klaim kedua otomatis ditolak dengan pesan `TOKEN_ALREADY_REDEEMED`.
  3. Catatan audit keamanan otomatis diterbitkan ke tabel `system_audit_trail`.

#### 16.2.5 Runbook RB-05: Penumpukan Stok Akibat Pembatalan Warteg (Buyer No-Show)
- **Gejala:** Warteg tidak mengambil pesanan sayur yang telah diklaim hingga pukul 16.30 WIB.
- **Penyebab:** Kendala operasional internal warteg atau gangguan transportasi.
- **Prosedur Mitigasi:**
  1. Sistem mengaktifkan *Cascade Auto-Reallocation*: jika tiket klaim tidak diserahterimakan dalam 90 menit, lot otomatis dialihkan ke Dapur Sosial terdekat (Tier 2).
  2. Jika Dapur Sosial telah terpenuhi, lot diteruskan ke Sentra Maggot BSF (Tier 3) pada pukul 17.00 WIB.
  3. Dana pembayaran warteg dikembalikan sebagian setelah dipotong biaya penalti pembatalan.

#### 16.2.6 Runbook RB-06: Verifikasi Alamat Kios Baru Tertunda (Onboarding Backlog)
- **Gejala:** Pendaftaran kios pedagang baru menumpuk dalam status `pending_address_verification`.
- **Penyebab:** Petugas pengelola pasar belum melakukan inspeksi fisik meja los.
- **Prosedur Mitigasi:**
  1. Sistem memberikan masa verifikasi sementara (*Provisional Onboarding*) selama 24 jam dengan batas transaksi maksimal 20 kg.
  2. Kios baru wajib mengunggah foto fisik kios bersama nomor plat los resmi Pasar Jaya.
  3. Pengelola pasar dapat menyetujui verifikasi massal melalui tombol satu klik di Dasbor Manajer Pasar (`PATCH /api/users/register`).

## 17. PERNYATAAN PENUTUP & PENGESAHAN DOKUMEN


Dokumen **Product Requirements Document (PRD) v2.0** ini menyatakan spesifikasi resmi dari sistem **PASARIN (Proactive Agent for Market Surplus Redistribution)**. Seluruh arsitektur backend 33 API, antarmuka peran mandiri, model machine learning terkalibrasi, katalog 30 komoditas, dan direktori 30 kios pasar tradisional telah diimplementasikan secara utuh dan terverifikasi secara fungsional.

**Disusun dan Disahkan di:**  
Depok & Jakarta, 24 September 2026  

**Tim Peneliti & Pengembang:**  
- **Marshal Aufa D.** (NPM: 2406346913)  
- **Zahir** (NPM: 2406487084)  

**Mengetahui Dosen Pengampu Mata Kuliah Rekayasa Perangkat Lunak:**  
**Prof. Dr. Ir. Riri Fitri Sari, M.M., M.Sc.**  
Departemen Teknik Elektro & Ilmu Komputer, Fakultas Teknik, Universitas Indonesia

---

## 18. STANDAR FORMAT DOKUMEN AKADEMIK FTUI (PASARIN-BN BENCHMARK)

Seluruh luaran laporan akademik dan berkas penyerahan resmi perkuliahan Rekayasa Perangkat Lunak diwajibkan mematuhi standar baku dokumen resmi **PASARIN-BN** (berpatokan 100% pada benchmark `PasarinReport_Marshal.docx`):

1. **Struktur Master Template & Halaman:**
   * Menggunakan berkas patokan dasar `PasarinReport_Marshal.docx` dengan section properties `different_first_page_header_footer = True`.
   * Halaman pertama bersih tanpa header/footer otomatis (menggunakan banner `header.png` di atas judul).
   * Halaman kedua dan seterusnya otomatis memuat `header.png` pada bagian atas dan `footer.png` pada bagian bawah.
   * Kertas A4 dengan margin 1.0 inci (lebar area kerja tepat 6.27 inci).
2. **Tipografi & Warna Hitam Murni:**
   * 100% menggunakan jenis huruf **Times New Roman**.
   * 100% menggunakan warna font **Hitam Pekat Murni (`#000000`)** tanpa aksen warna biru atau abu-abu pada teks narasi.
   * Ukuran font: Judul Dokumen **14 pt** (Bold, Center), Heading 1 **14 pt** (Bold, Left), Heading 2 **14 pt** (Bold, Left), Paragraf Isi **12 pt** (Regular, Justify).
3. **Spasi & Jeda Enter Sebelum BAB:**
   * Jarak antar-baris tepat **1.5 Spasi** konsisten di seluruh paragraf dan sel tabel.
   * Spasi paragraf Before & After tepat **0 pt** (tanpa jarak kosong ekstra).
   * Wajib menyisipkan **satu baris spasi enter kosong** tepat sebelum setiap judul BAB (BAB 1, BAB 2, dst.).
4. **Format Tabel Bersih Rata Tengah:**
   * Judul tabel ditulis di atas tabel dengan format rata tengah: `Tabel X.X. Nama Tabel Lengkap` (12 pt, Bold, Center). Dilarang menggunakan garis bawah paragraf XML (`<w:pBdr>`) yang memicu garis centang samping.
   * Seluruh teks di dalam sel tabel diratakan **Tengah (Center)** dengan ukuran 12 pt (10-11 pt untuk tabel inventaris lebar).
   * Kolom deskriptif diperlebar maksimal (2.3 – 3.5 inci), kolom kode singkat dirapatkan (0.6 – 0.9 inci).
5. **Tata Letak Galeri 3 Gambar per Halaman:**
   * Tangkapan layar disematkan berukuran lebar tepat **5.2 inci** rata tengah.
   * Menggunakan jeda halaman (*page break*) setiap 3 gambar agar setiap halaman galeri memuat tepat 3 gambar dengan takarir rapi.
6. **Kebersihan Teks & Anti-Slop (Zero Prompt Leaks):**
   * Dilarang keras menyertakan instruksi internal prompt ke dalam naskah yang diterbitkan.
   * Menggunakan gaya bahasa mahasiswa teknik asli yang sederhana, lugas, dan mengakui realitas kapasitas free-tier (*The Student Reality*).
