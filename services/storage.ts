// Local storage service for offline data persistence

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AttendanceRecord, Employee, PaymentHistory, Site, User } from '../types';

const STORAGE_KEYS = {
  EMPLOYEES: 'fieldbook_employees',
  SITES: 'fieldbook_sites',
  ATTENDANCE_RECORDS: 'fieldbook_attendance',
  PAYMENT_HISTORY: 'fieldbook_payments',
  USER: 'fieldbook_user',
  LAST_SYNC: 'fieldbook_last_sync',
  CF_ADVANCES: 'fieldbook_cf_advances',
  CF_EXTRAS: 'fieldbook_cf_extras',
  SETTLED_WEEKS: 'fieldbook_settled_weeks',
  CF_ADV_BY_WEEK: 'fieldbook_cf_adv_by_week', // key: `${empId}|${weekStartISO}` => number (prev CF at start of week)
};

export class StorageService {
  // Employee operations
  static async getEmployees(): Promise<Employee[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting employees:', error);
      return [];
    }
  }

  static async saveEmployees(employees: Employee[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    } catch (error) {
      console.error('Error saving employees:', error);
      throw error;
    }
  }

  static async addEmployee(employee: Employee): Promise<void> {
    const employees = await this.getEmployees();
    employees.push(employee);
    await this.saveEmployees(employees);
  }

  static async updateEmployee(employeeId: string, updates: Partial<Employee>): Promise<void> {
    const employees = await this.getEmployees();
    const index = employees.findIndex(emp => emp.id === employeeId);
    if (index !== -1) {
      employees[index] = { ...employees[index], ...updates, updatedAt: new Date() };
      await this.saveEmployees(employees);
    }
  }

  static async deleteEmployee(employeeId: string): Promise<void> {
    const employees = await this.getEmployees();
    const filtered = employees.filter(emp => emp.id !== employeeId);
    await this.saveEmployees(filtered);
  }

  // Site operations
  static async getSites(): Promise<Site[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SITES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting sites:', error);
      return [];
    }
  }

  static async saveSites(sites: Site[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(sites));
    } catch (error) {
      console.error('Error saving sites:', error);
      throw error;
    }
  }

  static async addSite(site: Site): Promise<void> {
    const sites = await this.getSites();
    sites.push(site);
    await this.saveSites(sites);
  }

  static async updateSite(siteId: string, updates: Partial<Site>): Promise<void> {
    const sites = await this.getSites();
    const index = sites.findIndex(site => site.id === siteId);
    if (index !== -1) {
      sites[index] = { ...sites[index], ...updates, updatedAt: new Date() };
      await this.saveSites(sites);
    }
  }

  // Attendance operations
  static async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ATTENDANCE_RECORDS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting attendance records:', error);
      return [];
    }
  }

  static async saveAttendanceRecords(records: AttendanceRecord[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE_RECORDS, JSON.stringify(records));
    } catch (error) {
      console.error('Error saving attendance records:', error);
      throw error;
    }
  }

  static async addAttendanceRecord(record: AttendanceRecord): Promise<void> {
    const records = await this.getAttendanceRecords();
    records.push(record);
    await this.saveAttendanceRecords(records);
  }

  static async updateAttendanceRecord(recordId: string, updates: Partial<AttendanceRecord>): Promise<void> {
    const records = await this.getAttendanceRecords();
    const index = records.findIndex(record => record.id === recordId);
    if (index !== -1) {
      records[index] = { ...records[index], ...updates, updatedAt: new Date() };
      await this.saveAttendanceRecords(records);
    }
  }

  // Payment history operations
  static async getPaymentHistory(): Promise<PaymentHistory[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting payment history:', error);
      return [];
    }
  }

  static async savePaymentHistory(history: PaymentHistory[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PAYMENT_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving payment history:', error);
      throw error;
    }
  }

  static async addPaymentRecord(payment: PaymentHistory): Promise<void> {
    const history = await this.getPaymentHistory();
    history.push(payment);
    await this.savePaymentHistory(history);
  }

  // User operations
  static async getUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  static async saveUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  static async clearUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    } catch (error) {
      console.error('Error clearing user:', error);
    }
  }

  // Sync operations
  static async getLastSyncTime(): Promise<Date | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return data ? new Date(data) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  static async setLastSyncTime(date: Date): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, date.toISOString());
    } catch (error) {
      console.error('Error setting last sync time:', error);
    }
  }

  // Carry-forward balances
  static async getCarryForwardAdvances(): Promise<Record<string, number>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CF_ADVANCES);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting carry forward advances:', error);
      return {};
    }
  }

  static async setCarryForwardAdvances(map: Record<string, number>): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CF_ADVANCES, JSON.stringify(map));
    } catch (error) {
      console.error('Error saving carry forward advances:', error);
      throw error;
    }
  }

  static async getCarryForwardExtras(): Promise<Record<string, number>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CF_EXTRAS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting carry forward extras:', error);
      return {};
    }
  }

  static async setCarryForwardExtras(map: Record<string, number>): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CF_EXTRAS, JSON.stringify(map));
    } catch (error) {
      console.error('Error saving carry forward extras:', error);
      throw error;
    }
  }

  // Per-week carry-forward advances (prev CF at week start)
  static async getCarryForwardAdvancesByWeek(): Promise<Record<string, number>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CF_ADV_BY_WEEK);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting per-week carry forward advances:', error);
      return {};
    }
  }

  static async setCarryForwardAdvancesByWeek(map: Record<string, number>): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CF_ADV_BY_WEEK, JSON.stringify(map));
    } catch (error) {
      console.error('Error saving per-week carry forward advances:', error);
      throw error;
    }
  }

  // Settled weeks map (key: `${employeeId}|${weekStartISO}` => true)
  static async getSettledWeeks(): Promise<Record<string, boolean>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTLED_WEEKS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting settled weeks:', error);
      return {};
    }
  }

  static async setSettledWeeks(map: Record<string, boolean>): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTLED_WEEKS, JSON.stringify(map));
    } catch (error) {
      console.error('Error saving settled weeks:', error);
      throw error;
    }
  }

  // Clear all data
  static async clearAllData(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  // Clear app data but keep user and last sync
  static async clearDataButKeepUser(): Promise<void> {
    try {
      const keysToClear = [
        STORAGE_KEYS.EMPLOYEES,
        STORAGE_KEYS.SITES,
        STORAGE_KEYS.ATTENDANCE_RECORDS,
        STORAGE_KEYS.PAYMENT_HISTORY,
        STORAGE_KEYS.CF_ADVANCES,
        STORAGE_KEYS.CF_EXTRAS,
      ];
      await AsyncStorage.multiRemove(keysToClear);
    } catch (error) {
      console.error('Error clearing data (except user):', error);
      throw error;
    }
  }
}
