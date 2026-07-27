-- Tambahkan kolom alamat, tipe lokasi (RS / Non RS), dan kontak
ALTER TABLE locations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS area_type VARCHAR(20) DEFAULT 'RS';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS contact_person VARCHAR(50);

-- Seed Data Sampel Lokasi Non-RS
INSERT INTO locations (name, address, area_type, contact_person) VALUES 
('Kantor Kecamatan - R. Pelayanan', 'Jl. Raya Utama No. 12', 'Non-RS', '08123456789'),
('Bank Mandiri KCP - Lantai 2', 'Komplek Ruko Plaza Blok A3', 'Non-RS', '08198765432')
ON CONFLICT (name) DO NOTHING;
