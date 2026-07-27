-- 1. Tambahkan zona tugas Runner di tabel users ('Instansi', 'Umum', 'All')
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_zone VARCHAR(50) DEFAULT 'All';

-- 2. Tambahkan penguncian Runner & Timestamp di tabel orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS runner_id INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP;

-- 3. Set default zona untuk Runner dummy yang ada
UPDATE users SET assigned_zone = 'Instansi' WHERE name LIKE '%Agus%';
UPDATE users SET assigned_zone = 'Umum' WHERE name LIKE '%Bambang%';
