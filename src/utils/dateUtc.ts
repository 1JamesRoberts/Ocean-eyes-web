// dateUtc.ts - UTC-first date utilities so the analytics date picker and
// formatting stay aligned with the UTC timestamps stored in JSONL files.

const UTC = 'UTC';

/**
 * Parse a YYYY-MM-DD string into a Date at midnight UTC.
 */
export function parseUTCDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Convert a Date to YYYY-MM-DD in UTC.
 */
export function toISODateUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a UTC date using Intl.DateTimeFormat. Supported patterns are limited
 * to the shapes currently used by the calendar and analytics formatting.
 */
export function formatUTCDate(
  date: Date,
  pattern: 'd' | 'MMMM yyyy' | 'dd MMM yyyy' | 'EEE'
): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: UTC,
    ...(pattern === 'd' && { day: 'numeric' }),
    ...(pattern === 'MMMM yyyy' && { month: 'long', year: 'numeric' }),
    ...(pattern === 'dd MMM yyyy' && {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    ...(pattern === 'EEE' && { weekday: 'short' }),
  });
  return formatter.format(date);
}

/**
 * Return a Date at the start of the UTC month for the given UTC date.
 */
export function startOfUTCMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Return a Date at the end of the UTC month for the given UTC date.
 */
export function endOfUTCMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

/**
 * Return the start of the UTC week (Sunday) for the given UTC date.
 */
export function startOfUTCWeek(date: Date): Date {
  const day = date.getUTCDay();
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/**
 * Return the end of the UTC week (Saturday) for the given UTC date.
 */
export function endOfUTCWeek(date: Date): Date {
  const day = date.getUTCDay();
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + (6 - day)));
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

/**
 * Add N months to a UTC date (keeping the day within the target month).
 */
export function addUTCMonths(date: Date, months: number): Date {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0));
  const targetDay = Math.min(date.getUTCDate(), getDaysInUTCMonth(next));
  next.setUTCDate(targetDay);
  return next;
}

/**
 * Subtract N months from a UTC date.
 */
export function subUTCMonths(date: Date, months: number): Date {
  return addUTCMonths(date, -months);
}

/**
 * Return the number of days in the UTC month for the given date.
 */
export function getDaysInUTCMonth(date: Date): number {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

/**
 * Generate each day in the inclusive UTC interval.
 */
export function eachDayOfUTCInterval(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (current <= last) {
    days.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

/**
 * Check whether two dates fall on the same UTC calendar day.
 */
export function isSameUTCDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Check whether two dates fall in the same UTC calendar month.
 */
export function isSameUTCMonth(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

/**
 * Is the given date "today" in UTC?
 */
export function isTodayUTC(date: Date): boolean {
  const now = new Date();
  return isSameUTCDay(date, now);
}

/**
 * Combine a YYYY-MM-DD date string and an HH:mm time string into a UTC Date.
 */
export function combineDateTimeUTC(dateString: string, timeString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
}
