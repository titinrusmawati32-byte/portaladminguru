/**
 * ============================================================
 * SiGuru SD - Administrasi Guru Kelas Digital
 * Backend Google Apps Script (JSON REST API)
 * ============================================================
 * Deskripsi: API backend untuk aplikasi SiGuru SD.
 *            Menyediakan endpoint GET dan POST untuk operasi CRUD
 *            data administrasi guru kelas SD.
 * ============================================================
 */

// ============================================================
// KONSTANTA APLIKASI
// ============================================================
const APP_TITLE = 'SiGuru SD - Administrasi Guru Kelas Digital';
const DRIVE_FOLDER_NAME = 'SiGuru SD - Bank Perangkat Ajar';

// ============================================================
// ENDPOINT UTAMA: doGet & doPost
// ============================================================

/**
 * Menangani request GET dengan parameter query `action`.
 * @param {Object} e - Event object dari Apps Script
 * @returns {ContentService.TextOutput} - Response JSON
 */
function doGet(e) {
  var result;
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

    switch (action) {
      case 'login':
        var username = e.parameter.username || '';
        var password = e.parameter.password || '';
        result = verifyLogin(username, password);
        break;

      case 'getAllData':
        result = getAllInitialData();
        break;

      default:
        result = { success: true, message: 'SiGuru SD API aktif' };
        break;
    }
  } catch (err) {
    result = { success: false, message: 'Error pada doGet: ' + err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Menangani request POST dengan JSON body berisi `action` dan `payload`.
 * @param {Object} e - Event object dari Apps Script
 * @returns {ContentService.TextOutput} - Response JSON
 */
function doPost(e) {
  var result;
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || '';
    var payload = body.payload || {};

    switch (action) {
      case 'uploadPerangkat':
        result = uploadPerangkatBackend(payload);
        break;

      case 'addPerangkat':
        result = addPerangkatBackend(payload);
        break;

      case 'addSiswa':
        result = addSiswaBackend(payload);
        break;

      case 'updatePresensi':
        result = updatePresensiBackend(payload);
        break;

      case 'addNilai':
        result = addNilaiBackend(payload);
        break;

      case 'addJurnal':
        result = addJurnalBackend(payload);
        break;

      case 'addCatatan':
        result = addCatatanBackend(payload);
        break;

      case 'deleteRow':
        result = deleteRowByIdBackend(payload.sheetName, payload.id);
        break;

      default:
        result = { success: false, message: 'Action tidak dikenali: ' + action };
        break;
    }
  } catch (err) {
    result = { success: false, message: 'Error pada doPost: ' + err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// HELPER: DATABASE & DRIVE
// ============================================================

/**
 * Mendapatkan referensi spreadsheet aktif sebagai database.
 * @returns {SpreadsheetApp.Spreadsheet}
 */
function getActiveDb() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Membuat atau mendapatkan folder Google Drive untuk upload berkas.
 * Mengatur sharing ke ANYONE_WITH_LINK dengan akses VIEW.
 * @returns {DriveApp.Folder}
 */
function getOrCreateUploadFolder() {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  var folder;

  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    // Buat folder baru jika belum ada
    folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  }

  // Atur akses publik: siapa saja dengan link bisa melihat
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return folder;
}

// ============================================================
// SETUP DATABASE
// ============================================================

/**
 * Membuat 7 sheet dengan skema kolom yang ditentukan.
 * Menyertakan data default untuk Users, Perangkat_Ajar, Data_Siswa, dan Presensi.
 * Jalankan fungsi ini sekali untuk inisialisasi database.
 */
function setupDatabase() {
  var ss = getActiveDb();

  // Definisi skema setiap sheet: nama sheet -> array header kolom
  var schemas = {
    'Users': ['ID_User', 'Username', 'Password', 'Nama_Lengkap', 'NIP', 'Role', 'Kelas_Ampuan'],
    'Data_Siswa': ['ID_Siswa', 'NIS', 'NISN', 'Nama_Siswa', 'JK', 'TTL', 'Nama_Wali', 'No_HP_Wali', 'Status'],
    'Presensi': ['ID_Presensi', 'Tanggal', 'ID_Siswa', 'Nama_Siswa', 'Status_Hadir', 'Keterangan', 'Waktu_Input'],
    'Nilai_Siswa': ['ID_Nilai', 'ID_Siswa', 'Nama_Siswa', 'Mata_Pelajaran', 'Lingkup_Materi', 'Nilai_Formatif', 'Nilai_Sumatif', 'Nilai_SAS', 'Nilai_Akhir'],
    'Jurnal_Mengajar': ['ID_Jurnal', 'Tanggal', 'Jam_Ke', 'Mata_Pelajaran', 'Topik_Materi', 'Kegiatan_Pembelajaran', 'Siswa_Tidak_Hadir', 'Catatan_Refleksi'],
    'Perangkat_Ajar': ['ID_Dokumen', 'Judul_Dokumen', 'Mata_Pelajaran', 'Jenis', 'Format_Tipe', 'Nama_File', 'Ukuran_File', 'Sumber', 'Durasi_JP', 'Link_Berkas', 'Deskripsi', 'Uploader', 'Waktu_Upload'],
    'Sikap_Inventaris': ['ID_Catatan', 'Tanggal', 'Kategori', 'Subjek_Nama', 'Deskripsi', 'Tindak_Lanjut_Kondisi']
  };

  // Warna header: navy background, teks putih, bold
  var headerBgColor = '#172554';
  var headerFontColor = '#FFFFFF';

  var sheetNames = Object.keys(schemas);

  for (var i = 0; i < sheetNames.length; i++) {
    var sheetName = sheetNames[i];
    var headers = schemas[sheetName];
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      // Buat sheet baru
      sheet = ss.insertSheet(sheetName);
    } else {
      // Bersihkan sheet yang sudah ada
      sheet.clearContents();
      sheet.clearFormats();
    }

    // Tulis header di baris 1
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground(headerBgColor);
    headerRange.setFontColor(headerFontColor);
    headerRange.setFontWeight('bold');

    // Freeze baris pertama (header)
    sheet.setFrozenRows(1);
  }

  // --- Data Default: Users ---
  var usersSheet = ss.getSheetByName('Users');
  var defaultUsers = [
    ['USR-01', 'admin', 'admin2026', 'Budi Santoso S.Pd.SD.', '19880412 201402 1 002', 'Admin', 'Kelas IV-A SD'],
    ['USR-02', 'peserta', 'edudigital', 'Dewi Rahmawati S.Pd.', '19920516 201903 2 004', 'Peserta', 'Kelas IV-A SD']
  ];
  usersSheet.getRange(2, 1, defaultUsers.length, defaultUsers[0].length).setValues(defaultUsers);

  // --- Data Default: Perangkat_Ajar (3 dokumen contoh) ---
  var perangkatSheet = ss.getSheetByName('Perangkat_Ajar');
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  var defaultPerangkat = [
    ['DOK-001', 'Modul Ajar Matematika Kelas IV - Pecahan', 'Matematika', 'Modul Ajar', 'Word', 'modul_pecahan_kls4.docx', '2.3 MB', 'Guru', '4 JP', '', 'Modul ajar lengkap materi pecahan untuk kelas IV semester 1', 'Budi Santoso S.Pd.SD.', now],
    ['DOK-002', 'RPP Bahasa Indonesia - Teks Narasi', 'Bahasa Indonesia', 'RPP', 'PDF', 'rpp_teks_narasi.pdf', '1.1 MB', 'Guru', '2 JP', '', 'Rencana pelaksanaan pembelajaran teks narasi kelas IV', 'Budi Santoso S.Pd.SD.', now],
    ['DOK-003', 'Bank Soal IPA - Siklus Air', 'IPA', 'Bank Soal', 'Excel', 'bank_soal_siklus_air.xlsx', '856 KB', 'Guru', '2 JP', '', 'Kumpulan soal formatif dan sumatif materi siklus air', 'Dewi Rahmawati S.Pd.', now]
  ];
  perangkatSheet.getRange(2, 1, defaultPerangkat.length, defaultPerangkat[0].length).setValues(defaultPerangkat);

  // --- Data Default: Data_Siswa (2 siswa) ---
  var siswaSheet = ss.getSheetByName('Data_Siswa');
  var defaultSiswa = [
    ['SIS-001', '2401', '0081234567', 'Ahmad Rizky Pratama', 'L', '2015-06-12', 'Hendra Pratama', '081234567890', 'Aktif'],
    ['SIS-002', '2402', '0081234568', 'Siti Aisyah Putri', 'P', '2015-09-23', 'Ratna Dewi', '082345678901', 'Aktif']
  ];
  siswaSheet.getRange(2, 1, defaultSiswa.length, defaultSiswa[0].length).setValues(defaultSiswa);

  // --- Data Default: Presensi (2 record) ---
  var presensiSheet = ss.getSheetByName('Presensi');
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var defaultPresensi = [
    ['PRS-001', today, 'SIS-001', 'Ahmad Rizky Pratama', 'Hadir', '', now],
    ['PRS-002', today, 'SIS-002', 'Siti Aisyah Putri', 'Hadir', '', now]
  ];
  presensiSheet.getRange(2, 1, defaultPresensi.length, defaultPresensi[0].length).setValues(defaultPresensi);

  // Hapus sheet default "Sheet1" jika ada dan bukan satu-satunya
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  SpreadsheetApp.flush();
}

// ============================================================
// AUTENTIKASI
// ============================================================

/**
 * Verifikasi login berdasarkan username dan password.
 * Mengecek sheet Users dan juga fallback hardcoded.
 * @param {string} username - Username yang dimasukkan
 * @param {string} password - Password yang dimasukkan
 * @returns {Object} - Hasil verifikasi {success, user/message}
 */
function verifyLogin(username, password) {
  if (!username || !password) {
    return { success: false, message: 'Username dan password wajib diisi.' };
  }

  var ss = getActiveDb();
  var sheet = ss.getSheetByName('Users');

  // Cek dari sheet Users terlebih dahulu
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Kolom: ID_User(0), Username(1), Password(2), Nama_Lengkap(3), NIP(4), Role(5), Kelas_Ampuan(6)
      if (String(row[1]).trim().toLowerCase() === username.trim().toLowerCase() &&
          String(row[2]).trim() === password.trim()) {
        return {
          success: true,
          user: {
            id: row[0],
            username: String(row[1]).trim(),
            nama: String(row[3]).trim(),
            nip: String(row[4]).trim(),
            role: String(row[5]).trim(),
            kelas: String(row[6]).trim()
          }
        };
      }
    }
  }

  // Fallback hardcoded: akun default yang selalu bisa login
  var hardcodedAccounts = [
    {
      username: 'admin', password: 'admin2026',
      id: 'USR-01', nama: 'Budi Santoso S.Pd.SD.', nip: '19880412 201402 1 002', role: 'Admin', kelas: 'Kelas IV-A SD'
    },
    {
      username: 'admin', password: 'edudigital',
      id: 'USR-01', nama: 'Budi Santoso S.Pd.SD.', nip: '19880412 201402 1 002', role: 'Admin', kelas: 'Kelas IV-A SD'
    },
    {
      username: 'peserta', password: 'edudigital',
      id: 'USR-02', nama: 'Dewi Rahmawati S.Pd.', nip: '19920516 201903 2 004', role: 'Peserta', kelas: 'Kelas IV-A SD'
    },
    {
      username: 'peserta', password: 'admin2026',
      id: 'USR-02', nama: 'Dewi Rahmawati S.Pd.', nip: '19920516 201903 2 004', role: 'Peserta', kelas: 'Kelas IV-A SD'
    }
  ];

  for (var j = 0; j < hardcodedAccounts.length; j++) {
    var acc = hardcodedAccounts[j];
    if (username.trim().toLowerCase() === acc.username && password.trim() === acc.password) {
      return {
        success: true,
        user: {
          id: acc.id,
          username: acc.username,
          nama: acc.nama,
          nip: acc.nip,
          role: acc.role,
          kelas: acc.kelas
        }
      };
    }
  }

  return { success: false, message: 'Username atau password salah. Silakan coba lagi.' };
}

