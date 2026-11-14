/**
 * ============================================================
 * SiGuru SD - Platform Administrasi Pendidikan Kecamatan Ambulu
 * Kabupaten Jember - Multi-School & Multi-Teacher Platform
 * Backend Google Apps Script (JSON REST API v3.0)
 * ============================================================
 */

var PLATFORM_TITLE = 'Portal Administrasi Guru SD Kecamatan Ambulu - Jember';
var DRIVE_FOLDER_NAME = 'SiGuru SD - Bank Perangkat Ajar';

// ============================================================
// SISTEM VERSIONING & CONCURRENCY LOCK (REAL-TIME MULTI-DEVICE)
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

function withScriptLock(actionName, fn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var res = fn();
    SpreadsheetApp.flush();
    if (res && res.success) {
      var verInfo = incrementDataVersion(actionName);
      res.version = verInfo.version;
      res.lastUpdated = verInfo.lastUpdated;
    }
    return res;
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

// ============================================================
// VERIFIKASI GOOGLE OAUTH TOKEN (FIREBASE AUTHENTICATION)
// ============================================================
function verifyGoogleIdTokenBackend(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    var url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken.trim());
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      var payload = JSON.parse(response.getContentText());
      return {
        uid: payload.sub,
        email: payload.email,
        name: payload.name || '',
        picture: payload.picture || '',
        verified: (payload.email_verified === 'true' || payload.email_verified === true)
      };
    }
  } catch (err) {
    console.warn('Gagal memverifikasi ID token via Google API:', err.message);
  }
  return null;
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
          version: '3.0.0-PROD',
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
      // 1. Autentikasi Google & Firebase
      case 'authGoogle':
        result = withScriptLock('authGoogle', function () { return authWithGoogleBackend(payload); });
        break;

      case 'registerTeacherProfile':
        result = withScriptLock('registerTeacherProfile', function () { return registerTeacherProfileBackend(payload); });
        break;

      case 'updateTeacherProfile':
        result = withScriptLock('updateTeacherProfile', function () { return updateTeacherProfileBackend(payload); });
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

      // 7. Utilitas Sistem & Cadangan
      case 'backupDatabase':
        result = withScriptLock('backupDatabase', function () { return backupDatabaseBackend(); });
        break;

      case 'setupDatabase':
        result = withScriptLock('setupDatabase', function () { return setupDatabaseMultiSchool(); });
        break;

      default:
        result = { success: false, message: 'Action tidak dikenali: ' + action };
        break;
    }
  } catch (err) {
    result = { success: false, message: 'Error doPost: ' + err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// AUTENTIKASI DENGAN GOOGLE / FIREBASE SIGN-IN
// ============================================================
function authWithGoogleBackend(payload) {
  var idToken = payload.idToken || '';
  var clientUid = payload.uid || '';
  var clientEmail = payload.email || '';
  var clientName = payload.name || payload.displayName || '';
  var clientPhoto = payload.photoURL || '';

  var verifiedUid = clientUid;
  var verifiedEmail = clientEmail;
  var verifiedName = clientName;
  var verifiedPhoto = clientPhoto;

  // Coba verifikasi Google ID Token jika tersedia
  if (idToken) {
    var verifiedData = verifyGoogleIdTokenBackend(idToken);
    if (verifiedData && verifiedData.uid) {
      verifiedUid = verifiedData.uid;
      verifiedEmail = verifiedData.email;
      verifiedName = verifiedData.name || verifiedName;
      verifiedPhoto = verifiedData.picture || verifiedPhoto;
    }
  }

  if (!verifiedUid) {
    return { success: false, message: 'Identitas Google tidak valid atau sesi kadaluarsa.' };
  }

  var ss = getActiveDb();
  var pSheet = ss.getSheetByName('Teacher_Profiles');
  var uSheet = ss.getSheetByName('Users');

  // Pastikan sheet Teacher_Profiles dan Users ada
  if (!pSheet || !uSheet) {
    setupDatabaseMultiSchool();
    ss = getActiveDb();
    pSheet = ss.getSheetByName('Teacher_Profiles');
    uSheet = ss.getSheetByName('Users');
  }

  // 1. Cek apakah pengguna sudah memiliki profil guru
  var profile = null;
  if (pSheet) {
    var pData = pSheet.getDataRange().getValues();
    for (var i = 1; i < pData.length; i++) {
      var r = pData[i];
      // [UID(0), Nama(1), Email(2), Foto(3), NIP(4), NUPTK(5), No_HP(6), ID_Sekolah(7), Nama_Sekolah(8), Jabatan(9), Status_Kepegawaian(10), Mapel(11), Tahun_Mulai(12), Status_Verifikasi(13), Tanggal_Daftar(14)]
      if (String(r[0]).trim() === verifiedUid || String(r[2]).trim().toLowerCase() === verifiedEmail.toLowerCase()) {
        profile = {
          uid: String(r[0]).trim(),
          nama: String(r[1]).trim(),
          email: String(r[2]).trim(),
          fotoUrl: String(r[3]).trim() || verifiedPhoto,
          nip: String(r[4]).trim(),
          nuptk: String(r[5]).trim(),
          noHp: String(r[6]).trim(),
          schoolId: String(r[7]).trim(),
          namaSekolah: String(r[8]).trim(),
          jabatan: String(r[9]).trim(),
          statusKepegawaian: String(r[10]).trim(),
          mapel: String(r[11]).trim(),
          tahunMulai: String(r[12]).trim(),
          statusVerifikasi: String(r[13]).trim() || 'Terverifikasi',
          tanggalDaftar: String(r[14]).trim()
        };
        break;
      }
    }
  }

  // 2. Cek Role di tabel Users
  var role = 'Guru';
  var statusAkun = 'Aktif';
  if (uSheet) {
    var uData = uSheet.getDataRange().getValues();
    for (var j = 1; j < uData.length; j++) {
      var ur = uData[j];
      // [ID_User(0), UID(1), Email(2), Nama(3), Role(4), ID_Sekolah(5), Nama_Sekolah(6), Status_Akun(7), Tanggal_Daftar(8), Last_Login(9)]
      if (String(ur[1]).trim() === verifiedUid || String(ur[2]).trim().toLowerCase() === verifiedEmail.toLowerCase()) {
        role = String(ur[4]).trim();
        statusAkun = String(ur[7]).trim();
        // Update Last Login
        var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
        uSheet.getRange(j + 1, 10).setValue(nowStr);
        break;
      }
    }
  }

  // Deteksi Super Admin khusus Kecamatan Ambulu
  if (verifiedEmail.toLowerCase().includes('admin.kecamatan') || verifiedEmail.toLowerCase() === 'superadmin@ambulu.go.id') {
    role = 'SuperAdmin';
  }

  // Jika akun belum pernah mendaftar profil, beri sinyal isNewUser agar diarahkan ke form registrasi
  if (!profile) {
    return {
      success: true,
      isNewUser: true,
      uid: verifiedUid,
      email: verifiedEmail,
      nama: verifiedName,
      fotoUrl: verifiedPhoto,
      message: 'Akun Google terhubung. Silakan lengkapi profil guru Anda.'
    };
  }

  return {
    success: true,
    isNewUser: false,
    uid: verifiedUid,
    role: role,
    statusAkun: statusAkun,
    profile: profile,
    message: 'Selamat datang kembali, ' + profile.nama
  };
}

// ============================================================
// REGISTRASI PROFIL GURU BARU (SELF-REGISTRATION)
// ============================================================
function registerTeacherProfileBackend(p) {
  try {
    var uid = (p.uid || '').trim();
    var email = (p.email || '').trim();
    var nama = (p.nama || '').trim();
    var schoolId = (p.schoolId || '').trim();
    var namaSekolah = (p.namaSekolah || '').trim();

    if (!uid || !email || !nama) {
      return { success: false, message: 'UID, Email, dan Nama Lengkap wajib diisi.' };
    }

    var ss = getActiveDb();
    var pSheet = ss.getSheetByName('Teacher_Profiles');
    var uSheet = ss.getSheetByName('Users');
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    // Jika nama sekolah belum diisi, cari dari ID_Sekolah
    if (!namaSekolah && schoolId) {
      var sSheet = ss.getSheetByName('Schools');
      if (sSheet) {
        var sData = sSheet.getDataRange().getValues();
        for (var s = 1; s < sData.length; s++) {
          if (String(sData[s][0]).trim() === schoolId) {
            namaSekolah = String(sData[s][1]).trim();
            break;
          }
        }
      }
    }

    // 1. Simpan ke Teacher_Profiles
    var profileRow = [
      uid,
      nama,
      email,
      p.fotoUrl || '',
      p.nip || '',
      p.nuptk || '',
      p.noHp || '',
      schoolId,
      namaSekolah || 'SD Negeri di Kecamatan Ambulu',
      p.jabatan || 'Guru Kelas',
      p.statusKepegawaian || 'PNS',
      p.mapel || 'Semua Mapel',
      p.tahunMulai || '2024',
      'Terverifikasi',
      nowStr
    ];
    pSheet.appendRow(profileRow);

    // 2. Simpan atau Perbarui ke Users
    var userRow = [
      'USR-' + Date.now().toString().slice(-5),
      uid,
      email,
      nama,
      p.role || 'Guru',
      schoolId,
      namaSekolah || 'SD Negeri di Kecamatan Ambulu',
      'Aktif',
      nowStr,
      nowStr
    ];
    uSheet.appendRow(userRow);

    logActivity(uid, nama, 'Guru', schoolId, 'Registrasi Profil Guru', 'Mendaftarkan profil guru di ' + namaSekolah);

    return {
      success: true,
      profile: {
        uid: uid,
        nama: nama,
        email: email,
        fotoUrl: p.fotoUrl || '',
        nip: p.nip || '',
        nuptk: p.nuptk || '',
        noHp: p.noHp || '',
        schoolId: schoolId,
        namaSekolah: namaSekolah,
        jabatan: p.jabatan || 'Guru Kelas',
        statusKepegawaian: p.statusKepegawaian || 'PNS',
        mapel: p.mapel || 'Semua Mapel',
        tahunMulai: p.tahunMulai || '2024',
        statusVerifikasi: 'Terverifikasi',
        tanggalDaftar: nowStr
      },
      message: 'Profil guru berhasil didaftarkan.'
    };
  } catch (err) {
    return { success: false, message: 'Gagal registrasi profil: ' + err.message };
  }
}

function updateTeacherProfileBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Teacher_Profiles');
    var data = sheet.getDataRange().getValues();
    var uid = (p.uid || '').trim();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === uid) {
        if (p.nama) sheet.getRange(i + 1, 2).setValue(p.nama);
        if (p.fotoUrl) sheet.getRange(i + 1, 4).setValue(p.fotoUrl);
        if (p.nip !== undefined) sheet.getRange(i + 1, 5).setValue(p.nip);
        if (p.nuptk !== undefined) sheet.getRange(i + 1, 6).setValue(p.nuptk);
        if (p.noHp !== undefined) sheet.getRange(i + 1, 7).setValue(p.noHp);
        if (p.schoolId) sheet.getRange(i + 1, 8).setValue(p.schoolId);
        if (p.namaSekolah) sheet.getRange(i + 1, 9).setValue(p.namaSekolah);
        if (p.jabatan) sheet.getRange(i + 1, 10).setValue(p.jabatan);
        if (p.statusKepegawaian) sheet.getRange(i + 1, 11).setValue(p.statusKepegawaian);
        if (p.mapel) sheet.getRange(i + 1, 12).setValue(p.mapel);
        if (p.tahunMulai) sheet.getRange(i + 1, 13).setValue(p.tahunMulai);
        return { success: true, message: 'Profil guru berhasil diperbarui.' };
      }
    }
    return { success: false, message: 'Data profil guru tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.message };
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
        // [ID_Siswa(0), ID_Kelas(1), Owner_UID(2), ID_Sekolah(3), NIS(4), NISN(5), Nama_Lengkap(6), JK(7), Tempat_Lahir(8), Tanggal_Lahir(9), Alamat(10), Nama_Wali(11), No_HP_Wali(12), Status(13)]
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
        // [ID_Presensi(0), Tanggal(1), ID_Kelas(2), Nama_Kelas(3), ID_Siswa(4), Nama_Siswa(5), Status_Hadir(6), Keterangan(7), Owner_UID(8), ID_Sekolah(9), Waktu_Input(10)]
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
        // [ID_Nilai(0), ID_Kelas(1), Nama_Kelas(2), ID_Siswa(3), Nama_Siswa(4), Mapel(5), Lingkup_Materi(6), Formatif(7), Sumatif(8), SAS(9), Akhir(10), Semester(11), Tahun(12), Owner_UID(13)]
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

    // 5. Jurnal Mengajar
    var jSheet = ss.getSheetByName('Jurnal_Mengajar');
    var myJurnal = [];
    if (jSheet) {
      var jData = jSheet.getDataRange().getValues();
      for (var k = 1; k < jData.length; k++) {
        var jr = jData[k];
        // [ID_Jurnal(0), ID_Kelas(1), Nama_Kelas(2), Tanggal(3), Jam_Ke(4), Mapel(5), Topik(6), Kegiatan(7), Siswa_Absen(8), Refleksi(9), Owner_UID(10)]
        var jOwner = String(jr[10]).trim();
        if (!uid || jOwner === uid) {
          myJurnal.push({
            id: String(jr[0]).trim(),
            idKelas: String(jr[1]).trim(),
            namaKelas: String(jr[2]).trim(),
            tanggal: String(jr[3]).trim(),
            jamKe: String(jr[4]).trim(),
            mapel: String(jr[5]).trim(),
            topikMateri: String(jr[6]).trim(),
            kegiatanPembelajaran: String(jr[7]).trim(),
            siswaTidakHadir: String(jr[8]).trim(),
            catatanRefleksi: String(jr[9]).trim()
          });
        }
      }
    }

    // 6. Bank Perangkat Ajar (Dapat diakses bersama oleh seluruh guru di platform)
    var dSheet = ss.getSheetByName('Perangkat_Ajar');
    var perangkat = [];
    if (dSheet) {
      var dData = dSheet.getDataRange().getValues();
      for (var d = 1; d < dData.length; d++) {
        var dr = dData[d];
        if (String(dr[13]).trim() === 'Aktif' || !dr[13]) {
          perangkat.push({
            id: String(dr[0]).trim(),
            judul: String(dr[1]).trim(),
            mapel: String(dr[2]).trim(),
            kategoriKelas: String(dr[3]).trim(),
            jenis: String(dr[4]).trim(),
            formatTipe: String(dr[5]).trim(),
            namaFile: String(dr[6]).trim(),
            ukuranFile: String(dr[7]).trim(),
            sumber: String(dr[8]).trim(),
            durasiJP: String(dr[9]).trim(),
            linkBerkas: String(dr[10]).trim(),
            deskripsi: String(dr[11]).trim(),
            uploader: String(dr[12]).trim(),
            statusPublikasi: 'Aktif',
            waktuUpload: String(dr[14]).trim()
          });
        }
      }
    }

    // 7. Pengumuman
    var pgmSheet = ss.getSheetByName('Pengumuman');
    var pengumuman = [];
    if (pgmSheet) {
      var pgmData = pgmSheet.getDataRange().getValues();
      for (var pm = 1; pm < pgmData.length; pm++) {
        pengumuman.push({
          id: String(pgmData[pm][0]).trim(),
          tanggal: String(pgmData[pm][1]).trim(),
          judul: String(pgmData[pm][2]).trim(),
          isi: String(pgmData[pm][3]).trim(),
          pengirim: String(pgmData[pm][4]).trim()
        });
      }
    }

    var verInfo = getDataVersion();
    return {
      success: true,
      version: verInfo.version,
      lastUpdated: verInfo.lastUpdated,
      data: {
        kelas: myKelas,
        siswa: mySiswa,
        presensi: myPresensi,
        nilai: myNilai,
        jurnal: myJurnal,
        perangkat: perangkat,
        pengumuman: pengumuman
      }
    };
  } catch (err) {
    return { success: false, message: 'Gagal membaca data guru: ' + err.message };
  }
}

