# 🛵 Titip Shoopy - Hyperlocal Food Delivery & Jastip Platform

**Titip Shoopy** adalah platform *Hyperlocal Food Delivery & Jastip Kuliner Lokal Universal* yang dirancang khusus untuk melayani area Perkantoran/Instansi, Perumahan, dan Area Publik secara efisien menggunakan strategi **Batching Delivery**, **3-Tiered Armada Dispatching**, dan **Anti-Order Fiktif via WhatsApp Verification**.

---

## 🚀 Fitur Unggulan Sistem

### 1. 📱 Shooper Front-End (GoFood Style UI)
* **Katalog Kuliner Dynamic:** Tampilan ala GoFood modern berbasis TailwindCSS & DaisyUI.
* **Smart Merchant Availability:** Deteksi jam operasional toko otomatis & switch *Tutup Manual* dari Runner.
* **Reward Rupiah Cashback:** Fitur loyalti cashback berupa nominal Rupiah langsung yang bisa digunakan sebagai potongan harga COD.
* **Multi-Format Syarat & Ketentuan:** Mendukung format numerik, bullet, maupun emoji/symbol modern.
* **Tracking Pesanan Real-time:** Shooper dapat memantau status pesanan (*Pending WA*, *Diproses Runner*, *Selesai*) di menu header.

### 2. 🏃 Runner Armada CS Dashboard
* **3-Tiered Armada Dispatching System:**
  1. **Prioritas 1 (Zoning Area):** Filter order otomatis berdasarkan zona tugas Runner (*Instansi* vs *Umum*).
  2. **Prioritas 2 (Claim Lock):** Mekanisme kunci pesanan (*First-Come Claim*) untuk mencegah perebutan antar-Runner.
  3. **Prioritas 3 (Auto-Assign Fallback Engine):** Sistem backend otomatis menugaskan pesanan tertunda (>3 menit) ke Runner aktif dengan beban kerja terendah.
* **Anti-Order Fiktif via WhatsApp:** Integrasi draf konfirmasi WA instan ke Shooper sebelum pesanan diproses ke warung.
* **Master Merchant & Lokasi Field-Access:** Runner memiliki wewenang mengelola master warung (Buka/Tutup & Jam Buka) serta master lokasi titik antar secara presisi di lapangan.

### 3. 👑 Executive Admin Suite
* **Real-time KPI Dashboard:** Omset Gross GMV, Profit Bersih Platform (Service Fee + Margin Jastip), Total Orders, & Volume Porsi Terjual.
* **Leaderboard Intelijen Bisnis:**
  * **Top Shooper Loyal:** Peringkat pelanggan berdasarkan nominal belanja.
  * **Top Runner Terbanyak:** Peringkat driver berdasarkan antaran completed.
  * **Top Merchant Terlaris:** Peringkat warung berdasarkan porsi terjual.
  * **Top Lokasi Terfavorit:** Gedung/ruangan dengan frekuensi order tertinggi.
* **All-in-One Settings Panel:** Pengaturan branding, slogan, promo harian, biaya layanan, dan tema daisyUI (*luxury*, *bumblebee*, *emerald*).

---

## 🏗️ Arsitektur & Teknologi

* **Backend & API:** Node.js (Express.js)
* **Database:** PostgreSQL 15 (Dockerized)
* **Containerization:** Docker & Docker Compose
* **Frontend:** HTML5, Modern JavaScript (ES6+), TailwindCSS, DaisyUI
* **Reverse Proxy / SSL:** Nginx & Let's Encrypt Certbot

---

## ⚙️ Panduan Instalasi & Jalankan Sistem (Docker)

### 1. Prerequisites
Pastikan server Anda telah terinstall Docker dan Docker Compose.

### 2. Clone Repositori
```bash
git clone [https://github.com/USERNAME_ANDA/titip-shoopy.git](https://github.com/USERNAME_ANDA/titip-shoopy.git)
cd titip-shoopy

