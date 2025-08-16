import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type MetaState = {
  cfAdvances?: Record<string, number>;
  cfPayables?: Record<string, number>;
  settledWeeks?: Record<string, boolean>;
  cfAdvByWeek?: Record<string, number>;
  updatedAt?: any;
};

const STATE_DOC = (uid: string) => doc(db, `users/${uid}/meta/state`);

export const MetaRepo = {
  async getState(uid: string): Promise<MetaState | null> {
    const ref = STATE_DOC(uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as MetaState;
    return data || null;
  },

  async setState(uid: string, state: Partial<MetaState>): Promise<void> {
    const ref = STATE_DOC(uid);
    await setDoc(ref, { ...state, updatedAt: serverTimestamp() }, { merge: true });
  },
};
