ALTER TABLE locations ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION DEFAULT -6.200000;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION DEFAULT 106.816666;

-- Tambahkan setting tarif dasar pengantaran jika belum ada
INSERT INTO settings (key, value) VALUES ('base_delivery_fee', '3000') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('fee_per_km', '2000') ON CONFLICT (key) DO NOTHING;
