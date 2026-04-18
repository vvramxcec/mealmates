import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';

// Replace placeholders with actual Firebase config or use Expo extra from app.json
const firebaseConfig = {
  apiKey: "AIzaSyDtRP5q9ODujjcCeSGKAHwEDnLGLllaaG8",
  authDomain: "mealmates-a500a.firebaseapp.com",
  projectId: "mealmates-a500a",
  storageBucket: "mealmates-a500a.firebasestorage.app",
  messagingSenderId: "18234049409",
  appId: "1:18234049409:web:a11b0f432b011581cd5e80",
  measurementId: "G-JP2E36XNFF"
};

export const isFirebaseConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';

if (!isFirebaseConfigured) {
  console.warn("Firebase is NOT configured! Using placeholder keys. Firestore operations WILL hang.");
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
