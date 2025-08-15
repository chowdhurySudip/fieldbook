// App context for global state management

import NetInfo from '@react-native-community/netinfo';
import { collection, doc as fsDoc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { InteractionManager, AppState as RNAppState } from 'react-native';
import { AuthService } from '../services/auth';
import { db } from '../services/firebase';
import { AttendanceRepo } from '../services/repositories/attendanceRepo';
import { EmployeesRepo } from '../services/repositories/employeesRepo';
import { fromFirestore } from '../services/repositories/firestoreUtils';
import { MetaRepo } from '../services/repositories/metaRepo';
import { PaymentsRepo } from '../services/repositories/paymentsRepo';
import { SitesRepo } from '../services/repositories/sitesRepo';
import { PendingOp, StorageService } from '../services/storage';
import { AppState, AttendanceRecord, Employee, PaymentHistory, Site, User } from '../types';
import { generateId } from '../utils/calculations';

// Helpers for payment merge and sync guards
function paymentKey(p: PaymentHistory): string {
  if (p.type === 'settlement' && p.employeeId && p.settlementWeek) {
    return `settlement:${p.employeeId}:${p.settlementWeek}`;
  }
  if (p.relatedAttendanceId) {
    return `attendance:${p.relatedAttendanceId}:${p.type}`;
  }
  if ((p as any).siteId && p.type === 'site-withdrawal') {
    return `sitewd:${(p as any).siteId}:${new Date(p.date).toDateString()}`;
  }
  return `${p.type}:${p.employeeId || ''}:${new Date(p.date).toISOString()}:${p.amount}`;
}

// LWW comparator (prefer higher updatedAt, then createdAt)
function isNewer(a: { updatedAt?: any; createdAt?: any }, b: { updatedAt?: any; createdAt?: any }) {
  const au = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const bu = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  if (au !== bu) return au > bu;
  const ac = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bc = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
  return ac >= bc;
}

function mergePayments(local: PaymentHistory[], remote: PaymentHistory[]): PaymentHistory[] {
  const map = new Map<string, PaymentHistory>();
  for (const p of local || []) {
    const k = paymentKey(p);
    const existing = map.get(k);
    map.set(k, existing ? (isNewer(p, existing) ? p : existing) : p);
  }
  for (const p of remote || []) {
    const k = paymentKey(p);
    const existing = map.get(k);
    map.set(k, existing ? (isNewer(p, existing) ? p : existing) : p);
  }
  return Array.from(map.values());
}

// Generic LWW merge for entity arrays by id
function lwwMergeById<T extends { id: string; updatedAt?: any; createdAt?: any }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of local || []) {
    const existing = map.get(item.id);
    map.set(item.id, existing ? (isNewer(item, existing) ? item : existing) : item);
  }
  for (const item of remote || []) {
    const existing = map.get(item.id);
    map.set(item.id, existing ? (isNewer(item, existing) ? item : existing) : item);
  }
  return Array.from(map.values());
}

let syncInFlight = false;
let lastSyncRequestedAt = 0;
const SYNC_DEBOUNCE_MS = 2000; // reduced debounce for better responsiveness
const FOCUS_SYNC_MIN_INTERVAL_MS = 30_000; // reduced to 30s for better sync frequency
const BATCH_SIZE = 20; // limit concurrent operations to prevent blocking
const QUERY_LIMIT = 100; // limit Firestore query results

