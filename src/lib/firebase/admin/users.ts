
'use server';
import { getAdminAuth } from './config'; // Initializes admin app and exports auth

export async function getAdminUserProfileById(userId: string): Promise<{ email: string | null; displayName: string | null } | null> {
  const auth = getAdminAuth();
  if (!auth) {
    console.error('Firebase Admin Auth is not available. Cannot fetch user profile.');
    return null;
  }

  try {
    const userRecord = await auth.getUser(userId);
    return {
      email: userRecord.email || null,
      displayName: userRecord.displayName || null,
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
