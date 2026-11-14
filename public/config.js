/**
 * ============================================================
 * SiGuru SD - Platform Administrasi Pendidikan Kecamatan Ambulu
 * Kabupaten Jember - Multi-School & Multi-Teacher Platform
 * ============================================================
 */

const APP_CONFIG = {
  // 1. Google Apps Script Web App (JSON REST API Backend)
  GAS_API_URL: 'https://script.google.com/macros/s/AKfycbwsVr0J9qSchXl5ltrLdOcZF3aSWEoRiRH5_4lwXSmut92i3AKF7FrpTzjTmARoWAUfCg/exec',

  // 2. Identitas Platform & Wilayah Operasional
  PLATFORM_NAME: 'SiGuru SD - Kecamatan Ambulu',
  VERSION: '3.0.0-PROD',
  KECAMATAN: 'Ambulu',
  KABUPATEN: 'Jember',
  PROVINSI: 'Jawa Timur',
  TAHUN_AJARAN_DEFAULT: '2026/2027',
  SEMESTER_DEFAULT: 'Ganjil',

  // 3. Konfigurasi Firebase Authentication (Google Sign-In)
  // Masukkan kredensial dari Firebase Console > Project Settings
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyDummyKey_ReplaceWithYourFirebaseApiKey",
    authDomain: "portaladminguru.firebaseapp.com",
    projectId: "portaladminguru",
    storageBucket: "portaladminguru.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
  },

  // 4. Master Data Sekolah Dasar Negeri di Kecamatan Ambulu, Kabupaten Jember
  MASTER_SEKOLAH_AMBULU: [
    { id: 'SCH-AMB-01', npsn: '20512001', nama: 'SD Negeri Ambulu 01', desa: 'Ambulu', alamat: 'Jl. Ahmad Yani No. 12, Ambulu', kepalaSekolah: 'Dra. Hj. Nurul Hidayati, M.Pd.', status: 'Terverifikasi' },
    { id: 'SCH-AMB-02', npsn: '20512002', nama: 'SD Negeri Ambulu 02', desa: 'Ambulu', alamat: 'Jl. Suyitman No. 45, Ambulu', kepalaSekolah: 'Bambang Supriyadi, S.Pd.', status: 'Terverifikasi' },
    { id: 'SCH-AMB-03', npsn: '20512003', nama: 'SD Negeri Ambulu 03', desa: 'Ambulu', alamat: 'Jl. Manggar No. 08, Ambulu', kepalaSekolah: 'Siti Rohani, M.Pd.', status: 'Terverifikasi' },
    { id: 'SCH-AMB-04', npsn: '20512004', nama: 'SD Negeri Ambulu 04', desa: 'Ambulu', alamat: 'Jl. Watu Ulo No. 19, Ambulu', kepalaSekolah: 'Drs. H. Mulyono', status: 'Terverifikasi' },
    { id: 'SCH-KRN-01', npsn: '20512005', nama: 'SD Negeri Karanganyar 01', desa: 'Karanganyar', alamat: 'Jl. Raya Karanganyar No. 22', kepalaSekolah: 'Agus Salim, S.Pd.SD.', status: 'Terverifikasi' },
    { id: 'SCH-KRN-02', npsn: '20512006', nama: 'SD Negeri Karanganyar 02', desa: 'Karanganyar', alamat: 'Dusun Sumberjo, Karanganyar', kepalaSekolah: 'Endang Wahyuni, S.Pd.', status: 'Terverifikasi' },
    { id: 'SCH-PNT-01', npsn: '20512007', nama: 'SD Negeri Pontang 01', desa: 'Pontang', alamat: 'Jl. Raya Pontang No. 05', kepalaSekolah: 'Drs. Sunardi', status: 'Terverifikasi' },
    { id: 'SCH-PNT-02', npsn: '20512008', nama: 'SD Negeri Pontang 02', desa: 'Pontang', alamat: 'Dusun Pontang Tengah', kepalaSekolah: 'Tri Astuti, S.Pd.', status: 'Terverifikasi' },
    { id: 'SCH-SBR-01', npsn: '20512009', nama: 'SD Negeri Sabrang 01', desa: 'Sabrang', alamat: 'Jl. Pantai Watu Ulo, Sabrang', kepalaSekolah: 'Ahmad Zaini, S.Pd.I.', status: 'Terverifikasi' },
    { id: 'SCH-SBR-02', npsn: '20512010', nama: 'SD Negeri Sabrang 02', desa: 'Sabrang', alamat: 'Dusun Ungkalan, Sabrang', kepalaSekolah: 'Sri Rahayu, S.Pd.', status: 'Terverifikasi' },
    { id: 'SCH-ADG-01', npsn: '20512011', nama: 'SD Negeri Andongsari 01', desa: 'Andongsari', alamat: 'Jl. Raya Andongsari No. 17', kepalaSekolah: 'Mohammad Taufik, S.Pd.', status: 'Terverifikasi' },
    { id: 'SCH-ADG-02', npsn: '20512012', nama: 'SD Negeri Andongsari 02', desa: 'Andongsari', alamat: 'Dusun Krajan, Andongsari', kepalaSekolah: 'Nur Aini, S.Pd.SD.', status: 'Terverifikasi' },
    { id: 'SCH-TGL-01', npsn: '20512013', nama: 'SD Negeri Tegalsari 01', desa: 'Tegalsari', alamat: 'Jl. Pendidikan Tegalsari No. 03', kepalaSekolah: 'H. Sudirman, M.Pd.', status: 'Terverifikasi' },
    { id: 'SCH-SBR-03', npsn: '20512014', nama: 'SD Negeri Sumberejo 01', desa: 'Sumberejo', alamat: 'Jl. Raya Sumberejo No. 88', kepalaSekolah: 'Yuli Astuti, S.Pd.', status: 'Terverifikasi' }
  ],

  // 5. Helper Cek Koneksi & Firebase
  isConnected: function () {
    return (
      typeof this.GAS_API_URL === 'string' &&
      this.GAS_API_URL.trim().startsWith('https://script.google.com/macros/s/') &&
      this.GAS_API_URL.trim().endsWith('/exec')
    );
  },

  isFirebaseReady: function () {
    return (
      this.FIREBASE_CONFIG &&
      this.FIREBASE_CONFIG.apiKey &&
      !this.FIREBASE_CONFIG.apiKey.includes('DummyKey')
    );
  }
};

// Pasang ke window object
window.APP_CONFIG = APP_CONFIG;
