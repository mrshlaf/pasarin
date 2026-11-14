# Dokumentasi Frontend PASARIN

Dokumen ini mencakup 19 berkas frontend: rute, navigasi, dasbor peran, komponen bersama (termasuk komponen foto editorial), autentikasi, dan penyimpan state klien. Nama komponen dan perilaku mengacu pada sumber saat pembaruan ini. Endpoint disebut sebagai batas komunikasi frontend, bukan bukti bahwa layanan eksternal telah terintegrasi atau diuji.

## Alur aplikasi

`RootLayout` membungkus halaman dengan `AuthProvider`, lalu `SimulationProvider`. Rute `/` menampilkan ringkasan publik melalui `PublicMarketDashboard`; data publik dimuat terpisah dari snapshot ruang kerja privat. Rute `/login` menangani masuk akun. Rute `/dashboard` memilih ruang kerja berdasarkan peran. Rute `/telegram/login` menangani pengaitan akun melalui sesi Telegram WebApp.

Peran operasional adalah `vendor`, `warteg`, `social_kitchen`, `maggot`, `logistics`, `manager`, dan `admin`. Pratinjau ruang kerja oleh pengelola/admin tidak mengubah identitas akun atau memberikan hak transaksi sebagai pedagang/pembeli yang dipratinjau. Pembatasan tampilan frontend tidak menggantikan pemeriksaan izin server.

## 1. `src/app/layout.tsx`

`RootLayout` menyediakan HTML berbahasa Indonesia, font Geist dan Geist Mono, metadata judul/deskripsi/ikon, serta impor `globals.css`. Urutan provider membuat `SimulationProvider` dapat membaca pengguna melalui `useAuth`. Metadata yang menyebut AI bukan bukti adanya layanan AI publik pada halaman beranda.

## 2. `src/app/page.tsx`

`Home` merender `PublicMarketDashboard`. Halaman tidak memerlukan login dan tidak memakai dasbor privat sebagai sumber tampilan publik.

## 3. `src/app/login/page.tsx`

`LoginPage` memakai `useAuth`, `signInWithPassword`, dan `handleSubmit`. Form memiliki label, autocomplete, tombol tampil/sembunyi kata sandi, status pemeriksaan sesi/pengiriman, serta pesan galat dengan `role="alert"`. Pengiriman ganda dicegah selama proses masuk. Akun yang sudah terautentikasi diarahkan ke `/dashboard`.

Kredensial salah ditampilkan sebagai kegagalan masuk; exception jaringan menghasilkan pesan koneksi terganggu. Form tidak menyamakan kegagalan jaringan dengan keberhasilan autentikasi. Panel `timeline` menjelaskan pasokan, pesanan, dan pengantaran, bukan mekanisme single sign-on.

## 4. `src/app/dashboard/page.tsx`

`DashboardPage` menjaga akses berdasarkan `isAuthenticated` dan `isLoading`. `DashboardContent` menyusun `AppHeader`, navigasi pratinjau, deskripsi peran, status sinkronisasi, umpan balik aksi, dan konten utama.

Pemilihan konten:

| Peran | Komponen |
| --- | --- |
| `vendor` | `VendorDashboard` |
| `warteg`, `social_kitchen`, `maggot` | `BuyerDashboard` |
| `logistics` | `LogisticsDashboard` |
| `manager`, `admin` | `OversightDashboard` |

`stateReady` membedakan snapshot yang sudah tersedia dari pemuatan awal. `syncError` ditampilkan dengan tindakan `refreshMarket`; `isSyncing` menunjukkan proses pemuatan ulang. Kegagalan pembaruan tidak boleh dibaca sebagai data pasar kosong. Umpan balik mutasi (`feedback`, `clearFeedback`) terpisah dari kegagalan sinkronisasi.

## 5. `src/app/telegram/login/page.tsx`

`TelegramLogin` memuat SDK `https://telegram.org/js/telegram-web-app.js`. `TelegramWindow` mendeskripsikan `WebApp.initData`, `ready`, dan `close`. Setelah SDK siap, halaman membaca `initData`. Tanpa sesi Telegram, halaman memberi petunjuk membuka bot; formulir kredensial tidak ditampilkan sebagai alur masuk yang siap dipakai.

