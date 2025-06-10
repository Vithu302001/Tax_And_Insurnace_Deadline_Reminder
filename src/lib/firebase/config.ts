// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// WARNING: Hardcoding credentials directly in the code is not recommended for production
// or shared environments. Please consider using environment variables (e.g., via a .env.local file)
// as was originally implemented in this file for better security.
const firebaseConfig = {
  apiKey: "AIzaSyBI8NkO__SEopxWDVNMBsFhx1hC06F0Wc8",
  authDomain: "familysa-aa71a.firebaseapp.com",
  projectId: "familysa-aa71a",
  storageBucket: "familysa-aa71a.firebasestorage.app", // Using the value you provided
  messagingSenderId: "721247796544",
  appId: "1:721247796544:web:9024bcfae7bd318fbfcea5"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
