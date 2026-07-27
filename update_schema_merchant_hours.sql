-- Tambahkan jam operasional dan switch status manual di tabel merchants
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS open_time TIME DEFAULT '07:00:00';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS close_time TIME DEFAULT '17:00:00';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT TRUE;

-- Update warung yang ada agar default buka dari 07:00 s.d 17:00
UPDATE merchants SET open_time = '07:00:00', close_time = '17:00:00', is_open = TRUE WHERE open_time IS NULL;
