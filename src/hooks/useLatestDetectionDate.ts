// useLatestDetectionDate.ts - Fetch the latest date with detection history from the backend.
import { useEffect, useState, useRef } from 'react';
import { fetchAvailableDetectionDates } from '../models/api/aiApi';

export interface UseLatestDetectionDateResult {
  latestDate: string | null;
  loading: boolean;
  error: string | null;
}

export const useLatestDetectionDate = (enabled = true): UseLatestDetectionDateResult => {
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (fetchedRef.current) return;
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAvailableDetectionDates(controller.signal);
        if (!cancelled) {
          setLatestDate(data.latest);
          fetchedRef.current = true;
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to fetch available detection dates');
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

  return { latestDate, loading, error };
};
