export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.FIREBASE_API_KEY || '';
  const authDomain = process.env.FIREBASE_AUTH_DOMAIN || 'portaladmguru-e0689.firebaseapp.com';
  const projectId = process.env.FIREBASE_PROJECT_ID || 'portaladmguru-e0689';
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'portaladmguru-e0689.firebasestorage.app';
  const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID || '1078067835703';
  const appId = process.env.FIREBASE_APP_ID || '1:1078067835703:web:29e21b31d7e0088bc620b2';

  return res.status(200).json({
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId
  });
}
