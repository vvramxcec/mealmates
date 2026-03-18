import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Constants from 'expo-constants';

// Replace placeholders with actual Firebase config or use Expo extra from app.json
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || 'YOUR_API_KEY',
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || 'YOUR_AUTH_DOMAIN',
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || 'YOUR_PROJECT_ID',
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || 'YOUR_STORAGE_BUCKET',
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || 'YOUR_MESSAGING_SENDER_ID',
  appId: Constants.expoConfig?.extra?.firebaseAppId || 'YOUR_APP_ID',
};

export const isFirebaseConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';

if (!isFirebaseConfigured) {
  console.warn("Firebase is NOT configured! Using placeholder keys. Firestore operations WILL hang.");
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
