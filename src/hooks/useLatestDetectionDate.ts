// useLatestDetectionDate.ts - Fetch the latest date with detection history from the backend.
import { useEffect, useState, useRef } from 'react';
import { fetchAvailableDetectionDates } from '../models/api/aiApi';
import { isNetworkError } from '../models/api/errorHelpers';
import { todayUTC } from '../utils/formatters';

export interface UseLatestDetectionDateResult {
  latestDate: string | null;
  loading: boolean;
  error: string | null;
  isFallback: boolean;
}

export const useLatestDetectionDate = (enabled = true): UseLatestDetectionDateResult => {
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    if (fetchedRef.current) return;
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      setIsFallback(false);
      try {
        const data = await fetchAvailableDetectionDates(controller.signal);
        if (!cancelled) {
          setLatestDate(data.latest);
          fetchedRef.current = true;
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        if (isNetworkError(err)) {
          setLatestDate(todayUTC());
          setIsFallback(true);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch available detection dates');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled]);

  return { latestDate, loading, error, isFallback };
};
