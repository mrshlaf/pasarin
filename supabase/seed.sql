-- ============================================================================
-- PASARIN DATABASE SEED DATA (Supabase PostgreSQL)
-- Task Key: PSR-101 (Pre-seeding 30 Kiosks Kramat Jati & 30 Biological Commodities)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SEED DIREKTORI 30 KIOSK PEDAGANG PASAR INDUK KRAMAT JATI (Blok A, B, C)
-- Dilengkapi verifikasi dokumen resmi izin PD Pasar Jaya
-- ----------------------------------------------------------------------------

-- Blok A: Sayuran Basah & Daun Cepat Layu (Kios A-01 s/d A-10)
INSERT INTO kiosks (id, name, owner_name, phone, stall_number, block, aisle, specialization, address_details, address_proof_document, verification_status, reputation_score, tier2_contribution_count) VALUES
('vendor_kramat_01', 'H. Rohmat Sayur Daun', 'H. Rohmat', '081298765432', 'A-12', 'A', 'Lorong Barat Los Sayur Daun', ARRAY['Kangkung', 'Bayam', 'Sawi Hijau'], 'Pasar Induk Kramat Jati Blok A Los 12, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_A12.pdf', 'verified', 95, 14),
('vendor_kramat_02', 'Pak Asep Pasokan Sukabumi', 'Asep Saepudin', '081311223344', 'A-18', 'A', 'Lorong Barat Los Sayur Daun', ARRAY['Sawi Hijau', 'Pakcoy', 'Buncis'], 'Pasar Induk Kramat Jati Blok A Los 18, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_A18.pdf', 'verified', 92, 9),
('vendor_kramat_03', 'Kang Deni Lembang', 'Deni Ramdani', '085744332211', 'A-24', 'A', 'Lorong Barat Los Sayur Daun', ARRAY['Selada Keriting', 'Pakcoy', 'Bayam Merah'], 'Pasar Induk Kramat Jati Blok A Los 24, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_A24.pdf', 'verified', 94, 11),
('vendor_kramat_04', 'Mbak Sri Rejeki', 'Sri Wahyuni', '081955667788', 'A-05', 'A', 'Lorong Barat Los Sayur Daun', ARRAY['Bayam', 'Kangkung', 'Daun Singkong'], 'Pasar Induk Kramat Jati Blok A Los 05, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_A05.pdf', 'verified', 88, 6),
('vendor_kramat_05', 'Cak Mat Hasil Tani', 'Achmad Subagyo', '082199887711', 'A-09', 'A', 'Lorong Barat Los Sayur Daun', ARRAY['Kangkung Air', 'Daun Katuk', 'Seledri'], 'Pasar Induk Kramat Jati Blok A Los 09, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_A09.pdf', 'verified', 90, 8),
('vendor_kramat_06', 'Mang Iding Sayur Segar', 'Iding Komarudin', '087833445566', 'A-15', 'A', 'Lorong Barat Los Sayur Daun', ARRAY['Sawi Hijau', 'Daun Bawang', 'Kangkung'], 'Pasar Induk Kramat Jati Blok A Los 15, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_A15.pdf', 'verified', 86, 5),
('vendor_kramat_07', 'Ibu Nurhayati Subur', 'Nurhayati', '081233221100', 'A-20', 'A', 'Lorong Barat Los Sayur Daun', ARRAY['Daun Singkong', 'Bayam', 'Sawi Putih'], 'Pasar Induk Kramat Jati Blok A Los 20, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_A20.pdf', 'verified', 96, 16),
('vendor_kramat_08', 'Pak Dedi Agro Tani', 'Dedi Supriadi', '085677889900', 'A-27', 'A', 'Lorong Barat Los Sayur Daun', ARRAY['Pakcoy', 'Selada', 'Bayam Merah'], 'Pasar Induk Kramat Jati Blok A Los 27, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_A27.pdf', 'verified', 91, 7),
('vendor_kramat_09', 'Bu Siti Berkah Daun', 'Siti Aminah', '081366554433', 'A-31', 'A', 'Lorong Barat Los Sayur Daun', ARRAY['Kangkung', 'Bayam', 'Seledri'], 'Pasar Induk Kramat Jati Blok A Los 31, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_A31.pdf', 'verified', 89, 6),
('vendor_kramat_10', 'H. Maman Cipanas', 'H. Maman', '081244556677', 'A-38', 'A', 'Lorong Barat Los Sayur Daun', ARRAY['Daun Bawang', 'Selada Keriting', 'Pakcoy'], 'Pasar Induk Kramat Jati Blok A Los 38, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_A38.pdf', 'verified', 93, 10),

