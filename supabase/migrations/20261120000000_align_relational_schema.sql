-- Migrasi 3: Menyelaraskan skema relasional dengan model domain aplikasi.
--
-- Sumber kebenaran state pasar tetap public.pasarin_simulation_state (satu dokumen JSON
-- dengan revisi CAS, lihat src/lib/serverSimulationState.ts). Sebelumnya tabel stock_items,
-- offers, dan claims tidak pernah diisi aplikasi dan nilai CHECK-nya tidak cocok dengan
-- tipe di src/types/market.ts. Migrasi ini:
--   1. menyamakan nilai status/pembayaran dengan RescueOffer & EscrowTransaction,
--   2. memperbaiki RLS pedagang (sebelumnya membandingkan auth.uid() dengan 'vendor_kramat_xx'
--      sehingga tidak pernah cocok) dan menjadikan akses klien read-only,
--   3. menambahkan trigger yang memproyeksikan state JSON ke tabel relasional setiap kali
--      state berubah, sehingga tabel relasional selalu mencerminkan data aplikasi.
-- Baris yang dimasukkan manual (seed.sql, seed_testing_scenarios.sql) bertanda
-- source = 'fixture' dan tidak pernah dihapus oleh proyeksi.

-- 1. Kolom penanda asal baris ------------------------------------------------------------
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS source VARCHAR(16) NOT NULL DEFAULT 'fixture';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS source VARCHAR(16) NOT NULL DEFAULT 'fixture';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS source VARCHAR(16) NOT NULL DEFAULT 'fixture';

-- 2. stock_items: decay dihitung real-time di aplikasi, jadi boleh kosong pada baris proyeksi
ALTER TABLE stock_items ALTER COLUMN decay_score DROP NOT NULL;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS lot_number VARCHAR(64) NULL;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE NULL;

-- 3. offers: status dan pembayaran mengikuti RescueOffer --------------------------------
ALTER TABLE offers ADD COLUMN IF NOT EXISTS payment_status VARCHAR(32) NOT NULL DEFAULT 'unpaid';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS distribution_mode VARCHAR(16) NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS listing_id VARCHAR(64) NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS claimed_by_id TEXT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE NULL;

ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_status_check;
UPDATE offers SET status = 'settled' WHERE status = 'transferred_to_feed';
UPDATE offers SET status = 'rejected' WHERE status = 'expired';
ALTER TABLE offers ADD CONSTRAINT offers_status_check
    CHECK (status IN ('pending_vendor', 'active', 'claimed', 'settled', 'rejected'));
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_payment_status_check;
ALTER TABLE offers ADD CONSTRAINT offers_payment_status_check
    CHECK (payment_status IN ('unpaid', 'held_in_escrow', 'released_to_vendor', 'not_required'));
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_distribution_mode_check;
ALTER TABLE offers ADD CONSTRAINT offers_distribution_mode_check
    CHECK (distribution_mode IS NULL OR distribution_mode IN ('sale', 'donation', 'free'));
CREATE INDEX IF NOT EXISTS idx_offers_payment_status ON offers(payment_status);

-- 4. claims: peran pembeli & status pembayaran mengikuti aplikasi ------------------------
ALTER TABLE claims ALTER COLUMN buyer_phone DROP NOT NULL;
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_buyer_type_check;
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_payment_status_check;
UPDATE claims SET buyer_type = 'maggot' WHERE buyer_type = 'maggot_facility';
UPDATE claims SET payment_status = 'held_in_escrow' WHERE payment_status = 'escrow_locked';
ALTER TABLE claims ADD CONSTRAINT claims_buyer_type_check
    CHECK (buyer_type IN ('warteg', 'social_kitchen', 'maggot'));
ALTER TABLE claims ADD CONSTRAINT claims_payment_status_check
    CHECK (payment_status IN ('unpaid', 'held_in_escrow', 'released_to_vendor', 'not_required', 'refunded'));

-- 5. RLS: identitas kios dibaca dari app_metadata.pasarin_vendor_id; klien hanya membaca.
--    Semua penulisan lewat API server (service role / koneksi postgres) yang melewati RLS.
DROP POLICY IF EXISTS "Vendors Manage Own Kiosk" ON kiosks;
DROP POLICY IF EXISTS "Vendors Read Own Kiosk" ON kiosks;
CREATE POLICY "Vendors Read Own Kiosk"
    ON kiosks FOR SELECT
    USING ((auth.jwt() -> 'app_metadata' ->> 'pasarin_vendor_id') = id);

