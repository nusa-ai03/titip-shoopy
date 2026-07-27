-- Tambahkan kolom pin dan hubungkan user role merchant
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS pin VARCHAR(10) DEFAULT '123456';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS user_id INT;
