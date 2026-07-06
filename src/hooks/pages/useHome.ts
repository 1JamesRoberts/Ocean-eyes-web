import { useMemo, useCallback } from 'react';
import { useTank } from '../useTank';
import { useReadings } from '../useReadings';
import { useFish } from '../useFish';
import { useAlerts } from '../useAlerts';
import { useLiveFeed } from '../useLiveFeed';
import { useNavigation } from '../../context/NavigationContext';
import { selectActiveFeedMetrics } from '../../models/services/inferenceHelpers';

export const useHome = () => {
  const navigation = useNavigation();
  const { activeTank, tankId } = useTank();
  const { readings } = useReadings();
  const { fishList } = useFish(tankId);
  const { alerts } = useAlerts();
  const { liveState, activeFeed } = useLiveFeed();

  const latestReading = useMemo(() => readings[0], [readings]);

  const { clarity: displayClarity, fishCount: displayFishCount } = useMemo(
    () => selectActiveFeedMetrics(liveState, activeFeed, latestReading),
    [liveState, activeFeed, latestReading]
  );

  const hasReadingData = latestReading !== undefined;

  const onGoLive = useCallback(() => {
    navigation.setActiveTab('settings');
  }, [navigation]);
  const onViewAdvanced = useCallback(
    () => navigation.setActiveTab('settings'),
    [navigation]
  );
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
    activeTank,
    fishList,
    latestReading,
    displayClarity,
    displayFishCount,
    hasReadingData,
    readings,
    alerts,
    onGoLive,
    onViewAdvanced,
    onManageFish,
    onViewHistory,
    onSelectAlert,
  };
};