DROP POLICY IF EXISTS "Vendors Manage Own Stock Items" ON stock_items;
DROP POLICY IF EXISTS "Vendors Read Own Stock Items" ON stock_items;
CREATE POLICY "Vendors Read Own Stock Items"
    ON stock_items FOR SELECT
    USING ((auth.jwt() -> 'app_metadata' ->> 'pasarin_vendor_id') = vendor_id);

DROP POLICY IF EXISTS "Vendors Manage Own Offers" ON offers;
DROP POLICY IF EXISTS "Vendors Read Own Offers" ON offers;
CREATE POLICY "Vendors Read Own Offers"
    ON offers FOR SELECT
    USING ((auth.jwt() -> 'app_metadata' ->> 'pasarin_vendor_id') = vendor_id);

DROP POLICY IF EXISTS "Buyers Manage Own Claims" ON claims;
DROP POLICY IF EXISTS "Buyers Read Own Claims" ON claims;
CREATE POLICY "Buyers Read Own Claims"
    ON claims FOR SELECT
    USING (auth.uid()::text = buyer_id);

DROP POLICY IF EXISTS "Vendors Read Claims on Their Offers" ON claims;
CREATE POLICY "Vendors Read Claims on Their Offers"
    ON claims FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM offers
            WHERE offers.id = claims.offer_id
            AND offers.vendor_id = (auth.jwt() -> 'app_metadata' ->> 'pasarin_vendor_id')
        )
    );

