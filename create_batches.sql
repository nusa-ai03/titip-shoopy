CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    batch_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    cutoff_time TIME NOT NULL,
    delivery_estimation_minutes INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE
);

-- Masukkan data contoh batch default
INSERT INTO batches (batch_name, start_time, cutoff_time, delivery_estimation_minutes, is_active) 
VALUES 
('Batch Pagi (Breakfast)', '06:00', '08:30', 30, TRUE),
('Batch Siang A (Lunch 1)', '09:00', '11:00', 30, TRUE),
('Batch Siang B (Lunch 2)', '11:00', '12:30', 30, TRUE),
('Batch Sore (Dinner)', '15:00', '17:00', 30, TRUE)
ON CONFLICT DO NOTHING;

-- Tambahkan kolom batch_id ke tabel orders jika belum ada
ALTER TABLE orders ADD COLUMN IF NOT EXISTS batch_id INT REFERENCES batches(id);
