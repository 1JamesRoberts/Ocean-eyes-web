import { useSyncExternalStore, useCallback } from 'react';
import { LocalStorageStore, subscribe } from '../services/localStorageStore';
import type { FishEntry } from '../types/aquarium';

const EMPTY_FISH: FishEntry[] = [];

export const useFish = (tankId: string | null) => {
  const subscribeFish = useCallback(
    (callback: () => void) => {
      if (!tankId) return () => {};
      return subscribe(`tank_fish_${tankId}`, callback);
    },
    [tankId]
  );

  const fishList = useSyncExternalStore<FishEntry[]>(
    subscribeFish,
    () => (tankId ? LocalStorageStore.getSnapshot(`tank_fish_${tankId}`, EMPTY_FISH) : EMPTY_FISH),
    () => EMPTY_FISH
  );

  const addFish = (name: string, imageUrl: string, count: number) => {
    if (!tankId) return;
    LocalStorageStore.addFish(tankId, name, imageUrl, count);
  };

  const updateFishCount = (docId: string, count: number) => {
    if (!tankId) return;
    LocalStorageStore.updateFishCount(tankId, docId, count);
  };

  const updateDetectedCount = (docId: string, detected: number) => {
    if (!tankId) return;
    LocalStorageStore.updateDetectedCount(tankId, docId, detected);
  };

  const removeFish = (docId: string) => {
    if (!tankId) return;
    LocalStorageStore.removeFish(tankId, docId);
  };

  return {
    fishList,
    addFish,
    updateFishCount,
    updateDetectedCount,
    removeFish,
  };
};
