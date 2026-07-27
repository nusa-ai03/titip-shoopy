-- 1. Tambah kolom modal, diskon, dan fee per porsi di tabel menus
ALTER TABLE menus ADD COLUMN IF NOT EXISTS merchant_discount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS fee_per_item NUMERIC(10,2) DEFAULT 1000.00;

-- 2. Tambah setting default Biaya Layanan Aplikasi di tabel settings
INSERT INTO settings (key, value) VALUES ('service_fee', '2000')
ON CONFLICT (key) DO NOTHING;

-- 3. Tambah kolom service_fee di tabel orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_fee NUMERIC(10,2) DEFAULT 2000.00;
