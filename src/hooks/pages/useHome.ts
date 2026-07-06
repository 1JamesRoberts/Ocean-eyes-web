import { useMemo, useCallback } from 'react';
import { useTank } from '../useTank';
import { useReadings } from '../useReadings';
import { useFish } from '../useFish';
import { useAlerts } from '../useAlerts';
import { useNavigation } from '../../context/NavigationContext';

export const useHome = () => {
  const navigation = useNavigation();
  const { tankId } = useTank();
  const { readings } = useReadings();
  const { fishList } = useFish(tankId);
  const { alerts } = useAlerts();

  const latestReading = useMemo(() => readings[0], [readings]);
  const hasReadingData = latestReading !== undefined;
  const onManageFish = useCallback(
    () => navigation.setActiveTab('my_fish'),
    [navigation]
  );
  const onViewHistory = useCallback(
    () => navigation.setActiveTab('history'),
    [navigation]
  );
  const onSelectAlert = useCallback(
    (alertId: string) => {
      navigation.setSelectedAlertId(alertId);
      navigation.setActiveTab('alerts');
    },
    [navigation]
  );

  return {
    fishList,
    latestReading,
    hasReadingData,
    readings,
    alerts,
    onManageFish,
    onViewHistory,
    onSelectAlert,
  };
};
