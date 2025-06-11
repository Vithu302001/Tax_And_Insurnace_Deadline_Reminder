
'use server';
import type { Firestore } from 'firebase-admin/firestore';
import { admin } from './config'; // Imports the initialized admin app
import { toAppVehicle } from '../firestore'; // Re-use the converter
import type { Vehicle } from '@/lib/types';

const vehiclesCollectionName = "vehicles";

/**
 * Fetches all vehicles using the Firebase Admin SDK.
 * @param adminDbInstance - The Firestore instance from Firebase Admin SDK.
 * @returns A promise that resolves to an array of Vehicle objects.
 */
export async function adminGetAllVehicles(adminDbInstance: Firestore): Promise<Vehicle[]> {
  console.log('adminGetAllVehicles: Entered. Attempting to fetch from collection:', vehiclesCollectionName);
  if (!adminDbInstance) {
    const errorMessage = 'adminGetAllVehicles: adminDbInstance is null or undefined! Cannot perform Firestore operations.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  try {
    const snapshot = await adminDbInstance.collection(vehiclesCollectionName).get();
    console.log(`adminGetAllVehicles: Fetched ${snapshot.docs.length} documents.`);
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => toAppVehicle(doc.data(), doc.id));
  } catch (error: any) {
    console.error("Error fetching all vehicles with Admin SDK:", error.message, error.code ? `(Code: ${error.code})` : '');
    throw error; // Re-throw to be handled by the caller
  }
}

/**
 * Updates the notification timestamp for a vehicle using the Firebase Admin SDK.
 * @param adminDbInstance - The Firestore instance from Firebase Admin SDK.
 * @param vehicleId - The ID of the vehicle to update.
 * @param notificationType - The type of notification ('tax' or 'insurance').
 * @param notificationTimestamp - The admin.firestore.Timestamp for when the notification was sent.
 * @param serverTimestampFn - The admin.firestore.FieldValue.serverTimestamp() function.
 */
export async function adminUpdateVehicleNotificationTimestamp(
  adminDbInstance: Firestore,
  vehicleId: string,
  notificationType: 'tax' | 'insurance',
  notificationTimestamp: admin.firestore.Timestamp,
  serverTimestampFn: () => admin.firestore.FieldValue
): Promise<void> {
  console.log(`adminUpdateVehicleNotificationTimestamp: Updating ${notificationType} for vehicle ${vehicleId}.`);
   if (!adminDbInstance) {
    const errorMessage = `adminUpdateVehicleNotificationTimestamp: adminDbInstance is null or undefined! Cannot update vehicle ${vehicleId}.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  try {
    const docRef = adminDbInstance.collection(vehiclesCollectionName).doc(vehicleId);
    const updateData: { [key: string]: any } = { updatedAt: serverTimestampFn() };

    if (notificationType === 'tax') {
      updateData.lastTaxNotificationSent = notificationTimestamp;
    } else if (notificationType === 'insurance') {
      updateData.lastInsuranceNotificationSent = notificationTimestamp;
    } else {
      console.warn(`Invalid notification type: ${notificationType} for vehicle ${vehicleId}`);
      return;
    }
    await docRef.update(updateData);
    console.log(`adminUpdateVehicleNotificationTimestamp: Successfully updated ${notificationType} for vehicle ${vehicleId}.`);
  } catch (error: any) {
    console.error(`Error updating ${notificationType} notification timestamp for vehicle ${vehicleId} with Admin SDK:`, error.message, error.code ? `(Code: ${error.code})` : '');
    throw error;
  }
}
