
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
  // memberId?: string; // We will add this later
  createdAt?: Date; 
  updatedAt?: Date; 
}

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
  // memberId?: string; // We will add this later
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
