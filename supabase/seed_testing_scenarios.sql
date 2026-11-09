-- Penyemaian Skenario Pengujian Mutu dan Kepatuhan Sirkular PASARIN
-- PSR-TEST-SEED: Skenario Segar, Layu Tier 1/2, dan Afkir Maggot Tier 3
-- Target geospasial: Pasar Induk Kramat Jati (-6.2675, 106.8702)

-- Bersihkan data testing sebelumnya (hanya ID berawalan test_)
DELETE FROM claims WHERE id LIKE 'claim_test_%';
DELETE FROM offers WHERE id LIKE 'ofr_test_%';
DELETE FROM stock_items WHERE id LIKE 'stk_test_%';
DELETE FROM system_audit_trail WHERE event_id LIKE 'evt_test_%';

-- Skenario 1: Segar Prima (Penjualan ritel normal di kios)
-- Jam pajang: 2 jam subuh (T=28°C), Decay: 0.08, belum ditawarkan ke surplus.
INSERT INTO stock_items (
    id, vendor_id, commodity_id, initial_quantity_kg, remaining_quantity_kg,
    arrival_timestamp, physical_condition, decay_score, allocated_tier, is_active
) VALUES
('stk_test_01_segar', 'vendor_kramat_01', 'kangkung', 50.00, 50.00,
 NOW() - INTERVAL '2 hours', 'segar', 0.0750, 'tier_1', TRUE),
('stk_test_02_segar', 'vendor_kramat_01', 'bayam', 40.00, 40.00,
 NOW() - INTERVAL '2.5 hours', 'segar', 0.0920, 'tier_1', TRUE);

-- Skenario 2: Layu Ringan (Tier 1: Warteg dan katering UMKM)
-- Jam pajang: 8.5 jam (T=33°C), Decay: 0.42, diskon dinamis 58% (price floor terjaga).
INSERT INTO stock_items (
    id, vendor_id, commodity_id, initial_quantity_kg, remaining_quantity_kg,
    arrival_timestamp, physical_condition, decay_score, allocated_tier, is_active
) VALUES
('stk_test_03_layu_tier1', 'vendor_kramat_01', 'kangkung', 35.00, 35.00,
 NOW() - INTERVAL '8.5 hours', 'layu_ringan', 0.4210, 'tier_1', TRUE),
('stk_test_04_layu_tier1', 'vendor_kramat_02', 'pakcoy', 30.00, 30.00,
 NOW() - INTERVAL '9 hours', 'layu_ringan', 0.4850, 'tier_1', TRUE);

-- Terbitkan tiket penawaran surplus Tier 1
INSERT INTO offers (
    id, stock_id, vendor_id, commodity_id, target_tier, quantity_kg,
    original_wholesale_price_per_kg, salvage_price_per_kg, discount_percentage,
    total_amount_idr, expires_at, status
) VALUES
('ofr_test_01_warteg_kangkung', 'stk_test_03_layu_tier1', 'vendor_kramat_01', 'kangkung', 'tier_1', 35.00,
 6000.00, 2500.00, 58.33, 87500.00, NOW() + INTERVAL '45 minutes', 'active'),
('ofr_test_02_warteg_pakcoy', 'stk_test_04_layu_tier1', 'vendor_kramat_02', 'pakcoy', 'tier_1', 30.00,
 8000.00, 3500.00, 56.25, 105000.00, NOW() + INTERVAL '45 minutes', 'active');

-- Skenario 3: Layu Kritis (Tier 2: Dapur sosial dan bantuan pangan)
-- Jam pajang: 13 jam, Decay: 0.72, olah cepat hari ini dengan jendela eksklusif 30 menit.
INSERT INTO stock_items (
    id, vendor_id, commodity_id, initial_quantity_kg, remaining_quantity_kg,
    arrival_timestamp, physical_condition, decay_score, allocated_tier, is_active
) VALUES
('stk_test_05_layu_tier2', 'vendor_kramat_03', 'sawi_hijau', 25.00, 25.00,
 NOW() - INTERVAL '13 hours', 'layu_sedang', 0.7180, 'tier_2', TRUE);

INSERT INTO offers (
    id, stock_id, vendor_id, commodity_id, target_tier, quantity_kg,
    original_wholesale_price_per_kg, salvage_price_per_kg, discount_percentage,
    total_amount_idr, exclusive_window_expires_at, expires_at, status
) VALUES
('ofr_test_03_sosial_sawi', 'stk_test_05_layu_tier2', 'vendor_kramat_03', 'sawi_hijau', 'tier_2', 25.00,
 6500.00, 500.00, 92.31, 12500.00, NOW() + INTERVAL '30 minutes', NOW() + INTERVAL '60 minutes', 'active');

-- Skenario 4: Tidak Layak Konsumsi / Afkir (Tier 3: Biokonversi maggot BSF)
-- Jam pajang: 18 jam, Decay: 0.95, dialihkan untuk pakan biokonversi maggot.
INSERT INTO stock_items (
    id, vendor_id, commodity_id, initial_quantity_kg, remaining_quantity_kg,
    arrival_timestamp, physical_condition, decay_score, allocated_tier, is_active
) VALUES
('stk_test_06_afkir_tier3', 'vendor_kramat_04', 'sawi_hijau', 60.00, 60.00,
 NOW() - INTERVAL '18 hours', 'tidak_layak', 0.9500, 'tier_3', TRUE),
