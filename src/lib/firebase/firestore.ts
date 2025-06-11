
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
  writeBatch,
  setDoc, // Added for setDoc
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
const userNotificationDetailsCollectionName = "userNotificationDetails";


const INDEX_URL_MARKER_START = "MISSING_INDEX_URL_START";
const INDEX_URL_MARKER_END = "MISSING_INDEX_URL_END";

const extractIndexUrl = (errorMessage: string): string | null => {
  const match = errorMessage.match(/https:\/\/console\.firebase\.google\.com\/project\/[^/]+\/firestore\/indexes\/composite-create\?create_composite=[^\s)]+/);
  return match ? match[0] : null;
};

// Helper to convert Firestore Timestamps (client or admin) or date strings/numbers to Date objects
export const convertToDate = (field: any): Date | undefined => {
  if (!field) return undefined;
  if (field instanceof Timestamp) { // Handle client-side Timestamp
    return field.toDate();
  }
  if (typeof field.toDate === 'function') { // Works for Admin Timestamps (and client-side just in case)
    return field.toDate();
  }
  if (typeof field === 'string' || typeof field === 'number') {
    try {
      const date = new Date(field);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      // Ignore invalid date strings/numbers
    }
  }
  // If it's already a Date object (e.g. from form data before conversion)
  if (field instanceof Date) {
      return field;
  }
  console.warn("Unsupported date/timestamp type in convertToDate:", field, typeof field);
  return undefined;
};


// --- Vehicle Functions ---

export const toAppVehicle = (docData: any, id: string): Vehicle => {
  const data = docData as VehicleFirestoreData; 
  return {
    id,
    userId: data.userId,
    model: data.model,
    registrationNumber: data.registrationNumber,
    taxExpiryDate: convertToDate(data.taxExpiryDate)!, 
    insuranceExpiryDate: convertToDate(data.insuranceExpiryDate)!, 
    insuranceCompany: data.insuranceCompany || undefined,
    memberId: data.memberId || undefined,
    memberName: data.memberName || undefined,
    createdAt: convertToDate(data.createdAt),
    updatedAt: convertToDate(data.updatedAt),
    lastTaxNotificationSent: convertToDate(data.lastTaxNotificationSent),
    lastInsuranceNotificationSent: convertToDate(data.lastInsuranceNotificationSent),
  };
};

// This function is for client-side operations
const toFirestoreVehicle = (vehicleData: Partial<VehicleFormData & { userId?: string; memberName?: string | null; lastTaxNotificationSent?: Date | null; lastInsuranceNotificationSent?: Date | null }>) => {
  const data: any = { ...vehicleData };
  if (vehicleData.taxExpiryDate instanceof Date) {
    data.taxExpiryDate = Timestamp.fromDate(vehicleData.taxExpiryDate);
  }
  if (vehicleData.insuranceExpiryDate instanceof Date) {
    data.insuranceExpiryDate = Timestamp.fromDate(vehicleData.insuranceExpiryDate);
  }
  
  if (vehicleData.lastTaxNotificationSent instanceof Date) {
    data.lastTaxNotificationSent = Timestamp.fromDate(vehicleData.lastTaxNotificationSent);
  } else if (vehicleData.lastTaxNotificationSent === null) {
    data.lastTaxNotificationSent = null;
  }

  if (vehicleData.lastInsuranceNotificationSent instanceof Date) {
    data.lastInsuranceNotificationSent = Timestamp.fromDate(vehicleData.lastInsuranceNotificationSent);
  } else if (vehicleData.lastInsuranceNotificationSent === null) {
     data.lastInsuranceNotificationSent = null;
  }
  
  if (vehicleData.hasOwnProperty('memberId')) {
    data.memberId = vehicleData.memberId === "none" || !vehicleData.memberId ? null : vehicleData.memberId;
  }
  if (vehicleData.hasOwnProperty('memberName')) {
    data.memberName = !vehicleData.memberName ? null : vehicleData.memberName;
  }
  if (data.memberId === null) { 
    data.memberName = null;
  }

  if (vehicleData.hasOwnProperty('insuranceCompany')) {
    data.insuranceCompany = vehicleData.insuranceCompany || null;
  }

  Object.keys(data).forEach(key => {
    // Allow null for fields that can be explicitly set to null
    if (data[key] === undefined && !['memberId', 'memberName', 'insuranceCompany', 'lastTaxNotificationSent', 'lastInsuranceNotificationSent'].includes(key)) {
        delete data[key];
    }
  });
  return data;
};

