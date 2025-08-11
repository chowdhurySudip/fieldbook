import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Employee } from '../../types';
import { db } from '../firebase';
import { fromFirestore, WithId } from './firestoreUtils';

const COLLECTION = (uid: string) => collection(db, `users/${uid}/employees`);

export const EmployeesRepo = {
  async list(uid: string): Promise<WithId<Employee>[]> {
    const q = query(COLLECTION(uid), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => fromFirestore<Employee>(d));
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
