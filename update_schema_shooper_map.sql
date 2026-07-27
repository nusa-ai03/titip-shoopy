-- Tambahkan kolom alamat lengkap dan titik map lokasi shooper
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS map_point TEXT;
