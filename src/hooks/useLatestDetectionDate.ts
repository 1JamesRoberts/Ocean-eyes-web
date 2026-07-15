// useLatestDetectionDate.ts - Select the latest date from on-device inference history
import { useCallback, useSyncExternalStore } from 'react';
import {
  getLatestInferenceDate,
  subscribeInferenceHistory,
} from '../models/repositories/inferenceHistoryRepository';
import { DEMO_TANK_ID } from '../models/repositories/storageBase';
import { todayUTC } from '../utils/formatters';

export interface UseLatestDetectionDateResult {
  latestDate: string | null;
  loading: boolean;
  error: string | null;
  isFallback: boolean;
}

export const useLatestDetectionDate = (
  enabled = true,
  tankId = DEMO_TANK_ID
): UseLatestDetectionDateResult => {
  const subscribeHistory = useCallback(
    (callback: () => void) => subscribeInferenceHistory(tankId, callback),
    [tankId]
  );
  const getLatestDate = useCallback(
    () => getLatestInferenceDate(tankId),
    [tankId]
  );
  const latestStoredDate = useSyncExternalStore(
    subscribeHistory,
    getLatestDate,
    () => null
  );

  return {
    latestDate: enabled ? latestStoredDate ?? todayUTC() : null,
    loading: false,
    error: null,
    isFallback: false,
  };
};
