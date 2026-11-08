# ==============================================================================
# TESTZEUS HERCULES BDD FEATURE SPECIFICATION: PASARIN E2E SYSTEM VERIFICATION
# Berdasarkan Dokumen PRD Master Bundle (01_PRD_FIX_SYSTEM_ARCHITECTURE.md)
# Target Lingkungan: Localhost (http://localhost:3000) & Vercel (https://pasarin.vercel.app)
# ==============================================================================

Feature: PASARIN Autonomous Multi-Agent Food Surplus Redistribution System
  Sebagai sistem rekayasa perangkat lunak multi-agen otonom
  Sistem PASARIN harus memvalidasi siklus penyelamatan surplus pangan 3-Tier,
  menegakkan kepatuhan keamanan autentikasi peran (Role Isolation),
  melindungi modal pedagang (Price Floor), mengamankan pembayaran (QRIS Escrow BI),
  serta membuktikan 3 Invarian Kritis tanpa pelanggaran etis.

  # ----------------------------------------------------------------------------
  # SCENARIO 1: Keamanan Autentikasi & Penolakan Kata Sandi Salah (SEC-01)
  # ----------------------------------------------------------------------------
  @security @auth @negative
  Scenario: Percobaan login dengan kata sandi salah harus ditolak mutlak
    Given Pengguna membuka halaman otentikasi "http://localhost:3000/login"
    When Pengguna memasukkan identifier "pasar1" pada input username
    And Pengguna memasukkan kata sandi salah "passwordsalah123" pada input password
    And Pengguna menekan tombol "Masuk ke Sistem PASARIN"
    Then Sistem harus menampilkan kotak pesan error merah "Kata sandi yang Anda masukkan salah"
    And Akses menuju dashboard utama harus diblokir secara mutlak

  # ----------------------------------------------------------------------------
  # SCENARIO 2: Alur Pedagang Lapak H. Rohmat Kios A-12 (VEN-01 & VEN-02)
  # ----------------------------------------------------------------------------
  @vendor @role-isolation @positive
  Scenario: Pedagang berhasil masuk, Role Isolation aktif, dan mencatat pasokan baru
    Given Pengguna membuka halaman otentikasi "http://localhost:3000/login"
    When Pengguna memasukkan kredensial sah "pasar1" dan "pasar1"
    And Pengguna menekan tombol "Masuk ke Sistem PASARIN"
    Then Pengguna berhasil dialihkan ke dasbor lapak "H. Rohmat Sayur Daun"
    And Menu peran pengawas di bilah samping harus disembunyikan otomatis
    And Tabel inventaris 6 kolom harus menampilkan komoditas dengan skor peluruhan Arrhenius
    When Pedagang menekan tombol "+ Catat Pasokan Masuk"
    And Pedagang memasukkan kuantitas pasokan "45" kg
    And Pedagang menekan tombol "Simpan ke Lapak"
    Then Komoditas baru harus seketika tercatat di baris inventaris lapak pedagang

  # ----------------------------------------------------------------------------
  # SCENARIO 3: Alur Pembeli Warteg & Simulasi QRIS Escrow Bank Indonesia (WAR-01 & WAR-02)
  # ----------------------------------------------------------------------------
  @warteg @escrow @qris-bi
  Scenario: Warteg melihat katalog terdiskon dan menyelesaikan pembayaran QRIS Escrow
    Given Pengguna masuk sebagai peran pembeli warteg dengan akun "warteg1" / "warteg1"
    Then Pengguna harus melihat katalog belanja surplus berdiskon 50% hingga 70%
    When Pengguna menekan tombol "Klaim & Bayar QRIS" pada penawaran Kangkung Darat
    Then Jendela modal QRIS Dinamis Bank Indonesia harus terbuka menampilkan kode QR EMVCo
    When Pengguna menekan tombol hijau "Konfirmasi Pembayaran QRIS"
    Then Status pesanan pada tab "Pesanan & Escrow" harus berstatus "Terklaim - Dana Tertahan di Escrow"
    And Dana pembayaran pembeli aman tertahan di rekening bersama Bank Indonesia

  # ----------------------------------------------------------------------------
  # SCENARIO 4: Pengawalan Jendela Waktu Prioritas 30 Menit Dapur Sosial (SOC-01)
  # ----------------------------------------------------------------------------
  @social-kitchen @invariant-3 @priority-window
  Scenario: Dapur Sosial Al-Hidayah mengklaim bantuan pangan di bawah Invarian 3
    Given Pengguna masuk sebagai pengurus dapur sosial dengan akun "sosial1" / "sosial1"
    Then Pengguna harus melihat indikator "Jendela Reservasi Prioritas 30 Menit" aktif
    When Pengguna mengklaim penawaran bernutrisi tinggi Pakcoy Hijau
    Then Sistem harus mengonfirmasi klaim donasi/subsidi tanpa penolakan
    And Metrik porsi bergizi harus terhitung proporsional untuk anak panti asuhan

  # ----------------------------------------------------------------------------
  # SCENARIO 5: Penegakan Invarian 1 Anti-Pakan Makanan Layak pada Sentra Maggot (MAG-01)
  # ----------------------------------------------------------------------------
  @maggot @invariant-1 @ethical-gate
  Scenario: Sentra Maggot BSF terbukti hanya menerima komoditas busuk afkir
    Given Pengguna masuk sebagai pengelola sentra biokonversi dengan akun "maggot1" / "maggot1"
    Then Di dasbor maggot HANYA boleh muncul komoditas afkir tidak layak konsumsi
    And Seluruh komoditas segar warteg (Kangkung, Bayam, Tomat) terbukti DIBLOKIR dari biopond
    When Pengelola menekan tombol "Angkut ke Biopond" pada limbah Sawi Inap
    Then Batch limbah organik tercatat masuk ke biopond pakan larva
    And Kartu metana terhindar mencatat reduksi emisi gas metana standar IPCC 2006

  # ----------------------------------------------------------------------------
  # SCENARIO 6: Pengantaran Kurir Viar & Validasi Geofence GPS Radius 50m (LOG-01)
  # ----------------------------------------------------------------------------
  @logistics @geofence @pod-settlement
  Scenario: Kurir memvalidasi bukti serah terima dengan toleransi GPS maksimal 50 meter
    Given Pengguna masuk sebagai kurir armada dengan akun "kurir1" / "kurir1"
    Then Pengguna harus melihat antrean tugas pengantaran armada Viar Roda Tiga
    When Kurir membuka modal "Validasi Serah Terima PoD"
    And Kurir menguji jarak GPS di atas 50 meter (contoh: 75 meter)
    Then Tombol konfirmasi pencairan harus terkunci mati dengan status "Di Luar Radius"
    When Kurir memposisikan jarak GPS di bawah 50 meter (contoh: 18 meter)
    Then Indikator seketika berubah hijau "Lolos Geofence"
    When Kurir menekan tombol "Verifikasi & Cairkan Dana Escrow"
    Then Status tugas tuntas dan dana escrow Bank Indonesia otomatis cair ke saldo pedagang

  # ----------------------------------------------------------------------------
  # SCENARIO 7: Analitik Makro Manajer Pasar Jaya & Kepatuhan DLH DKI (MGR-01)
  # ----------------------------------------------------------------------------
  @manager @dlh-dki @compliance
  Scenario: Manajer pasar memantau efisiensi pengalihan sampah dan mencetak laporan DLH
    Given Pengguna masuk sebagai kepala pasar dengan akun "pengelola1" / "pengelola1"
    Then Dasbor harus menyajikan metrik efisiensi pengalihan sampah mencapai minimal 90% (92.4%)
    And Direktori pemetaan 30 kios binaan Blok A, B, C harus ditampilkan lengkap
    When Pengelola menekan tombol "Cetak Laporan DLH DKI"
    Then Modal dokumen resmi Laporan Kepatuhan Perda DKI No. 4/2019 harus terbuka siap cetak

  # ----------------------------------------------------------------------------
  # SCENARIO 8: Pengawasan Administrator & Eksekusi Master Testbench (ADM-01)
  # ----------------------------------------------------------------------------
  @admin @testbench @zero-errors
  Scenario: Administrator menjalankan testbench otomatis langsung di peramban
    Given Pengguna masuk sebagai administrator dengan akun "admin1" / "admin1"
    When Pengguna membuka menu "Administrator Sistem"
    Then Monitor kuota 100% Free-Tier Cloud harus menampilkan status aman di bawah batas
    When Pengguna menekan tombol "Jalankan 12 Suite Pengujian"
    Then Seluruh suite pengujian harus tercentang hijau secara real-time di layar
    And Banner resmi "SEMUA PENGUJIAN LULUS HIJAU 100% - Status: ZERO ERRORS" harus muncul

  # ----------------------------------------------------------------------------
  # SCENARIO 9: Verifikasi Deployment Global Vercel Production (VER-01)
  # ----------------------------------------------------------------------------
  @production @vercel @global
  Scenario: Memverifikasi sistem aktif mengudara secara global di Vercel
    Given Penguji mengakses URL produksi "https://pasarin.vercel.app/login"
    Then Halaman harus merespons HTTP 200 OK dengan sertifikat SSL aktif
    And Form otentikasi harus tampil bersih, tajam, dan responsif di jaringan publik
