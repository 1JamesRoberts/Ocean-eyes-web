/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { LocalStorageStore, subscribeToDb } from '../services/localStorageStore';
import type { LiveState } from '../types/aquarium';

export const useLiveState = (tankId: string | null) => {
  const [liveState, setLiveState] = useState<LiveState | null>(() => {
    if (tankId) {
      return LocalStorageStore.getLiveState(tankId);
    }
    return null;
  });

  const syncLiveState = () => {
    if (tankId) {
      setLiveState(LocalStorageStore.getLiveState(tankId));
    } else {
      setLiveState(null);
    }
  };

  useEffect(() => {
    syncLiveState();
    return subscribeToDb(syncLiveState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tankId]);

  const saveLiveState = (state: LiveState) => {
    if (tankId) {
      LocalStorageStore.saveLiveState(tankId, state);
    }
  };

  const updateCalibration = (waterLineY: number) => {
    if (tankId) {
      const activeFeedId = liveState?.selected_feed_id || '';
      LocalStorageStore.updateCalibration(tankId, activeFeedId, waterLineY);
      setLiveState(LocalStorageStore.getLiveState(tankId));
    }
  };

  return {
    liveState,
    saveLiveState,
    updateCalibration,
  };
};
