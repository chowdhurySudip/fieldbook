import { createUserWithEmailAndPassword, User as FirebaseUser, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export const AuthService = {
  onAuthStateChanged(callback: (user: SessionUser | null) => void) {
    return onAuthStateChanged(auth, (user) => {
      if (!user) return callback(null);
      callback(mapFirebaseUser(user));
    });
  },

  async register(email: string, password: string, name?: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
    // Create user profile doc at users/{uid}/meta/profile
    const metaCollection = collection(db, `users/${cred.user.uid}/meta`);
    const profileRef = doc(metaCollection, 'profile');
    await setDoc(profileRef, {
      email,
      displayName: name || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return mapFirebaseUser(cred.user);
  },

  async login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return mapFirebaseUser(cred.user);
  },

  async logout() {
    await signOut(auth);
  },

  async sendPasswordReset(email: string) {
    await sendPasswordResetEmail(auth, email);
  },
};

function mapFirebaseUser(user: FirebaseUser): SessionUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName ?? null,
  };
}
