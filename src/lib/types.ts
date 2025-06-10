import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface Reminder {
  id: string;
  userId: string;
  type: 'tax' | 'insurance';
  name: string;
  policyNumber?: string;
  insurer?: string;
  amount?: number;
  expiryDate: Date; // Store as JS Date in client, convert to/from Firestore Timestamp
  // Fields for Firestore, ensure they are Timestamps
  expiryDateFirestore?: Timestamp; 
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type ReminderFormData = Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'expiryDateFirestore'> & {
  expiryDate: Date;
};
