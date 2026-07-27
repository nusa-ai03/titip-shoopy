-- Ubah kolom status menjadi VARCHAR atau tambahkan nilai enum jika menggunakan tipe ENUM
DO $$ 
BEGIN
    -- Jika kolom status menggunakan tipe ENUM, kita alter atau ubah jadi VARCHAR agar fleksibel
    ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(50);
EXCEPTION
    WHEN others THEN NULL;
END $$;
