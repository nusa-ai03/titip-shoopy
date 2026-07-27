ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100);

CREATE TABLE IF NOT EXISTS merchant_tables (
    id SERIAL PRIMARY KEY,
    merchant_id INT REFERENCES merchants(id),
    table_number VARCHAR(50) NOT NULL,
    qr_token VARCHAR(100) UNIQUE
);

INSERT INTO merchant_tables (merchant_id, table_number, qr_token) 
SELECT id, '1', CONCAT('merchant_', id, '_table_1') FROM merchants ON CONFLICT DO NOTHING;
INSERT INTO merchant_tables (merchant_id, table_number, qr_token) 
SELECT id, '2', CONCAT('merchant_', id, '_table_2') FROM merchants ON CONFLICT DO NOTHING;
INSERT INTO merchant_tables (merchant_id, table_number, qr_token) 
SELECT id, '3', CONCAT('merchant_', id, '_table_3') FROM merchants ON CONFLICT DO NOTHING;
