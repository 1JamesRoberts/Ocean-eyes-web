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
  const { activeTank } = useTank();
  const { readings } = useReadings();
  const { liveState, activeFeed } = useLiveFeed();

  const latestReading = useMemo(() => readings[0], [readings]);

  const { clarity: displayClarity, fishCount: displayFishCount } = useMemo(
    () => selectActiveFeedMetrics(liveState, activeFeed, latestReading),
    [liveState, activeFeed, latestReading]
  );

  const onGoToLive = useCallback(
    () => navigation.setActiveTab('live'),
    [navigation]
  );

  return {
    activeTank,
    displayClarity,
    displayFishCount,
    onViewAdvanced: onGoToLive,
    onGoLive: onGoToLive,
  };
}
