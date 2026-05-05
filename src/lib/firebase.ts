import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC01wuLmp-XwlBkT2FNyTNmPZ2w_oqTeJw",
  authDomain: "resume-builder-f83be.firebaseapp.com",
  projectId: "resume-builder-f83be",
  storageBucket: "resume-builder-f83be.firebasestorage.app",
  messagingSenderId: "623741684438",
  appId: "1:623741684438:web:dbb96c1c6a75c5ddb45777",
  measurementId: "G-SWNXDBD972",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
