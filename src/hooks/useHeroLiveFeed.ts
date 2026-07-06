import { useMemo, useCallback } from 'react';
import { useTank } from './useTank';
import { useReadings } from './useReadings';
import { useLiveFeed } from './useLiveFeed';
import { useNavigation } from '../context/NavigationContext';
import { selectActiveFeedMetrics } from '../models/services/inferenceHelpers';
import type { TankBrief } from '../types/aquarium';

export interface UseHeroLiveFeedResult {
  activeTank: TankBrief | undefined;
  displayClarity: number;
  displayFishCount: number;
  onViewAdvanced: () => void;
  onGoLive: () => void;
}

export function useHeroLiveFeed(): UseHeroLiveFeedResult {
  const navigation = useNavigation();
  const { activeTank, tankId } = useTank();
  const { readings } = useReadings();
  const { liveState, activeFeed } = useLiveFeed(tankId);

  const latestReading = useMemo(() => readings[0], [readings]);

  const { clarity: displayClarity, fishCount: displayFishCount } = useMemo(
    () => selectActiveFeedMetrics(liveState, activeFeed, latestReading),
    [liveState, activeFeed, latestReading]
  );

  const onViewAdvanced = useCallback(
    () => navigation.setActiveTab('settings'),
    [navigation]
  );

  const onGoLive = useCallback(
    () => navigation.setActiveTab('settings'),
    [navigation]
  );

  return {
    activeTank,
    displayClarity,
    displayFishCount,
    onViewAdvanced,
    onGoLive,
  };
}
