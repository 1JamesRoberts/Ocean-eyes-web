export interface AlertDedupeState {
  markerExists: boolean;
  lastRaisedAtMillis: number;
  snoozedUntilMillis: number;
}

export function shouldSuppressAlertDedupe(
  state: AlertDedupeState,
  now: number,
  cooldownMillis = 2 * 60 * 60 * 1000,
): boolean {
  if (!state.markerExists) return false;
  if (state.snoozedUntilMillis > now) return true;
  return state.lastRaisedAtMillis > now - cooldownMillis;
}