-- 6. Proyeksi state JSON -> tabel relasional ---------------------------------------------
CREATE OR REPLACE FUNCTION public.pasarin_try_timestamptz(p_value text)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN p_value::timestamptz;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.pasarin_project_market_state(p_state jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_stock_ids text[];
    v_offer_ids text[];
    v_claim_ids text[];
BEGIN
    -- Stok: kondisi fisik diturunkan dari tier penawaran terbaru lot tersebut.
    WITH src AS (
        SELECT s->>'id' AS id,
               s->>'vendorId' AS vendor_id,
               s->>'commodityId' AS commodity_id,
               (s->>'initialKg')::numeric AS initial_kg,
               (s->>'remainingKg')::numeric AS remaining_kg,
               coalesce(pasarin_try_timestamptz(s->>'createdAt'), now())
                   - coalesce((s->>'hoursOffset')::numeric, 0) * interval '1 hour' AS arrival,
               pasarin_try_timestamptz(s->>'verifiedAt') AS verified_at,
               s->>'lotNumber' AS lot_number
        FROM jsonb_array_elements(coalesce(p_state->'stocks', '[]'::jsonb)) AS s
    ), latest_tier AS (
        SELECT DISTINCT ON (o->>'stockId') o->>'stockId' AS stock_id, o->>'targetTier' AS tier
        FROM jsonb_array_elements(coalesce(p_state->'offers', '[]'::jsonb)) AS o
        WHERE o->>'status' <> 'rejected'
        ORDER BY o->>'stockId', pasarin_try_timestamptz(o->>'createdAt') DESC NULLS LAST
    ), upserted AS (
        INSERT INTO stock_items AS t (
            id, vendor_id, commodity_id, initial_quantity_kg, remaining_quantity_kg,
            arrival_timestamp, physical_condition, decay_score, allocated_tier, is_active,
            lot_number, verified_at, source
        )
        SELECT src.id, src.vendor_id, src.commodity_id, src.initial_kg, src.remaining_kg,
               src.arrival,
               CASE lt.tier WHEN 'tier_1' THEN 'layu_ringan' WHEN 'tier_2' THEN 'layu_sedang'
                            WHEN 'tier_3' THEN 'tidak_layak' ELSE 'segar' END,
               NULL,
               coalesce(lt.tier, 'tier_1'),
               src.remaining_kg > 0,
               src.lot_number, src.verified_at, 'state'
        FROM src
        JOIN kiosks k ON k.id = src.vendor_id
        JOIN commodities c ON c.id = src.commodity_id
        LEFT JOIN latest_tier lt ON lt.stock_id = src.id
        WHERE src.id IS NOT NULL AND src.initial_kg > 0 AND src.remaining_kg >= 0
        ON CONFLICT (id) DO UPDATE SET
            vendor_id = EXCLUDED.vendor_id,
            commodity_id = EXCLUDED.commodity_id,
            initial_quantity_kg = EXCLUDED.initial_quantity_kg,
            remaining_quantity_kg = EXCLUDED.remaining_quantity_kg,
            physical_condition = EXCLUDED.physical_condition,
            decay_score = EXCLUDED.decay_score,
            allocated_tier = EXCLUDED.allocated_tier,
            is_active = EXCLUDED.is_active,
            lot_number = EXCLUDED.lot_number,
            verified_at = EXCLUDED.verified_at,
            source = 'state',
            updated_at = now()
        RETURNING t.id
    )
    SELECT coalesce(array_agg(id), '{}') INTO v_stock_ids FROM upserted;

    -- Penawaran: hanya yang lot stoknya ikut terproyeksi (menjaga foreign key).
    WITH src AS (
        SELECT o->>'id' AS id,
               o->>'stockId' AS stock_id,
               o->>'vendorId' AS vendor_id,
               o->>'commodityId' AS commodity_id,
               o->>'targetTier' AS target_tier,
               (o->>'quantityKg')::numeric AS quantity_kg,
               (o->>'originalPricePerKg')::numeric AS original_price,
               (o->>'salvagePricePerKg')::numeric AS salvage_price,
               (o->>'discountPercentage')::numeric AS discount,
               (o->>'totalAmountIdr')::numeric AS total_amount,
               coalesce(pasarin_try_timestamptz(o->>'createdAt'), now()) AS created_at,
               coalesce((o->>'expiresInMinutes')::numeric, 30) AS expires_minutes,
               o->>'status' AS status,
               coalesce(o->>'paymentStatus', 'unpaid') AS payment_status,
               o->>'distributionMode' AS distribution_mode,
               o->>'listingId' AS listing_id,
               o->>'claimedById' AS claimed_by_id,
               pasarin_try_timestamptz(o->>'deliveredOn') AS delivered_at
        FROM jsonb_array_elements(coalesce(p_state->'offers', '[]'::jsonb)) AS o
    ), upserted AS (
        INSERT INTO offers AS t (
            id, stock_id, vendor_id, commodity_id, target_tier, quantity_kg,
            original_wholesale_price_per_kg, salvage_price_per_kg, discount_percentage,
            total_amount_idr, exclusive_window_expires_at, expires_at, status,
            payment_status, distribution_mode, listing_id, claimed_by_id, delivered_at,
            created_at, source
        )
        SELECT src.id, src.stock_id, src.vendor_id, src.commodity_id, src.target_tier, src.quantity_kg,
               src.original_price, src.salvage_price, least(greatest(src.discount, 0), 100),
               src.total_amount,
               CASE WHEN src.target_tier = 'tier_2' THEN src.created_at + interval '30 minutes' END,
               src.created_at + src.expires_minutes * interval '1 minute',
               src.status, src.payment_status, src.distribution_mode, src.listing_id,
               src.claimed_by_id, src.delivered_at, src.created_at, 'state'
        FROM src
        JOIN kiosks k ON k.id = src.vendor_id
        JOIN commodities c ON c.id = src.commodity_id
        WHERE src.id IS NOT NULL
          AND src.stock_id = ANY (v_stock_ids)
          AND src.quantity_kg > 0
          AND src.target_tier IN ('tier_1', 'tier_2', 'tier_3')
          AND src.status IN ('pending_vendor', 'active', 'claimed', 'settled', 'rejected')
          AND src.payment_status IN ('unpaid', 'held_in_escrow', 'released_to_vendor', 'not_required')
          AND (src.distribution_mode IS NULL OR src.distribution_mode IN ('sale', 'donation', 'free'))
        ON CONFLICT (id) DO UPDATE SET
            stock_id = EXCLUDED.stock_id,
            vendor_id = EXCLUDED.vendor_id,
            commodity_id = EXCLUDED.commodity_id,
            target_tier = EXCLUDED.target_tier,
            quantity_kg = EXCLUDED.quantity_kg,
            original_wholesale_price_per_kg = EXCLUDED.original_wholesale_price_per_kg,
            salvage_price_per_kg = EXCLUDED.salvage_price_per_kg,
            discount_percentage = EXCLUDED.discount_percentage,
            total_amount_idr = EXCLUDED.total_amount_idr,
            exclusive_window_expires_at = EXCLUDED.exclusive_window_expires_at,
            expires_at = EXCLUDED.expires_at,
            status = EXCLUDED.status,
            payment_status = EXCLUDED.payment_status,
            distribution_mode = EXCLUDED.distribution_mode,
            listing_id = EXCLUDED.listing_id,
            claimed_by_id = EXCLUDED.claimed_by_id,
            delivered_at = EXCLUDED.delivered_at,
            source = 'state',
            updated_at = now()
        RETURNING t.id
    )
    SELECT coalesce(array_agg(id), '{}') INTO v_offer_ids FROM upserted;

    -- Klaim: satu baris per penawaran yang sudah diklaim atau selesai diantar.
    WITH src AS (
        SELECT o->>'id' AS offer_id,
               o->>'claimedById' AS buyer_id,
               coalesce(o->>'claimedBy', 'Pembeli') AS buyer_name,
               o->>'targetTier' AS target_tier,
               (o->>'quantityKg')::numeric AS quantity_kg,
               (o->>'totalAmountIdr')::numeric AS total_amount,
               coalesce(o->>'paymentStatus', 'unpaid') AS payment_status,
               o->>'status' AS status
        FROM jsonb_array_elements(coalesce(p_state->'offers', '[]'::jsonb)) AS o
    ), upserted AS (
        INSERT INTO claims AS t (
            id, offer_id, buyer_id, buyer_type, buyer_name, buyer_phone,
            claimed_quantity_kg, total_paid_idr, payment_status, handover_status, source
        )
        SELECT 'claim_' || src.offer_id, src.offer_id, src.buyer_id,
               CASE src.target_tier WHEN 'tier_1' THEN 'warteg' WHEN 'tier_2' THEN 'social_kitchen' ELSE 'maggot' END,
               left(src.buyer_name, 128), NULL, src.quantity_kg,
               CASE WHEN src.payment_status IN ('held_in_escrow', 'released_to_vendor') THEN src.total_amount ELSE 0 END,
               src.payment_status,
               CASE WHEN src.status = 'settled' THEN 'delivered_verified' ELSE 'pending_pickup' END,
               'state'
        FROM src
        WHERE src.offer_id = ANY (v_offer_ids)
          AND src.buyer_id IS NOT NULL
          AND src.status IN ('claimed', 'settled')
        ON CONFLICT (id) DO UPDATE SET
            buyer_id = EXCLUDED.buyer_id,
            buyer_type = EXCLUDED.buyer_type,
            buyer_name = EXCLUDED.buyer_name,
            claimed_quantity_kg = EXCLUDED.claimed_quantity_kg,
            total_paid_idr = EXCLUDED.total_paid_idr,
            payment_status = EXCLUDED.payment_status,
            handover_status = EXCLUDED.handover_status,
            source = 'state',
            updated_at = now()
        RETURNING t.id
    )
    SELECT coalesce(array_agg(id), '{}') INTO v_claim_ids FROM upserted;

    -- Hapus baris proyeksi lama yang sudah tidak ada di state (urutan menjaga foreign key).
    DELETE FROM claims WHERE source = 'state' AND id <> ALL (v_claim_ids);
    DELETE FROM claims c USING offers o
        WHERE c.offer_id = o.id AND o.source = 'state' AND o.id <> ALL (v_offer_ids);
    DELETE FROM offers WHERE source = 'state' AND id <> ALL (v_offer_ids);
    DELETE FROM claims c USING offers o, stock_items s
        WHERE c.offer_id = o.id AND o.stock_id = s.id AND s.source = 'state' AND s.id <> ALL (v_stock_ids);
    DELETE FROM offers o USING stock_items s
        WHERE o.stock_id = s.id AND s.source = 'state' AND s.id <> ALL (v_stock_ids);
    DELETE FROM stock_items WHERE source = 'state' AND id <> ALL (v_stock_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.pasarin_simulation_state_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Kegagalan proyeksi tidak boleh menggagalkan penyimpanan state utama.
    BEGIN
        PERFORM public.pasarin_project_market_state(NEW.state);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Proyeksi state pasar ke tabel relasional gagal: %', SQLERRM;
    END;
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.pasarin_project_market_state(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pasarin_simulation_state_project() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS pasarin_project_market_state ON public.pasarin_simulation_state;
CREATE TRIGGER pasarin_project_market_state
    AFTER INSERT OR UPDATE OF state ON public.pasarin_simulation_state
    FOR EACH ROW
    WHEN (NEW.id = 'market')
    EXECUTE FUNCTION public.pasarin_simulation_state_project();

-- 7. Isi awal dari state yang sudah ada --------------------------------------------------
DO $$
BEGIN
    PERFORM public.pasarin_project_market_state(state)
    FROM public.pasarin_simulation_state
    WHERE id = 'market';
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Proyeksi awal state pasar dilewati: %', SQLERRM;
END;
$$;