// Action types
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_EMPLOYEES'; payload: Employee[] }
  | { type: 'ADD_EMPLOYEE'; payload: Employee }
  | { type: 'UPDATE_EMPLOYEE'; payload: { id: string; updates: Partial<Employee> } }
  | { type: 'TOGGLE_EMPLOYEE_STATUS'; payload: string }
  | { type: 'SET_SITES'; payload: Site[] }
  | { type: 'ADD_SITE'; payload: Site }
  | { type: 'UPDATE_SITE'; payload: { id: string; updates: Partial<Site> } }
  | { type: 'SET_ATTENDANCE_RECORDS'; payload: AttendanceRecord[] }
  | { type: 'ADD_ATTENDANCE_RECORD'; payload: AttendanceRecord }
  | { type: 'UPDATE_ATTENDANCE_RECORD'; payload: { id: string; updates: Partial<AttendanceRecord> } }
  | { type: 'SET_PAYMENT_HISTORY'; payload: PaymentHistory[] }
  | { type: 'ADD_PAYMENT_RECORD'; payload: PaymentHistory }
  | { type: 'SET_OFFLINE_STATUS'; payload: boolean }
  | { type: 'SET_LAST_SYNC'; payload: Date | null }
  | { type: 'SET_SYNC_STATUS'; payload: 'idle' | 'syncing' | 'ok' | 'error' }
  | { type: 'SET_AUTH_READY'; payload: boolean };

