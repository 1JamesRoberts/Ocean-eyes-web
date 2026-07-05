import { useState, useMemo, useCallback } from 'react';
import { useLivePreferences } from '../useLivePreferences';
import type { CameraFilters } from '../../types/aquarium';
import {
  buildCanvasFilterString,
  getTemperatureColor,
  getTintColor,
  getTemperatureOpacity,
  getTintOpacity,
} from '../../models/services/cameraFilterModel';

export interface UseCameraFiltersViewModelOptions {
  tankId?: string | null;
}

export interface UseCameraFiltersViewModelResult {
  filters: CameraFilters;
  filterStyle: string;
  temperatureOverlay: { backgroundColor: string; opacity: number } | null;
  tintOverlay: { backgroundColor: string; opacity: number } | null;
  handleFilterChange: (partial: Partial<CameraFilters>) => void;
  saveAsDefault: () => void;
}

export const useCameraFilters = (options: UseCameraFiltersViewModelOptions = {}): UseCameraFiltersViewModelResult => {
  const { preferences, updateDefaultFilters } = useLivePreferences(options.tankId ?? null);
  const [filters, setFilters] = useState<CameraFilters>(preferences.defaultFilters);

  const handleFilterChange = useCallback((partial: Partial<CameraFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const saveAsDefault = useCallback(() => {
    updateDefaultFilters(filters);
  }, [filters, updateDefaultFilters]);

  const filterStyle = useMemo(() => buildCanvasFilterString(filters), [filters]);

  const temperatureOverlay = useMemo(() => {
    if (filters.temperature === 0) return null;
    return {
      backgroundColor: getTemperatureColor(filters.temperature),
      opacity: getTemperatureOpacity(filters.temperature),
    };
  }, [filters.temperature]);

  const tintOverlay = useMemo(() => {
    if (filters.tint === 0) return null;
    return {
      backgroundColor: getTintColor(filters.tint),
      opacity: getTintOpacity(filters.tint),
    };
  }, [filters.tint]);

  return {
    filters,
    filterStyle,
    temperatureOverlay,
    tintOverlay,
    handleFilterChange,
    saveAsDefault,
  };
};
