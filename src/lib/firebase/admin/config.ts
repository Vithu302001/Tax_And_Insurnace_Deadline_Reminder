
import admin from 'firebase-admin';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!admin.apps.length) {
  if (!serviceAccountKey) {
    // Log a warning instead of throwing, so the app can start, but admin features will be disabled.
    console.warn('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. Firebase Admin SDK features will be unavailable.');
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
      });
      console.log('Firebase Admin SDK initialized.');
    } catch (e: any) {
      console.error('Firebase Admin SDK initialization error:', e.message);
      // Operations using admin will check if it's properly initialized.
    }
  }
}

// Export admin modules or specific services.
// Check if apps array is populated before trying to access services.
const getAdminAuth = () => {
    if (admin.apps.length > 0 && admin.apps[0]) { // Ensure app is initialized
        return admin.auth();
    }
    console.warn("Firebase Admin SDK is not initialized. Auth operations will fail.");
    return null; // Return null or a mock/stub if preferred for failing gracefully
};

const getAdminDb = () => {
    if (admin.apps.length > 0 && admin.apps[0]) { // Ensure app is initialized
        return admin.firestore();
    }
    console.warn("Firebase Admin SDK is not initialized. Firestore operations will fail.");
    return null;
};


export { admin, getAdminAuth, getAdminDb };
