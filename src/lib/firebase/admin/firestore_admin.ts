
'use server';
import type { Firestore } from 'firebase-admin/firestore';
import { admin } from './config'; // Imports the initialized admin app
import { toAppVehicle } from '../firestore'; // Re-use the converter
import type { Vehicle } from '@/lib/types';

const vehiclesCollectionName = "vehicles";

/**
 * Fetches all vehicles using the Firebase Admin SDK.
 * @param adminDb - The Firestore instance from Firebase Admin SDK.
 * @returns A promise that resolves to an array of Vehicle objects.
 */
export async function adminGetAllVehicles(adminDb: Firestore): Promise<Vehicle[]> {
  try {
    const snapshot = await adminDb.collection(vehiclesCollectionName).get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => toAppVehicle(doc.data(), doc.id));
  } catch (error: any) {
    console.error("Error fetching all vehicles with Admin SDK:", error);
    throw error; // Re-throw to be handled by the caller
  }
}

/**
 * Updates the notification timestamp for a vehicle using the Firebase Admin SDK.
 * @param adminDb - The Firestore instance from Firebase Admin SDK.
 * @param vehicleId - The ID of the vehicle to update.
 * @param notificationType - The type of notification ('tax' or 'insurance').
 * @param notificationTimestamp - The admin.firestore.Timestamp for when the notification was sent.
 * @param serverTimestampFn - The admin.firestore.FieldValue.serverTimestamp() function.
 */
export async function adminUpdateVehicleNotificationTimestamp(
  adminDb: Firestore,
  vehicleId: string,
  notificationType: 'tax' | 'insurance',
  notificationTimestamp: admin.firestore.Timestamp, // Expect admin.firestore.Timestamp
  serverTimestampFn: () => admin.firestore.FieldValue // Expect admin.firestore.FieldValue.serverTimestamp
): Promise<void> {
  try {
    const docRef = adminDb.collection(vehiclesCollectionName).doc(vehicleId);
    const updateData: { [key: string]: any } = { updatedAt: serverTimestampFn() };

    if (notificationType === 'tax') {
      updateData.lastTaxNotificationSent = notificationTimestamp;
    } else if (notificationType === 'insurance') {
      updateData.lastInsuranceNotificationSent = notificationTimestamp;
    } else {
      console.warn(`Invalid notification type: ${notificationType}`);
      return;
    }
    await docRef.update(updateData);
  } catch (error: any) {
    console.error(`Error updating ${notificationType} notification timestamp for vehicle ${vehicleId} with Admin SDK:`, error);
    throw error; // Re-throw to be handled by the caller
  }
}