// ============================================================
// AMBIL SEMUA DATA AWAL
// ============================================================

/**
 * Mengambil semua data dari seluruh sheet untuk inisialisasi frontend.
 * @returns {Object} - Data lengkap semua sheet
 */
function getAllInitialData() {
  try {
    var ss = getActiveDb();

    // Profil Kelas (statis/dari sheet Users baris pertama)
    var usersSheet = ss.getSheetByName('Users');
    var waliKelas = 'Budi Santoso S.Pd.SD.';
    var nipWali = '19880412 201402 1 002';
    if (usersSheet) {
      var uData = usersSheet.getDataRange().getValues();
      if (uData.length > 1) {
        waliKelas = String(uData[1][3]).trim();
        nipWali = String(uData[1][4]).trim();
      }
    }

    var profilKelas = {
      namaSekolah: 'SD Negeri Cerdas Bangsa',
      kelas: 'Kelas IV-A',
      waliKelas: waliKelas,
      nipWali: nipWali,
      tahunAjaran: '2025/2026 - Semester 1'
    };

    // Ambil data siswa
    var siswaRows = getSheetRows(ss, 'Data_Siswa');
    var siswa = siswaRows.map(function(r) {
      return {
        id: r[0], nis: r[1], nisn: r[2], nama: r[3], jk: r[4],
        ttl: formatDateStr(r[5]), namaWali: r[6], noHpWali: r[7], status: r[8]
      };
    });

    // Ambil data presensi
    var presensiRows = getSheetRows(ss, 'Presensi');
    var presensi = presensiRows.map(function(r) {
      return {
        id: r[0], tanggal: formatDateStr(r[1]), idSiswa: r[2], namaSiswa: r[3],
        statusHadir: r[4], keterangan: r[5], waktuInput: String(r[6])
      };
    });

    // Ambil data nilai
    var nilaiRows = getSheetRows(ss, 'Nilai_Siswa');
    var nilai = nilaiRows.map(function(r) {
      return {
        id: r[0], idSiswa: r[1], namaSiswa: r[2], mapel: r[3],
        lingkupMateri: r[4], nilaiFormatif: r[5], nilaiSumatif: r[6],
        nilaiSAS: r[7], nilaiAkhir: r[8]
      };
    });

    // Ambil data jurnal mengajar
    var jurnalRows = getSheetRows(ss, 'Jurnal_Mengajar');
    var jurnal = jurnalRows.map(function(r) {
      return {
        id: r[0], tanggal: formatDateStr(r[1]), jamKe: r[2], mapel: r[3],
        topikMateri: r[4], kegiatanPembelajaran: r[5], siswaTidakHadir: r[6],
        catatanRefleksi: r[7]
      };
    });

    // Ambil data perangkat ajar (menggunakan pembaca adaptif)
    var perangkatRaw = getPerangkatRows(ss);
    var perangkat = perangkatRaw.map(function(r) {
      return {
        id: r.id, judul: r.judul, mapel: r.mapel, jenis: r.jenis,
        formatTipe: r.formatTipe, namaFile: r.namaFile, ukuranFile: r.ukuranFile,
        sumber: r.sumber, durasiJP: r.durasiJP, linkBerkas: r.linkBerkas,
        deskripsi: r.deskripsi, uploader: r.uploader, waktuUpload: r.waktuUpload
      };
    });

    // Jadwal pelajaran hardcoded (6 hari)
    var jadwal = [
      {
        hari: 'Senin',
        items: [
          { jam: '07:00 - 08:10', mapel: 'Upacara Bendera' },
          { jam: '08:10 - 09:20', mapel: 'Matematika' },
          { jam: '09:20 - 09:50', mapel: 'Istirahat' },
          { jam: '09:50 - 11:00', mapel: 'Bahasa Indonesia' },
          { jam: '11:00 - 12:10', mapel: 'PJOK' }
        ]
      },
      {
        hari: 'Selasa',
        items: [
          { jam: '07:00 - 08:10', mapel: 'Pendidikan Agama' },
          { jam: '08:10 - 09:20', mapel: 'Matematika' },
          { jam: '09:20 - 09:50', mapel: 'Istirahat' },
          { jam: '09:50 - 11:00', mapel: 'IPA' },
          { jam: '11:00 - 12:10', mapel: 'Seni Budaya' }
        ]
      },
      {
        hari: 'Rabu',
        items: [
          { jam: '07:00 - 08:10', mapel: 'Bahasa Indonesia' },
          { jam: '08:10 - 09:20', mapel: 'IPS' },
          { jam: '09:20 - 09:50', mapel: 'Istirahat' },
          { jam: '09:50 - 11:00', mapel: 'Matematika' },
          { jam: '11:00 - 12:10', mapel: 'PPKn' }
        ]
      },
      {
        hari: 'Kamis',
        items: [
          { jam: '07:00 - 08:10', mapel: 'IPA' },
          { jam: '08:10 - 09:20', mapel: 'Bahasa Inggris' },
          { jam: '09:20 - 09:50', mapel: 'Istirahat' },
          { jam: '09:50 - 11:00', mapel: 'Matematika' },
          { jam: '11:00 - 12:10', mapel: 'Bahasa Indonesia' }
        ]
      },
      {
        hari: 'Jumat',
        items: [
          { jam: '07:00 - 08:10', mapel: 'Senam / Olahraga' },
          { jam: '08:10 - 09:20', mapel: 'Bahasa Daerah' },
          { jam: '09:20 - 09:50', mapel: 'Istirahat' },
          { jam: '09:50 - 11:00', mapel: 'Seni Budaya' }
        ]
      },
      {
        hari: 'Sabtu',
        items: [
          { jam: '07:00 - 08:10', mapel: 'Pramuka' },
          { jam: '08:10 - 09:20', mapel: 'Pengembangan Diri' },
          { jam: '09:20 - 09:50', mapel: 'Istirahat' },
          { jam: '09:50 - 11:00', mapel: 'Literasi & Numerasi' }
        ]
      }
    ];

    // Ambil data sikap & inventaris
    var sikapRows = getSheetRows(ss, 'Sikap_Inventaris');
    var sikapInventaris = sikapRows.map(function(r) {
      return {
        id: r[0], tanggal: formatDateStr(r[1]), kategori: r[2],
        subjekNama: r[3], deskripsi: r[4], tindakLanjutKondisi: r[5]
      };
    });

    return {
      success: true,
      data: {
        profilKelas: profilKelas,
        siswa: siswa,
        presensi: presensi,
        nilai: nilai,
        jurnal: jurnal,
        perangkat: perangkat,
        jadwal: jadwal,
        sikapInventaris: sikapInventaris
      }
    };

  } catch (err) {
    return { success: false, message: 'Gagal mengambil data: ' + err.message };
  }
}

