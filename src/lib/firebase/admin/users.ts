
'use server';
import { getAdminAuth } from './config';

export async function getAdminUserProfileById(userId: string): Promise<UserProfile | null> {
  const auth = getAdminAuth();
  if (!auth) {
    console.error('Firebase Admin Auth is not available. Cannot fetch user profile.');
    return null;
  }

  try {
    const userRecord = await auth.getUser(userId);
    return {
      uid: userRecord.uid,
      email: userRecord.email || null,
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
      phoneNumber: userRecord.phoneNumber || null, // Fetch phone number
    };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.warn(`User with ID ${userId} not found via Admin SDK.`);
      return null;
    }
    console.error(`Error fetching user profile for ${userId} via Admin SDK:`, error);
    return null;
  }
}
