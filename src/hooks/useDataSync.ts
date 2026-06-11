import { useState, useEffect, useCallback, useRef } from 'react';
import { LocalStorageStore } from '../services/localStorageStore';
import { generateAlerts } from '../services/alertEngine';
import {
  fetchTodayReadings,
  fetchSpeciesDetectedToday,
  isBackendAvailable,
  normalizeSpeciesKey,
} from '../services/realDataService';
import { useTank } from './useTank';
import { useFish } from './useFish';

const DATA_VERSION_KEY = 'oceaneyes_data_version';
const DATA_VERSION = 2;
const POLL_INTERVAL_MS = 10000;

function clearLegacyLocalStorage() {
  localStorage.removeItem('readings');
  localStorage.removeItem('alerts');
}

function migrateLocalStorage() {
  const current = parseInt(localStorage.getItem(DATA_VERSION_KEY) ?? '0', 10);
  if (current < DATA_VERSION) {
    clearLegacyLocalStorage();
    localStorage.setItem(DATA_VERSION_KEY, String(DATA_VERSION));
  }
}

export const useDataSync = () => {
  const { tankId, activeTank } = useTank();
  const { fishList } = useFish();
  const [syncActive, setSyncActive] = useState<boolean>(true);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const syncingRef = useRef(false);
  const activeTankRef = useRef(activeTank);
  const fishListRef = useRef(fishList);
  const tankIdRef = useRef(tankId);

  useEffect(() => {
    activeTankRef.current = activeTank;
  }, [activeTank]);

  useEffect(() => {
    fishListRef.current = fishList;
  }, [fishList]);

  const performSync = useCallback(async () => {
    const currentTankId = tankIdRef.current;
    if (!currentTankId || syncingRef.current) return;

    syncingRef.current = true;
    try {
      const available = await isBackendAvailable();
      setBackendAvailable(available);

      if (!available) {
        return;
      }

      const readings = await fetchTodayReadings(currentTankId);
      if (readings.length > 0) {
        const existing = LocalStorageStore.getReadings();
        const merged = [...readings, ...existing];
        const deduped = merged.filter(
          (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i
        );
        LocalStorageStore.saveReadings(deduped.slice(0, 50));

        const latest = readings[0];
        const liveState = LocalStorageStore.getLiveState(currentTankId);
        LocalStorageStore.saveLiveState(currentTankId, {
          ...liveState,
          current_clarity: latest.clarity,
          current_fish_count: latest.fish_count,
          last_ping_at: new Date().toISOString(),
        });
      }

      const speciesCounts = await fetchSpeciesDetectedToday();
      const allFish = LocalStorageStore.getFish();
      let fishChanged = false;

      Object.entries(speciesCounts).forEach(([speciesKey, count]) => {
        const match = allFish.find(
          (f) => normalizeSpeciesKey(f.speciesId) === speciesKey
        );
        if (match && match.detected !== count) {
          match.detected = count;
          fishChanged = true;
        }
      });

      if (fishChanged) {
        LocalStorageStore.saveFish(allFish);
      }

      const currentActiveTank = activeTankRef.current;
      const currentFishList = fishListRef.current;
      if (currentActiveTank && readings.length > 0) {
        const latest = readings[0];
        const totalExpectedFish = currentFishList.reduce((sum, f) => sum + f.count, 0);
        const totalDetected = currentFishList.reduce((sum, f) => sum + f.detected, 0);

        const newAlerts = generateAlerts({
          currentClarity: latest.clarity,
          totalExpectedFish,
          totalDetected,
          maxFnu: currentActiveTank.thresholds.clarity_min,
          discrepancyPct: currentActiveTank.thresholds.fish_change_pct,
        });

        if (newAlerts.length > 0) {
          const activeAlerts = LocalStorageStore.getAlerts();
          const activeTitles = new Set(
            activeAlerts.filter((a) => !a.resolved).map((a) => a.title)
          );
          const dedupedAlerts = newAlerts.filter(
            (a) => !activeTitles.has(a.title)
          );
          if (dedupedAlerts.length > 0) {
            LocalStorageStore.saveAlerts([...dedupedAlerts, ...activeAlerts]);
          }
        }
      }
    } finally {
      syncingRef.current = false;
    }
  }, []);

  const triggerManualSync = useCallback(() => {
    void performSync();
  }, [performSync]);

  useEffect(() => {
    migrateLocalStorage();
  }, []);

  useEffect(() => {
    tankIdRef.current = tankId;
  }, [tankId]);

  useEffect(() => {
    if (!tankId) return;
    clearLegacyLocalStorage();
    void performSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tankId]);

  useEffect(() => {
    if (!syncActive || !tankId) return;

    const interval = setInterval(() => {
      void performSync();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [syncActive, tankId, performSync]);

  return {
    syncActive,
    setSyncActive,
    triggerManualSync,
    backendAvailable,
  };
};
