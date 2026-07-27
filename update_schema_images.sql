-- Tambah kolom image_url ke tabel menus jika belum ada
ALTER TABLE menus ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update Gambar Sampel Makanan Menggugah Selera (HD Unsplash Images)
UPDATE menus SET image_url = 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&q=80' WHERE name ILIKE '%ayam%';
UPDATE menus SET image_url = 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80' WHERE name ILIKE '%teh%';
UPDATE menus SET image_url = 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80' WHERE name ILIKE '%mie%' OR name ILIKE '%bakso%';
UPDATE menus SET image_url = 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80' WHERE name ILIKE '%goreng%' OR name ILIKE '%nasgor%';

-- Default gambar jika masih NULL
UPDATE menus SET image_url = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80' WHERE image_url IS NULL;
