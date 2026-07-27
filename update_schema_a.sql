-- 1. Tabel Master Lokasi
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- Misal: "Gedung A - Lantai 2 - Ruang Mawar"
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data Lokasi Awal
INSERT INTO locations (name) VALUES 
('Gedung A - Lantai 1 - Poliklinik'),
('Gedung A - Lantai 2 - Ruang Mawar'),
('Gedung A - Lantai 3 - Ruang ICU'),
('Gedung B - Lantai 1 - IGD'),
('Gedung B - Lantai 2 - Laboratorium')
ON CONFLICT (name) DO NOTHING;

-- 2. Update Tabel Users (Tambah PIN & Status Approve Runner)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE; -- Default Shooper auto-approved

-- Pastikan admin default ada untuk pengujian
INSERT INTO users (name, phone_number, role, pin, is_approved) 
VALUES ('Super Admin', '6280000000000', 'admin', '123456', TRUE)
ON CONFLICT (phone_number) DO NOTHING;