`login` mengirim `initData`, identifier, dan kata sandi ke `/api/telegram/login`. Halaman menangani status sibuk, galat respons/jaringan, dan hasil sukses. Form mendukung tampil/sembunyi kata sandi. Validasi tanda tangan dan pengaitan akun merupakan tanggung jawab backend; frontend hanya mengirim data sesi. Tautan bot bukan bukti keberhasilan autentikasi Telegram nyata.

## 6. `src/components/layout/AppHeader.tsx`

`AppHeader` menampilkan `PasarinLogo`, `RealtimeWibClock`, identitas akun, akses Telegram, dan keluar akun. State `leaving` mencegah pengulangan keluar; `error` menampilkan kegagalan `signOut`. Sesi tidak dianggap berakhir hanya karena tombol telah ditekan.

## 7. `src/components/layout/AppSidebar.tsx`

`AppSidebar` hanya muncul bagi `admin` dan `manager`. `ROLE_LABELS`, `ROLE_ICONS`, dan `PREVIEW_TIERS` menyusun navigasi. Peran yang tersedia disaring melalui `isRoleAccessible`; pemilihan memakai `setRole`.

Pada layar kecil navigasi memakai `<select>`, sedangkan layar besar memakai daftar tombol. `pendingCount` dan `pendingLabel` memberi konteks antrean: jumlah pedagang dengan stok tersedia, penawaran aktif per tier pembeli, atau pesanan siap diantar melalui `isReadyForDelivery`. Angka pedagang bukan jumlah lot yang belum ditimbang.

## 8. `src/components/market/PublicMarketDashboard.tsx`

`PublicMarketDashboard` memuat `/api/market/overview` ke `snapshot` yang menyimpan data dan timestamp. Permintaan tidak ditumpuk selama masih berjalan, memiliki batas waktu 12 detik, dan dibatalkan saat efek dibersihkan. Pembaruan periodik berjalan setiap 60 detik saat halaman tidak tersembunyi; tombol pembaruan tersedia untuk mencoba lagi.

Ringkasan memperlihatkan penawaran yang tersedia dalam aplikasi, bukan seluruh pasokan Pasar Induk Kramat Jati: jumlah lot, kilogram tersedia, volume tersalurkan, pengantaran selesai, pembagian tiga jalur, serta hingga lima komoditas dengan volume tertinggi. Identitas akun tidak ditampilkan. Jika pembaruan gagal setelah pernah berhasil, angka snapshot lama dipertahankan dengan waktu asal dan peringatan. Kegagalan awal, pemuatan, dan penawaran kosong mempunyai pesan yang berbeda.

Bagian estimasi ditampilkan terbuka ketika `data.forecast` tersedia. Fokusnya adalah potensi porsi Warteg dan Dapur Sosial, dengan asumsi 1 kg menjadi 4 porsi, disertai perkiraan unit kendaraan, kapasitas per unit, dan tujuan jalur. Estimasi kendaraan memakai alokasi minimum, termasuk saat pasokan kosong. Angka ini bukan realisasi penyaluran, konfirmasi ketersediaan kendaraan, penugasan kurir, telemetri armada, atau hasil AI publik yang sedang berjalan. Snapshot operasional dan forecast berlabel harus dibaca terpisah.

## 9. `src/components/roles/VendorDashboard.tsx`

`VendorDashboard` menampilkan identitas kios, stok, mutu, perkiraan sisa, penawaran, saldo, dan transaksi. `canManage` mensyaratkan akun pedagang dengan `vendorId`; pengawas dapat memilih kios untuk pratinjau, bukan melakukan aksi atas namanya.

`recordArrival` memanggil `addStockItem` dengan komoditas dan berat awal. Umpan balik lokal menjelaskan hasil pencatatan dan berat dikosongkan setelah sukses. Inventaris dapat dicari berdasarkan komoditas, kode lot, atau kios dan disaring menurut stok tersedia/belum terverifikasi. Pengurutan mendahulukan stok yang masih tersedia dan berisiko susut lebih tinggi.

`openConfirmation` membuka dialog dengan berat dan mode yang belum dipilih. `confirmStock` mengirim `confirmedKg` melalui `createInstantSurplusOffer` atau `approveOfferByVendor` bila berasal dari proposal. Pilihan jual/donasi dikirim untuk tier 2. Batas berat memperhitungkan bagian lot yang sudah diklaim atau selesai. Proposal juga dapat ditolak melalui `rejectOfferByVendor`. Pencatatan stok tidak sama dengan publikasi: pedagang perlu mengonfirmasi sisa fisik agar penawaran masuk katalog. Nilai mutu adalah keluaran model, bukan sertifikasi keamanan pangan.

