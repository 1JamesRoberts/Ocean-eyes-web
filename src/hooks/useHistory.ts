// useHistory.ts - Fetch AI inference history from the backend
import { useEffect, useState, useCallback, useMemo } from 'react';

import type { DateRange, HistoryDetectionResponse, HistoryTurbidityResponse } from '../types/aquarium';
import {
  fetchDetectionHistory,
  fetchDetectionHistoryRange,
  fetchTurbidityHistory,
  fetchTurbidityHistoryRange,
} from '../services/ai_service';
import { recordInRange } from '../models/services/historyFilter';
import { HISTORY_DEFAULT_LIMIT } from '../utils/constants';

export interface UseHistoryResult {
  detectionData: HistoryDetectionResponse | null;
  turbidityData: HistoryTurbidityResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useHistory = (range: DateRange): UseHistoryResult => {
  const [rawDetectionData, setRawDetectionData] = useState<HistoryDetectionResponse | null>(null);
  const [rawTurbidityData, setRawTurbidityData] = useState<HistoryTurbidityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const { startDate, endDate } = range;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [det, turb] =
          startDate === endDate
            ? await Promise.all([
                fetchDetectionHistory(startDate, HISTORY_DEFAULT_LIMIT, controller.signal),
                fetchTurbidityHistory(startDate, HISTORY_DEFAULT_LIMIT, controller.signal),
              ])
            : await Promise.all([
                fetchDetectionHistoryRange(startDate, endDate, HISTORY_DEFAULT_LIMIT, controller.signal),
                fetchTurbidityHistoryRange(startDate, endDate, HISTORY_DEFAULT_LIMIT, controller.signal),
              ]);
        if (!cancelled) {
          setRawDetectionData(det);
          setRawTurbidityData(turb);
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
  }, [startDate, endDate, refetchKey]);

  const detectionData: HistoryDetectionResponse | null = useMemo(() => {
    if (!rawDetectionData) return null;
    const records = rawDetectionData.records.filter((r) => recordInRange(r, range));
    return { ...rawDetectionData, count: records.length, records };
  }, [rawDetectionData, range]);

  const turbidityData: HistoryTurbidityResponse | null = useMemo(() => {
    if (!rawTurbidityData) return null;
    const records = rawTurbidityData.records.filter((r) => recordInRange(r, range));
    return { ...rawTurbidityData, count: records.length, records };
  }, [rawTurbidityData, range]);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  return { detectionData, turbidityData, loading, error, refetch };
};
