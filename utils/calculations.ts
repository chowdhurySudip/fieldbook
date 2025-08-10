// Wage calculation utilities

import { AttendanceRecord, WeeklySettlement } from '../types';

/**
 * Calculate daily wage based on base wage and multiplier (FR007)
 */
export const calculateDailyWage = (
  baseWage: number,
  multiplier: number
): number => {
  return baseWage * multiplier;
};

/**
 * Calculate weekly settlement for an employee
 */
export const calculateWeeklySettlement = (
  employeeId: string,
  employeeName: string,
  attendanceRecords: AttendanceRecord[],
  weekStartDate: Date
): WeeklySettlement => {
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  // Filter attendance records for the week
  const weekRecords = attendanceRecords.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= weekStartDate && recordDate <= weekEndDate && 
           record.employeeId === employeeId && record.isPresent;
  });

  // Calculate totals
  const totalWagesEarned = weekRecords.reduce((sum, record) => sum + record.calculatedWage, 0);
  const totalAdvances = weekRecords.reduce((sum, record) => sum + record.advancePayment, 0);
  const totalExtraPayments = weekRecords.reduce((sum, record) => 
    sum + record.extraPayments.reduce((extraSum, payment) => extraSum + payment.amount, 0), 0
  );

  const netPaymentDue = totalWagesEarned + totalExtraPayments - totalAdvances;

  return {
    employeeId,
    employeeName,
    weekStartDate,
    weekEndDate,
    totalWagesEarned,
    totalAdvances,
    totalExtraPayments,
    netPaymentDue,
    attendanceRecords: weekRecords,
    isSettled: false
  };
};

/**
 * Get the start date of the current settlement week (Tuesday)
 */
export const getCurrentSettlementWeek = (): Date => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days to subtract to get to Wednesday (3)
  let daysToSubtract = dayOfWeek - 3;
  if (daysToSubtract < 0) {
    daysToSubtract += 7; // Go to previous Wednesday
  }
  
  const settlementWeekStart = new Date(today);
  settlementWeekStart.setDate(today.getDate() - daysToSubtract);
  settlementWeekStart.setHours(0, 0, 0, 0);
  
  return settlementWeekStart;
};

/**
 * Get the next settlement date (Wednesday)
 */
export const getNextSettlementDate = (): Date => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // Calculate days to add to get to next Wednesday (3)
  let daysToAdd = 3 - dayOfWeek;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Go to next Wednesday
  }
  
  const nextSettlement = new Date(today);
  nextSettlement.setDate(today.getDate() + daysToAdd);
  nextSettlement.setHours(0, 0, 0, 0);
  
  return nextSettlement;
};

/**
 * Format currency for display (INR)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Validate work multiplier range
 */
export const validateWorkMultiplier = (multiplier: number): boolean => {
  return multiplier >= 0.5 && multiplier <= 2.0;
};

/**
 * Generate unique ID
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
