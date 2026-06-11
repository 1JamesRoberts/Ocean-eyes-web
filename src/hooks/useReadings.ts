/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { LocalStorageStore, subscribeToDb } from '../services/localStorageStore';
import type { ReadingItem } from '../types/aquarium';

export const useReadings = () => {
  const [readings, setReadings] = useState<ReadingItem[]>(() => LocalStorageStore.getReadings());

  const syncReadings = () => {
    setReadings(LocalStorageStore.getReadings());
  };

  useEffect(() => {
    syncReadings();
    return subscribeToDb(syncReadings);
  }, []);

  const writeReading = (data: {
    tankId: string;
    clarity: number;
    fishCount: number;
    ph?: number;
    temp?: number;
    ammonia?: number;
    nitrite?: number;
  }) => {
    LocalStorageStore.writeReading(data);
  };

  return { readings, writeReading };
};
