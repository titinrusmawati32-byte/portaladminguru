# 🎓 SiGuru SD — Platform Administrasi Guru & Sekolah Multi-Satuan Pendidikan
### Wilayah Binaan: Kecamatan Ambulu, Kabupaten Jember, Jawa Timur
**Versi 3.0.0-PROD • Kurikulum Merdeka & Multi-Teacher Self Service**

Frontend di-deploy di **Vercel** (`portaladminguru.vercel.app`) • Backend REST API di **Google Apps Script** • Database di **Google Sheets** • Autentikasi dengan **Firebase Authentication (Google Sign-In)** • Berkas di **Google Drive**

---

## 🌟 Fitur Utama Platform Multi-Sekolah Kecamatan Ambulu

1. **Google Sign-In Mandiri**:
   - Setiap guru SD di Kecamatan Ambulu dapat masuk langsung menggunakan akun Google masing-masing tanpa perlu dibuatkan akun manual oleh Admin.
   - Pendaftaran profil mandiri saat login pertama: Nama Lengkap & Gelar, NIP/NUPTK, Nomor WhatsApp, Sekolah Induk (14 SDN Ambulu), Tugas/Jabatan, dan Status Kepegawaian.

2. **Isolasi Data Aman & Terpusat (Multi-Tenant)**:
   - Data kelas, siswa, nilai, presensi, dan jurnal mengajar diisolasi berdasarkan `owner_uid` dan `school_id`.
   - Guru hanya dapat melihat dan mengelola data kelas dan siswa ampuannya sendiri.
   - Admin Sekolah dapat memantau seluruh kelas dan rekapitulasi nilai/absensi di sekolahnya.
   - Super Admin Koorwil Ambulu memiliki akses supervisi menyeluruh terhadap 14 SD Negeri se-Kecamatan Ambulu.

3. **Manajemen Rombel & Siswa Mandiri**:
   - Guru dapat membuat rombel/kelas mengajar sendiri (+ Buat Kelas Baru).
   - Pengisian siswa fleksibel: input manual satu per satu atau **📥 Impor Massal dari Excel / CSV** (salin & tempel tabel nama, NISN, wali murid).

4. **Tiga Portal Terintegrasi**:
   - 👑 **Portal Super Admin Kecamatan**: Koorwil Ambulu (Direktori guru, verifikasi sekolah & guru, statistik wilayah, audit database).
   - 🏫 **Portal Admin Sekolah**: Kepala Sekolah & Operator (Manajemen rombel, penugasan, cetak laporan resmi Kop Surat).
   - 👩‍🏫 **Portal Guru Mandiri**: Administrasi pembelajaran (Dashboard kelas, rombel saya, data siswa, input nilai, presensi, jurnal mengajar, perangkat ajar).

---

## 🏫 Direktori 14 SD Negeri Kecamatan Ambulu

| ID Sekolah | NPSN | Nama Satuan Pendidikan | Desa |
|---|---|---|---|
| `SCH-AMB-01` | 20512001 | SD Negeri Ambulu 01 | Ambulu |
| `SCH-AMB-02` | 20512002 | SD Negeri Ambulu 02 | Ambulu |
| `SCH-AMB-03` | 20512003 | SD Negeri Ambulu 03 | Ambulu |
| `SCH-AMB-04` | 20512004 | SD Negeri Ambulu 04 | Ambulu |
| `SCH-KRN-01` | 20512005 | SD Negeri Karanganyar 01 | Karanganyar |
| `SCH-KRN-02` | 20512006 | SD Negeri Karanganyar 02 | Karanganyar |
| `SCH-PNT-01` | 20512007 | SD Negeri Pontang 01 | Pontang |
| `SCH-PNT-02` | 20512008 | SD Negeri Pontang 02 | Pontang |
| `SCH-SBR-01` | 20512009 | SD Negeri Sabrang 01 | Sabrang |
| `SCH-SBR-02` | 20512010 | SD Negeri Sabrang 02 | Sabrang |
| `SCH-ADG-01` | 20512011 | SD Negeri Andongsari 01 | Andongsari |
| `SCH-ADG-02` | 20512012 | SD Negeri Andongsari 02 | Andongsari |
| `SCH-TGL-01` | 20512013 | SD Negeri Tegalsari 01 | Tegalsari |
| `SCH-SBR-03` | 20512014 | SD Negeri Sumberejo 01 | Sumberejo |

---

## 🚀 Panduan Deploy & Sinkronisasi

### Langkah 1: Perbarui Google Apps Script (Backend)
1. Buka Google Spreadsheet database, klik menu **Ekstensi** > **Apps Script**.
2. Salin seluruh isi [`gas/Code.gs`](gas/Code.gs) dan tempelkan menggantikan seluruh isi editor Apps Script.
3. Simpan perubahan (**Ctrl + S**).
4. *(Opsional - pertama kali)* Jalankan fungsi **`setupDatabaseMultiSchool`** untuk memastikan seluruh sheet master terinisialisasi bersih.
5. Klik **Deploy** > **Manage deployments** > Ikon **Pensil (Edit)** > Versi: **New version** > Akses: **Anyone** > Klik **Deploy**.

### Langkah 2: Deploy Frontend ke GitHub & Vercel
Jalankan perintah berikut di PowerShell terminal:
```bash
git add .
git commit -m "feat: multi-school multi-teacher platform for kecamatan ambulu jember"
git push origin main --force
```
*Catatan: `--force` digunakan untuk menyinkronkan branch remote GitHub dengan repositori lokal yang telah diperbarui.*
