// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyDBr7MY3hEeYUN-toK9cshDTtkJ50kLskc",
  authDomain: "donation-e9996.firebaseapp.com",
  projectId: "donation-e9996",
  storageBucket: "donation-e9996.firebasestorage.app",
  messagingSenderId: "771349037903",
  appId: "1:771349037903:web:2832a77dade70e860afb3a",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
