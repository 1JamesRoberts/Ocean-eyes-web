/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { LocalStorageStore, subscribeToDb } from '../services/localStorageStore';
import type { FishEntry } from '../types/aquarium';

export const useFish = (tankId: string | null) => {
  const [fishList, setFishList] = useState<FishEntry[]>(() =>
    tankId ? LocalStorageStore.getFish(tankId) : []
  );

  const syncFish = useCallback(() => {
    setFishList(tankId ? LocalStorageStore.getFish(tankId) : []);
  }, [tankId]);

  useEffect(() => {
    syncFish();
    if (!tankId) return undefined;
    return subscribeToDb(`tank_fish_${tankId}`, syncFish);
  }, [tankId, syncFish]);

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