// Initial state
const initialState: AppState = {
  user: null,
  employees: [],
  sites: [],
  attendanceRecords: [],
  paymentHistory: [],
  isLoading: false,
  error: null,
  lastSyncAt: null,
  isOffline: false,
  syncStatus: 'idle',
  isAuthReady: false,
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'SET_EMPLOYEES':
      return { ...state, employees: action.payload };
    
    case 'ADD_EMPLOYEE':
      return { ...state, employees: [...state.employees, action.payload] };
    
    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map(emp =>
          emp.id === action.payload.id
            ? { ...emp, ...action.payload.updates, updatedAt: new Date() }
            : emp
        )
      };
    
    case 'TOGGLE_EMPLOYEE_STATUS':
      return {
        ...state,
        employees: state.employees.map(emp =>
          emp.id === action.payload
            ? { ...emp, isActive: !emp.isActive, updatedAt: new Date() }
            : emp
        )
      };
    
    case 'SET_SITES':
      return { ...state, sites: action.payload };
    
    case 'ADD_SITE':
      return { ...state, sites: [...state.sites, action.payload] };
    
    case 'UPDATE_SITE':
      return {
        ...state,
        sites: state.sites.map(site =>
          site.id === action.payload.id
            ? { ...site, ...action.payload.updates, updatedAt: new Date() }
            : site
        )
      };
    
    case 'SET_ATTENDANCE_RECORDS':
      return { ...state, attendanceRecords: action.payload };
    
    case 'ADD_ATTENDANCE_RECORD':
      return { ...state, attendanceRecords: [...state.attendanceRecords, action.payload] };
    
    case 'UPDATE_ATTENDANCE_RECORD':
      return {
        ...state,
        attendanceRecords: state.attendanceRecords.map(record =>
          record.id === action.payload.id
            ? { ...record, ...action.payload.updates, updatedAt: new Date() }
            : record
        )
      };
    
    case 'SET_PAYMENT_HISTORY':
      return { ...state, paymentHistory: action.payload };
    
    case 'ADD_PAYMENT_RECORD':
      return { ...state, paymentHistory: [...state.paymentHistory, action.payload] };
    
    case 'SET_OFFLINE_STATUS':
      return { ...state, isOffline: action.payload };
    
    case 'SET_LAST_SYNC':
      return { ...state, lastSyncAt: action.payload };

    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload };

    case 'SET_AUTH_READY':
      return { ...state, isAuthReady: action.payload };

    default:
      return state;
  }
};

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<any>;
  actions: {
    register: (email: string, password: string, name?: string) => Promise<boolean>;
    login: (email: string, password: string) => Promise<boolean>;
    resetPassword: (email: string) => Promise<boolean>;
    logout: () => Promise<void>;
    loadData: () => Promise<void>;
    addEmployee: (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
    toggleEmployeeStatus: (id: string) => Promise<void>;
    addSite: (site: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateSite: (id: string, updates: Partial<Site>) => Promise<void>;
    addAttendanceRecord: (record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateAttendanceRecord: (id: string, updates: Partial<AttendanceRecord>) => Promise<void>;
    addPaymentRecord: (payment: Omit<PaymentHistory, 'id' | 'createdAt'>) => Promise<void>;
    syncNow: () => Promise<void>;
  };
} | null>(null);

// Provider component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Subscribe to Firebase auth state
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (sessionUser) => {
      if (sessionUser) {
        try { StorageService.setNamespace(sessionUser.uid); } catch {}
        const user: User = {
          id: sessionUser.uid,
          username: sessionUser.email || sessionUser.displayName || 'user',
          lastLoginAt: new Date(),
          isAuthenticated: true,
        };
        dispatch({ type: 'SET_USER', payload: user });
        try { await StorageService.saveUser(user); } catch {}
        // Clean-start policy: wipe legacy global (non-namespaced) data
        try { await StorageService.clearLegacyGlobalData(); } catch {}
        // Load app data from namespaced cache
        loadData();
      } else {
        try { StorageService.clearNamespace(); } catch {}
        dispatch({ type: 'SET_USER', payload: null });
      }
      // Mark auth as initialized (avoid login flicker)
      dispatch({ type: 'SET_AUTH_READY', payload: true });
    });
    return unsubscribe;
  }, []);

  // Load data on app start (non-user-specific for now)
  const loadData = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const uid = state.user?.id;

      // Always start from local cache
      const [localEmployees, localSites] = await Promise.all([
        StorageService.getEmployees(),
        StorageService.getSites(),
      ]);
      let employees: Employee[] = localEmployees;
      let sites: Site[] = localSites;

      if (uid) {
        try {
          const [remoteEmployees, remoteSites] = await Promise.all([
            EmployeesRepo.list(uid),
            SitesRepo.list(uid),
          ]);
          employees = lwwMergeById(localEmployees as any, remoteEmployees as any) as any;
          sites = lwwMergeById(localSites as any, remoteSites as any) as any;
          await Promise.all([
            StorageService.saveEmployees(employees),
            StorageService.saveSites(sites),
          ]);
        } catch (e) {
          // Keep local on failure
        }
      }

      // Always read local first
      const [localAttendance, localPayments, lastSync] = await Promise.all([
        StorageService.getAttendanceRecords(),
        StorageService.getPaymentHistory(),
        StorageService.getLastSyncTime(),
      ]);

      let att: AttendanceRecord[] = localAttendance;
      let payments: PaymentHistory[] = localPayments;

      // Best-effort remote refresh with LWW merge
      if (uid) {
        try {
          const [remoteAttendance, remotePayments] = await Promise.all([
            AttendanceRepo.list(uid),
            PaymentsRepo.list(uid),
          ]);
          const mergedAtt = lwwMergeById(localAttendance as any, remoteAttendance as any) as any;
          const mergedPay = mergePayments(localPayments as any, remotePayments as any) as any;
          await Promise.all([
            StorageService.saveAttendanceRecords(mergedAtt),
            StorageService.savePaymentHistory(mergedPay),
          ]);
          att = mergedAtt;
          payments = mergedPay;
        } catch {
          // ignore errors, rely on local data
        }
      }

      // Only dispatch when changed to reduce re-renders
      const shouldSetAttendance = state.attendanceRecords.length !== att.length;
      const shouldSetPayments = state.paymentHistory.length !== payments.length;

      dispatch({ type: 'SET_EMPLOYEES', payload: employees });
      dispatch({ type: 'SET_SITES', payload: sites });
      if (shouldSetAttendance) dispatch({ type: 'SET_ATTENDANCE_RECORDS', payload: att });
      if (shouldSetPayments) dispatch({ type: 'SET_PAYMENT_HISTORY', payload: payments });
      dispatch({ type: 'SET_LAST_SYNC', payload: lastSync });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load data' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (email: string, password: string, name?: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await AuthService.register(email, password, name);
      return true;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Registration failed' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await AuthService.login(email, password);
      return true;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Login failed' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await AuthService.sendPasswordReset(email);
      return true;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Password reset failed' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = async (): Promise<void> => {
    await AuthService.logout();
    dispatch({ type: 'SET_USER', payload: null });
  };

  const addEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    const uid = state.user?.id;
    let id = generateId();
    try {
      if (uid) {
        id = await EmployeesRepo.add(uid, employeeData);
      } else {
        await StorageService.enqueuePending({ op: 'add', collection: 'employees', data: { id, ...employeeData } });
      }
    } catch (e) {
      await StorageService.enqueuePending({ op: 'add', collection: 'employees', data: { id, ...employeeData } });
    }

    const employee: Employee = {
      ...employeeData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await StorageService.addEmployee(employee);
    dispatch({ type: 'ADD_EMPLOYEE', payload: employee });
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>): Promise<void> => {
    const uid = state.user?.id;
    const prev = state.employees.find(e => e.id === id);
    try {
      if (uid) {
        await EmployeesRepo.update(uid, id, updates);
      } else {
        await StorageService.enqueuePending({ op: 'update', collection: 'employees', id, data: updates, lastKnownUpdatedAt: prev?.updatedAt ? new Date(prev.updatedAt).toISOString() : undefined });
      }
    } catch (e) {
      await StorageService.enqueuePending({ op: 'update', collection: 'employees', id, data: updates, lastKnownUpdatedAt: prev?.updatedAt ? new Date(prev.updatedAt).toISOString() : undefined });
    }
    await StorageService.updateEmployee(id, updates);
    dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id, updates } });
  };

  const toggleEmployeeStatus = async (id: string): Promise<void> => {
    const employee = state.employees.find(emp => emp.id === id);
    if (employee) {
      const newStatus = !employee.isActive;
      const uid = state.user?.id;
      try {
        if (uid) {
          await EmployeesRepo.update(uid, id, { isActive: newStatus });
        }
      } catch (e) {}
      await StorageService.updateEmployee(id, { isActive: newStatus });
      dispatch({ type: 'TOGGLE_EMPLOYEE_STATUS', payload: id });
    }
  };

  const addSite = async (siteData: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    const uid = state.user?.id;
    let id = generateId();
    try {
      if (uid) {
        id = await SitesRepo.add(uid, siteData as any);
      } else {
        await StorageService.enqueuePending({ op: 'add', collection: 'sites', data: { id, ...siteData } });
      }
    } catch (e) {
      await StorageService.enqueuePending({ op: 'add', collection: 'sites', data: { id, ...siteData } });
    }

    const site: Site = {
      ...siteData,
      id,
      totalWithdrawn: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await StorageService.addSite(site);
    dispatch({ type: 'ADD_SITE', payload: site });
  };

  const updateSite = async (id: string, updates: Partial<Site>): Promise<void> => {
    const uid = state.user?.id;
    const prev = state.sites.find(s => s.id === id);
    try {
      if (uid) {
        await SitesRepo.update(uid, id, updates);
      } else {
        await StorageService.enqueuePending({ op: 'update', collection: 'sites', id, data: updates, lastKnownUpdatedAt: prev?.updatedAt ? new Date(prev.updatedAt).toISOString() : undefined });
      }
    } catch (e) {
      await StorageService.enqueuePending({ op: 'update', collection: 'sites', id, data: updates, lastKnownUpdatedAt: prev?.updatedAt ? new Date(prev.updatedAt).toISOString() : undefined });
    }
    await StorageService.updateSite(id, updates);
    dispatch({ type: 'UPDATE_SITE', payload: { id, updates } });
  };

  const addAttendanceRecord = async (recordData: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    const uid = state.user?.id;
    let id = generateId();
    try {
      if (uid) {
        id = await AttendanceRepo.add(uid, recordData);
      } else {
        await StorageService.enqueuePending({ op: 'add', collection: 'attendance', data: { id, ...recordData } });
      }
    } catch {
      await StorageService.enqueuePending({ op: 'add', collection: 'attendance', data: { id, ...recordData } });
    }
    const record: AttendanceRecord = {
      ...recordData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await StorageService.addAttendanceRecord(record);
    dispatch({ type: 'ADD_ATTENDANCE_RECORD', payload: record });
  };

  const updateAttendanceRecord = async (id: string, updates: Partial<AttendanceRecord>): Promise<void> => {
    const uid = state.user?.id;
    const prev = state.attendanceRecords.find(a => a.id === id);
    try {
      if (uid) {
        await AttendanceRepo.update(uid, id, updates);
      } else {
        await StorageService.enqueuePending({ op: 'update', collection: 'attendance', id, data: updates, lastKnownUpdatedAt: prev?.updatedAt ? new Date(prev.updatedAt).toISOString() : undefined });
      }
    } catch {}
    await StorageService.updateAttendanceRecord(id, updates);
    dispatch({ type: 'UPDATE_ATTENDANCE_RECORD', payload: { id, updates } });
  };

  const addPaymentRecord = async (paymentData: Omit<PaymentHistory, 'id' | 'createdAt'>): Promise<void> => {
    const uid = state.user?.id;
    const id = generateId();
    const payment: PaymentHistory = { ...paymentData, id, createdAt: new Date() } as any;
    try {
      if (uid) {
        await PaymentsRepo.upsert(uid, payment);
      } else {
        await StorageService.enqueuePending({ op: 'upsert', collection: 'payments', id, data: payment });
      }
    } catch {
      await StorageService.enqueuePending({ op: 'upsert', collection: 'payments', id, data: payment });
    }
    await StorageService.addPaymentRecord(payment);
    dispatch({ type: 'ADD_PAYMENT_RECORD', payload: payment });
  };

  // Optimized pending queue flush with batching
  const flushPending = async (uid: string) => {
    const q = await StorageService.getPendingQueue();
    if (!q.length) return;
    
    const processed: PendingOp[] = [];
    
    // Process in smaller batches to prevent UI blocking
    for (let i = 0; i < q.length; i += BATCH_SIZE) {
      const batch = q.slice(i, i + BATCH_SIZE);
      
      // Process batch concurrently but with limit
      const batchPromises = batch.map(async (op) => {
        try {
          switch (op.collection) {
            case 'employees': {
              if (op.op === 'add') await EmployeesRepo.add(uid, op.data);
              if (op.op === 'update' || op.op === 'set') {
                // Skip conflict check for performance - rely on server-side resolution
                if (op.op === 'update') await EmployeesRepo.update(uid, op.id!, op.data);
                else await EmployeesRepo.set(uid, op.id!, op.data);
              }
              if (op.op === 'remove') await EmployeesRepo.remove(uid, op.id!);
              break;
            }
            case 'sites': {
              if (op.op === 'add') await SitesRepo.add(uid, op.data);
              if (op.op === 'update' || op.op === 'set') {
                if (op.op === 'update') await SitesRepo.update(uid, op.id!, op.data);
                else await SitesRepo.set(uid, op.id!, op.data);
              }
              if (op.op === 'remove') await SitesRepo.remove(uid, op.id!);
              break;
            }
            case 'attendance': {
              if (op.op === 'add') await AttendanceRepo.add(uid, op.data);
              if (op.op === 'update' || op.op === 'set') {
                if (op.op === 'update') await AttendanceRepo.update(uid, op.id!, op.data);
                else await AttendanceRepo.set(uid, op.id!, op.data);
              }
              if (op.op === 'remove') await AttendanceRepo.remove(uid, op.id!);
              break;
            }
            case 'payments': {
              if (op.op === 'upsert') await PaymentsRepo.upsert(uid, op.data);
              if (op.op === 'add') await PaymentsRepo.add(uid, op.data);
              if (op.op === 'update') await PaymentsRepo.update(uid, op.id!, op.data);
              if (op.op === 'set') await PaymentsRepo.set(uid, op.id!, op.data);
              if (op.op === 'remove') await PaymentsRepo.remove(uid, op.id!);
              break;
            }
            case 'meta': {
              if (op.op === 'set') await MetaRepo.setState(uid, op.data);
              break;
            }
          }
          return op;
        } catch {
          // Return null for failed operations (will retry later)
          return null;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          processed.push(result.value);
        }
      });
      
      // Small delay between batches to keep UI responsive
      if (i + BATCH_SIZE < q.length) {
        await new Promise((res) => setTimeout(res, 10));
      }
    }
    
    if (processed.length) {
      await StorageService.dequeueProcessed((op) => processed.includes(op));
    }
  };

  // Optimized syncNow with smart incremental sync
  const syncNow = async () => {
    if (!state.user) return;
    const nowTs = Date.now();
    if (syncInFlight || nowTs - lastSyncRequestedAt < SYNC_DEBOUNCE_MS) return;
    lastSyncRequestedAt = nowTs;
    syncInFlight = true;
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
    
    try {
      // Wait for UI interactions to complete
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });

      const uid = state.user.id;
      const since = (await StorageService.getLastSyncTime()) || new Date(0);

      // 1) Flush pending operations first (optimized)
      await flushPending(uid);

      // 2) Push only changed payments (optimized chunking)
      try {
        const localPayments = await StorageService.getPaymentHistory();
        if (localPayments?.length) {
          const changed = localPayments.filter((p: any) => {
            const cu = p.updatedAt ? new Date(p.updatedAt) : undefined;
            const cc = p.createdAt ? new Date(p.createdAt) : undefined;
            const ref = cu || cc;
            return ref ? ref > since : true;
          });
          
          // Process in smaller chunks to prevent blocking
          if (changed.length > 0) {
            const CHUNK = 25; // reduced chunk size
            for (let i = 0; i < changed.length; i += CHUNK) {
              const chunk = changed.slice(i, i + CHUNK);
              // Use Promise.allSettled to continue even if some fail
              await Promise.allSettled(
                chunk.map(p => PaymentsRepo.upsert(uid, p as any).catch(() => {}))
              );
              // Smaller delay between chunks
              if (i + CHUNK < changed.length) {
                await new Promise((res) => setTimeout(res, 5));
              }
            }
          }
        }
      } catch (e) {
        console.warn('Payment push failed:', e);
      }

      // 3) Push meta data (non-blocking)
      try {
        const [cfAdv, cfPay, settled, cfByWeek] = await Promise.all([
          StorageService.getCarryForwardAdvances(),
          StorageService.getCarryForwardExtras(),
          StorageService.getSettledWeeks(),
          StorageService.getCarryForwardAdvancesByWeek(),
        ]);
        await MetaRepo.setState(uid, { 
          cfAdvances: cfAdv, 
          cfPayables: cfPay, 
          settledWeeks: settled, 
          cfAdvByWeek: cfByWeek 
        });
      } catch (e) {
        console.warn('Meta push failed:', e);
      }

      // 4) Smart incremental pull with early exit if no changes
      let hasUpdates = false;
      try {
        // Use Promise.allSettled to prevent one failure from blocking others
        const results = await Promise.allSettled([
          EmployeesRepo.listSince(uid, since),
          SitesRepo.listSince(uid, since),
          AttendanceRepo.listSince(uid, since),
          PaymentsRepo.listSince(uid, since),
        ]);

        const [remoteEmployees, remoteSites, remoteAttendance, remotePayments] = results.map(
          result => result.status === 'fulfilled' ? result.value : []
        );

        // Only process and update state if there are actual changes
        if (remoteEmployees?.length) {
          const current = await StorageService.getEmployees();
          const merged = lwwMergeById(current as any, remoteEmployees as any) as any;
          if (merged.length !== current.length || JSON.stringify(merged) !== JSON.stringify(current)) {
            await StorageService.saveEmployees(merged);
            dispatch({ type: 'SET_EMPLOYEES', payload: merged });
            hasUpdates = true;
          }
        }

        if (remoteSites?.length) {
          const current = await StorageService.getSites();
          const merged = lwwMergeById(current as any, remoteSites as any) as any;
          if (merged.length !== current.length || JSON.stringify(merged) !== JSON.stringify(current)) {
            await StorageService.saveSites(merged);
            dispatch({ type: 'SET_SITES', payload: merged });
            hasUpdates = true;
          }
        }

        if (remoteAttendance?.length) {
          const current = await StorageService.getAttendanceRecords();
          const merged = lwwMergeById(current as any, remoteAttendance as any) as any;
          if (merged.length !== current.length || JSON.stringify(merged) !== JSON.stringify(current)) {
            await StorageService.saveAttendanceRecords(merged);
            dispatch({ type: 'SET_ATTENDANCE_RECORDS', payload: merged });
            hasUpdates = true;
          }
        }

        if (remotePayments?.length) {
          const current = await StorageService.getPaymentHistory();
          const merged = mergePayments(current, remotePayments as any);
          if (merged.length !== current.length || JSON.stringify(merged) !== JSON.stringify(current)) {
            await StorageService.savePaymentHistory(merged);
            dispatch({ type: 'SET_PAYMENT_HISTORY', payload: merged });
            hasUpdates = true;
          }
        }
      } catch (e) {
        console.warn('Data pull failed:', e);
      }

      // Update sync timestamp
      const now = new Date();
      await StorageService.setLastSyncTime(now);
      dispatch({ type: 'SET_LAST_SYNC', payload: now });
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'ok' });
      
      // Log performance info
      if (__DEV__) {
        console.log(`Sync completed in ${Date.now() - nowTs}ms${hasUpdates ? ' with updates' : ' (no changes)'}`);
      }
      
    } catch (e) {
      console.error('Sync error:', e);
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
    } finally {
      syncInFlight = false;
    }
  };

  // Smart sync triggers with better debouncing
  useEffect(() => {
    if (!state.user) return;

    // Initial sync after login (with small delay to let UI settle)
    const initialSyncTimer = setTimeout(() => syncNow(), 1000);

    // Longer interval for background sync
    const interval = setInterval(() => {
      // Only sync if app is in focus and enough time has passed
      const timeSinceLastSync = state.lastSyncAt ? Date.now() - new Date(state.lastSyncAt).getTime() : Infinity;
      if (timeSinceLastSync > 5 * 60 * 1000) { // 5 minutes minimum
        syncNow();
      }
    }, 10 * 60 * 1000); // Check every 10 minutes

    const unsubscribeNet = NetInfo.addEventListener((s) => {
      // Only sync on network reconnection if enough time has passed
      const last = state.lastSyncAt ? new Date(state.lastSyncAt).getTime() : 0;
      if (s.isConnected && Date.now() - last > FOCUS_SYNC_MIN_INTERVAL_MS) {
        setTimeout(() => syncNow(), 2000); // Small delay to ensure connection is stable
      }
    });

    const onAppState = (status: string) => {
      if (status === 'active') {
        const last = state.lastSyncAt ? new Date(state.lastSyncAt).getTime() : 0;
        if (Date.now() - last > FOCUS_SYNC_MIN_INTERVAL_MS) {
          setTimeout(() => syncNow(), 1500); // Delay to let app fully activate
        }
      }
    };
    const sub = RNAppState.addEventListener('change', onAppState);

    return () => {
      clearTimeout(initialSyncTimer);
      clearInterval(interval);
      unsubscribeNet();
      sub.remove();
    };
  }, [state.user, state.lastSyncAt]);

  // Optimized real-time listeners with smarter debouncing
  useEffect(() => {
    if (!state.user) return;
    const uid = state.user.id;
    const unsubs: Array<() => void> = [];
    let tEmp: any, tSites: any, tAtt: any, tPay: any;

    try {
      // Use limited queries for real-time listeners to reduce overhead
      const qEmp = query(
        collection(db, `users/${uid}/employees`), 
        orderBy('updatedAt', 'desc'),
        limit(50) // Limit real-time updates to recent items
      );
      unsubs.push(onSnapshot(qEmp, (snap) => {
        clearTimeout(tEmp);
        tEmp = setTimeout(async () => {
          try {
            const remote = snap.docs.map(d => fromFirestore<any>(d));
            const local = await StorageService.getEmployees();
            const merged = lwwMergeById(local as any, remote as any) as any;
            // Only update if there are meaningful changes
            if (JSON.stringify(merged.slice(0, 10)) !== JSON.stringify(local.slice(0, 10))) {
              await StorageService.saveEmployees(merged);
              dispatch({ type: 'SET_EMPLOYEES', payload: merged });
            }
          } catch {}
        }, 500); // Increased debounce for real-time updates
      }));
    } catch {}

    try {
      const qSites = query(
        collection(db, `users/${uid}/sites`), 
        orderBy('updatedAt', 'desc'),
        limit(50)
      );
      unsubs.push(onSnapshot(qSites, (snap) => {
        clearTimeout(tSites);
        tSites = setTimeout(async () => {
          try {
            const remote = snap.docs.map(d => fromFirestore<any>(d));
            const local = await StorageService.getSites();
            const merged = lwwMergeById(local as any, remote as any) as any;
            if (JSON.stringify(merged.slice(0, 10)) !== JSON.stringify(local.slice(0, 10))) {
              await StorageService.saveSites(merged);
              dispatch({ type: 'SET_SITES', payload: merged });
            }
          } catch {}
        }, 500);
      }));
    } catch {}

    try {
      const qAtt = query(
        collection(db, `users/${uid}/attendance`), 
        orderBy('updatedAt', 'desc'),
        limit(100) // Higher limit for attendance as it's more frequently updated
      );
      unsubs.push(onSnapshot(qAtt, (snap) => {
        clearTimeout(tAtt);
        tAtt = setTimeout(async () => {
          try {
            const remote = snap.docs.map(d => fromFirestore<any>(d));
            const local = await StorageService.getAttendanceRecords();
            const merged = lwwMergeById(local as any, remote as any) as any;
            if (JSON.stringify(merged.slice(0, 20)) !== JSON.stringify(local.slice(0, 20))) {
              await StorageService.saveAttendanceRecords(merged);
              dispatch({ type: 'SET_ATTENDANCE_RECORDS', payload: merged });
            }
          } catch {}
        }, 500);
      }));
    } catch {}

    try {
      const qPay = query(
        collection(db, `users/${uid}/payments`), 
        orderBy('updatedAt', 'desc'),
        limit(75) // Moderate limit for payments
      );
      unsubs.push(onSnapshot(qPay, (snap) => {
        clearTimeout(tPay);
        tPay = setTimeout(async () => {
          try {
            const remote = snap.docs.map(d => fromFirestore<any>(d));
            const local = await StorageService.getPaymentHistory();
            const merged = mergePayments(local as any, remote as any) as any;
            if (JSON.stringify(merged.slice(0, 15)) !== JSON.stringify(local.slice(0, 15))) {
              await StorageService.savePaymentHistory(merged);
              dispatch({ type: 'SET_PAYMENT_HISTORY', payload: merged });
            }
          } catch {}
        }, 500);
      }));
    } catch {}

    // Meta/state with minimal updates
    try {
      const ref = fsDoc(db, `users/${uid}/meta/state`);
      unsubs.push(onSnapshot(ref, async (snap) => {
        try {
          if (!snap.exists()) return;
          const data = snap.data() as any;
          // Update meta data in background without blocking
          setTimeout(async () => {
            try {
              await Promise.allSettled([
                data?.cfAdvances ? StorageService.setCarryForwardAdvances(data.cfAdvances) : Promise.resolve(),
                data?.cfPayables ? StorageService.setCarryForwardExtras(data.cfPayables) : Promise.resolve(),
                data?.settledWeeks ? StorageService.setSettledWeeks(data.settledWeeks) : Promise.resolve(),
                data?.cfAdvByWeek ? StorageService.setCarryForwardAdvancesByWeek(data.cfAdvByWeek) : Promise.resolve(),
              ]);
            } catch {}
          }, 100);
        } catch {}
      }));
    } catch {}

    return () => {
      unsubs.forEach(u => { try { u(); } catch {} });
      clearTimeout(tEmp); clearTimeout(tSites); clearTimeout(tAtt); clearTimeout(tPay);
    };
  }, [state.user]); // Removed excessive dependencies that were causing frequent re-subscriptions

  const actions = {
    register,
    login,
    resetPassword,
    logout,
    loadData,
    addEmployee,
    updateEmployee,
    toggleEmployeeStatus,
    addSite,
    updateSite,
    addAttendanceRecord,
    updateAttendanceRecord,
    addPaymentRecord,
    syncNow,
  };

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
