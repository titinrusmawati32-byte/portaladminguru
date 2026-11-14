# 🎓 SiGuru SD — Portal Administrasi Guru Kelas Digital

**Sistem Administrasi Guru Kelas SD Terpadu (Kurikulum Merdeka)**

Frontend di-deploy di **Vercel** • Backend REST API di **Google Apps Script** • Database di **Google Sheets** • Penyimpanan Berkas di **Google Drive**

---

## ✨ Fitur Utama

- **Bank Perangkat Ajar**: Upload dan kelola dokumen Word (.docx), PDF (.pdf), dan Excel (.xlsx).
- **Hak Akses Berbasis Peran (RBAC)**:
  - **Admin Sekolah**: Upload, edit, dan hapus perangkat ajar.
  - **Guru Kelas**: Buka, unduh, dan cari dokumen (read-only).
- **Buku Induk Siswa**: Data peserta didik lengkap dengan tombol WhatsApp wali murid.
- **Presensi Harian**: Pencatatan kehadiran harian (Hadir/Sakit/Izin/Alfa).
- **Jurnal Mengajar**: Agenda harian dan refleksi materi pembelajaran.
- **PWA (Progressive Web App)**: Bisa di-instal di HP dan Laptop.

---

## 🏗️ Arsitektur

```
┌─────────────────────────────┐     fetch() / REST API     ┌──────────────────────────┐
│   Frontend (Vercel)         │ ◄─────────────────────────► │  Backend (Google Apps     │
│                             │    GET ?action=getAllData    │  Script Web App)         │
│   • HTML + Tailwind CSS     │    POST {action, payload}   │                          │
│   • JavaScript (SPA)        │                             │  • Code.gs               │
│   • Inline SVG Icons        │                             │  • Google Sheets (DB)    │
│   • PWA Support             │                             │  • Google Drive (Files)  │
└─────────────────────────────┘                             └──────────────────────────┘
```

---

## 🚀 Langkah Deployment

### Bagian A: Deploy Backend (Google Apps Script)

1. **Buat Google Spreadsheet baru** di [sheets.new](https://sheets.new).  
   Beri nama: `Database SiGuru SD`

2. Klik menu **Ekstensi** > **Apps Script**.

3. Di editor Apps Script, buka file `Code.gs` (sudah ada secara default).  
   **Hapus semua isinya**, lalu salin dan tempel seluruh kode dari file [`gas/Code.gs`](gas/Code.gs) di repositori ini.

4. Klik **Simpan** (Ctrl + S).

5. **Jalankan `setupDatabase()`**:
   - Pada dropdown fungsi di samping tombol **Run**, pilih `setupDatabase`.
   - Klik **Run** (Jalankan).
   - Pada dialog otorisasi pertama kali:
     - Klik **Review Permissions** > Pilih akun Google > **Advanced** > **Go to... (unsafe)** > **Allow**.
   - Buka kembali tab Spreadsheet — 7 sheet baru akan otomatis muncul.

6. **Deploy sebagai Web App**:
   - Klik tombol biru **Deploy** > **New deployment**.
   - Pada **Type**, pilih **Web app**.
   - **Description**: `SiGuru SD API v1`
   - **Execute as**: `Me (email@gmail.com)`
   - **Who has access**: `Anyone`
   - Klik **Deploy**.
   - **Salin URL Web App** yang ditampilkan (format: `https://script.google.com/macros/s/ABCDEF.../exec`).  
     ⚠️ URL ini akan digunakan di langkah selanjutnya!

---

### Bagian B: Deploy Frontend ke Vercel via GitHub

1. **Push repositori ini ke GitHub**:
   ```bash
   cd siguru-sd
   git init
   git add .
   git commit -m "Initial commit: SiGuru SD portal"
   git branch -M main
   git remote add origin https://github.com/USERNAME/siguru-sd.git
   git push -u origin main
   ```

2. **Hubungkan ke Vercel**:
   - Buka [vercel.com](https://vercel.com) dan login dengan akun GitHub Anda.
   - Klik **Add New Project** > Pilih repositori `siguru-sd`.
   - Biarkan semua pengaturan default (Framework: Other, Output: `public`).
   - Klik **Deploy**.

3. **Konfigurasi URL API Database (`public/config.js`)**:
   - Buka file `public/config.js`.
   - Masukkan URL Web App dari Langkah A.6 ke dalam variabel `GAS_API_URL`:
     ```javascript
     const APP_CONFIG = {
       GAS_API_URL: 'https://script.google.com/macros/s/ABCDEF.../exec',
       // ...
     };
     ```
   - Commit dan push perubahan ke GitHub:
     ```bash
     git add public/config.js
     git commit -m "chore: atur URL database Google Apps Script di config.js"
     git push
     ```
   - Vercel akan otomatis melakukan auto-deploy dan langsung terhubung dengan database Google Sheets!
     git add .
     git commit -m "Tambahkan URL API backend"
     git push
     ```
   - Vercel akan otomatis re-deploy.

4. **Buka URL Vercel** yang diberikan (misalnya `https://siguru-sd.vercel.app`) — Portal SiGuru SD sudah aktif!

---

### Bagian C: Uji Coba

| Akun | Username | Password | Hak Akses |
|------|----------|----------|-----------|
| Admin Sekolah | `admin` | `admin2026` | Upload, Edit, Hapus dokumen |
| Guru Kelas | `peserta` | `edudigital` | Buka & Unduh dokumen (Read-Only) |

**Tombol Cepat**: Di halaman login, klik langsung **Admin Sekolah** atau **Guru Kelas** untuk masuk instan.

---

## 📁 Struktur Proyek

```
siguru-sd/
├── public/
│   ├── config.js           # File konfigurasi URL Database GAS
│   └── index.html          # Frontend SPA (HTML + CSS + JS)
├── gas/
│   └── Code.gs             # Backend Google Apps Script (REST API)
├── vercel.json             # Konfigurasi Vercel
├── package.json            # Metadata proyek
├── .gitignore
└── README.md               # Panduan ini
```

---

## 🔧 Mode Offline / Demo

Jika `GAS_API_URL` dikosongkan (`''`), aplikasi berjalan dalam **mode offline** dengan data contoh disimpan di `localStorage` browser. Cocok untuk demo atau presentasi tanpa koneksi internet.

---

## 📜 Lisensi

Proyek ini dibuat untuk keperluan administrasi guru SD di Indonesia.
