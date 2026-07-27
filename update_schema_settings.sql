-- Tabel Settings Aplikasi
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(50) PRIMARY KEY,
    value VARCHAR(255) NOT NULL
);

-- Inisialisasi Tema Default: luxury
INSERT INTO settings (key, value) VALUES ('active_theme', 'luxury')
ON CONFLICT (key) DO NOTHING;
