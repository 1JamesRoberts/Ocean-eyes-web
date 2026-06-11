/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { LocalStorageStore, subscribeToDb } from '../services/localStorageStore';
import type { FishEntry } from '../types/aquarium';

export const useFish = () => {
  const [fishList, setFishList] = useState<FishEntry[]>(() => LocalStorageStore.getFish());

  const syncFish = () => {
    setFishList(LocalStorageStore.getFish());
  };

  useEffect(() => {
    syncFish();
    return subscribeToDb(syncFish);
  }, []);

  const addFish = (tankId: string, name: string, imageUrl: string, count: number) => {
    LocalStorageStore.addFish(tankId, name, imageUrl, count);
  };

  const updateFishCount = (docId: string, count: number) => {
    LocalStorageStore.updateFishCount(docId, count);
  };

  const updateDetectedCount = (docId: string, detected: number) => {
    LocalStorageStore.updateDetectedCount(docId, detected);
  };

  const removeFish = (docId: string) => {
    LocalStorageStore.removeFish(docId);
  };

  return {
    fishList,
    addFish,
    updateFishCount,
    updateDetectedCount,
    removeFish,
  };
};
