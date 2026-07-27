-- Enum untuk Role User
CREATE TYPE user_role AS ENUM ('shooper', 'runner', 'admin');

-- Enum untuk Status Pesanan
CREATE TYPE order_status AS ENUM ('draft', 'pending_batch', 'processing', 'delivering', 'completed', 'cancelled');

-- 1. Tabel Users (Shooper & Runner)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    role user_role DEFAULT 'shooper',
    department_location VARCHAR(100), -- Misal: "Lantai 2 - Ruang Mawar"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Merchants (Penjual)
CREATE TABLE IF NOT EXISTS merchants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL, -- Format: 628123456789 (Tanpa +, Tanpa 0)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Menus (Katalog Makanan)
CREATE TABLE IF NOT EXISTS menus (
    id SERIAL PRIMARY KEY,
    merchant_id INT REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Group Orders (Rombongan Nitip)
CREATE TABLE IF NOT EXISTS group_orders (
    id SERIAL PRIMARY KEY,
    group_code VARCHAR(20) UNIQUE NOT NULL, -- Kode unik misal: "MW-2507"
    creator_id INT REFERENCES users(id),
    delivery_location VARCHAR(100) NOT NULL,
    cutoff_time TIMESTAMP WITH TIME ZONE NOT NULL, -- Jam tutup pesanan
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Orders (Pesanan Per Orang)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    group_order_id INT REFERENCES group_orders(id) ON DELETE SET NULL,
    shooper_id INT REFERENCES users(id),
    runner_id INT REFERENCES users(id),
    status order_status DEFAULT 'pending_batch',
    total_price DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 3000.00,
    payment_method VARCHAR(20) DEFAULT 'COD',
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Order Items (Detail Makanan yang Dibeli)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    menu_id INT REFERENCES menus(id),
    quantity INT NOT NULL,
    notes TEXT, -- Misal: "Pedas banget, es dicisah"
    price_per_item DECIMAL(10,2) NOT NULL
);

-- Dummy Seed Data untuk Testing Awal
INSERT INTO merchants (name, phone_number) VALUES 
('Warung Bu Sum', '6281234567890'),
('Kantin Pak Kumis', '6289876543210');

INSERT INTO menus (merchant_id, name, price) VALUES 
(1, 'Nasi Rames Ayam', 15000),
(1, 'Es Teh Manis', 5000),
(2, 'Mie Ayam Bakso', 18000);