// ============================================================
// UPLOAD PERANGKAT AJAR (DENGAN FILE)
// ============================================================

/**
 * Upload berkas perangkat ajar ke Google Drive dan simpan metadata ke sheet.
 * @param {Object} payload - Data upload
 * @param {string} payload.namaFile - Nama file asli
 * @param {string} payload.mimeType - MIME type file
 * @param {string} payload.base64Data - Data file dalam base64
 * @param {string} payload.judul - Judul dokumen
 * @param {string} payload.mapel - Mata pelajaran
 * @param {string} payload.jenis - Jenis dokumen (RPP, Modul Ajar, dll.)
 * @param {string} payload.formatTipe - Format/tipe file
 * @param {string} payload.durasi - Durasi JP
 * @param {string} payload.deskripsi - Deskripsi dokumen
 * @param {string} payload.uploader - Nama pengunggah
 * @returns {Object} - Hasil upload
 */
function uploadPerangkatBackend(payload) {
  try {
    var namaFile = payload.namaFile || 'file_tanpa_nama';
    var mimeType = payload.mimeType || 'application/octet-stream';
    var base64Data = payload.base64Data || '';
    var judul = payload.judul || namaFile;
    var mapel = payload.mapel || '';
    var jenis = payload.jenis || '';
    var formatTipe = payload.formatTipe || '';
    var durasi = payload.durasi || '';
    var deskripsi = payload.deskripsi || '';
    var uploader = payload.uploader || 'Unknown';

    // Decode base64 ke blob
    var decodedData = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decodedData, mimeType, namaFile);

    // Buat file di folder Drive
    var folder = getOrCreateUploadFolder();
    var file = folder.createFile(blob);

    // Atur sharing: siapa saja dengan link bisa melihat
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileUrl = file.getUrl();
    var fileId = file.getId();
    var downloadUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;
    var ukuranFile = _formatFileSize(file.getSize());

    // Generate ID dokumen
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Perangkat_Ajar');
    var newId = _generateId(sheet, 'DOK');

    var waktuUpload = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    // Simpan metadata ke sheet Perangkat_Ajar
    var rowData = [
      newId, judul, mapel, jenis, formatTipe, namaFile,
      ukuranFile, 'Upload', durasi, fileUrl, deskripsi, uploader, waktuUpload
    ];
    sheet.appendRow(rowData);

    return {
      success: true,
      fileUrl: fileUrl,
      downloadUrl: downloadUrl,
      fileId: fileId,
      id: newId,
      namaFile: namaFile,
      message: 'Berkas "' + namaFile + '" berhasil diunggah.'
    };

  } catch (err) {
    return { success: false, message: 'Gagal mengunggah berkas: ' + err.message };
  }
}

