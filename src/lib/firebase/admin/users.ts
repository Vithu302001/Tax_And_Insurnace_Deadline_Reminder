
'use server';
import { getAdminAuth, getAdminDb } from './config';
import type { UserProfile, UserNotificationDetails } from '@/lib/types';

const userNotificationDetailsCollectionName = "userNotificationDetails";

export async function getAdminUserProfileById(userId: string): Promise<UserProfile | null> {
  const auth = getAdminAuth();
  const adminDb = getAdminDb();

  if (!auth) {
    console.error('Firebase Admin Auth is not available. Cannot fetch user profile core details for cron.');
    return null;
  }

  try {
    const userRecord = await auth.getUser(userId);
    let phoneNumberFromFirestore: string | null = null;

    if (adminDb) {
      try {
        const userNotificationDetailsRef = adminDb.collection(userNotificationDetailsCollectionName).doc(userId);
        const docSnap = await userNotificationDetailsRef.get();
        if (docSnap.exists) {
          const details = docSnap.data() as UserNotificationDetails;
          phoneNumberFromFirestore = details.phoneNumber || null;
          console.log(`Fetched phone number ${phoneNumberFromFirestore ? phoneNumberFromFirestore.substring(0,5) + '...' : 'N/A'} from Firestore for user ${userId}`);
        } else {
          console.log(`No userNotificationDetails document found in Firestore for user ${userId}.`);
        }
      } catch (firestoreError: any) {
        console.error(`Error fetching user notification details for ${userId} from Firestore:`, firestoreError);
        // Continue without phone number from Firestore if this specific fetch fails
      }
    } else {
        console.warn(`Admin DB not available, cannot fetch phone number from Firestore for user ${userId} for cron job.`);
    }

    return {
      uid: userRecord.uid,
      email: userRecord.email || null,
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
      phoneNumber: phoneNumberFromFirestore, // Use phone number from Firestore
    };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.warn(`User with ID ${userId} not found via Admin SDK.`);
      return null;
    }
    console.error(`Error fetching user profile core data for ${userId} via Admin SDK (Auth part):`, error);
    return null;
  }
}
