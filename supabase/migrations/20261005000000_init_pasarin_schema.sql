-- ============================================================================
-- PASARIN DATABASE INITIAL MIGRATION (Supabase PostgreSQL DDL)
-- Task Key: PSR-101 (Supabase PostgreSQL Schema and DDL Design)
-- Deskripsi: Merancang skema relasional, indeks B-Tree, integritas referensial,
--            dan kebijakan Row Level Security (RLS) untuk sistem multi-agen PASARIN.
-- ============================================================================

-- Aktifkan ekstensi UUID dan Kriptografi
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABEL KIOSK PEDAGANG PASAR INDUK KRAMAT JATI (kiosks)
-- Direktori 30 pedagang pasar dengan verifikasi dokumen resmi
-- ============================================================================
CREATE TABLE IF NOT EXISTS kiosks (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    owner_name VARCHAR(128) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    stall_number VARCHAR(16) NOT NULL UNIQUE,
    block CHAR(1) NOT NULL CHECK (block IN ('A', 'B', 'C')),
    aisle VARCHAR(64) NOT NULL,
    specialization TEXT[] NOT NULL DEFAULT '{}',
    address_details TEXT NOT NULL,
    address_proof_document VARCHAR(512) NOT NULL,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'pending_address_verification'
        CHECK (verification_status IN ('verified', 'pending_address_verification', 'rejected')),
    verified_at TIMESTAMP WITH TIME ZONE NULL,
    reputation_score INTEGER NOT NULL DEFAULT 85 CHECK (reputation_score BETWEEN 0 AND 100),
    tier2_contribution_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indeks B-Tree untuk tabel kiosks
CREATE INDEX IF NOT EXISTS idx_kiosks_block ON kiosks(block);
CREATE INDEX IF NOT EXISTS idx_kiosks_verification_status ON kiosks(verification_status);
CREATE INDEX IF NOT EXISTS idx_kiosks_stall_number ON kiosks(stall_number);


-- ============================================================================
-- 2. TABEL PROFIL BIOLOGIS KOMODITAS (commodities)
-- Katalog 30 komoditas lengkap dengan kinetika respirasi seluler & batas daya simpan
-- ============================================================================
CREATE TABLE IF NOT EXISTS commodities (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    local_name VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL 
        CHECK (category IN ('leafy_vegetable', 'fruit_vegetable', 'root_vegetable', 'fruit')),
    standard_shelf_life_hours NUMERIC(6, 2) NOT NULL,
    respiration_rate_base NUMERIC(8, 2) NOT NULL DEFAULT 25.00, -- mg CO2/kg-hr pada 25°C
    q10_coefficient NUMERIC(4, 2) NOT NULL DEFAULT 2.50,         -- koefisien termal Arrhenius
    temperature_sensitivity_factor NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    humidity_sensitivity_factor NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    base_wholesale_price_per_kg NUMERIC(10, 2) NOT NULL,
    minimum_salvage_price_per_kg NUMERIC(10, 2) NOT NULL,        -- Price floor pelindung modal pedagang
    decay_layu_ringan_hour NUMERIC(6, 2) NOT NULL,              -- Ambang Tier 1
    decay_layu_sedang_hour NUMERIC(6, 2) NOT NULL,              -- Ambang Tier 2
    decay_tidak_layak_hour NUMERIC(6, 2) NOT NULL,              -- Ambang Tier 3
    storage_advice TEXT NOT NULL,
    image_url VARCHAR(512) NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indeks B-Tree untuk tabel commodities
CREATE INDEX IF NOT EXISTS idx_commodities_category ON commodities(category);
CREATE INDEX IF NOT EXISTS idx_commodities_name ON commodities(name);


-- ============================================================================
-- 3. TABEL INVENTARIS HARIAN LAPAK PEDAGANG (stock_items)
-- Mengelola stok masuk subuh, peluruhan mutu, dan status keaktifan inventaris
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_items (
    id VARCHAR(64) PRIMARY KEY,
    vendor_id VARCHAR(64) NOT NULL REFERENCES kiosks(id) ON DELETE CASCADE,
    commodity_id VARCHAR(64) NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
    initial_quantity_kg NUMERIC(10, 2) NOT NULL CHECK (initial_quantity_kg > 0),
    remaining_quantity_kg NUMERIC(10, 2) NOT NULL CHECK (remaining_quantity_kg >= 0),
    arrival_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    physical_condition VARCHAR(32) NOT NULL DEFAULT 'segar'
        CHECK (physical_condition IN ('segar', 'layu_ringan', 'layu_sedang', 'tidak_layak')),
    decay_score NUMERIC(5, 4) NOT NULL DEFAULT 0.0000 CHECK (decay_score BETWEEN 0.0000 AND 1.0000),
    allocated_tier VARCHAR(16) NOT NULL DEFAULT 'tier_1'
        CHECK (allocated_tier IN ('tier_1', 'tier_2', 'tier_3')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indeks B-Tree untuk integritas referensial dan performa query inventaris
CREATE INDEX IF NOT EXISTS idx_stock_items_vendor ON stock_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_commodity ON stock_items(commodity_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_condition ON stock_items(physical_condition);
CREATE INDEX IF NOT EXISTS idx_stock_items_is_active ON stock_items(is_active);


-- ============================================================================
-- 4. TABEL TIKET PENAWARAN SURPLUS SIRKULAR (offers)
-- Mengelola alokasi 3-tier, harga dinamis, countdown waktu, dan status klaim
-- ============================================================================
CREATE TABLE IF NOT EXISTS offers (
    id VARCHAR(64) PRIMARY KEY,
    stock_id VARCHAR(64) NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
    vendor_id VARCHAR(64) NOT NULL REFERENCES kiosks(id) ON DELETE CASCADE,
    commodity_id VARCHAR(64) NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
    target_tier VARCHAR(16) NOT NULL 
        CHECK (target_tier IN ('tier_1', 'tier_2', 'tier_3')),
    quantity_kg NUMERIC(10, 2) NOT NULL CHECK (quantity_kg > 0),
    original_wholesale_price_per_kg NUMERIC(10, 2) NOT NULL,
    salvage_price_per_kg NUMERIC(10, 2) NOT NULL,
    discount_percentage NUMERIC(5, 2) NOT NULL CHECK (discount_percentage BETWEEN 0 AND 100),
    total_amount_idr NUMERIC(12, 2) NOT NULL,
    exclusive_window_expires_at TIMESTAMP WITH TIME ZONE NULL, -- Jendela eksklusif 30 menit Tier 2
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'claimed', 'expired', 'transferred_to_feed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indeks B-Tree untuk mempercepat pencarian penawaran aktif dan pemfilteran tier
CREATE INDEX IF NOT EXISTS idx_offers_stock ON offers(stock_id);
CREATE INDEX IF NOT EXISTS idx_offers_vendor ON offers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_offers_commodity ON offers(commodity_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_target_tier ON offers(target_tier);
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON offers(expires_at);


-- ============================================================================
-- 5. TABEL KLAIM PESANAN PEMBELI (claims)
-- Transaksi serah terima oleh Warteg, Dapur Umum, atau Sentra Maggot
-- ============================================================================
CREATE TABLE IF NOT EXISTS claims (
    id VARCHAR(64) PRIMARY KEY,
    offer_id VARCHAR(64) NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
    buyer_id VARCHAR(64) NOT NULL,
    buyer_type VARCHAR(32) NOT NULL 
        CHECK (buyer_type IN ('warteg', 'social_kitchen', 'maggot_facility')),
    buyer_name VARCHAR(128) NOT NULL,
    buyer_phone VARCHAR(32) NOT NULL,
    claimed_quantity_kg NUMERIC(10, 2) NOT NULL CHECK (claimed_quantity_kg > 0),
    total_paid_idr NUMERIC(12, 2) NOT NULL,
    payment_status VARCHAR(32) NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'escrow_locked', 'released_to_vendor', 'refunded')),
    handover_status VARCHAR(32) NOT NULL DEFAULT 'pending_pickup'
        CHECK (handover_status IN ('pending_pickup', 'in_transit', 'delivered_verified', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indeks B-Tree untuk tabel claims
CREATE INDEX IF NOT EXISTS idx_claims_offer ON claims(offer_id);
CREATE INDEX IF NOT EXISTS idx_claims_buyer ON claims(buyer_id);
CREATE INDEX IF NOT EXISTS idx_claims_payment_status ON claims(payment_status);


-- ============================================================================
-- 6. PENGATURAN ROW LEVEL SECURITY (RLS)
-- Mengisolasi data antar pedagang dan melindungi integritas transaksi
-- ============================================================================

-- Aktifkan RLS pada seluruh tabel
ALTER TABLE kiosks ENABLE ROW LEVEL SECURITY;
ALTER TABLE commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- 6.1 Kebijakan Akses: commodities (Bebas dibaca oleh semua pihak)
CREATE POLICY "Public Read Commodities"
    ON commodities FOR SELECT
    USING (true);

-- 6.2 Kebijakan Akses: kiosks
CREATE POLICY "Public Read Verified Kiosks"
    ON kiosks FOR SELECT
    USING (verification_status = 'verified');

CREATE POLICY "Vendors Manage Own Kiosk"
    ON kiosks FOR ALL
    USING (auth.uid()::text = id)
    WITH CHECK (auth.uid()::text = id);

-- 6.3 Kebijakan Akses: stock_items
CREATE POLICY "Vendors Manage Own Stock Items"
    ON stock_items FOR ALL
    USING (auth.uid()::text = vendor_id)
    WITH CHECK (auth.uid()::text = vendor_id);

CREATE POLICY "Public Read Active Stock Items"
    ON stock_items FOR SELECT
    USING (is_active = true);

-- 6.4 Kebijakan Akses: offers
CREATE POLICY "Public Read Active Offers"
    ON offers FOR SELECT
    USING (status = 'active');

CREATE POLICY "Vendors Manage Own Offers"
    ON offers FOR ALL
    USING (auth.uid()::text = vendor_id)
    WITH CHECK (auth.uid()::text = vendor_id);

-- 6.5 Kebijakan Akses: claims
CREATE POLICY "Buyers Manage Own Claims"
    ON claims FOR ALL
    USING (auth.uid()::text = buyer_id)
    WITH CHECK (auth.uid()::text = buyer_id);

CREATE POLICY "Vendors Read Claims on Their Offers"
    ON claims FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM offers 
            WHERE offers.id = claims.offer_id 
            AND offers.vendor_id = auth.uid()::text
        )
    );

-- Kebijakan Khusus Service Role (Bypass RLS untuk background cron & AI Orchestrator)
-- Supabase secara otomatis memberikan bypass RLS untuk panggilan yang menggunakan SUPABASE_SERVICE_ROLE_KEY.
