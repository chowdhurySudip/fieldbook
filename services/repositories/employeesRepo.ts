import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { Employee } from '../../types';
import { db } from '../firebase';
import { fromFirestore, WithId } from './firestoreUtils';

const COLLECTION = (uid: string) => collection(db, `users/${uid}/employees`);
const QUERY_LIMIT = 100; // Limit queries to prevent large data transfers

export const EmployeesRepo = {
  async list(uid: string): Promise<WithId<Employee>[]> {
    const q = query(COLLECTION(uid), orderBy('updatedAt', 'desc'), limit(QUERY_LIMIT));
    const snap = await getDocs(q);
    return snap.docs.map(d => fromFirestore<Employee>(d));
  },

  async listSince(uid: string, since: Date): Promise<WithId<Employee>[]> {
    const q = query(
      COLLECTION(uid), 
      where('updatedAt', '>', Timestamp.fromDate(since)), 
      orderBy('updatedAt', 'desc'),
      limit(QUERY_LIMIT)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => fromFirestore<Employee>(d));
  },

  async get(uid: string, id: string): Promise<WithId<Employee> | null> {
    const ref = doc(db, `users/${uid}/employees/${id}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return fromFirestore<Employee>(snap as any);
  },

  async add(uid: string, employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = await addDoc(COLLECTION(uid), {
      ...employee,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async set(uid: string, id: string, employee: Partial<Employee>): Promise<void> {
    const ref = doc(db, `users/${uid}/employees/${id}`);
    await setDoc(ref, {
      ...employee,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },

  async update(uid: string, id: string, updates: Partial<Employee>): Promise<void> {
    const ref = doc(db, `users/${uid}/employees/${id}`);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  async remove(uid: string, id: string): Promise<void> {
    const ref = doc(db, `users/${uid}/employees/${id}`);
    await deleteDoc(ref);
  },
};
