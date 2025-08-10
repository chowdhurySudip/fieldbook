// App context for global state management

import React, { createContext, useContext, useEffect, useReducer } from 'react';
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
  dispatch: React.Dispatch<AppAction>;
  actions: {
    login: (username: string, password: string) => Promise<boolean>;
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

  // Load data on app start
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [user, employees, sites, attendanceRecords, paymentHistory, lastSync] = await Promise.all([
        StorageService.getUser(),
        StorageService.getEmployees(),
        StorageService.getSites(),
        StorageService.getAttendanceRecords(),
        StorageService.getPaymentHistory(),
        StorageService.getLastSyncTime()
      ]);

      dispatch({ type: 'SET_USER', payload: user });
      dispatch({ type: 'SET_EMPLOYEES', payload: employees });
      dispatch({ type: 'SET_SITES', payload: sites });
      dispatch({ type: 'SET_ATTENDANCE_RECORDS', payload: attendanceRecords });
      dispatch({ type: 'SET_PAYMENT_HISTORY', payload: paymentHistory });
      dispatch({ type: 'SET_LAST_SYNC', payload: lastSync });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load data' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Simple authentication - in production, this would call an API
      if (username === 'contractor' && password === 'fieldbook2025') {
        const user: User = {
          id: generateId(),
          username,
          lastLoginAt: new Date(),
          isAuthenticated: true
        };
        await StorageService.saveUser(user);
        dispatch({ type: 'SET_USER', payload: user });
        return true;
      }
      return false;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Login failed' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = async (): Promise<void> => {
    await StorageService.clearUser();
    dispatch({ type: 'SET_USER', payload: null });
  };

  const addEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    const employee: Employee = {
      ...employeeData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await StorageService.addEmployee(employee);
    dispatch({ type: 'ADD_EMPLOYEE', payload: employee });
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>): Promise<void> => {
    await StorageService.updateEmployee(id, updates);
    dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id, updates } });
  };

  const toggleEmployeeStatus = async (id: string): Promise<void> => {
    const employee = state.employees.find(emp => emp.id === id);
    if (employee) {
      await StorageService.updateEmployee(id, { isActive: !employee.isActive });
      dispatch({ type: 'TOGGLE_EMPLOYEE_STATUS', payload: id });
    }
  };

  const addSite = async (siteData: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    const site: Site = {
      ...siteData,
      id: generateId(),
      totalWithdrawn: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await StorageService.addSite(site);
    dispatch({ type: 'ADD_SITE', payload: site });
  };

  const updateSite = async (id: string, updates: Partial<Site>): Promise<void> => {
    await StorageService.updateSite(id, updates);
    dispatch({ type: 'UPDATE_SITE', payload: { id, updates } });
  };

  const addAttendanceRecord = async (recordData: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    const record: AttendanceRecord = {
      ...recordData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await StorageService.addAttendanceRecord(record);
    dispatch({ type: 'ADD_ATTENDANCE_RECORD', payload: record });
  };

  const updateAttendanceRecord = async (id: string, updates: Partial<AttendanceRecord>): Promise<void> => {
    await StorageService.updateAttendanceRecord(id, updates);
    dispatch({ type: 'UPDATE_ATTENDANCE_RECORD', payload: { id, updates } });
  };

  const addPaymentRecord = async (paymentData: Omit<PaymentHistory, 'id' | 'createdAt'>): Promise<void> => {
    const payment: PaymentHistory = {
      ...paymentData,
      id: generateId(),
      createdAt: new Date()
    };
    
    await StorageService.addPaymentRecord(payment);
    dispatch({ type: 'ADD_PAYMENT_RECORD', payload: payment });
  };

  const actions = {
    login,
    logout,
    loadData,
    addEmployee,
    updateEmployee,
    toggleEmployeeStatus,
    addSite,
    updateSite,
    addAttendanceRecord,
    updateAttendanceRecord,
    addPaymentRecord
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
