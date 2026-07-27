-- Tambahkan metode pembayaran atau pastikan tabel order support kasir offline
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'CASH';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'QRIS';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pos_walk_in';