// ============================================================
// MASTER SEKOLAH (KECAMATAN AMBULU, KABUPATEN JEMBER)
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
          alamat: String(r[3]).trim(),
          desa: String(r[4]).trim(),
          kecamatan: String(r[5]).trim() || 'Ambulu',
          kabupaten: String(r[6]).trim() || 'Jember',
          kepalaSekolah: String(r[7]).trim(),
          status: String(r[9]).trim() || 'Terverifikasi'
        });
      }
    }
    return { success: true, schools: schools };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function requestNewSchoolBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Schools');
    var newId = 'SCH-' + Date.now().toString().slice(-4);
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    sheet.appendRow([
      newId,
      p.nama || 'SD Baru',
      p.npsn || '-',
      p.alamat || '-',
      p.desa || '-',
      'Ambulu',
      'Jember',
      p.kepalaSekolah || '-',
      '-',
      'Menunggu Verifikasi',
      nowStr
    ]);

    logActivity(p.uid || '', p.namaPemohon || '', 'Guru', newId, 'Pengajuan Sekolah Baru', 'Mengajukan pendaftaran sekolah ' + p.nama);

    return { success: true, id: newId, message: 'Pengajuan sekolah baru berhasil dikirim dan menunggu verifikasi Super Admin.' };
  } catch (err) {
    return { success: false, message: err.message };
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
          // Validasi kepemilikan
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
        s.nis || '',
        s.nisn || '',
        s.nama || s.namaLengkap || 'Siswa',
        s.jenisKelamin || s.jk || 'L',
        s.tempatLahir || 'Jember',
        s.tanggalLahir || '',
        s.alamat || '-',
        s.namaWali || '-',
        s.noHpWali || '',
        'Aktif'
      ]);
    }

    if (rows.length > 0) {
      var lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    return { success: true, count: rows.length, message: rows.length + ' siswa berhasil diimpor ke kelas.' };
  } catch (err) {
    return { success: false, message: 'Gagal impor siswa: ' + err.message };
  }
}

function deleteStudentTeacherBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Data_Siswa');
    var data = sheet.getDataRange().getValues();
    var id = (p.id || p.studentId || '').trim();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === id) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Data siswa berhasil dihapus.' };
      }
    }
    return { success: false, message: 'Siswa tidak ditemukan.' };
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
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    var data = sheet.getDataRange().getValues();
    var sId = String(p.idSiswa).trim();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][4]).trim() === sId && String(data[i][1]).trim() === today) {
        sheet.getRange(i + 1, 7).setValue(p.statusHadir);
        sheet.getRange(i + 1, 11).setValue(now);
        return { success: true, message: 'Presensi diperbarui.' };
      }
    }

    var newId = 'PRS-' + Date.now().toString().slice(-5);
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
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Presensi');
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

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

// ============================================================
// JURNAL MENGAJAR & BANK PERANGKAT AJAR
// ============================================================
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
// SUPER ADMIN KECAMATAN AMBULU & SCHOOL ADMIN ENDPOINTS
// ============================================================
function getSuperAdminDataBackend() {
  try {
    var ss = getActiveDb();
    var sSheet = ss.getSheetByName('Schools');
    var pSheet = ss.getSheetByName('Teacher_Profiles');
    var kSheet = ss.getSheetByName('Data_Kelas');
    var stSheet = ss.getSheetByName('Data_Siswa');
    var aSheet = ss.getSheetByName('Audit_Logs');

    var totalSchools = sSheet ? Math.max(0, sSheet.getLastRow() - 1) : 0;
    var totalTeachers = pSheet ? Math.max(0, pSheet.getLastRow() - 1) : 0;
    var totalClasses = kSheet ? Math.max(0, kSheet.getLastRow() - 1) : 0;
    var totalStudents = stSheet ? Math.max(0, stSheet.getLastRow() - 1) : 0;

    var schools = [];
    if (sSheet) {
      var sData = sSheet.getDataRange().getValues();
      for (var i = 1; i < sData.length; i++) {
        schools.push({
          id: sData[i][0],
          nama: sData[i][1],
          npsn: sData[i][2],
          desa: sData[i][4],
          kepalaSekolah: sData[i][7],
          status: sData[i][9] || 'Terverifikasi'
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
          email: pData[j][2],
          namaSekolah: pData[j][8],
          jabatan: pData[j][9],
          statusKepegawaian: pData[j][10],
          statusVerifikasi: pData[j][13] || 'Terverifikasi'
        });
      }
    }

    var logs = [];
    if (aSheet) {
      var aData = aSheet.getDataRange().getValues();
      for (var l = Math.max(1, aData.length - 15); l < aData.length; l++) {
        logs.unshift({
          waktu: aData[l][1],
          namaUser: aData[l][3],
          aksi: aData[l][6],
          detail: aData[l][7]
        });
      }
    }

    return {
      success: true,
      stats: {
        totalSchools: totalSchools,
        totalTeachers: totalTeachers,
        totalClasses: totalClasses,
        totalStudents: totalStudents
      },
      schools: schools,
      teachers: teachers,
      logs: logs
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
    var stSheet = ss.getSheetByName('Data_Siswa');

    var schoolTeachers = [];
    if (pSheet) {
      var pData = pSheet.getDataRange().getValues();
      for (var i = 1; i < pData.length; i++) {
        if (!schoolId || String(pData[i][7]).trim() === schoolId) {
          schoolTeachers.push({
            uid: pData[i][0],
            nama: pData[i][1],
            email: pData[i][2],
            jabatan: pData[i][9],
            statusKepegawaian: pData[i][10],
            statusVerifikasi: pData[i][13]
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

function verifySchoolBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Schools');
    var data = sheet.getDataRange().getValues();
    var schoolId = (p.schoolId || '').trim();
    var status = p.status || 'Terverifikasi';

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === schoolId) {
        sheet.getRange(i + 1, 10).setValue(status);
        return { success: true, message: 'Status sekolah diperbarui menjadi: ' + status };
      }
    }
    return { success: false, message: 'Sekolah tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function verifyTeacherBackend(p) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Teacher_Profiles');
    var data = sheet.getDataRange().getValues();
    var uid = (p.uid || '').trim();
    var status = p.status || 'Terverifikasi';

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === uid) {
        sheet.getRange(i + 1, 14).setValue(status);
        return { success: true, message: 'Status guru diperbarui menjadi: ' + status };
      }
    }
    return { success: false, message: 'Guru tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ============================================================
// CADANGAN DATABASE & AUDIT LOGS
// ============================================================
function backupDatabaseBackend() {
  try {
    var ss = getActiveDb();
    var timeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    var copyName = 'BACKUP_SiGuru_Ambulu_' + timeStr;
    var file = DriveApp.getFileById(ss.getId());
    var backupFile = file.makeCopy(copyName);

    logActivity('SYSTEM', 'Sistem Cadangan', 'SuperAdmin', 'KEC-AMB', 'Backup Database', 'Membuat cadangan ke ' + copyName);

    return {
      success: true,
      backupUrl: backupFile.getUrl(),
      backupName: copyName,
      message: 'Cadangan database Google Sheets berhasil dibuat: ' + copyName
    };
  } catch (err) {
    return { success: false, message: 'Gagal membuat cadangan: ' + err.message };
  }
}

function logActivity(uid, nama, role, schoolId, aksi, detail) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName('Audit_Logs');
    if (!sheet) return;
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([
      'LOG-' + Date.now().toString().slice(-5),
      now,
      uid || 'ANON',
      nama || 'Pengguna',
      role || 'Guru',
      schoolId || '-',
      aksi || '-',
      detail || '-'
    ]);
  } catch (e) {}
}

function deleteRowByIdBackend(sheetName, id) {
  try {
    var ss = getActiveDb();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: 'Sheet tidak ditemukan.' };
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(id).trim()) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Data berhasil dihapus.' };
      }
    }
    return { success: false, message: 'Data dengan ID tersebut tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ============================================================
// SETUP DATABASE PRODUKSI MULTI-SEKOLAH (KECAMATAN AMBULU)
// ============================================================
function setupDatabaseMultiSchool() {
  var ss = getActiveDb();
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  var schemas = {
    'Users': ['ID_User', 'UID', 'Email', 'Nama_Lengkap', 'Role', 'ID_Sekolah', 'Nama_Sekolah', 'Status_Akun', 'Tanggal_Daftar', 'Last_Login'],
    'Schools': ['ID_Sekolah', 'Nama_Sekolah', 'NPSN', 'Alamat', 'Desa', 'Kecamatan', 'Kabupaten', 'Kepala_Sekolah', 'NIP_Kepala_Sekolah', 'Status_Verifikasi', 'Tanggal_Daftar'],
    'Teacher_Profiles': ['UID', 'Nama_Lengkap', 'Email', 'Foto_URL', 'NIP', 'NUPTK', 'No_HP', 'ID_Sekolah', 'Nama_Sekolah', 'Jabatan', 'Status_Kepegawaian', 'Mata_Pelajaran', 'Tahun_Mulai_Mengajar', 'Status_Verifikasi', 'Tanggal_Daftar'],
    'Data_Kelas': ['ID_Kelas', 'Owner_UID', 'ID_Sekolah', 'Nama_Sekolah', 'Tingkat', 'Nama_Rombel', 'Tahun_Ajaran', 'Semester', 'Status_Kelas', 'Waktu_Dibuat'],
    'Data_Siswa': ['ID_Siswa', 'ID_Kelas', 'Owner_UID', 'ID_Sekolah', 'NIS', 'NISN', 'Nama_Lengkap', 'JK', 'Tempat_Lahir', 'Tanggal_Lahir', 'Alamat', 'Nama_Wali', 'No_HP_Wali', 'Status'],
    'Presensi': ['ID_Presensi', 'Tanggal', 'ID_Kelas', 'Nama_Kelas', 'ID_Siswa', 'Nama_Siswa', 'Status_Hadir', 'Keterangan', 'Owner_UID', 'ID_Sekolah', 'Waktu_Input'],
    'Nilai_Siswa': ['ID_Nilai', 'ID_Kelas', 'Nama_Kelas', 'ID_Siswa', 'Nama_Siswa', 'Mata_Pelajaran', 'Lingkup_Materi', 'Nilai_Formatif', 'Nilai_Sumatif', 'Nilai_SAS', 'Nilai_Akhir', 'Semester', 'Tahun_Ajaran', 'Owner_UID', 'ID_Sekolah'],
    'Jurnal_Mengajar': ['ID_Jurnal', 'ID_Kelas', 'Nama_Kelas', 'Tanggal', 'Jam_Ke', 'Mata_Pelajaran', 'Topik_Materi', 'Kegiatan_Pembelajaran', 'Siswa_Tidak_Hadir', 'Catatan_Refleksi', 'Owner_UID', 'ID_Sekolah'],
    'Perangkat_Ajar': ['ID_Dokumen', 'Judul_Dokumen', 'Mata_Pelajaran', 'Kategori_Kelas', 'Jenis', 'Format_Tipe', 'Nama_File', 'Ukuran_File', 'Sumber', 'Durasi_JP', 'Link_Berkas', 'Deskripsi', 'Uploader_UID', 'Uploader_Nama', 'ID_Sekolah', 'Status_Publikasi', 'Waktu_Upload'],
    'Pengumuman': ['ID_Pengumuman', 'Tanggal', 'Judul', 'Isi', 'Pengirim', 'Target_Role', 'Target_ID_Sekolah', 'Status'],
    'Audit_Logs': ['ID_Log', 'Waktu', 'User_UID', 'Nama_User', 'Role', 'ID_Sekolah', 'Aksi', 'Detail'],
    'Pengaturan_Sekolah': ['Kunci', 'Nilai']
  };

  var sheetNames = Object.keys(schemas);
  for (var i = 0; i < sheetNames.length; i++) {
    var sName = sheetNames[i];
    var headers = schemas[sName];
    var sheet = ss.getSheetByName(sName);

    if (!sheet) {
      sheet = ss.insertSheet(sName);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setBackground('#091E42');
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }

  // Isi Master Data Sekolah Dasar Negeri di Kecamatan Ambulu (Jika kosong)
  var schoolsSheet = ss.getSheetByName('Schools');
  if (schoolsSheet && schoolsSheet.getLastRow() <= 1) {
    var masterSchools = [
      ['SCH-AMB-01', 'SD Negeri Ambulu 01', '20512001', 'Jl. Ahmad Yani No. 12', 'Ambulu', 'Ambulu', 'Jember', 'Dra. Hj. Nurul Hidayati, M.Pd.', '19700512 199603 2 001', 'Terverifikasi', now],
      ['SCH-AMB-02', 'SD Negeri Ambulu 02', '20512002', 'Jl. Suyitman No. 45', 'Ambulu', 'Ambulu', 'Jember', 'Bambang Supriyadi, S.Pd.', '19680315 199201 1 004', 'Terverifikasi', now],
      ['SCH-AMB-03', 'SD Negeri Ambulu 03', '20512003', 'Jl. Manggar No. 08', 'Ambulu', 'Ambulu', 'Jember', 'Siti Rohani, M.Pd.', '19720410 199803 2 003', 'Terverifikasi', now],
      ['SCH-AMB-04', 'SD Negeri Ambulu 04', '20512004', 'Jl. Watu Ulo No. 19', 'Ambulu', 'Ambulu', 'Jember', 'Drs. H. Mulyono', '19651005 198803 1 007', 'Terverifikasi', now],
      ['SCH-KRN-01', 'SD Negeri Karanganyar 01', '20512005', 'Jl. Raya Karanganyar No. 22', 'Karanganyar', 'Ambulu', 'Jember', 'Agus Salim, S.Pd.SD.', '19750814 200212 1 005', 'Terverifikasi', now],
      ['SCH-KRN-02', 'SD Negeri Karanganyar 02', '20512006', 'Dusun Sumberjo, Karanganyar', 'Karanganyar', 'Ambulu', 'Jember', 'Endang Wahyuni, S.Pd.', '19780120 200501 2 009', 'Terverifikasi', now],
      ['SCH-PNT-01', 'SD Negeri Pontang 01', '20512007', 'Jl. Raya Pontang No. 05', 'Pontang', 'Ambulu', 'Jember', 'Drs. Sunardi', '19660718 199103 1 008', 'Terverifikasi', now],
      ['SCH-PNT-02', 'SD Negeri Pontang 02', '20512008', 'Dusun Pontang Tengah', 'Pontang', 'Ambulu', 'Jember', 'Tri Astuti, S.Pd.', '19760925 200003 2 006', 'Terverifikasi', now],
      ['SCH-SBR-01', 'SD Negeri Sabrang 01', '20512009', 'Jl. Pantai Watu Ulo, Sabrang', 'Sabrang', 'Ambulu', 'Jember', 'Ahmad Zaini, S.Pd.I.', '19800211 200801 1 012', 'Terverifikasi', now],
      ['SCH-SBR-02', 'SD Negeri Sabrang 02', '20512010', 'Dusun Ungkalan, Sabrang', 'Sabrang', 'Ambulu', 'Jember', 'Sri Rahayu, S.Pd.', '19820519 200903 2 008', 'Terverifikasi', now],
      ['SCH-ADG-01', 'SD Negeri Andongsari 01', '20512011', 'Jl. Raya Andongsari No. 17', 'Andongsari', 'Ambulu', 'Jember', 'Mohammad Taufik, S.Pd.', '19740322 199903 1 003', 'Terverifikasi', now],
      ['SCH-ADG-02', 'SD Negeri Andongsari 02', '20512012', 'Dusun Krajan, Andongsari', 'Andongsari', 'Ambulu', 'Jember', 'Nur Aini, S.Pd.SD.', '19811104 200604 2 015', 'Terverifikasi', now],
      ['SCH-TGL-01', 'SD Negeri Tegalsari 01', '20512013', 'Jl. Pendidikan Tegalsari No. 03', 'Tegalsari', 'Ambulu', 'Jember', 'H. Sudirman, M.Pd.', '19671208 199302 1 002', 'Terverifikasi', now],
      ['SCH-SBR-03', 'SD Negeri Sumberejo 01', '20512014', 'Jl. Raya Sumberejo No. 88', 'Sumberejo', 'Ambulu', 'Jember', 'Yuli Astuti, S.Pd.', '19790715 200312 2 007', 'Terverifikasi', now]
    ];
    schoolsSheet.getRange(2, 1, masterSchools.length, masterSchools[0].length).setValues(masterSchools);
  }

  // Inisialisasi Akun Super Admin & Admin Sekolah Pertama
  var usersSheet = ss.getSheetByName('Users');
  if (usersSheet && usersSheet.getLastRow() <= 1) {
    var initialUsers = [
      ['USR-001', 'SUPERADMIN-AMBULU', 'superadmin@ambulu.go.id', 'Super Admin Koorwil Ambulu', 'SuperAdmin', 'SCH-KEC-01', 'Koorwil Pendidikan Kecamatan Ambulu', 'Aktif', now, now],
      ['USR-002', 'ADMIN-AMBULU01', 'admin.sdnambulu01@sekolah.id', 'Admin SDN Ambulu 01', 'Admin', 'SCH-AMB-01', 'SD Negeri Ambulu 01', 'Aktif', now, now]
    ];
    usersSheet.getRange(2, 1, initialUsers.length, initialUsers[0].length).setValues(initialUsers);
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
  return { success: true, message: 'Database Multi-Sekolah & Multi-Guru Kecamatan Ambulu berhasil diinisialisasi.' };
}

function getAllAdminDataLegacy() {
  var ss = getActiveDb();
  var uSheet = ss.getSheetByName('Users');
  var kSheet = ss.getSheetByName('Data_Kelas');
  var sSheet = ss.getSheetByName('Data_Siswa');
  var prSheet = ss.getSheetByName('Presensi');
  var nSheet = ss.getSheetByName('Nilai_Siswa');
  var jSheet = ss.getSheetByName('Jurnal_Mengajar');
  var dSheet = ss.getSheetByName('Perangkat_Ajar');
  var pSheet = ss.getSheetByName('Pengaturan_Sekolah');
  var pgmSheet = ss.getSheetByName('Pengumuman');

  var users = [];
  if (uSheet) {
    var uD = uSheet.getDataRange().getValues();
    for (var i = 1; i < uD.length; i++) {
      users.push({
        id: uD[i][0],
        uid: uD[i][1],
        email: uD[i][2],
        nama: uD[i][3],
        role: uD[i][4],
        idSekolah: uD[i][5],
        namaSekolah: uD[i][6],
        statusAkun: uD[i][7]
      });
    }
  }

  var kelas = [];
  if (kSheet) {
    var kD = kSheet.getDataRange().getValues();
    for (var j = 1; j < kD.length; j++) {
      kelas.push({
        id: kD[j][0],
        ownerUid: kD[j][1],
        idSekolah: kD[j][2],
        namaSekolah: kD[j][3],
        tingkat: kD[j][4],
        namaRombel: kD[j][5],
        tahunAjaran: kD[j][6],
        statusKelas: kD[j][8] || 'Aktif'
      });
    }
  }

  var siswa = [];
  if (sSheet) {
    var sD = sSheet.getDataRange().getValues();
    for (var s = 1; s < sD.length; s++) {
      siswa.push({
        id: sD[s][0],
        idKelas: sD[s][1],
        ownerUid: sD[s][2],
        nis: sD[s][4],
        nisn: sD[s][5],
        nama: sD[s][6],
        jk: sD[s][7],
        namaWali: sD[s][11],
        statusAktif: sD[s][13] || 'Aktif'
      });
    }
  }

  var presensi = [];
  if (prSheet) {
    var prD = prSheet.getDataRange().getValues();
    for (var pr = 1; pr < prD.length; pr++) {
      presensi.push({
        id: prD[pr][0],
        tanggal: prD[pr][1],
        idKelas: prD[pr][2],
        namaKelas: prD[pr][3],
        idSiswa: prD[pr][4],
        namaSiswa: prD[pr][5],
        statusHadir: prD[pr][6]
      });
    }
  }

  var nilai = [];
  if (nSheet) {
    var nD = nSheet.getDataRange().getValues();
    for (var n = 1; n < nD.length; n++) {
      nilai.push({
        id: nD[n][0],
        idKelas: nD[n][1],
        namaKelas: nD[n][2],
        idSiswa: nD[n][3],
        namaSiswa: nD[n][4],
        mapel: nD[n][5],
        nilaiAkhir: nD[n][10]
      });
    }
  }

  var verInfo = getDataVersion();
  return {
    success: true,
    version: verInfo.version,
    lastUpdated: verInfo.lastUpdated,
    data: {
      users: users,
      kelas: kelas,
      penugasan: [],
      siswa: siswa,
      presensi: presensi,
      nilai: nilai,
      jurnal: [],
      perangkat: [],
      pengumuman: [],
      pengaturan: {
        namaSekolah: 'Kecamatan Ambulu - Jember',
        npsn: '20512000',
        kepalaSekolah: 'Koorwil Pendidikan Kecamatan Ambulu'
      }
    }
  };
}