('stk_test_07_afkir_tier3', 'vendor_kramat_12', 'tomat', 40.00, 40.00,
 NOW() - INTERVAL '22 hours', 'tidak_layak', 0.9850, 'tier_3', TRUE);

INSERT INTO offers (
    id, stock_id, vendor_id, commodity_id, target_tier, quantity_kg,
    original_wholesale_price_per_kg, salvage_price_per_kg, discount_percentage,
    total_amount_idr, expires_at, status
) VALUES
('ofr_test_04_maggot_sawi', 'stk_test_06_afkir_tier3', 'vendor_kramat_04', 'sawi_hijau', 'tier_3', 60.00,
 6500.00, 0.00, 100.00, 0.00, NOW() + INTERVAL '2 hours', 'active'),
('ofr_test_05_maggot_tomat', 'stk_test_07_afkir_tier3', 'vendor_kramat_12', 'tomat', 'tier_3', 40.00,
 9000.00, 0.00, 100.00, 0.00, NOW() + INTERVAL '2 hours', 'active');

-- Skenario 5: Jejak Audit Invarian 1 (Percobaan moral hazard diblokir)
-- Upaya mengalihkan bayam segar prima (decay 0.15) ke pakan maggot ditolak sistem.
INSERT INTO system_audit_trail (
    event_id, subsystem, action_type, payload_json, execution_duration_ms, occurred_at
) VALUES
('evt_test_moral_hazard_blocked', 'QUALITY_GATE', 'INVARIANT_1_VIOLATION_BLOCKED',
 jsonb_build_object(
     'vendorId', 'vendor_kramat_05',
     'vendorName', 'Cak Mat Hasil Tani',
     'commodityId', 'bayam',
     'decayScore', 0.1520,
     'condition', 'segar_prima',
     'requestedTier', 'tier_3',
     'decision', 'BLOCKED_BY_INVARIANT_1',
     'reason', 'PELANGGARAN MORAL HAZARD: Komoditas segar layak konsumsi manusia dilarang mutlak dialihkan ke pakan ternak maggot.',
     'reputationPenalty', -5
 ), 12, NOW() - INTERVAL '1 hour');

-- Skenario 6: Transaksi Rekening Escrow QRIS dan Antrean Kurir (Siap Antar)
-- Warteg Condet telah melunasi via QRIS Dinamis BI; dana tertahan di rekening escrow.
INSERT INTO stock_items (
    id, vendor_id, commodity_id, initial_quantity_kg, remaining_quantity_kg,
    arrival_timestamp, physical_condition, decay_score, allocated_tier, is_active
) VALUES
('stk_test_08_escrow_active', 'vendor_kramat_01', 'kangkung', 25.00, 0.00,
 NOW() - INTERVAL '8 hours', 'layu_ringan', 0.4100, 'tier_1', FALSE);

INSERT INTO offers (
    id, stock_id, vendor_id, commodity_id, target_tier, quantity_kg,
    original_wholesale_price_per_kg, salvage_price_per_kg, discount_percentage,
    total_amount_idr, expires_at, status
) VALUES
('ofr_test_06_in_transit', 'stk_test_08_escrow_active', 'vendor_kramat_01', 'kangkung', 'tier_1', 25.00,
 6000.00, 2500.00, 58.33, 62500.00, NOW() + INTERVAL '1 hour', 'claimed');

INSERT INTO claims (
    id, offer_id, buyer_id, buyer_type, buyer_name, buyer_phone,
    claimed_quantity_kg, total_paid_idr, payment_status, handover_status
) VALUES
('claim_test_01_escrow', 'ofr_test_06_in_transit', 'buyer_warteg_01', 'warteg',
 'Warteg Kharisma Bahari Condet', '081288991122', 25.00, 62500.00,
 'escrow_locked', 'in_transit');

-- Skenario 7: Transaksi Selesai (Settled - Dana cair ke dompet pedagang)
-- Pengantaran selesai diverifikasi kurir dengan GPS dan foto PoD.
INSERT INTO stock_items (
    id, vendor_id, commodity_id, initial_quantity_kg, remaining_quantity_kg,
    arrival_timestamp, physical_condition, decay_score, allocated_tier, is_active
) VALUES
('stk_test_09_settled', 'vendor_kramat_02', 'sawi_hijau', 20.00, 0.00,
 NOW() - INTERVAL '10 hours', 'layu_ringan', 0.4400, 'tier_1', FALSE);

INSERT INTO offers (
    id, stock_id, vendor_id, commodity_id, target_tier, quantity_kg,
    original_wholesale_price_per_kg, salvage_price_per_kg, discount_percentage,
    total_amount_idr, expires_at, status
) VALUES
('ofr_test_07_settled', 'stk_test_09_settled', 'vendor_kramat_02', 'sawi_hijau', 'tier_1', 20.00,
 6500.00, 2500.00, 61.54, 50000.00, NOW() - INTERVAL '2 hours', 'claimed');

INSERT INTO claims (
    id, offer_id, buyer_id, buyer_type, buyer_name, buyer_phone,
    claimed_quantity_kg, total_paid_idr, payment_status, handover_status
) VALUES
('claim_test_02_settled', 'ofr_test_07_settled', 'buyer_warteg_02', 'warteg',
 'Warteg Ibu Yayu Hek Kramat Jati', '081399887766', 20.00, 50000.00,
 'released_to_vendor', 'delivered_verified');

-- Selesai penyemaian skenario pengujian