// ============================================================
// CRUD: PERANGKAT AJAR (TANPA FILE)
// ============================================================

/**
 * Menambah metadata perangkat ajar tanpa upload file.
 * @param {Object} d - Data perangkat
 * @returns {Object} - Hasil operasi
 */
function addPerangkatBackend(d) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Perangkat_Ajar');
    var newId = _generateId(sheet, 'DOK');
    var waktuUpload = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    var rowData = [
      newId,
      d.judul || '',
      d.mapel || '',
      d.jenis || '',
      d.formatTipe || '',
      d.namaFile || '',
      d.ukuranFile || '',
      d.sumber || 'Manual',
      d.durasi || '',
      d.linkBerkas || '',
      d.deskripsi || '',
      d.uploader || '',
      waktuUpload
    ];

    sheet.appendRow(rowData);

    return { success: true, id: newId, message: 'Perangkat ajar berhasil ditambahkan.' };
  } catch (err) {
    return { success: false, message: 'Gagal menambah perangkat: ' + err.message };
  }
}

// ============================================================
// CRUD: DATA SISWA
// ============================================================

/**
 * Menambah data siswa baru beserta presensi default (Hadir).
 * @param {Object} s - Data siswa
 * @returns {Object} - Hasil operasi
 */
function addSiswaBackend(s) {
  try {
    var ss = getActiveDb();
    var siswaSheet = ss.getSheetByName('Data_Siswa');
    var newId = _generateId(siswaSheet, 'SIS');

    var rowData = [
      newId,
      s.nis || '',
      s.nisn || '',
      s.nama || '',
      s.jk || '',
      s.ttl || '',
      s.namaWali || '',
      s.noHpWali || '',
      s.status || 'Aktif'
    ];

    siswaSheet.appendRow(rowData);

    // Tambahkan presensi default untuk hari ini
    var presensiSheet = ss.getSheetByName('Presensi');
    var presensiId = _generateId(presensiSheet, 'PRS');
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    var presensiRow = [
      presensiId, today, newId, s.nama || '', 'Hadir', '', now
    ];
    presensiSheet.appendRow(presensiRow);

    return { success: true, id: newId, message: 'Data siswa "' + (s.nama || '') + '" berhasil ditambahkan.' };
  } catch (err) {
    return { success: false, message: 'Gagal menambah siswa: ' + err.message };
  }
}

