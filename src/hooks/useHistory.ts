// useHistory.ts - Fetch AI inference history from the backend
import { useState, useEffect, useCallback } from 'react';

const DEFAULT_LIMIT = 1000;
import type { HistoryDetectionResponse, HistoryTurbidityResponse } from '../types/aquarium';
import { fetchDetectionHistory, fetchTurbidityHistory } from '../services/ai_service';

export interface UseHistoryResult {
  detectionData: HistoryDetectionResponse | null;
  turbidityData: HistoryTurbidityResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useHistory = (date: string): UseHistoryResult => {
  const [detectionData, setDetectionData] = useState<HistoryDetectionResponse | null>(null);
  const [turbidityData, setTurbidityData] = useState<HistoryTurbidityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [det, turb] = await Promise.all([
          fetchDetectionHistory(date, DEFAULT_LIMIT, controller.signal),
          fetchTurbidityHistory(date, DEFAULT_LIMIT, controller.signal),
        ]);
        if (!cancelled) {
          setDetectionData(det);
          setTurbidityData(turb);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to fetch history');
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
  }, [date, refetchKey]);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  return { detectionData, turbidityData, loading, error, refetch };
};
