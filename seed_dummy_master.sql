-- 1. BERSIHKAN DATA TRANSAKSI & SEEDING LAMA (Cascading Truncate)
TRUNCATE TABLE order_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE orders RESTART IDENTITY CASCADE;
TRUNCATE TABLE menus RESTART IDENTITY CASCADE;
TRUNCATE TABLE merchants RESTART IDENTITY CASCADE;

-- Hapus user non-admin (Shooper & Runner) agar clean
DELETE FROM users WHERE role IN ('shooper', 'runner');

-- 2. INSERT DATA DUMMY SHOOPER (5 Karyawan RS / Pelanggan)
INSERT INTO users (name, phone_number, role, department_location, address, map_point, is_approved) VALUES 
('Dr. Budi Santoso', '6281211112222', 'shooper', 'Gedung A - Lantai 2 - Ruang Mawar', 'Ruang Dokter Mawar L2', 'https://maps.google.com/?q=-6.2000,106.8166', TRUE),
('Perawat Maya Indah', '6281233334444', 'shooper', 'Gedung A - Lantai 3 - Ruang ICU', 'Pos Perawat ICU L3', 'https://maps.google.com/?q=-6.2005,106.8167', TRUE),
('Siti Aminah (Radiologi)', '6281255556666', 'shooper', 'Gedung B - Lantai 1 - IGD', 'Ruang Radiologi Belakang IGD', 'https://maps.google.com/?q=-6.2010,106.8168', TRUE),
('Ahmad Fauzi (Bank Mandiri)', '6281277778888', 'shooper', 'Bank Mandiri KCP - Lantai 2', 'Komplek Ruko Plaza Blok A3', 'https://maps.google.com/?q=-6.2015,106.8169', TRUE),
('Rina Wijaya (Kecamatan)', '6281299990000', 'shooper', 'Kantor Kecamatan - R. Pelayanan', 'Jl. Raya Utama No. 12', 'https://maps.google.com/?q=-6.2020,106.8170', TRUE);

-- 3. INSERT DATA DUMMY RUNNER (2 CS Antar)
INSERT INTO users (name, phone_number, role, pin, is_approved) VALUES 
('Runner Agus Prasetyo', '6281310001000', 'runner', '123456', TRUE),
('Runner Bambang Herman', '6281320002000', 'runner', '123456', TRUE);

-- 4. INSERT 20 MERCHANT & MUP MASING-MASING 10 MENU (TOTAL 200 MENU)

DO $$
DECLARE
    m_id INT;
BEGIN

