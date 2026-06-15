import { useState } from 'react';
import type { CameraFilters } from '../../types/aquarium';

const DEFAULT_FILTERS: CameraFilters = {
  contrast: 100,
  brightness: 100,
  saturation: 100,
  temperature: 0,
  tint: 0,
};

interface UseCameraFiltersResult {
  filters: CameraFilters;
  handleFilterChange: (partial: Partial<CameraFilters>) => void;
}

export const useCameraFilters = (): UseCameraFiltersResult => {
  const [filters, setFilters] = useState<CameraFilters>(DEFAULT_FILTERS);

  const handleFilterChange = (partial: Partial<CameraFilters>) => {
    setFilters(prev => ({ ...prev, ...partial }));
  };

  return { filters, handleFilterChange };
};