## 10. `src/components/roles/BuyerDashboard.tsx`

`BuyerDashboard({ role })` memetakan Warteg ke `tier_1`, Dapur Sosial ke `tier_2`, dan Maggot ke `tier_3`. Katalog hanya berisi penawaran aktif di tier terkait. Pencarian mencakup komoditas, kios, dan kode lot; filter membedakan jual/donasi, dengan pengurutan terbaru, mutu, atau harga. Daftar awal dibatasi delapan penawaran dan dapat diperluas.

Akun hanya dapat membeli ketika peran akunnya sama dengan peran ruang kerja (`canBuy`). Pesanan milik pembeli dibedakan melalui `isMine`; pratinjau pengawas tidak menjadi sesi pembeli.

Dialog jumlah memakai kilogram bulat, minimal 1 kg, maksimal pembulatan ke bawah dari jumlah tersedia. Tombol jumlah cepat dan ambil semua membantu memilih bagian lot. `reserve` memanggil `claimOfferByBuyer(offerId, quantityKg, requestId)`; request ID disimpan pada pilihan klaim. Galat tetap ditampilkan dalam dialog. Respons sukses menutup pilihan jumlah; bila pesanan berstatus `unpaid`, dialog tagihan dibuka.

`pay` memanggil `payQrisForOffer`. Dialog menyebut pembayaran QRIS sebagai simulasi dan menyajikan harga acuan, potongan, serta total. Tidak ada pemindahan uang nyata yang dijanjikan. Pembayaran simulasi dicatat di escrow sampai serah terima. Tombol bayar nanti memungkinkan melanjutkan pembayaran dari daftar pesanan. Donasi dan biomassa Maggot gratis tidak memerlukan pembayaran; biomassa bukan untuk konsumsi pangan. Riwayat membedakan transaksi ditahan, dilepas, dan dikembalikan.

## 11. `src/components/roles/LogisticsDashboard.tsx`

`LogisticsDashboard` memakai `isReadyForDelivery` untuk antrean dan status `settled` untuk pengantaran selesai. `DISPATCH_PHASES` menyediakan filter semua tahap atau tier tertentu; daftar dan metrik mengikuti filter aktif.

`getOfferVehicleBadge` dan `getTierBadge` menyajikan rencana kendaraan dan jalur. Jadwal, kendaraan, serta pengemudi berasal dari konfigurasi simulasi, bukan pelacakan armada langsung. `finish` memanggil `confirmDelivery` dari dialog serah terima; dialog ditutup hanya setelah berhasil, sedangkan kegagalan ditampilkan. Konfirmasi inilah yang mengubah status pengantaran; label kendaraan tidak membuktikan perjalanan fisik.

## 12. `src/components/roles/OversightDashboard.tsx`

`OversightDashboard` merangkum stok berisiko, penawaran aktif terverifikasi, antrean siap antar, penyaluran selesai, dan transaksi. Penawaran diurutkan berdasarkan status, ditampilkan awal hingga 12 baris, dan dapat diperluas.

`runStockEvaluation` memanggil `triggerCronSweepNow` dan menampilkan hasil evaluasi. `openDlhReport` membuka `MarketDialog`, memuat laporan simulasi metabolisme 24 jam, serta menangani loading, galat, dan percobaan ulang. Laporan menjalankan skenario model terpisah. Ambang 90% adalah pembanding simulator, bukan sertifikasi/audit kepatuhan DLH atau bukti pengalihan limbah operasional hari ini.

## 13. `src/components/common/MarketWorkspace.tsx`

Modul bersama ini menghindari format dan pola tampilan berbeda antarperan:

- `MarketSection` membungkus bagian dengan judul, deskripsi, aksi, dan varian card/plain.
- `MarketMetrics` menerima `MarketMetric[]` dan menyesuaikan kolom dengan jumlah metrik serta lebar layar.
- `StatusPill`, `Tone`, `TierChip`, dan `TIER_LABELS` menyajikan status dan tier dengan teks, bukan warna saja.
- `DecayMeter` membatasi skor tampilan pada 0 sampai 100, menyediakan semantik `role="meter"`, dan memberi label zona mutu. Komponen ini memvisualisasikan skor yang diterima, bukan menjalankan model Arrhenius sendiri.
- `EmptyState`, `MarketRow`, dan `LotFacts` menyediakan keadaan kosong, baris responsif, serta pasangan label/nilai.
- `commodityName`, `kioskInfo`, `kioskLabel`, dan `offerTitle` menyelesaikan identitas komoditas/kios/penawaran dari data terkait.
- `rupiah`, `kg`, dan pembantu waktu memformat angka untuk tampilan Indonesia. `marketButton`, `marketSecondary`, dan `marketDanger` menyediakan kelas tombol bersama.
- `orderStatus` diekspor ulang dari `src/lib/orderStatus`, bukan didefinisikan sebagai logika status terpisah di modul ini.

