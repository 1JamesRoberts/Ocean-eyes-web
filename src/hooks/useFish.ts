/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { MockFirestore, subscribeToDb } from '../services/mock_service';
import type { FishEntry } from '../types/aquarium';

export const useFish = (tankId: string | null) => {
  const [fishList, setFishList] = useState<FishEntry[]>(() => MockFirestore.getFish());

  const syncFish = () => {
    setFishList(MockFirestore.getFish());
  };

  useEffect(() => {
    syncFish();
    return subscribeToDb(syncFish);
  }, []);

  const addFish = (name: string, imageUrl: string, count: number) => {
    if (tankId) {
      MockFirestore.addFish(tankId, name, imageUrl, count);
    }
  };

  const updateFishCount = (docId: string, count: number) => {
    MockFirestore.updateFishCount(docId, count);
  };

  const updateFishSpecies = (docId: string, name: string, imageUrl: string) => {
    MockFirestore.updateFishSpecies(docId, name, imageUrl);
  };

  const removeFish = (docId: string) => {
    MockFirestore.removeFish(docId);
  };

  return {
    fishList,
    addFish,
    updateFishCount,
    updateFishSpecies,
    removeFish,
  };
};
