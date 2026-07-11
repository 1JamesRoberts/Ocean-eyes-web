// useHistory.ts - Fetch AI inference history from the backend
import { useEffect, useState, useCallback, useMemo } from 'react';

import type { DateRange, HistoryDetectionResponse, HistoryTurbidityResponse } from '../types/aquarium';
import {
  fetchDetectionHistory,
  fetchDetectionHistoryRange,
  fetchTurbidityHistory,
  fetchTurbidityHistoryRange,
} from '../models/api/aiApi';
import { isNetworkError } from '../models/api/errorHelpers';
import { recordInRange } from '../models/services/inferenceHelpers';
import { HISTORY_DEFAULT_LIMIT } from '../utils/constants';

export interface UseHistoryViewModelResult {
  detectionData: HistoryDetectionResponse | null;
  turbidityData: HistoryTurbidityResponse | null;
  loading: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => void;
  isFallback: boolean;
}

export const useHistory = (
  range: DateRange,
  enabled = true,
): UseHistoryViewModelResult => {
  const [rawDetectionData, setRawDetectionData] = useState<HistoryDetectionResponse | null>(null);
  const [rawTurbidityData, setRawTurbidityData] = useState<HistoryTurbidityResponse | null>(null);
  const [loadedRange, setLoadedRange] = useState<DateRange | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  const { startDate, endDate } = range;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      setIsFallback(false);
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
          setLoadedRange(range);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        if (isNetworkError(err)) {
          setRawDetectionData({ date: range.startDate, count: 0, records: [] });
          setRawTurbidityData({ date: range.startDate, count: 0, records: [] });
          setLoadedRange(range);
          setIsFallback(true);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch history');
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
  }, [startDate, endDate, refetchKey, enabled, range]);

  // Keep the last successful response visible while the user switches ranges.
  // The new response replaces it atomically once both history endpoints finish.
  const displayedRange = loadedRange ?? range;

  const detectionData: HistoryDetectionResponse | null = useMemo(() => {
    if (!rawDetectionData) return null;
    const records = rawDetectionData.records.filter((r) => recordInRange(r, displayedRange));
    return { ...rawDetectionData, count: records.length, records };
  }, [rawDetectionData, displayedRange]);

  const turbidityData: HistoryTurbidityResponse | null = useMemo(() => {
    if (!rawTurbidityData) return null;
    const records = rawTurbidityData.records.filter((r) => recordInRange(r, displayedRange));
    return { ...rawTurbidityData, count: records.length, records };
  }, [rawTurbidityData, displayedRange]);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  const hasLoadedHistory = rawDetectionData !== null && rawTurbidityData !== null;
  const isInitialLoading = enabled && !hasLoadedHistory && error === null;
  const isRefreshing = loading && hasLoadedHistory;

  return {
    detectionData,
    turbidityData,
    loading,
    isInitialLoading,
    isRefreshing,
    error,
    refetch,
    isFallback,
  };
};
