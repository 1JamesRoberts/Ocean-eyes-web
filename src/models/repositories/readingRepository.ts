// readingRepository.ts - Reading CRUD and live-state feed metric updates
import type { ReadingItem } from '../../types/aquarium';
import {
  STORAGE_KEYS,
  getOrDefault,
  safeSetItem,
  notifyUpdate,
  subscribeToDb,
} from './storageBase';

export const getReadings = (): ReadingItem[] =>
  getOrDefault<ReadingItem[]>(STORAGE_KEYS.readings, []);

export const saveReadings = (readings: ReadingItem[]) => {
  const result = safeSetItem(STORAGE_KEYS.readings, JSON.stringify(readings));
  if (result.success) notifyUpdate(STORAGE_KEYS.readings);
  return result;
};

export interface WriteReadingInput {
  tankId: string;
  clarity: number;
  fishCount: number;
  ph?: number;
  temp?: number;
  ammonia?: number;
  nitrite?: number;
}

export const writeReading = (data: WriteReadingInput) => {
  const readings = getReadings();
  const newReading: ReadingItem = {
    id: `r-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tank_id: data.tankId,
    timestamp: new Date().toISOString(),
    clarity: data.clarity,
    fish_count: data.fishCount,
    fish_count_confidence: 0.95,
    frame_url: '',
  };
  if (data.ph !== undefined) newReading.ph = data.ph;
  if (data.temp !== undefined) newReading.temp = data.temp;
  if (data.ammonia !== undefined) newReading.ammonia = data.ammonia;
  if (data.nitrite !== undefined) newReading.nitrite = data.nitrite;

  readings.unshift(newReading);
  saveReadings(readings.slice(0, 50));
};

export const subscribeReadings = (callback: () => void) =>
  subscribeToDb(STORAGE_KEYS.readings, callback);
