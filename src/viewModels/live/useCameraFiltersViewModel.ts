import { useState, useMemo, useCallback } from 'react';
import type { CameraFilters } from '../../types/aquarium';
import {
  buildCanvasFilterString,
  getTemperatureColor,
  getTintColor,
  getTemperatureOpacity,
  getTintOpacity,
} from '../../models/services/cameraFilterModel';

const DEFAULT_FILTERS: CameraFilters = {
  contrast: 100,
  brightness: 100,
  saturation: 100,
  temperature: 0,
  tint: 0,
};

export interface UseCameraFiltersViewModelResult {
  filters: CameraFilters;
  filterStyle: string;
  temperatureOverlay: { backgroundColor: string; opacity: number } | null;
  tintOverlay: { backgroundColor: string; opacity: number } | null;
  handleFilterChange: (partial: Partial<CameraFilters>) => void;
}

export const useCameraFiltersViewModel = (): UseCameraFiltersViewModelResult => {
  const [filters, setFilters] = useState<CameraFilters>(DEFAULT_FILTERS);

  const handleFilterChange = useCallback((partial: Partial<CameraFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

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
  };
};
