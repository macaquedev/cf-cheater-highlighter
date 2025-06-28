// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Firebase configuration using environment variables with fallbacks
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:123456789:web:demo",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-DEMO"
};

// Check if we're using demo credentials
const isDemoMode = firebaseConfig.apiKey === "demo-key" || 
                   firebaseConfig.apiKey?.includes("Demo-Replace");

if (isDemoMode) {
  console.warn("🚨 Firebase is running in DEMO mode! Please add your real Firebase credentials to .env file");
  console.warn("📖 Instructions: https://console.firebase.google.com/ -> Project Settings -> Your Apps");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const isDemo = isDemoMode;