// ============================================================
// CRUD: PRESENSI
// ============================================================

/**
 * Memperbarui atau menambah data presensi siswa.
 * Jika presensi untuk tanggal & siswa sudah ada, akan diupdate.
 * Jika belum ada, akan ditambahkan baru.
 * @param {Object} p - Data presensi
 * @returns {Object} - Hasil operasi
 */
function updatePresensiBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Presensi');
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    var tanggal = p.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    var data = sheet.getDataRange().getValues();
    var found = false;

    // Cari apakah presensi untuk tanggal & siswa ini sudah ada
    for (var i = 1; i < data.length; i++) {
      var rowTanggal = formatDateStr(data[i][1]);
      var rowIdSiswa = String(data[i][2]).trim();

      if (rowTanggal === tanggal && rowIdSiswa === (p.idSiswa || '').trim()) {
        // Update baris yang ada
        sheet.getRange(i + 1, 4).setValue(p.namaSiswa || data[i][3]); // Nama_Siswa
        sheet.getRange(i + 1, 5).setValue(p.statusHadir || 'Hadir');  // Status_Hadir
        sheet.getRange(i + 1, 6).setValue(p.keterangan || '');        // Keterangan
        sheet.getRange(i + 1, 7).setValue(now);                        // Waktu_Input
        found = true;
        break;
      }
    }

    // Jika belum ada, tambah baris baru
    if (!found) {
      var newId = _generateId(sheet, 'PRS');
      var newRow = [
        newId,
        tanggal,
        p.idSiswa || '',
        p.namaSiswa || '',
        p.statusHadir || 'Hadir',
        p.keterangan || '',
        now
      ];
      sheet.appendRow(newRow);
    }

    return { success: true, message: 'Presensi berhasil diperbarui.' };
  } catch (err) {
    return { success: false, message: 'Gagal memperbarui presensi: ' + err.message };
  }
}