-- Blok B: Cabai, Bumbu, Sayur Buah & Buah Tropis (Kios B-01 s/d B-10)
('vendor_kramat_11', 'Bu Warsiti Cabai Brebes', 'Warsiti', '081211229988', 'B-05', 'B', 'Lorong Tengah Los Cabai & Bumbu', ARRAY['Cabai Merah', 'Cabai Rawit', 'Tomat'], 'Pasar Induk Kramat Jati Blok B Los 05, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_B05.pdf', 'verified', 97, 18),
('vendor_kramat_12', 'Cak Munir Hasil Tani', 'Munir Hasan', '085788990011', 'B-14', 'B', 'Lorong Tengah Los Cabai & Bumbu', ARRAY['Tomat Merah', 'Terung Ungu', 'Cabai Rawit'], 'Pasar Induk Kramat Jati Blok B Los 14, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_B14.pdf', 'verified', 94, 12),
('vendor_kramat_13', 'H. Syarifudin Cabai', 'H. Syarifudin', '081377665544', 'B-08', 'B', 'Lorong Tengah Los Cabai & Bumbu', ARRAY['Cabai Merah Keriting', 'Cabai Rawit'], 'Pasar Induk Kramat Jati Blok B Los 08, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_B08.pdf', 'verified', 91, 8),
('vendor_kramat_14', 'Bang Jali Bumbu Giling', 'Jalaludin', '081822334455', 'B-19', 'B', 'Lorong Tengah Los Cabai & Bumbu', ARRAY['Bawang Merah', 'Bawang Putih', 'Cabai Giling'], 'Pasar Induk Kramat Jati Blok B Los 19, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_B19.pdf', 'verified', 89, 5),
('vendor_kramat_15', 'Ibu Entin Tomat Garut', 'Entin Kartini', '085211223344', 'B-22', 'B', 'Lorong Tengah Los Sayur Buah', ARRAY['Tomat Buah', 'Tomat Sayur', 'Terung Hijau'], 'Pasar Induk Kramat Jati Blok B Los 22, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_B22.pdf', 'verified', 93, 11),
('vendor_kramat_16', 'Pak Hendra Mentimun', 'Hendra Setiawan', '081233445566', 'B-28', 'B', 'Lorong Tengah Los Sayur Buah', ARRAY['Mentimun', 'Oyong', 'Labu Siam'], 'Pasar Induk Kramat Jati Blok B Los 28, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_B28.pdf', 'verified', 90, 7),
('vendor_kramat_17', 'Bu Dewi Berkah Buah', 'Dewi Lestari', '087799887766', 'B-33', 'B', 'Lorong Tengah Los Buah Tropis', ARRAY['Pepaya Calina', 'Pisang Uli', 'Melon'], 'Pasar Induk Kramat Jati Blok B Los 33, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_B33.pdf', 'verified', 95, 13),
('vendor_kramat_18', 'Cak Rusdi Semangka', 'Rusdianto', '081355443322', 'B-39', 'B', 'Lorong Tengah Los Buah Tropis', ARRAY['Semangka Merah', 'Semangka Kuning', 'Melon'], 'Pasar Induk Kramat Jati Blok B Los 39, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_B39.pdf', 'verified', 92, 9),
('vendor_kramat_19', 'Bang Udin Nanas Subang', 'Zaenudin', '085611229900', 'B-45', 'B', 'Lorong Tengah Los Buah Tropis', ARRAY['Nanas Madu', 'Nanas Mahkota', 'Pepaya'], 'Pasar Induk Kramat Jati Blok B Los 45, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_B45.pdf', 'verified', 88, 6),
('vendor_kramat_20', 'H. Basri Cabai Madura', 'H. Basri', '081288990011', 'B-50', 'B', 'Lorong Tengah Los Cabai & Bumbu', ARRAY['Cabai Rawit Merah', 'Bawang Merah Madura'], 'Pasar Induk Kramat Jati Blok B Los 50, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_B50.pdf', 'verified', 96, 15),

