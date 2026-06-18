import { useSyncExternalStore } from 'react';
import { LocalStorageStore, subscribe } from '../services/localStorageStore';
import type { ReadingItem } from '../types/aquarium';

const EMPTY_READINGS: ReadingItem[] = [];

const subscribeReadings = (callback: () => void) => subscribe('readings', callback);

export const useReadings = () => {
  const readings = useSyncExternalStore<ReadingItem[]>(
    subscribeReadings,
    () => LocalStorageStore.getSnapshot('readings', EMPTY_READINGS),
    () => EMPTY_READINGS
  );

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
