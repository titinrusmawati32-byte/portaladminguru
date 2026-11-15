/**
 * ============================================================
 * SiGuru SD - Platform Administrasi Pendidikan Kecamatan Ambulu
 * Kabupaten Jember, Jawa Timur - Versi 3.1.0-NPSN-AUTH
 * Sistem Autentikasi: NPSN + Kode Unik Lembaga & PIN Pribadi Guru (Opsi C)
 * ============================================================
 */

var PLATFORM_TITLE = 'SiGuru SD - Kecamatan Ambulu, Kabupaten Jember';
var DRIVE_FOLDER_NAME = 'SiGuru_SD_Ambulu_Perangkat_Ajar';

// ============================================================
// CONCURRENCY SCRIPT LOCK HELPER
// ============================================================
function withScriptLock(operationName, callback) {
  var lock = LockService.getScriptLock();
  try {
    var success = lock.waitLock(30000); // 30 detik
    if (!success) {
      return { success: false, message: 'Server sibuk, transaksi terkunci oleh proses lain. Silakan coba lagi.' };
    }
    return callback();
  } catch (err) {
    return { success: false, message: 'Transaksi database terhambat: ' + err.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
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

// Helper Generator Kode Unik Sekolah Otomatis
function generateUniqueSchoolCode(npsn, nama) {
  var cleanName = (nama || 'SD').toUpperCase().replace(/[^A-Z0-9]/g, '');
  var prefix = cleanName.indexOf('AMBULU') !== -1 ? 'AMB' :
               (cleanName.indexOf('TEGALSARI') !== -1 ? 'TGL' :
               (cleanName.indexOf('SUMBEREJO') !== -1 ? 'SMB' :
               (cleanName.indexOf('ANDONGSARI') !== -1 ? 'ADG' :
               (cleanName.indexOf('PONTANG') !== -1 ? 'PNT' :
               (cleanName.indexOf('KARANGANYAR') !== -1 ? 'KRN' : 'SD')))));
  
  var numSuffix = cleanName.match(/\d+/);
  var numStr = numSuffix ? (numSuffix[0].length === 1 ? '0' + numSuffix[0] : numSuffix[0]) : '01';
  var randomDigits = Math.floor(1000 + Math.random() * 9000);
  return prefix + numStr + '-' + randomDigits;
}

// ============================================================
// ENDPOINT UTAMA: doGet
// ============================================================
function doGet(e) {
  var result;
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

    switch (action) {
      case 'ping':
        result = {
          success: true,
          platform: PLATFORM_TITLE,
          version: '3.1.0-NPSN-AUTH',
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
        result = getTeacherDataBackend(teacherUid, schoolId);
        break;

      case 'getSuperAdminData':
        result = getSuperAdminDataBackend();
        break;

      case 'getSchoolAdminData':
        var sId = (e.parameter.schoolId || '').trim();
        result = getSchoolAdminDataBackend(sId);
        break;

      case 'getAllAdminData':
        result = getAllAdminDataLegacy();
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
      // 1. Autentikasi NPSN + Kode Unik Lembaga & PIN (Opsi C)
      case 'verifySchoolByNpsn':
        result = verifySchoolByNpsnBackend(payload);
        break;

      case 'loginTeacherWithPin':
        result = loginTeacherWithPinBackend(payload);
        break;

      case 'registerTeacherWithPin':
        result = withScriptLock('registerTeacherWithPin', function () { return registerTeacherWithPinBackend(payload); });
        break;

      case 'uploadNpsnMaster':
        result = withScriptLock('uploadNpsnMaster', function () { return uploadNpsnMasterBackend(payload); });
        break;

      // 2. Multi-School Management
      case 'requestNewSchool':
        result = withScriptLock('requestNewSchool', function () { return requestNewSchoolBackend(payload); });
        break;

      case 'verifySchool':
        result = withScriptLock('verifySchool', function () { return verifySchoolBackend(payload); });
        break;

      case 'verifyTeacher':
        result = withScriptLock('verifyTeacher', function () { return verifyTeacherBackend(payload); });
        break;

      // 3. Guru: Kelola Kelas Sendiri
      case 'saveClassTeacher':
      case 'saveKelas':
        result = withScriptLock('saveClassTeacher', function () { return saveClassTeacherBackend(payload); });
        break;

      case 'deleteClassTeacher':
        result = withScriptLock('deleteClassTeacher', function () { return deleteClassTeacherBackend(payload); });
        break;

      // 4. Guru: Kelola Siswa Kelas Sendiri (Manual & Import Excel)
      case 'saveStudentTeacher':
      case 'addSiswa':
      case 'editSiswa':
        result = withScriptLock('saveStudentTeacher', function () { return saveStudentTeacherBackend(payload); });
        break;

      case 'batchImportStudents':
        result = withScriptLock('batchImportStudents', function () { return batchImportStudentsBackend(payload); });
        break;

      case 'deleteStudentTeacher':
      case 'deleteSiswa':
        result = withScriptLock('deleteStudentTeacher', function () { return deleteStudentTeacherBackend(payload); });
        break;

      // 5. Guru: Presensi & Nilai Terikat Kelas & Owner UID
      case 'updatePresensi':
        result = withScriptLock('updatePresensi', function () { return updatePresensiBackend(payload); });
        break;

      case 'batchUpdatePresensi':
        result = withScriptLock('batchUpdatePresensi', function () { return batchUpdatePresensiBackend(payload); });
        break;

      case 'addNilai':
      case 'saveNilai':
        result = withScriptLock('addNilai', function () { return addNilaiBackend(payload); });
        break;

      // 6. Guru: Jurnal Mengajar & Bahan Ajar
      case 'addJurnal':
      case 'saveJurnal':
        result = withScriptLock('addJurnal', function () { return addJurnalBackend(payload); });
        break;

      case 'uploadPerangkat':
        result = withScriptLock('uploadPerangkat', function () { return uploadPerangkatBackend(payload); });
        break;

      case 'deletePerangkat':
        result = withScriptLock('deletePerangkat', function () { return deleteRowByIdBackend('Perangkat_Ajar', payload.id || payload.docId); });
        break;

      // 7. Pengaturan Sekolah & Utilitas
      case 'savePengaturanSekolah':
        result = withScriptLock('savePengaturanSekolah', function () { return savePengaturanSekolahBackend(payload); });
        break;

      case 'backupDatabase':
        result = withScriptLock('backupDatabase', function () { return backupDatabaseBackend(); });
        break;

      default:
        result = { success: false, message: 'Action backend tidak dikenali: ' + action };
        break;
    }
  } catch (err) {
    result = { success: false, message: 'Error doPost: ' + err.message };
  }

  // Tambahkan nomor versi terbaru ke setiap respons write
  if (result && result.success) {
    var vInfo = incrementDataVersion();
    result.version = vInfo.version;
    result.lastUpdated = vInfo.lastUpdated;
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// VERIFIKASI SEKOLAH BERDASARKAN NPSN & KODE UNIK (OPSI C)
// ============================================================
function verifySchoolByNpsnBackend(p) {
  try {
    var npsn = (p.npsn || '').trim();
    var kodeUnik = (p.kodeUnik || p.code || '').trim().toUpperCase();

    if (!npsn || !kodeUnik) {
      return { success: false, message: 'NPSN dan Kode Unik Sekolah wajib diisi.' };
    }

    var ss = getActiveDb();
    var sSheet = ss.getSheetByName('Schools');
    if (!sSheet) {
      return { success: false, message: 'Tabel master Schools tidak ditemukan.' };
    }

    var sData = sSheet.getDataRange().getValues();
    var matchedSchool = null;

    // Format Kolom Schools:
    // [ID_Sekolah(0), Nama_Sekolah(1), NPSN(2), Kode_Unik(3), Alamat(4), Desa(5), Kecamatan(6), Kabupaten(7), Kepala_Sekolah(8), NIP_KS(9), Status(10), Tanggal(11)]
    for (var i = 1; i < sData.length; i++) {
      var rowNpsn = String(sData[i][2]).trim();
      var rowKode = String(sData[i][3]).trim().toUpperCase();

      if (rowNpsn === npsn && rowKode === kodeUnik) {
        matchedSchool = {
          id: String(sData[i][0]).trim(),
          nama: String(sData[i][1]).trim(),
          npsn: rowNpsn,
          kodeUnik: rowKode,
          desa: String(sData[i][5] || sData[i][4] || '').trim(),
          kepalaSekolah: String(sData[i][8] || '').trim(),
          status: String(sData[i][10] || 'Terverifikasi').trim()
        };
        break;
      }
    }

    if (!matchedSchool) {
      return {
        success: false,
        message: 'Kombinasi NPSN (' + npsn + ') dan Kode Unik Sekolah tidak cocok atau belum terdaftar.'
      };
    }

    // Ambil daftar guru yang sudah terdaftar di sekolah ini
    var pSheet = ss.getSheetByName('Teacher_Profiles');
    var teachers = [];
    if (pSheet) {
      var pData = pSheet.getDataRange().getValues();
      for (var j = 1; j < pData.length; j++) {
        // [ID_Guru(0), Nama_Lengkap(1), NIP(2), No_HP(3), ID_Sekolah(4), Nama_Sekolah(5), NPSN(6), Jabatan(7), Status_Kepegawaian(8), PIN(9), Status_Verifikasi(10)]
        var tSchoolId = String(pData[j][4]).trim();
        var tNpsn = String(pData[j][6]).trim();

        if (tSchoolId === matchedSchool.id || tNpsn === matchedSchool.npsn) {
          teachers.push({
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
      teachers: teachers,
      message: 'Sekolah terverifikasi: ' + matchedSchool.nama
    };
  } catch (err) {
    return { success: false, message: 'Gagal verifikasi sekolah: ' + err.message };
  }
}

// ============================================================
// LOGIN GURU MENGGUNAKAN PIN PRIBADI (OPSI C)
// ============================================================
function loginTeacherWithPinBackend(p) {
  try {
    var npsn = (p.npsn || '').trim();
    var kodeUnik = (p.kodeUnik || '').trim().toUpperCase();
    var teacherId = (p.teacherId || p.id || '').trim();
    var pin = String(p.pin || '').trim();

    if (!npsn || !kodeUnik || !teacherId || !pin) {
      return { success: false, message: 'NPSN, Kode Unik Sekolah, Pilihan Guru, dan PIN wajib diisi.' };
    }

    // 1. Verifikasi Sekolah
    var vSch = verifySchoolByNpsnBackend({ npsn: npsn, kodeUnik: kodeUnik });
    if (!vSch.success) {
      return vSch;
    }

    // 2. Verifikasi Guru & PIN
    var ss = getActiveDb();
    var pSheet = ss.getSheetByName('Teacher_Profiles');
    var pData = pSheet.getDataRange().getValues();
    var teacherProfile = null;

    for (var i = 1; i < pData.length; i++) {
      var rowId = String(pData[i][0]).trim();
      var rowPin = String(pData[i][9]).trim();

      if (rowId === teacherId) {
        if (rowPin !== pin) {
          return { success: false, message: 'PIN Pribadi yang Anda masukkan salah.' };
        }
        teacherProfile = {
          id: rowId,
          uid: rowId,
          nama: String(pData[i][1]).trim(),
          nip: String(pData[i][2]).trim(),
          noHp: String(pData[i][3]).trim(),
          schoolId: String(pData[i][4]).trim(),
          namaSekolah: String(pData[i][5]).trim(),
          npsn: String(pData[i][6]).trim(),
          jabatan: String(pData[i][7] || 'Guru Kelas').trim(),
          statusKepegawaian: String(pData[i][8] || 'PNS').trim(),
          role: 'Guru'
        };
        break;
      }
    }

    if (!teacherProfile) {
      return { success: false, message: 'Data guru tidak ditemukan pada sekolah ini.' };
    }

    // 3. Ambil data terisolasi kelas & siswa milik guru ini
    var teacherData = getTeacherDataBackend(teacherProfile.id, teacherProfile.schoolId);

    return {
      success: true,
      teacher: teacherProfile,
      classes: teacherData.kelas || [],
      students: teacherData.siswa || [],
      attendance: teacherData.presensi || [],
      grades: teacherData.nilai || [],
      journals: teacherData.jurnal || [],
      message: 'Selamat datang kembali, ' + teacherProfile.nama
    };
  } catch (err) {
    return { success: false, message: 'Gagal login guru: ' + err.message };
  }
}

// ============================================================
// REGISTRASI GURU BARU DENGAN PIN PRIBADI (OPSI C)
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

    // 1. Verifikasi Sekolah
    var vSch = verifySchoolByNpsnBackend({ npsn: npsn, kodeUnik: kodeUnik });
    if (!vSch.success) {
      return vSch;
    }
    var school = vSch.school;

    var ss = getActiveDb();
    var pSheet = ss.getSheetByName('Teacher_Profiles');
    var uSheet = ss.getSheetByName('Users');
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    // Buat ID Guru Unik
    var teacherId = 'GUR-' + npsn + '-' + Date.now().toString().slice(-5);

    // 1. Simpan ke Teacher_Profiles
    // [ID_Guru(0), Nama_Lengkap(1), NIP(2), No_HP(3), ID_Sekolah(4), Nama_Sekolah(5), NPSN(6), Jabatan(7), Status_Kepegawaian(8), PIN(9), Status_Verifikasi(10), Tanggal_Daftar(11)]
    var profileRow = [
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
      'Terverifikasi',
      nowStr
    ];
    pSheet.appendRow(profileRow);

    // 2. Simpan ke Users
    if (uSheet) {
      uSheet.appendRow([
        'USR-' + Date.now().toString().slice(-5),
        teacherId,
        nip || (nama.toLowerCase().replace(/[^a-z]/g, '') + '@sd.id'),
        nama,
        'Guru',
        school.id,
        school.nama,
        'Aktif',
        nowStr,
        nowStr
      ]);
    }

    logActivity(teacherId, nama, 'Guru', school.id, 'Registrasi Guru Mandiri', 'Guru baru terdaftar di ' + school.nama);

    var teacherProfile = {
      id: teacherId,
      uid: teacherId,
      nama: nama,
      nip: nip,
      noHp: noHp,
      schoolId: school.id,
      namaSekolah: school.nama,
      npsn: school.npsn,
      jabatan: jabatan,
      statusKepegawaian: statusKepegawaian,
      role: 'Guru'
    };

    return {
      success: true,
      teacher: teacherProfile,
      isNewUser: true,
      message: 'Pendaftaran berhasil. Silakan buat kelas mengajar Anda terlebih dahulu.'
    };
  } catch (err) {
    return { success: false, message: 'Gagal mendaftarkan guru: ' + err.message };
  }
}

// ============================================================
// UPLOAD / TAMBAH NPSN & GENERATE KODE UNIK (SUPER ADMIN)
// ============================================================
function uploadNpsnMasterBackend(p) {
  try {
    var schools = p.schools || [];
    if (!schools || schools.length === 0) {
      return { success: false, message: 'Daftar sekolah kosong.' };
    }

    var ss = getActiveDb();
    var sSheet = ss.getSheetByName('Schools');
    if (!sSheet) {
      return { success: false, message: 'Tabel master Schools tidak ditemukan.' };
    }

    var sData = sSheet.getDataRange().getValues();
    var existingNpsnMap = {};
    for (var i = 1; i < sData.length; i++) {
      existingNpsnMap[String(sData[i][2]).trim()] = true;
    }

    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    var addedCount = 0;

    for (var j = 0; j < schools.length; j++) {
      var s = schools[j];
      var cleanNpsn = String(s.npsn || '').trim();
      var cleanNama = String(s.nama || s.namaSekolah || '').trim();

      if (cleanNpsn && !existingNpsnMap[cleanNpsn]) {
        var schoolId = 'SCH-' + cleanNpsn;
        var kodeUnik = String(s.kodeUnik || '').trim() || generateUniqueSchoolCode(cleanNpsn, cleanNama);
        var desa = String(s.desa || '-').trim();
        var alamat = String(s.alamat || '-').trim();
        var ks = String(s.kepalaSekolah || '-').trim();

        sSheet.appendRow([
          schoolId,
          cleanNama,
          cleanNpsn,
          kodeUnik,
          alamat,
          desa,
          'Ambulu',
          'Jember',
          ks,
          '-',
          'Terverifikasi',
          nowStr
        ]);

        existingNpsnMap[cleanNpsn] = true;
        addedCount++;
      }
    }

    return {
      success: true,
      addedCount: addedCount,
      message: 'Berhasil mengunggah dan membuatkan kode unik untuk ' + addedCount + ' sekolah.'
    };
  } catch (err) {
    return { success: false, message: 'Gagal unggah NPSN: ' + err.message };
  }
}

// ============================================================
// ISOLASI DATA GURU (GURU HANYA AKSES DATA MILIKNYA)
// ============================================================
function getTeacherDataBackend(teacherUid, schoolId) {
  try {
    var ss = getActiveDb();
    var uid = (teacherUid || '').trim();

    // 1. Data Kelas Milik Guru
    var kSheet = ss.getSheetByName('Data_Kelas');
    var myKelas = [];
    var myClassIds = {};
    if (kSheet) {
      var kData = kSheet.getDataRange().getValues();
      for (var i = 1; i < kData.length; i++) {
        var kr = kData[i];
        // [ID_Kelas(0), Owner_UID(1), ID_Sekolah(2), Nama_Sekolah(3), Tingkat(4), Nama_Rombel(5), Tahun_Ajaran(6), Semester(7), Status_Kelas(8)]
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

    // 2. Data Siswa di Kelas Milik Guru
    var sSheet = ss.getSheetByName('Data_Siswa');
    var mySiswa = [];
    if (sSheet) {
      var sData = sSheet.getDataRange().getValues();
      for (var j = 1; j < sData.length; j++) {
        var sr = sData[j];
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

    // 3. Data Presensi Milik Guru
    var prSheet = ss.getSheetByName('Presensi');
    var myPresensi = [];
    if (prSheet) {
      var prData = prSheet.getDataRange().getValues();
      for (var p = 1; p < prData.length; p++) {
        var pr = prData[p];
        var pClassId = String(pr[2]).trim();
        var pOwner = String(pr[8]).trim();
        if (!uid || pOwner === uid || myClassIds[pClassId]) {
          myPresensi.push({
            id: String(pr[0]).trim(),
            tanggal: String(pr[1]).trim(),
            idKelas: pClassId,
            namaKelas: String(pr[3]).trim(),
            idSiswa: String(pr[4]).trim(),
            namaSiswa: String(pr[5]).trim(),
            statusHadir: String(pr[6]).trim(),
            keterangan: String(pr[7]).trim(),
            ownerUid: pOwner,
            waktuInput: String(pr[10]).trim()
          });
        }
      }
    }

    // 4. Data Nilai Siswa
    var nSheet = ss.getSheetByName('Nilai_Siswa');
    var myNilai = [];
    if (nSheet) {
      var nData = nSheet.getDataRange().getValues();
      for (var n = 1; n < nData.length; n++) {
        var nr = nData[n];
        var nClassId = String(nr[1]).trim();
        var nOwner = String(nr[13]).trim();
        if (!uid || nOwner === uid || myClassIds[nClassId]) {
          myNilai.push({
            id: String(nr[0]).trim(),
            idKelas: nClassId,
            namaKelas: String(nr[2]).trim(),
            idSiswa: String(nr[3]).trim(),
            namaSiswa: String(nr[4]).trim(),
            mapel: String(nr[5]).trim(),
            lingkupMateri: String(nr[6]).trim(),
            nilaiFormatif: Number(nr[7]) || 0,
            nilaiSumatif: Number(nr[8]) || 0,
            nilaiSAS: Number(nr[9]) || 0,
            nilaiAkhir: Number(nr[10]) || 0,
            semester: String(nr[11]).trim(),
            tahunAjaran: String(nr[12]).trim()
          });
        }
      }
    }

    // 5. Data Jurnal Mengajar
    var jSheet = ss.getSheetByName('Jurnal_Mengajar');
    var myJurnal = [];
    if (jSheet) {
      var jData = jSheet.getDataRange().getValues();
      for (var jr = 1; jr < jData.length; jr++) {
        var jRow = jData[jr];
        var jClassId = String(jRow[1]).trim();
        var jOwner = String(jRow[10]).trim();
        if (!uid || jOwner === uid || myClassIds[jClassId]) {
          myJurnal.push({
            id: String(jRow[0]).trim(),
            idKelas: jClassId,
            namaKelas: String(jRow[2]).trim(),
            tanggal: String(jRow[3]).trim(),
            jamKe: String(jRow[4]).trim(),
            mapel: String(jRow[5]).trim(),
            topikMateri: String(jRow[6]).trim(),
            kegiatanPembelajaran: String(jRow[7]).trim(),
            siswaTidakHadir: String(jRow[8]).trim(),
            catatanRefleksi: String(jRow[9]).trim()
          });
        }
      }
    }

    // 6. Data Perangkat Ajar
    var dSheet = ss.getSheetByName('Perangkat_Ajar');
    var myPerangkat = [];
    if (dSheet) {
      var dData = dSheet.getDataRange().getValues();
      for (var d = 1; d < dData.length; d++) {
        var dr = dData[d];
        myPerangkat.push({
          id: String(dr[0]).trim(),
          judul: String(dr[1]).trim(),
          mapel: String(dr[2]).trim(),
          kategoriKelas: String(dr[3]).trim(),
          formatTipe: String(dr[5]).trim(),
          namaFile: String(dr[6]).trim(),
          ukuranFile: String(dr[7]).trim(),
          linkBerkas: String(dr[10]).trim(),
          deskripsi: String(dr[11]).trim(),
          uploader: String(dr[13]).trim()
        });
      }
    }

    var verInfo = getDataVersion();
    return {
      success: true,
      version: verInfo.version,
      lastUpdated: verInfo.lastUpdated,
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
// CRUD GURU: KELAS MANDIRI
// ============================================================
function saveClassTeacherBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Data_Kelas');
    var data = sheet.getDataRange().getValues();
    var id = (p.id || '').trim();
    var uid = (p.ownerUid || p.uid || '').trim();
    var isEdit = false;

    if (id) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === id) {
          if (uid && String(data[i][1]).trim() !== uid) {
            return { success: false, message: 'Anda tidak memiliki hak mengubah kelas milik guru lain.' };
          }
          sheet.getRange(i + 1, 5).setValue(p.tingkat || data[i][4]);
          sheet.getRange(i + 1, 6).setValue(p.namaRombel || data[i][5]);
          sheet.getRange(i + 1, 7).setValue(p.tahunAjaran || data[i][6]);
          sheet.getRange(i + 1, 8).setValue(p.semester || data[i][7]);
          sheet.getRange(i + 1, 9).setValue(p.statusKelas || 'Aktif');
          isEdit = true;
          break;
        }
      }
    }

    if (!isEdit) {
      id = 'KLS-' + Date.now().toString().slice(-5);
      var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      sheet.appendRow([
        id,
        uid,
        p.schoolId || 'SCH-AMB-01',
        p.namaSekolah || 'SD Negeri di Kecamatan Ambulu',
        p.tingkat || 'IV',
        p.namaRombel || 'Kelas Baru',
        p.tahunAjaran || '2026/2027',
        p.semester || 'Ganjil',
        'Aktif',
        nowStr
      ]);
    }

    return { success: true, id: id, message: isEdit ? 'Kelas berhasil diperbarui.' : 'Kelas baru berhasil dibuat.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function deleteClassTeacherBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Data_Kelas');
    var data = sheet.getDataRange().getValues();
    var id = (p.id || p.classId || '').trim();
    var uid = (p.ownerUid || p.uid || '').trim();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === id) {
        if (uid && String(data[i][1]).trim() !== uid) {
          return { success: false, message: 'Akses ditolak: Anda tidak memiliki izin menghapus kelas ini.' };
        }
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Kelas berhasil dihapus.' };
      }
    }
    return { success: false, message: 'Kelas tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ============================================================
// CRUD GURU: DATA SISWA KELAS (MANUAL & BATCH IMPORT EXCEL)
// ============================================================
function saveStudentTeacherBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Data_Siswa');
    var data = sheet.getDataRange().getValues();
    var id = (p.id || '').trim();
    var isEdit = false;

    if (id) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === id) {
          sheet.getRange(i + 1, 2).setValue(p.idKelas || data[i][1]);
          sheet.getRange(i + 1, 5).setValue(p.nis || data[i][4]);
          sheet.getRange(i + 1, 6).setValue(p.nisn || data[i][5]);
          sheet.getRange(i + 1, 7).setValue(p.nama || data[i][6]);
          sheet.getRange(i + 1, 8).setValue(p.jenisKelamin || data[i][7]);
          sheet.getRange(i + 1, 12).setValue(p.namaWali || data[i][11]);
          sheet.getRange(i + 1, 13).setValue(p.noHpWali || data[i][12]);
          isEdit = true;
          break;
        }
      }
    }

    if (!isEdit) {
      id = 'SIS-' + Date.now().toString().slice(-5);
      sheet.appendRow([
        id,
        p.idKelas || '',
        p.ownerUid || '',
        p.schoolId || '',
        p.nis || '',
        p.nisn || '',
        p.nama || 'Siswa Baru',
        p.jenisKelamin || 'L',
        p.tempatLahir || 'Jember',
        p.tanggalLahir || '2016-01-01',
        p.alamat || '-',
        p.namaWali || '-',
        p.noHpWali || '',
        'Aktif'
      ]);
    }

    return { success: true, id: id, message: isEdit ? 'Data siswa berhasil diperbarui.' : 'Siswa berhasil ditambahkan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function batchImportStudentsBackend(p) {
  try {
    var students = p.students || [];
    var classId = (p.classId || '').trim();
    var ownerUid = (p.ownerUid || '').trim();
    var schoolId = (p.schoolId || '').trim();

    if (!students || students.length === 0) {
      return { success: false, message: 'Tidak ada data siswa untuk diimpor.' };
    }

    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Data_Siswa');
    var rows = [];

    for (var i = 0; i < students.length; i++) {
      var s = students[i];
      var newId = 'SIS-' + (Date.now() + i).toString().slice(-6);
      rows.push([
        newId,
        classId,
        ownerUid,
        schoolId,
        s.nis || '-',
        s.nisn || '-',
        s.nama || 'Siswa',
        s.jenisKelamin || 'L',
        s.tempatLahir || 'Jember',
        s.tanggalLahir || '2016-01-01',
        s.alamat || '-',
        s.namaWali || '-',
        s.noHpWali || '',
        'Aktif'
      ]);
    }

    if (rows.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
    }

    return { success: true, count: rows.length, message: 'Berhasil mengimpor ' + rows.length + ' data siswa.' };
  } catch (err) {
    return { success: false, message: 'Gagal impor siswa: ' + err.message };
  }
}

function deleteStudentTeacherBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Data_Siswa');
    var data = sheet.getDataRange().getValues();
    var id = (p.id || p.siswaId || '').trim();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === id) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Data siswa berhasil dihapus.' };
      }
    }
    return { success: false, message: 'Data siswa tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ============================================================
// PRESENSI & NILAI SISWA
// ============================================================
function updatePresensiBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Presensi');
    var data = sheet.getDataRange().getValues();
    var today = p.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var sId = (p.idSiswa || '').trim();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === today && String(data[i][4]).trim() === sId) {
        sheet.getRange(i + 1, 7).setValue(p.statusHadir || 'Hadir');
        sheet.getRange(i + 1, 8).setValue(p.keterangan || '-');
        return { success: true, message: 'Presensi diperbarui.' };
      }
    }

    var newId = 'PRS-' + Date.now().toString().slice(-5);
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([
      newId,
      today,
      p.idKelas || '',
      p.namaKelas || '',
      sId,
      p.namaSiswa || '',
      p.statusHadir || 'Hadir',
      p.keterangan || '-',
      p.ownerUid || '',
      p.schoolId || '',
      now
    ]);

    return { success: true, message: 'Presensi tercatat.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function batchUpdatePresensiBackend(p) {
  try {
    var records = p.records || [];
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      updatePresensiBackend({
        idKelas: r.idKelas,
        namaKelas: r.namaKelas,
        idSiswa: r.idSiswa,
        namaSiswa: r.namaSiswa,
        statusHadir: r.statusHadir || 'Hadir',
        ownerUid: p.ownerUid || '',
        schoolId: p.schoolId || ''
      });
    }
    return { success: true, message: 'Presensi massal kelas berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function addNilaiBackend(n) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Nilai_Siswa');
    var newId = 'NLI-' + Date.now().toString().slice(-5);

    sheet.appendRow([
      newId,
      n.idKelas || '',
      n.namaKelas || '',
      n.idSiswa || '',
      n.namaSiswa || '',
      n.mapel || 'Matematika',
      n.lingkupMateri || 'Capaian Pembelajaran',
      n.nilaiFormatif || 0,
      n.nilaiSumatif || 0,
      n.nilaiSAS || 0,
      n.nilaiAkhir || 0,
      n.semester || 'Ganjil',
      n.tahunAjaran || '2026/2027',
      n.ownerUid || '',
      n.schoolId || ''
    ]);

    return { success: true, id: newId, message: 'Nilai siswa berhasil disimpan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function addJurnalBackend(j) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Jurnal_Mengajar');
    var newId = 'JRN-' + Date.now().toString().slice(-5);
    var today = j.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    sheet.appendRow([
      newId,
      j.idKelas || '',
      j.namaKelas || '',
      today,
      j.jamKe || '1-2',
      j.mapel || '',
      j.topikMateri || '',
      j.kegiatanPembelajaran || '',
      j.siswaTidakHadir || '-',
      j.catatanRefleksi || '',
      j.ownerUid || '',
      j.schoolId || ''
    ]);

    return { success: true, id: newId, message: 'Jurnal pembelajaran berhasil dicatat.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function uploadPerangkatBackend(payload) {
  try {
    var namaFile = payload.namaFile || payload.fileName || 'dokumen_perangkat';
    var mimeType = payload.mimeType || payload.fileMime || 'application/octet-stream';
    var base64Data = payload.base64Data || payload.fileBase64 || '';
    var judul = payload.judul || namaFile;
    var mapel = payload.mapel || 'Umum';
    var kategoriKelas = payload.kategoriKelas || 'Semua Kelas';
    var formatTipe = payload.formatTipe || 'PDF';
    var durasi = payload.durasi || payload.durasiJP || '4 JP';
    var deskripsi = payload.deskripsi || '-';
    var uploader = payload.uploader || 'Guru SD';
    var fileUrl = payload.linkBerkas || 'https://drive.google.com/';
    var ukuranFile = payload.ukuranFile || '1.0 MB';

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
        ukuranFile = (file.getSize() / 1048576).toFixed(1) + ' MB';
      } catch (driveErr) {
        if (!fileUrl || fileUrl === 'https://drive.google.com/') {
          fileUrl = 'https://drive.google.com/drive/my-drive';
        }
      }
    }

    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Perangkat_Ajar');
    var newId = 'DOK-' + Date.now().toString().slice(-5);
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    sheet.appendRow([
      newId, judul, mapel, kategoriKelas, 'Modul Ajar', formatTipe, namaFile,
      ukuranFile, 'Google Drive', durasi, fileUrl, deskripsi, payload.ownerUid || '',
      uploader, payload.schoolId || '', 'Aktif', nowStr
    ]);

    return {
      success: true,
      id: newId,
      fileUrl: fileUrl,
      message: 'Perangkat ajar "' + namaFile + '" berhasil disimpan.'
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ============================================================
// SUPER ADMIN & SEKOLAH DATA
// ============================================================
function getAllSchoolsBackend() {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Schools');
    var schools = [];

    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var r = data[i];
        schools.push({
          id: String(r[0]).trim(),
          nama: String(r[1]).trim(),
          npsn: String(r[2]).trim(),
          kodeUnik: String(r[3] || '').trim(),
          alamat: String(r[4]).trim(),
          desa: String(r[5]).trim(),
          kecamatan: String(r[6]).trim() || 'Ambulu',
          kabupaten: String(r[7]).trim() || 'Jember',
          kepalaSekolah: String(r[8]).trim(),
          status: String(r[10]).trim() || 'Terverifikasi'
        });
      }
    }
    return { success: true, schools: schools };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function getSuperAdminDataBackend() {
  try {
    var ss = getActiveDb();
    var sSheet = ss.getSheetByName('Schools');
    var pSheet = ss.getSheetByName('Teacher_Profiles');
    var kSheet = ss.getSheetByName('Data_Kelas');
    var stSheet = ss.getSheetByName('Data_Siswa');

    var schools = [];
    if (sSheet) {
      var sData = sSheet.getDataRange().getValues();
      for (var i = 1; i < sData.length; i++) {
        schools.push({
          id: sData[i][0],
          nama: sData[i][1],
          npsn: sData[i][2],
          kodeUnik: sData[i][3] || '',
          desa: sData[i][5],
          kepalaSekolah: sData[i][8],
          status: sData[i][10] || 'Terverifikasi'
        });
      }
    }

    var teachers = [];
    if (pSheet) {
      var pData = pSheet.getDataRange().getValues();
      for (var j = 1; j < pData.length; j++) {
        teachers.push({
          uid: pData[j][0],
          nama: pData[j][1],
          nip: pData[j][2],
          noHp: pData[j][3],
          namaSekolah: pData[j][5],
          npsn: pData[j][6],
          jabatan: pData[j][7],
          statusKepegawaian: pData[j][8],
          statusVerifikasi: pData[j][10] || 'Terverifikasi'
        });
      }
    }

    return {
      success: true,
      stats: {
        totalSchools: schools.length,
        totalTeachers: teachers.length,
        totalClasses: kSheet ? Math.max(0, kSheet.getLastRow() - 1) : 0,
        totalStudents: stSheet ? Math.max(0, stSheet.getLastRow() - 1) : 0
      },
      schools: schools,
      teachers: teachers
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function getSchoolAdminDataBackend(schoolId) {
  try {
    var ss = getActiveDb();
    var pSheet = ss.getSheetByName('Teacher_Profiles');
    var kSheet = ss.getSheetByName('Data_Kelas');

    var schoolTeachers = [];
    if (pSheet) {
      var pData = pSheet.getDataRange().getValues();
      for (var i = 1; i < pData.length; i++) {
        if (!schoolId || String(pData[i][4]).trim() === schoolId) {
          schoolTeachers.push({
            id: pData[i][0],
            nama: pData[i][1],
            nip: pData[i][2],
            jabatan: pData[i][7],
            statusKepegawaian: pData[i][8],
            statusVerifikasi: pData[i][10]
          });
        }
      }
    }

    var schoolClasses = [];
    if (kSheet) {
      var kData = kSheet.getDataRange().getValues();
      for (var j = 1; j < kData.length; j++) {
        if (!schoolId || String(kData[j][2]).trim() === schoolId) {
          schoolClasses.push({
            id: kData[j][0],
            tingkat: kData[j][4],
            namaRombel: kData[j][5],
            tahunAjaran: kData[j][6],
            ownerUid: kData[j][1]
          });
        }
      }
    }

    return {
      success: true,
      teachers: schoolTeachers,
      classes: schoolClasses
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function deleteRowByIdBackend(sheetName, id) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };
    var data = sheet.getDataRange().getValues();
    var targetId = String(id || '').trim();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === targetId) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Data berhasil dihapus.' };
      }
    }
    return { success: false, message: 'Data tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function savePengaturanSekolahBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Pengaturan_Sekolah');
    if (!sheet) return { success: false, message: 'Sheet Pengaturan_Sekolah tidak ada.' };

    var data = sheet.getDataRange().getValues();
    var map = {
      'NAMA_SEKOLAH': p.namaSekolah,
      'NPSN': p.npsn,
      'KECAMATAN': p.kecamatan,
      'KEPALA_SEKOLAH': p.kepalaSekolah,
      'NIP_KEPALA_SEKOLAH': p.nipKepalaSekolah,
      'TAHUN_AJARAN_AKTIF': p.tahunAjaranAktif,
      'SEMESTER_AKTIF': p.semesterAktif
    };

    for (var k in map) {
      if (map[k] !== undefined) {
        var found = false;
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][0]).trim().toUpperCase() === k) {
            sheet.getRange(i + 1, 2).setValue(map[k]);
            found = true;
            break;
          }
        }
        if (!found) {
          sheet.appendRow([k, map[k]]);
        }
      }
    }
    return { success: true, message: 'Pengaturan tersimpan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function backupDatabaseBackend() {
  try {
    var ss = getActiveDb();
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    var backupName = 'SiGuru_SD_Ambulu_Backup_' + nowStr;
    var copy = ss.copy(backupName);
    return { success: true, backupSpreadsheetUrl: copy.getUrl() };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function logActivity(uid, nama, role, schoolId, aksi, detail) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Audit_Logs');
    if (sheet) {
      var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      sheet.appendRow(['LOG-' + Date.now().toString().slice(-6), nowStr, uid, nama, role, schoolId, aksi, detail]);
    }
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
// INISIALISASI DATABASE BERSIH DENGAN 13 SD NEGERI AMBULU RESMI
// ============================================================
function setupDatabaseMultiSchool() {
  var ss = getActiveDb();
  var sheetsDef = [
    { name: 'Schools', headers: ['ID_Sekolah', 'Nama_Sekolah', 'NPSN', 'Kode_Unik', 'Alamat', 'Desa', 'Kecamatan', 'Kabupaten', 'Kepala_Sekolah', 'NIP_KS', 'Status', 'Tanggal_Dibuat'] },
    { name: 'Teacher_Profiles', headers: ['ID_Guru', 'Nama_Lengkap', 'NIP', 'No_HP', 'ID_Sekolah', 'Nama_Sekolah', 'NPSN', 'Jabatan', 'Status_Kepegawaian', 'PIN', 'Status_Verifikasi', 'Tanggal_Daftar'] },
    { name: 'Users', headers: ['ID_User', 'UID', 'Email_Username', 'Nama_Lengkap', 'Role', 'ID_Sekolah', 'Nama_Sekolah', 'Status_Akun', 'Tanggal_Daftar', 'Terakhir_Login'] },
    { name: 'Data_Kelas', headers: ['ID_Kelas', 'Owner_UID', 'ID_Sekolah', 'Nama_Sekolah', 'Tingkat', 'Nama_Rombel', 'Tahun_Ajaran', 'Semester', 'Status_Kelas', 'Waktu_Dibuat'] },
    { name: 'Data_Siswa', headers: ['ID_Siswa', 'ID_Kelas', 'Owner_UID', 'ID_Sekolah', 'NIS', 'NISN', 'Nama_Lengkap', 'JK', 'Tempat_Lahir', 'Tanggal_Lahir', 'Alamat', 'Nama_Wali', 'No_HP_Wali', 'Status'] },
    { name: 'Presensi', headers: ['ID_Presensi', 'Tanggal', 'ID_Kelas', 'Nama_Kelas', 'ID_Siswa', 'Nama_Siswa', 'Status_Hadir', 'Keterangan', 'Owner_UID', 'ID_Sekolah', 'Waktu_Input'] },
    { name: 'Nilai_Siswa', headers: ['ID_Nilai', 'ID_Kelas', 'Nama_Kelas', 'ID_Siswa', 'Nama_Siswa', 'Mapel', 'Lingkup_Materi', 'Nilai_Formatif', 'Nilai_Sumatif', 'Nilai_SAS', 'Nilai_Akhir', 'Semester', 'Tahun_Ajaran', 'Owner_UID', 'ID_Sekolah'] },
    { name: 'Jurnal_Mengajar', headers: ['ID_Jurnal', 'ID_Kelas', 'Nama_Kelas', 'Tanggal', 'Jam_Ke', 'Mapel', 'Topik_Materi', 'Kegiatan_Pembelajaran', 'Siswa_Tidak_Hadir', 'Catatan_Refleksi', 'Owner_UID', 'ID_Sekolah'] },
    { name: 'Perangkat_Ajar', headers: ['ID_Dokumen', 'Judul_Dokumen', 'Mata_Pelajaran', 'Kategori_Kelas', 'Jenis', 'Format_Tipe', 'Nama_File', 'Ukuran_File', 'Sumber', 'Durasi_JP', 'Link_Berkas', 'Deskripsi', 'Owner_UID', 'Uploader', 'ID_Sekolah', 'Status_Publikasi', 'Waktu_Upload'] },
    { name: 'Pengaturan_Sekolah', headers: ['Kunci', 'Nilai'] },
    { name: 'Pengumuman', headers: ['ID_Pengumuman', 'Tanggal', 'Judul', 'Isi', 'Pengirim', 'ID_Sekolah', 'Status'] },
    { name: 'Audit_Logs', headers: ['ID_Log', 'Waktu', 'ID_User', 'Nama_User', 'Role', 'ID_Sekolah', 'Aksi', 'Detail'] }
  ];

  sheetsDef.forEach(function (def) {
    var sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      sheet.appendRow(def.headers);
      sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#E2E8F0');
    }
  });

  // Isi 13 SD Negeri Resmi Kecamatan Ambulu beserta Kode Unik Aksesnya
  var schoolsSheet = ss.getSheetByName('Schools');
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  if (schoolsSheet && schoolsSheet.getLastRow() <= 1) {
    var officialSchools = [
      ['SCH-20524972', 'SDN Ambulu 02', '20524972', 'AMB02-8821', 'Kecamatan Ambulu, Jember', 'Ambulu', 'Ambulu', 'Jember', 'Kepala Sekolah', '-', 'Terverifikasi', now],
      ['SCH-20524171', 'SDN Tegalsari 01', '20524171', 'TGL01-7142', 'Kecamatan Ambulu, Jember', 'Tegalsari', 'Ambulu', 'Jember', 'Kepala Sekolah', '-', 'Terverifikasi', now],
      ['SCH-20524146', 'SDN Tegalsari 02', '20524146', 'TGL02-6315', 'Kecamatan Ambulu, Jember', 'Tegalsari', 'Ambulu', 'Jember', 'Kepala Sekolah', '-', 'Terverifikasi', now],
      ['SCH-20524148', 'SDN Tegalsari 03', '20524148', 'TGL03-5294', 'Kecamatan Ambulu, Jember', 'Tegalsari', 'Ambulu', 'Jember', 'Kepala Sekolah', '-', 'Terverifikasi', now],
      ['SCH-20524147', 'SDN Tegalsari 04', '20524147', 'TGL04-4819', 'Kecamatan Ambulu, Jember', 'Tegalsari', 'Ambulu', 'Jember', 'Kepala Sekolah', '-', 'Terverifikasi', now],
      ['SCH-20524058', 'SDN Sumberejo 04', '20524058', 'SMB04-3918', 'Kecamatan Ambulu, Jember', 'Sumberejo', 'Ambulu', 'Jember', 'Kepala Sekolah', '-', 'Terverifikasi', now],
      ['SCH-20524059', 'SDN Sumberejo 05', '20524059', 'SMB05-2746', 'Kecamatan Ambulu, Jember', 'Sumberejo', 'Ambulu', 'Jember', 'Kepala Sekolah', '-', 'Terverifikasi', now],
      ['SCH-20524060', 'SDN Sumberejo 07', '20524060', 'SMB07-1683', 'Kecamatan Ambulu, Jember', 'Sumberejo', 'Ambulu', 'Jember', 'Kepala Sekolah', '-', 'Terverifikasi', now],
      ['SCH-20524958', 'SDN Andongsari 02', '20524958', 'ADG02-9524', 'Kecamatan Ambulu, Jember', 'Andongsari', 'Ambulu', 'Jember', 'Kepala Sekolah', '-', 'Terverifikasi', now],
      ['SCH-20524962', 'SDN Andongsari 04', '20524962', 'ADG04-8417', 'Kecamatan Ambulu, Jember', 'Andongsari', 'Ambulu', 'Jember', 'Kepala Sekolah', '-', 'Terverifikasi', now],
      ['SCH-20523264', 'SDN Pontang 01', '20523264', 'PNT01-7362', 'Kecamatan Ambulu, Jember', 'Pontang', 'Ambulu', 'Jember', 'Kepala Sekolah', '-', 'Terverifikasi', now],
      ['SCH-20524830', 'SDN Karanganyar 01', '20524830', 'KRN01-6251', 'Kecamatan Ambulu, Jember', 'Karanganyar', 'Ambulu', 'Jember', 'Kepala Sekolah', '-', 'Terverifikasi', now],
      ['SCH-20524821', 'SDN Karanganyar 03', '20524821', 'KRN03-5149', 'Kecamatan Ambulu, Jember', 'Karanganyar', 'Ambulu', 'Jember', 'Kepala Sekolah', '-', 'Terverifikasi', now]
    ];
    schoolsSheet.getRange(2, 1, officialSchools.length, officialSchools[0].length).setValues(officialSchools);
  }

  // Pengaturan Platform
  var setSheet = ss.getSheetByName('Pengaturan_Sekolah');
  if (setSheet && setSheet.getLastRow() <= 1) {
    var defaultSettings = [
      ['NAMA_PLATFORM', 'SiGuru SD - Kecamatan Ambulu, Kabupaten Jember'],
      ['KECAMATAN', 'Ambulu'],
      ['KABUPATEN', 'Jember'],
      ['PROVINSI', 'Jawa Timur'],
      ['TAHUN_AJARAN_AKTIF', '2026/2027'],
      ['SEMESTER_AKTIF', 'Ganjil'],
      ['LOGO_URL', 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png']
    ];
    setSheet.getRange(2, 1, defaultSettings.length, defaultSettings[0].length).setValues(defaultSettings);
  }

  SpreadsheetApp.flush();
  return { success: true, message: 'Database Multi-Sekolah Kecamatan Ambulu berhasil diinisialisasi.' };
}

function getAllAdminDataLegacy() {
  return { success: true, message: 'Silakan gunakan verifikasi NPSN & Kode Unik.' };
}
