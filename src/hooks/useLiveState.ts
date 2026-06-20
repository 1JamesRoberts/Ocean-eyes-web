import { useSyncExternalStore, useCallback } from 'react';
import {
  getLiveState,
  saveLiveState as saveLiveStateToRepository,
  updateCalibration as updateCalibrationInRepository,
  subscribeLiveState,
} from '../models/repositories/liveStateRepository';
import type { LiveState } from '../types/aquarium';

export const useLiveState = (tankId: string | null) => {
  const subscribeLiveStateCallback = useCallback(
    (callback: () => void) => {
      if (!tankId) return () => {};
      return subscribeLiveState(tankId, callback);
    },
    [tankId]
  );

  const liveState = useSyncExternalStore<LiveState | null>(
    subscribeLiveStateCallback,
    () => (tankId ? getLiveState(tankId) : null),
    () => null
  );

  const saveLiveState = (state: LiveState) => {
    if (tankId) {
      saveLiveStateToRepository(tankId, state);
    }
  };

  const updateCalibration = (waterLineY: number) => {
    if (tankId) {
      const current = getLiveState(tankId);
      const activeFeedId = current.selected_feed_id || '';
      updateCalibrationInRepository(tankId, activeFeedId, waterLineY);
    }
  };

  return {
    liveState,
    saveLiveState,
    updateCalibration,
  };
};
