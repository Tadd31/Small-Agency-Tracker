/**
 * Centralized Date Utilities for Timesheet Recorder
 * Guarantees consistent local-timezone date parsing, formatting, and week-start calculations
 * without UTC offset drift issues across timezones.
 */

/**
 * Safely parses a date string (YYYY-MM-DD or ISO timestamp) into a Date object in local time.
 */
export function parseLocalDate(dStr: string): Date {
  if (!dStr) return new Date();
  if (dStr.includes('T')) {
    return new Date(dStr);
  }
  // YYYY-MM-DD -> construct Date in local time using explicit components
  const parts = dStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }
  return new Date(dStr);
}

/**
 * Formats a YYYY-MM-DD or ISO date string for display (e.g., "24 Jul 2026").
 */
export function formatDateDisplay(dStr: string): string {
  if (!dStr) return '';
  const d = parseLocalDate(dStr);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Calculates the YYYY-MM-DD string for the Monday of the week containing the given date.
 */
export function getMondayDateStr(dStr: string): string {
  const d = parseLocalDate(dStr);
  const day = d.getDay();
  // Sunday is 0, Monday is 1, Saturday is 6
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formats the Monday date of the week containing the given date string for display.
 */
export function formatMondayDisplay(dStr: string): string {
  const monStr = getMondayDateStr(dStr);
  return formatDateDisplay(monStr);
}

/**
 * Returns today's date in YYYY-MM-DD format in local time.
 */
export function getTodayDateStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
