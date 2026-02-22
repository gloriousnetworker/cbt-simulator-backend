const admin = require('firebase-admin');

let db;
let auth;

try {
  // Check if already initialized
  if (admin.apps.length === 0) {
    console.log('Initializing Firebase...');
    console.log('Environment:', process.env.NODE_ENV);

    if (process.env.NODE_ENV === 'production') {

      console.log('Using environment variables for Firebase config');
      
      const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'];
      const missingVars = requiredVars.filter(v => !process.env[v]);
      
      if (missingVars.length > 0) {
        throw new Error(`Missing Firebase environment variables: ${missingVars.join(', ')}`);
      }

      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {

      console.log('Using local firebase-service-account.json');
      const serviceAccount = require('../firebase-service-account.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    console.log('Firebase initialized successfully!');
  }

  db = admin.firestore();
  auth = admin.auth();

} catch (error) {
  console.error('Firebase initialization error:', error);
  console.error('Error details:', {
    message: error.message,
    stack: error.stack,
    code: error.code
  });
  
  db = null;
  auth = null;
}

module.exports = { admin, db, auth };