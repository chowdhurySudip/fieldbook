// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBKYriWhMha8YY0ucqnWAhiSL8EkpMvpwk",
  authDomain: "fieldbook-sudip.firebaseapp.com",
  projectId: "fieldbook-sudip",
  storageBucket: "fieldbook-sudip.firebasestorage.app",
  messagingSenderId: "500155606936",
  appId: "1:500155606936:web:1cc04454059b46faf7eded"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// For development - connect to emulators if in development mode
if (__DEV__) {
  // Uncomment these lines if you want to use Firebase emulators for development
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectAuthEmulator(auth, 'http://localhost:9099');
}

export default app;
