
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
import type { Vehicle, VehicleFormData, VehicleFirestoreData } from "@/lib/types";

const vehiclesCollection = "vehicles";

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
  };
};

const toFirestoreVehicle = (vehicleData: Partial<VehicleFormData & { userId: string }>) => {
  const data: any = { ...vehicleData };
  if (vehicleData.taxExpiryDate) {
    data.taxExpiryDate = Timestamp.fromDate(new Date(vehicleData.taxExpiryDate));
  }
  if (vehicleData.insuranceExpiryDate) {
    data.insuranceExpiryDate = Timestamp.fromDate(new Date(vehicleData.insuranceExpiryDate));
  }
  return data;
};

export const addVehicle = async (userId: string, vehicleData: VehicleFormData): Promise<string> => {
  const docRef = await addDoc(collection(db, vehiclesCollection), {
    ...toFirestoreVehicle(vehicleData),
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getUserVehicles = async (userId: string): Promise<Vehicle[]> => {
  const q = query(
    collection(db, vehiclesCollection),
    where("userId", "==", userId),
    orderBy("taxExpiryDate", "asc") // Or combine with insuranceExpiryDate for a more complex sort
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => toAppVehicle(doc.data(), doc.id));
};

export const getVehicleById = async (vehicleId: string, userId: string): Promise<Vehicle | null> => {
  const docRef = doc(db, vehiclesCollection, vehicleId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const vehicle = toAppVehicle(docSnap.data(), docSnap.id);
    if (vehicle.userId === userId) {
      return vehicle;
    }
  }
  return null;
};

export const updateVehicle = async (vehicleId: string, userId: string, vehicleData: Partial<VehicleFormData>): Promise<void> => {
  const existingVehicle = await getVehicleById(vehicleId, userId);
  if (!existingVehicle) {
    throw new Error("Vehicle not found or access denied.");
  }

  const docRef = doc(db, vehiclesCollection, vehicleId);
  await updateDoc(docRef, {
    ...toFirestoreVehicle(vehicleData),
    updatedAt: serverTimestamp(),
  });
};

export const deleteVehicle = async (vehicleId: string, userId: string): Promise<void> => {
  const existingVehicle = await getVehicleById(vehicleId, userId);
  if (!existingVehicle) {
    throw new Error("Vehicle not found or access denied.");
  }
  const docRef = doc(db, vehiclesCollection, vehicleId);
  await deleteDoc(docRef);
};
