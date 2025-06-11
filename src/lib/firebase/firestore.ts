
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
import type {
  Vehicle,
  VehicleFormData,
  VehicleFirestoreData,
  Member,
  MemberFormData,
  MemberFirestoreData
} from "@/lib/types";

const vehiclesCollectionName = "vehicles";
const membersCollectionName = "members";

const INDEX_URL_MARKER_START = "MISSING_INDEX_URL_START";
const INDEX_URL_MARKER_END = "MISSING_INDEX_URL_END";

const extractIndexUrl = (errorMessage: string): string | null => {
  const match = errorMessage.match(/https:\/\/console\.firebase\.google\.com\/project\/[^/]+\/firestore\/indexes\/composite-create\?create_composite=[^\s)]+/);
  return match ? match[0] : null;
};


// --- Vehicle Functions ---

const toAppVehicle = (docData: any, id: string): Vehicle => {
  const data = docData as VehicleFirestoreData;
  return {
    id,
    userId: data.userId,
    model: data.model,
    registrationNumber: data.registrationNumber,
    taxExpiryDate: data.taxExpiryDate.toDate(),
    insuranceExpiryDate: data.insuranceExpiryDate.toDate(),
    insuranceCompany: data.insuranceCompany,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
    lastTaxNotificationSent: data.lastTaxNotificationSent?.toDate(),
    lastInsuranceNotificationSent: data.lastInsuranceNotificationSent?.toDate(),
  };
};

const toFirestoreVehicle = (vehicleData: Partial<VehicleFormData & { userId: string; lastTaxNotificationSent?: Date; lastInsuranceNotificationSent?: Date }>) => {
  const data: any = { ...vehicleData };
  if (vehicleData.taxExpiryDate) {
    data.taxExpiryDate = Timestamp.fromDate(new Date(vehicleData.taxExpiryDate));
  }
  if (vehicleData.insuranceExpiryDate) {
    data.insuranceExpiryDate = Timestamp.fromDate(new Date(vehicleData.insuranceExpiryDate));
  }
  if (vehicleData.lastTaxNotificationSent) {
    data.lastTaxNotificationSent = Timestamp.fromDate(new Date(vehicleData.lastTaxNotificationSent));
  }
  if (vehicleData.lastInsuranceNotificationSent) {
    data.lastInsuranceNotificationSent = Timestamp.fromDate(new Date(vehicleData.lastInsuranceNotificationSent));
  }
  // Remove undefined fields to avoid issues with Firestore
  Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
  return data;
};

export const addVehicle = async (userId: string, vehicleData: VehicleFormData): Promise<string> => {
  const docRef = await addDoc(collection(db, vehiclesCollectionName), {
    ...toFirestoreVehicle(vehicleData),
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastTaxNotificationSent: null, // Initialize notification timestamps
    lastInsuranceNotificationSent: null,
  });
  return docRef.id;
};

export const getUserVehicles = async (userId: string): Promise<Vehicle[]> => {
  try {
    const q = query(
      collection(db, vehiclesCollectionName),
      where("userId", "==", userId),
      orderBy("taxExpiryDate", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => toAppVehicle(doc.data(), doc.id));
  } catch (error: any) {
    const indexUrl = extractIndexUrl(error.message);
    if (indexUrl) {
      console.error("Firestore Missing Index Error (Vehicles):", error.message);
      console.error("Create Index URL:", indexUrl);
      throw new Error(`${error.message} ${INDEX_URL_MARKER_START}${indexUrl}${INDEX_URL_MARKER_END}`);
    }
    console.error("Error fetching user vehicles:", error);
    throw error;
  }
};

export const getAllVehicles = async (): Promise<Vehicle[]> => {
  try {
    // Note: Querying all documents in a collection can be inefficient for large datasets.
    // Consider adding filters or pagination if performance becomes an issue.
    // This basic query might require an index on 'taxExpiryDate' if you intend to sort.
    // For now, we fetch without specific ordering for the cron job.
    const q = query(collection(db, vehiclesCollectionName));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => toAppVehicle(doc.data(), doc.id));
  } catch (error: any) {
    // A global query like this is less likely to hit the specific 'create index' link issue
    // unless it includes orderBy clauses that require a composite index.
    console.error("Error fetching all vehicles:", error);
    throw error;
  }
};


export const getVehicleById = async (vehicleId: string, userId?: string): Promise<Vehicle | null> => {
  const docRef = doc(db, vehiclesCollectionName, vehicleId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const vehicle = toAppVehicle(docSnap.data(), docSnap.id);
    // If userId is provided, ensure the vehicle belongs to that user.
    // If userId is not provided (e.g., for an admin or system process), return the vehicle.
    if (userId && vehicle.userId !== userId) {
      return null; // Access denied or vehicle not found for this user
    }
    return vehicle;
  }
  return null;
};

