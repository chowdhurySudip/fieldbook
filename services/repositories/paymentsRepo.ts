import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { PaymentHistory } from '../../types';
import { db } from '../firebase';
import { fromFirestore, WithId } from './firestoreUtils';

const COLLECTION = (uid: string) => collection(db, `users/${uid}/payments`);
const dayKey = (d: Date | string) => {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).toISOString().slice(0, 10);
};
const SETTLEMENT_ID = (employeeId: string, weekISO: string) => `settlement_${employeeId}_${weekISO}`;

const docIdForPayment = (p: PaymentHistory): string | null => {
  if (p.type === 'settlement' && p.employeeId && p.settlementWeek) return SETTLEMENT_ID(p.employeeId, p.settlementWeek);
  if (p.relatedAttendanceId) return `att_${p.relatedAttendanceId}_${p.type}`;
  if ((p as any).siteId && p.type === 'site-withdrawal') return `sitewd_${(p as any).siteId}_${dayKey(p.date)}`;
  // Fallback deterministic-ish id to avoid duplicates
  return `p_${p.type}_${p.employeeId || 'na'}_${dayKey(p.date)}_${Math.round((p.amount || 0) * 100)}`;
};

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

  async upsert(uid: string, payment: PaymentHistory): Promise<string> {
    const id = docIdForPayment(payment);
    if (id) {
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

  async upsertSettlement(uid: string, payment: PaymentHistory): Promise<string> {
    // Kept for backward compatibility; delegates to upsert
    return this.upsert(uid, payment);
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
