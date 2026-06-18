import { useSyncExternalStore, useCallback } from 'react';
import { LocalStorageStore, subscribe } from '../services/localStorageStore';
import type { LiveState } from '../types/aquarium';

export const useLiveState = (tankId: string | null) => {
  const subscribeLiveState = useCallback(
    (callback: () => void) => {
      if (!tankId) return () => {};
      return subscribe(`live_state_${tankId}`, callback);
    },
    [tankId]
  );

  const liveState = useSyncExternalStore<LiveState | null>(
    subscribeLiveState,
    () => (tankId ? LocalStorageStore.getSnapshot(`live_state_${tankId}`, LocalStorageStore.getLiveState(tankId)) : null),
    () => null
  );

  const saveLiveState = (state: LiveState) => {
    if (tankId) {
      LocalStorageStore.saveLiveState(tankId, state);
    }
  };

  const updateCalibration = (waterLineY: number) => {
    if (tankId) {
      const current = LocalStorageStore.getLiveState(tankId);
      const activeFeedId = current.selected_feed_id || '';
      LocalStorageStore.updateCalibration(tankId, activeFeedId, waterLineY);
    }
  };

  return {
    liveState,
    saveLiveState,
    updateCalibration,
  };
};
