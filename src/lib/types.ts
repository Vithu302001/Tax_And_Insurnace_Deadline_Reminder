
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
  model: string;
  registrationNumber: string;
  taxExpiryDate: Date;
  insuranceExpiryDate: Date;
  insuranceCompany?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastTaxNotificationSent?: Date;
  lastInsuranceNotificationSent?: Date;
}

export interface VehicleFirestoreData extends Omit<Vehicle, 'id' | 'taxExpiryDate' | 'insuranceExpiryDate' | 'createdAt' | 'updatedAt' | 'lastTaxNotificationSent' | 'lastInsuranceNotificationSent'> {
  taxExpiryDate: Timestamp;
  insuranceExpiryDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastTaxNotificationSent?: Timestamp;
  lastInsuranceNotificationSent?: Timestamp;
}

export type VehicleFormData = {
  model: string;
  registrationNumber: string;
  taxExpiryDate: Date;
  insuranceExpiryDate: Date;
  insuranceCompany?: string;
};

// New Member types
export interface Member {
  id: string;
  userId: string; // The user who created this member
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MemberFirestoreData extends Omit<Member, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type MemberFormData = {
  name: string;
};

// For report generation
export interface SimplifiedVehicleForReport {
  model: string;
  registrationNumber: string;
  taxExpiryDate: string; // Formatted as 'MMM dd, yyyy'
  insuranceExpiryDate: string; // Formatted as 'MMM dd, yyyy'
  overallStatus: string; // e.g., Urgent, Upcoming, Expired, Safe
}