-- ==================== MERCHANT 1: Warung Bu Sum (Ramesan) ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Warung Bu Sum - Nasi Rames Spesial', '6287855817441', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Nasi Rames Ayam Goreng', 15000, 2000, 1000, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80'),
(m_id, 'Nasi Rames Rendang Sapi', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80'),
(m_id, 'Nasi Rames Telur Balado', 12000, 1000, 1000, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'),
(m_id, 'Nasi Rames Tongkol Pedas', 14000, 1500, 1000, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&q=80'),
(m_id, 'Nasi Telur Dadar Crispy', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&q=80'),
(m_id, 'Sayur Asem Segar', 6000, 500, 1000, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80'),
(m_id, 'Perkedel Kentang (2 Pcs)', 5000, 500, 500, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80'),
(m_id, 'Tahu & Tempe Goreng Combo', 5000, 500, 500, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&q=80'),
(m_id, 'Es Teh Manis Jumbo', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80'),
(m_id, 'Es Jeruk Peras', 5000, 500, 500, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80');

-- ==================== MERCHANT 2: Warung Vhalent (Ayam Penyet) ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Warung Vhalent - Ayam Penyet Sambal Ijo', '6287855817442', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Ayam Penyet Dada + Nasi', 17000, 2000, 1000, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80'),
(m_id, 'Ayam Penyet Paha + Nasi', 17000, 2000, 1000, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80'),
(m_id, 'Ayam Bakar Madu + Nasi', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&q=80'),
(m_id, 'Bebek Goreng Sambal Korek', 25000, 3000, 1000, 'https://images.unsplash.com/photo-1514944288352-fffac99f0bdf?w=500&q=80'),
(m_id, 'Lele Goreng Crispy + Nasi', 14000, 1500, 1000, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&q=80'),
(m_id, 'Ati Ampela Goreng Penyet', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&q=80'),
(m_id, 'Tahu Tempe Penyet Sambal', 8000, 1000, 500, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&q=80'),
(m_id, 'Cah Kangkung Terasi', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80'),
(m_id, 'Es Teh Manis', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80'),
(m_id, 'Es Lemon Tea', 6000, 1000, 500, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80');

-- ==================== MERCHANT 3: Kedai Pak Kumis (Bakso & Mie Ayam) ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Kedai Pak Kumis - Bakso & Mie Ayam', '6287855817443', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Mie Ayam Bakso Urat', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Mie Ayam Pangsit Goreng', 13000, 1000, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Bakso Urat Jumbo Super', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Bakso Telur Spesial', 16000, 1500, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Bakso Halus Kuah Bening', 13000, 1000, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Mie Yamin Manis Ayam', 14000, 1000, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Pangsit Goreng Renyah (5 Pcs)', 8000, 1000, 500, 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&q=80'),
(m_id, 'Pangsit Kuah Bakso', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Es Teh Manis', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80'),
(m_id, 'Es Es Campur Pak Kumis', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&q=80');

-- ==================== MERCHANT 4: Nasi Goreng Gila Mas Doni ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Nasi Goreng Gila Mas Doni', '6287855817444', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Nasi Goreng Gila Spesial', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80'),
(m_id, 'Nasi Goreng Ayam Suwir', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80'),
(m_id, 'Nasi Goreng Sosis Bakso', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80'),
(m_id, 'Nasi Goreng Seafood', 22000, 2500, 1000, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80'),
(m_id, 'Mie Goreng Dok-Dok Pedas', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=500&q=80'),
(m_id, 'Kwetiau Goreng Sapi', 20000, 2000, 1000, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=500&q=80'),
(m_id, 'Kwetiau Siram Ayam', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=500&q=80'),
(m_id, 'Bihun Goreng Spesial', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=500&q=80'),
(m_id, 'Telur Ceplok/Dadar Tambahan', 4000, 500, 500, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&q=80'),
(m_id, 'Es Teh Manis', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80');

-- ==================== MERCHANT 5: Soto Ayam Lamongan Cak Har ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Soto Ayam Lamongan Cak Har', '6287855817445', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Soto Ayam Biasa + Nasi', 14000, 1500, 1000, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&q=80'),
(m_id, 'Soto Ayam Spesial Koya + Nasi', 17000, 2000, 1000, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&q=80'),
(m_id, 'Soto Ceker Ayam (Porsi)', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&q=80'),
(m_id, 'Soto Daging Sapi Madura', 22000, 2000, 1000, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&q=80'),
(m_id, 'Sate Telur Puyuh (2 Tusuk)', 6000, 500, 500, 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500&q=80'),
(m_id, 'Sate Usus Ayam (2 Tusuk)', 5000, 500, 500, 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500&q=80'),
(m_id, 'Kerupuk Udang Kaleng', 2000, 200, 300, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80'),
(m_id, 'Nasi Putih Tambahan', 4000, 500, 500, 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=500&q=80'),
(m_id, 'Es Jeruk Peras', 5000, 500, 500, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80'),
(m_id, 'Es Teh Manis', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80');

-- ==================== MERCHANT 6: Padang Murah Sederhana ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('RM Padang Murah Sederhana', '6287855817446', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Nasi Rendang Daging Sapi', 20000, 2000, 1000, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80'),
(m_id, 'Nasi Ayam Pop Khas Padang', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80'),
(m_id, 'Nasi Ayam Bakar Bumbu Padang', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&q=80'),
(m_id, 'Nasi Cincang Sapi Bumbu', 22000, 2500, 1000, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80'),
(m_id, 'Nasi Telur Bumbu Balado', 12000, 1000, 1000, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'),
(m_id, 'Nasi Ikan Lado Ijo', 16000, 1500, 1000, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&q=80'),
(m_id, 'Gulai Tunjang / Kikil', 25000, 3000, 1000, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80'),
(m_id, 'Perkedel Jagung Padang', 4000, 500, 500, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80'),
(m_id, 'Es Teh Manis', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80'),
(m_id, 'Jus Alpukat Kocok', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&q=80');

-- ==================== MERCHANT 7: Warung Bebek Goreng H. Slamet ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Warung Bebek Goreng H. Slamet', '6287855817447', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Nasi Bebek Goreng Dada Super', 28000, 3000, 1000, 'https://images.unsplash.com/photo-1514944288352-fffac99f0bdf?w=500&q=80'),
(m_id, 'Nasi Bebek Goreng Paha Super', 28000, 3000, 1000, 'https://images.unsplash.com/photo-1514944288352-fffac99f0bdf?w=500&q=80'),
(m_id, 'Nasi Bebek Bakar Madu', 30000, 3000, 1000, 'https://images.unsplash.com/photo-1514944288352-fffac99f0bdf?w=500&q=80'),
(m_id, 'Nasi Ayam Kampung Goreng', 24000, 2500, 1000, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80'),
(m_id, 'Bebek Utuh Goreng (Tanpa Nasi)', 95000, 10000, 2000, 'https://images.unsplash.com/photo-1514944288352-fffac99f0bdf?w=500&q=80'),
(m_id, 'Sambal Korek Pedas Bawang (Botol)', 15000, 2000, 1000, 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&q=80'),
(m_id, 'Tahu & Tempe Penyet Korek', 8000, 1000, 500, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&q=80'),
(m_id, 'Sayur Lalapan Segar', 4000, 500, 500, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80'),
(m_id, 'Es Jeruk Nipis', 6000, 1000, 500, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80'),
(m_id, 'Es Teh Manis', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80');

-- ==================== MERCHANT 8: Mie Gacoan & Dimsum Pedas ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Mie Gacoan & Dimsum Pedas', '6287855817448', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Mie Setan Level 1 - 4', 12000, 1000, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Mie Iblis Level 1 - 4', 12000, 1000, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Mie Suit (Gurih Tidak Pedas)', 12000, 1000, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Dimsum Siomay Ayam (3 Pcs)', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=500&q=80'),
(m_id, 'Dimsum Udang Keju (3 Pcs)', 11000, 1000, 1000, 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=500&q=80'),
(m_id, 'Lumpia Udang Crispy (3 Pcs)', 11000, 1000, 1000, 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&q=80'),
(m_id, 'Pangsit Goreng Isi Ayam', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&q=80'),
(m_id, 'Es Genderuwo (Es Buah Segar)', 9000, 1000, 1000, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&q=80'),
(m_id, 'Es Pocong (Es Segar Markisa)', 9000, 1000, 1000, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80'),
(m_id, 'Es Teh Manis', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80');

-- ==================== MERCHANT 9: Martabak & Terang Bulan Bangka ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Martabak & Terang Bulan Bangka', '6287855817449', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Martabak Telur Sapi Spesial', 35000, 4000, 1000, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&q=80'),
(m_id, 'Martabak Telur Ayam Bebek Combo', 30000, 3000, 1000, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&q=80'),
(m_id, 'Terang Bulan Coklat Keju Susu', 28000, 3000, 1000, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&q=80'),
(m_id, 'Terang Bulan Kacang Coklat', 25000, 2500, 1000, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&q=80'),
(m_id, 'Terang Bulan Nutella Keju Red Velvet', 40000, 4000, 1000, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&q=80'),
(m_id, 'Terang Bulan Matcha Oreo', 32000, 3000, 1000, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&q=80'),
(m_id, 'Martabak Tipker Coklat Keju', 20000, 2000, 1000, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&q=80'),
(m_id, 'Martabak Mini Assorted (4 Pcs)', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&q=80'),
(m_id, 'Es Kopi Susu Gula Aren', 12000, 1000, 1000, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80'),
(m_id, 'Es Teh Manis Jumbo', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80');

-- ==================== MERCHANT 10: Sate Ayam Madura Cak Sholeh ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Sate Ayam Madura Cak Sholeh', '6287855817450', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Sate Ayam Bumbu Kacang (10 Tusuk)', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500&q=80'),
(m_id, 'Sate Daging Ayam Daging Semua (10 Tusuk)', 20000, 2000, 1000, 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500&q=80'),
(m_id, 'Sate Kambing Bumbu Kecap (10 Tusuk)', 32000, 3000, 1000, 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500&q=80'),
(m_id, 'Sate Taichan Pedas Gurih (10 Tusuk)', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500&q=80'),
(m_id, 'Sopan Kambing Kuah Bening', 25000, 2500, 1000, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&q=80'),
(m_id, 'Lontong Porsi Tambahan', 4000, 500, 500, 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=500&q=80'),
(m_id, 'Nasi Putih Warm', 4000, 500, 500, 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=500&q=80'),
(m_id, 'Kerupuk Emping Gurih', 5000, 500, 500, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80'),
(m_id, 'Es Jeruk Peras Segar', 5000, 500, 500, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80'),
(m_id, 'Es Teh Manis', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80');

-- ==================== MERCHANT 11: Seblak Prasmanan Bandung ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Seblak Prasmanan Bandung HOT', '6287855817451', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Seblak Komplit Kencur Level 1-5', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Seblak Seafood Dumpling Cheese', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Seblak Ceker & Tulangan Sapi', 16000, 1500, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Seblak Mie Ramen Pedas', 14000, 1000, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Cilok Kuah Pedas Jeletot', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Cimol Bojot Bumbu Balado', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&q=80'),
(m_id, 'Batagor Kuah Pedas', 12000, 1000, 1000, 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&q=80'),
(m_id, 'Es Nutrisari Jeruk', 4000, 500, 500, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80'),
(m_id, 'Es Milk Tea Bubble', 8000, 1000, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80'),
(m_id, 'Es Teh Manis', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80');

-- ==================== MERCHANT 12: Kebab & Burger Arab Sahabat ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Kebab & Burger Arab Sahabat', '6287855817452', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Kebab Daging Sapi Size Large', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&q=80'),
(m_id, 'Kebab Daging Keju Mozzarella', 20000, 2000, 1000, 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&q=80'),
(m_id, 'Kebab Ayam Crispy Mayonaise', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&q=80'),
(m_id, 'Burger Beef Cheese Special', 16000, 1500, 1000, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80'),
(m_id, 'Burger Double Beef Crispy', 22000, 2000, 1000, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80'),
(m_id, 'Roti Maryam Coklat Keju', 12000, 1000, 1000, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&q=80'),
(m_id, 'Kentang Goreng French Fries', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&q=80'),
(m_id, 'Chicken Nuggets (5 Pcs)', 12000, 1000, 1000, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&q=80'),
(m_id, 'Es Milo Ice Cream Cold', 8000, 1000, 500, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80'),
(m_id, 'Es Cappuccino Cincau', 6000, 500, 500, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80');

-- ==================== MERCHANT 13: Ayam Geprek Sambal Ijo Boss ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Ayam Geprek Sambal Ijo Boss', '6287855817453', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Geprek Original Level 1-10 + Nasi', 14000, 1500, 1000, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80'),
(m_id, 'Geprek Keju Mozzarella Melted', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80'),
(m_id, 'Geprek Sambal Matah Bali', 16000, 1500, 1000, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80'),
(m_id, 'Geprek Sauce Barbeque Hot', 16000, 1500, 1000, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80'),
(m_id, 'Ayam Fillet Geprek Tanpa Tulang', 17000, 2000, 1000, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80'),
(m_id, 'Jamur Crispy Geprek Sambal', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&q=80'),
(m_id, 'Tahu Geprek Sambal Bawang', 8000, 1000, 500, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&q=80'),
(m_id, 'Extra Sambal Bawang (Cup)', 3000, 500, 500, 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&q=80'),
(m_id, 'Es Teh Manis Refill', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80'),
(m_id, 'Es Orange Water Refresh', 5000, 500, 500, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80');

-- ==================== MERCHANT 14: Pecel Lele & Seafood Mbak Asih ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Pecel Lele & Seafood Mbak Asih', '6287855817454', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Nasi Pecel Lele Goreng (2 Ekor)', 16000, 1500, 1000, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&q=80'),
(m_id, 'Nasi Cumi Goreng Tepung Crispy', 22000, 2000, 1000, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&q=80'),
(m_id, 'Nasi Udang Balado Pedas', 22000, 2000, 1000, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&q=80'),
(m_id, 'Nasi Gurame Goreng Terbang', 35000, 4000, 1000, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&q=80'),
(m_id, 'Nasi Nilai Bakar Bumbu Kecap', 20000, 2000, 1000, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&q=80'),
(m_id, 'Cah Tauge Tahu Asin', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80'),
(m_id, 'Sambal Terasi Lalap Kemangi', 4000, 500, 500, 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&q=80'),
(m_id, 'Kol Goreng Crispy', 5000, 500, 500, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80'),
(m_id, 'Es Teh Manis', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80'),
(m_id, 'Es Jeruk Manis', 5000, 500, 500, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80');

-- ==================== MERCHANT 15: Es Teler & Juice Fresh 88 ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Es Teler & Juice Fresh 88', '6287855817455', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Es Teler Komplit Alpukat Nangka', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&q=80'),
(m_id, 'Es Teler Durian Keju Special', 20000, 2000, 1000, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&q=80'),
(m_id, 'Es Campur Bandung Fresh', 13000, 1000, 1000, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&q=80'),
(m_id, 'Es Buah Segar Kuah Susu', 12000, 1000, 1000, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&q=80'),
(m_id, 'Jus Alpukat Murni + Coklat', 12000, 1000, 1000, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&q=80'),
(m_id, 'Jus Manga Harum Manis', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&q=80'),
(m_id, 'Jus Buah Naga Merah', 12000, 1000, 1000, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&q=80'),
(m_id, 'Jus Jambu Biji Merah', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&q=80'),
(m_id, 'Jus Jeruk Peras Murni', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80'),
(m_id, 'Es Kelapa Muda Gula Jawa', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80');

-- ==================== MERCHANT 16: Dapur Rawon & Soto Daging Jawa ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Dapur Rawon & Soto Daging Jawa', '6287855817456', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Nasi Rawon Daging Dukun Khas Surabya', 22000, 2000, 1000, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&q=80'),
(m_id, 'Nasi Rawon Empal Goreng', 25000, 2500, 1000, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&q=80'),
(m_id, 'Nasi Soto Daging Madura', 22000, 2000, 1000, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&q=80'),
(m_id, 'Nasi Soto Babat Paru', 20000, 2000, 1000, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&q=80'),
(m_id, 'Tahu Tek Surabaya Telur', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&q=80'),
(m_id, 'Rujak Cingur khas Jatim', 22000, 2000, 1000, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80'),
(m_id, 'Telur Asin khas Brebes', 5000, 500, 500, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&q=80'),
(m_id, 'Kerupuk Rambak Sapi', 5000, 500, 500, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80'),
(m_id, 'Es Sinom Segar Sehat', 6000, 500, 500, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80'),
(m_id, 'Es Teh Manis', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80');

-- ==================== MERCHANT 17: Pempek Palembang Asli Cik Lili ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Pempek Palembang Asli Cik Lili', '6287855817457', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Pempek Kapal Selam Besar', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&q=80'),
(m_id, 'Pempek Lenjer Besar', 16000, 1500, 1000, 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&q=80'),
(m_id, 'Pempek Lenggang Telur Goreng', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&q=80'),
(m_id, 'Pempek Kulit Crispy (3 Pcs)', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&q=80'),
(m_id, 'Pempek Adaaan Bulat (3 Pcs)', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&q=80'),
(m_id, 'Tekwan Kuah Udang Palembang', 16000, 1500, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Model Ikan Kuah Bening', 16000, 1500, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Es Kacang Merah Palembang', 10000, 1000, 1000, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&q=80'),
(m_id, 'Es Liang Teh Botol', 5000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80'),
(m_id, 'Es Teh Manis', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80');

-- ==================== MERCHANT 18: Kopi Khas Nusantara & Toast ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Kopi Khas Nusantara & Toast', '6287855817458', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Es Kopi Susu Aren Double Shot', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80'),
(m_id, 'Americano Cold Brew', 13000, 1000, 1000, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80'),
(m_id, 'Kopi Latte Caramel Vanilla', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80'),
(m_id, 'Matcha Green Tea Latte', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80'),
(m_id, 'Chocolate Cream Cheese', 18000, 2000, 1000, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80'),
(m_id, 'Roti Bakar Kaya Butter Toast', 14000, 1000, 1000, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&q=80'),
(m_id, 'Roti Bakar Coklat Keju Melimpah', 16000, 1500, 1000, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&q=80'),
(m_id, 'Croissant Butter Warm', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&q=80'),
(m_id, 'Sandwich Egg & Cheese', 16000, 1500, 1000, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80'),
(m_id, 'Es Lemon Tea Fresh', 6000, 500, 500, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80');

-- ==================== MERCHANT 19: Siomay & Batagor Bandung Kang Emil ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Siomay & Batagor Bandung Kang Emil', '6287855817459', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Siomay Komplit Bumbu Kacang (5 Pcs)', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=500&q=80'),
(m_id, 'Batagor Crispy Bumbu Kacang (5 Pcs)', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&q=80'),
(m_id, 'Siomay Mix Batagor Campur', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=500&q=80'),
(m_id, 'Siomay Tahu & Telur Rebus (4 Pcs)', 13000, 1000, 1000, 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=500&q=80'),
(m_id, 'Batagor Kuah Bening Kaldu', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80'),
(m_id, 'Otak-Otak Ikan Bakar (5 Pcs)', 12000, 1000, 1000, 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&q=80'),
(m_id, 'Es Cincau Hijau Santan', 6000, 500, 500, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80'),
(m_id, 'Es Cendol Dawet Ayu', 8000, 1000, 500, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&q=80'),
(m_id, 'Es Jeruk Peras Segar', 5000, 500, 500, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80'),
(m_id, 'Es Teh Manis', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80');

-- ==================== MERCHANT 20: Nasi Uduk & Kuning Bang Betawi ====================
INSERT INTO merchants (name, phone_number, is_active) VALUES ('Nasi Uduk & Kuning Bang Betawi', '6287855817460', TRUE) RETURNING id INTO m_id;
INSERT INTO menus (merchant_id, name, price, merchant_discount, fee_per_item, image_url) VALUES
(m_id, 'Nasi Uduk Ayam Goreng Lengkap', 16000, 1500, 1000, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80'),
(m_id, 'Nasi Kuning Semur Jengkol', 15000, 1500, 1000, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80'),
(m_id, 'Nasi Uduk Semur Daging Daging', 20000, 2000, 1000, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80'),
(m_id, 'Nasi Kuning Telur Balado Combo', 12000, 1000, 1000, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'),
(m_id, 'Nasi Uduk Empal Daging Goreng', 22000, 2000, 1000, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80'),
(m_id, 'Bihun Goreng Uduk (Porsi)', 6000, 500, 500, 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=500&q=80'),
(m_id, 'Oreks Tempe Manis (Porsi)', 5000, 500, 500, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&q=80'),
(m_id, 'Bakwan Udang Goreng (2 Pcs)', 4000, 500, 500, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80'),
(m_id, 'Es Teh Manis', 4000, 500, 500, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80'),
(m_id, 'Es Jeruk Peras', 5000, 500, 500, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80');

END $$;
