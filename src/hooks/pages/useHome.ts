import { useState, useMemo, useCallback } from 'react';
import { useTank } from '../useTank';
import { useReadings } from '../useReadings';
import { useFish } from '../useFish';
import { useAlerts } from '../useAlerts';
import { useLiveFeed } from '../useLiveFeed';
import { useNavigation } from '../../context/NavigationContext';
import { selectActiveFeedMetrics } from '../../models/services/inferenceHelpers';

export const useHome = () => {
  const navigation = useNavigation();
  const { activeTank, tanks, linkedTanks, tankId, selectTank, createAndLinkTank, linkTank } =
    useTank();
  const { readings } = useReadings();
  const { fishList } = useFish(tankId);
  const { alerts } = useAlerts();
  const { liveState, activeFeed } = useLiveFeed(tankId);

  const [showAddTankModal, setShowAddTankModal] = useState(false);

  const latestReading = useMemo(() => readings[0], [readings]);

  const { clarity: displayClarity, fishCount: displayFishCount } = useMemo(
    () => selectActiveFeedMetrics(liveState, activeFeed, latestReading),
    [liveState, activeFeed, latestReading]
  );

  const activeAlertCount = useMemo(
    () => alerts.filter((a) => !a.resolved).length,
    [alerts]
  );
  const hasReadingData = latestReading !== undefined;

  const onViewAlerts = useCallback(
    () => navigation.setActiveTab('alerts'),
    [navigation]
  );
  const onGoLive = useCallback(() => {
    navigation.setAutoFullscreen(true);
    navigation.setActiveTab('live');
  }, [navigation]);
  const onViewAdvanced = useCallback(
    () => navigation.setActiveTab('live'),
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
  const onAddTank = useCallback(() => setShowAddTankModal(true), []);
  const onCloseAddTankModal = useCallback(() => setShowAddTankModal(false), []);
  const onSelectAlert = useCallback(
    (alertId: string) => {
      navigation.setSelectedAlertId(alertId);
      navigation.setActiveTab('alerts');
    },
    [navigation]
  );

  const onCreateTank = useCallback(
    async (
      name: string,
      cameraSource?: { type: 'mock' | 'webcam'; deviceId?: string }
    ) => {
      await createAndLinkTank(name, cameraSource);
    },
    [createAndLinkTank]
  );

  const onLinkTank = useCallback(
    async (targetId: string): Promise<boolean> => linkTank(targetId),
    [linkTank]
  );

  return {
    activeTank,
    tanks,
    linkedTanks,
    tankId,
    fishList,
    latestReading,
    displayClarity,
    displayFishCount,
    activeAlertCount,
    hasReadingData,
    readings,
    alerts,
    showAddTankModal,
    selectTank,
    onViewAlerts,
    onGoLive,
    onViewAdvanced,
    onManageFish,
    onViewHistory,
    onAddTank,
    onCloseAddTankModal,
    onCreateTank,
    onLinkTank,
    onSelectAlert,
  };
};
