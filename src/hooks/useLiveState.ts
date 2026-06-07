/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { MockFirestore, subscribeToDb } from '../services/mock_service';
import type { LiveState } from '../types/aquarium';

export const useLiveState = (tankId: string | null) => {
  const [liveState, setLiveState] = useState<LiveState | null>(() => {
    if (tankId) {
      return MockFirestore.getLiveState(tankId);
    }
    return null;
  });

  const syncLiveState = () => {
    if (tankId) {
      setLiveState(MockFirestore.getLiveState(tankId));
    } else {
      setLiveState(null);
    }
  };

  useEffect(() => {
    syncLiveState();
    return subscribeToDb(syncLiveState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tankId]);

  const updateCalibration = (waterLineY: number) => {
    if (tankId) {
      const activeFeedId = liveState?.selected_feed_id || '';
      MockFirestore.updateCalibration(tankId, activeFeedId, waterLineY);
      setLiveState(MockFirestore.getLiveState(tankId));
    }
  };

  return {
    liveState,
    setLiveState,
    updateCalibration,
  };
};
