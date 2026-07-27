-- Pastikan default status order adalah pending_confirmation
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending_confirmation';

-- Update order lama jika ada yang masih pending_batch
UPDATE orders SET status = 'pending_confirmation' WHERE status = 'pending_batch';
