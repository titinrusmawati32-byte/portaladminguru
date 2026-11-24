export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4.5mb'
    }
  }
};

export default async function handler(req, res) {
  const startTime = Date.now();

  // Header CORS lengkap
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let gasUrl = process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbwsVr0J9qSchXl5ltrLdOcZF3aSWEoRiRH5_4lwXSmut92i3AKF7FrpTzjTmARoWAUfCg/exec';
    let action = '';
    let payload = {};

    if (req.method === 'GET') {
      gasUrl = req.query.gasUrl || gasUrl;
      action = req.query.action || '';

      // Terapkan Edge Caching untuk Read-Only Query (misal getAllTeachersAdmin)
      const readActions = ['getAllTeachersAdmin', 'getMasterSchools', 'getSchoolProfiles', 'ping'];
      if (readActions.includes(action) && !req.query.nocache) {
        res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
      } else {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }

      if (!gasUrl) {
        return res.status(400).json({
          success: false,
          message: 'URL Google Apps Script belum ditentukan.'
        });
      }

      const targetUrl = new URL(gasUrl);
      targetUrl.searchParams.set('action', action);
      Object.entries(req.query).forEach(([k, v]) => {
        if (k !== 'gasUrl' && k !== 'action' && k !== 'nocache') {
          targetUrl.searchParams.set(k, String(v));
        }
      });

      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        redirect: 'follow'
      });

      const text = await response.text();
      res.setHeader('X-Execution-Latency', `${Date.now() - startTime}ms`);
      try {
        const json = JSON.parse(text);
        return res.status(200).json(json);
      } catch (e) {
        if (text.includes('ServiceLogin') || text.includes('accounts.google.com')) {
          return res.status(403).json({
            success: false,
            isAuthError: true,
            message: 'Akses ditolak oleh Google. Setelan "Who has access" di Apps Script belum disetel ke "Anyone" (Siapa saja).'
          });
        }

        if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('SiGuru SD - Administrasi Guru')) {
          return res.status(502).json({
            success: false,
            message: 'Google Apps Script masih menjalankan kode HTML lama. Ganti isi Code.gs di Apps Script dengan kode REST API dari gas/Code.gs, lalu Deploy > Manage deployments > Edit > New Version.'
          });
        }

        return res.status(502).json({
          success: false,
          message: 'Respons dari Google Apps Script bukan JSON: ' + text.slice(0, 150)
        });
      }
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      gasUrl = body.gasUrl || gasUrl;
      action = body.action || '';
      payload = body.payload || {};

      // Mutasi data (write) tidak boleh di-cache
      const isMutation = ['verifyTeacherRegistration', 'resetTeacherPinByAdmin', 'deletePerangkatAdmin', 'savePerangkatAdmin', 'saveStudentTeacher', 'deleteStudentTeacher', 'saveClassTeacher', 'deleteClassTeacher'].includes(action);
      if (isMutation) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      } else {
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
      }

      if (!gasUrl) {
        return res.status(400).json({
          success: false,
          message: 'URL Google Apps Script belum ditentukan.'
        });
      }

      // Kirim request ke Google Apps Script Web App
      const response = await fetch(gasUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ action, payload })
      });

      const text = await response.text();
      res.setHeader('X-Execution-Latency', `${Date.now() - startTime}ms`);
      try {
        const json = JSON.parse(text);
        return res.status(200).json(json);
      } catch (e) {
        if (text.includes('ServiceLogin') || text.includes('accounts.google.com')) {
          return res.status(403).json({
            success: false,
            isAuthError: true,
            message: 'Akses ditolak oleh Google. Setelan "Who has access" di Apps Script belum disetel ke "Anyone" (Siapa saja).'
          });
        }

        if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('SiGuru SD - Administrasi Guru')) {
          return res.status(502).json({
            success: false,
            message: 'Google Apps Script masih menjalankan kode HTML lama. Ganti isi Code.gs di Apps Script dengan kode REST API dari gas/Code.gs, lalu Deploy > Manage deployments > Edit > New Version.'
          });
        }

        return res.status(502).json({
          success: false,
          message: 'Respons dari Google Apps Script bukan JSON: ' + text.slice(0, 150)
        });
      }
    }

    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  } catch (err) {
    console.error('GAS Proxy Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Proxy Server Error: ' + err.message
    });
  }
}
