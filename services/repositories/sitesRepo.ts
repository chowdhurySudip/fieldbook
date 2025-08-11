import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { Site } from '../../types';
import { db } from '../firebase';
import { fromFirestore, WithId } from './firestoreUtils';

const COLLECTION = (uid: string) => collection(db, `users/${uid}/sites`);

export const SitesRepo = {
  async list(uid: string): Promise<WithId<Site>[]> {
    const q = query(COLLECTION(uid), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => fromFirestore<Site>(d));
  },

  async listSince(uid: string, since: Date): Promise<WithId<Site>[]> {
    const q = query(COLLECTION(uid), where('updatedAt', '>', Timestamp.fromDate(since)), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => fromFirestore<Site>(d));
  },

  async add(uid: string, site: Omit<Site, 'id' | 'createdAt' | 'updatedAt' | 'totalWithdrawn'>): Promise<string> {
    const ref = await addDoc(COLLECTION(uid), {
      ...site,
      totalWithdrawn: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async update(uid: string, id: string, updates: Partial<Site>): Promise<void> {
    const ref = doc(db, `users/${uid}/sites/${id}`);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  async set(uid: string, id: string, site: Partial<Site>): Promise<void> {
    const ref = doc(db, `users/${uid}/sites/${id}`);
    await setDoc(ref, {
      ...site,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },

  async remove(uid: string, id: string): Promise<void> {
    const ref = doc(db, `users/${uid}/sites/${id}`);
    await deleteDoc(ref);
  },
};