// ============================================================
// CRUD: NILAI SISWA
// ============================================================

/**
 * Menambah data nilai siswa dengan kalkulasi nilai akhir otomatis.
 * Nilai Akhir = rata-rata dari Formatif, Sumatif, dan SAS (yang diisi).
 * @param {Object} n - Data nilai
 * @returns {Object} - Hasil operasi
 */
function addNilaiBackend(n) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Nilai_Siswa');
    var newId = _generateId(sheet, 'NLI');

    // Hitung nilai akhir (rata-rata dari komponen yang terisi)
    var nilaiFormatif = parseFloat(n.nilaiFormatif) || 0;
    var nilaiSumatif = parseFloat(n.nilaiSumatif) || 0;
    var nilaiSAS = parseFloat(n.nilaiSAS) || 0;

    var jumlahKomponen = 0;
    var totalNilai = 0;

    if (n.nilaiFormatif !== '' && n.nilaiFormatif !== undefined && n.nilaiFormatif !== null) {
      totalNilai += nilaiFormatif;
      jumlahKomponen++;
    }
    if (n.nilaiSumatif !== '' && n.nilaiSumatif !== undefined && n.nilaiSumatif !== null) {
      totalNilai += nilaiSumatif;
      jumlahKomponen++;
    }
    if (n.nilaiSAS !== '' && n.nilaiSAS !== undefined && n.nilaiSAS !== null) {
      totalNilai += nilaiSAS;
      jumlahKomponen++;
    }

    var nilaiAkhir = jumlahKomponen > 0 ? Math.round((totalNilai / jumlahKomponen) * 100) / 100 : 0;

    var rowData = [
      newId,
      n.idSiswa || '',
      n.namaSiswa || '',
      n.mapel || '',
      n.lingkupMateri || '',
      nilaiFormatif,
      nilaiSumatif,
      nilaiSAS,
      nilaiAkhir
    ];

    sheet.appendRow(rowData);

    return { success: true, id: newId, nilaiAkhir: nilaiAkhir, message: 'Nilai berhasil ditambahkan.' };
  } catch (err) {
    return { success: false, message: 'Gagal menambah nilai: ' + err.message };
  }
}

