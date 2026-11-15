# 🎓 SiGuru SD — Platform Administrasi Pendidikan Kecamatan Ambulu
### Kabupaten Jember, Jawa Timur • Versi 3.3.0 Strict Admin & Multi-Tenant Database
**Sistem Autentikasi: NPSN + Kode Unik Lembaga, Pendaftaran Mandiri Guru & Verifikasi Admin Sekolah**

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

## 🔒 Alur Keamanan Ketat (Strict Security Flow)

### 1. Guru Baru Mendaftar di Tab "📝 Guru Baru"
- Guru memasukkan NPSN dan Kode Unik Sekolah.
- Guru melengkapi Nama Lengkap, NIP/NUPTK, No. WhatsApp, Jabatan, dan membuat PIN Pribadi (4-6 angka).
- Saat disubmit, sistem menyimpan pendaftaran di database dengan status:
  `Status_Verifikasi = 'Menunggu Verifikasi'`
- Guru **TIDAK BISA LOGIN** sebelum disetujui Admin. Muncul peringatan resmi:
  *"Status Akun: Menunggu Verifikasi oleh Admin Sekolah."*

### 2. Admin Sekolah Memverifikasi di Tab "👑 Admin Sekolah"
- Admin masuk menggunakan NPSN + Kode Unik + PIN Admin (`admin123`).
- Muncul Panel Verifikasi Admin:
  - Admin melihat daftar guru baru yang berstatus `Menunggu Verifikasi`.
  - Klik **"✓ Setujui"** untuk mengaktifkan akun guru (`Terverifikasi`).
  - Klik **"✕ Tolak"** jika pendaftaran tidak valid.
  - Admin juga dapat me-reset PIN jika guru lupa PIN.

### 3. Guru Masuk di Tab "🔑 Masuk Guru"
- Hanya guru yang berstatus `Terverifikasi` dan memasukkan PIN yang cocok yang diizinkan masuk.
- Jika status masih `Menunggu Verifikasi`, sistem otomatis menolak login dengan pemberitahuan edukatif.

### 4. Database Terisolasi Per Lembaga
- Setiap lembaga memiliki Sheet / Tab tersendiri di Google Sheets (misal: `DB_20524058_SDN_Sumberejo_04`).
- Kelas, Siswa, Presensi, Nilai, dan Jurnal disimpan dan dibaca secara terisolasi aman per sekolah.
- 100% Bebas Data Dummy (Zero Mock Data).

---

## 🛠️ Langkah Mengatasi Push Rejected & Update ke GitHub/Vercel

Jalankan perintah berikut di PowerShell terminal Anda:
```powershell
cd "C:\Users\freza\.gemini\antigravity\brain\d70e3361-17a8-4ffb-95e8-9163a96f8a3c\siguru-sd"
git add .
git commit -m "feat: strict admin verification gate and per-school database separation"
git push origin main --force
```
*(Menggunakan `--force` menyelesaikan error rejection karena riwayat remote dan lokal berbeda)*.

---

## ☁️ Langkah Update Google Apps Script (`Code.gs`)

1. Buka spreadsheet Google Sheets Anda.
2. Klik menu **Extensions (Ekstensi) > Apps Script**.
3. Buka file `Code.gs`, hapus seluruh isinya, lalu tempelkan kode terbaru dari `gas/Code.gs`.
4. Klik **Deploy > Manage deployments (Kelola penerapan)**.
5. Klik ikon **Edit (Pensil)** pada penerapan Web App aktif.
6. Pada dropdown **Version**, pilih **New version (Versi baru)**.
7. Pastikan **Who has access** tetap disetel ke **Anyone (Siapa saja)**.
8. Klik **Deploy**.