export const updateVehicle = async (vehicleId: string, userId: string, vehicleData: Partial<VehicleFormData>): Promise<void> => {
  const existingVehicle = await getVehicleById(vehicleId, userId);
  if (!existingVehicle) {
    throw new Error("Vehicle not found or access denied.");
  }

  const docRef = doc(db, vehiclesCollectionName, vehicleId);
  await updateDoc(docRef, {
    ...toFirestoreVehicle(vehicleData),
    updatedAt: serverTimestamp(),
  });
};

// Specific update for notification timestamps by a system process
export const updateVehicleNotificationTimestamp = async (
  vehicleId: string,
  notificationType: 'tax' | 'insurance',
  timestamp: Timestamp
): Promise<void> => {
  const docRef = doc(db, vehiclesCollectionName, vehicleId);
  const updateData: any = { updatedAt: serverTimestamp() };
  if (notificationType === 'tax') {
    updateData.lastTaxNotificationSent = timestamp;
  } else {
    updateData.lastInsuranceNotificationSent = timestamp;
  }
  await updateDoc(docRef, updateData);
};


export const deleteVehicle = async (vehicleId: string, userId: string): Promise<void> => {
  const existingVehicle = await getVehicleById(vehicleId, userId);
  if (!existingVehicle) {
    throw new Error("Vehicle not found or access denied.");
  }
  const docRef = doc(db, vehiclesCollectionName, vehicleId);
  await deleteDoc(docRef);
};


// --- Member Functions ---

const toAppMember = (docData: any, id: string): Member => {
  const data = docData as MemberFirestoreData;
  return {
    id,
    userId: data.userId,
    name: data.name,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  };
};

const toFirestoreMember = (memberData: Partial<MemberFormData & { userId: string }>) => {
  const data: any = { ...memberData };
  return data;
};

export const addMember = async (userId: string, memberData: MemberFormData): Promise<string> => {
  const docRef = await addDoc(collection(db, membersCollectionName), {
    ...toFirestoreMember(memberData),
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getUserMembers = async (userId: string): Promise<Member[]> => {
  try {
    const q = query(
      collection(db, membersCollectionName),
      where("userId", "==", userId),
      orderBy("name", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => toAppMember(doc.data(), doc.id));
  } catch (error: any) {
    const indexUrl = extractIndexUrl(error.message);
    if (indexUrl) {
      console.error("Firestore Missing Index Error (Members):", error.message);
      console.error("Create Index URL:", indexUrl);
      throw new Error(`${error.message} ${INDEX_URL_MARKER_START}${indexUrl}${INDEX_URL_MARKER_END}`);
    }
    console.error("Error fetching user members:", error);
    throw error;
  }
};

export const getMemberById = async (memberId: string, userId: string): Promise<Member | null> => {
  const docRef = doc(db, membersCollectionName, memberId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const member = toAppMember(docSnap.data(), docSnap.id);
    if (member.userId === userId) {
      return member;
    }
  }
  return null;
};

export const updateMember = async (memberId: string, userId: string, memberData: Partial<MemberFormData>): Promise<void> => {
  const existingMember = await getMemberById(memberId, userId);
  if (!existingMember) {
    throw new Error("Member not found or access denied.");
  }

  const docRef = doc(db, membersCollectionName, memberId);
  await updateDoc(docRef, {
    ...toFirestoreMember(memberData),
    updatedAt: serverTimestamp(),
  });
};

export const deleteMember = async (memberId: string, userId: string): Promise<void> => {
  const existingMember = await getMemberById(memberId, userId);
  if (!existingMember) {
    throw new Error("Member not found or access denied.");
  }
  const docRef = doc(db, membersCollectionName, memberId);
  await deleteDoc(docRef);
};

// --- User Data Functions (Stub) ---
export async function getUserProfileById(userId: string): Promise<{email: string | null; displayName: string | null} | null> {
  // TODO: Implement this function securely, likely using Firebase Admin SDK in a backend environment (e.g., Cloud Function).
  // This client-side SDK cannot directly fetch arbitrary user profiles by UID for security reasons.
  // For now, this function will simulate a lookup or return null.
  console.warn(`getUserProfileById STUB: Attempting to get profile for ${userId}. This needs a backend implementation.`);
  // Example: if (userId === "known-test-user-id") return { email: "test@example.com", displayName: "Test User" };
  return null;
}

