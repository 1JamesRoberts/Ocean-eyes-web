// localStorageStore.ts - Compatibility re-export layer during MVVM migration
// New code should import from src/models/repositories/* directly.

export {
  DEMO_TANK_ID,
  DEMO_TANK,
  migrateLocalStorage,
  subscribeToDb,
  subscribe,
  getSnapshot,
  safeSetItem,
  subscribeToStorageError,
  getOrDefault,
  getDefaultLiveState,
  notifyUpdate,
  STORAGE_KEYS,
} from '../models/repositories/storageBase';
export type { StorageWriteResult } from '../models/repositories/storageBase';

export * from '../models/repositories/tankRepository';
export * from '../models/repositories/fishRepository';
export * from '../models/repositories/readingRepository';
export * from '../models/repositories/alertRepository';
export * from '../models/repositories/liveStateRepository';

// Preserved class wrapper for legacy consumers.
import * as tankRepository from '../models/repositories/tankRepository';
import * as fishRepository from '../models/repositories/fishRepository';
import * as readingRepository from '../models/repositories/readingRepository';
import * as alertRepository from '../models/repositories/alertRepository';
import * as liveStateRepository from '../models/repositories/liveStateRepository';
import {
  safeSetItem as baseSafeSetItem,
  notifyUpdate as baseNotifyUpdate,
  getSnapshot,
} from '../models/repositories/storageBase';
import type { StorageWriteResult } from '../models/repositories/storageBase';

export class LocalStorageStore {
  static getSnapshot = <T,>(key: string, fallback: T): T =>
    getSnapshot<T>(key, fallback);

  // ─── Tanks ─────────────────────────────────────────────────────────────────
  static getTanks = tankRepository.getTanks;
  static saveTanks = tankRepository.saveTanks;

  // ─── Fish (per-tank) ───────────────────────────────────────────────────────
  static getFish = fishRepository.getFish;
  static saveFish = fishRepository.saveFish;

  // ─── Readings ──────────────────────────────────────────────────────────────
  static getReadings = readingRepository.getReadings;
  static saveReadings = readingRepository.saveReadings;

  // ─── Alerts ────────────────────────────────────────────────────────────────
  static getAlerts = alertRepository.getAlerts;
  static saveAlerts = alertRepository.saveAlerts;

  // ─── Live State (per-tank) ─────────────────────────────────────────────────
  static getLiveState = liveStateRepository.getLiveState;
  static saveLiveState = liveStateRepository.saveLiveState;
  static switchActiveFeed = liveStateRepository.switchActiveFeed;

  // ─── Tank Operations ───────────────────────────────────────────────────────
  static createTank = tankRepository.createTank;
  static joinTank = tankRepository.joinTank;
  static getLinkedTanks = tankRepository.getLinkedTanks;
  static unlinkTank = tankRepository.unlinkTank;
  static updateTankName = tankRepository.updateTankName;
  static updateThresholds = tankRepository.updateThresholds;
  static updateCalibration = liveStateRepository.updateCalibration;

  // ─── Readings Operations ───────────────────────────────────────────────────
  static writeReading = readingRepository.writeReading;

  // ─── Alerts Operations ─────────────────────────────────────────────────────
  static resolveAlert = alertRepository.resolveAlert;

  // ─── Fish Operations ───────────────────────────────────────────────────────
  static addFish = fishRepository.addFish;
  static updateFishCount = fishRepository.updateFishCount;
  static updateDetectedCount = fishRepository.updateDetectedCount;
  static removeFish = fishRepository.removeFish;

  // ─── Generic safe write helper for ad-hoc keys ─────────────────────────────
  static safeWriteRaw(key: string, value: string): StorageWriteResult {
    const result = baseSafeSetItem(key, value);
    if (result.success) baseNotifyUpdate(key);
    return result;
  }
}
