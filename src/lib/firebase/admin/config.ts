
import admin from 'firebase-admin';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!admin.apps.length) {
  if (!serviceAccountKey) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. Firebase Admin SDK features will be unavailable.');
  } else {
    console.log('Attempting to initialize Firebase Admin SDK...');
    console.log(`ServiceAccountKey type: ${typeof serviceAccountKey}`);
    console.log(`ServiceAccountKey length: ${serviceAccountKey.length}`);
    console.log(`ServiceAccountKey starts with: ${serviceAccountKey.substring(0, 30)}`);
    console.log(`ServiceAccountKey ends with: ${serviceAccountKey.substring(serviceAccountKey.length - 30)}`);

    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } catch (e: any) {
      console.error('Firebase Admin SDK initialization error:', e.message);
      if (e instanceof SyntaxError) {
        console.error('This often means the FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not a valid JSON string. Ensure it starts with { and ends with }, and is not wrapped in extra quotes or newlines.');
      }
      if (e.message && typeof e.message === 'string' && e.message.includes('ENOENT')) {
        console.error('This often means the Admin SDK is trying to treat the JSON string content as a file path. Ensure the FIREBASE_SERVICE_ACCOUNT_JSON environment variable contains the raw JSON, not a path, and is not doubly quoted or improperly escaped.');
      }
    }
  }
}

const getAdminAuth = () => {
    if (admin.apps.length > 0 && admin.apps[0] && admin.apps[0].options.credential) {
        return admin.auth();
    }
    console.warn("Firebase Admin SDK is not properly initialized or has no credential. Auth operations will fail.");
    return null;
};

const getAdminDb = () => {
    if (admin.apps.length > 0 && admin.apps[0] && admin.apps[0].options.credential) {
        return admin.firestore();
    }
    console.warn("Firebase Admin SDK is not properly initialized or has no credential. Firestore operations will fail.");
    return null;
};


export { admin, getAdminAuth, getAdminDb };
