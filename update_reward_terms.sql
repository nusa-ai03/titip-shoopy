UPDATE settings 
SET value = 'Kumpulkan Saldo Reward tiap kali transaksi selesai diproses oleh Runner.
Reward senilai Rupiah dapat langsung digunakan sebagai potongan harga saat Checkout COD.
Makin sering pesan rombongan, makin besar saldo reward yang dikumpulkan.
Saldo reward berlaku untuk semua Shooper terdaftar tanpa batas waktu.'
WHERE key = 'reward_terms';
