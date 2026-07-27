-- 1. Ubah tipe kolom value di tabel settings dari VARCHAR(255) menjadi TEXT
ALTER TABLE settings ALTER COLUMN value TYPE TEXT;

-- 2. Update ulang Syarat & Ketentuan Reward
UPDATE settings 
SET value = 'Kumpulkan Saldo Reward tiap kali transaksi selesai diproses oleh Runner.
Reward senilai Rupiah dapat langsung digunakan sebagai potongan harga saat Checkout COD.
Makin sering pesan rombongan, makin besar saldo reward yang dikumpulkan.
Saldo reward berlaku untuk semua Shooper terdaftar tanpa batas waktu.'
WHERE key = 'reward_terms';
