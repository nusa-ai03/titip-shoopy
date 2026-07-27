-- Update tipe area yang lama menjadi versi Universal
UPDATE locations SET area_type = 'Instansi' WHERE area_type IN ('RS', 'Rumah Sakit');
UPDATE locations SET area_type = 'Umum' WHERE area_type IN ('Non-RS', 'Luar RS');

-- Update Slogan Master default di settings
UPDATE settings SET value = 'Layanan Jastip Kuliner & Antar Lokal • Fast Delivery' WHERE key = 'app_slogan';