// ============================================================
// CRUD: JURNAL MENGAJAR
// ============================================================

/**
 * Menambah entri jurnal mengajar.
 * @param {Object} j - Data jurnal
 * @returns {Object} - Hasil operasi
 */
function addJurnalBackend(j) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Jurnal_Mengajar');
    var newId = _generateId(sheet, 'JRN');

    var rowData = [
      newId,
      j.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      j.jamKe || '',
      j.mapel || '',
      j.topikMateri || '',
      j.kegiatanPembelajaran || '',
      j.siswaTidakHadir || '',
      j.catatanRefleksi || ''
    ];

    sheet.appendRow(rowData);

    return { success: true, id: newId, message: 'Jurnal mengajar berhasil ditambahkan.' };
  } catch (err) {
    return { success: false, message: 'Gagal menambah jurnal: ' + err.message };
  }
}

// ============================================================
// CRUD: CATATAN SIKAP & INVENTARIS
// ============================================================

/**
 * Menambah catatan sikap siswa atau inventaris kelas.
 * @param {Object} c - Data catatan
 * @returns {Object} - Hasil operasi
 */
function addCatatanBackend(c) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Sikap_Inventaris');
    var newId = _generateId(sheet, 'CAT');

    var rowData = [
      newId,
      c.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      c.kategori || '',
      c.subjekNama || '',
      c.deskripsi || '',
      c.tindakLanjutKondisi || ''
    ];

    sheet.appendRow(rowData);

    return { success: true, id: newId, message: 'Catatan berhasil ditambahkan.' };
  } catch (err) {
    return { success: false, message: 'Gagal menambah catatan: ' + err.message };
  }
}

// ============================================================
// CRUD: HAPUS BARIS BERDASARKAN ID
// ============================================================

/**
 * Menghapus baris dari sheet berdasarkan ID di kolom A.
 * @param {string} sheetName - Nama sheet target
 * @param {string} idVal - Nilai ID yang akan dihapus
 * @returns {Object} - Hasil operasi
 */
function deleteRowByIdBackend(sheetName, idVal) {
  try {
    if (!sheetName || !idVal) {
      return { success: false, message: 'Nama sheet dan ID wajib diisi.' };
    }

    var ss = getActiveDb();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return { success: false, message: 'Sheet "' + sheetName + '" tidak ditemukan.' };
    }

    var data = sheet.getDataRange().getValues();
    var deleted = false;

    // Cari dari bawah ke atas agar index tidak bergeser saat hapus
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]).trim() === String(idVal).trim()) {
        sheet.deleteRow(i + 1); // +1 karena array 0-based, sheet 1-based
        deleted = true;
        break;
      }
    }

    if (deleted) {
      return { success: true, message: 'Data dengan ID "' + idVal + '" berhasil dihapus dari ' + sheetName + '.' };
    } else {
      return { success: false, message: 'ID "' + idVal + '" tidak ditemukan di sheet ' + sheetName + '.' };
    }
  } catch (err) {
    return { success: false, message: 'Gagal menghapus data: ' + err.message };
  }
}

// ============================================================
// HELPER: BACA DATA SHEET
// ============================================================

/**
 * Membaca semua baris data dari sheet (tanpa header).
 * @param {SpreadsheetApp.Spreadsheet} ss - Referensi spreadsheet
 * @param {string} sheetName - Nama sheet
 * @returns {Array} - Array 2D berisi data baris
 */
function getSheetRows(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Hanya header atau kosong

  // Kembalikan semua baris kecuali header (baris pertama)
  return data.slice(1);
}

/**
 * Memformat nilai tanggal menjadi string yyyy-MM-dd.
 * Mendukung objek Date dan string.
 * @param {*} val - Nilai yang akan diformat
 * @returns {string} - Tanggal dalam format yyyy-MM-dd atau string asli
 */
function formatDateStr(val) {
  if (!val) return '';

  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return String(val).trim();
}

/**
 * Pembaca adaptif untuk sheet Perangkat_Ajar.
 * Mendeteksi posisi kolom berdasarkan header sehingga tetap berfungsi
 * meskipun urutan kolom berubah.
 * @param {SpreadsheetApp.Spreadsheet} ss - Referensi spreadsheet
 * @returns {Array} - Array objek perangkat ajar
 */
