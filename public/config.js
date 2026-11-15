/**
 * ============================================================
 * SiGuru SD - Platform Administrasi Pendidikan Kecamatan Ambulu
 * Kabupaten Jember - Multi-School & Multi-Tenant Database
 * Autentikasi: NPSN + Kode Unik Lembaga & PIN Guru dengan Verifikasi Admin
 * ============================================================
 */

const APP_CONFIG = {
  // 1. Google Apps Script Web App (JSON REST API Backend)
  GAS_API_URL: 'https://script.google.com/macros/s/AKfycbwsVr0J9qSchXl5ltrLdOcZF3aSWEoRiRH5_4lwXSmut92i3AKF7FrpTzjTmARoWAUfCg/exec',

  // 1b. Konfigurasi Firebase Authentication (Google SSO Resmi)
  // Dapatkan dari Firebase Console -> Project Settings -> General -> Your apps -> Web App
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyB2gGUkOn-alsZY5U8XJ468nPySsF5yn7A",
    authDomain: "portaladmguru-e0689.firebaseapp.com",
    projectId: "portaladmguru-e0689",
    storageBucket: "portaladmguru-e0689.firebasestorage.app",
    messagingSenderId: "1078067835703",
    appId: "1:1078067835703:web:29e21b31d7e0088bc620b2"
  },

  // 1c. Daftar Email Google Pemilik/Admin Resmi yang Diberikan Hak Akses
  // Masukkan alamat Gmail Anda yang memiliki hak akses sebagai administrator
  AUTHORIZED_ADMIN_EMAILS: [
    // Contoh: 'adminambulu@gmail.com'
  ],

  // 2. Identitas Platform & Wilayah Operasional
  PLATFORM_NAME: 'SiGuru SD - Kecamatan Ambulu',
  VERSION: '3.2.0-STRICT-AUTH',
  KECAMATAN: 'Ambulu',
  KABUPATEN: 'Jember',
  PROVINSI: 'Jawa Timur',
  TAHUN_AJARAN_DEFAULT: '2026/2027',
  SEMESTER_DEFAULT: 'Ganjil',

  // 3. Master Data Resmi Satuan Pendidikan (SDN) Kecamatan Ambulu
  // Dilengkapi Kode Unik Akses Lembaga yang dibuat otomatis oleh sistem
  MASTER_SEKOLAH_AMBULU: [
    {
      id: 'SCH-20524058',
      npsn: '20524058',
      kodeUnik: 'SMB04-3918',
      nama: 'SDN Sumberejo 04',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sumberejo 04',
      desa: 'Sumberejo',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524059',
      npsn: '20524059',
      kodeUnik: 'SMB05-2746',
      nama: 'SDN Sumberejo 05',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sumberejo 05',
      desa: 'Sumberejo',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524060',
      npsn: '20524060',
      kodeUnik: 'SMB07-1683',
      nama: 'SDN Sumberejo 07',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sumberejo 07',
      desa: 'Sumberejo',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524972',
      npsn: '20524972',
      kodeUnik: 'AMB02-8821',
      nama: 'SDN Ambulu 02',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Ambulu 02',
      desa: 'Ambulu',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524171',
      npsn: '20524171',
      kodeUnik: 'TGL01-7142',
      nama: 'SDN Tegalsari 01',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Tegalsari 01',
      desa: 'Tegalsari',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524146',
      npsn: '20524146',
      kodeUnik: 'TGL02-6315',
      nama: 'SDN Tegalsari 02',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Tegalsari 02',
      desa: 'Tegalsari',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524148',
      npsn: '20524148',
      kodeUnik: 'TGL03-5294',
      nama: 'SDN Tegalsari 03',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Tegalsari 03',
      desa: 'Tegalsari',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524147',
      npsn: '20524147',
      kodeUnik: 'TGL04-4819',
      nama: 'SDN Tegalsari 04',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Tegalsari 04',
      desa: 'Tegalsari',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524958',
      npsn: '20524958',
      kodeUnik: 'ADG02-9524',
      nama: 'SDN Andongsari 02',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Andongsari 02',
      desa: 'Andongsari',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524962',
      npsn: '20524962',
      kodeUnik: 'ADG04-8417',
      nama: 'SDN Andongsari 04',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Andongsari 04',
      desa: 'Andongsari',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20523264',
      npsn: '20523264',
      kodeUnik: 'PNT01-7362',
      nama: 'SDN Pontang 01',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Pontang 01',
      desa: 'Pontang',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524830',
      npsn: '20524830',
      kodeUnik: 'KRN01-6251',
      nama: 'SDN Karanganyar 01',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Karanganyar 01',
      desa: 'Karanganyar',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524821',
      npsn: '20524821',
      kodeUnik: 'KRN03-5149',
      nama: 'SDN Karanganyar 03',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Karanganyar 03',
      desa: 'Karanganyar',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20512009',
      npsn: '20512009',
      kodeUnik: 'SBR01-8312',
      nama: 'SDN Sabrang 01',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sabrang 01',
      desa: 'Sabrang',
      status: 'Terverifikasi'
    }
  ],

  // 4. Helper Pencarian Sekolah Berdasarkan NPSN & Kode Unik
  findSchool: function (npsn, kodeUnik) {
    if (!npsn || !kodeUnik) return null;
    const cleanNpsn = String(npsn).trim();
    const cleanCode = String(kodeUnik).trim().toUpperCase();

    return this.MASTER_SEKOLAH_AMBULU.find(function (s) {
      return (
        String(s.npsn).trim() === cleanNpsn &&
        String(s.kodeUnik).trim().toUpperCase() === cleanCode
      );
    }) || null;
  },

  // 5. Helper Cek Koneksi Backend Google Apps Script
  isConnected: function () {
    return (
      typeof this.GAS_API_URL === 'string' &&
      this.GAS_API_URL.trim().startsWith('https://script.google.com/macros/s/') &&
      this.GAS_API_URL.trim().endsWith('/exec')
    );
  }
};

window.APP_CONFIG = APP_CONFIG;
