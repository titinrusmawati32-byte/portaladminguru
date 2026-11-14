# 🎓 SiGuru SD — Portal Administrasi Guru & Sekolah Terpadu (Admin First)

**Sistem Administrasi Sekolah & Guru Kelas SD Terpadu (Kurikulum Merdeka)**

Frontend di-deploy di **Vercel** • Backend REST API di **Google Apps Script** • Database di **Google Sheets** (10 Sheet Relasional) • Penyimpanan Berkas di **Google Drive**

---

## 🎨 Konsep Desain Portal Berbasis Kartu (Portal-Based Dashboard)

Aplikasi mengadopsi navigasi berbasis portal kartu modern sesuai standar UI edukasi modern (tanpa sidebar dan tanpa topbar konvensional):

### A. Portal Admin Sekolah (Biru Navy & Emas)
1. **Hero Banner Admin**: Banner biru royal bercahaya dengan logo Tut Wuri Handayani, judul "Portal Admin Sekolah", identitas sekolah, slogan, serta ilustrasi 3D administrator ASN berkacamata memegang tablet, gedung sekolah neoklasik beratap merah, bendera Merah Putih berkibar, dan pepohonan asri.
2. **8 Kartu Menu Admin (Grid 4x2 Responsif)**:
   - **Manajemen Guru**: Kartu pastel biru muda dengan ilustrasi 3D 3 orang guru berbusana khaki ASN, tombol panah bulat biru.
   - **Manajemen Kelas**: Kartu pastel hijau mint dengan ilustrasi 3D gedung sekolah beratap merah dan menara jam, tombol panah bulat hijau.
   - **Pembagian Guru & Kelas**: Kartu pastel aprikot/oranye dengan ilustrasi 3D papan clipboard checklist dan badge profil avatar biru, tombol panah bulat oranye.
   - **Rekapitulasi Nilai**: Kartu pastel ungu lavender dengan ilustrasi 3D grafik batang tiga warna dan panah naik melengkung ungu-magenta, tombol panah bulat ungu.
   - **Rekapitulasi Absensi**: Kartu pastel hijau toska/teal dengan ilustrasi 3D kalender hijau dan jam dinding analog biru bulat, tombol panah bulat toska.
   - **Laporan Sekolah**: Kartu pastel merah muda/pink dengan ilustrasi 3D dokumen folder dan diagram lingkaran (pie chart) 3 warna, tombol panah bulat merah.
   - **Bank Perangkat Ajar**: Kartu pastel biru langit/cyan dengan ilustrasi 3D tumpukan 3 buku bersampul biru dan berhalaman emas, tombol panah bulat biru langit.
   - **Pengaturan Sekolah**: Kartu pastel biru nila/indigo dengan ilustrasi 3D roda gigi (gear) mekanik biru 3 dimensi, tombol panah bulat indigo.
3. **Welcome Information Bar**: Bilah pil putih dengan ikon bundar info "i" biru, ucapan *"Selamat Datang, Kepala Sekolah!"*, pembatas garis halus, serta miniatur sekolah *"SD Negeri Cerdas Bangsa 01 - Kecamatan Ambaru - Jember"*.
4. **Pita Hiasan Gelombang Bawah**: Aksen pita bergelombang dinamis berwarna biru laut dan kuning emas.

### B. Portal Guru (Hijau Emerald & Emas)
1. **Hero Banner Guru**: Banner hijau emerald dengan logo Tut Wuri Handayani, judul "Portal Guru", identitas sekolah, slogan, serta ilustrasi 3D guru wanita berhijab dan berseragam dinas memegang tablet.
2. **8 Kartu Menu Guru (Grid 4x2 Responsif)**:
   - **Dashboard**: Kartu pastel biru muda dengan ilustrasi 3D rumah/dashboard.
   - **Data Siswa**: Kartu pastel hijau mint dengan ilustrasi 3D 3 siswa SD berseragam merah-putih.
   - **Input Nilai**: Kartu pastel oranye dengan ilustrasi 3D checklist nilai dan pensil emas.
   - **Presensi Siswa**: Kartu pastel ungu dengan ilustrasi 3D kalender bertanda centang hijau.
   - **Jurnal Mengajar**: Kartu pastel toska dengan ilustrasi 3D buku terbuka dan pita pembatas buku.
   - **Perangkat Pembelajaran**: Kartu pastel pink dengan ilustrasi 3D dokumen resmi bermedali biru.
   - **Analisis**: Kartu pastel biru langit dengan ilustrasi 3D grafik tren capaian belajar.
   - **Pengumuman**: Kartu pastel indigo dengan ilustrasi 3D megafon/toa pengumuman biru.
3. **Welcome Information Bar Guru**: Bilah pil putih dengan ikon bundar info "i" hijau, ucapan *"Selamat Datang, Bapak/Ibu Guru!"*, pembatas garis, dan identitas sekolah.
4. **Pita Hiasan Gelombang Bawah**: Aksen pita bergelombang dinamis berwarna hijau emerald dan kuning emas.

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