function getPerangkatRows(ss) {
  var sheet = ss.getSheetByName('Perangkat_Ajar');
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];

  // Peta indeks kolom berdasarkan nama header (case-insensitive)
  var colMap = {};
  for (var c = 0; c < headers.length; c++) {
    colMap[String(headers[c]).trim().toLowerCase()] = c;
  }

  // Fungsi helper untuk mendapatkan nilai berdasarkan nama kolom
  function getVal(row, colName) {
    var idx = colMap[colName.toLowerCase()];
    if (idx !== undefined && idx < row.length) {
      return row[idx];
    }
    return '';
  }

  var results = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    results.push({
      id: getVal(row, 'id_dokumen') || getVal(row, 'id'),
      judul: getVal(row, 'judul_dokumen') || getVal(row, 'judul'),
      mapel: getVal(row, 'mata_pelajaran') || getVal(row, 'mapel'),
      jenis: getVal(row, 'jenis'),
      formatTipe: getVal(row, 'format_tipe') || getVal(row, 'format'),
      namaFile: getVal(row, 'nama_file'),
      ukuranFile: getVal(row, 'ukuran_file'),
      sumber: getVal(row, 'sumber'),
      durasiJP: getVal(row, 'durasi_jp') || getVal(row, 'durasi'),
      linkBerkas: getVal(row, 'link_berkas') || getVal(row, 'link'),
      deskripsi: getVal(row, 'deskripsi'),
      uploader: getVal(row, 'uploader'),
      waktuUpload: String(getVal(row, 'waktu_upload') || '')
    });
  }

  return results;
}

// ============================================================
// UPGRADE SKEMA DATABASE
// ============================================================

/**
 * Memastikan sheet Perangkat_Ajar memiliki semua kolom yang diperlukan.
 * Menambahkan kolom yang hilang di akhir header.
 * Jalankan fungsi ini jika struktur sheet berubah.
 */
function upgradeDatabaseSchema() {
  var ss = getActiveDb();
  var sheet = ss.getSheetByName('Perangkat_Ajar');

  if (!sheet) {
    // Jika sheet belum ada, jalankan setupDatabase
    setupDatabase();
    return;
  }

  // Kolom yang diperlukan untuk Perangkat_Ajar
  var requiredColumns = [
    'ID_Dokumen', 'Judul_Dokumen', 'Mata_Pelajaran', 'Jenis', 'Format_Tipe',
    'Nama_File', 'Ukuran_File', 'Sumber', 'Durasi_JP', 'Link_Berkas',
    'Deskripsi', 'Uploader', 'Waktu_Upload'
  ];

  var data = sheet.getDataRange().getValues();
  var currentHeaders = data[0] || [];

  // Normalisasi header yang ada untuk perbandingan
  var currentHeadersLower = currentHeaders.map(function(h) {
    return String(h).trim().toLowerCase();
  });

  var headerBgColor = '#172554';
  var headerFontColor = '#FFFFFF';

  // Cek dan tambahkan kolom yang hilang
  var addedColumns = [];
  for (var i = 0; i < requiredColumns.length; i++) {
    var colName = requiredColumns[i];
    if (currentHeadersLower.indexOf(colName.toLowerCase()) === -1) {
      // Kolom belum ada, tambahkan di akhir
      var nextCol = currentHeaders.length + addedColumns.length + 1;
      var headerCell = sheet.getRange(1, nextCol);
      headerCell.setValue(colName);
      headerCell.setBackground(headerBgColor);
      headerCell.setFontColor(headerFontColor);
      headerCell.setFontWeight('bold');
      addedColumns.push(colName);
    }
  }

  if (addedColumns.length > 0) {
    SpreadsheetApp.flush();
  }
}

// ============================================================
// HELPER: INTERNAL (PRIVATE)
// ============================================================

/**
 * Generate ID unik berdasarkan prefix dan jumlah data di sheet.
 * Format: PREFIX-XXX (contoh: SIS-003, DOK-012)
 * @param {SpreadsheetApp.Sheet} sheet - Sheet referensi
 * @param {string} prefix - Prefix ID (SIS, DOK, PRS, dll.)
 * @returns {string} - ID unik yang dihasilkan
 */
function _generateId(sheet, prefix) {
  var lastRow = sheet.getLastRow();
  var nextNum = lastRow; // lastRow sudah termasuk header, jadi langsung jadi nomor urut berikutnya

  // Pastikan ID unik dengan cek existing
  var existingIds = {};
  if (lastRow > 1) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      existingIds[String(ids[i][0]).trim()] = true;
    }
  }

  var id;
  do {
    id = prefix + '-' + ('000' + nextNum).slice(-3);
    nextNum++;
  } while (existingIds[id]);

  return id;
}

/**
 * Format ukuran file dari bytes ke string yang mudah dibaca.
 * @param {number} bytes - Ukuran file dalam bytes
 * @returns {string} - Ukuran file terformat (KB, MB, GB)
 */
function _formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';

  var units = ['B', 'KB', 'MB', 'GB'];
  var unitIndex = 0;
  var size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return (Math.round(size * 100) / 100) + ' ' + units[unitIndex];
}