-- Blok C: Umbi-Umbian, Buncis & Komoditas Berdaya Tahan Tinggi (Kios C-01 s/d C-10)
('vendor_kramat_21', 'Pak Kardi Kentang Dieng', 'Sukardi', '081399001122', 'C-04', 'C', 'Lorong Timur Los Umbi & Kentang', ARRAY['Kentang Granola', 'Wortel Brastagi'], 'Pasar Induk Kramat Jati Blok C Los 04, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_C04.pdf', 'verified', 95, 10),
('vendor_kramat_22', 'Bu Nanik Wortel Lokal', 'Nanik Suparmi', '085733221100', 'C-09', 'C', 'Lorong Timur Los Umbi & Kentang', ARRAY['Wortel Lokal', 'Lobak Putih', 'Bit Merah'], 'Pasar Induk Kramat Jati Blok C Los 09, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_C09.pdf', 'verified', 91, 8),
('vendor_kramat_23', 'Cak Sholeh Bawang Brebes', 'Sholehudin', '081244332211', 'C-15', 'C', 'Lorong Timur Los Bawang & Umbi', ARRAY['Bawang Merah Bima', 'Bawang Putih Honan'], 'Pasar Induk Kramat Jati Blok C Los 15, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_C15.pdf', 'verified', 97, 17),
('vendor_kramat_24', 'Mang Tatang Kol Cipanas', 'Tatang Sutisna', '087822110099', 'C-21', 'C', 'Lorong Timur Los Sayur Kubis', ARRAY['Kubis Bulat', 'Kembang Kol', 'Brokoli'], 'Pasar Induk Kramat Jati Blok C Los 21, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_C21.pdf', 'verified', 93, 11),
('vendor_kramat_25', 'Bu Rina Buncis Bandung', 'Rina Marlina', '081388776655', 'C-26', 'C', 'Lorong Timur Los Sayur Polong', ARRAY['Buncis Tegak', 'Kacang Panjang', 'Kapri'], 'Pasar Induk Kramat Jati Blok C Los 26, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_C26.pdf', 'verified', 90, 7),
('vendor_kramat_26', 'Pak Yayan Jagung Manis', 'Yayan Heryanto', '085699887766', 'C-30', 'C', 'Lorong Timur Los Jagung & Ubi', ARRAY['Jagung Manis Madu', 'Ubi Cilembu'], 'Pasar Induk Kramat Jati Blok C Los 30, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_C30.pdf', 'verified', 89, 5),
('vendor_kramat_27', 'H. Sobari Labu Siam', 'H. Sobari', '081266554433', 'C-35', 'C', 'Lorong Timur Los Sayur Buah Keras', ARRAY['Labu Siam', 'Oyong', 'Pare Pahit'], 'Pasar Induk Kramat Jati Blok C Los 35, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_C35.pdf', 'verified', 92, 9),
('vendor_kramat_28', 'Bu Endang Singkong Ubi', 'Endang Rahayu', '081911335577', 'C-41', 'C', 'Lorong Timur Los Umbi Tradisional', ARRAY['Singkong Mentega', 'Ubi Jalar Ungu', 'Talas'], 'Pasar Induk Kramat Jati Blok C Los 41, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_C41.pdf', 'verified', 88, 4),
('vendor_kramat_29', 'Cak Wardi Sayur Lodeh', 'Suwardi', '082133446688', 'C-46', 'C', 'Lorong Timur Los Sayur Campur', ARRAY['Nangka Muda', 'Labu Kuning', 'Daun Melinjo'], 'Pasar Induk Kramat Jati Blok C Los 46, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_C46.pdf', 'verified', 94, 12),
('vendor_kramat_30', 'Mang Kosim Jahe Lengkuas', 'Kosim Sanusi', '087755667788', 'C-52', 'C', 'Lorong Timur Los Rimpang Empon', ARRAY['Jahe Gajah', 'Lengkuas', 'Kunyit', 'Kencur'], 'Pasar Induk Kramat Jati Blok C Los 52, Jakarta Timur', 'https://supabase.pasarin.id/docs/izin_kramat_C52.pdf', 'verified', 96, 14)
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 2. SEED KATALOG PROFIL BIOLOGIS KOMODITAS (30 Komoditas Pasar Kramat Jati)
-- Dilengkapi laju respirasi dasar, koefisien termal Q10, dan harga batas bawah
-- ----------------------------------------------------------------------------
INSERT INTO commodities (id, name, local_name, category, standard_shelf_life_hours, respiration_rate_base, q10_coefficient, temperature_sensitivity_factor, humidity_sensitivity_factor, base_wholesale_price_per_kg, minimum_salvage_price_per_kg, decay_layu_ringan_hour, decay_layu_sedang_hour, decay_tidak_layak_hour, storage_advice) VALUES
('kangkung', 'Water Spinach', 'Kangkung Darat', 'leafy_vegetable', 16.00, 35.00, 2.50, 1.80, 1.90, 6000.00, 1500.00, 7.00, 12.00, 16.00, 'Percikkan air berkala, jauhkan dari paparan langsung seng los pasar.'),
('bayam', 'Spinach', 'Bayam Hijau', 'leafy_vegetable', 14.00, 42.00, 2.70, 1.90, 2.00, 7000.00, 1500.00, 6.00, 10.00, 14.00, 'Kemas dalam ikatan longgar, hindari penumpukan melebihi 3 lapis peti.'),
('sawi_hijau', 'Mustard Greens', 'Caisim / Sawi Hijau', 'leafy_vegetable', 18.00, 30.00, 2.40, 1.70, 1.80, 6500.00, 1800.00, 8.00, 13.00, 18.00, 'Letakkan di area berventilasi baik dengan alas terpal bersih.'),
('pakcoy', 'Bok Choy', 'Pakcoy Hijau', 'leafy_vegetable', 24.00, 28.00, 2.30, 1.60, 1.70, 8000.00, 2000.00, 10.00, 18.00, 24.00, 'Potong akar kotor dan simpan pada posisi pangkal menghadap ke bawah.'),
('selada', 'Lettuce', 'Selada Keriting', 'leafy_vegetable', 20.00, 32.00, 2.60, 1.80, 1.90, 14000.00, 4000.00, 9.00, 15.00, 20.00, 'Hindari terkena genangan air hujan agar daun tidak memar dan membusuk.'),
('daun_singkong', 'Cassava Leaves', 'Daun Singkong Muda', 'leafy_vegetable', 24.00, 26.00, 2.20, 1.50, 1.60, 5000.00, 1200.00, 11.00, 18.00, 24.00, 'Ikat tegak dengan tangkai terendam air bersih maksimal 2 cm.'),
('daun_bawang', 'Scallion', 'Daun Bawang Daun', 'leafy_vegetable', 36.00, 22.00, 2.00, 1.40, 1.50, 16000.00, 4500.00, 16.00, 26.00, 36.00, 'Jaga agar ujung daun tetap kering dan bersihkan daun yang patah.'),
('seledri', 'Celery', 'Seledri Daun Sop', 'leafy_vegetable', 30.00, 25.00, 2.20, 1.50, 1.60, 22000.00, 6000.00, 12.00, 22.00, 30.00, 'Bungkus kertas koran/kertas buram berpori untuk menahan kelembapan alami.'),
('sawi_putih', 'Napa Cabbage', 'Sawi Putih / Petsai', 'leafy_vegetable', 48.00, 18.00, 1.80, 1.30, 1.40, 7500.00, 2000.00, 20.00, 36.00, 48.00, 'Kupas helai daun terluar jika layu untuk melindungi bagian dalam.'),
('daun_katuk', 'Star Gooseberry', 'Daun Katuk', 'leafy_vegetable', 18.00, 34.00, 2.50, 1.70, 1.80, 9000.00, 2500.00, 8.00, 13.00, 18.00, 'Hindari paparan sinar matahari terik langsung los.'),
('tomat', 'Tomato', 'Tomat Merah', 'fruit_vegetable', 72.00, 15.00, 1.80, 1.30, 1.40, 12000.00, 3000.00, 30.00, 54.00, 72.00, 'Tata dalam keranjang berventilasi, pisahkan tomat yang retak/pecah.'),
('cabai_merah', 'Red Chili', 'Cabai Merah Keriting', 'fruit_vegetable', 60.00, 16.00, 1.90, 1.40, 1.50, 35000.00, 10000.00, 24.00, 44.00, 60.00, 'Angin-anginkan cabai, jangan ditutup terpal plastik kedap udara.'),
('cabai_rawit', 'Bird Eye Chili', 'Cabai Rawit Merah', 'fruit_vegetable', 65.00, 15.00, 1.80, 1.40, 1.40, 42000.00, 12000.00, 28.00, 48.00, 65.00, 'Pisahkan tangkai busuk agar jamur tidak menular ke buah cabai lain.'),
('terung_ungu', 'Eggplant', 'Terung Ungu Panjang', 'fruit_vegetable', 72.00, 14.00, 1.70, 1.30, 1.30, 8000.00, 2200.00, 30.00, 52.00, 72.00, 'Hindari benturan keras yang menyebabkan luka memar kehitaman.'),
('mentimun', 'Cucumber', 'Mentimun Lokal', 'fruit_vegetable', 80.00, 12.00, 1.60, 1.20, 1.30, 6000.00, 1800.00, 34.00, 60.00, 80.00, 'Susun teratur di peti kayu beralas daun pisang.'),
('buncis', 'Green Bean', 'Buncis Tegak', 'fruit_vegetable', 48.00, 20.00, 2.00, 1.50, 1.60, 15000.00, 4000.00, 18.00, 34.00, 48.00, 'Jauhkan dari kontak langsung dengan buah yang memproduksi gas etilen.'),
('kacang_panjang', 'Yardlong Bean', 'Kacang Panjang', 'fruit_vegetable', 40.00, 22.00, 2.10, 1.60, 1.70, 10000.00, 2500.00, 16.00, 28.00, 40.00, 'Gulung melingkar rapi dan percikkan air embun bersih.'),
('labu_siam', 'Chayote', 'Labu Siam Sedang', 'fruit_vegetable', 120.00, 8.00, 1.40, 1.10, 1.20, 5000.00, 1500.00, 50.00, 90.00, 120.00, 'Tahan lama pada suhu ruang los, cukup simpan di tempat kering.'),
('oyong', 'Luffa', 'Oyong / Gambas', 'fruit_vegetable', 54.00, 18.00, 1.90, 1.40, 1.50, 9000.00, 2500.00, 22.00, 40.00, 54.00, 'Jaga agar kulit luar tidak tergores benda tajam.'),
('pare', 'Bitter Gourd', 'Pare Pahit Hijau', 'fruit_vegetable', 70.00, 14.00, 1.70, 1.30, 1.40, 8500.00, 2200.00, 28.00, 50.00, 70.00, 'Simpan di keranjang terbuka dengan sirkulasi udara bebas.'),
('wortel', 'Carrot', 'Wortel Lokal Cipanas', 'root_vegetable', 140.00, 6.00, 1.40, 1.10, 1.10, 11000.00, 3500.00, 60.00, 105.00, 140.00, 'Potong pangkal daun agar kelembapan umbi wortel tidak tersedot.'),
('kentang', 'Potato', 'Kentang Granola Dieng', 'root_vegetable', 360.00, 3.00, 1.20, 1.00, 1.00, 17000.00, 6000.00, 150.00, 260.00, 360.00, 'Simpan di tempat gelap dan kering untuk mencegah pembentukan solanin.'),
('bawang_merah', 'Shallot', 'Bawang Merah Brebes', 'root_vegetable', 300.00, 4.00, 1.30, 1.10, 1.00, 28000.00, 9000.00, 120.00, 220.00, 300.00, 'Gantung dalam karung jaring berpori dengan sirkulasi angin konstan.'),
('bawang_putih', 'Garlic', 'Bawang Putih Kating', 'root_vegetable', 400.00, 3.00, 1.20, 1.00, 1.00, 34000.00, 12000.00, 180.00, 300.00, 400.00, 'Jauhkan dari tempat lembap untuk mencegah tumbuhnya tunas.'),
('lobak_putih', 'Daikon Radish', 'Lobak Putih', 'root_vegetable', 100.00, 8.00, 1.50, 1.20, 1.30, 9000.00, 2800.00, 40.00, 72.00, 100.00, 'Bungkus pangkal umbi dan letakkan mendatar.'),
('singkong', 'Cassava', 'Singkong Manis Mentega', 'root_vegetable', 48.00, 18.00, 2.00, 1.50, 1.60, 4000.00, 1000.00, 18.00, 34.00, 48.00, 'Kupas kulit segera jika ingin diolah atau lumuri tanah basah.'),
('pepaya', 'Papaya', 'Pepaya Calina California', 'fruit', 96.00, 12.00, 1.60, 1.20, 1.30, 7000.00, 2000.00, 40.00, 72.00, 96.00, 'Alasi busa jaring pada tangkai agar tidak memar saat digeser.'),
('semangka', 'Watermelon', 'Semangka Merah Tanpa Biji', 'fruit', 140.00, 6.00, 1.30, 1.10, 1.10, 8000.00, 2500.00, 60.00, 100.00, 140.00, 'Susun maksimal 3 tumpukan untuk mencegah kulit semangka pecah.'),
('melon', 'Melon', 'Melon Hijau Sky Rocket', 'fruit', 120.00, 8.00, 1.40, 1.20, 1.20, 11000.00, 3500.00, 50.00, 90.00, 120.00, 'Periksa jaring kulit melon secara berkala dari rembesan air manis.'),
('pisang', 'Banana', 'Pisang Uli Masak Pohon', 'fruit', 72.00, 18.00, 2.10, 1.60, 1.70, 12000.00, 3500.00, 26.00, 50.00, 72.00, 'Gantung sisir pisang di tiang bambu los agar getah tidak mengendap.')
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 3. SEED CONTOH INVENTARIS AWAL & TIKET PENAWARAN (Sample Active Data)
-- Untuk menguji query baca/tulis aplikasi client TypeScript secara langsung
-- ----------------------------------------------------------------------------
INSERT INTO stock_items (id, vendor_id, commodity_id, initial_quantity_kg, remaining_quantity_kg, arrival_timestamp, physical_condition, decay_score, allocated_tier, is_active) VALUES
('stock_init_01', 'vendor_kramat_01', 'bayam', 100.00, 35.00, CURRENT_TIMESTAMP - INTERVAL '8 hours', 'layu_ringan', 0.3850, 'tier_1', true),
('stock_init_02', 'vendor_kramat_01', 'kangkung', 150.00, 60.00, CURRENT_TIMESTAMP - INTERVAL '8 hours', 'layu_ringan', 0.3500, 'tier_1', true),
('stock_init_03', 'vendor_kramat_02', 'sawi_hijau', 80.00, 25.00, CURRENT_TIMESTAMP - INTERVAL '10 hours', 'layu_sedang', 0.5200, 'tier_2', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO offers (id, stock_id, vendor_id, commodity_id, target_tier, quantity_kg, original_wholesale_price_per_kg, salvage_price_per_kg, discount_percentage, total_amount_idr, expires_at, status) VALUES
('offer_init_01', 'stock_init_01', 'vendor_kramat_01', 'bayam', 'tier_1', 35.00, 7000.00, 2800.00, 60.00, 98000.00, CURRENT_TIMESTAMP + INTERVAL '2 hours', 'active'),
('offer_init_02', 'stock_init_02', 'vendor_kramat_01', 'kangkung', 'tier_1', 60.00, 6000.00, 2400.00, 60.00, 144000.00, CURRENT_TIMESTAMP + INTERVAL '2 hours', 'active'),
('offer_init_03', 'stock_init_03', 'vendor_kramat_02', 'sawi_hijau', 'tier_2', 25.00, 6500.00, 1300.00, 80.00, 32500.00, CURRENT_TIMESTAMP + INTERVAL '30 minutes', 'active')
ON CONFLICT (id) DO NOTHING;
