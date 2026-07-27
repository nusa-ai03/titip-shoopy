-- 1. Tambahkan nilai enum baru ke tipe order_status di PostgreSQL
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_confirmation';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'confirmed';

-- 2. Atur nilai default kolom status di tabel orders
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending_confirmation';

-- 3. Update data order lama jika ada yang masih bernilai pending_batch
UPDATE orders SET status = 'pending_confirmation' WHERE status = 'pending_batch';
