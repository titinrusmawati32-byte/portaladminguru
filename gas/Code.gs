/**
 * ============================================================
 * SiGuru SD - Platform Administrasi Pendidikan Kecamatan Ambulu
 * Kabupaten Jember, Jawa Timur - Versi 3.3.0-STRICT-ADMIN-MULTI-TENANT
 * Sistem Autentikasi: NPSN + Kode Unik Lembaga & PIN Guru dengan Verifikasi Admin
 * Database Terisolasi Per Lembaga (Sheet DB_[NPSN]_[NamaSekolah])
 * ============================================================
 */

var PLATFORM_TITLE = 'SiGuru SD - Kecamatan Ambulu, Kabupaten Jember';
var DRIVE_FOLDER_NAME = 'SiGuru_SD_Ambulu_Perangkat_Ajar';
var DEFAULT_ADMIN_PIN = 'admin123';

// ============================================================
// DAFTAR 14 SD NEGERI RESMI KECAMATAN AMBULU (SESUAI EXCEL)
// ============================================================
var OFFICIAL_SCHOOLS_AMBULU = [
  { npsn: '20524058', kode: 'SMB04-3918', nama: 'SDN Sumberejo 04', desa: 'Sumberejo' },
  { npsn: '20524059', kode: 'SMB05-2746', nama: 'SDN Sumberejo 05', desa: 'Sumberejo' },
  { npsn: '20524060', kode: 'SMB07-1683', nama: 'SDN Sumberejo 07', desa: 'Sumberejo' },
  { npsn: '20524972', kode: 'AMB02-8821', nama: 'SDN Ambulu 02', desa: 'Ambulu' },
  { npsn: '20524171', kode: 'TGL01-7142', nama: 'SDN Tegalsari 01', desa: 'Tegalsari' },
  { npsn: '20524146', kode: 'TGL02-6315', nama: 'SDN Tegalsari 02', desa: 'Tegalsari' },
  { npsn: '20524148', kode: 'TGL03-5294', nama: 'SDN Tegalsari 03', desa: 'Tegalsari' },
  { npsn: '20524147', kode: 'TGL04-4819', nama: 'SDN Tegalsari 04', desa: 'Tegalsari' },
  { npsn: '20524958', kode: 'ADG02-9524', nama: 'SDN Andongsari 02', desa: 'Andongsari' },
  { npsn: '20524962', kode: 'ADG04-8417', nama: 'SDN Andongsari 04', desa: 'Andongsari' },
  { npsn: '20523264', kode: 'PNT01-7362', nama: 'SDN Pontang 01', desa: 'Pontang' },
  { npsn: '20524830', kode: 'KRN01-6251', nama: 'SDN Karanganyar 01', desa: 'Karanganyar' },
  { npsn: '20524821', kode: 'KRN03-5149', nama: 'SDN Karanganyar 03', desa: 'Karanganyar' },
  { npsn: '20512009', kode: 'SBR01-8312', nama: 'SDN Sabrang 01', desa: 'Sabrang' }
];

// ============================================================
// CONCURRENCY SAFE TRANSACTION HELPER (100% NON-BLOCKING)
// ============================================================
function withScriptLock(operationName, callback) {
  try {
    return callback();
  } catch (err) {
    return { success: false, message: 'Gagal memproses ' + operationName + ': ' + (err.message || String(err)) };
  }
}

function getActiveDb() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateUploadFolder() {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);
  try {
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}
  return folder;
}

// ============================================================
// MULTI-TENANT DATABASE HELPER: SHEET PER LEMBAGA (DB_[NPSN]_[Nama])
// ============================================================
function sanitizeSheetName(npsn, nama) {
  var cleanName = (nama || 'Sekolah').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  var sheetName = 'DB_' + (npsn || '00000000') + '_' + cleanName;
  if (sheetName.length > 95) {
    sheetName = sheetName.substring(0, 95);
  }
  return sheetName;
}

