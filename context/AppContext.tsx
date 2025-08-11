// App context for global state management

import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { AuthService } from '../services/auth';
import { AttendanceRepo } from '../services/repositories/attendanceRepo';
import { EmployeesRepo } from '../services/repositories/employeesRepo';
import { PaymentsRepo } from '../services/repositories/paymentsRepo';
import { SitesRepo } from '../services/repositories/sitesRepo';
import { StorageService } from '../services/storage';
import { AppState, AttendanceRecord, Employee, PaymentHistory, Site, User } from '../types';
import { generateId } from '../utils/calculations';

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
  | { type: 'SET_LAST_SYNC'; payload: Date | null };

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
  isOffline: false
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
    });
    return unsubscribe;
  }, []);

  // Load data on app start (non-user-specific for now)
  const loadData = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const uid = state.user?.id;
      let employees: Employee[] = [];
      let sites: Site[] = [];

      if (uid) {
        try {
          // Prefer remote fetch for fresh data, then cache locally
          const remoteEmployees = await EmployeesRepo.list(uid);
          employees = remoteEmployees.map(e => ({ ...e }));
          await StorageService.saveEmployees(employees);

          const remoteSites = await SitesRepo.list(uid);
          sites = remoteSites.map(s => ({ ...s }));
          await StorageService.saveSites(sites);
        } catch (e) {
          // Fallback to local cache if remote fails
          employees = await StorageService.getEmployees();
          sites = await StorageService.getSites();
        }
      } else {
        employees = await StorageService.getEmployees();
        sites = await StorageService.getSites();
      }

      // Always read local first to avoid overwriting with empty remote
      const [localAttendance, localPayments, lastSync] = await Promise.all([
        StorageService.getAttendanceRecords(),
        StorageService.getPaymentHistory(),
        StorageService.getLastSyncTime(),
      ]);

      let att: AttendanceRecord[] = localAttendance;
      let payments: PaymentHistory[] = localPayments;

      // Best-effort remote refresh without wiping local data
      if (uid) {
        try {
          const [remoteAttendance, remotePayments] = await Promise.all([
            AttendanceRepo.list(uid),
            PaymentsRepo.list(uid),
          ]);
          // Only use remote attendance if it is at least as complete as local
          if (Array.isArray(remoteAttendance) && remoteAttendance.length >= localAttendance.length) {
            await StorageService.saveAttendanceRecords(remoteAttendance as any);
            att = remoteAttendance as any;
          }
          // Only replace payments if remote has entries; otherwise keep local to preserve settlements
          if (Array.isArray(remotePayments) && remotePayments.length > 0) {
            await StorageService.savePaymentHistory(remotePayments as any);
            payments = remotePayments as any;
          }
        } catch {
          // Ignore remote errors and keep local
        }
      }

      dispatch({ type: 'SET_EMPLOYEES', payload: employees });
      dispatch({ type: 'SET_SITES', payload: sites });
      dispatch({ type: 'SET_ATTENDANCE_RECORDS', payload: att });
      dispatch({ type: 'SET_PAYMENT_HISTORY', payload: payments });
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
        // Create remotely and use the remote id
        id = await EmployeesRepo.add(uid, employeeData);
      }
    } catch (e) {
      // If remote fails, keep local id and continue
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
    try {
      if (uid) {
        await EmployeesRepo.update(uid, id, updates);
      }
    } catch (e) {
      // ignore and rely on local until sync
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
      }
    } catch (e) {}

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
    try {
      if (uid) {
        await SitesRepo.update(uid, id, updates);
      }
    } catch (e) {}
    await StorageService.updateSite(id, updates);
    dispatch({ type: 'UPDATE_SITE', payload: { id, updates } });
  };

  const addAttendanceRecord = async (recordData: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    const uid = state.user?.id;
    let id = generateId();
    try {
      if (uid) {
        id = await AttendanceRepo.add(uid, recordData);
      }
    } catch {}
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
    try {
      if (uid) {
        await AttendanceRepo.update(uid, id, updates);
      }
    } catch {}
    await StorageService.updateAttendanceRecord(id, updates);
    dispatch({ type: 'UPDATE_ATTENDANCE_RECORD', payload: { id, updates } });
  };

  const addPaymentRecord = async (paymentData: Omit<PaymentHistory, 'id' | 'createdAt'>): Promise<void> => {
    const uid = state.user?.id;
    let id = generateId();
    try {
      if (uid) {
        id = await PaymentsRepo.add(uid, { ...paymentData });
      }
    } catch {}
    const payment: PaymentHistory = {
      ...paymentData,
      id,
      createdAt: new Date(),
    };
    await StorageService.addPaymentRecord(payment);
    dispatch({ type: 'ADD_PAYMENT_RECORD', payload: payment });
  };

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
