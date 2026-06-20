import { useSyncExternalStore } from 'react';
import {
  getReadings,
  writeReading as writeReadingToRepository,
  subscribeReadings,
} from '../models/repositories/readingRepository';
import type { ReadingItem } from '../types/aquarium';

const EMPTY_READINGS: ReadingItem[] = [];

export const useReadings = () => {
  const readings = useSyncExternalStore<ReadingItem[]>(
    subscribeReadings,
    () => getReadings(),
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
    writeReadingToRepository(data);
  };

  return { readings, writeReading };
};
