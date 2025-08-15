// Import the functions you need from the SDKs you need
// Removed RN persistence import to avoid bundling issues; can re-add when supported
import { initializeApp } from "firebase/app";
import type { Persistence } from 'firebase/auth';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { Platform } from 'react-native';
// Enable RN auth persistence via dynamic require to avoid bundling subpath issues
import AsyncStorage from '@react-native-async-storage/async-storage';

// Read config from Expo public env vars
const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
  // Fail fast with a clear message during development if any var is missing
  throw new Error(
    "Missing Firebase environment variables. Please set EXPO_PUBLIC_FIREBASE_* in your .env file."
  );
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);

// Configure Auth with proper persistence per platform
let authInstance: ReturnType<typeof getAuth>;
if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else {
  try {
    // Dynamically get getReactNativePersistence to avoid bundling issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getReactNativePersistence }: { getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence } = require('firebase/auth');
    if (typeof getReactNativePersistence === 'function') {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } else {
      // Fallback without persistence (should rarely happen on supported versions)
      authInstance = initializeAuth(app);
    }
  } catch (e) {
    // If auth was already initialized (e.g., Fast Refresh), or require failed, use existing instance
    try {
      authInstance = getAuth(app);
    } catch {
      authInstance = initializeAuth(app);
    }
  }
}
export const auth = authInstance;

// For development - connect to emulators if in development mode
if (__DEV__) {
  // Uncomment these lines if you want to use Firebase emulators for development
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectAuthEmulator(auth, 'http://localhost:9099');
}

export default app;
