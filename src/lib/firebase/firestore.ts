
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
    taxExpiryDate: data.taxExpiryDate instanceof Timestamp ? data.taxExpiryDate.toDate() : new Date(data.taxExpiryDate),
    insuranceExpiryDate: data.insuranceExpiryDate instanceof Timestamp ? data.insuranceExpiryDate.toDate() : new Date(data.insuranceExpiryDate),
    insuranceCompany: data.insuranceCompany,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt ? new Date(data.createdAt) : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : undefined,
    lastTaxNotificationSent: data.lastTaxNotificationSent instanceof Timestamp ? data.lastTaxNotificationSent.toDate() : data.lastTaxNotificationSent ? new Date(data.lastTaxNotificationSent) : undefined,
    lastInsuranceNotificationSent: data.lastInsuranceNotificationSent instanceof Timestamp ? data.lastInsuranceNotificationSent.toDate() : data.lastInsuranceNotificationSent ? new Date(data.lastInsuranceNotificationSent) : undefined,
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
    lastTaxNotificationSent: null, 
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
    const q = query(collection(db, vehiclesCollectionName));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => toAppVehicle(doc.data(), doc.id));
  } catch (error: any) {
    console.error("Error fetching all vehicles:", error);
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

  const docRef = doc(db, vehiclesCollectionName, vehicleId);
  await updateDoc(docRef, {
    ...toFirestoreVehicle(vehicleData),
    updatedAt: serverTimestamp(),
  });
};

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
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt ? new Date(data.createdAt) : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : undefined,
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