export const addVehicle = async (userId: string, vehicleData: VehicleFormData): Promise<string> => {
  let memberName: string | null = null;
  let memberIdToStore: string | null = null;

  if (vehicleData.memberId && vehicleData.memberId !== "none") {
    const member = await getMemberById(vehicleData.memberId, userId);
    if (member) {
      memberName = member.name;
      memberIdToStore = vehicleData.memberId;
    }
  }

  const firestorePayload = toFirestoreVehicle({
    userId, // Not part of toFirestoreVehicle schema but needed at root
    model: vehicleData.model,
    registrationNumber: vehicleData.registrationNumber,
    taxExpiryDate: vehicleData.taxExpiryDate,
    insuranceExpiryDate: vehicleData.insuranceExpiryDate,
    insuranceCompany: vehicleData.insuranceCompany || undefined, // Use undefined if empty for toFirestoreVehicle logic
    memberId: memberIdToStore || undefined,
    memberName: memberName || undefined,
    lastTaxNotificationSent: null,
    lastInsuranceNotificationSent: null,
  });

  const docRef = await addDoc(collection(db, vehiclesCollectionName), {
    ...firestorePayload,
    userId, // Ensure userId is at the root
    createdAt: serverTimestamp() as Timestamp, // Cast for client SDK
    updatedAt: serverTimestamp() as Timestamp, // Cast for client SDK
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

export const getVehicleById = async (vehicleId: string, userId?: string): Promise<Vehicle | null> => {
  const docRef = doc(db, vehiclesCollectionName, vehicleId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const vehicle = toAppVehicle(docSnap.data(), docSnap.id);
    if (userId && vehicle.userId !== userId) {
      return null;
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

  let memberNameUpdate: string | null = existingVehicle.memberName || null;
  let memberIdUpdate: string | null = existingVehicle.memberId || null;

  if (vehicleData.hasOwnProperty('memberId')) {
    if (vehicleData.memberId && vehicleData.memberId !== "none") {
      const member = await getMemberById(vehicleData.memberId, userId);
      memberNameUpdate = member ? member.name : null;
      memberIdUpdate = member ? vehicleData.memberId : null;
    } else { 
      memberNameUpdate = null;
      memberIdUpdate = null;
    }
  }
  
  const dataToUpdate = toFirestoreVehicle({
     ...vehicleData, 
     memberName: memberNameUpdate,
     memberId: memberIdUpdate,
  });

  const docRef = doc(db, vehiclesCollectionName, vehicleId);
  await updateDoc(docRef, {
    ...dataToUpdate,
    updatedAt: serverTimestamp(),
  });
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
    createdAt: convertToDate(data.createdAt),
    updatedAt: convertToDate(data.updatedAt),
  };
};

const toFirestoreMember = (memberData: Partial<MemberFormData & { userId?: string }>) => {
  const data: any = { ...memberData };
  // Ensure dates are not accidentally passed if schema changes
  delete data.createdAt;
  delete data.updatedAt;
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
    } else {
      console.warn(`Access denied: User ${userId} tried to fetch member ${memberId} owned by ${member.userId}`);
      return null;
    }
  }
  return null;
};

export const updateMember = async (memberId: string, userId: string, memberData: Partial<MemberFormData>): Promise<void> => {
  const existingMember = await getMemberById(memberId, userId);
  if (!existingMember) {
    throw new Error("Member not found or access denied.");
  }

  const memberDocRef = doc(db, membersCollectionName, memberId);
  const batch = writeBatch(db);

  batch.update(memberDocRef, {
    ...toFirestoreMember(memberData),
    updatedAt: serverTimestamp(),
  });

  if (memberData.name && memberData.name !== existingMember.name) {
    const vehiclesRef = collection(db, vehiclesCollectionName);
    const q = query(vehiclesRef, where("userId", "==", userId), where("memberId", "==", memberId));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach(vehicleDoc => {
      batch.update(vehicleDoc.ref, { memberName: memberData.name, updatedAt: serverTimestamp() });
    });
  }
  await batch.commit();
};

export const deleteMember = async (memberId: string, userId: string): Promise<void> => {
  const existingMember = await getMemberById(memberId, userId);
  if (!existingMember) {
    throw new Error("Member not found or access denied.");
  }

  const batch = writeBatch(db);
  
  const vehiclesRef = collection(db, vehiclesCollectionName);
  const q = query(vehiclesRef, where("userId", "==", userId), where("memberId", "==", memberId));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach(vehicleDoc => {
    batch.update(vehicleDoc.ref, { memberId: null, memberName: null, updatedAt: serverTimestamp() });
  });
  
  const memberDocRef = doc(db, membersCollectionName, memberId);
  batch.delete(memberDocRef);

  await batch.commit();
};

// --- User Notification Details Functions (Client-Side) ---
export const setUserPhoneNumberInFirestore = async (userId: string, phoneNumber: string): Promise<void> => {
  if (!userId || !phoneNumber) { // Basic check
    throw new Error("User ID and phone number are required.");
  }
  // Basic validation: ensure it looks somewhat like a phone number (e.g., starts with + and has digits)
  // More robust validation should be done if this is a critical feature.
  if (!/^\+?[1-9]\d{1,14}$/.test(phoneNumber.replace(/\s+/g, ''))) {
      // console.warn("Phone number may not be in a valid E.164 format:", phoneNumber);
      // Not throwing error, but logging. Twilio will ultimately validate.
  }

  const docRef = doc(db, userNotificationDetailsCollectionName, userId);
  try {
    // Using setDoc with merge: true to create or update the document,
    // and only modify the phoneNumber field if other fields exist.
    await setDoc(docRef, { phoneNumber: phoneNumber.replace(/\s+/g, '') }, { merge: true }); // Store without spaces
    console.log(`Phone number set/updated for user ${userId} in Firestore.`);
  } catch (error: any) {
    console.error(`Error setting phone number for user ${userId} in Firestore:`, error);
    throw new Error("Failed to save phone number.");
  }
};