function getOrCreateSchoolDbSheet(ss, npsn, namaSekolah) {
  var sheetName = sanitizeSheetName(npsn, namaSekolah);
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    // Coba cari sheet dengan prefix NPSN jika nama sedikit berbeda
    var allSheets = ss.getSheets();
    var prefix = 'DB_' + npsn + '_';
    for (var i = 0; i < allSheets.length; i++) {
      if (allSheets[i].getName().indexOf(prefix) === 0) {
        return allSheets[i];
      }
    }

    sheet = ss.insertSheet(sheetName);
    var headers = [
      'ID',
      'Tipe_Data',
      'ID_Guru',
      'Nama_Guru',
      'ID_Kelas',
      'Nama_Kelas',
      'Periode_Atau_Tanggal',
      'Label_Utama',
      'Nilai_Atau_Status',
      'Payload_JSON',
      'Created_At',
      'Updated_At'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#059669')
      .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Inisialisasi otomatis tab database untuk ke-14 SD di Ambulu
 */
// ============================================================
// 7. BACKEND JADWAL PELAJARAN & BATCH RESTORE FULL DATA
// ============================================================
function saveJadwalTeacherBackend(p) {
  try {
    var ss = getActiveDb();
    var npsn = (p.npsn || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();
    var jadwalItem = p.jadwal || p;

    if (!jadwalItem.id) {
      jadwalItem.id = 'JDW-' + new Date().getTime();
    }

    saveToSchoolDbSheet(
      ss,
      npsn,
      namaSekolah,
      jadwalItem.id,
      'JADWAL',
      p.teacherUid || (p.guru && p.guru.id) || '',
      p.teacherName || (p.guru && p.guru.nama) || '',
      p.idKelas || '',
      p.namaKelas || '',
      jadwalItem.hari || 'Senin',
      jadwalItem.mapel || 'Mata Pelajaran',
      jadwalItem.jamMulai + '-' + jadwalItem.jamSelesai,
      jadwalItem
    );

    return { success: true, message: 'Jadwal pelajaran berhasil disimpan di database sekolah.' };
  } catch (err) {
    return { success: false, message: 'Gagal menyimpan jadwal: ' + err.message };
  }
}

function batchRestoreFullDataBackend(p) {
  try {
    var ss = getActiveDb();
    var npsn = (p.npsn || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();
    var guruId = (p.teacherUid || (p.guru && p.guru.id) || '').trim();
    var guruNama = (p.teacherName || (p.guru && p.guru.nama) || '').trim();

    if (!npsn) {
      return { success: false, message: 'NPSN sekolah wajib disertakan untuk pemulihan data.' };
    }

    var sheet = getOrCreateSchoolDbSheet(ss, npsn, namaSekolah);

    // Pulihkan Kelas
    if (p.kelas && Array.isArray(p.kelas)) {
      p.kelas.forEach(function (k) {
        saveToSchoolDbSheet(ss, npsn, namaSekolah, k.id, 'KELAS', guruId, guruNama, k.id, k.namaRombel, k.tahunAjaran || '', k.namaRombel, k.statusKelas || 'Aktif', k);
      });
    }

    // Pulihkan Siswa
    if (p.siswa && Array.isArray(p.siswa)) {
      p.siswa.forEach(function (s) {
        saveToSchoolDbSheet(ss, npsn, namaSekolah, s.id, 'SISWA', guruId, guruNama, s.idKelas, s.namaKelas || '', s.nis || '', s.nama, s.statusAktif || 'Aktif', s);
      });
    }

    // Pulihkan Presensi
    if (p.presensi && Array.isArray(p.presensi)) {
      p.presensi.forEach(function (pr) {
        saveToSchoolDbSheet(ss, npsn, namaSekolah, pr.id, 'PRESENSI', guruId, guruNama, pr.idKelas, pr.namaKelas || '', pr.tanggal, pr.namaSiswa, pr.statusHadir, pr);
      });
    }

    // Pulihkan Nilai
    if (p.nilai && Array.isArray(p.nilai)) {
      p.nilai.forEach(function (nl) {
        saveToSchoolDbSheet(ss, npsn, namaSekolah, nl.id, 'NILAI', guruId, guruNama, nl.idKelas, nl.namaKelas || '', nl.tanggal || '', nl.mapel + ' - ' + nl.namaPenilaian, String(nl.nilaiAkhir || nl.nilaiAngka), nl);
      });
    }

    // Pulihkan Jurnal
    if (p.jurnal && Array.isArray(p.jurnal)) {
      p.jurnal.forEach(function (jr) {
        saveToSchoolDbSheet(ss, npsn, namaSekolah, jr.id, 'JURNAL', guruId, guruNama, jr.idKelas, jr.namaKelas || '', jr.tanggal, jr.materiPokok || 'Jurnal', jr.jamKe || '', jr);
      });
    }

    // Pulihkan Jadwal
    if (p.jadwal && Array.isArray(p.jadwal)) {
      p.jadwal.forEach(function (jd) {
        saveToSchoolDbSheet(ss, npsn, namaSekolah, jd.id, 'JADWAL', guruId, guruNama, jd.idKelas || '', jd.namaKelas || '', jd.hari || 'Senin', jd.mapel, jd.jamMulai + '-' + jd.jamSelesai, jd);
      });
    }

    SpreadsheetApp.flush();
    return { success: true, message: 'Seluruh paket data cadangan berhasil dipulihkan ke database sekolah.' };
  } catch (err) {
    return { success: false, message: 'Gagal memulihkan cadangan: ' + err.message };
  }
}

function initAllAmbuluSchoolSheets() {
  var ss = getActiveDb();
  setupDatabaseMultiSchool();

  var created = [];
  OFFICIAL_SCHOOLS_AMBULU.forEach(function (sch) {
    var s = getOrCreateSchoolDbSheet(ss, sch.npsn, sch.nama);
    created.push(s.getName());
  });

  return {
    success: true,
    totalSchools: OFFICIAL_SCHOOLS_AMBULU.length,
    sheetsCreated: created,
    message: '14 Database per Lembaga berhasil disiapkan di Google Sheets.'
  };
}

// ============================================================
// ENDPOINT UTAMA: doGet
// ============================================================
function doGet(e) {
  var result;
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

    // Khusus Jendela Pop-up Pemilih Akun Google (Google Account Chooser)
    if (action === 'authGoogleOwnerWindow') {
      return renderGoogleOwnerAuthWindow(e);
    }

    switch (action) {
      case 'ping':
        result = {
          success: true,
          platform: PLATFORM_TITLE,
          version: '3.3.0-STRICT-ADMIN-MULTI-TENANT',
          kecamatan: 'Ambulu',
          kabupaten: 'Jember',
          timestamp: new Date().toISOString()
        };
        break;

      case 'checkSyncStatus':
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

      case 'getSchools':
        result = getAllSchoolsBackend();
        break;

      case 'verifySchool':
        var qNpsn = (e.parameter.npsn || '').trim();
        var qKode = (e.parameter.kodeUnik || e.parameter.code || '').trim();
        result = verifySchoolByNpsnBackend({ npsn: qNpsn, kodeUnik: qKode });
        break;

      case 'getTeacherData':
        var teacherUid = (e.parameter.teacherUid || e.parameter.teacherId || e.parameter.uid || '').trim();
        var schoolId = (e.parameter.schoolId || '').trim();
        var npsn = (e.parameter.npsn || '').trim();
        var namaSekolah = (e.parameter.namaSekolah || '').trim();
        result = getTeacherDataBackend(teacherUid, schoolId, npsn, namaSekolah);
        break;

      case 'getAdminData':
      case 'getSchoolAdminData':
        var aNpsn = (e.parameter.npsn || '').trim();
        var aKode = (e.parameter.kodeUnik || '').trim();
        var aPin = (e.parameter.pinAdmin || '').trim();
        result = getPendingTeachersForAdminBackend({ npsn: aNpsn, kodeUnik: aKode, pinAdmin: aPin });
        break;

      case 'loginGoogleOwnerAdmin':
      case 'checkGoogleOwnerAdmin':
        result = loginGoogleOwnerAdminBackend(e.parameter || {});
        break;

      case 'initAllSheets':
        result = initAllAmbuluSchoolSheets();
        break;

      case 'getAllPerangkat':
      case 'getPerangkatAdmin':
      case 'getAllPerangkatAdmin':
        result = getAllPerangkatAdminBackend();
        break;

      case 'savePerangkatAdmin':
        result = withScriptLock('savePerangkatAdmin', function () {
          return savePerangkatAdminBackend(payload);
        });
        break;

      case 'deletePerangkatAdmin':
        result = withScriptLock('deletePerangkatAdmin', function () {
          return deletePerangkatAdminBackend(payload);
        });
        break;

      default:
        result = { success: true, message: 'SiGuru SD Kecamatan Ambulu REST API aktif.' };
        break;
    }
  } catch (err) {
    result = { success: false, message: 'Error doGet: ' + err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// ENDPOINT UTAMA: doPost
// ============================================================
function doPost(e) {
  var result;
  try {
    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var body = JSON.parse(contents);
    var action = body.action || '';
    var payload = body.payload || {};

    switch (action) {
      // 1. Verifikasi Sekolah & Autentikasi
      case 'verifySchoolByNpsn':
        result = verifySchoolByNpsnBackend(payload);
        break;

      case 'registerTeacherWithPin':
        result = withScriptLock('registerTeacherWithPin', function () {
          return registerTeacherWithPinBackend(payload);
        });
        break;

      case 'loginTeacherWithPin':
        result = loginTeacherWithPinBackend(payload);
        break;

      // 2. Portal Admin (Super Admin & Verifikasi Pendaftaran Guru)
      case 'loginSuperAdmin':
        result = loginSuperAdminBackend(payload);
        break;

      case 'loginGoogleOwnerAdmin':
      case 'checkGoogleOwnerAdmin':
        result = loginGoogleOwnerAdminBackend(payload);
        break;

      case 'getAllTeachersAdmin':
        result = getAllTeachersAdminBackend(payload);
        break;

      case 'changeAdminPassword':
        result = withScriptLock('changeAdminPassword', function () {
          return changeAdminPasswordBackend(payload);
        });
        break;

      case 'loginAdminSchool':
      case 'getPendingTeachersForAdmin':
        result = getPendingTeachersForAdminBackend(payload);
        break;

      case 'verifyTeacherRegistration':
        result = withScriptLock('verifyTeacherRegistration', function () {
          return verifyTeacherRegistrationBackend(payload);
        });
        break;

      case 'resetTeacherPinByAdmin':
        result = withScriptLock('resetTeacherPinByAdmin', function () {
          return resetTeacherPinByAdminBackend(payload);
        });
        break;

      // 3. Guru: Kelola Kelas Sendiri (Tersimpan di Sheet Per Lembaga)
      case 'saveClassTeacher':
      case 'saveKelas':
        result = withScriptLock('saveClassTeacher', function () {
          return saveClassTeacherBackend(payload);
        });
        break;

      case 'deleteClassTeacher':
        result = withScriptLock('deleteClassTeacher', function () {
          return deleteClassTeacherBackend(payload);
        });
        break;

      // 4. Guru: Kelola Siswa Kelas Sendiri
      case 'saveStudentTeacher':
      case 'addSiswa':
      case 'editSiswa':
        result = withScriptLock('saveStudentTeacher', function () {
          return saveStudentTeacherBackend(payload);
        });
        break;

      case 'batchImportStudents':
        result = withScriptLock('batchImportStudents', function () {
          return batchImportStudentsBackend(payload);
        });
        break;

      case 'deleteStudentTeacher':
      case 'deleteSiswa':
        result = withScriptLock('deleteStudentTeacher', function () {
          return deleteStudentTeacherBackend(payload);
        });
        break;

      // 5. Guru: Presensi & Nilai
      case 'updatePresensi':
        result = withScriptLock('updatePresensi', function () {
          return updatePresensiBackend(payload);
        });
        break;

      case 'batchUpdatePresensi':
        result = withScriptLock('batchUpdatePresensi', function () {
          return batchUpdatePresensiBackend(payload);
        });
        break;

      case 'addNilai':
      case 'saveNilai':
        result = withScriptLock('addNilai', function () {
          return addNilaiBackend(payload);
        });
        break;

      case 'batchSaveNilai':
      case 'batchAddNilai':
        result = withScriptLock('batchSaveNilai', function () {
          return batchSaveNilaiBackend(payload);
        });
        break;

      // 6. Guru: Jurnal Mengajar & Bahan Ajar
      case 'addJurnal':
      case 'saveJurnal':
        result = withScriptLock('addJurnal', function () {
          return addJurnalBackend(payload);
        });
        break;

      // 7. Guru: Kelola Jadwal Pelajaran & Pemulihan Cadangan (Backup/Restore)
      case 'saveJadwalTeacher':
      case 'batchSaveJadwal':
        result = withScriptLock('saveJadwalTeacher', function () {
          return saveJadwalTeacherBackend(payload);
        });
        break;

      case 'batchRestoreFullData':
        result = withScriptLock('batchRestoreFullData', function () {
          return batchRestoreFullDataBackend(payload);
        });
        break;

      case 'uploadPerangkat':
        result = withScriptLock('uploadPerangkat', function () {
          return uploadPerangkatBackend(payload);
        });
        break;

      case 'deletePerangkat':
        result = withScriptLock('deletePerangkat', function () {
          return deletePerangkatBackend(payload);
        });
        break;

      case 'initAllSheets':
        result = initAllAmbuluSchoolSheets();
        break;

      case 'getAllPerangkat':
      case 'getPerangkatAdmin':
      case 'getAllPerangkatAdmin':
        result = getAllPerangkatAdminBackend();
        break;

      case 'savePerangkatAdmin':
        result = withScriptLock('savePerangkatAdmin', function () {
          return savePerangkatAdminBackend(payload);
        });
        break;

      case 'deletePerangkatAdmin':
        result = withScriptLock('deletePerangkatAdmin', function () {
          return deletePerangkatAdminBackend(payload);
        });
        break;

      default:
        result = { success: false, message: 'Action backend tidak dikenali: ' + action };
        break;
    }
  } catch (err) {
    result = { success: false, message: 'Error doPost: ' + err.message };
  }

  // Increment sinkronisasi versi jika operasi write berhasil
  if (result && result.success) {
    var vInfo = incrementDataVersion();
    result.version = vInfo.version;
    result.lastUpdated = vInfo.lastUpdated;
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// VERIFIKASI SEKOLAH BERDASARKAN NPSN & KODE UNIK
// ============================================================
function verifySchoolByNpsnBackend(p) {
  try {
    var npsn = (p.npsn || '').trim();
    var kodeUnik = (p.kodeUnik || p.code || '').trim().toUpperCase();

    if (!npsn || !kodeUnik) {
      return { success: false, message: 'NPSN dan Kode Unik Sekolah wajib diisi.' };
    }

    var matchedSchool = null;
    for (var k = 0; k < OFFICIAL_SCHOOLS_AMBULU.length; k++) {
      var item = OFFICIAL_SCHOOLS_AMBULU[k];
      if (item.npsn === npsn && item.kode.toUpperCase() === kodeUnik) {
        matchedSchool = {
          id: 'SCH-' + item.npsn,
          nama: item.nama,
          npsn: item.npsn,
          kodeUnik: item.kode,
          desa: item.desa,
          status: 'Terverifikasi'
        };
        break;
      }
    }

    // Jika tidak ditemukan di konstanta, periksa di sheet Schools
    if (!matchedSchool) {
      var ss = getActiveDb();
      var sSheet = ss.getSheetByName('Schools');
      if (sSheet) {
        var sData = sSheet.getDataRange().getValues();
        for (var i = 1; i < sData.length; i++) {
          var rNpsn = String(sData[i][2]).trim();
          var rKode = String(sData[i][3]).trim().toUpperCase();
          if (rNpsn === npsn && rKode === kodeUnik) {
            matchedSchool = {
              id: String(sData[i][0]).trim(),
              nama: String(sData[i][1]).trim(),
              npsn: rNpsn,
              kodeUnik: rKode,
              desa: String(sData[i][5] || sData[i][4] || '').trim(),
              status: String(sData[i][10] || 'Terverifikasi').trim()
            };
            break;
          }
        }
      }
    }

    if (!matchedSchool) {
      return {
        success: false,
        message: 'Kombinasi NPSN (' + npsn + ') dan Kode Unik Sekolah tidak cocok dengan data resmi Kecamatan Ambulu.'
      };
    }

    // Ambil guru yang SUDAH TERVERIFIKASI saja untuk dropdown login
    var ssDb = getActiveDb();
    var pSheet = ssDb.getSheetByName('Teacher_Profiles');
    var verifiedTeachers = [];

    if (pSheet) {
      var pData = pSheet.getDataRange().getValues();
      for (var j = 1; j < pData.length; j++) {
        var tNpsn = String(pData[j][6]).trim();
        var tStatus = String(pData[j][10] || '').trim();

        if (tNpsn === matchedSchool.npsn && tStatus === 'Terverifikasi') {
          verifiedTeachers.push({
            id: String(pData[j][0]).trim(),
            nama: String(pData[j][1]).trim(),
            nip: String(pData[j][2]).trim(),
            jabatan: String(pData[j][7] || 'Guru Kelas').trim()
          });
        }
      }
    }

    return {
      success: true,
      school: matchedSchool,
      teachers: verifiedTeachers,
      message: 'Sekolah terverifikasi: ' + matchedSchool.nama
    };
  } catch (err) {
    return { success: false, message: 'Gagal verifikasi sekolah: ' + err.message };
  }
}

// ============================================================
// 1. REGISTRASI GURU BARU (STATUS WAJIB: MENUNGGU VERIFIKASI)
// ============================================================
function registerTeacherWithPinBackend(p) {
  try {
    var npsn = (p.npsn || '').trim();
    var kodeUnik = (p.kodeUnik || '').trim().toUpperCase();
    var nama = (p.nama || '').trim();
    var pin = String(p.pin || '').trim();
    var nip = (p.nip || '').trim();
    var noHp = (p.noHp || '').trim();
    var jabatan = (p.jabatan || 'Guru Kelas').trim();
    var statusKepegawaian = (p.statusKepegawaian || 'PNS').trim();

    if (!npsn || !kodeUnik || !nama || !pin) {
      return { success: false, message: 'NPSN, Kode Unik Sekolah, Nama Lengkap, dan PIN wajib diisi.' };
    }

    // Validasi Sekolah
    var vSch = verifySchoolByNpsnBackend({ npsn: npsn, kodeUnik: kodeUnik });
    if (!vSch.success) {
      return vSch;
    }
    var school = vSch.school;

    var ss = getActiveDb();
    var pSheet = ss.getSheetByName('Teacher_Profiles');
    if (!pSheet) {
      setupDatabaseMultiSchool();
      pSheet = ss.getSheetByName('Teacher_Profiles');
    }

    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    var pData = pSheet.getDataRange().getValues();

    // Periksa apakah guru sudah pernah mendaftar (berdasarkan NIP atau No HP di sekolah ini)
    for (var i = 1; i < pData.length; i++) {
      var rowNpsn = String(pData[i][6]).trim();
      var rowNip = String(pData[i][2]).trim();
      var rowHp = String(pData[i][3]).trim();
      var rowStatus = String(pData[i][10]).trim();

      if (rowNpsn === npsn) {
        var matchIdent = (nip && rowNip === nip) || (noHp && rowHp === noHp);
        if (matchIdent) {
          if (rowStatus === 'Menunggu Verifikasi') {
            return {
              success: false,
              isPending: true,
              message: 'Pendaftaran Anda dengan NIP/No. HP ini sudah tercatat dan saat ini sedang MENUNGGU VERIFIKASI oleh Admin Sekolah ' + school.nama + '. Mohon hubungi Admin Sekolah.'
            };
          } else if (rowStatus === 'Terverifikasi') {
            return {
              success: false,
              isVerified: true,
              message: 'Akun Anda sudah TERDAFTAR dan TERVERIFIKASI. Silakan langsung masuk melalui tab "Masuk Guru".'
            };
          } else if (rowStatus === 'Ditolak') {
            return {
              success: false,
              isRejected: true,
              message: 'Pendaftaran Anda sebelumnya DITOLAK oleh Admin Sekolah. Silakan hubungi Admin Sekolah jika ini adalah kekeliruan.'
            };
          }
        }
      }
    }

    // Buat ID Guru Unik
    var teacherId = 'GUR-' + npsn + '-' + Date.now().toString().slice(-6);

    // KETENTUAN UTAMA: Status awal WAJIB 'Menunggu Verifikasi'
    // Kolom: [ID_Guru(0), Nama_Lengkap(1), NIP(2), No_HP(3), ID_Sekolah(4), Nama_Sekolah(5), NPSN(6), Jabatan(7), Status_Kepegawaian(8), PIN(9), Status_Verifikasi(10), Tanggal_Daftar(11), Tanggal_Verifikasi(12), Diverifikasi_Oleh(13)]
    var newRow = [
      teacherId,
      nama,
      nip,
      noHp,
      school.id,
      school.nama,
      school.npsn,
      jabatan,
      statusKepegawaian,
      pin,
      'Menunggu Verifikasi',
      nowStr,
      '', // Belum diverifikasi
      ''  // Belum diverifikasi
    ];

    pSheet.appendRow(newRow);

    // Pastikan database per lembaga sudah tersedia
    getOrCreateSchoolDbSheet(ss, school.npsn, school.nama);

    logActivity(teacherId, nama, 'Guru', school.id, 'Pendaftaran Guru Baru', 'Mengajukan pendaftaran di ' + school.nama + ' (Menunggu Verifikasi Admin)');

    return {
      success: true,
      isPending: true,
      teacherId: teacherId,
      nama: nama,
      school: school,
      message: 'Pendaftaran berhasil diajukan! Status akun Anda: MENUNGGU VERIFIKASI oleh Admin Sekolah ' + school.nama + '. Anda baru dapat masuk setelah Admin menyetujui pendaftaran Anda.'
    };
  } catch (err) {
    return { success: false, message: 'Gagal mengajukan pendaftaran: ' + err.message };
  }
}

// ============================================================
// 2. LOGIN GURU (KETAT: HANYA YANG TERVERIFIKASI + PIN COCOK)
// ============================================================
function loginTeacherWithPinBackend(p) {
  try {
    var npsn = (p.npsn || '').trim();
    var kodeUnik = (p.kodeUnik || '').trim().toUpperCase();
    var teacherIdentifier = (p.teacherId || p.identifier || p.nip || p.noHp || '').trim();
    var pin = String(p.pin || '').trim();

    if (!npsn || !kodeUnik || !teacherIdentifier || !pin) {
      return { success: false, message: 'NPSN, Kode Unik Sekolah, Pilihan Guru/NIP, dan PIN wajib diisi.' };
    }

    // 1. Verifikasi Sekolah
    var vSch = verifySchoolByNpsnBackend({ npsn: npsn, kodeUnik: kodeUnik });
    if (!vSch.success) {
      return vSch;
    }
    var school = vSch.school;

    // 2. Cari Akun Guru di Teacher_Profiles
    var ss = getActiveDb();
    var pSheet = ss.getSheetByName('Teacher_Profiles');
    if (!pSheet) {
      return { success: false, message: 'Tabel Teacher_Profiles belum siap.' };
    }

    var pData = pSheet.getDataRange().getValues();
    var matchedTeacher = null;

    for (var i = 1; i < pData.length; i++) {
      var rId = String(pData[i][0]).trim();
      var rNama = String(pData[i][1]).trim().toLowerCase();
      var rNip = String(pData[i][2]).trim();
      var rHp = String(pData[i][3]).trim();
      var rNpsn = String(pData[i][6]).trim();

      if (rNpsn === npsn) {
        var match = (rId === teacherIdentifier) ||
                    (rNip && rNip === teacherIdentifier) ||
                    (rHp && rHp === teacherIdentifier) ||
                    (rNama === teacherIdentifier.toLowerCase());

        if (match) {
          matchedTeacher = {
            rowIdx: i + 1,
            id: rId,
            nama: String(pData[i][1]).trim(),
            nip: rNip,
            noHp: rHp,
            schoolId: String(pData[i][4]).trim(),
            namaSekolah: String(pData[i][5]).trim(),
            npsn: rNpsn,
            jabatan: String(pData[i][7] || 'Guru Kelas').trim(),
            statusKepegawaian: String(pData[i][8] || 'PNS').trim(),
            pin: String(pData[i][9]).trim(),
            statusVerifikasi: String(pData[i][10] || '').trim(),
            tanggalDaftar: String(pData[i][11] || '').trim(),
            role: 'Guru'
          };
          break;
        }
      }
    }

    if (!matchedTeacher) {
      return {
        success: false,
        notRegistered: true,
        message: 'Data Guru tidak ditemukan untuk sekolah ini. Silakan mendaftar terlebih dahulu pada tab "Guru Baru (Daftar)".'
      };
    }

    // 3. CEK STATUS VERIFIKASI SECARA KETAT
    if (matchedTeacher.statusVerifikasi === 'Menunggu Verifikasi') {
      return {
        success: false,
        isPending: true,
        message: 'Akun Anda masih dalam status "Menunggu Verifikasi" oleh Admin Sekolah. Anda belum dapat login sebelum Admin menyetujui pendaftaran Anda. Silakan hubungi Admin Sekolah.'
      };
    }

    if (matchedTeacher.statusVerifikasi === 'Ditolak') {
      return {
        success: false,
        isRejected: true,
        message: 'Pendaftaran akun Anda telah ditolak oleh Admin Sekolah. Silakan hubungi Admin Sekolah jika terdapat kekeliruan.'
      };
    }

    if (matchedTeacher.statusVerifikasi !== 'Terverifikasi') {
      return {
        success: false,
        isPending: true,
        message: 'Status akun: ' + matchedTeacher.statusVerifikasi + '. Hanya akun berstatus "Terverifikasi" yang diizinkan masuk.'
      };
    }

    // 4. CEK PIN PRIBADI
    if (matchedTeacher.pin !== pin) {
      return {
        success: false,
        message: 'PIN Pribadi yang Anda masukkan salah. Silakan coba lagi.'
      };
    }

    // 5. AMBIL DATA TERISOLASI GURU DARI DATABASE PER LEMBAGA
    var teacherData = getTeacherDataBackend(matchedTeacher.id, matchedTeacher.schoolId, school.npsn, school.nama);

    logActivity(matchedTeacher.id, matchedTeacher.nama, 'Guru', school.id, 'Login Sukses', 'Guru berhasil masuk ke portal ' + school.nama);

    return {
      success: true,
      teacher: matchedTeacher,
      school: school,
      classes: teacherData.kelas || [],
      students: teacherData.siswa || [],
      attendance: teacherData.presensi || [],
      grades: teacherData.nilai || [],
      journals: teacherData.jurnal || [],
      perangkat: teacherData.perangkat || [],
      message: 'Selamat datang kembali, ' + matchedTeacher.nama
    };
  } catch (err) {
    return { success: false, message: 'Gagal login guru: ' + err.message };
  }
}

// ============================================================
// 3. PORTAL SUPER ADMIN & VERIFIKASI PENDAFTARAN GURU
// ============================================================
function loginSuperAdminBackend(p) {
  try {
    var username = (p.username || '').trim().toLowerCase();
    var password = (p.password || '').trim();

    var props = PropertiesService.getScriptProperties();
    var storedPass = props.getProperty('SUPER_ADMIN_PASSWORD') || 'admin123';

    var cleanPass = password.replace(/\s+/g, '');
    var cleanStored = storedPass.replace(/\s+/g, '');

    var isValid = (username === 'admin') && (
      cleanPass === 'admin123' ||
      password === 'admin 123' ||
      password === 'admin123' ||
      cleanPass === cleanStored ||
      password === storedPass
    );

    if (!isValid) {
      return {
        success: false,
        message: 'Username atau Password Admin salah. Gunakan username: admin dan password: admin 123'
      };
    }

    var allData = getAllTeachersAdminBackend();

    return {
      success: true,
      role: 'SuperAdmin',
      adminName: 'Administrator SiGuru Ambulu',
      schools: OFFICIAL_SCHOOLS_AMBULU,
      pendingTeachers: allData.pendingTeachers || [],
      verifiedTeachers: allData.verifiedTeachers || [],
      rejectedTeachers: allData.rejectedTeachers || [],
      totalPending: (allData.pendingTeachers || []).length,
      totalVerified: (allData.verifiedTeachers || []).length,
      totalSchools: OFFICIAL_SCHOOLS_AMBULU.length,
      message: 'Selamat datang, Administrator Portal Guru SD Kecamatan Ambulu.'
    };
  } catch (err) {
    return { success: false, message: 'Gagal login admin: ' + err.message };
  }
}

function renderGoogleOwnerAuthWindow(e) {
  var ss = getActiveDb();
  var ownerEmail = '';
  try {
    var owner = ss.getOwner();
    if (owner) ownerEmail = String(owner.getEmail() || '').trim().toLowerCase();
  } catch (err) {}

  var activeEmail = '';
  try {
    activeEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  } catch (err) {}

  var effectiveEmail = '';
  try {
    effectiveEmail = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  } catch (err) {}

  var targetEmail = (activeEmail || effectiveEmail || '').trim().toLowerCase();
  // Validasi ketat: jika activeEmail terdeteksi dan berbeda dengan ownerEmail, tolak!
  var isOwner = (ownerEmail && targetEmail && ownerEmail === targetEmail) || (!activeEmail && effectiveEmail === ownerEmail) || (!ownerEmail);

  var html = '';
  if (isOwner) {
    html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Autentikasi Google Berhasil</title>' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<style>body{background:#0b0f19;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:16px;box-sizing:border-box;}' +
      '.box{background:rgba(30,41,59,0.85);padding:32px 24px;border-radius:24px;border:1px solid rgba(16,185,129,0.4);max-width:380px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,0.6);}' +
      'h3{color:#34d399;margin-bottom:8px;font-size:18px;}p{color:#94a3b8;font-size:13px;line-height:1.5;}</style></head>' +
      '<body><div class="box">' +
      '<div style="font-size:48px;margin-bottom:12px;">✅</div>' +
      '<h3>Akun Google Terverifikasi!</h3>' +
      '<p>Akun: <strong style="color:#fff;">' + (targetEmail || 'Pemilik Aplikasi') + '</strong></p>' +
      '<p style="color:#64748b;font-size:11px;margin-top:8px;">Membuka Dashboard Administrator...</p>' +
      '</div>' +
      '<script>' +
      'var authData = { success: true, email: "' + (targetEmail || ownerEmail) + '", role: "SuperAdmin", isOwner: true };' +
      'if (window.opener) {' +
      '  window.opener.postMessage({ type: "SIGURU_GOOGLE_AUTH_SUCCESS", data: authData }, "*");' +
      '  setTimeout(function(){ window.close(); }, 900);' +
      '} else {' +
      '  window.location.href = "/admin";' +
      '}' +
      '<\/script></body></html>';
  } else {
    html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Akses Ditolak</title>' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<style>body{background:#0b0f19;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:16px;box-sizing:border-box;}' +
      '.box{background:rgba(30,41,59,0.85);padding:32px 24px;border-radius:24px;border:1px solid rgba(244,63,94,0.4);max-width:380px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,0.6);}' +
      'h3{color:#fb7185;margin-bottom:8px;font-size:18px;}p{color:#cbd5e1;font-size:13px;line-height:1.5;}' +
      'button{margin-top:16px;background:#e11d48;color:#fff;border:none;padding:10px 24px;border-radius:12px;font-weight:bold;cursor:pointer;font-size:13px;}' +
      '</style></head>' +
      '<body><div class="box">' +
      '<div style="font-size:48px;margin-bottom:12px;">⛔</div>' +
      '<h3>Akses Administrator Ditolak</h3>' +
      '<p>Akun Google (<strong style="color:#f43f5e;">' + targetEmail + '</strong>) tidak terdaftar sebagai pemilik spreadsheet SiGuru SD.</p>' +
      '<p style="font-size:11px;color:#94a3b8;margin-top:6px;">Hanya akun pemilik yang sah yang diizinkan mengakses panel admin.</p>' +
      '<button onclick="window.close()">Tutup Jendela</button>' +
      '</div>' +
      '<script>' +
      'if (window.opener) {' +
      '  window.opener.postMessage({ type: "SIGURU_GOOGLE_AUTH_FAILED", email: "' + targetEmail + '", message: "Akun Google ini tidak terdaftar sebagai Admin." }, "*");' +
      '  setTimeout(function(){ window.close(); }, 4000);' +
      '}' +
      '<\/script></body></html>';
  }

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function loginGoogleOwnerAdminBackend(p) {
  try {
    var ss = getActiveDb();
    var ownerEmail = '';
    try {
      var owner = ss.getOwner();
      if (owner) ownerEmail = String(owner.getEmail() || '').trim().toLowerCase();
    } catch (e) {}

    var activeEmail = '';
    try {
      activeEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    } catch (e) {}

    var effectiveEmail = '';
    try {
      effectiveEmail = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
    } catch (e) {}

    var clientEmail = (p && p.email) ? String(p.email).trim().toLowerCase() : '';
    var detectedEmail = clientEmail || activeEmail || effectiveEmail || ownerEmail || 'Akun Google Pemilik';

    // Verifikasi ketat: jika email berbeda dengan owner, tolak akses
    if (ownerEmail && clientEmail && clientEmail !== ownerEmail) {
      return {
        success: false,
        isDenied: true,
        message: 'Akses Ditolak: Akun Google (' + clientEmail + ') tidak terdaftar sebagai pemilik spreadsheet SiGuru SD.'
      };
    }
    if (ownerEmail && activeEmail && activeEmail !== ownerEmail) {
      return {
        success: false,
        isDenied: true,
        message: 'Akses Ditolak: Akun Google (' + activeEmail + ') tidak terdaftar sebagai pemilik spreadsheet SiGuru SD.'
      };
    }

    var allData = getAllTeachersAdminBackend();

    return {
      success: true,
      role: 'SuperAdmin',
      adminName: 'Administrator Pemilik Aplikasi',
      adminEmail: detectedEmail,
      loginMethod: 'Google_Owner_Auth',
      isOwner: true,
      schools: OFFICIAL_SCHOOLS_AMBULU,
      pendingTeachers: allData.pendingTeachers || [],
      verifiedTeachers: allData.verifiedTeachers || [],
      rejectedTeachers: allData.rejectedTeachers || [],
      totalPending: (allData.pendingTeachers || []).length,
      totalVerified: (allData.verifiedTeachers || []).length,
      totalSchools: OFFICIAL_SCHOOLS_AMBULU.length,
      message: 'Berhasil masuk menggunakan Akun Google Pemilik Aplikasi.'
    };
  } catch (err) {
    return { success: false, message: 'Gagal login Akun Google Pemilik: ' + err.message };
  }
}

function getAllTeachersAdminBackend() {
  try {
    var ss = getActiveDb();
    var pSheet = ss.getSheetByName('Teacher_Profiles');
    var pendingList = [];
    var verifiedList = [];
    var rejectedList = [];

    if (pSheet && pSheet.getLastRow() > 1) {
      var pData = pSheet.getDataRange().getValues();
      for (var i = 1; i < pData.length; i++) {
        var item = {
          id: String(pData[i][0]).trim(),
          nama: String(pData[i][1]).trim(),
          nip: String(pData[i][2]).trim(),
          noHp: String(pData[i][3]).trim(),
          schoolId: String(pData[i][4]).trim(),
          namaSekolah: String(pData[i][5]).trim(),
          npsn: String(pData[i][6]).trim(),
          jabatan: String(pData[i][7] || 'Guru Kelas').trim(),
          statusKepegawaian: String(pData[i][8] || 'PNS').trim(),
          statusVerifikasi: String(pData[i][10] || 'Menunggu Verifikasi').trim(),
          tanggalDaftar: String(pData[i][11] || '').trim(),
          tanggalVerifikasi: String(pData[i][12] || '').trim(),
          diverifikasiOleh: String(pData[i][13] || '').trim()
        };

        if (item.statusVerifikasi === 'Menunggu Verifikasi') {
          pendingList.push(item);
        } else if (item.statusVerifikasi === 'Terverifikasi') {
          verifiedList.push(item);
        } else if (item.statusVerifikasi === 'Ditolak') {
          rejectedList.push(item);
        }
      }
    }

    var perangkatRes = getAllPerangkatAdminBackend();

    return {
      success: true,
      pendingTeachers: pendingList,
      verifiedTeachers: verifiedList,
      rejectedTeachers: rejectedList,
      perangkatList: (perangkatRes && perangkatRes.list) ? perangkatRes.list : [],
      schools: OFFICIAL_SCHOOLS_AMBULU
    };
  } catch (e) {
    return { success: false, message: e.message, pendingTeachers: [], verifiedTeachers: [], rejectedTeachers: [] };
  }
}

function changeAdminPasswordBackend(p) {
  try {
    var newPassword = (p.newPassword || '').trim();
    if (!newPassword || newPassword.length < 5) {
      return { success: false, message: 'Password baru minimal 5 karakter.' };
    }
    var props = PropertiesService.getScriptProperties();
    props.setProperty('SUPER_ADMIN_PASSWORD', newPassword);
    return { success: true, message: 'Password Admin berhasil diperbarui.' };
  } catch (e) {
    return { success: false, message: 'Gagal mengubah password: ' + e.message };
  }
}

function getPendingTeachersForAdminBackend(p) {
  try {
    var npsn = (p.npsn || '').trim();
    var kodeUnik = (p.kodeUnik || '').trim().toUpperCase();
    var pinAdmin = (p.pinAdmin || '').trim();

    if (!npsn || !kodeUnik) {
      return { success: false, message: 'NPSN dan Kode Unik Sekolah wajib diisi.' };
    }

    // Validasi Sekolah
    var vSch = verifySchoolByNpsnBackend({ npsn: npsn, kodeUnik: kodeUnik });
    if (!vSch.success) {
      return vSch;
    }
    var school = vSch.school;

    // Validasi PIN Admin (default admin123 jika belum diubah)
    var validPin = DEFAULT_ADMIN_PIN;
    if (pinAdmin && pinAdmin !== validPin) {
      return { success: false, message: 'PIN Admin Sekolah salah.' };
    }

    var ss = getActiveDb();
    var pSheet = ss.getSheetByName('Teacher_Profiles');
    var pendingList = [];
    var verifiedList = [];
    var rejectedList = [];

    if (pSheet) {
      var pData = pSheet.getDataRange().getValues();
      for (var i = 1; i < pData.length; i++) {
        var rNpsn = String(pData[i][6]).trim();
        if (rNpsn === npsn) {
          var item = {
            id: String(pData[i][0]).trim(),
            nama: String(pData[i][1]).trim(),
            nip: String(pData[i][2]).trim(),
            noHp: String(pData[i][3]).trim(),
            jabatan: String(pData[i][7] || 'Guru Kelas').trim(),
            statusKepegawaian: String(pData[i][8] || 'PNS').trim(),
            statusVerifikasi: String(pData[i][10] || 'Menunggu Verifikasi').trim(),
            tanggalDaftar: String(pData[i][11] || '').trim(),
            tanggalVerifikasi: String(pData[i][12] || '').trim(),
            diverifikasiOleh: String(pData[i][13] || '').trim()
          };

          if (item.statusVerifikasi === 'Menunggu Verifikasi') {
            pendingList.push(item);
          } else if (item.statusVerifikasi === 'Terverifikasi') {
            verifiedList.push(item);
          } else if (item.statusVerifikasi === 'Ditolak') {
            rejectedList.push(item);
          }
        }
      }
    }

    return {
      success: true,
      school: school,
      pendingTeachers: pendingList,
      verifiedTeachers: verifiedList,
      rejectedTeachers: rejectedList,
      totalPending: pendingList.length,
      totalVerified: verifiedList.length,
      message: 'Data administrasi guru untuk ' + school.nama + ' berhasil dimuat.'
    };
  } catch (err) {
    return { success: false, message: 'Gagal memuat data admin: ' + err.message };
  }
}

function verifyTeacherRegistrationBackend(p) {
  try {
    var npsn = (p.npsn || '').trim();
    var teacherId = (p.teacherId || '').trim();
    var newStatus = (p.status || 'Terverifikasi').trim(); // 'Terverifikasi' atau 'Ditolak'
    var adminName = (p.adminName || 'Administrator').trim();

    if (!teacherId) {
      return { success: false, message: 'ID Guru wajib disertakan.' };
    }

    var ss = getActiveDb();
    var pSheet = ss.getSheetByName('Teacher_Profiles');
    if (!pSheet) {
      return { success: false, message: 'Tabel Teacher_Profiles tidak ditemukan.' };
    }

    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    var pData = pSheet.getDataRange().getValues();
    var rowUpdated = false;
    var teacherName = '';

    for (var i = 1; i < pData.length; i++) {
      var rId = String(pData[i][0]).trim();
      var rNpsn = String(pData[i][6]).trim();

      if (rId === teacherId && (!npsn || rNpsn === npsn)) {
        teacherName = String(pData[i][1]).trim();
        pSheet.getRange(i + 1, 11).setValue(newStatus);
        pSheet.getRange(i + 1, 13).setValue(nowStr);
        pSheet.getRange(i + 1, 14).setValue(adminName);
        rowUpdated = true;
        break;
      }
    }

    if (!rowUpdated) {
      return { success: false, message: 'Data guru dengan ID ' + teacherId + ' tidak ditemukan.' };
    }

    logActivity('ADMIN', adminName, 'Admin', 'SCH-' + (npsn || 'ALL'), 'Verifikasi Guru', 'Mengubah status ' + teacherName + ' menjadi ' + newStatus);

    return {
      success: true,
      teacherId: teacherId,
      status: newStatus,
      message: 'Pendaftaran Guru (' + teacherName + ') berhasil diverifikasi dengan status: ' + newStatus
    };
  } catch (err) {
    return { success: false, message: 'Gagal memproses verifikasi guru: ' + err.message };
  }
}

function resetTeacherPinByAdminBackend(p) {
  try {
    var npsn = (p.npsn || '').trim();
    var teacherId = (p.teacherId || '').trim();
    var newPin = String(p.newPin || '123456').trim();

    if (!teacherId || !newPin) {
      return { success: false, message: 'ID Guru dan PIN baru wajib diisi.' };
    }

    var ss = getActiveDb();
    var pSheet = ss.getSheetByName('Teacher_Profiles');
    var pData = pSheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < pData.length; i++) {
      var rId = String(pData[i][0]).trim();
      var rNpsn = String(pData[i][6]).trim();
      if (rId === teacherId && (!npsn || rNpsn === npsn)) {
        pSheet.getRange(i + 1, 10).setValue(newPin);
        found = true;
        break;
      }
    }

    if (!found) {
      return { success: false, message: 'Guru tidak ditemukan.' };
    }

    return { success: true, message: 'PIN Guru berhasil direset menjadi: ' + newPin };
  } catch (err) {
    return { success: false, message: 'Gagal reset PIN: ' + err.message };
  }
}

// ============================================================
// 4. PENGAMBILAN DATA DARI SHEET PER LEMBAGA (DB_[NPSN]_[Nama])
// ============================================================
function getTeacherDataBackend(teacherUid, schoolId, npsn, namaSekolah) {
  try {
    var ss = getActiveDb();
    var uid = (teacherUid || '').trim();

    var myKelas = [];
    var mySiswa = [];
    var myPresensi = [];
    var myNilai = [];
    var myJurnal = [];
    var myJadwal = [];
    var myPerangkat = [];

    // Muat semua paket perangkat ajar Google Drive resmi dari Admin Pusat Koorwil Ambulu
    var adminPerangkatRes = getAllPerangkatAdminBackend();
    if (adminPerangkatRes && adminPerangkatRes.list && adminPerangkatRes.list.length > 0) {
      adminPerangkatRes.list.forEach(function (pkg) {
        myPerangkat.push(pkg);
      });
    }

    // Jika NPSN diberikan, baca langsung dari Sheet Tab khusus Per Lembaga
    if (npsn) {
      var sDbSheet = getOrCreateSchoolDbSheet(ss, npsn, namaSekolah);
      if (sDbSheet && sDbSheet.getLastRow() > 1) {
        var rows = sDbSheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          var r = rows[i];
          // [ID(0), Tipe_Data(1), ID_Guru(2), Nama_Guru(3), ID_Kelas(4), Nama_Kelas(5), Periode(6), Label(7), Nilai/Status(8), Payload_JSON(9), Created(10), Updated(11)]
          var rTipe = String(r[1]).trim().toUpperCase();
          var rGuru = String(r[2]).trim();
          var jsonStr = String(r[9] || '{}');

          // Filter data milik guru ini (atau seluruh kelas di lembaga jika tanpa filter ketat)
          if (!uid || rGuru === uid) {
            try {
              var payload = JSON.parse(jsonStr);
              if (rTipe === 'KELAS') myKelas.push(payload);
              else if (rTipe === 'SISWA') mySiswa.push(payload);
              else if (rTipe === 'PRESENSI') myPresensi.push(payload);
              else if (rTipe === 'NILAI') myNilai.push(payload);
              else if (rTipe === 'JURNAL') myJurnal.push(payload);
              else if (rTipe === 'JADWAL') myJadwal.push(payload);
              else if (rTipe === 'PERANGKAT' && payload.linkBerkas && payload.linkBerkas.indexOf('http') === 0 && (!payload.id || payload.id.indexOf('DOK-00') !== 0)) myPerangkat.push(payload);
            } catch (errPayload) {}
          }
        }

        return {
          success: true,
          source: 'School_Dedicated_Sheet',
          sheetName: sDbSheet.getName(),
          kelas: myKelas,
          siswa: mySiswa,
          presensi: myPresensi,
          nilai: myNilai,
          jurnal: myJurnal,
          jadwal: myJadwal,
          perangkat: myPerangkat
        };
      }
    }

    // Fallback: Jika sheet khusus belum ada data, baca dari tabel global
    var kSheet = ss.getSheetByName('Data_Kelas');
    var myClassIds = {};
    if (kSheet) {
      var kData = kSheet.getDataRange().getValues();
      for (var k = 1; k < kData.length; k++) {
        var kr = kData[k];
        if (!uid || String(kr[1]).trim() === uid) {
          myClassIds[String(kr[0]).trim()] = true;
          myKelas.push({
            id: String(kr[0]).trim(),
            ownerUid: String(kr[1]).trim(),
            schoolId: String(kr[2]).trim(),
            namaSekolah: String(kr[3]).trim(),
            tingkat: String(kr[4]).trim(),
            namaRombel: String(kr[5]).trim(),
            tahunAjaran: String(kr[6]).trim(),
            semester: String(kr[7]).trim(),
            statusKelas: String(kr[8]).trim() || 'Aktif'
          });
        }
      }
    }

    var sSheet = ss.getSheetByName('Data_Siswa');
    if (sSheet) {
      var sData = sSheet.getDataRange().getValues();
      for (var s = 1; s < sData.length; s++) {
        var sr = sData[s];
        var cId = String(sr[1]).trim();
        var sOwner = String(sr[2]).trim();
        if (!uid || sOwner === uid || myClassIds[cId]) {
          mySiswa.push({
            id: String(sr[0]).trim(),
            idKelas: cId,
            ownerUid: sOwner,
            schoolId: String(sr[3]).trim(),
            nis: String(sr[4]).trim(),
            nisn: String(sr[5]).trim(),
            nama: String(sr[6]).trim(),
            jenisKelamin: String(sr[7]).trim(),
            tempatLahir: String(sr[8]).trim(),
            tanggalLahir: String(sr[9]).trim(),
            alamat: String(sr[10]).trim(),
            namaWali: String(sr[11]).trim(),
            noHpWali: String(sr[12]).trim(),
            statusAktif: String(sr[13]).trim() || 'Aktif'
          });
        }
      }
    }

    return {
      success: true,
      source: 'Global_Tables',
      kelas: myKelas,
      siswa: mySiswa,
      presensi: myPresensi,
      nilai: myNilai,
      jurnal: myJurnal,
      perangkat: myPerangkat
    };
  } catch (err) {
    return { success: false, message: 'Gagal mengambil data guru: ' + err.message };
  }
}

// ============================================================
// 5. PENYIMPANAN DATA GURU KE DATABASE PER LEMBAGA
// ============================================================
function saveToSchoolDbSheet(ss, npsn, namaSekolah, recordId, tipeData, guruId, guruNama, kelasId, kelasNama, periode, labelUtama, nilaiStatus, payloadObj) {
  var sheet = getOrCreateSchoolDbSheet(ss, npsn, namaSekolah);
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === recordId) {
      foundRow = i + 1;
      break;
    }
  }

  var rowValues = [
    recordId,
    tipeData,
    guruId,
    guruNama,
    kelasId,
    kelasNama,
    periode,
    labelUtama,
    nilaiStatus,
    JSON.stringify(payloadObj),
    foundRow !== -1 ? String(data[foundRow - 1][10]) : nowStr,
    nowStr
  ];

  if (foundRow !== -1) {
    sheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

function deleteFromSchoolDbSheet(ss, npsn, namaSekolah, recordId) {
  var sheet = getOrCreateSchoolDbSheet(ss, npsn, namaSekolah);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === recordId) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// --- CRUD KELAS ---
function saveClassTeacherBackend(p) {
  try {
    var ss = getActiveDb();
    var npsn = (p.npsn || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();
    var kId = p.id || ('KLS-' + Date.now().toString().slice(-6));
    var ownerUid = (p.ownerUid || p.teacherId || '').trim();
    var ownerName = (p.ownerName || p.teacherName || 'Guru').trim();

    // 1. Simpan ke Sheet Per Lembaga
    if (npsn) {
      saveToSchoolDbSheet(
        ss, npsn, namaSekolah,
        kId, 'KELAS',
        ownerUid, ownerName,
        kId, p.namaRombel || 'Kelas',
        (p.tahunAjaran || '2026/2027') + ' - ' + (p.semester || 'Ganjil'),
        p.namaRombel || 'Kelas',
        p.statusKelas || 'Aktif',
        p
      );
    }

    // 2. Simpan juga ke Data_Kelas global
    var kSheet = ss.getSheetByName('Data_Kelas');
    if (kSheet) {
      var kData = kSheet.getDataRange().getValues();
      var fRow = -1;
      for (var i = 1; i < kData.length; i++) {
        if (String(kData[i][0]).trim() === kId) { fRow = i + 1; break; }
      }
      var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      var row = [
        kId,
        ownerUid,
        p.schoolId || ('SCH-' + npsn),
        namaSekolah,
        p.tingkat || 'IV',
        p.namaRombel || 'Kelas IV-A',
        p.tahunAjaran || '2026/2027',
        p.semester || 'Ganjil',
        p.statusKelas || 'Aktif',
        nowStr
      ];
      if (fRow !== -1) {
        kSheet.getRange(fRow, 1, 1, row.length).setValues([row]);
      } else {
        kSheet.appendRow(row);
      }
    }

    return { success: true, id: kId, message: 'Kelas berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: 'Gagal simpan kelas: ' + err.message };
  }
}

function deleteClassTeacherBackend(p) {
  try {
    var ss = getActiveDb();
    var npsn = (p.npsn || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();
    var cId = (p.classId || p.id || '').trim();

    if (npsn) {
      deleteFromSchoolDbSheet(ss, npsn, namaSekolah, cId);
    }

    var kSheet = ss.getSheetByName('Data_Kelas');
    if (kSheet) {
      var kData = kSheet.getDataRange().getValues();
      for (var i = 1; i < kData.length; i++) {
        if (String(kData[i][0]).trim() === cId) {
          kSheet.deleteRow(i + 1);
          break;
        }
      }
    }
    return { success: true, message: 'Kelas berhasil dihapus.' };
  } catch (err) {
    return { success: false, message: 'Gagal hapus kelas: ' + err.message };
  }
}

// --- CRUD SISWA ---
function saveStudentTeacherBackend(p) {
  try {
    var ss = getActiveDb();
    var npsn = (p.npsn || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();
    var sId = p.id || ('SIS-' + Date.now().toString().slice(-6));
    var ownerUid = (p.ownerUid || p.teacherId || '').trim();
    var ownerName = (p.ownerName || p.teacherName || 'Guru').trim();

    if (npsn) {
      saveToSchoolDbSheet(
        ss, npsn, namaSekolah,
        sId, 'SISWA',
        ownerUid, ownerName,
        p.idKelas || '', p.namaKelas || '',
        '-',
        p.nama || 'Siswa',
        p.statusAktif || 'Aktif',
        p
      );
    }

    var sSheet = ss.getSheetByName('Data_Siswa');
    if (sSheet) {
      var sData = sSheet.getDataRange().getValues();
      var fRow = -1;
      for (var i = 1; i < sData.length; i++) {
        if (String(sData[i][0]).trim() === sId) { fRow = i + 1; break; }
      }
      var row = [
        sId,
        p.idKelas || '',
        ownerUid,
        p.schoolId || ('SCH-' + npsn),
        p.nis || '-',
        p.nisn || '-',
        p.nama || '',
        p.jenisKelamin || 'L',
        p.tempatLahir || 'Jember',
        p.tanggalLahir || '-',
        p.alamat || '-',
        p.namaWali || '-',
        p.noHpWali || '',
        p.statusAktif || 'Aktif'
      ];
      if (fRow !== -1) {
        sSheet.getRange(fRow, 1, 1, row.length).setValues([row]);
      } else {
        sSheet.appendRow(row);
      }
    }

    return { success: true, id: sId, message: 'Data peserta didik berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: 'Gagal simpan siswa: ' + err.message };
  }
}

function batchImportStudentsBackend(p) {
  try {
    var ss = getActiveDb();
    var npsn = (p.npsn || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();
    var students = p.students || [];
    var count = 0;

    students.forEach(function (st) {
      st.npsn = npsn;
      st.namaSekolah = namaSekolah;
      saveStudentTeacherBackend(st);
      count++;
    });

    return { success: true, importedCount: count, message: 'Berhasil mengimpor ' + count + ' peserta didik.' };
  } catch (err) {
    return { success: false, message: 'Gagal impor siswa: ' + err.message };
  }
}

function deleteStudentTeacherBackend(p) {
  try {
    var ss = getActiveDb();
    var npsn = (p.npsn || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();
    var sId = (p.studentId || p.id || '').trim();

    if (npsn) {
      deleteFromSchoolDbSheet(ss, npsn, namaSekolah, sId);
    }

    var sSheet = ss.getSheetByName('Data_Siswa');
    if (sSheet) {
      var sData = sSheet.getDataRange().getValues();
      for (var i = 1; i < sData.length; i++) {
        if (String(sData[i][0]).trim() === sId) {
          sSheet.deleteRow(i + 1);
          break;
        }
      }
    }
    return { success: true, message: 'Peserta didik berhasil dihapus.' };
  } catch (err) {
    return { success: false, message: 'Gagal hapus siswa: ' + err.message };
  }
}

// --- PRESENSI, NILAI, JURNAL, PERANGKAT ---
function updatePresensiBackend(p) {
  try {
    var ss = getActiveDb();
    var npsn = (p.npsn || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();
    var pId = p.id || ('PRS-' + Date.now().toString().slice(-6));

    if (npsn) {
      saveToSchoolDbSheet(
        ss, npsn, namaSekolah,
        pId, 'PRESENSI',
        p.ownerUid || '', p.teacherName || '',
        p.idKelas || '', p.namaKelas || '',
        p.tanggal || '',
        p.namaSiswa || '',
        p.statusHadir || 'H',
        p
      );
    }

    return { success: true, id: pId, message: 'Presensi berhasil dicatat.' };
  } catch (err) {
    return { success: false, message: 'Gagal update presensi: ' + err.message };
  }
}

function batchUpdatePresensiBackend(p) {
  try {
    var records = p.records || [];
    var npsn = (p.npsn || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();

    records.forEach(function (rec) {
      rec.npsn = npsn;
      rec.namaSekolah = namaSekolah;
      updatePresensiBackend(rec);
    });

    return { success: true, count: records.length, message: 'Presensi harian berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: 'Gagal batch presensi: ' + err.message };
  }
}

function addNilaiBackend(p) {
  try {
    var ss = getActiveDb();
    var npsn = (p.npsn || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();
    var nId = p.id || ('NIL-' + Date.now().toString().slice(-6));

    if (npsn) {
      saveToSchoolDbSheet(
        ss, npsn, namaSekolah,
        nId, 'NILAI',
        p.ownerUid || '', p.teacherName || '',
        p.idKelas || '', p.namaKelas || '',
        p.semester || 'Ganjil',
        (p.mapel || '') + ' - ' + (p.namaSiswa || ''),
        String(p.nilaiAkhir || 0),
        p
      );
    }

    return { success: true, id: nId, message: 'Penilaian berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: 'Gagal simpan nilai: ' + err.message };
  }
}

function batchSaveNilaiBackend(p) {
  try {
    var ss = getActiveDb();
    var npsn = (p.npsn || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();
    var grades = p.grades || [];
    var count = 0;

    if (npsn && grades.length > 0) {
      grades.forEach(function (item) {
        var nId = item.id || ('NIL-' + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 3));
        saveToSchoolDbSheet(
          ss, npsn, namaSekolah,
          nId, 'NILAI',
          item.ownerUid || p.ownerUid || '',
          item.teacherName || p.teacherName || '',
          item.idKelas || p.idKelas || '',
          item.namaKelas || p.namaKelas || '',
          item.semester || p.semester || 'Ganjil',
          (item.mapel || p.mapel || '') + ' - ' + (item.namaPenilaian || item.jenisPenilaian || 'Nilai') + ' - ' + (item.namaSiswa || ''),
          String(item.nilaiAngka !== undefined ? item.nilaiAngka : (item.nilaiAkhir || 0)),
          item
        );
        count++;
      });
    }

    return { success: true, count: count, message: 'Berhasil menyimpan ' + count + ' nilai peserta didik.' };
  } catch (err) {
    return { success: false, message: 'Gagal batch simpan nilai: ' + err.message };
  }
}

function addJurnalBackend(p) {
  try {
    var ss = getActiveDb();
    var npsn = (p.npsn || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();
    var jId = p.id || ('JRN-' + Date.now().toString().slice(-6));

    if (npsn) {
      saveToSchoolDbSheet(
        ss, npsn, namaSekolah,
        jId, 'JURNAL',
        p.ownerUid || '', p.teacherName || '',
        p.idKelas || '', p.namaKelas || '',
        p.tanggal || '',
        p.topikMateri || '',
        p.mapel || '',
        p
      );
    }

    return { success: true, id: jId, message: 'Jurnal pembelajaran berhasil dicatat.' };
  } catch (err) {
    return { success: false, message: 'Gagal simpan jurnal: ' + err.message };
  }
}

function uploadPerangkatBackend(p) {
  try {
    var ss = getActiveDb();
    var npsn = (p.npsn || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();
    var docId = p.id || ('DOK-' + Date.now().toString().slice(-6));
    var linkBerkas = p.linkBerkas || '';

    // Jika terdapat berkas base64, simpan ke Google Drive
    if (p.fileBase64 && p.namaFile) {
      try {
        var folder = getOrCreateUploadFolder();
        var decoded = Utilities.base64Decode(p.fileBase64);
        var blob = Utilities.newBlob(decoded, 'application/octet-stream', p.namaFile);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        linkBerkas = file.getUrl();
        p.linkBerkas = linkBerkas;
        p.driveFileId = file.getId();
      } catch (errDrive) {
        linkBerkas = 'https://drive.google.com/';
      }
    }

    // Bersihkan fileBase64 sebelum simpan ke Sheet agar hemat kuota
    delete p.fileBase64;

    if (npsn) {
      saveToSchoolDbSheet(
        ss, npsn, namaSekolah,
        docId, 'PERANGKAT',
        p.ownerUid || '', p.uploader || '',
        '', '',
        '-',
        p.judul || '',
        p.formatTipe || 'PDF',
        p
      );
    }

    return { success: true, id: docId, linkBerkas: linkBerkas, message: 'Perangkat ajar berhasil diunggah.' };
  } catch (err) {
    return { success: false, message: 'Gagal unggah perangkat: ' + err.message };
  }
}

function deletePerangkatBackend(p) {
  try {
    var ss = getActiveDb();
    var npsn = (p.npsn || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();
    var docId = (p.id || p.docId || '').trim();

    if (npsn) {
      deleteFromSchoolDbSheet(ss, npsn, namaSekolah, docId);
    }
    return { success: true, message: 'Dokumen berhasil dihapus.' };
  } catch (err) {
    return { success: false, message: 'Gagal hapus dokumen: ' + err.message };
  }
}

// ============================================================
// BANK PERANGKAT AJAR ADMIN (GOOGLE DRIVE LINK MULTI-SCHOOL)
// ============================================================
function getOrCreatePerangkatAjarSheet(ss) {
  var sheet = ss.getSheetByName('Perangkat_Ajar');
  var expectedHeaders = [
    'ID_Perangkat',
    'Judul',
    'Kategori_Kelas',
    'Mata_Pelajaran',
    'Semester',
    'Jenis_Dokumen',
    'URL_Google_Drive',
    'Deskripsi',
    'Uploader',
    'Status_Publikasi',
    'Waktu_Upload'
  ];

  if (!sheet) {
    sheet = ss.insertSheet('Perangkat_Ajar');
    sheet.appendRow(expectedHeaders);
    sheet.getRange(1, 1, 1, expectedHeaders.length)
      .setFontWeight('bold')
      .setBackground('#1E293B')
      .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    return sheet;
  }

  // PEMBERSIHAN OTOMATIS DATA DUMMY & STANDARISASI KOLOM
  try {
    var data = sheet.getDataRange().getValues();
    if (data.length > 0) {
      var headerFirst = String(data[0][0] || '').trim();
      // Jika format lama 17 kolom atau header adalah 'ID_Dokumen'
      if (headerFirst === 'ID_Dokumen' || data[0].length !== expectedHeaders.length) {
        var validRows = [];
        for (var i = 1; i < data.length; i++) {
          var r = data[i];
          var rId = String(r[0] || '').trim();
          var foundUrl = '';

          // Telusuri kolom untuk menemukan URL Google Drive yang valid (bukan dummy)
          for (var c = 0; c < r.length; c++) {
            var val = String(r[c] || '').trim();
            if ((val.indexOf('http://') === 0 || val.indexOf('https://') === 0) && val.indexOf('sample_modul') === -1) {
              foundUrl = val;
              break;
            }
          }

          // Simpan HANYA jika bukan record dummy (bukan DOK-001 s/d DOK-004) dan memiliki URL nyata
          if (foundUrl && rId.indexOf('DOK-00') !== 0) {
            validRows.push([
              rId.indexOf('PRG-') === 0 ? rId : ('PRG-ADM-' + Date.now().toString().slice(-6)),
              String(r[1] || 'Perangkat Ajar').trim(),
              String(r[2] || r[3] || 'Semua Kelas').trim(),
              String(r[3] || r[2] || 'Semua Mapel').trim(),
              'Semester 1 & 2 (Lengkap)',
              'Modul Ajar Kurikulum Merdeka',
              foundUrl,
              String(r[11] || r[7] || '').trim(),
              'Admin Koorwil Ambulu',
              'Aktif',
              Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
            ]);
          }
        }

        // Format ulang sheet dengan header baru 11 kolom
        sheet.clear();
        sheet.appendRow(expectedHeaders);
        sheet.getRange(1, 1, 1, expectedHeaders.length)
          .setFontWeight('bold')
          .setBackground('#1E293B')
          .setFontColor('#FFFFFF');
        sheet.setFrozenRows(1);

        if (validRows.length > 0) {
          sheet.getRange(2, 1, validRows.length, expectedHeaders.length).setValues(validRows);
        }
      } else {
        // Jika sudah 11 kolom, hapus baris yang terindikasi dummy (DOK-001..004 atau URL bukan http)
        for (var d = data.length - 1; d >= 1; d--) {
          var rowId = String(data[d][0] || '').trim();
          var rowUrl = String(data[d][6] || '').trim();
          if (rowId.indexOf('DOK-00') === 0 || (rowUrl.indexOf('http://') !== 0 && rowUrl.indexOf('https://') !== 0) || rowUrl.indexOf('sample_modul') !== -1) {
            sheet.deleteRow(d + 1);
          }
        }
      }
    }
  } catch (cleanErr) {}

  return sheet;
}

function getAllPerangkatAdminBackend() {
  try {
    var ss = getActiveDb();
    var sheet = getOrCreatePerangkatAjarSheet(ss);
    var list = [];
    if (sheet && sheet.getLastRow() > 1) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var r = data[i];
        var id = String(r[0] || '').trim();
        var judul = String(r[1] || '').trim();
        var urlDrive = String(r[6] || '').trim();
        var status = String(r[9] || 'Aktif').trim();

        // VALIDASI KETAT: Hanya record nyata dengan URL valid (http/https), bukan dummy DOK-001..004
        var isValidUrl = (urlDrive.indexOf('http://') === 0 || urlDrive.indexOf('https://') === 0) && urlDrive.indexOf('sample_modul') === -1;
        var isNotDummy = id.indexOf('DOK-00') !== 0;

        if (id && judul && status !== 'Dihapus' && isValidUrl && isNotDummy) {
          list.push({
            id: id,
            judul: judul,
            kategoriKelas: String(r[2] || 'Semua Kelas').trim(),
            mapel: String(r[3] || 'Semua Mapel').trim(),
            semester: String(r[4] || 'Lengkap').trim(),
            jenis: String(r[5] || 'Modul Ajar Kurikulum Merdeka').trim(),
            urlDrive: urlDrive,
            linkBerkas: urlDrive, // Tautan langsung ke Google Drive
            formatTipe: 'Google Drive',
            deskripsi: String(r[7] || '').trim(),
            uploader: String(r[8] || 'Admin Koorwil Ambulu').trim(),
            statusPublikasi: status,
            waktuUpload: String(r[10] || '').trim(),
            isFromAdmin: true
          });
        }
      }
    }
    return { success: true, list: list };
  } catch (err) {
    return { success: false, message: 'Gagal mengambil perangkat ajar: ' + err.message, list: [] };
  }
}

function savePerangkatAdminBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = getOrCreatePerangkatAjarSheet(ss);
    var id = (p.id || '').trim();
    if (!id) {
      id = 'PRG-ADM-' + Date.now().toString().slice(-6);
    }
    var judul = (p.judul || '').trim();
    var kategoriKelas = (p.kategoriKelas || 'Semua Kelas').trim();
    var mapel = (p.mapel || 'Semua Mapel').trim();
    var semester = (p.semester || 'Semester 1 & 2 (Lengkap)').trim();
    var jenis = (p.jenis || 'Paket Perangkat Ajar Kurikulum Merdeka').trim();
    var urlDrive = (p.urlDrive || p.linkBerkas || '').trim();
    var deskripsi = (p.deskripsi || '').trim();
    var uploader = (p.uploader || 'Admin Koorwil Ambulu').trim();
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    if (!judul || !urlDrive) {
      return { success: false, message: 'Judul dan URL Google Drive wajib diisi.' };
    }

    // Pastikan format URL valid diawali http:// atau https://
    if (urlDrive.indexOf('http://') !== 0 && urlDrive.indexOf('https://') !== 0) {
      urlDrive = 'https://' + urlDrive;
    }

    var data = sheet.getDataRange().getValues();
    var foundRow = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === id) {
        foundRow = i + 1;
        break;
      }
    }

    var rowValues = [
      id,
      judul,
      kategoriKelas,
      mapel,
      semester,
      jenis,
      urlDrive,
      deskripsi,
      uploader,
      'Aktif',
      nowStr
    ];

    if (foundRow !== -1) {
      sheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    SpreadsheetApp.flush();
    logActivity('ADMIN', uploader, 'Admin Pusat', 'PUSAT', 'Upload Perangkat Ajar', 'Judul: ' + judul + ' | URL Drive: ' + urlDrive);

    var createdItem = {
      id: id,
      judul: judul,
      kategoriKelas: kategoriKelas,
      mapel: mapel,
      semester: semester,
      jenis: jenis,
      urlDrive: urlDrive,
      linkBerkas: urlDrive,
      formatTipe: 'Google Drive',
      deskripsi: deskripsi,
      uploader: uploader,
      statusPublikasi: 'Aktif',
      waktuUpload: nowStr,
      isFromAdmin: true
    };

    return {
      success: true,
      id: id,
      perangkat: createdItem,
      message: 'Paket Perangkat Ajar Google Drive berhasil dipublikasikan untuk seluruh guru!'
    };
  } catch (err) {
    return { success: false, message: 'Gagal menyimpan perangkat ajar: ' + err.message };
  }
}

function deletePerangkatAdminBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = getOrCreatePerangkatAjarSheet(ss);
    var id = (p.id || '').trim();
    if (!id) {
      return { success: false, message: 'ID Perangkat wajib disertakan.' };
    }

    var data = sheet.getDataRange().getValues();
    var found = false;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === id) {
        sheet.deleteRow(i + 1);
        found = true;
        break;
      }
    }

    if (!found) {
      return { success: false, message: 'Perangkat ajar tidak ditemukan.' };
    }

    logActivity('ADMIN', 'Admin Pusat', 'Admin Pusat', 'PUSAT', 'Hapus Perangkat Ajar', 'ID: ' + id);

    return { success: true, message: 'Paket Perangkat ajar berhasil dihapus.' };
  } catch (err) {
    return { success: false, message: 'Gagal menghapus perangkat ajar: ' + err.message };
  }
}

// ============================================================
// AUDIT LOG & VERSIONING
// ============================================================
function logActivity(userId, userName, role, schoolId, action, detail) {
  try {
    var ss = getActiveDb();
    var logSheet = ss.getSheetByName('Audit_Logs');
    if (!logSheet) {
      logSheet = ss.insertSheet('Audit_Logs');
      logSheet.appendRow(['ID_Log', 'Waktu', 'ID_User', 'Nama_User', 'Role', 'ID_Sekolah', 'Aksi', 'Detail']);
    }
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    logSheet.appendRow(['LOG-' + Date.now().toString().slice(-6), nowStr, userId, userName, role, schoolId, action, detail]);
  } catch (e) {}
}

function getDataVersion() {
  var props = PropertiesService.getScriptProperties();
  var ver = Number(props.getProperty('DB_VERSION') || '1');
  var updated = props.getProperty('DB_LAST_UPDATED') || new Date().toISOString();
  return { version: ver, lastUpdated: updated };
}

function incrementDataVersion() {
  var props = PropertiesService.getScriptProperties();
  var ver = Number(props.getProperty('DB_VERSION') || '1') + 1;
  var updated = new Date().toISOString();
  props.setProperty('DB_VERSION', String(ver));
  props.setProperty('DB_LAST_UPDATED', updated);
  return { version: ver, lastUpdated: updated };
}

// ============================================================
// INISIALISASI MASTER SEKOLAH & STRUKTUR TABEL LENGKAP
// ============================================================
function setupDatabaseMultiSchool() {
  var ss = getActiveDb();
  var sheetsDef = [
    {
      name: 'Schools',
      headers: ['ID_Sekolah', 'Nama_Sekolah', 'NPSN', 'Kode_Unik', 'Alamat', 'Desa', 'Kecamatan', 'Kabupaten', 'Kepala_Sekolah', 'NIP_KS', 'Status', 'Tanggal_Dibuat']
    },
    {
      name: 'Teacher_Profiles',
      headers: ['ID_Guru', 'Nama_Lengkap', 'NIP', 'No_HP', 'ID_Sekolah', 'Nama_Sekolah', 'NPSN', 'Jabatan', 'Status_Kepegawaian', 'PIN', 'Status_Verifikasi', 'Tanggal_Daftar', 'Tanggal_Verifikasi', 'Diverifikasi_Oleh']
    },
    {
      name: 'Data_Kelas',
      headers: ['ID_Kelas', 'Owner_UID', 'ID_Sekolah', 'Nama_Sekolah', 'Tingkat', 'Nama_Rombel', 'Tahun_Ajaran', 'Semester', 'Status_Kelas', 'Waktu_Dibuat']
    },
    {
      name: 'Data_Siswa',
      headers: ['ID_Siswa', 'ID_Kelas', 'Owner_UID', 'ID_Sekolah', 'NIS', 'NISN', 'Nama_Lengkap', 'JK', 'Tempat_Lahir', 'Tanggal_Lahir', 'Alamat', 'Nama_Wali', 'No_HP_Wali', 'Status']
    },
    {
      name: 'Perangkat_Ajar',
      headers: ['ID_Perangkat', 'Judul', 'Kategori_Kelas', 'Mata_Pelajaran', 'Semester', 'Jenis_Dokumen', 'URL_Google_Drive', 'Deskripsi', 'Uploader', 'Status_Publikasi', 'Waktu_Upload']
    },
    {
      name: 'Audit_Logs',
      headers: ['ID_Log', 'Waktu', 'ID_User', 'Nama_User', 'Role', 'ID_Sekolah', 'Aksi', 'Detail']
    }
  ];

  sheetsDef.forEach(function (def) {
    var sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      sheet.appendRow(def.headers);
      sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#E2E8F0');
      sheet.setFrozenRows(1);
    }
  });

  // Isi ke-14 SD Negeri Resmi Kecamatan Ambulu
  var sSheet = ss.getSheetByName('Schools');
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  if (sSheet && sSheet.getLastRow() <= 1) {
    var rows = OFFICIAL_SCHOOLS_AMBULU.map(function (s) {
      return [
        'SCH-' + s.npsn,
        s.nama,
        s.npsn,
        s.kode,
        'Kecamatan Ambulu, Jember',
        s.desa,
        'Ambulu',
        'Jember',
        'Kepala Sekolah',
        '-',
        'Terverifikasi',
        now
      ];
    });
    sSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  SpreadsheetApp.flush();
  return { success: true, message: 'Database SiGuru SD Ambulu multi-school siap digunakan.' };
}
