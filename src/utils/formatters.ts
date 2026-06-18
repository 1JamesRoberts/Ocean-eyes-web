// formatters.ts - Shared formatting utilities for AI analytics components

import { format, isValid, parse, parseISO } from 'date-fns';

/**
 * Format an ISO timestamp into a short time string (HH:MM).
 */
export function formatTimeShort(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a YYYY-MM-DD date string into the Apple-style display form.
 * Example: "2026-06-18" → "18 Jun 2026"
 */
export function formatDateForDisplay(dateString: string): string {
  const parsed = parseISO(dateString);
  if (!isValid(parsed)) return dateString;
  return format(parsed, 'dd MMM yyyy');
}

/**
 * Format a 24-hour time string (HH:mm) into the Apple-style display form.
 * Example: "11:00" → "11:00 AM", "14:30" → "2:30 PM"
 */
export function formatTimeForDisplay(timeString: string): string {
  const parsed = parse(timeString, 'HH:mm', new Date());
  if (!isValid(parsed)) return timeString;
  return format(parsed, 'h:mm aa');
}

/**
 * Combine a YYYY-MM-DD date string and an HH:mm time string into a Date object.
 */
export function combineDateTime(dateString: string, timeString: string): Date {
  return parse(`${dateString} ${timeString}`, 'yyyy-MM-dd HH:mm', new Date());
}

/**
 * Convert a Date object to YYYY-MM-DD.
 */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Convert a Date object to HH:mm (24-hour).
 */
export function toISOTime(date: Date): string {
  return format(date, 'HH:mm');
}

/**
 * Convert a snake_case species ID to Title Case display name.
 * Example: "harlequin_rasbora" → "Harlequin Rasbora"
 */
const speciesNameCache = new Map<string, string>();

export function formatSpeciesName(speciesId: string): string {
  const cached = speciesNameCache.get(speciesId);
  if (cached !== undefined) return cached;
  const formatted = speciesId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  speciesNameCache.set(speciesId, formatted);
  return formatted;
}

/**
 * Get today's date as YYYY-MM-DD in UTC.
 */
export function todayUTC(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .split('T')[0];
}

/**
 * Format a duration in seconds as MM:SS.
 */
export function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
