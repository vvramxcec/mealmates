import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAoQPuufHHAtjSRiTicW1DTd1UE67WrAd8",
  authDomain: "mealmates-c6507.firebaseapp.com",
  projectId: "mealmates-c6507",
  storageBucket: "mealmates-c6507.firebasestorage.app",
  messagingSenderId: "468571562977",
  appId: "1:468571562977:web:aff54488c9ae30ac8668a0",
  measurementId: "G-0Q0DNL49GZ"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Analytics conditionally (Client-side only)
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) getAnalytics(app);
  });
}

export { app, auth, db };
