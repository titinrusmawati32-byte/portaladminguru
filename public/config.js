/**
 * ============================================================
 * SiGuru SD - Platform Administrasi Pendidikan Kecamatan Ambulu
 * Kabupaten Jember - Multi-School & Multi-Tenant Database
 * Autentikasi: NPSN + Kode Unik Lembaga & PIN Guru dengan Verifikasi Admin
 * Cakupan: 48 Satuan Pendidikan (SD Negeri & Swasta) se-Kecamatan Ambulu
 * ============================================================
 */

const APP_CONFIG = {
  // 1. Google Apps Script Web App (JSON REST API Backend)
  GAS_API_URL: 'https://script.google.com/macros/s/AKfycbwsVr0J9qSchXl5ltrLdOcZF3aSWEoRiRH5_4lwXSmut92i3AKF7FrpTzjTmARoWAUfCg/exec',

  // 1b. Konfigurasi Firebase Authentication (Google SSO Resmi Admin)
  // API Key aman dikelola melalui Vercel Environment Variables (/api/firebase-config)
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyB2gGUkOn-alsZY5U8XJ468nPySsF5yn7A",
    authDomain: "portaladmguru-e0689.firebaseapp.com",
    projectId: "portaladmguru-e0689",
    storageBucket: "portaladmguru-e0689.firebasestorage.app",
    messagingSenderId: "1078067835703",
    appId: "1:1078067835703:web:29e21b31d7e0088bc620b2"
  },

  // 1c. Daftar Email Google Pemilik/Admin Resmi yang Diberikan Hak Akses
  AUTHORIZED_ADMIN_EMAILS: [],

  // 2. Identitas Platform & Wilayah Operasional
  PLATFORM_NAME: 'SiGuru SD - Kecamatan Ambulu',
  VERSION: '3.6.0-EXPANDED-48SD',
  KECAMATAN: 'Ambulu',
  KABUPATEN: 'Jember',
  PROVINSI: 'Jawa Timur',
  TAHUN_AJARAN_DEFAULT: '2026/2027',
  SEMESTER_DEFAULT: 'Ganjil',

  // 3. Master Data Resmi 48 Satuan Pendidikan (SD Negeri & Swasta) Kecamatan Ambulu
  MASTER_SEKOLAH_AMBULU: [
    {
      id: 'SCH-70012859',
      npsn: '70012859',
      kodeUnik: 'DFA-7012',
      nama: 'SD Dafa Al-Amien',
      namaLengkap: 'Satuan Pendidikan SD Dafa Al-Amien',
      desa: 'Ambulu',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20525027',
      npsn: '20525027',
      kodeUnik: 'YOS-2502',
      nama: 'SD Katolik Yos Sudarso',
      namaLengkap: 'Satuan Pendidikan SD Katolik Yos Sudarso',
      desa: 'Ambulu',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20525017',
      npsn: '20525017',
      kodeUnik: 'SLF-2501',
      nama: 'SD Salafiyah Syafiiyah',
      namaLengkap: 'Satuan Pendidikan SD Salafiyah Syafiiyah',
      desa: 'Ambulu',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-70002409',
      npsn: '70002409',
      kodeUnik: 'WHD-7002',
      nama: 'SD Wahidiyah',
      namaLengkap: 'Satuan Pendidikan SD Wahidiyah',
      desa: 'Ambulu',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524971',
      npsn: '20524971',
      kodeUnik: 'AMB01-4971',
      nama: 'SDN Ambulu 01',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Ambulu 01',
      desa: 'Ambulu',
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
      id: 'SCH-20524975',
      npsn: '20524975',
      kodeUnik: 'AMB03-4975',
      nama: 'SDN Ambulu 03',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Ambulu 03',
      desa: 'Ambulu',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524974',
      npsn: '20524974',
      kodeUnik: 'AMB04-4974',
      nama: 'SDN Ambulu 04',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Ambulu 04',
      desa: 'Ambulu',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524957',
      npsn: '20524957',
      kodeUnik: 'ADG01-4957',
      nama: 'SDN Andongsari 01',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Andongsari 01',
      desa: 'Andongsari',
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
      id: 'SCH-20524959',
      npsn: '20524959',
      kodeUnik: 'ADG03-4959',
      nama: 'SDN Andongsari 03',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Andongsari 03',
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
      id: 'SCH-20524961',
      npsn: '20524961',
      kodeUnik: 'ADG05-4961',
      nama: 'SDN Andongsari 05',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Andongsari 05',
      desa: 'Andongsari',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524963',
      npsn: '20524963',
      kodeUnik: 'ADG06-4963',
      nama: 'SDN Andongsari 06',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Andongsari 06',
      desa: 'Andongsari',
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
      id: 'SCH-20524831',
      npsn: '20524831',
      kodeUnik: 'KRN02-4831',
      nama: 'SDN Karanganyar 02',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Karanganyar 02',
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
      id: 'SCH-20524832',
      npsn: '20524832',
      kodeUnik: 'KRN04-4832',
      nama: 'SDN Karanganyar 04',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Karanganyar 04',
      desa: 'Karanganyar',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524833',
      npsn: '20524833',
      kodeUnik: 'KRN05-4833',
      nama: 'SDN Karanganyar 05',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Karanganyar 05',
      desa: 'Karanganyar',
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
      id: 'SCH-20523265',
      npsn: '20523265',
      kodeUnik: 'PNT02-3265',
      nama: 'SDN Pontang 02',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Pontang 02',
      desa: 'Pontang',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20523266',
      npsn: '20523266',
      kodeUnik: 'PNT03-3266',
      nama: 'SDN Pontang 03',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Pontang 03',
      desa: 'Pontang',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20523267',
      npsn: '20523267',
      kodeUnik: 'PNT04-3267',
      nama: 'SDN Pontang 04',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Pontang 04',
      desa: 'Pontang',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20523268',
      npsn: '20523268',
      kodeUnik: 'PNT05-3268',
      nama: 'SDN Pontang 05',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Pontang 05',
      desa: 'Pontang',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20523185',
      npsn: '20523185',
      kodeUnik: 'SBR01-8312',
      nama: 'SDN Sabrang 01',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sabrang 01',
      desa: 'Sabrang',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20523202',
      npsn: '20523202',
      kodeUnik: 'SBR02-3202',
      nama: 'SDN Sabrang 02',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sabrang 02',
      desa: 'Sabrang',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20523201',
      npsn: '20523201',
      kodeUnik: 'SBR03-3201',
      nama: 'SDN Sabrang 03',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sabrang 03',
      desa: 'Sabrang',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20523203',
      npsn: '20523203',
      kodeUnik: 'SBR04-3203',
      nama: 'SDN Sabrang 04',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sabrang 04',
      desa: 'Sabrang',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20523204',
      npsn: '20523204',
      kodeUnik: 'SBR05-3204',
      nama: 'SDN Sabrang 05',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sabrang 05',
      desa: 'Sabrang',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20523205',
      npsn: '20523205',
      kodeUnik: 'SBR06-3205',
      nama: 'SDN Sabrang 06',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sabrang 06',
      desa: 'Sabrang',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524062',
      npsn: '20524062',
      kodeUnik: 'SMB01-4062',
      nama: 'SDN Sumberejo 01',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sumberejo 01',
      desa: 'Sumberejo',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524071',
      npsn: '20524071',
      kodeUnik: 'SMB02-4071',
      nama: 'SDN Sumberejo 02',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sumberejo 02',
      desa: 'Sumberejo',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524061',
      npsn: '20524061',
      kodeUnik: 'SMB03-4061',
      nama: 'SDN Sumberejo 03',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sumberejo 03',
      desa: 'Sumberejo',
      status: 'Terverifikasi'
    },
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
      id: 'SCH-20551780',
      npsn: '20551780',
      kodeUnik: 'SMB06-1780',
      nama: 'SDN Sumberejo 06',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sumberejo 06',
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
      id: 'SCH-20524063',
      npsn: '20524063',
      kodeUnik: 'SMB08-4063',
      nama: 'SDN Sumberejo 08',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sumberejo 08',
      desa: 'Sumberejo',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524064',
      npsn: '20524064',
      kodeUnik: 'SMB09-4064',
      nama: 'SDN Sumberejo 09',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sumberejo 09',
      desa: 'Sumberejo',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20524065',
      npsn: '20524065',
      kodeUnik: 'SMB10-4065',
      nama: 'SDN Sumberejo 10',
      namaLengkap: 'UPTD Satuan Pendidikan SDN Sumberejo 10',
      desa: 'Sumberejo',
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
      id: 'SCH-20525035',
      npsn: '20525035',
      kodeUnik: 'IBU-2503',
      nama: 'SDS Islam Bustanul Ulum',
      namaLengkap: 'Satuan Pendidikan SDS Islam Bustanul Ulum',
      desa: 'Ambulu',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20554042',
      npsn: '20554042',
      kodeUnik: 'ATQ-5404',
      nama: 'SDS Islam Terpadu At Taqwa',
      namaLengkap: 'Satuan Pendidikan SDS Islam Terpadu At Taqwa',
      desa: 'Ambulu',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20525014',
      npsn: '20525014',
      kodeUnik: 'PHL-2501',
      nama: 'SDS Kristen Philia',
      namaLengkap: 'Satuan Pendidikan SDS Kristen Philia',
      desa: 'Ambulu',
      status: 'Terverifikasi'
    },
    {
      id: 'SCH-20554179',
      npsn: '20554179',
      kodeUnik: 'MHD-5417',
      nama: 'SDS Muhammadiyah',
      namaLengkap: 'Satuan Pendidikan SDS Muhammadiyah',
      desa: 'Ambulu',
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
