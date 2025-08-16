import { DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';

export type WithId<T> = T & { id: string };

export function fromFirestore<T extends Record<string, any>>(doc: QueryDocumentSnapshot<DocumentData>): WithId<T> {
  const data = doc.data();
  return {
    id: doc.id,
    ...(convertTimestampsToDates(data) as T),
  };
}

export function convertTimestampsToDates(obj: any): any {
  if (obj == null) return obj;
  if (obj instanceof Timestamp) return obj.toDate();
  if (Array.isArray(obj)) return obj.map(convertTimestampsToDates);
  if (typeof obj === 'object') {
    const out: any = {};
    for (const k of Object.keys(obj)) {
      out[k] = convertTimestampsToDates(obj[k]);
    }
    return out;
  }
  return obj;
}
