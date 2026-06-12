// formatters.ts - Shared formatting utilities for AI analytics components

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
 * Convert a snake_case species ID to Title Case display name.
 * Example: "harlequin_rasbora" → "Harlequin Rasbora"
 */
export function formatSpeciesName(speciesId: string): string {
  return speciesId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
