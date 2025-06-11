
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null; // Added for WhatsApp
}

export interface Vehicle {
  id: string;
  userId: string;
  model: string;
  registrationNumber: string;
  taxExpiryDate: Date;
  insuranceExpiryDate: Date;
  insuranceCompany?: string;
  memberId?: string;
  memberName?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastTaxNotificationSent?: Date;
  lastInsuranceNotificationSent?: Date;
}

export interface VehicleFirestoreData extends Omit<Vehicle, 'id' | 'taxExpiryDate' | 'insuranceExpiryDate' | 'createdAt' | 'updatedAt' | 'lastTaxNotificationSent' | 'lastInsuranceNotificationSent'> {
  taxExpiryDate: Timestamp;
  insuranceExpiryDate: Timestamp;
  memberId?: string;
  memberName?: string;
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
  memberId?: string;
};

export interface Member {
  id: string;
  userId: string;
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

export interface SimplifiedVehicleForReport {
  model: string;
  registrationNumber: string;
  taxExpiryDate: string;
  insuranceExpiryDate: string;
  overallStatus: string;
}
