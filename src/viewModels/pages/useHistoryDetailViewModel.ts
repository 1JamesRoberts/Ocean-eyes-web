import { useMemo, useCallback } from 'react';
import { useReadingsViewModel } from '../useReadingsViewModel';
import { useNavigationViewModel } from '../useNavigationViewModel';

export const useHistoryDetailViewModel = () => {
  const { setActiveTab } = useNavigationViewModel();
  const { readings } = useReadingsViewModel();

  const recentReadings = useMemo(() => readings.slice(0, 8), [readings]);

  const onBack = useCallback(
    () => setActiveTab('home'),
    [setActiveTab]
  );

  return {
    readings,
    recentReadings,
    onBack,
  };
};
