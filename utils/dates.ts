// Date utility functions

/**
 * Format date for display
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

/**
 * Format date for input fields
 */
export const formatDateForInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Get today's date as a Date object
 */
export const getToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Check if a date is today
 */
export const isToday = (date: Date): boolean => {
  const today = getToday();
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate.getTime() === today.getTime();
};

/**
 * Get days of the week starting from Sunday
 */
export const getDaysOfWeek = (): string[] => {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
};

/**
 * Get short days of the week
 */
export const getShortDaysOfWeek = (): string[] => {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
};

/**
 * Get the week string in format YYYY-WW
 */
export const getWeekString = (date: Date): string => {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-${weekNumber.toString().padStart(2, '0')}`;
};

/**
 * Parse date from string safely
 */
export const parseDate = (dateString: string): Date => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? new Date() : date;
};
