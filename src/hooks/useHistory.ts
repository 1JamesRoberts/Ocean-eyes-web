// useHistory.ts - Subscribe to on-device AI inference history
import { useCallback, useMemo, useSyncExternalStore } from 'react';

import type {
  AIDetectionResult,
  AITurbidityResult,
  DateRange,
  HistoryDetectionResponse,
  HistoryTurbidityResponse,
} from '../types/aquarium';
import {
  getDetectionHistory,
  getTurbidityHistory,
  subscribeDetectionHistory,
  subscribeTurbidityHistory,
} from '../models/repositories/inferenceHistoryRepository';
import { DEMO_TANK_ID } from '../models/repositories/storageBase';
import { recordInRange } from '../models/services/inferenceHelpers';

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

const NOOP = () => {};
const EMPTY_DETECTION_HISTORY: AIDetectionResult[] = [];
const EMPTY_TURBIDITY_HISTORY: AITurbidityResult[] = [];

function sortChronologically<T extends { timestamp: string }>(records: T[]): T[] {
  return [...records].sort(
    (left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp)
  );
}

export const useHistory = (
  range: DateRange,
  enabled = true,
  tankId = DEMO_TANK_ID
): UseHistoryViewModelResult => {
  const subscribeDetections = useCallback(
    (callback: () => void) => subscribeDetectionHistory(tankId, callback),
    [tankId]
  );
  const subscribeTurbidity = useCallback(
    (callback: () => void) => subscribeTurbidityHistory(tankId, callback),
    [tankId]
  );
  const getDetections = useCallback(() => getDetectionHistory(tankId), [tankId]);
  const getTurbidity = useCallback(() => getTurbidityHistory(tankId), [tankId]);

  const rawDetectionRecords = useSyncExternalStore(
    subscribeDetections,
    getDetections,
    () => EMPTY_DETECTION_HISTORY
  );
  const rawTurbidityRecords = useSyncExternalStore(
    subscribeTurbidity,
    getTurbidity,
    () => EMPTY_TURBIDITY_HISTORY
  );

  const detectionData = useMemo<HistoryDetectionResponse | null>(() => {
    if (!enabled) return null;
    const records = sortChronologically(
      rawDetectionRecords.filter((record) => recordInRange(record, range))
    );
    return { date: range.startDate, count: records.length, records };
  }, [enabled, rawDetectionRecords, range]);

  const turbidityData = useMemo<HistoryTurbidityResponse | null>(() => {
    if (!enabled) return null;
    const records = sortChronologically(
      rawTurbidityRecords.filter((record) => recordInRange(record, range))
    );
    return { date: range.startDate, count: records.length, records };
  }, [enabled, rawTurbidityRecords, range]);

  return {
    detectionData,
    turbidityData,
    loading: false,
    isInitialLoading: false,
    isRefreshing: false,
    error: null,
    refetch: NOOP,
    isFallback: false,
  };
};