## 14. `src/components/common/MarketDialog.tsx`

`MarketDialog({ title, onClose, children })` memakai elemen native `<dialog>` dan `showModal`, dengan judul yang dihubungkan melalui `aria-labelledby`. Browser menangani fokus modal dan navigasi Tab; Escape ditangani melalui `onCancel` yang memanggil `onClose`. Klik backdrop juga meminta penutupan. Ketika komponen dibersihkan, dialog ditutup dan fokus dikembalikan ke pemicu bila elemen masih terhubung.

Pemanggil dapat menolak penutupan ketika `busy`, misalnya saat klaim atau pembayaran. Tombol batal/tutup dan pengiriman formulir berada pada konten pemanggil, bukan tombol global yang dibuat otomatis oleh `MarketDialog`.

## 15. `src/components/common/PasarinLogo.tsx`

`PasarinLogo` merender identitas merek dengan pilihan `size`, `variant`, dan `showSubtitle`. Halaman publik, formulir masuk, dan header memakai komponen yang sama, sehingga tidak perlu membuat markup logo terpisah.

## 16. `src/components/common/RealtimeWibClock.tsx`

`RealtimeWibClock` menyediakan jam/tanggal WIB dengan opsi `className`, `showSeconds`, dan `showDate`. Pembaruan berjalan pada klien dengan zona waktu Jakarta. Jam ini merupakan waktu peramban yang diformat ke WIB, bukan bukti sinkronisasi waktu server atau waktu pembaruan snapshot.

## 17. `src/components/common/MarketEditorialImage.tsx`

Komponen `MarketHeroBackground` (dan alias `MarketEditorialImage`) merender latar belakang foto lanskap atmosferik (`market`, `meals`, `cooking`, `biomass`, dan `cargo`) dengan lapisan *gradient scrim* multi-layer hijau pinus gelap (`from-brand-deep/96 via-brand-deep/88 to-transparent`) per peran (`public`, `vendor`, `warteg`, `social_kitchen`, `maggot`, `logistics`, `manager`, dan `admin`). Foto bersumber dari berkas WebP lokal beresolusi tinggi di `public/images/editorial/` tanpa menampilkan teks nama akun/atribusi di atas antarmuka sesuai arahan desain visual. Pola scrim ini memastikan warna dan tekstur alami komoditas pangan tampak hidup dan lapang di sisi kanan, sementara teks judul serif dan angka metrik di sisi kiri terlindungi penuh dengan kontras superior WCAG AAA (>10:1).

## 18. `src/lib/authContext.tsx`

`AuthProvider` dan `useAuth` menyediakan pengguna, `isAuthenticated`, `isLoading`, `signInWithPassword`, `signOut`, serta `isRoleAccessible`.

Mode ditentukan konfigurasi: `NEXT_PUBLIC_PASARIN_SERVER_AUTH === "1"` memakai sesi server melalui `/api/auth/session`. Akun uji lokal hanya diaktifkan pada development ketika mode server tidak aktif. Jalur lain memakai Supabase Auth bila dikonfigurasi. Login username/email diselesaikan melalui pembantu autentikasi yang diimpor; dokumen ini tidak menganggap semua mode aktif bersamaan.

Galat meliputi kredensial tidak cocok, layanan masuk belum dikonfigurasi, dan akun tanpa profil peran Pasarin. `signOut` memeriksa kegagalan penghapusan sesi server/lokal maupun Supabase, lalu memperbarui state sesuai hasilnya. `isRoleAccessible` mengizinkan peran sendiri serta akses pratinjau bagi admin/pengelola. `useAuth` melempar error bila digunakan di luar provider.

## 19. `src/lib/simulationStore.tsx`

`SimulationProvider` dan `useMarketSimulation` menyediakan kontrak `SimulationContextType`. Server tetap menjadi sumber snapshot operasional; nama simulationStore tidak berarti seluruh transaksi hanya tersimpan di memori browser.

