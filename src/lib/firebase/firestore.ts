import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  orderBy,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "./config";
import type { Reminder, ReminderFormData } from "@/lib/types";

const remindersCollection = "reminders"; // Top-level collection for simplicity, can be user-nested

// Helper to convert Firestore Timestamps to JS Dates and vice-versa for a Reminder object
const toAppReminder = (docData: any, id: string): Reminder => {
  return {
    ...docData,
    id,
    expiryDate: docData.expiryDate instanceof Timestamp ? docData.expiryDate.toDate() : new Date(docData.expiryDate),
    createdAt: docData.createdAt instanceof Timestamp ? docData.createdAt.toDate() : undefined,
    updatedAt: docData.updatedAt instanceof Timestamp ? docData.updatedAt.toDate() : undefined,
  } as Reminder;
};

const toFirestoreReminder = (reminderData: Partial<ReminderFormData & { userId: string }>) => {
  const data: any = { ...reminderData };
  if (reminderData.expiryDate) {
    data.expiryDate = Timestamp.fromDate(new Date(reminderData.expiryDate));
  }
  return data;
};

export const addReminder = async (userId: string, reminderData: ReminderFormData): Promise<string> => {
  const docRef = await addDoc(collection(db, remindersCollection), {
    ...toFirestoreReminder(reminderData),
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getUserReminders = async (userId: string): Promise<Reminder[]> => {
  const q = query(
    collection(db, remindersCollection),
    where("userId", "==", userId),
    orderBy("expiryDate", "asc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => toAppReminder(doc.data(), doc.id));
};

export const getReminderById = async (reminderId: string, userId: string): Promise<Reminder | null> => {
  const docRef = doc(db, remindersCollection, reminderId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const reminder = toAppReminder(docSnap.data(), docSnap.id);
    // Ensure the reminder belongs to the current user
    if (reminder.userId === userId) {
      return reminder;
    }
  }
  return null;
};

export const updateReminder = async (reminderId: string, userId: string, reminderData: Partial<ReminderFormData>): Promise<void> => {
  // First, verify the reminder belongs to the user
  const existingReminder = await getReminderById(reminderId, userId);
  if (!existingReminder) {
    throw new Error("Reminder not found or access denied.");
  }

  const docRef = doc(db, remindersCollection, reminderId);
  await updateDoc(docRef, {
    ...toFirestoreReminder(reminderData),
    updatedAt: serverTimestamp(),
  });
};

export const deleteReminder = async (reminderId: string, userId: string): Promise<void> => {
   // First, verify the reminder belongs to the user
  const existingReminder = await getReminderById(reminderId, userId);
  if (!existingReminder) {
    throw new Error("Reminder not found or access denied.");
  }
  const docRef = doc(db, remindersCollection, reminderId);
  await deleteDoc(docRef);
};
