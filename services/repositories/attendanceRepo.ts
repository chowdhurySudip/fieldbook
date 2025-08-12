import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { AttendanceRecord } from '../../types';
import { db } from '../firebase';
import { fromFirestore, WithId } from './firestoreUtils';

const COLLECTION = (uid: string) => collection(db, `users/${uid}/attendance`);

export const AttendanceRepo = {
  async list(uid: string): Promise<WithId<AttendanceRecord>[]> {
    const q = query(COLLECTION(uid), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => fromFirestore<AttendanceRecord>(d));
  },

  async listSince(uid: string, since: Date): Promise<WithId<AttendanceRecord>[]> {
    const q = query(COLLECTION(uid), where('updatedAt', '>', Timestamp.fromDate(since)), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => fromFirestore<AttendanceRecord>(d));
  },

  async get(uid: string, id: string): Promise<WithId<AttendanceRecord> | null> {
    const ref = doc(db, `users/${uid}/attendance/${id}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return fromFirestore<AttendanceRecord>(snap as any);
  },

  async add(uid: string, record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = await addDoc(COLLECTION(uid), {
      ...record,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async update(uid: string, id: string, updates: Partial<AttendanceRecord>): Promise<void> {
    const ref = doc(db, `users/${uid}/attendance/${id}`);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  async set(uid: string, id: string, record: Partial<AttendanceRecord>): Promise<void> {
    const ref = doc(db, `users/${uid}/attendance/${id}`);
    await setDoc(ref, {
      ...record,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },

  async remove(uid: string, id: string): Promise<void> {
    const ref = doc(db, `users/${uid}/attendance/${id}`);
    await deleteDoc(ref);
  },
};
