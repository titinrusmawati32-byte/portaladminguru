# 🎓 SiGuru SD — Portal Administrasi Guru & Sekolah Terpadu (Admin First)

**Sistem Administrasi Sekolah & Guru Kelas SD Terpadu (Kurikulum Merdeka)**

Frontend di-deploy di **Vercel** • Backend REST API di **Google Apps Script** • Database di **Google Sheets** (10 Sheet Relasional) • Penyimpanan Berkas di **Google Drive**

---

## ✨ Fitur Utama (Admin First Architecture)

### A. Portal Admin Sekolah (Pusat Kendali Administrator)
1. **Dashboard Admin**: Ringkasan 8 KPI utama, status kelengkapan administrasi per kelas, dan riwayat audit trail log aktivitas admin.
2. **Manajemen Guru**: Pengelolaan data guru, email Google, NIP, jenis guru (Guru Kelas / Guru Mapel), status akun (Aktif/Nonaktif), dan riwayat penugasan.
3. **Manajemen Kelas**: Struktur rombel tingkat I–VI, tahun ajaran aktif, wali kelas, guru mapel terdaftar, dan peninjauan daftar siswa per rombel.
4. **Pembagian Guru & Kelas (Penugasan Guru)**: Penetapan Wali Kelas dan Guru Mapel (mendukung 1 guru mapel mengajar banyak kelas).
5. **Rekapitulasi Nilai Seluruh Kelas**: Monitoring nilai formatif, sumatif, SAS, rata-rata, persentase ketuntasan (KKM ≥ 75), ekspor Excel (.xlsx) dan cetak PDF. (Admin hanya bertugas melihat, menganalisis, dan mencetak).
6. **Rekapitulasi Absensi Sekolah**: Monitoring kehadiran harian, bulanan, dan semester tingkat sekolah (Hadir, Sakit, Izin, Alfa), persentase kehadiran, ekspor Excel dan cetak PDF.
7. **Pusat Laporan Sekolah (8 Kategori)**: Dokumen resmi siap cetak lengkap dengan **Kop Surat Sekolah**, Logo Tut Wuri / Sekolah, Nomor NPSN, Tabel Data, dan Titik Tanda Tangan Kepala Sekolah & Pengawas Pembina.
8. **Bank Perangkat Ajar**: Pengelolaan materi dan bahan ajar sekolah (Word, PDF, Excel), kategorisasi fase/tingkat, dan kontrol publikasi aktif/draft untuk guru.
9. **Pengaturan Identitas Sekolah**: Konfigurasi Nama Sekolah, NPSN, Alamat Lengkap, Kepala Sekolah, NIP, Logo, Tahun Ajaran, dan Semester aktif.

### B. Portal Guru (Pembatasan Akses RBAC)
- **Role-Based Access Control**: Guru hanya dapat mengakses dan mengelola kelas dan mata pelajaran yang secara resmi ditugaskan kepadanya di sistem.
- **Administrasi Kelas**: Pengisian presensi harian, penilaian siswa, dan akses bank perangkat ajar terverifikasi.

---

## 🏗️ Struktur Basis Data Relasional (10 Sheet)

1. `Users` `[ID_User, Username, Password, Nama_Lengkap, Email, NIP, Role, Jenis_Guru, Status_Akun, Status_Tugas]`
2. `Data_Kelas` `[ID_Kelas, Tingkat, Nama_Rombel, Tahun_Ajaran, ID_Wali_Kelas, Nama_Wali_Kelas, Status_Kelas]`
3. `Penugasan_Guru` `[ID_Penugasan, ID_Guru, Nama_Guru, ID_Kelas, Nama_Kelas, Jenis_Tugas, Mata_Pelajaran, Tahun_Ajaran, Semester, Status]`
4. `Data_Siswa` `[ID_Siswa, ID_Kelas, Nama_Kelas, NIS, NISN, Nama_Siswa, JK, TTL, Nama_Wali, No_HP_Wali, Status]`
5. `Presensi` `[ID_Presensi, Tanggal, ID_Kelas, Nama_Kelas, ID_Siswa, Nama_Siswa, Status_Hadir, Keterangan, Waktu_Input]`
6. `Nilai_Siswa` `[ID_Nilai, ID_Kelas, Nama_Kelas, ID_Siswa, Nama_Siswa, Mata_Pelajaran, Lingkup_Materi, Nilai_Formatif, Nilai_Sumatif, Nilai_SAS, Nilai_Akhir, Semester, Tahun_Ajaran]`
7. `Jurnal_Mengajar` `[ID_Jurnal, ID_Kelas, Nama_Kelas, Tanggal, Jam_Ke, Mata_Pelajaran, Topik_Materi, Kegiatan_Pembelajaran, Siswa_Tidak_Hadir, Catatan_Refleksi]`
8. `Perangkat_Ajar` `[ID_Dokumen, Judul_Dokumen, Mata_Pelajaran, Kategori_Kelas, Jenis, Format_Tipe, Nama_File, Ukuran_File, Sumber, Durasi_JP, Link_Berkas, Deskripsi, Uploader, Status_Publikasi, Waktu_Upload]`
9. `Pengaturan_Sekolah` `[Kunci, Nilai]` (Key-Value)
10. `Log_Aktivitas_Admin` `[ID_Log, Waktu, ID_Admin, Nama_Admin, Aksi, Detail]`

---

## 🚀 Panduan Pembaruan ke Google Apps Script & Vercel

### Langkah 1: Perbarui Google Apps Script
1. Buka Google Spreadsheet database Anda, klik **Ekstensi** > **Apps Script**.
2. Hapus seluruh isi `Code.gs` dan tempelkan seluruh kode dari [`gas/Code.gs`](gas/Code.gs).
3. Simpan (**Ctrl + S**).
4. Jalankan fungsi **`setupDatabase`** sekali untuk menginisialisasi 10 sheet relasional.
5. Klik **Deploy** > **Manage deployments** > Ikon **Pensil (Edit)** > Versi: **New version** > Akses: **Anyone** > Klik **Deploy**.

### Langkah 2: Sinkronkan ke GitHub & Vercel
Jalankan di PowerShell:
```bash
git add .
git commit -m "feat: implementasi Portal Admin Sekolah lengkap (Admin First Development)"
git push origin main --force
```

---

## 🔑 Akun Login Bawaan

| Peran | Username | Password | Hak Akses |
|---|---|---|---|
| **Admin Sekolah** | `admin` | `admin2026` | Pengelolaan Penuh: Guru, Kelas, Penugasan, Rekap Nilai, Rekap Absensi, Laporan, Pengaturan |
| **Guru Kelas** | `dewi` | `guru2026` | Pembelajaran Kelas IV-A (Presensi, Siswa, Nilai, Bank Dokumen) |
| **Guru Mapel** | `fauzi` | `guru2026` | Pembelajaran Mapel PAI (Multi-Kelas: I-A & IV-A) |
