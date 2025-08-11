// Core data types for the FieldBook application

export interface Employee {
  id: string;
  name: string;
  baseWageRate: number;
  contactInfo: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Site {
  id: string;
  name: string;
  startDate: Date;
  isActive: boolean;
  totalWithdrawn: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  siteId: string | null;
  date: Date;
  isPresent: boolean;
  workMultiplier: number; // 0.5 to 2.0
  hoursWorked: number;
  advancePayment: number;
  extraPayments: ExtraPayment[];
  calculatedWage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtraPayment {
  id: string;
  description: string;
  amount: number;
  category: 'transport' | 'materials' | 'other';
}

export interface PaymentHistory {
  id: string;
  employeeId: string;
  date: Date;
  amount: number;
  type: 'wage' | 'advance' | 'expense' | 'settlement' | 'site-withdrawal';
  description: string;
  relatedAttendanceId?: string;
  isSettled: boolean;
  settlementWeek?: string; // ISO week start (Wed) in local TZ, e.g. 2025-08-06
  createdAt: Date;
  // Optional snapshots for settled weeks to preserve historical accuracy
  appliedDeduction?: number; // advances deducted in this settlement
  priorAdvanceSnapshot?: number; // prev CF advances at start of week
  weeklyAdvances?: number; // advances given during this week
  wages?: number; // total wages earned in this week
  extras?: number; // total extras in this week
  priorPayableSnapshot?: number; // CF payable carried into this week
  netThisWeek?: number; // wages + extras - appliedDeduction
  // Site withdrawals support
  siteId?: string;
}

export interface WeeklySettlement {
  employeeId: string;
  employeeName: string;
  weekStartDate: Date;
  weekEndDate: Date;
  totalWagesEarned: number;
  totalAdvances: number;
  totalExtraPayments: number;
  netPaymentDue: number;
  attendanceRecords: AttendanceRecord[];
  isSettled: boolean;
}

export interface DashboardSummary {
  totalPendingWages: number;
  activeEmployeeCount: number;
  upcomingSettlementAmount: number;
  recentActivityCount: number;
  nextSettlementDate: Date;
}

export interface User {
  id: string;
  username: string;
  // Password hash would be stored securely on backend
  lastLoginAt: Date;
  isAuthenticated: boolean;
}

// UI State types
export interface AppState {
  user: User | null;
  employees: Employee[];
  sites: Site[];
  attendanceRecords: AttendanceRecord[];
  paymentHistory: PaymentHistory[];
  isLoading: boolean;
  error: string | null;
  lastSyncAt: Date | null;
  isOffline: boolean;
  syncStatus?: 'idle' | 'syncing' | 'ok' | 'error';
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  EmployeeDetail: { employeeId: string };
  AddEmployee: undefined;
  EditEmployee: { employeeId: string };
  SiteDetail: { siteId: string };
  AddSite: undefined;
  EditSite: { siteId: string };
  AttendanceEntry: { date?: string };
  SettlementReport: { employeeId: string; weekStartDate: string };
  PaymentHistory: { employeeId: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Employees: undefined;
  Sites: undefined;
  Settlements: undefined;
};
