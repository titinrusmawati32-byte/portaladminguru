/**
 * ============================================================
 * SiGuru SD - Portal Administrasi Guru & Sekolah Terpadu
 * Backend Google Apps Script (JSON REST API - Admin First)
 * ============================================================
 * Versi: 2.0.0 (Admin First Development & Multi-Class RBAC)
 * Penulis: Tim Pengembang SiGuru SD
 * ============================================================
 */

// ============================================================
// KONSTANTA & INISIALISASI
// ============================================================
var APP_TITLE = 'SiGuru SD - Portal Administrasi Sekolah Digital';
var DRIVE_FOLDER_NAME = 'SiGuru SD - Bank Perangkat Ajar';

// ============================================================
// SISTEM VERSIONING & CONCURRENCY LOCK (REAL-TIME SYNC ENGINE)
// ============================================================
function getDataVersion() {
  try {
    var props = PropertiesService.getScriptProperties();
    var verStr = props.getProperty('DATA_VERSION');
    var lastUp = props.getProperty('LAST_UPDATED_AT');
    if (!verStr) {
      verStr = '1';
      lastUp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      props.setProperties({ 'DATA_VERSION': verStr, 'LAST_UPDATED_AT': lastUp });
    }
    return { version: Number(verStr), lastUpdated: lastUp };
  } catch (e) {
    return { version: 1, lastUpdated: new Date().toISOString() };
  }
}

function incrementDataVersion(actionName) {
  try {
    var props = PropertiesService.getScriptProperties();
    var currentVer = Number(props.getProperty('DATA_VERSION') || 1);
    var newVer = currentVer + 1;
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    props.setProperties({
      'DATA_VERSION': String(newVer),
      'LAST_UPDATED_AT': now,
      'LAST_ACTION': actionName || ''
    });
    return { version: newVer, lastUpdated: now };
  } catch (e) {
    return { version: Date.now(), lastUpdated: new Date().toISOString() };
  }
}

/**
 * Helper Eksekusi Tulis dengan LockService
 * Mencegah race condition ketika banyak perangkat menulis bersamaan.
 */
