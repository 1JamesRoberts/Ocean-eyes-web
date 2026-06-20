// liveStateRepository.ts - LiveState CRUD and feed helpers
import type { LiveState } from '../../types/aquarium';
import {
  STORAGE_KEYS,
  getOrDefault,
  safeSetItem,
  notifyUpdate,
  subscribeToDb,
  getDefaultLiveState,
} from './storageBase';

export const getLiveState = (tankId: string): LiveState => {
  const key = STORAGE_KEYS.liveState(tankId);
  return getOrDefault<LiveState>(key, getDefaultLiveState());
};

export const saveLiveState = (tankId: string, state: LiveState) => {
  const key = STORAGE_KEYS.liveState(tankId);
  const result = safeSetItem(key, JSON.stringify(state));
  if (result.success) notifyUpdate(key);
  return result;
};

export const switchActiveFeed = (tankId: string, feedId: string) => {
  const liveState = getLiveState(tankId);
  const activeFeed = liveState.feeds.find((f) => f.id === feedId);
  if (activeFeed) {
    liveState.selected_feed_id = feedId;
    liveState.stream_url = activeFeed.stream_url;
    liveState.current_clarity = activeFeed.current_clarity;
    liveState.current_fish_count = activeFeed.current_fish_count;
    liveState.started_at = activeFeed.started_at;
    saveLiveState(tankId, liveState);
  }
};

export const updateCalibration = (
  tankId: string,
  feedId: string,
  waterLineY: number
) => {
  const liveState = getLiveState(tankId);
  const feedIndex = liveState.feeds.findIndex((f) => f.id === feedId);
  if (feedIndex === -1) return;
  liveState.feeds[feedIndex].calibration = { water_line_y: waterLineY };
  saveLiveState(tankId, liveState);
};

export const subscribeLiveState = (tankId: string, callback: () => void) =>
  subscribeToDb(STORAGE_KEYS.liveState(tankId), callback);
