import { useMemo, useCallback } from 'react';
import { useReadings } from '../useReadings';
import { useNavigation } from '../../context/NavigationContext';

export const useHistoryDetail = () => {
  const { setActiveTab } = useNavigation();
  const { readings } = useReadings();

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
