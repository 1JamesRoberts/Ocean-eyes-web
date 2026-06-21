// helpers.ts - Shared utility functions

/**
 * Creates a debounced version of the provided function.
 * The debounced function delays invoking `fn` until `ms` milliseconds
 * have elapsed since the last invocation.
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: A) => {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);
    }, ms);
  };
}
