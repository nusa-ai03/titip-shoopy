# 🛒 Titip Shoopy - POS, Self-Order & Hyperlocal Food Delivery System

**Titip Shoopy** adalah platform *Hyperlocal Food Delivery & Jastip Kuliner Lokal Universal* yang dirancang khusus untuk melayani area Perkantoran/Instansi, Perumahan, Area Publik, serta operasional fisik warung/merchant secara efisien menggunakan strategi **Batching Delivery**, **POS Offline Kasir**, **Self-Order Dine-in via QR Code Meja**, dan **Anti-Order Fiktif via WhatsApp Verification**.

---

## 🚀 Fitur Unggulan Sistem V1.0.0

### 1. 🍽️ Self-Order Meja (Dine-in via QR Code)
* **Scan & Order:** Pengunjung *scan* QR code unik di setiap meja untuk membuka *e-menu* publik (`/order?merchant=ID&table=X`).
* **Auto-Registration & Verification:** Input Nama Lengkap & Nomor WhatsApp pemesan dengan validasi otomatis (jika nomor sudah terdaftar, tombol *Verify* akan mengisi nama secara otomatis; jika belum, sistem otomatis mendaftarkan shooper baru).
* **Billing Open & Real-Time Sync:** Pesanan masuk ke kasir dengan status **Billing Open**. Pengunjung dapat mengubah kuantitas (qty) atau menghapus menu secara mandiri selama status masih *open*.
* **Smart Order Merging:** Jika pengunjung melakukan *self-order* ulang (*Pesan Lagi*), item otomatis digabungkan ke nomor *order* yang sama tanpa membuat pesanan baru, sehingga pelunasan di kasir cukup sekali saja.

### 2. 💻 POS & Manajemen Kasir Merchant
* **Grid Produk & Pencarian:** Navigasi produk POS cepat dengan filter pencarian instan.
* **Fitur Diskon Fleksibel:** Mendukung pemotongan harga transaksi via Persen (%) maupun Rupiah (Rp).
* **Dual Action Checkout (PRINT & WA):** Tombol pembayaran kasir dipecah menjadi **PRINT** (mencetak struk PDF thermal) dan **WA** (membuka WhatsApp rincian tagihan), yang otomatis mengubah status pesanan menjadi **Lunas**.
* **History Transaksi:** Memantau seluruh transaksi POS dan meja, lengkap dengan tombol kelola status, cetak PDF, dan pengiriman struk via WhatsApp dengan input nomor tujuan custom.

### 3. 📱 Shooper Front-End (GoFood Style UI)
* **Katalog Kuliner Dynamic:** Tampilan ala GoFood modern berbasis TailwindCSS & DaisyUI.
* **Smart Merchant Availability:** Deteksi jam operasional toko otomatis.
* **Tracking Pesanan Real-time:** Shooper dapat memantau status pesanan (*Pending WA*, *Diproses Runner*, *Selesai*) di menu header.

### 4. 🏃 Runner Armada CS Dashboard
* **3-Tiered Armada Dispatching System:** Filter order berdasarkan zona, mekanisme *Claim Lock* (First-Come Claim), hingga *Auto-Assign Fallback Engine*.
* **Anti-Order Fiktif via WhatsApp:** Integrasi draf konfirmasi WA instan ke Shooper sebelum pesanan diproses ke warung.
* **Master Merchant & Lokasi Field-Access:** Runner memiliki wewenang mengelola master warung dan master lokasi titik antar di lapangan.

### 5. 👑 Executive Admin Suite
* **Real-time KPI Dashboard:** Omset Gross GMV, Profit Bersih Platform, Total Orders, & Volume Porsi Terjual.
* **Leaderboard Intelijen Bisnis:** Peringkat Top Shooper, Top Runner, Top Merchant, dan Top Lokasi Terfavorit.
* **All-in-One Settings Panel:** Pengaturan branding, slogan, promo harian, biaya layanan, dan tema daisyUI.

---

## 🏗️ Arsitektur & Teknologi

* **Backend & API:** Node.js (Express.js)
* **Database:** PostgreSQL 15 (Dockerized)
* **Containerization:** Docker & Docker Compose
* **Frontend:** HTML5, Modern JavaScript (ES6+), TailwindCSS, DaisyUI
* **Receipt Engine:** PDFKit (Thermal PDF Receipt Generator)
* **Reverse Proxy / SSL:** Nginx & Let's Encrypt Certbot / Cloudflare

---

## ⚙️ Panduan Instalasi & Jalankan Sistem (Docker)

### 1. Prerequisites
Pastikan server Anda telah terinstall Docker dan Docker Compose.

### 2. Clone Repositori
```bash
git clone [https://github.com/USERNAME_ANDA/titip-shoopy.git](https://github.com/USERNAME_ANDA/titip-shoopy.git)
cd titip-shoopy
