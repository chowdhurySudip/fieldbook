import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { PaymentHistory } from '../../types';
import { db } from '../firebase';
import { fromFirestore, WithId } from './firestoreUtils';

const COLLECTION = (uid: string) => collection(db, `users/${uid}/payments`);
const SETTLEMENT_ID = (employeeId: string, weekISO: string) => `settlement_${employeeId}_${weekISO}`;

export const PaymentsRepo = {
  async list(uid: string): Promise<WithId<PaymentHistory>[]> {
    const q = query(COLLECTION(uid), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => fromFirestore<PaymentHistory>(d));
  },

  async listSince(uid: string, since: Date): Promise<WithId<PaymentHistory>[]> {
    const q = query(COLLECTION(uid), where('updatedAt', '>', Timestamp.fromDate(since)), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => fromFirestore<PaymentHistory>(d));
  },

  async upsertSettlement(uid: string, payment: PaymentHistory): Promise<string> {
    if (payment.type === 'settlement' && payment.employeeId && payment.settlementWeek) {
      const id = SETTLEMENT_ID(payment.employeeId, payment.settlementWeek);
      const ref = doc(db, `users/${uid}/payments/${id}`);
      await setDoc(ref, { ...payment, updatedAt: serverTimestamp(), createdAt: payment.createdAt || serverTimestamp() }, { merge: true });
      return id;
    }
    const ref = await addDoc(COLLECTION(uid), {
      ...payment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async add(uid: string, payment: Omit<PaymentHistory, 'id' | 'createdAt'> & { updatedAt?: any }): Promise<string> {
    const ref = await addDoc(COLLECTION(uid), {
      ...payment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async update(uid: string, id: string, updates: Partial<PaymentHistory>): Promise<void> {
    const ref = doc(db, `users/${uid}/payments/${id}`);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  async set(uid: string, id: string, payment: Partial<PaymentHistory>): Promise<void> {
    const ref = doc(db, `users/${uid}/payments/${id}`);
    await setDoc(ref, {
      ...payment,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },

  async remove(uid: string, id: string): Promise<void> {
    const ref = doc(db, `users/${uid}/payments/${id}`);
    await deleteDoc(ref);
  },
};
