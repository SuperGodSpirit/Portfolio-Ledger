import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const requiredEnv = (key: keyof ImportMetaEnv) => {
  const value = import.meta.env[key];

  if (!value) {
    throw new Error(`Missing Firebase environment variable: ${key}`);
  }

  return value;
};

const firebaseConfig = {
  apiKey: requiredEnv("VITE_FIREBASE_API_KEY"),
  authDomain: requiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: requiredEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: requiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requiredEnv("VITE_FIREBASE_APP_ID"),
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
