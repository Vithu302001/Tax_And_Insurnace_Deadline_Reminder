
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface Vehicle {
  id: string;
  userId: string;
  model: string; // Formerly name, now represents vehicle model e.g., "Honda CB350"
  registrationNumber: string;
  taxExpiryDate: Date;
  insuranceExpiryDate: Date;
  insuranceCompany?: string;
  // Firestore specific timestamp fields
  createdAt?: Timestamp; // Should be Date on app type, Timestamp on Firestore
  updatedAt?: Timestamp; // Should be Date on app type, Timestamp on Firestore
}

// Helper for Firestore data conversion
export interface VehicleFirestoreData extends Omit<Vehicle, 'id' | 'taxExpiryDate' | 'insuranceExpiryDate' | 'createdAt' | 'updatedAt'> {
  taxExpiryDate: Timestamp;
  insuranceExpiryDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type VehicleFormData = {
  model: string;
  registrationNumber: string;
  taxExpiryDate: Date;
  insuranceExpiryDate: Date;
  insuranceCompany?: string;
};
