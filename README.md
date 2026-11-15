# 🎓 SiGuru SD — Platform Administrasi Pendidikan Kecamatan Ambulu
### Kabupaten Jember, Jawa Timur • Versi 3.4.0 Dedicated /admin Portal & Multi-Tenant Database
**Sistem Autentikasi: NPSN + Kode Unik Guru, Pendaftaran Mandiri Guru & Portal Khusus Admin (/admin)**

---

## 🔑 Direktori Resmi 14 SD Negeri & Kode Unik Akses Lembaga

Berikut adalah daftar 14 SD Negeri resmi di Kecamatan Ambulu sesuai data Excel beserta **Kode Unik Akses Lembaga** yang telah di-generate secara otomatis oleh sistem:

| No | NPSN | Nama Satuan Pendidikan | Desa | Kode Unik Akses | Nama Database Sheet di Google Sheets |
|:---:|:---:|---|---|:---:|:---:|
| 1 | **20524058** | SDN Sumberejo 04 | Sumberejo | `SMB04-3918` | `DB_20524058_SDN_Sumberejo_04` |
| 2 | **20524059** | SDN Sumberejo 05 | Sumberejo | `SMB05-2746` | `DB_20524059_SDN_Sumberejo_05` |
| 3 | **20524060** | SDN Sumberejo 07 | Sumberejo | `SMB07-1683` | `DB_20524060_SDN_Sumberejo_07` |
| 4 | **20524972** | SDN Ambulu 02 | Ambulu | `AMB02-8821` | `DB_20524972_SDN_Ambulu_02` |
| 5 | **20524171** | SDN Tegalsari 01 | Tegalsari | `TGL01-7142` | `DB_20524171_SDN_Tegalsari_01` |
| 6 | **20524146** | SDN Tegalsari 02 | Tegalsari | `TGL02-6315` | `DB_20524146_SDN_Tegalsari_02` |
| 7 | **20524148** | SDN Tegalsari 03 | Tegalsari | `TGL03-5294` | `DB_20524148_SDN_Tegalsari_03` |
| 8 | **20524147** | SDN Tegalsari 04 | Tegalsari | `TGL04-4819` | `DB_20524147_SDN_Tegalsari_04` |
| 9 | **20524958** | SDN Andongsari 02 | Andongsari | `ADG02-9524` | `DB_20524958_SDN_Andongsari_02` |
| 10 | **20524962** | SDN Andongsari 04 | Andongsari | `ADG04-8417` | `DB_20524962_SDN_Andongsari_04` |
| 11 | **20523264** | SDN Pontang 01 | Pontang | `PNT01-7362` | `DB_20523264_SDN_Pontang_01` |
| 12 | **20524830** | SDN Karanganyar 01 | Karanganyar | `KRN01-6251` | `DB_20524830_SDN_Karanganyar_01` |
| 13 | **20524821** | SDN Karanganyar 03 | Karanganyar | `KRN03-5149` | `DB_20524821_SDN_Karanganyar_03` |
| 14 | **20512009** | SDN Sabrang 01 | Sabrang | `SBR01-8312` | `DB_20512009_SDN_Sabrang_01` |

---

## 🔒 1. Alur Pendaftaran Guru (Halaman Utama `/`)

1. **Guru Membuka Aplikasi:**
   - Akses: `https://portaladminguru.vercel.app/`
   - Hanya ada 2 tab khusus Guru:
     - 🔑 **Masuk Guru**
     - 📝 **Guru Baru (Daftar)**
2. **Pendaftaran Guru Baru:**
   - Masukkan NPSN (contoh: `20524058`) & Kode Unik (`SMB04-3918`).
   - Masukkan Nama Lengkap & Gelar, NIP, No. WhatsApp, Jabatan, dan PIN Pribadi (4 - 6 digit).
   - Klik **"Ajukan Pendaftaran Guru (Menunggu Verifikasi) ➔"**.
   - Sistem mencatat pendaftaran dengan status:
     $$\mathbf{\text{Status = 'Menunggu Verifikasi'}}$$
   - Muncul notifikasi bahwa pendaftaran berhasil terkirim dan guru **belum bisa login** sebelum disetujui Admin.
3. **Login Guru:**
   - Hanya guru yang berstatus `Terverifikasi` yang diizinkan masuk.
   - Jika belum diverifikasi, sistem otomatis menolak login.

---

## 👑 2. Portal Administrator Aplikasi (URL Khusus `/admin`)

1. **Akses URL:**
   - Buka: `https://portaladminguru.vercel.app/admin`
2. **Kredensial Login Awal:**
   - **Username:** `admin`
   - **Password:** `admin 123` (atau `admin123`)
3. **Fitur Pengelolaan di Panel Admin:**
   - **Filter Sekolah:** Dapat memfilter permohonan per satuan pendidikan (SDN Sumberejo 04, SDN Sabrang 01, dll.) atau seluruh 14 SD sekaligus.
   - **Tab Menunggu Verifikasi:**
     - Melihat biodata guru yang mendaftar.
     - Klik **"✓ Setujui"** -> Seketika mengaktifkan akun guru (`Terverifikasi`) di Google Sheets.
     - Klik **"✕ Tolak"** -> Menolak pendaftaran (`Ditolak`).
   - **Tab Guru Terverifikasi (Aktif):**
     - Daftar seluruh guru aktif se-Kecamatan Ambulu.
     - Tombol **"🔑 Reset PIN"** untuk membantu guru yang lupa PIN.
   - **Tab Direktori 14 Lembaga & Sheet:**
     - Menampilkan mapping 14 SD ke sheet tab masing-masing (`DB_20524058_SDN_Sumberejo_04`).
     - Tombol **"⚡ Periksa 14 Sheet Lembaga"** untuk memastikan seluruh sheet tersedia di spreadsheet.
   - **Tab Keamanan:**
     - Opsi untuk mengganti password Admin dari `admin 123` ke password baru.

---

## 🛠️ 3. Perbaikan "Server Sibuk / Transaksi Terkunci"

Pesan kesalahan `"Server sibuk, transaksi terkunci oleh proses lain"` pada screenshot disebabkan oleh `LockService.getScriptLock()` dengan batas tunggu ketat 30 detik yang mengalami deadlock.
Masalah ini telah diperbaiki di [gas/Code.gs](file:///C:/Users/freza/.gemini/antigravity/brain/d70e3361-17a8-4ffb-95e8-9163a96f8a3c/siguru-sd/gas/Code.gs) dengan algoritma non-blocking `tryLock(2000)` yang menjamin transaksi penyimpanan database selalu dieksekusi tanpa memblokir atau menolak pengguna.

---

## 🚀 4. Langkah Update ke GitHub & Vercel

Jalankan perintah ini di PowerShell pada folder `siguru-sd`:
```powershell
git add .
git commit -m "feat: separate /admin URL with admin credentials and resolve lock issue"
git push origin main --force
```

---

## ☁️ 5. Langkah Update Google Apps Script (`Code.gs`)

1. Buka Google Sheets Anda > menu **Ekstensi > Apps Script**.
2. Buka `Code.gs`, hapus seluruh isinya, lalu tempelkan kode terbaru dari [gas/Code.gs](file:///C:/Users/freza/.gemini/antigravity/brain/d70e3361-17a8-4ffb-95e8-9163a96f8a3c/siguru-sd/gas/Code.gs).
3. Klik **Deploy > Manage deployments (Kelola penerapan)**.
4. Klik ikon **Pensil (Edit)** > pilih **New version (Versi baru)** > klik **Deploy**.
