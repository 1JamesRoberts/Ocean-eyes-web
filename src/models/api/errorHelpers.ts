// errorHelpers.ts - Small utilities for classifying fetch errors
import { ApiError } from './aiApi';

/**
 * Returns true when an error indicates the backend is unreachable (network,
 * DNS, connection refused, CORS preflight failure, etc.), as opposed to an
 * HTTP-level error response from the server.
 */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof ApiError) return false;
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('fetch failed')
    );
  }
  return false;
}