### Snapshot dan sinkronisasi

`MarketSnapshot` menyimpan `userId`, state server, dan `syncedAt`. Data hanya dibaca ketika identitas snapshot cocok dengan pengguna aktif. Peran pratinjau pada `workspace`, `feedback`, dan `syncError` juga dibatasi identitas pengguna. Pergantian akun tidak menampilkan snapshot/umpan balik akun sebelumnya.

Efek memuat `/api/simulation/state` segera, setiap 15 detik, dan saat jendela memperoleh fokus. `inFlight` menerapkan singleflight dalam efek agar polling tidak bertumpuk; `changing.current` menahan polling selama mutasi. Cleanup membatalkan permintaan dan melepas timer/listener. `refreshMarket` memicu siklus pemuatan ulang.

`stateReady` berarti snapshot pengguna tersedia. `isSyncing` berarti pengguna tersebut sedang disinkronkan. `syncError` menyimpan kegagalan pembaruan tanpa menghapus snapshot terakhir; kesuksesan sinkronisasi membersihkan galat. `busy` menandai mutasi, bukan sinonim semua aktivitas jaringan.

`generation.current` dinaikkan ketika mutasi dimulai. Polling menyimpan versi sebelum permintaan dan mengabaikan respons jika generasi berubah, sehingga respons lama tidak menimpa hasil mutasi yang lebih baru. `mutate` menolak tindakan bersamaan, mengirim POST, menerima snapshot hasil server, menyimpan umpan balik, lalu memicu refresh. Kegagalan jaringan meminta pengguna memeriksa data sebelum mengulangi tindakan; tidak mengarang hasil sukses.

### Aksi dan data turunan

| Fungsi konteks | Tujuan |
| --- | --- |
| `addStockItem` | Catat stok, aksi `stock` |
| `createInstantSurplusOffer` | Terbitkan sisa terkonfirmasi, aksi `publish` |
| `approveOfferByVendor`, `rejectOfferByVendor` | Keputusan proposal, aksi `vendor_decision` |
| `claimOfferByBuyer` | Klaim jumlah dan request ID melalui `/api/offers/claim` |
| `payQrisForOffer` | Catat pembayaran simulasi, aksi `payment` |
| `confirmDelivery` | Konfirmasi serah terima, aksi `delivery` |
| `triggerCronSweepNow` | Evaluasi melalui `/api/orchestrator/run` |

Aksi selain endpoint khusus memakai `/api/simulation/state`. Provider juga mengekspos stok, penawaran, transaksi, saldo pedagang, cuaca, dan perkiraan sisa dari snapshot. Pembaruan jam setiap detik menurunkan estimasi sisa waktu simpan dan menaikkan kondisi menjadi tidak layak/tier 3 bila batas tercapai. Ini bukan pemanggilan sensor atau perhitungan ulang penuh model setiap detik. `useMarketSimulation` melempar error bila dipakai di luar provider.

## Cakupan observasi dan batas eksternal

Observasi browser yang disampaikan pada pembaruan ini mencakup ketujuh peran pada lebar 320, 768, dan 1440 piksel; alur stok, klaim sebagian, pembayaran QRIS simulasi, hingga pengantaran dengan escrow released; klaim donasi dan biomassa gratis; laporan simulasi 24 jam; kegagalan sinkronisasi dan coba lagi; snapshot publik lama saat gagal memperbarui dan coba lagi; serta login benar/salah.

Pemeriksaan akhir yang dilaporkan agen utama: tidak ada overflow halaman publik pada lebar 320, 375, 768, dan 1440 piksel; pasangan warna yang diperiksa memiliki rasio kontras 6,5 sampai 10,22:1. `npm test`, typecheck, dan lint lulus; lint mencakup perapian tipe pada skrip yang sudah ada. Build Turbopack default terhalang akses junction Windows (access denied), sedangkan `npx next build --webpack` lulus. Ini adalah hasil yang disampaikan agen utama, bukan pemeriksaan ulang oleh penulis dokumen.

Autentikasi Telegram nyata belum dijalankan karena layanan tidak tersedia. Observasi tersebut tidak membuktikan pembayaran uang nyata, pengantaran fisik, ketersediaan armada, integrasi sensor langsung, sertifikasi DLH, atau kinerja layanan eksternal. Pembaruan dokumen ini tidak menjalankan build, test, lint, formatter, maupun pemeriksaan git.
