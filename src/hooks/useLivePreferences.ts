import { useSyncExternalStore, useCallback } from 'react';
import {
  getLivePreferences,
  saveLivePreferences,
  subscribeLivePreferences,
  getDefaultLivePreferences,
} from '../models/repositories/storageBase';
import type {
  CameraFilters,
  CameraSourcePreference,
  FilterPreset,
  LivePreferences,
  AIPreferences,
} from '../types/aquarium';

const DEFAULT_PREFERENCES = getDefaultLivePreferences();

export const useLivePreferences = (tankId: string | null) => {
  const subscribeCallback = useCallback(
    (callback: () => void) => {
      if (!tankId) return () => {};
      return subscribeLivePreferences(tankId, callback);
    },
    [tankId]
  );

  const preferences = useSyncExternalStore<LivePreferences>(
    subscribeCallback,
    () => (tankId ? getLivePreferences(tankId) : DEFAULT_PREFERENCES),
    () => DEFAULT_PREFERENCES
  );

  const save = useCallback(
    (next: LivePreferences) => {
      if (tankId) saveLivePreferences(tankId, next);
    },
    [tankId]
  );

  const updateCameraSource = useCallback(
    (cameraSource: CameraSourcePreference) => {
      save({ ...preferences, cameraSource });
    },
    [preferences, save]
  );

  const updateDefaultFilters = useCallback(
    (defaultFilters: CameraFilters) => {
      save({ ...preferences, defaultFilters });
    },
    [preferences, save]
  );

  const updateFilterPresets = useCallback(
    (filterPresets: FilterPreset[]) => {
      save({ ...preferences, filterPresets });
    },
    [preferences, save]
  );

  const addFilterPreset = useCallback(
    (preset: FilterPreset) => {
      save({ ...preferences, filterPresets: [...preferences.filterPresets, preset] });
    },
    [preferences, save]
  );

  const removeFilterPreset = useCallback(
    (id: string) => {
      save({
        ...preferences,
        filterPresets: preferences.filterPresets.filter((p) => p.id !== id),
      });
    },
    [preferences, save]
  );

  const updateAIPreferences = useCallback(
    (ai: AIPreferences) => {
      save({ ...preferences, ai });
    },
    [preferences, save]
  );

  const updateAutoConnect = useCallback(
    (autoConnect: boolean) => {
      save({ ...preferences, autoConnect });
    },
    [preferences, save]
  );

  const resetToDefaults = useCallback(() => {
    save(getDefaultLivePreferences());
  }, [save]);

  return {
    preferences,
    save,
    updateCameraSource,
    updateDefaultFilters,
    updateFilterPresets,
    addFilterPreset,
    removeFilterPreset,
    updateAIPreferences,
    updateAutoConnect,
    resetToDefaults,
  };
};
