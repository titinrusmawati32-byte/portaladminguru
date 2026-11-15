# 🎓 SiGuru SD — Platform Administrasi Pendidikan Kecamatan Ambulu
### Kabupaten Jember, Jawa Timur • Versi 3.1.0-NPSN-AUTH
**Sistem Autentikasi: NPSN + Kode Unik Lembaga & PIN Pribadi Guru (Opsi C)**

---

## 🔑 Direktori Resmi 13 SD Negeri & Kode Unik Akses Lembaga

Berikut adalah daftar 13 SD Negeri resmi di Kecamatan Ambulu beserta **Kode Unik Akses Lembaga** yang telah di-generate secara otomatis oleh sistem untuk dibagikan kepada guru di masing-masing sekolah:

| No | NPSN | Nama Satuan Pendidikan | Desa | Kode Unik Akses |
|:---:|:---:|---|---|:---:|
| 1 | **20524972** | UPTD Satuan Pendidikan SDN Ambulu 02 | Ambulu | `AMB02-8821` |
| 2 | **20524171** | UPTD Satuan Pendidikan SDN Tegalsari 01 | Tegalsari | `TGL01-7142` |
| 3 | **20524146** | UPTD Satuan Pendidikan SDN Tegalsari 02 | Tegalsari | `TGL02-6315` |
| 4 | **20524148** | UPTD Satuan Pendidikan SDN Tegalsari 03 | Tegalsari | `TGL03-5294` |
| 5 | **20524147** | UPTD Satuan Pendidikan SDN Tegalsari 04 | Tegalsari | `TGL04-4819` |
| 6 | **20524058** | UPTD Satuan Pendidikan SDN Sumberejo 04 | Sumberejo | `SMB04-3918` |
| 7 | **20524059** | UPTD Satuan Pendidikan SDN Sumberejo 05 | Sumberejo | `SMB05-2746` |
| 8 | **20524060** | UPTD Satuan Pendidikan SDN Sumberejo 07 | Sumberejo | `SMB07-1683` |
| 9 | **20524958** | UPTD Satuan Pendidikan SDN Andongsari 02 | Andongsari | `ADG02-9524` |
| 10 | **20524962** | UPTD Satuan Pendidikan SDN Andongsari 04 | Andongsari | `ADG04-8417` |
| 11 | **20523264** | UPTD Satuan Pendidikan SDN Pontang 01 | Pontang | `PNT01-7362` |
| 12 | **20524830** | UPTD Satuan Pendidikan SDN Karanganyar 01 | Karanganyar | `KRN01-6251` |
| 13 | **20524821** | UPTD Satuan Pendidikan SDN Karanganyar 03 | Karanganyar | `KRN03-5149` |

---

## 🚀 Alur Kerja Guru (Opsi C)

1. **Buka Aplikasi**: Guru membuka tautan portal.
2. **Guru Baru (Pertama Kali)**:
   - Pilih tab **"📝 Guru Baru (Daftar)"**.
   - Masukkan **NPSN** (misal: `20524058`) dan **Kode Unik Sekolah** (`SMB04-3918`).
   - Sistem memvalidasi lembaga: *"✅ Terhubung: SDN Sumberejo 04"*.
   - Guru mengisi Nama Lengkap, NIP (opsional), No. WhatsApp, Jabatan, dan membuat **PIN Pribadi (4 - 6 digit)**.
   - Klik **"Daftarkan Diri & Lanjut Buat Kelas ➔"**.
3. **Wizard Pembuatan Kelas Pertama Mandiri**:
   - Guru wajib menentukan tingkat (I - VI), nama rombel (misal: *Kelas IV-A*), dan tahun ajaran.
   - Setelah kelas disimpan, seluruh modul (Data Siswa, Presensi, Nilai, Jurnal, Modul Ajar) langsung aktif dan siap digunakan.
4. **Login Berulang (Keesokan Harinya / Beda HP / Komputer)**:
   - Pilih tab **"🔑 Masuk Guru"**.
   - Masukkan NPSN dan Kode Unik Sekolah.
   - Pilih nama guru dari dropdown dan masukkan PIN Pribadinya.
   - Masuk langsung ke rombel dan data yang telah dikelola.

---

## 🛠️ Langkah Sinkronisasi & Deployment

Jalankan perintah berikut di PowerShell untuk memperbarui repository GitHub & Vercel:
```bash
git add .
git commit -m "feat: implement npsn + unique school code + teacher pin auth (Option C)"
git push origin main --force
```
Update juga kode `gas/Code.gs` pada editor Google Apps Script spreadsheet Anda (**Deploy > Manage deployments > Edit > New version > Deploy**).
