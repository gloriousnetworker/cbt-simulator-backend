const admin = require('firebase-admin');

let db;
let auth;

try {
  if (admin.apps.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'];
      const missingVars = requiredVars.filter(v => !process.env[v]);
      
      if (missingVars.length > 0) {
        throw new Error(`Missing Firebase environment variables: ${missingVars.join(', ')}`);
      }

      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }

      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      const serviceAccount = require('../firebase-service-account.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  }

  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  auth = admin.auth();

} catch (error) {
  console.error('Firebase initialization error:', error);
  db = null;
  auth = null;
}

module.exports = { admin, db, auth };