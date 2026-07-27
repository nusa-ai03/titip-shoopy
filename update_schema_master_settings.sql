-- 1. Tambahkan kolom saldo reward rupiah di tabel users
ALTER TABLE users ADD COLUMN IF NOT EXISTS reward_balance NUMERIC(10,2) DEFAULT 0.00;

-- 2. Seed / Upsert Seluruh Master Konfigurasi di Tabel Settings
INSERT INTO settings (key, value) VALUES 
('promo_title', 'Diskon Ongkir Flat Rp 3.000'),
('promo_desc', 'Titip makan rame-rame per ruangan makin hemat!'),
('promo_badge', 'PROMO HARI INI'),
('service_fee', '2000'),
('default_fee_per_item', '1000'),
('reward_per_item', '500'), -- Tiap pesan 1 porsi dapet reward Rp 500
('reward_terms', '1. Kumpulkan Saldo Reward tiap kali transaksi selesai.\n2. Reward senilai Rp dapat langsung dipotongkan saat Checkout COD.\n3. Berlaku untuk semua Shooper terdaftar.'),
('app_slogan', 'Layanan Kuliner RS & Sekitar • Fast Delivery'),
('app_logo_text', 'S'),
('app_favicon_url', 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png')
ON CONFLICT (key) DO NOTHING;
