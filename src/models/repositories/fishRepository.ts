// fishRepository.ts - Fish inventory CRUD per tank
import type { FishEntry } from '../../types/aquarium';
import {
  STORAGE_KEYS,
  getOrDefault,
  safeSetItem,
  notifyUpdate,
  subscribeToDb,
} from './storageBase';

export const getFish = (tankId: string): FishEntry[] =>
  getOrDefault<FishEntry[]>(STORAGE_KEYS.fish(tankId), []);

export const saveFish = (tankId: string, fish: FishEntry[]) => {
  const key = STORAGE_KEYS.fish(tankId);
  const result = safeSetItem(key, JSON.stringify(fish));
  if (result.success) notifyUpdate(key);
  return result;
};

export const addFish = (
  tankId: string,
  name: string,
  imageUrl: string,
  count: number
) => {
  const fish = getFish(tankId);
  const speciesId = name.toLowerCase().replace(/\s+/g, '_');

  const existingIndex = fish.findIndex((f) => f.speciesId === speciesId);
  if (existingIndex !== -1) {
    fish[existingIndex].count += count;
    fish[existingIndex].detected = fish[existingIndex].count;
    saveFish(tankId, fish);
    return;
  }

  const newEntry: FishEntry = {
    id: `fish-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tankId,
    speciesId,
    name,
    imageUrl,
    count,
    detected: count,
  };
  fish.push(newEntry);
  saveFish(tankId, fish);
};

export const updateFishCount = (tankId: string, docId: string, count: number) => {
  const fish = getFish(tankId);
  const index = fish.findIndex((f) => f.id === docId);
  if (index !== -1) {
    fish[index].count = count;
    saveFish(tankId, fish);
  }
};

export const updateDetectedCount = (
  tankId: string,
  docId: string,
  detected: number
) => {
  const fish = getFish(tankId);
  const index = fish.findIndex((f) => f.id === docId);
  if (index !== -1) {
    fish[index].detected = detected;
    saveFish(tankId, fish);
  }
};

export const updateDetectedFromSpeciesCounts = (
  tankId: string,
  speciesCounts: Record<string, number>
) => {
  const fish = getFish(tankId);
  let changed = false;

  fish.forEach((entry) => {
    entry.detected = 0;
    changed = true;
  });

  Object.entries(speciesCounts).forEach(([speciesId, count]) => {
    const entry = fish.find((f) => f.speciesId === speciesId);
    if (entry) {
      entry.detected = count;
      changed = true;
    }
  });

  if (changed) {
    saveFish(tankId, fish);
  }
};

export const removeFish = (tankId: string, docId: string) => {
  const fish = getFish(tankId);
  const updated = fish.filter((f) => f.id !== docId);
  saveFish(tankId, updated);
};

export const subscribeFish = (tankId: string, callback: () => void) =>
  subscribeToDb(STORAGE_KEYS.fish(tankId), callback);
