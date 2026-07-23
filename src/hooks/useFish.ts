import { useSyncExternalStore, useCallback } from 'react';
import {
  getFish,
  saveFish as saveFishToRepository,
  addFish as addFishToRepository,
  updateFishCount as updateFishCountInRepository,
  updateDetectedCount as updateDetectedCountInRepository,
  removeFish as removeFishFromRepository,
  subscribeFish,
} from '../models/repositories/storageBase';
import type { FishEntry } from '../types/aquarium';

const EMPTY_FISH: FishEntry[] = [];

export const useFish = (tankId: string | null) => {
  const subscribeFishCallback = useCallback(
    (callback: () => void) => {
      if (!tankId) return () => {};
      return subscribeFish(tankId, callback);
    },
    [tankId]
  );

  const fishList = useSyncExternalStore<FishEntry[]>(
    subscribeFishCallback,
    () => (tankId ? getFish(tankId) : EMPTY_FISH),
    () => EMPTY_FISH
  );

  const addFish = (name: string, imageUrl: string, count: number, speciesId?: string) => {
    if (!tankId) return;
    addFishToRepository(tankId, name, imageUrl, count, speciesId);
  };

  const updateFishCount = (docId: string, count: number) => {
    if (!tankId) return;
    updateFishCountInRepository(tankId, docId, count);
  };

  const updateDetectedCount = (docId: string, detected: number) => {
    if (!tankId) return;
    updateDetectedCountInRepository(tankId, docId, detected);
  };

  const removeFish = (docId: string) => {
    if (!tankId) return;
    removeFishFromRepository(tankId, docId);
  };

  const saveFish = (fish: FishEntry[]) => {
    if (!tankId) return;
    saveFishToRepository(tankId, fish);
  };

  return {
    fishList,
    addFish,
    updateFishCount,
    updateDetectedCount,
    removeFish,
    saveFish,
  };
};