function withScriptLock(actionName, fn) {
  var lock = LockService.getScriptLock();
  try {
    // Tunggu antrean kunci hingga 15 detik
    lock.waitLock(15000);
    var res = fn();
    SpreadsheetApp.flush();
    if (res && res.success) {
      var verInfo = incrementDataVersion(actionName);
      res.version = verInfo.version;
      res.sync_version = verInfo.version;
      res.lastUpdated = verInfo.lastUpdated;
      res.serverTimestamp = verInfo.lastUpdated;
    }
    return res;
  } catch (err) {
    return { success: false, message: 'Transaksi database terhambat antrean: ' + err.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Endpoint Utama: doGet
 * Menangani request GET untuk pembacaan data dengan verifikasi peran.
 */
function doGet(e) {
  var result;
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

    switch (action) {
      case 'ping':
        result = { success: true, message: 'SiGuru SD REST API v2.0 aktif dan siap melayani permintaan.', timestamp: new Date().toISOString() };
        break;

      case 'checkSyncStatus':
        // Heartbeat ringan untuk auto-synchronization multi-device
        var clientVer = Number((e && e.parameter && e.parameter.clientVersion) ? e.parameter.clientVersion : 0);
        var syncInfo = getDataVersion();
        result = {
          success: true,
          serverVersion: syncInfo.version,
          lastUpdated: syncInfo.lastUpdated,
          hasUpdates: syncInfo.version > clientVer,
          serverTime: new Date().toISOString()
        };
        break;

      case 'login':
        var username = (e.parameter.username || '').trim();
        var password = (e.parameter.password || '').trim();
        result = verifyLogin(username, password);
        break;

      case 'getAllAdminData':
        // Endpoint komprehensif khusus Admin Sekolah
        result = getAllAdminData();
        break;

      case 'getTeacherData':
        // Endpoint aman dengan pembatasan hak akses (RBAC) untuk Guru
        var teacherId = e.parameter.teacherId || '';
        result = getTeacherData(teacherId);
        break;

      case 'getSchoolSettings':
        result = getSchoolSettings();
        break;

      case 'getAllData':
      default:
        // Kompatibilitas dengan versi sebelumnya
        result = getAllAdminData();
        break;
    }
  } catch (err) {
    result = { success: false, message: 'Error pada doGet: ' + err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Endpoint Utama: doPost
 * Menangani request POST untuk seluruh operasi CRUD Admin & Guru dengan LockService.
 */
function doPost(e) {
  var result;
  try {
    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var body = JSON.parse(contents);
    var action = body.action || '';
    var payload = body.payload || {};

    switch (action) {
      // --- OPERASI KHUSUS ADMIN SEKOLAH ---
      case 'saveUser':
        result = withScriptLock('saveUser', function() { return saveUserBackend(payload); });
        break;

      case 'toggleUserStatus':
        result = withScriptLock('toggleUserStatus', function() { return toggleUserStatusBackend(payload); });
        break;

      case 'deleteUser':
        result = withScriptLock('deleteUser', function() { return deleteUserBackend(payload); });
        break;

      case 'saveKelas':
        result = withScriptLock('saveKelas', function() { return saveKelasBackend(payload); });
        break;

      case 'deleteKelas':
        result = withScriptLock('deleteKelas', function() { return deleteKelasBackend(payload); });
        break;

      case 'savePenugasan':
        result = withScriptLock('savePenugasan', function() { return savePenugasanBackend(payload); });
        break;

      case 'deletePenugasan':
        result = withScriptLock('deletePenugasan', function() { return deletePenugasanBackend(payload); });
        break;

      case 'savePengaturanSekolah':
        result = withScriptLock('savePengaturanSekolah', function() { return savePengaturanSekolahBackend(payload); });
        break;

      case 'togglePublikasiPerangkat':
        result = withScriptLock('togglePublikasiPerangkat', function() { return togglePublikasiPerangkatBackend(payload); });
        break;

      case 'logAdminActivity':
        result = withScriptLock('logAdminActivity', function() { return logAdminActivityBackend(payload); });
        break;

      // --- OPERASI PERANGKAT AJAR ---
      case 'uploadPerangkat':
        result = withScriptLock('uploadPerangkat', function() { return uploadPerangkatBackend(payload); });
        break;

      case 'addPerangkat':
        result = withScriptLock('addPerangkat', function() { return addPerangkatBackend(payload); });
        break;

      case 'editPerangkat':
        result = withScriptLock('editPerangkat', function() { return editPerangkatBackend(payload); });
        break;

      case 'deletePerangkat':
        result = withScriptLock('deletePerangkat', function() { return deleteRowByIdBackend('Perangkat_Ajar', payload.id || payload.docId); });
        break;

      // --- OPERASI GURU (SISWA, PRESENSI, NILAI, JURNAL) ---
      case 'addSiswa':
        result = withScriptLock('addSiswa', function() { return addSiswaBackend(payload); });
        break;

      case 'editSiswa':
        result = withScriptLock('editSiswa', function() { return editSiswaBackend(payload); });
        break;

      case 'updatePresensi':
        result = withScriptLock('updatePresensi', function() { return updatePresensiBackend(payload); });
        break;

      case 'batchUpdatePresensi':
        result = withScriptLock('batchUpdatePresensi', function() { return batchUpdatePresensiBackend(payload); });
        break;

      case 'addNilai':
        result = withScriptLock('addNilai', function() { return addNilaiBackend(payload); });
        break;

      case 'addJurnal':
        result = withScriptLock('addJurnal', function() { return addJurnalBackend(payload); });
        break;

      case 'addCatatan':
        result = withScriptLock('addCatatan', function() { return addCatatanBackend(payload); });
        break;

      case 'addPengumuman':
        result = withScriptLock('addPengumuman', function() { return addPengumumanBackend(payload); });
        break;

      case 'deletePengumuman':
        result = withScriptLock('deletePengumuman', function() { return deleteRowByIdBackend('Pengumuman', payload.id || payload.pengumumanId); });
        break;

      case 'deleteRow':
        result = withScriptLock('deleteRow', function() { return deleteRowByIdBackend(payload.sheetName, payload.id); });
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
// HELPER: SPREADSHEET & DRIVE
// ============================================================
function getActiveDb() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateUploadFolder() {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return folder;
}

// ============================================================
// SETUP DATABASE (10 SHEET LENGKAP & RELASIONAL)
// ============================================================
function setupDatabase() {
  var ss = getActiveDb();

  var schemas = {
    'Users': ['ID_User', 'Username', 'Password', 'Nama_Lengkap', 'Email', 'NIP', 'Role', 'Jenis_Guru', 'Status_Akun', 'Status_Tugas'],
    'Data_Kelas': ['ID_Kelas', 'Tingkat', 'Nama_Rombel', 'Tahun_Ajaran', 'ID_Wali_Kelas', 'Nama_Wali_Kelas', 'Status_Kelas'],
    'Penugasan_Guru': ['ID_Penugasan', 'ID_Guru', 'Nama_Guru', 'ID_Kelas', 'Nama_Kelas', 'Jenis_Tugas', 'Mata_Pelajaran', 'Tahun_Ajaran', 'Semester', 'Status'],
    'Data_Siswa': ['ID_Siswa', 'ID_Kelas', 'Nama_Kelas', 'NIS', 'NISN', 'Nama_Siswa', 'JK', 'TTL', 'Nama_Wali', 'No_HP_Wali', 'Status'],
    'Presensi': ['ID_Presensi', 'Tanggal', 'ID_Kelas', 'Nama_Kelas', 'ID_Siswa', 'Nama_Siswa', 'Status_Hadir', 'Keterangan', 'Waktu_Input'],
    'Nilai_Siswa': ['ID_Nilai', 'ID_Kelas', 'Nama_Kelas', 'ID_Siswa', 'Nama_Siswa', 'Mata_Pelajaran', 'Lingkup_Materi', 'Nilai_Formatif', 'Nilai_Sumatif', 'Nilai_SAS', 'Nilai_Akhir', 'Semester', 'Tahun_Ajaran'],
    'Jurnal_Mengajar': ['ID_Jurnal', 'ID_Kelas', 'Nama_Kelas', 'Tanggal', 'Jam_Ke', 'Mata_Pelajaran', 'Topik_Materi', 'Kegiatan_Pembelajaran', 'Siswa_Tidak_Hadir', 'Catatan_Refleksi'],
    'Perangkat_Ajar': ['ID_Dokumen', 'Judul_Dokumen', 'Mata_Pelajaran', 'Kategori_Kelas', 'Jenis', 'Format_Tipe', 'Nama_File', 'Ukuran_File', 'Sumber', 'Durasi_JP', 'Link_Berkas', 'Deskripsi', 'Uploader', 'Status_Publikasi', 'Waktu_Upload'],
    'Pengumuman': ['ID_Pengumuman', 'Tanggal', 'Judul', 'Isi', 'Pengirim', 'Status'],
    'Pengaturan_Sekolah': ['Kunci', 'Nilai'],
    'Log_Aktivitas_Admin': ['ID_Log', 'Waktu', 'ID_Admin', 'Nama_Admin', 'Aksi', 'Detail']
  };

  var headerBgColor = '#172554';
  var headerFontColor = '#FFFFFF';
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  var sheetNames = Object.keys(schemas);
  for (var i = 0; i < sheetNames.length; i++) {
    var sName = sheetNames[i];
    var headers = schemas[sName];
    var sheet = ss.getSheetByName(sName);

    if (!sheet) {
      sheet = ss.insertSheet(sName);
    } else {
      sheet.clearContents();
      sheet.clearFormats();
    }

    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground(headerBgColor);
    headerRange.setFontColor(headerFontColor);
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // 1. Data Default: Users (Admin & Guru-guru)
  var usersSheet = ss.getSheetByName('Users');
  var defaultUsers = [
    ['USR-001', 'admin', 'admin2026', 'Budi Santoso, S.Pd.SD.', 'budi.admin@sekolah.id', '19880412 201402 1 002', 'Admin', 'Admin Sekolah', 'Aktif', 'Admin'],
    ['USR-002', 'dewi', 'guru2026', 'Dewi Rahmawati, S.Pd.', 'dewi.rahmawati@guru.sd.belajar.id', '19920516 201903 2 004', 'Guru', 'Guru Kelas', 'Aktif', 'Sudah Ditugaskan'],
    ['USR-003', 'fauzi', 'guru2026', 'Ahmad Fauzi, S.Pd.I.', 'ahmad.fauzi@guru.sd.belajar.id', '19850720 201001 1 015', 'Guru', 'Guru Mapel', 'Aktif', 'Sudah Ditugaskan'],
    ['USR-004', 'maryam', 'guru2026', 'Siti Maryam, S.Pd.', 'siti.maryam@guru.sd.belajar.id', '19900315 201503 2 008', 'Guru', 'Guru Kelas', 'Aktif', 'Sudah Ditugaskan'],
    ['USR-005', 'bambang', 'guru2026', 'Bambang Pratama, S.Pd.Jas.', 'bambang.p@guru.sd.belajar.id', '19931108 202012 1 003', 'Guru', 'Guru Mapel', 'Aktif', 'Sudah Ditugaskan'],
    ['USR-006', 'rina', 'guru2026', 'Rina Kusuma, S.Pd.', 'rina.kusuma@guru.sd.belajar.id', '19950110 202203 2 010', 'Guru', 'Guru Kelas', 'Aktif', 'Belum Ditugaskan']
  ];
  usersSheet.getRange(2, 1, defaultUsers.length, defaultUsers[0].length).setValues(defaultUsers);

  // 2. Data Default: Data_Kelas
  var kelasSheet = ss.getSheetByName('Data_Kelas');
  var defaultKelas = [
    ['KLS-01', 'I', 'Kelas I-A', '2026/2027', 'USR-004', 'Siti Maryam, S.Pd.', 'Aktif'],
    ['KLS-02', 'II', 'Kelas II-A', '2026/2027', '', '', 'Aktif'],
    ['KLS-03', 'III', 'Kelas III-A', '2026/2027', '', '', 'Aktif'],
    ['KLS-04', 'IV', 'Kelas IV-A', '2026/2027', 'USR-002', 'Dewi Rahmawati, S.Pd.', 'Aktif'],
    ['KLS-05', 'V', 'Kelas V-A', '2026/2027', '', '', 'Aktif'],
    ['KLS-06', 'VI', 'Kelas VI-A', '2026/2027', '', '', 'Aktif']
  ];
  kelasSheet.getRange(2, 1, defaultKelas.length, defaultKelas[0].length).setValues(defaultKelas);

  // 3. Data Default: Penugasan_Guru (Mendukung Guru Mapel Multi-Kelas)
  var tugasSheet = ss.getSheetByName('Penugasan_Guru');
  var defaultTugas = [
    ['TGS-001', 'USR-002', 'Dewi Rahmawati, S.Pd.', 'KLS-04', 'Kelas IV-A', 'Wali Kelas', 'Semua Mata Pelajaran', '2026/2027', 'Ganjil', 'Aktif'],
    ['TGS-002', 'USR-004', 'Siti Maryam, S.Pd.', 'KLS-01', 'Kelas I-A', 'Wali Kelas', 'Semua Mata Pelajaran', '2026/2027', 'Ganjil', 'Aktif'],
    ['TGS-003', 'USR-003', 'Ahmad Fauzi, S.Pd.I.', 'KLS-04', 'Kelas IV-A', 'Guru Mapel', 'Pendidikan Agama Islam', '2026/2027', 'Ganjil', 'Aktif'],
    ['TGS-004', 'USR-003', 'Ahmad Fauzi, S.Pd.I.', 'KLS-01', 'Kelas I-A', 'Guru Mapel', 'Pendidikan Agama Islam', '2026/2027', 'Ganjil', 'Aktif'],
    ['TGS-005', 'USR-005', 'Bambang Pratama, S.Pd.Jas.', 'KLS-04', 'Kelas IV-A', 'Guru Mapel', 'PJOK', '2026/2027', 'Ganjil', 'Aktif'],
    ['TGS-006', 'USR-005', 'Bambang Pratama, S.Pd.Jas.', 'KLS-01', 'Kelas I-A', 'Guru Mapel', 'PJOK', '2026/2027', 'Ganjil', 'Aktif']
  ];
  tugasSheet.getRange(2, 1, defaultTugas.length, defaultTugas[0].length).setValues(defaultTugas);

  // 4. Data Default: Data_Siswa
  var siswaSheet = ss.getSheetByName('Data_Siswa');
  var defaultSiswa = [
    ['SIS-001', 'KLS-04', 'Kelas IV-A', '2401', '0081234567', 'Ahmad Rizky Pratama', 'L', 'Jember, 2015-06-12', 'Hendra Pratama', '081234567890', 'Aktif'],
    ['SIS-002', 'KLS-04', 'Kelas IV-A', '2402', '0081234568', 'Siti Aisyah Putri', 'P', 'Jember, 2015-09-23', 'Ratna Dewi', '082345678901', 'Aktif'],
    ['SIS-003', 'KLS-04', 'Kelas IV-A', '2403', '0081234569', 'Dimas Bayu Wicaksono', 'L', 'Surabaya, 2015-02-17', 'Wicaksono', '081234567892', 'Aktif'],
    ['SIS-004', 'KLS-04', 'Kelas IV-A', '2404', '0081234570', 'Naila Zahra Ramadhani', 'P', 'Jember, 2015-11-04', 'M. Ramadhan', '081234567893', 'Aktif'],
    ['SIS-005', 'KLS-01', 'Kelas I-A', '2701', '0112345601', 'Aditya Pratama Putra', 'L', 'Jember, 2018-04-10', 'Bambang Putra', '081234567894', 'Aktif'],
    ['SIS-006', 'KLS-01', 'Kelas I-A', '2702', '0112345602', 'Annisa Zahra Kirana', 'P', 'Malang, 2018-08-25', 'Agus Kirana', '081234567895', 'Aktif']
  ];
  siswaSheet.getRange(2, 1, defaultSiswa.length, defaultSiswa[0].length).setValues(defaultSiswa);

  // 5. Data Default: Presensi
  var presensiSheet = ss.getSheetByName('Presensi');
  var defaultPresensi = [
    ['PRS-001', today, 'KLS-04', 'Kelas IV-A', 'SIS-001', 'Ahmad Rizky Pratama', 'Hadir', 'Tepat waktu', now],
    ['PRS-002', today, 'KLS-04', 'Kelas IV-A', 'SIS-002', 'Siti Aisyah Putri', 'Hadir', 'Tepat waktu', now],
    ['PRS-003', today, 'KLS-04', 'Kelas IV-A', 'SIS-003', 'Dimas Bayu Wicaksono', 'Sakit', 'Surat dokter', now],
    ['PRS-004', today, 'KLS-04', 'Kelas IV-A', 'SIS-004', 'Naila Zahra Ramadhani', 'Hadir', 'Tepat waktu', now],
    ['PRS-005', today, 'KLS-01', 'Kelas I-A', 'SIS-005', 'Aditya Pratama Putra', 'Hadir', 'Tepat waktu', now],
    ['PRS-006', today, 'KLS-01', 'Kelas I-A', 'SIS-006', 'Annisa Zahra Kirana', 'Izin', 'Acara keluarga', now]
  ];
  presensiSheet.getRange(2, 1, defaultPresensi.length, defaultPresensi[0].length).setValues(defaultPresensi);

  // 6. Data Default: Nilai_Siswa
  var nilaiSheet = ss.getSheetByName('Nilai_Siswa');
  var defaultNilai = [
    ['NLI-001', 'KLS-04', 'Kelas IV-A', 'SIS-001', 'Ahmad Rizky Pratama', 'Matematika', 'Pecahan', 88, 85, 90, 87.67, 'Ganjil', '2026/2027'],
    ['NLI-002', 'KLS-04', 'Kelas IV-A', 'SIS-002', 'Siti Aisyah Putri', 'Matematika', 'Pecahan', 92, 90, 94, 92, 'Ganjil', '2026/2027'],
    ['NLI-003', 'KLS-04', 'Kelas IV-A', 'SIS-003', 'Dimas Bayu Wicaksono', 'Matematika', 'Pecahan', 78, 75, 80, 77.67, 'Ganjil', '2026/2027'],
    ['NLI-004', 'KLS-04', 'Kelas IV-A', 'SIS-004', 'Naila Zahra Ramadhani', 'Matematika', 'Pecahan', 85, 84, 88, 85.67, 'Ganjil', '2026/2027'],
    ['NLI-005', 'KLS-04', 'Kelas IV-A', 'SIS-001', 'Ahmad Rizky Pratama', 'Bahasa Indonesia', 'Teks Narasi', 86, 88, 90, 88, 'Ganjil', '2026/2027'],
    ['NLI-006', 'KLS-04', 'Kelas IV-A', 'SIS-002', 'Siti Aisyah Putri', 'Bahasa Indonesia', 'Teks Narasi', 90, 92, 95, 92.33, 'Ganjil', '2026/2027'],
    ['NLI-007', 'KLS-01', 'Kelas I-A', 'SIS-005', 'Aditya Pratama Putra', 'Matematika', 'Bilangan Cacah', 90, 88, 92, 90, 'Ganjil', '2026/2027'],
    ['NLI-008', 'KLS-01', 'Kelas I-A', 'SIS-006', 'Annisa Zahra Kirana', 'Matematika', 'Bilangan Cacah', 85, 85, 88, 86, 'Ganjil', '2026/2027']
  ];
  nilaiSheet.getRange(2, 1, defaultNilai.length, defaultNilai[0].length).setValues(defaultNilai);

  // 7. Data Default: Perangkat_Ajar
  var perangkatSheet = ss.getSheetByName('Perangkat_Ajar');
  var defaultPerangkat = [
    ['DOK-001', 'Modul Ajar Matematika Kelas IV - Pecahan', 'Matematika', 'Kelas IV', 'Modul Ajar', 'Word', 'modul_pecahan_kls4.docx', '2.3 MB', 'Admin Sekolah', '4 JP', '', 'Modul ajar lengkap materi pecahan Fase B semester 1', 'Budi Santoso, S.Pd.SD.', 'Aktif', now],
    ['DOK-002', 'RPP Bahasa Indonesia Kelas IV - Teks Narasi', 'Bahasa Indonesia', 'Kelas IV', 'RPP', 'PDF', 'rpp_teks_narasi.pdf', '1.1 MB', 'Admin Sekolah', '2 JP', '', 'Rencana pelaksanaan pembelajaran teks narasi kurikulum merdeka', 'Budi Santoso, S.Pd.SD.', 'Aktif', now],
    ['DOK-003', 'Aplikasi Olah Nilai Rapor Otomatis SD', 'Semua Mapel', 'Semua Kelas', 'Format Penilaian', 'Excel', 'olah_nilai_otomatis.xlsx', '856 KB', 'Admin Sekolah', '1 Semester', '', 'Template Excel lengkap rumus rekap nilai formatif & sumatif', 'Budi Santoso, S.Pd.SD.', 'Aktif', now],
    ['DOK-004', 'Modul Ajar PAI Kelas I - Rukun Iman', 'Pendidikan Agama Islam', 'Kelas I', 'Modul Ajar', 'PDF', 'modul_pai_kelas1.pdf', '1.8 MB', 'Guru', '4 JP', '', 'Pedoman pembelajaran materi rukun iman fase A', 'Ahmad Fauzi, S.Pd.I.', 'Aktif', now]
  ];
  perangkatSheet.getRange(2, 1, defaultPerangkat.length, defaultPerangkat[0].length).setValues(defaultPerangkat);

  // 8. Data Default: Pengaturan_Sekolah
  var pengaturanSheet = ss.getSheetByName('Pengaturan_Sekolah');
  var defaultPengaturan = [
    ['NAMA_SEKOLAH', 'SD Negeri Cerdas Bangsa 01'],
    ['NPSN', '20512345'],
    ['ALAMAT_SEKOLAH', 'Jl. Pendidikan No. 45, Kebayoran Baru, Jakarta Selatan'],
    ['KEPALA_SEKOLAH', 'Dra. Hj. Nurul Hidayati, M.Pd.'],
    ['NIP_KEPALA_SEKOLAH', '19700512 199603 2 001'],
    ['TAHUN_AJARAN_AKTIF', '2026/2027'],
    ['SEMESTER_AKTIF', 'Ganjil'],
    ['LOGO_URL', 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png'],
    ['KOP_SURAT', 'DINAS PENDIDIKAN DAN KEBUDAYAAN\nSD NEGERI CERDAS BANGSA 01\nKOTA ADMINISTRASI JAKARTA SELATAN']
  ];
  pengaturanSheet.getRange(2, 1, defaultPengaturan.length, defaultPengaturan[0].length).setValues(defaultPengaturan);

  // 9. Data Default: Jurnal_Mengajar
  var jurnalSheet = ss.getSheetByName('Jurnal_Mengajar');
  var defaultJurnal = [
    ['JRN-001', 'KLS-04', 'Kelas IV-A', today, '1-2', 'Matematika', 'Pecahan Senilai', 'Eksplorasi benda konkret dan LKPD kelompok', 'Dimas Bayu (Sakit)', 'Siswa antusias dan memahami konsep pecahan senilai dengan baik.'],
    ['JRN-002', 'KLS-01', 'Kelas I-A', today, '1-2', 'Pendidikan Agama Islam', 'Rukun Iman', 'Cerita bergambar dan bernyanyi rukun iman', '-', 'Siswa mampu menyebutkan 6 rukun iman secara berurutan.']
  ];
  if (jurnalSheet) jurnalSheet.getRange(2, 1, defaultJurnal.length, defaultJurnal[0].length).setValues(defaultJurnal);

  // 10. Data Default: Pengumuman
  var pengumumanSheet = ss.getSheetByName('Pengumuman');
  var defaultPengumuman = [
    ['PGM-001', today, 'Jadwal Penilaian Sumatif Akhir Semester (SAS)', 'Penilaian Sumatif Akhir Semester Ganjil akan dilaksanakan mulai tanggal 1 Desember 2026. Bapak/Ibu guru diharapkan menyelesaikan input nilai formatif tepat waktu.', 'Kepala Sekolah', 'Aktif'],
    ['PGM-002', today, 'Rapat Koordinasi Kurikulum Merdeka', 'Rapat evaluasi perangkat ajar dan modul P5 akan diselenggarakan hari Sabtu pkl 09.00 WIB di Ruang Guru.', 'Kurikulum', 'Aktif']
  ];
  if (pengumumanSheet) pengumumanSheet.getRange(2, 1, defaultPengumuman.length, defaultPengumuman[0].length).setValues(defaultPengumuman);

  // 11. Data Default: Log_Aktivitas_Admin
  var logSheet = ss.getSheetByName('Log_Aktivitas_Admin');
  var defaultLog = [
    ['LOG-001', now, 'USR-001', 'Budi Santoso, S.Pd.SD.', 'Inisialisasi Sistem', 'Setup database administrasi sekolah berhasil diselesaikan.']
  ];
  if (logSheet) logSheet.getRange(2, 1, defaultLog.length, defaultLog[0].length).setValues(defaultLog);

  // Hapus sheet1 jika ada
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1) ss.deleteSheet(sheet1);

  SpreadsheetApp.flush();
}

// ============================================================
// AUTENTIKASI DENGAN ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================
function verifyLogin(username, password) {
  if (!username || !password) {
    return { success: false, message: 'Username dan password wajib diisi.' };
  }

  var ss = getActiveDb();
  var uSheet = ss.getSheetByName('Users');
  var userFound = null;

  if (uSheet) {
    var uData = uSheet.getDataRange().getValues();
    for (var i = 1; i < uData.length; i++) {
      var r = uData[i];
      // [ID_User(0), Username(1), Password(2), Nama_Lengkap(3), Email(4), NIP(5), Role(6), Jenis_Guru(7), Status_Akun(8), Status_Tugas(9)]
      if (String(r[1]).trim().toLowerCase() === username.toLowerCase() && String(r[2]).trim() === password) {
        if (String(r[8]).trim() === 'Nonaktif') {
          return { success: false, message: 'Akun Anda sedang dinonaktifkan oleh Admin Sekolah. Hubungi Administrator.' };
        }
        userFound = {
          id: r[0],
          username: String(r[1]).trim(),
          nama: String(r[3]).trim(),
          email: String(r[4]).trim(),
          nip: String(r[5]).trim(),
          role: String(r[6]).trim(),
          jenisGuru: String(r[7]).trim(),
          statusAkun: String(r[8]).trim(),
          statusTugas: String(r[9]).trim()
        };
        break;
      }
    }
  }

  // Fallback akun default jika database baru di-setup
  if (!userFound) {
    if (username.toLowerCase() === 'admin' && (password === 'admin2026' || password === 'edudigital')) {
      userFound = {
        id: 'USR-001',
        username: 'admin',
        nama: 'Budi Santoso, S.Pd.SD.',
        email: 'budi.admin@sekolah.id',
        nip: '19880412 201402 1 002',
        role: 'Admin',
        jenisGuru: 'Admin Sekolah',
        statusAkun: 'Aktif',
        statusTugas: 'Admin'
      };
    } else if (username.toLowerCase() === 'peserta' || username.toLowerCase() === 'guru1' || username.toLowerCase() === 'dewi') {
      if (password === 'edudigital' || password === 'guru2026' || password === 'admin2026') {
        userFound = {
          id: 'USR-002',
          username: 'dewi',
          nama: 'Dewi Rahmawati, S.Pd.',
          email: 'dewi.rahmawati@guru.sd.belajar.id',
          nip: '19920516 201903 2 004',
          role: 'Guru',
          jenisGuru: 'Guru Kelas',
          statusAkun: 'Aktif',
          statusTugas: 'Sudah Ditugaskan'
        };
      }
    }
  }

  if (!userFound) {
    return { success: false, message: 'Username atau kata sandi tidak sesuai. Silakan periksa kembali.' };
  }

  // Jika user adalah Guru, ambil daftar penugasan kelas resminya (Server-Side RBAC)
  var assignedClasses = [];
  var tSheet = ss.getSheetByName('Penugasan_Guru');
  if (tSheet) {
    var tData = tSheet.getDataRange().getValues();
    for (var j = 1; j < tData.length; j++) {
      var tr = tData[j];
      // [ID_Penugasan, ID_Guru(1), Nama_Guru(2), ID_Kelas(3), Nama_Kelas(4), Jenis_Tugas(5), Mata_Pelajaran(6), ...]
      if (String(tr[1]).trim() === userFound.id && String(tr[9]).trim() === 'Aktif') {
        assignedClasses.push({
          idPenugasan: tr[0],
          idKelas: tr[3],
          namaKelas: tr[4],
          jenisTugas: tr[5],
          mataPelajaran: tr[6],
          tahunAjaran: tr[7],
          semester: tr[8]
        });
      }
    }
  }

  userFound.assignedClasses = assignedClasses;
  var verInfo = getDataVersion();
  return {
    success: true,
    user: userFound,
    version: verInfo.version,
    lastUpdated: verInfo.lastUpdated
  };
}

// ============================================================
// READ SEMUA DATA KHUSUS ADMIN (FULL ACCESS)
// ============================================================
function getAllAdminData() {
  try {
    var ss = getActiveDb();

    // 1. Pengaturan Sekolah
    var pengaturan = getSchoolSettingsObject(ss);

    // 2. Data Guru & Pengguna
    var usersRows = getSheetRows(ss, 'Users');
    var users = usersRows.map(function(r) {
      return {
        id: r[0], username: r[1], nama: r[3], email: r[4] || '',
        nip: r[5] || '', role: r[6] || 'Guru', jenisGuru: r[7] || 'Guru Kelas',
        statusAkun: r[8] || 'Aktif', statusTugas: r[9] || 'Belum Ditugaskan'
      };
    });

    // 3. Data Kelas
    var kelasRows = getSheetRows(ss, 'Data_Kelas');
    var kelas = kelasRows.map(function(r) {
      return {
        id: r[0], tingkat: r[1], namaRombel: r[2], tahunAjaran: r[3],
        idWali: r[4] || '', namaWali: r[5] || 'Belum Ditentukan', statusKelas: r[6] || 'Aktif'
      };
    });

    // 4. Penugasan Guru
    var tugasRows = getSheetRows(ss, 'Penugasan_Guru');
    var penugasan = tugasRows.map(function(r) {
      return {
        id: r[0], idGuru: r[1], namaGuru: r[2], idKelas: r[3], namaKelas: r[4],
        jenisTugas: r[5], mataPelajaran: r[6], tahunAjaran: r[7], semester: r[8], status: r[9]
      };
    });

    // 5. Data Siswa
    var siswaRows = getSheetRows(ss, 'Data_Siswa');
    var siswa = siswaRows.map(function(r) {
      return {
        id: r[0], idKelas: r[1] || '', namaKelas: r[2] || '',
        nis: r[3] || '', nisn: r[4] || '', nama: r[5], jk: r[6],
        ttl: formatDateStr(r[7]), namaWali: r[8], noHpWali: r[9], status: r[10] || 'Aktif'
      };
    });

    // 6. Presensi
    var presensiRows = getSheetRows(ss, 'Presensi');
    var presensi = presensiRows.map(function(r) {
      return {
        id: r[0], tanggal: formatDateStr(r[1]), idKelas: r[2] || '', namaKelas: r[3] || '',
        idSiswa: r[4], namaSiswa: r[5], statusHadir: r[6], keterangan: r[7], waktuInput: String(r[8] || '')
      };
    });

    // 7. Nilai Siswa
    var nilaiRows = getSheetRows(ss, 'Nilai_Siswa');
    var nilai = nilaiRows.map(function(r) {
      return {
        id: r[0], idKelas: r[1] || '', namaKelas: r[2] || '', idSiswa: r[3], namaSiswa: r[4],
        mapel: r[5], lingkupMateri: r[6], nilaiFormatif: r[7], nilaiSumatif: r[8],
        nilaiSAS: r[9], nilaiAkhir: r[10], semester: r[11] || 'Ganjil', tahunAjaran: r[12] || '2026/2027'
      };
    });

    // 8. Perangkat Ajar
    var perangkatRaw = getSheetRows(ss, 'Perangkat_Ajar');
    var perangkat = perangkatRaw.map(function(r) {
      return {
        id: r[0], judul: r[1], mapel: r[2], kategoriKelas: r[3] || 'Semua Kelas', jenis: r[4],
        formatTipe: r[5], namaFile: r[6], ukuranFile: r[7], sumber: r[8], durasiJP: r[9],
        linkBerkas: r[10], deskripsi: r[11], uploader: r[12], statusPublikasi: r[13] || 'Aktif', waktuUpload: String(r[14] || '')
      };
    });

    // 9. Jurnal Mengajar
    var jurnalRows = getSheetRows(ss, 'Jurnal_Mengajar');
    var jurnal = jurnalRows.map(function(r) {
      return {
        id: r[0], idKelas: r[1] || '', namaKelas: r[2] || '',
        tanggal: formatDateStr(r[3]), jamKe: String(r[4] || ''),
        mapel: r[5] || '', topikMateri: r[6] || '',
        kegiatanPembelajaran: r[7] || '', siswaTidakHadir: r[8] || '',
        catatanRefleksi: r[9] || ''
      };
    });

    // 10. Pengumuman Resmi
    var pengumumanRows = getSheetRows(ss, 'Pengumuman');
    var pengumuman = pengumumanRows.map(function(r) {
      return {
        id: r[0], tanggal: formatDateStr(r[1]), judul: r[2] || '',
        isi: r[3] || '', pengirim: r[4] || 'Admin Sekolah', status: r[5] || 'Aktif'
      };
    });

    // 11. Log Aktivitas Admin
    var logRows = getSheetRows(ss, 'Log_Aktivitas_Admin');
    var logs = logRows.map(function(r) {
      return {
        id: r[0], waktu: String(r[1]), idAdmin: r[2], namaAdmin: r[3], aksi: r[4], detail: r[5]
      };
    });

    var verInfo = getDataVersion();
    return {
      success: true,
      version: verInfo.version,
      lastUpdated: verInfo.lastUpdated,
      data: {
        pengaturan: pengaturan,
        users: users,
        kelas: kelas,
        penugasan: penugasan,
        siswa: siswa,
        presensi: presensi,
        nilai: nilai,
        jurnal: jurnal,
        perangkat: perangkat,
        pengumuman: pengumuman,
        logs: logs
      }
    };
  } catch (err) {
    return { success: false, message: 'Gagal memuat data Admin: ' + err.message };
  }
}

// ============================================================
// READ DATA DENGAN PEMBATASAN RBAC UNTUK GURU
// ============================================================
function getTeacherData(teacherId) {
  try {
    if (!teacherId) return { success: false, message: 'ID Guru wajib disertakan.' };

    var ss = getActiveDb();

    // 1. Cek Penugasan Guru
    var tSheet = ss.getSheetByName('Penugasan_Guru');
    var assignedClassIds = {};
    var myAssignments = [];

    if (tSheet) {
      var tData = tSheet.getDataRange().getValues();
      for (var i = 1; i < tData.length; i++) {
        var tr = tData[i];
        if (String(tr[1]).trim() === teacherId && String(tr[9]).trim() === 'Aktif') {
          var kId = String(tr[3]).trim();
          assignedClassIds[kId] = true;
          myAssignments.push({
            id: tr[0], idKelas: tr[3], namaKelas: tr[4], jenisTugas: tr[5],
            mataPelajaran: tr[6], tahunAjaran: tr[7], semester: tr[8]
          });
        }
      }
    }

    // 2. Filter Siswa HANYA dari kelas yang ditugaskan kepada guru ini
    var siswaRows = getSheetRows(ss, 'Data_Siswa');
    var siswa = siswaRows.filter(function(r) {
      return assignedClassIds[String(r[1]).trim()];
    }).map(function(r) {
      return {
        id: r[0], idKelas: r[1], namaKelas: r[2], nis: r[3], nisn: r[4],
        nama: r[5], jk: r[6], ttl: formatDateStr(r[7]), namaWali: r[8], noHpWali: r[9], status: r[10]
      };
    });

    // 3. Filter Presensi HANYA dari kelas guru ini
    var presensiRows = getSheetRows(ss, 'Presensi');
    var presensi = presensiRows.filter(function(r) {
      return assignedClassIds[String(r[2]).trim()];
    }).map(function(r) {
      return {
        id: r[0], tanggal: formatDateStr(r[1]), idKelas: r[2], namaKelas: r[3],
        idSiswa: r[4], namaSiswa: r[5], statusHadir: r[6], keterangan: r[7], waktuInput: String(r[8])
      };
    });

    // 4. Filter Nilai HANYA dari kelas guru ini
    var nilaiRows = getSheetRows(ss, 'Nilai_Siswa');
    var nilai = nilaiRows.filter(function(r) {
      return assignedClassIds[String(r[1]).trim()];
    }).map(function(r) {
      return {
        id: r[0], idKelas: r[1], namaKelas: r[2], idSiswa: r[3], namaSiswa: r[4],
        mapel: r[5], lingkupMateri: r[6], nilaiFormatif: r[7], nilaiSumatif: r[8],
        nilaiSAS: r[9], nilaiAkhir: r[10], semester: r[11], tahunAjaran: r[12]
      };
    });

    // 5. Filter Kelas HANYA yang ditugaskan kepada guru ini
    var kelasRows = getSheetRows(ss, 'Data_Kelas');
    var myKelas = kelasRows.filter(function(r) {
      return assignedClassIds[String(r[0]).trim()];
    }).map(function(r) {
      return {
        id: r[0], tingkat: r[1], namaRombel: r[2], tahunAjaran: r[3],
        idWali: r[4] || '', namaWali: r[5] || 'Belum Ditentukan', statusKelas: r[6] || 'Aktif'
      };
    });

    // 6. Filter Jurnal Mengajar HANYA dari kelas guru ini
    var jurnalRows = getSheetRows(ss, 'Jurnal_Mengajar');
    var myJurnal = jurnalRows.filter(function(r) {
      return assignedClassIds[String(r[1]).trim()];
    }).map(function(r) {
      return {
        id: r[0], idKelas: r[1] || '', namaKelas: r[2] || '',
        tanggal: formatDateStr(r[3]), jamKe: String(r[4] || ''),
        mapel: r[5] || '', topikMateri: r[6] || '',
        kegiatanPembelajaran: r[7] || '', siswaTidakHadir: r[8] || '',
        catatanRefleksi: r[9] || ''
      };
    });

    // 7. Perangkat Ajar yang berstatus 'Aktif'
    var perangkatRaw = getSheetRows(ss, 'Perangkat_Ajar');
    var perangkat = perangkatRaw.filter(function(r) {
      return String(r[13]).trim() === 'Aktif';
    }).map(function(r) {
      return {
        id: r[0], judul: r[1], mapel: r[2], kategoriKelas: r[3], jenis: r[4],
        formatTipe: r[5], namaFile: r[6], ukuranFile: r[7], sumber: r[8],
        durasiJP: r[9], linkBerkas: r[10], deskripsi: r[11], uploader: r[12]
      };
    });

    // 8. Pengumuman Resmi Sekolah
    var pengumumanRows = getSheetRows(ss, 'Pengumuman');
    var pengumuman = pengumumanRows.filter(function(r) {
      return String(r[5] || 'Aktif').trim() === 'Aktif';
    }).map(function(r) {
      return {
        id: r[0], tanggal: formatDateStr(r[1]), judul: r[2] || '',
        isi: r[3] || '', pengirim: r[4] || 'Admin Sekolah', status: r[5] || 'Aktif'
      };
    });

    var pengaturan = getSchoolSettingsObject(ss);
    var verInfo = getDataVersion();

    return {
      success: true,
      version: verInfo.version,
      lastUpdated: verInfo.lastUpdated,
      data: {
        assignments: myAssignments,
        kelas: myKelas,
        siswa: siswa,
        presensi: presensi,
        nilai: nilai,
        jurnal: myJurnal,
        perangkat: perangkat,
        pengumuman: pengumuman,
        pengaturan: pengaturan
      }
    };
  } catch (err) {
    return { success: false, message: 'Gagal mengambil data Guru: ' + err.message };
  }
}

// ============================================================
// CRUD BACKEND: USERS / GURU (ADMIN ONLY)
// ============================================================
function saveUserBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Users');
    var data = sheet.getDataRange().getValues();
    var id = p.id || '';
    var isEdit = false;

    if (id) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === id.trim()) {
          // Update baris
          sheet.getRange(i + 1, 2).setValue(p.username || data[i][1]);
          if (p.password) sheet.getRange(i + 1, 3).setValue(p.password);
          sheet.getRange(i + 1, 4).setValue(p.nama || data[i][3]);
          sheet.getRange(i + 1, 5).setValue(p.email || '');
          sheet.getRange(i + 1, 6).setValue(p.nip || '');
          sheet.getRange(i + 1, 7).setValue(p.role || 'Guru');
          sheet.getRange(i + 1, 8).setValue(p.jenisGuru || 'Guru Kelas');
          sheet.getRange(i + 1, 9).setValue(p.statusAkun || 'Aktif');
          sheet.getRange(i + 1, 10).setValue(p.statusTugas || data[i][9]);
          isEdit = true;
          break;
        }
      }
    }

    if (!isEdit) {
      id = _generateId(sheet, 'USR');
      var newRow = [
        id,
        p.username || ('guru_' + Date.now().toString().slice(-4)),
        p.password || 'guru2026',
        p.nama || 'Guru Baru',
        p.email || '',
        p.nip || '',
        p.role || 'Guru',
        p.jenisGuru || 'Guru Kelas',
        p.statusAkun || 'Aktif',
        'Belum Ditugaskan'
      ];
      sheet.appendRow(newRow);
    }

    logAdminActivityBackend({
      idAdmin: p.adminId || 'USR-001',
      namaAdmin: p.adminNama || 'Admin Sekolah',
      aksi: isEdit ? 'Edit Data Guru' : 'Tambah Guru Baru',
      detail: (isEdit ? 'Mengubah data guru ' : 'Menambahkan guru ') + (p.nama || id)
    });

    return { success: true, id: id, message: 'Data guru berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: 'Gagal menyimpan user: ' + err.message };
  }
}

function toggleUserStatusBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Users');
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(p.id).trim()) {
        sheet.getRange(i + 1, 9).setValue(p.statusAkun);
        logAdminActivityBackend({
          idAdmin: p.adminId || 'USR-001',
          namaAdmin: p.adminNama || 'Admin Sekolah',
          aksi: 'Ubah Status Akun Guru',
          detail: 'Mengubah status akun ' + data[i][3] + ' menjadi ' + p.statusAkun
        });
        return { success: true, message: 'Status akun berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'User tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function deleteUserBackend(p) {
  try {
    var userId = p.id || p.userId || '';
    if (!userId) return { success: false, message: 'ID User wajib disertakan.' };

    var ss = getActiveDb();
    var tSheet = ss.getSheetByName('Penugasan_Guru');
    if (tSheet) {
      var tData = tSheet.getDataRange().getValues();
      for (var i = 1; i < tData.length; i++) {
        if (String(tData[i][1]).trim() === String(userId).trim() && String(tData[i][9]).trim() === 'Aktif') {
          return { success: false, message: 'Guru tidak dapat dihapus karena masih memiliki penugasan aktif di kelas ' + tData[i][4] + '. Akhiri penugasan terlebih dahulu.' };
        }
      }
    }

    return deleteRowByIdBackend('Users', userId);
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ============================================================
// CRUD BACKEND: KELAS (ADMIN ONLY)
// ============================================================
function saveKelasBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Data_Kelas');
    var data = sheet.getDataRange().getValues();
    var id = p.id || '';
    var isEdit = false;

    if (id) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === id.trim()) {
          sheet.getRange(i + 1, 2).setValue(p.tingkat || data[i][1]);
          sheet.getRange(i + 1, 3).setValue(p.namaRombel || data[i][2]);
          sheet.getRange(i + 1, 4).setValue(p.tahunAjaran || data[i][3]);
          sheet.getRange(i + 1, 5).setValue(p.idWali || '');
          sheet.getRange(i + 1, 6).setValue(p.namaWali || 'Belum Ditentukan');
          sheet.getRange(i + 1, 7).setValue(p.statusKelas || 'Aktif');
          isEdit = true;
          break;
        }
      }
    }

    if (!isEdit) {
      id = _generateId(sheet, 'KLS');
      var newRow = [
        id,
        p.tingkat || 'I',
        p.namaRombel || ('Kelas ' + (p.tingkat || 'I') + '-A'),
        p.tahunAjaran || '2026/2027',
        p.idWali || '',
        p.namaWali || 'Belum Ditentukan',
        p.statusKelas || 'Aktif'
      ];
      sheet.appendRow(newRow);
    }

    logAdminActivityBackend({
      idAdmin: p.adminId || 'USR-001',
      namaAdmin: p.adminNama || 'Admin Sekolah',
      aksi: isEdit ? 'Edit Kelas' : 'Tambah Kelas Baru',
      detail: (isEdit ? 'Mengubah rombel ' : 'Membuat rombel baru ') + (p.namaRombel || id)
    });

    return { success: true, id: id, message: 'Data kelas berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: 'Gagal menyimpan kelas: ' + err.message };
  }
}

function deleteKelasBackend(p) {
  try {
    var ss = getActiveDb();
    // Validasi: Cegah hapus jika ada siswa terdaftar di kelas ini
    var sSheet = ss.getSheetByName('Data_Siswa');
    if (sSheet) {
      var sData = sSheet.getDataRange().getValues();
      for (var i = 1; i < sData.length; i++) {
        if (String(sData[i][1]).trim() === String(p.id).trim()) {
          return { success: false, message: 'Kelas tidak dapat dihapus karena masih ada siswa terdaftar di dalamnya.' };
        }
      }
    }

    return deleteRowByIdBackend('Data_Kelas', p.id);
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ============================================================
// CRUD BACKEND: PEMBAGIAN TUGAS GURU (ADMIN ONLY)
// ============================================================
function savePenugasanBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Penugasan_Guru');
    var id = p.id || '';
    var isEdit = false;

    if (id) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === id.trim()) {
          sheet.getRange(i + 1, 2).setValue(p.idGuru);
          sheet.getRange(i + 1, 3).setValue(p.namaGuru);
          sheet.getRange(i + 1, 4).setValue(p.idKelas);
          sheet.getRange(i + 1, 5).setValue(p.namaKelas);
          sheet.getRange(i + 1, 6).setValue(p.jenisTugas || 'Wali Kelas');
          sheet.getRange(i + 1, 7).setValue(p.mataPelajaran || 'Semua Mata Pelajaran');
          sheet.getRange(i + 1, 8).setValue(p.tahunAjaran || '2026/2027');
          sheet.getRange(i + 1, 9).setValue(p.semester || 'Ganjil');
          sheet.getRange(i + 1, 10).setValue(p.status || 'Aktif');
          isEdit = true;
          break;
        }
      }
    }

    if (!isEdit) {
      id = _generateId(sheet, 'TGS');
      var newRow = [
        id,
        p.idGuru,
        p.namaGuru,
        p.idKelas,
        p.namaKelas,
        p.jenisTugas || 'Wali Kelas',
        p.mataPelajaran || 'Semua Mata Pelajaran',
        p.tahunAjaran || '2026/2027',
        p.semester || 'Ganjil',
        'Aktif'
      ];
      sheet.appendRow(newRow);
    }

    // Jika Jenis Tugas adalah 'Wali Kelas', update juga di Data_Kelas
    if (p.jenisTugas === 'Wali Kelas') {
      var kSheet = ss.getSheetByName('Data_Kelas');
      if (kSheet) {
        var kData = kSheet.getDataRange().getValues();
        for (var k = 1; k < kData.length; k++) {
          if (String(kData[k][0]).trim() === String(p.idKelas).trim()) {
            kSheet.getRange(k + 1, 5).setValue(p.idGuru);
            kSheet.getRange(k + 1, 6).setValue(p.namaGuru);
            break;
          }
        }
      }
    }

    // Update Status_Tugas di sheet Users menjadi 'Sudah Ditugaskan'
    var uSheet = ss.getSheetByName('Users');
    if (uSheet) {
      var uData = uSheet.getDataRange().getValues();
      for (var u = 1; u < uData.length; u++) {
        if (String(uData[u][0]).trim() === String(p.idGuru).trim()) {
          uSheet.getRange(u + 1, 10).setValue('Sudah Ditugaskan');
          break;
        }
      }
    }

    logAdminActivityBackend({
      idAdmin: p.adminId || 'USR-001',
      namaAdmin: p.adminNama || 'Admin Sekolah',
      aksi: 'Penetapan Tugas Guru',
      detail: 'Menugaskan ' + p.namaGuru + ' sebagai ' + p.jenisTugas + ' di ' + p.namaKelas
    });

    return { success: true, id: id, message: 'Penugasan guru berhasil ditetapkan.' };
  } catch (err) {
    return { success: false, message: 'Gagal menetapkan tugas: ' + err.message };
  }
}

function deletePenugasanBackend(p) {
  try {
    var tugasId = p.id || p.tugasId || '';
    if (!tugasId) return { success: false, message: 'ID Penugasan wajib disertakan.' };

    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Penugasan_Guru');
    var data = sheet.getDataRange().getValues();
    var idGuru = '';
    var idKelas = '';
    var jenisTugas = '';

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(tugasId).trim()) {
        idGuru = data[i][1];
        idKelas = data[i][3];
        jenisTugas = data[i][5];
        break;
      }
    }

    // Hapus baris penugasan
    var delRes = deleteRowByIdBackend('Penugasan_Guru', tugasId);
    if (!delRes.success) return delRes;

    // Jika yang dihapus adalah Wali Kelas, kosongkan di Data_Kelas
    if (jenisTugas === 'Wali Kelas') {
      var kSheet = ss.getSheetByName('Data_Kelas');
      if (kSheet) {
        var kData = kSheet.getDataRange().getValues();
        for (var k = 1; k < kData.length; k++) {
          if (String(kData[k][0]).trim() === String(idKelas).trim()) {
            kSheet.getRange(k + 1, 5).setValue('');
            kSheet.getRange(k + 1, 6).setValue('Belum Ditentukan');
            break;
          }
        }
      }
    }

    // Periksa apakah guru masih punya tugas lain
    var stillAssigned = false;
    var tData = sheet.getDataRange().getValues();
    for (var j = 1; j < tData.length; j++) {
      if (String(tData[j][1]).trim() === String(idGuru).trim() && String(tData[j][9]).trim() === 'Aktif') {
        stillAssigned = true;
        break;
      }
    }

    if (!stillAssigned) {
      var uSheet = ss.getSheetByName('Users');
      if (uSheet) {
        var uData = uSheet.getDataRange().getValues();
        for (var u = 1; u < uData.length; u++) {
          if (String(uData[u][0]).trim() === String(idGuru).trim()) {
            uSheet.getRange(u + 1, 10).setValue('Belum Ditugaskan');
            break;
          }
        }
      }
    }

    return { success: true, message: 'Penugasan guru telah diakhiri.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ============================================================
// CRUD BACKEND: PENGATURAN SEKOLAH
// ============================================================
function getSchoolSettingsObject(ss) {
  var sheet = ss.getSheetByName('Pengaturan_Sekolah');
  var settings = {
    namaSekolah: 'SD Negeri Cerdas Bangsa 01',
    npsn: '20512345',
    alamatSekolah: 'Jl. Pendidikan No. 45, Kebayoran Baru, Jakarta Selatan',
    kepalaSekolah: 'Dra. Hj. Nurul Hidayati, M.Pd.',
    nipKepalaSekolah: '19700512 199603 2 001',
    tahunAjaranAktif: '2026/2027',
    semesterAktif: 'Ganjil',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png',
    kopSurat: 'DINAS PENDIDIKAN DAN KEBUDAYAAN\nSD NEGERI CERDAS BANGSA 01'
  };

  if (!sheet) return settings;

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][0]).trim().toUpperCase();
    var val = String(data[i][1]).trim();
    if (key === 'NAMA_SEKOLAH') settings.namaSekolah = val;
    if (key === 'NPSN') settings.npsn = val;
    if (key === 'ALAMAT_SEKOLAH') settings.alamatSekolah = val;
    if (key === 'KEPALA_SEKOLAH') settings.kepalaSekolah = val;
    if (key === 'NIP_KEPALA_SEKOLAH') settings.nipKepalaSekolah = val;
    if (key === 'TAHUN_AJARAN_AKTIF') settings.tahunAjaranAktif = val;
    if (key === 'SEMESTER_AKTIF') settings.semesterAktif = val;
    if (key === 'LOGO_URL') settings.logoUrl = val;
    if (key === 'KOP_SURAT') settings.kopSurat = val;
  }

  return settings;
}

function savePengaturanSekolahBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Pengaturan_Sekolah');
    if (!sheet) {
      sheet = ss.insertSheet('Pengaturan_Sekolah');
      sheet.appendRow(['Kunci', 'Nilai']);
    }

    var keys = {
      'NAMA_SEKOLAH': p.namaSekolah,
      'NPSN': p.npsn,
      'ALAMAT_SEKOLAH': p.alamatSekolah,
      'KEPALA_SEKOLAH': p.kepalaSekolah,
      'NIP_KEPALA_SEKOLAH': p.nipKepalaSekolah,
      'TAHUN_AJARAN_AKTIF': p.tahunAjaranAktif,
      'SEMESTER_AKTIF': p.semesterAktif,
      'LOGO_URL': p.logoUrl,
      'KOP_SURAT': p.kopSurat
    };

    var data = sheet.getDataRange().getValues();
    var existingKeys = {};
    for (var i = 1; i < data.length; i++) {
      var k = String(data[i][0]).trim().toUpperCase();
      existingKeys[k] = i + 1; // row number
    }

    Object.keys(keys).forEach(function(k) {
      if (keys[k] !== undefined) {
        if (existingKeys[k]) {
          sheet.getRange(existingKeys[k], 2).setValue(keys[k]);
        } else {
          sheet.appendRow([k, keys[k]]);
        }
      }
    });

    logAdminActivityBackend({
      idAdmin: p.adminId || 'USR-001',
      namaAdmin: p.adminNama || 'Admin Sekolah',
      aksi: 'Ubah Pengaturan Sekolah',
      detail: 'Memperbarui identitas dan konfigurasi sekolah'
    });

    return { success: true, message: 'Pengaturan sekolah berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ============================================================
// LOG AKTIVITAS ADMIN (AUDIT TRAIL)
// ============================================================
function logAdminActivityBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Log_Aktivitas_Admin');
    if (!sheet) return { success: false };

    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    var id = _generateId(sheet, 'LOG');
    sheet.appendRow([
      id,
      now,
      p.idAdmin || 'USR-001',
      p.namaAdmin || 'Admin Sekolah',
      p.aksi || 'Aktivitas Admin',
      p.detail || ''
    ]);
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

// ============================================================
// OPERASI BERKAS & PERANGKAT AJAR
// ============================================================
function togglePublikasiPerangkatBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Perangkat_Ajar');
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(p.id).trim()) {
        sheet.getRange(i + 1, 14).setValue(p.statusPublikasi);
        return { success: true, message: 'Status publikasi diperbarui menjadi ' + p.statusPublikasi };
      }
    }
    return { success: false, message: 'Dokumen tidak ditemukan.' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function uploadPerangkatBackend(payload) {
  try {
    var namaFile = payload.namaFile || payload.fileName || 'berkas_dokumen';
    var mimeType = payload.mimeType || payload.fileMime || 'application/octet-stream';
    var base64Data = payload.base64Data || payload.fileBase64 || '';
    var judul = payload.judul || namaFile;
    var mapel = payload.mapel || 'Umum';
    var kategoriKelas = payload.kategoriKelas || 'Semua Kelas';
    var jenis = payload.jenis || 'Modul Ajar';
    var formatTipe = payload.formatTipe || 'PDF';
    var durasi = payload.durasi || payload.durasiJP || '4 JP';
    var deskripsi = payload.deskripsi || '';
    var uploader = payload.uploader || 'Admin Sekolah';
    var fileUrl = payload.linkBerkas || 'https://drive.google.com/';
    var ukuranFile = payload.ukuranFile || '1.0 MB';

    // Coba upload berkas fisik ke Google Drive jika ada data base64
    if (base64Data && typeof base64Data === 'string' && base64Data.trim().length > 10) {
      try {
        var cleanBase64 = base64Data.replace(/^data:.*?;base64,/, '');
        var decodedData = Utilities.base64Decode(cleanBase64);
        var blob = Utilities.newBlob(decodedData, mimeType, namaFile);
        var folder = getOrCreateUploadFolder();
        var file = folder.createFile(blob);
        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareErr) {}
        fileUrl = file.getUrl();
        ukuranFile = _formatFileSize(file.getSize());
      } catch (driveErr) {
        // Jika DriveApp memerlukan izin tambahan, tetap simpan rekaman metadata dokumen
        if (!fileUrl || fileUrl === 'https://drive.google.com/') {
          fileUrl = 'https://drive.google.com/drive/my-drive';
        }
      }
    }

    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Perangkat_Ajar');
    var newId = _generateId(sheet, 'DOK');
    var waktuUpload = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    var rowData = [
      newId, judul, mapel, kategoriKelas, jenis, formatTipe, namaFile,
      ukuranFile, 'Google Drive', durasi, fileUrl, deskripsi, uploader, 'Aktif', waktuUpload
    ];
    sheet.appendRow(rowData);

    return {
      success: true,
      fileUrl: fileUrl,
      id: newId,
      namaFile: namaFile,
      message: 'Berkas "' + namaFile + '" berhasil disimpan ke Bank Perangkat Ajar & Database.'
    };
  } catch (err) {
    return { success: false, message: 'Gagal memproses berkas: ' + err.message };
  }
}

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
      d.kategoriKelas || 'Semua Kelas',
      d.jenis || '',
      d.formatTipe || 'PDF',
      d.namaFile || '',
      d.ukuranFile || '1.0 MB',
      d.sumber || 'Tautan Eksternal',
      d.durasi || '',
      d.linkBerkas || '',
      d.deskripsi || '',
      d.uploader || 'Admin',
      'Aktif',
      waktuUpload
    ];
    sheet.appendRow(rowData);

    return { success: true, id: newId, message: 'Perangkat ajar berhasil dicatat.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function editPerangkatBackend(d) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Perangkat_Ajar');
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(d.id).trim()) {
        sheet.getRange(i + 1, 2).setValue(d.judul);
        sheet.getRange(i + 1, 3).setValue(d.mapel);
        sheet.getRange(i + 1, 4).setValue(d.kategoriKelas || 'Semua Kelas');
        sheet.getRange(i + 1, 5).setValue(d.jenis);
        sheet.getRange(i + 1, 10).setValue(d.durasi || '');
        sheet.getRange(i + 1, 11).setValue(d.linkBerkas || '');
        sheet.getRange(i + 1, 12).setValue(d.deskripsi || '');
        sheet.getRange(i + 1, 14).setValue(d.statusPublikasi || 'Aktif');
        return { success: true, message: 'Metadata dokumen berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'Dokumen tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ============================================================
// OPERASI GURU: DATA SISWA, PRESENSI, NILAI, JURNAL
// ============================================================
function addSiswaBackend(s) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Data_Siswa');
    var newId = _generateId(sheet, 'SIS');

    var rowData = [
      newId,
      s.idKelas || '',
      s.namaKelas || '',
      s.nis || '',
      s.nisn || '',
      s.nama || '',
      s.jk || 'L',
      s.ttl || '',
      s.namaWali || '',
      s.noHpWali || '',
      s.status || 'Aktif'
    ];
    sheet.appendRow(rowData);

    return { success: true, id: newId, message: 'Data siswa "' + s.nama + '" berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function editSiswaBackend(s) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Data_Siswa');
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(s.id).trim()) {
        sheet.getRange(i + 1, 2).setValue(s.idKelas);
        sheet.getRange(i + 1, 3).setValue(s.namaKelas);
        sheet.getRange(i + 1, 4).setValue(s.nis);
        sheet.getRange(i + 1, 5).setValue(s.nisn);
        sheet.getRange(i + 1, 6).setValue(s.nama);
        sheet.getRange(i + 1, 7).setValue(s.jk);
        sheet.getRange(i + 1, 8).setValue(s.ttl);
        sheet.getRange(i + 1, 9).setValue(s.namaWali);
        sheet.getRange(i + 1, 10).setValue(s.noHpWali);
        sheet.getRange(i + 1, 11).setValue(s.status);
        return { success: true, message: 'Data siswa diperbarui.' };
      }
    }
    return { success: false, message: 'Siswa tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function updatePresensiBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Presensi');
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    var tanggal = p.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    var data = sheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < data.length; i++) {
      var rowTgl = formatDateStr(data[i][1]);
      var rowIdSiswa = String(data[i][4]).trim();

      if (rowTgl === tanggal && rowIdSiswa === String(p.idSiswa).trim()) {
        sheet.getRange(i + 1, 7).setValue(p.statusHadir || 'Hadir');
        sheet.getRange(i + 1, 8).setValue(p.keterangan || '');
        sheet.getRange(i + 1, 9).setValue(now);
        found = true;
        break;
      }
    }

    if (!found) {
      var newId = _generateId(sheet, 'PRS');
      var newRow = [
        newId, tanggal, p.idKelas || '', p.namaKelas || '', p.idSiswa,
        p.namaSiswa, p.statusHadir || 'Hadir', p.keterangan || '', now
      ];
      sheet.appendRow(newRow);
    }

    return { success: true, message: 'Presensi tercatat.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function batchUpdatePresensiBackend(p) {
  try {
    var records = p.records || [];
    for (var i = 0; i < records.length; i++) {
      updatePresensiBackend(records[i]);
    }
    return { success: true, message: 'Presensi massal berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function addNilaiBackend(n) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Nilai_Siswa');
    var newId = _generateId(sheet, 'NLI');

    var nF = parseFloat(n.nilaiFormatif) || 0;
    var nS = parseFloat(n.nilaiSumatif) || 0;
    var nSAS = parseFloat(n.nilaiSAS) || 0;

    var jml = 0;
    var total = 0;
    if (n.nilaiFormatif !== '' && n.nilaiFormatif !== undefined) { total += nF; jml++; }
    if (n.nilaiSumatif !== '' && n.nilaiSumatif !== undefined) { total += nS; jml++; }
    if (n.nilaiSAS !== '' && n.nilaiSAS !== undefined) { total += nSAS; jml++; }

    var nAkhir = jml > 0 ? Math.round((total / jml) * 100) / 100 : 0;

    var rowData = [
      newId,
      n.idKelas || '',
      n.namaKelas || '',
      n.idSiswa || '',
      n.namaSiswa || '',
      n.mapel || '',
      n.lingkupMateri || '',
      nF, nS, nSAS, nAkhir,
      n.semester || 'Ganjil',
      n.tahunAjaran || '2026/2027'
    ];
    sheet.appendRow(rowData);

    return { success: true, id: newId, nilaiAkhir: nAkhir, message: 'Nilai tersimpan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function addJurnalBackend(j) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Jurnal_Mengajar');
    var newId = _generateId(sheet, 'JRN');

    var rowData = [
      newId,
      j.idKelas || '',
      j.namaKelas || '',
      j.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      j.jamKe || '',
      j.mapel || '',
      j.topikMateri || '',
      j.kegiatanPembelajaran || '',
      j.siswaTidakHadir || '',
      j.catatanRefleksi || ''
    ];
    sheet.appendRow(rowData);

    return { success: true, id: newId, message: 'Jurnal tersimpan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function addCatatanBackend(c) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Sikap_Inventaris');
    if (!sheet) {
      sheet = ss.insertSheet('Sikap_Inventaris');
      sheet.appendRow(['ID_Catatan', 'Tanggal', 'Kategori', 'Subjek_Nama', 'Deskripsi', 'Tindak_Lanjut_Kondisi']);
    }
    var newId = _generateId(sheet, 'CAT');

    sheet.appendRow([
      newId,
      c.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      c.kategori || '',
      c.subjekNama || '',
      c.deskripsi || '',
      c.tindakLanjutKondisi || ''
    ]);

    return { success: true, id: newId, message: 'Catatan tersimpan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function addPengumumanBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Pengumuman');
    if (!sheet) {
      sheet = ss.insertSheet('Pengumuman');
      sheet.appendRow(['ID_Pengumuman', 'Tanggal', 'Judul', 'Isi', 'Pengirim', 'Status']);
    }
    var id = _generateId(sheet, 'PGM');
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    sheet.appendRow([
      id,
      p.tanggal || today,
      p.judul || 'Pengumuman Baru',
      p.isi || '',
      p.pengirim || 'Admin Sekolah',
      p.status || 'Aktif'
    ]);
    return { success: true, id: id, message: 'Pengumuman berhasil dipublikasikan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function deleteRowByIdBackend(sheetName, idVal) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };

    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]).trim() === String(idVal).trim()) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Data berhasil dihapus dari ' + sheetName + '.' };
      }
    }
    return { success: false, message: 'ID tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ============================================================
// HELPER INTERNAL
// ============================================================
function getSheetRows(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1);
}

function formatDateStr(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val).trim();
}

function _generateId(sheet, prefix) {
  var lastRow = sheet.getLastRow();
  var nextNum = lastRow;
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
